import { getStorage } from '../storage'

export interface Grant {
  scope: string
  level: 'once' | 'session' | 'always'
  grantedAt: number
  documentSetId?: string
}

const GRANTS_PATH = 'grants.json'
const sessionGrants: Grant[] = []

async function loadPersistedGrants(): Promise<Grant[]> {
  try {
    const storage = await getStorage()
    const text = await storage.readText(GRANTS_PATH)
    return JSON.parse(text) as Grant[]
  } catch {
    return []
  }
}

async function savePersistedGrants(grants: Grant[]) {
  const always = grants.filter((g) => g.level === 'always')
  const storage = await getStorage()
  await storage.writeFile(GRANTS_PATH, JSON.stringify(always))
}

export async function listGrants(): Promise<Grant[]> {
  const persisted = await loadPersistedGrants()
  return [...persisted, ...sessionGrants]
}

export async function addGrant(grant: Grant): Promise<void> {
  if (grant.level === 'session') {
    sessionGrants.push(grant)
    return
  }
  const persisted = await loadPersistedGrants()
  persisted.push(grant)
  await savePersistedGrants(persisted)
}

export async function revokeGrant(scope: string): Promise<void> {
  const persisted = (await loadPersistedGrants()).filter((g) => g.scope !== scope)
  await savePersistedGrants(persisted)
  for (let i = sessionGrants.length - 1; i >= 0; i--) {
    if (sessionGrants[i].scope === scope) sessionGrants.splice(i, 1)
  }
}

export function clearSessionGrants() {
  sessionGrants.length = 0
}
