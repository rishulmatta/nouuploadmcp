import type { ToolSpec } from './types'
import { listDocuments, loadParsedPage, getDocument } from '../storage/documents'
import { scanRedactions, applyRedactions } from '../redact/engine'
import { financeRedactionRules, labsRedactionRules } from '../redact/patterns'
import { getPolicy } from '../consent/policy'
import { listGrants, addGrant } from '../consent/grants'
import { evaluateConsent, consentToAuditEntry } from '../consent/jit'
import { requestConsentWithUi } from '../consent/events'
import { appendAudit } from '../storage/audit'

function activeRules(plugin: string | null) {
  return plugin === 'labs' ? labsRedactionRules : financeRedactionRules
}

export function buildDocumentTools(plugin: string | null): ToolSpec[] {
  const rules = activeRules(plugin)

  return [
    {
      name: 'list_documents',
      description: 'List documents loaded into the active document set (plugin) only — never documents from another plugin.',
      parameters: [],
      tier: 'read',
      handler: async () => {
        const docs = plugin ? await listDocuments(plugin) : []
        return docs.map((d) => ({ id: d.id, name: d.name, pages: d.pageCount }))
      },
    },
    {
      name: 'get_disclosure_policy',
      description: 'Get the current disclosure policy and active grants.',
      parameters: [],
      tier: 'read',
      handler: async () => {
        const policy = getPolicy('default')
        const grants = await listGrants()
        return {
          policy: policy?.rules ?? {},
          grants: grants.map((g) => ({ scope: g.scope, level: g.level })),
        }
      },
    },
    {
      name: 'get_page_text',
      description: 'Get the text of a specific page, with redaction applied according to the disclosure policy. Requires consent if denied fields are present.',
      parameters: [
        { name: 'doc', type: 'string', description: 'Document id', required: true },
        { name: 'page', type: 'number', description: 'Page number (1-based)', required: true },
        { name: 'reason', type: 'string', description: 'Why the agent needs this page', required: false },
      ],
      tier: 'consent',
      handler: async ({ doc, page, reason }) => {
        const meta = await getDocument(String(doc))
        if (!meta || meta.plugin !== plugin) {
          throw new Error(`Document ${doc} is not part of the active document set (${plugin ?? 'none selected'}). Call list_documents first.`)
        }
        const parsed = await loadParsedPage(String(doc), Number(page))
        if (!parsed) {
          throw new Error(`Page ${page} not found on document ${doc}`)
        }
        const redactions = scanRedactions(parsed.spans, rules)
        const ruleIds = redactions.map((r) => r.ruleId)
        // Populating the local review UI does not authorize disclosing the raw
        // statement page to the model.
        if (plugin === 'finance') ruleIds.push('statement_page_text')
        const policy = getPolicy('default')
        const grants = await listGrants()
        const outcome = evaluateConsent(
          `page:${doc}:${page}`,
          String(reason ?? 'extract text'),
          policy ?? { documentSetId: 'default', rules: {} },
          grants,
          [...new Set(ruleIds)],
        )

        await appendAudit(consentToAuditEntry('get_page_text', `page:${doc}:${page}`, outcome))

        if (outcome.status === 'denied') {
          return {
            denied: true,
            reason: outcome.reason,
            available: outcome.available,
          }
        }

        const maskedSpans = applyRedactions(parsed.spans, redactions)
        const visibleText = maskedSpans.map((s) => s.text).join(' ')
        return {
          doc,
          page,
          text: visibleText,
          redactedSpanCount: redactions.length,
        }
      },
    },
    {
      name: 'request_disclosure',
      description: 'Request just-in-time disclosure for a denied scope.',
      parameters: [
        { name: 'scope', type: 'string', description: 'Scope to disclose', required: true },
        { name: 'reason', type: 'string', description: 'Why it is needed', required: true },
        { name: 'level', type: 'string', description: 'once | session | always', required: false, enum: ['once', 'session', 'always'] },
      ],
      tier: 'consent',
      handler: async ({ scope, reason, level }) => {
        const choice = await requestConsentWithUi({ scope: String(scope), reason: String(reason) })
        if (!choice) {
          await appendAudit({
            ts: Date.now(),
            tool: 'request_disclosure',
            scope: String(scope),
            decision: 'deny',
            reason: 'user did not respond or denied',
          })
          return { granted: false }
        }
        const grantLevel = (level as 'once' | 'session' | 'always') ?? choice
        await addGrant({ scope: String(scope), level: grantLevel, grantedAt: Date.now() })
        await appendAudit({
          ts: Date.now(),
          tool: 'request_disclosure',
          scope: String(scope),
          decision: 'granted-jit',
          grantSource: grantLevel,
          reason: String(reason),
        })
        return { granted: true, level: grantLevel }
      },
    },
  ]
}
