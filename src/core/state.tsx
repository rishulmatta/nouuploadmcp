import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react'
import type { DocumentMeta } from './storage/documents'
import { deleteDocument, listDocuments, saveDocument } from './storage/documents'
import { financeRedactionRules, labsRedactionRules } from './redact/patterns'
import { defaultPolicy, setPolicy } from './consent/policy'
import { reconcileFinanceDocuments } from '../plugins/finance/dataset'

export type PluginId = 'finance' | 'labs'

interface AppState {
  plugin: PluginId | null
  setPlugin: (p: PluginId | null) => void
  documents: DocumentMeta[]
  loadDocument: (name: string, bytes: Uint8Array) => Promise<DocumentMeta>
  removeDocument: (id: string) => Promise<void>
  refreshDocuments: () => Promise<void>
}

const AppContext = createContext<AppState | null>(null)

export function AppProvider({ children }: { children: ReactNode }) {
  const [plugin, setPlugin] = useState<PluginId | null>(null)
  const [documents, setDocuments] = useState<DocumentMeta[]>([])

  const refreshDocuments = useCallback(async () => {
    setDocuments(plugin ? await listDocuments(plugin) : [])
  }, [plugin])

  useEffect(() => {
    refreshDocuments()
  }, [refreshDocuments])

  useEffect(() => {
    if (plugin === 'finance') {
      setPolicy(defaultPolicy('default', financeRedactionRules))
    } else if (plugin === 'labs') {
      setPolicy(defaultPolicy('default', labsRedactionRules))
    }
  }, [plugin])

  const loadDocument = useCallback(async (name: string, bytes: Uint8Array) => {
    if (!plugin) throw new Error('No document set selected — pick a plugin before loading a document.')
    const id = `doc-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
    const meta = await saveDocument(id, name, bytes, plugin)
    if (plugin === 'finance') {
      const active = await listDocuments('finance')
      await reconcileFinanceDocuments(active.map((document) => document.id))
    }
    await refreshDocuments()
    return meta
  }, [plugin, refreshDocuments])

  const removeDocument = useCallback(async (id: string) => {
    await deleteDocument(id)
    if (plugin === 'finance') {
      const active = await listDocuments('finance')
      await reconcileFinanceDocuments(active.map((document) => document.id))
    }
    await refreshDocuments()
  }, [plugin, refreshDocuments])

  return (
    <AppContext.Provider value={{ plugin, setPlugin, documents, loadDocument, removeDocument, refreshDocuments }}>
      {children}
    </AppContext.Provider>
  )
}

export function useAppState() {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useAppState must be used within AppProvider')
  return ctx
}
