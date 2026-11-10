import { useState } from 'react'
import { createTeam } from '../api'

export default function TeamsTab({ teams, candidates, token, onRefresh, setMessage }) {
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ name: 'Westlands Ground Team', campaignId: '', leaderId: '' })

  const submit = async (e) => {
    e.preventDefault()
    if (!form.campaignId) { setMessage('Pick a Campaign first'); return }
    const data = await createTeam(token, form)
    if (data.id) { setMessage('Team created!'); setShowForm(false); onRefresh() }
    else setMessage(data.error)
  }

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h2 style={{ margin: 0 }}>Teams</h2>
        <button onClick={() => setShowForm(!showForm)} style={{ padding: '10px 20px', background: '#7c3aed', color: 'white', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 'bold' }}>{showForm ? 'Close' : '+ Create Team'}</button>
      </div>
      {showForm && (
        <form onSubmit={submit} style={{ background: 'white', padding: 20, borderRadius: 12, marginBottom: 20, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Team Name" style={{ padding: 10, borderRadius: 8, border: '1px solid #cbd5e1' }} />
          <select value={form.campaignId} onChange={e => setForm({ ...form, campaignId: e.target.value })} style={{ padding: 10, borderRadius: 8, border: '1px solid #cbd5e1' }}>
            <option value="">-- Select Campaign --</option>
            {candidates.flatMap(c => (c.campaigns || []).map(camp => <option key={camp.id} value={camp.id}>{camp.name} ({c.fullName})</option>))}
          </select>
          <input value={form.leaderId} onChange={e => setForm({ ...form, leaderId: e.target.value })} placeholder="Leader ID (optional)" style={{ padding: 10, borderRadius: 8, border: '1px solid #cbd5e1' }} />
          <button type="submit" style={{ gridColumn: 'span 2', padding: 12, background: '#7c3aed', color: 'white', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 'bold' }}>Create Team</button>
        </form>
      )}
      {teams.length === 0 ? <div style={{ background: 'white', padding: 40, borderRadius: 12, textAlign: 'center', color: '#64748b' }}>No teams yet - Create your first team</div> : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>
          {teams.map(t => (
            <div key={t.id} style={{ background: 'white', padding: 20, borderRadius: 12 }}>
              <h3 style={{ margin: 0 }}>👥 {t.name}</h3>
              <p style={{ color: '#64748b', fontSize: 13 }}>Campaign: {t.campaign?.name || t.campaignId}</p>
              <p><b>Volunteers:</b> {t.volunteers?.length || 0}</p>
              <div>{(t.volunteers || []).map(v => <span key={v.id} style={{ display: 'inline-block', background: '#f1f5f9', padding: '4px 10px', borderRadius: 20, fontSize: 12, margin: '2px 4px 2px 0' }}>{v.fullName} • {v.onboardingStatus}</span>)}</div>
            </div>
          ))}
        </div>
      )}
    </>
  )
}