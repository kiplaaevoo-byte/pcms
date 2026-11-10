import { useState, useEffect, useRef } from 'react'
import { API } from '../api'

export default function MessagesPage({ token, user, setMessage }) {
  const [users, setUsers] = useState([])
  const [selected, setSelected] = useState(null)
  const [msgs, setMsgs] = useState([])
  const [text, setText] = useState('')
  const [search, setSearch] = useState('')
  const bottomRef = useRef(null)
  const loadUsers = async () => {
    try { const r = await fetch(`${API}/api/messages/users`, { headers: { 'Authorization': `Bearer ${token}` } }); const d = await r.json(); setUsers(Array.isArray(d) ? d : []) } catch { setUsers([]) }
  }
  const loadMsgs = async (otherId) => {
    try { const r = await fetch(`${API}/api/messages/${otherId}`, { headers: { 'Authorization': `Bearer ${token}` } }); const d = await r.json(); setMsgs(Array.isArray(d) ? d : []) } catch { setMsgs([]) }
  }
  useEffect(() => { loadUsers(); const t = setInterval(() => { if (selected) loadMsgs(selected.id) }, 5000); return () => clearInterval(t) }, [selected])
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [msgs])
  const send = async (e) => {
    e.preventDefault()
    if (!selected || !text.trim()) return
    try {
      const res = await fetch(`${API}/api/messages`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }, body: JSON.stringify({ receiverId: selected.id, content: text }) })
      const d = await res.json().catch(() => ({}))
      if (d.error) setMessage && setMessage(d.error); else { setText(''); loadMsgs(selected.id) }
    } catch { setMessage && setMessage('Send failed') }
  }
  const filtered = users.filter(u => (u.fullName || '').toLowerCase().includes(search.toLowerCase()) || (u.role || '').toLowerCase().includes(search.toLowerCase()))
  return (
    <div style={{ background: 'white', borderRadius: 14, overflow: 'hidden', display: 'flex', minHeight: 520, flexWrap: 'wrap' }}>
      <div style={{ width: 280, borderRight: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', maxHeight: 600 }}>
        <div style={{ padding: 14, borderBottom: '1px solid #e2e8f0' }}><h3 style={{ margin: '0 0 10px' }}>💬 Messages</h3><input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search name / role..." style={{ width: '100%', padding: 9, borderRadius: 8, border: '1px solid #cbd5e1', boxSizing: 'border-box' }} /></div>
        <div style={{ overflowY: 'auto', flex: 1 }}>
          {filtered.length === 0 ? <p style={{ padding: 14, color: '#94a3b8', fontSize: 13 }}>No users yet. Ask Admin to approve users.</p> : filtered.map(u => (
            <button key={u.id} onClick={() => { setSelected(u); loadMsgs(u.id) }} style={{ width: '100%', textAlign: 'left', padding: '12px 14px', border: 'none', borderBottom: '1px solid #f1f5f9', background: selected?.id === u.id ? '#eff6ff' : 'white', cursor: 'pointer', display: 'flex', gap: 10, alignItems: 'center' }}>
              <div style={{ width: 38, height: 38, borderRadius: '50%', background: '#1d4ed8', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', flexShrink: 0 }}>{(u.fullName || '?').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()}</div>
              <div style={{ flex: 1, minWidth: 0 }}><div style={{ fontWeight: 'bold', fontSize: 13, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{u.fullName}</div><div style={{ fontSize: 11, color: '#64748b' }}>{u.role} • {u.county}</div></div>
            </button>
          ))}
        </div>
      </div>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 280, minHeight: 400 }}>
        {!selected ? (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', padding: 20, textAlign: 'center' }}>👈 Select a person to start chatting<br />Manager ↔ Team Leader ↔ Volunteer ↔ Candidate</div>
        ) : (
          <>
            <div style={{ padding: '12px 16px', borderBottom: '1px solid #e2e8f0', display: 'flex', gap: 10, alignItems: 'center', background: '#f8fafc' }}>
              <div style={{ width: 36, height: 36, borderRadius: '50%', background: '#16a34a', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>{selected.fullName.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()}</div>
              <div><b>{selected.fullName}</b><div style={{ fontSize: 11, color: '#64748b' }}>{selected.role} • {selected.county}</div></div>
            </div>
            <div style={{ flex: 1, overflowY: 'auto', padding: 14, display: 'flex', flexDirection: 'column', gap: 8, background: '#f8fafc', maxHeight: 420 }}>
              {msgs.length === 0 ? <p style={{ textAlign: 'center', color: '#94a3b8', fontSize: 13 }}>No messages yet. Say hello! 👋</p> : msgs.map(m => {
                const mine = m.senderId === user?.id
                return <div key={m.id} style={{ alignSelf: mine ? 'flex-end' : 'flex-start', background: mine ? '#2563eb' : 'white', color: mine ? 'white' : '#0f172a', padding: '9px 12px', borderRadius: 12, maxWidth: '80%', fontSize: 14, boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}><div>{m.content}</div><div style={{ fontSize: 10, opacity: 0.7, marginTop: 4, textAlign: 'right' }}>{new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div></div>
              })}
              <div ref={bottomRef}></div>
            </div>
            <form onSubmit={send} style={{ display: 'flex', gap: 8, padding: 12, borderTop: '1px solid #e2e8f0' }}>
              <input value={text} onChange={e => setText(e.target.value)} placeholder={`Message ${selected.fullName}...`} style={{ flex: 1, padding: 11, borderRadius: 20, border: '1px solid #cbd5e1' }} />
              <button type="submit" style={{ background: '#2563eb', color: 'white', border: 'none', padding: '11px 18px', borderRadius: 20, cursor: 'pointer', fontWeight: 'bold' }}>Send →</button>
            </form>
          </>
        )}
      </div>
    </div>
  )
}