export interface RedactionRule {
  id: string
  label: string
  default: 'allow' | 'aggregate' | 'deny'
  regex: RegExp
}

export const financeRedactionRules: RedactionRule[] = [
  {
    // Raw statement text is a separate disclosure from local extraction. This
    // synthetic rule is evaluated by get_page_text but matches no page spans.
    id: 'statement_page_text',
    label: 'Raw statement page text',
    default: 'deny',
    regex: /$^/g,
  },
  {
    id: 'account_number',
    label: 'Account number',
    default: 'deny',
    regex: /\b\*{0,4}\d{4,8}\b/g,
  },
  {
    id: 'sort_code',
    label: 'Sort code',
    default: 'deny',
    regex: /\b\d{2}-\d{2}-\d{2}\b/g,
  },
  {
    id: 'name',
    label: 'Holder name',
    default: 'deny',
    regex: /\b(Mr|Mrs|Ms|Dr)\s+[A-Z][a-z]+(\s+[A-Z][a-z]+)?\b/g,
  },
  {
    id: 'address',
    label: 'Address',
    default: 'deny',
    regex: /\d+\s+Privacy\s+Lane[^\n]*/gi,
  },
]

export const labsRedactionRules: RedactionRule[] = [
  {
    id: 'patient_name',
    label: 'Patient name',
    default: 'deny',
    regex: /\b(Mr|Mrs|Ms|Dr)\s+[A-Z][a-z]+(\s+[A-Z][a-z]+)?\b/g,
  },
  {
    id: 'dob',
    label: 'Date of birth',
    default: 'deny',
    regex: /\bDOB[:\s]+\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}\b/gi,
  },
  {
    id: 'mrn',
    label: 'MRN',
    default: 'deny',
    regex: /\bMRN[:\s]+[A-Z0-9]+\b/gi,
  },
]
