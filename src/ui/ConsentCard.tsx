import { useEffect, useState } from 'react'
import { onConsentRequest, type ConsentEvent } from '../core/consent/events'

export default function ConsentCard() {
  const [requests, setRequests] = useState<ConsentEvent[]>([])

  useEffect(() => {
    return onConsentRequest((event) => {
      setRequests((prev) => [...prev, event])
    })
  }, [])

  if (requests.length === 0) return null

  const handle = (event: ConsentEvent, level: 'once' | 'session' | 'always' | null) => {
    event.resolve(level)
    setRequests((prev) => prev.filter((r) => r.id !== event.id))
  }

  return (
    <div className="consent-overlay">
      {requests.map((req) => (
        <div key={req.id} className="consent-card card">
          <h3>The agent is requesting</h3>
          <p><strong>Scope:</strong> {req.request.scope}</p>
          <p><strong>Reason:</strong> {req.request.reason}</p>
          <div className="row">
            <button className="primary" onClick={() => handle(req, 'once')}>Allow once</button>
            <button onClick={() => handle(req, 'session')}>Allow this session</button>
            <button onClick={() => handle(req, 'always')}>Always</button>
            <button className="ghost" onClick={() => handle(req, null)}>Deny</button>
          </div>
        </div>
      ))}
    </div>
  )
}
