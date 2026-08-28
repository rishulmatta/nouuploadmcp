import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react'
import type { DocumentMeta } from './storage/documents'
import { listDocuments, saveDocument } from './storage/documents'
import { financeRedactionRules, labsRedactionRules } from './redact/patterns'
import { defaultPolicy, setPolicy } from './consent/policy'

export type PluginId = 'finance' | 'labs'

interface AppState {
  plugin: PluginId | null
  setPlugin: (p: PluginId | null) => void
  documents: DocumentMeta[]
  loadDocument: (name: string, bytes: Uint8Array) => Promise<DocumentMeta>
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
    await refreshDocuments()
    return meta
  }, [plugin, refreshDocuments])

  return (
    <AppContext.Provider value={{ plugin, setPlugin, documents, loadDocument, refreshDocuments }}>
      {children}
    </AppContext.Provider>
  )
}

export function useAppState() {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useAppState must be used within AppProvider')
  return ctx
}
