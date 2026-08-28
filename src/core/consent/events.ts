import { requestConsent as requestConsentImpl, type ConsentRequest } from './jit'

export interface ConsentEvent {
  id: string
  request: ConsentRequest
  resolve: (level: 'once' | 'session' | 'always' | null) => void
}

const listeners = new Set<(event: ConsentEvent) => void>()

export function onConsentRequest(fn: (event: ConsentEvent) => void) {
  listeners.add(fn)
  return () => listeners.delete(fn)
}

let idCounter = 0

export function requestConsentWithUi(req: ConsentRequest): Promise<'once' | 'session' | 'always' | null> {
  const id = `ui-${++idCounter}`
  return new Promise((resolve) => {
    listeners.forEach((fn) => fn({ id, request: req, resolve }))
    // If no UI mounted, resolve null after a tick so the agent gets a denial
    setTimeout(() => resolve(null), 100)
  })
}

// Patch jit.ts to use UI-backed consent
export function installConsentUi() {
  // This is a placeholder; the actual override is done in documentTools.ts
}
