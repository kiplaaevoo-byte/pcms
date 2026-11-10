import { useState, useEffect } from 'react'
import { API } from '../api'

export default function EventsPage({ token, user, campaigns = [], setMessage }) {
  const [events, setEvents] = useState([])
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState(null)
  const [f, setF] = useState({ title: '', description: '', date: '', location: '', type: 'RALLY', status: 'UPCOMING', campaignId: '' })
  const canCreate = ['SUPER_ADMIN', 'CAMPAIGN_ADMIN', 'ADMIN', 'CANDIDATE', 'CAMPAIGN_MANAGER'].includes(user?.role)
  const input = { width: '100%', padding: 11, borderRadius: 8, border: '1px solid #cbd5e1', boxSizing: 'border-box', fontSize: 14, marginBottom: 10 }
  const load = async () => {
    try { const r = await fetch(`${API}/api/events`, { headers: { 'Authorization': `Bearer ${token}` } }); const d = await r.json(); setEvents(Array.isArray(d) ? d : []) } catch { setEvents([]) }
  }
  useEffect(() => { load() }, [])
  const submit = async (e) => {
    e.preventDefault()
    if (!f.title || !f.date) return setMessage && setMessage('Title and Date required')
    try {
      const url = editing ? `${API}/api/events/${editing.id}` : `${API}/api/events`
      const res = await fetch(url, { method: editing ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }, body: JSON.stringify(f) })
      const d = await res.json().catch(() => ({}))
      if (d.error) setMessage && setMessage(d.error); else { setMessage && setMessage(editing ? 'Event updated!' : 'Event created!'); setShowForm(false); setEditing(null); setF({ title: '', description: '', date: '', location: '', type: 'RALLY', status: 'UPCOMING', campaignId: '' }); load() }
    } catch { setMessage && setMessage('Failed - check backend') }
  }
  const del = async (id) => { if (!window.confirm('Delete this event?')) return; await fetch(`${API}/api/events/${id}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` } }); load() }
  const startEdit = (ev) => { setEditing(ev); setF({ title: ev.title, description: ev.description || '', date: ev.date?.slice(0, 16), location: ev.location || '', type: ev.type, status: ev.status, campaignId: ev.campaignId || '' }); setShowForm(true) }
  const upcoming = events.filter(e => e.status === 'UPCOMING' || e.status === 'ONGOING')
  const past = events.filter(e => e.status === 'COMPLETED' || e.status === 'CANCELLED')
  return (
    <div style={{ background: 'white', borderRadius: 14, padding: 20 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
        <h3 style={{ margin: 0 }}>📅 Events & Activities ({events.length})</h3>
        {canCreate && <button onClick={() => { setShowForm(!showForm); setEditing(null) }} style={{ background: '#16a34a', color: 'white', border: 'none', padding: '9px 16px', borderRadius: 8, cursor: 'pointer', fontWeight: 'bold' }}>{showForm ? '✕ Close' : '+ Create Event'}</button>}
      </div>
      {!canCreate && <p style={{ fontSize: 12, color: '#64748b' }}>You can view events. Manager / Candidate / Admin can create.</p>}
      {showForm && (
        <form onSubmit={submit} style={{ background: '#f8fafc', padding: 16, borderRadius: 12, marginTop: 14 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))', gap: '0 12px' }}>
            <input value={f.title} onChange={e => setF({ ...f, title: e.target.value })} placeholder="Event Title *" style={input} required />
            <input type="datetime-local" value={f.date} onChange={e => setF({ ...f, date: e.target.value })} style={input} required />
            <input value={f.location} onChange={e => setF({ ...f, location: e.target.value })} placeholder="Location e.g. Sotik Market" style={input} />
            <select value={f.type} onChange={e => setF({ ...f, type: e.target.value })} style={input}><option>RALLY</option><option>MEETING</option><option>DOOR_TO_DOOR</option><option>FUNDRAISER</option><option>OTHER</option></select>
            <select value={f.status} onChange={e => setF({ ...f, status: e.target.value })} style={input}><option>UPCOMING</option><option>ONGOING</option><option>COMPLETED</option><option>CANCELLED</option></select>
            <select value={f.campaignId} onChange={e => setF({ ...f, campaignId: e.target.value })} style={input}><option value="">No Campaign / Select</option>{campaigns.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select>
          </div>
          <textarea value={f.description} onChange={e => setF({ ...f, description: e.target.value })} placeholder="Description..." style={{ ...input, minHeight: 60 }} />
          <button type="submit" style={{ background: '#16a34a', color: 'white', border: 'none', padding: '10px 20px', borderRadius: 8, cursor: 'pointer', fontWeight: 'bold' }}>{editing ? 'Update Event' : 'Create Event'}</button>
        </form>
      )}
      <h4 style={{ margin: '18px 0 8px' }}>🔥 Upcoming ({upcoming.length})</h4>
      {upcoming.length === 0 ? <p style={{ color: '#94a3b8' }}>No upcoming events. {canCreate ? 'Create one above!' : ''}</p> : upcoming.map(ev => (
        <div key={ev.id} style={{ border: '1px solid #e2e8f0', borderRadius: 10, padding: 14, marginBottom: 10, display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
          <div><b style={{ fontSize: 16 }}>{ev.title}</b> <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 10, background: '#dbeafe' }}>{ev.type}</span> <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 10, background: '#dcfce7' }}>{ev.status}</span><br /><span style={{ fontSize: 13, color: '#475569' }}>📅 {new Date(ev.date).toLocaleString()} • 📍 {ev.location || '-'} • By: {ev.createdBy?.fullName || ''}</span><br /><span style={{ fontSize: 13 }}>{ev.description || ''}</span></div>
          {canCreate && <div style={{ display: 'flex', gap: 6 }}><button onClick={() => startEdit(ev)} style={{ background: '#f59e0b', color: 'white', border: 'none', padding: '6px 12px', borderRadius: 6, cursor: 'pointer' }}>Edit</button><button onClick={() => del(ev.id)} style={{ background: '#ef4444', color: 'white', border: 'none', padding: '6px 12px', borderRadius: 6, cursor: 'pointer' }}>Delete</button></div>}
        </div>
      ))}
      {past.length > 0 && <><h4 style={{ margin: '18px 0 8px' }}>📁 Past ({past.length})</h4>{past.map(ev => (
        <div key={ev.id} style={{ border: '1px solid #f1f5f9', borderRadius: 10, padding: 12, marginBottom: 8, opacity: 0.8 }}><b>{ev.title}</b> - {new Date(ev.date).toLocaleDateString()} - {ev.status} - {ev.location || ''}</div>
      ))}</>}
    </div>
  )
}