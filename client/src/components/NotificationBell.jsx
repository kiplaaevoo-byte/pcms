import { useState, useEffect } from 'react'
import { API } from '../api'

export default function NotificationBell({ token, onGoMessages }) {
  const [count, setCount] = useState(0)
  const [open, setOpen] = useState(false)
  const load = async () => {
    if (!token) return
    try {
      const r = await fetch(`${API}/api/messages/unread/count`, { headers: { 'Authorization': `Bearer ${token}` } })
      const d = await r.json()
      setCount(d.count || 0)
    } catch {}
  }
  useEffect(() => {
    load()
    const t = setInterval(load, 10000) // check every 10 sec
    return () => clearInterval(t)
  }, [token])

  return (
    <div style={{ position: 'relative' }}>
      <button onClick={() => setOpen(!open)} title="Notifications" style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: '50%', width: 42, height: 42, cursor: 'pointer', fontSize: 20, position: 'relative' }}>
        🔔
        {count > 0 && <span style={{ position: 'absolute', top: -4, right: -4, background: '#ef4444', color: 'white', fontSize: 11, fontWeight: 'bold', minWidth: 20, height: 20, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 4px', border: '2px solid white' }}>{count > 99 ? '99+' : count}</span>}
      </button>
      {open && (
        <div style={{ position: 'absolute', right: 0, top: 50, width: 280, background: 'white', borderRadius: 12, boxShadow: '0 10px 30px rgba(0,0,0,0.15)', border: '1px solid #e2e8f0', zIndex: 100, overflow: 'hidden' }}>
          <div style={{ padding: '12px 14px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <b>🔔 Notifications</b>
            <button onClick={() => setOpen(false)} style={{ border: 'none', background: 'none', cursor: 'pointer' }}>✕</button>
          </div>
          <div style={{ padding: 14 }}>
            {count === 0 ? (
              <p style={{ margin: 0, color: '#64748b', fontSize: 13 }}>✅ No new messages.<br />You're all caught up!</p>
            ) : (
              <p style={{ margin: 0, fontSize: 13, lineHeight: 1.5 }}>You have <b style={{ color: '#ef4444' }}>{count} unread message{count > 1 ? 's' : ''}</b> 💬<br />Someone messaged you.</p>
            )}
            <button onClick={() => { setOpen(false); onGoMessages && onGoMessages() }} style={{ marginTop: 12, width: '100%', background: '#2563eb', color: 'white', border: 'none', padding: '10px', borderRadius: 8, cursor: 'pointer', fontWeight: 'bold' }}>Open Messages →</button>
            <button onClick={() => { load(); setOpen(false) }} style={{ marginTop: 6, width: '100%', background: '#f1f5f9', border: 'none', padding: '9px', borderRadius: 8, cursor: 'pointer' }}>↻ Refresh</button>
          </div>
        </div>
      )}
    </div>
  )
}