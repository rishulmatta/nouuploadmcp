import { useEffect, useState } from 'react'
import { listAudit, auditStats, type AuditEntry } from '../core/storage/audit'

export default function Audit() {
  const [entries, setEntries] = useState<AuditEntry[]>([])

  useEffect(() => {
    listAudit().then(setEntries)
  }, [])

  const stats = auditStats(entries)

  return (
    <div className="container col">
      <h1>Audit log</h1>
      <p className="pill">
        Nothing has been uploaded. {stats.calls} tool calls · {stats.allowed} disclosures authorized · {stats.denied} denied · 0 bytes sent to any server.
      </p>

      {entries.length === 0 ? (
        <div className="card">No audit entries yet.</div>
      ) : (
        <table className="audit-table">
          <thead>
            <tr>
              <th>Time</th>
              <th>Tool</th>
              <th>Scope</th>
              <th>Decision</th>
              <th>Reason</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((e, i) => (
              <tr key={i}>
                <td>{new Date(e.ts).toLocaleString()}</td>
                <td>{e.tool}</td>
                <td>{e.scope}</td>
                <td>{e.decision}</td>
                <td>{e.reason ?? '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}
