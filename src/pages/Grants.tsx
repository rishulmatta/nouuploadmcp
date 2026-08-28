import { useEffect, useState } from 'react'
import { listGrants, revokeGrant, type Grant } from '../core/consent/grants'

export default function Grants() {
  const [grants, setGrants] = useState<Grant[]>([])

  const refresh = () => listGrants().then(setGrants)
  useEffect(() => { refresh() }, [])

  const revoke = async (scope: string) => {
    await revokeGrant(scope)
    await refresh()
  }

  return (
    <div className="container">
      <h1>Active grants</h1>
      {grants.length === 0 ? (
        <div className="card">No active grants.</div>
      ) : (
        <ul>
          {grants.map((g, i) => (
            <li key={i} className="card row" style={{ justifyContent: 'space-between' }}>
              <span><code>{g.scope}</code> · {g.level} · {new Date(g.grantedAt).toLocaleString()}</span>
              <button onClick={() => revoke(g.scope)}>Revoke</button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
