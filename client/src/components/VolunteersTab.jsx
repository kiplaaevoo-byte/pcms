import { useState } from 'react'
import { createVolunteer, updateVolunteer } from '../api'

export default function VolunteersTab({ volunteers, teams, token, onRefresh, setMessage }) {
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ fullName: 'John Kamau', phone: '+254722111222', teamId: '', onboardingStatus: 'PENDING', consentRecord: true })

  const submit = async (e) => {
    e.preventDefault()
    const data = await createVolunteer(token, form)
    if (data.id) { setMessage('Volunteer added!'); setShowForm(false); onRefresh() }
    else setMessage(data.error)
  }

  const setStatus = async (id, onboardingStatus) => {
    await updateVolunteer(token, id, { onboardingStatus })
    setMessage(`Volunteer ${onboardingStatus}`); onRefresh()
  }

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h2 style={{ margin: 0 }}>Volunteers</h2>
        <button onClick={() => setShowForm(!showForm)} style={{ padding: '10px 20px', background: '#16a34a', color: 'white', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 'bold' }}>{showForm ? 'Close' : '+ Add Volunteer'}</button>
      </div>
      {showForm && (
        <form onSubmit={submit} style={{ background: 'white', padding: 20, borderRadius: 12, marginBottom: 20, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <input value={form.fullName} onChange={e => setForm({ ...form, fullName: e.target.value })} placeholder="Full Name" style={{ padding: 10, borderRadius: 8, border: '1px solid #cbd5e1' }} />
          <input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} placeholder="Phone" style={{ padding: 10, borderRadius: 8, border: '1px solid #cbd5e1' }} />
          <select value={form.teamId} onChange={e => setForm({ ...form, teamId: e.target.value })} style={{ padding: 10, borderRadius: 8, border: '1px solid #cbd5e1' }}>
            <option value="">-- Assign to Team (optional) --</option>
            {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
          <select value={form.onboardingStatus} onChange={e => setForm({ ...form, onboardingStatus: e.target.value })} style={{ padding: 10, borderRadius: 8, border: '1px solid #cbd5e1' }}>
            <option value="PENDING">PENDING</option><option value="APPROVED">APPROVED</option><option value="REJECTED">REJECTED</option>
          </select>
          <button type="submit" style={{ gridColumn: 'span 2', padding: 12, background: '#16a34a', color: 'white', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 'bold' }}>Add Volunteer</button>
        </form>
      )}
      {volunteers.length === 0 ? <div style={{ background: 'white', padding: 40, borderRadius: 12, textAlign: 'center', color: '#64748b' }}>No volunteers yet</div> : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
          {volunteers.map(v => (
            <div key={v.id} style={{ background: 'white', padding: 20, borderRadius: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}><h3 style={{ margin: 0 }}>🙋 {v.fullName}</h3><span style={{ background: v.onboardingStatus === 'APPROVED' ? '#dcfce7' : v.onboardingStatus === 'REJECTED' ? '#fee2e2' : '#fef9c3', padding: '4px 8px', borderRadius: 20, fontSize: 12 }}>{v.onboardingStatus}</span></div>
              <p>📞 {v.phone}</p>
              <p style={{ color: '#64748b', fontSize: 13 }}>Team: {teams.find(t => t.id === v.teamId)?.name || 'Unassigned'}</p>
              <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                <button onClick={() => setStatus(v.id, 'APPROVED')} style={{ padding: '6px 12px', background: '#16a34a', color: 'white', border: 'none', borderRadius: 6, cursor: 'pointer' }}>Approve</button>
                <button onClick={() => setStatus(v.id, 'REJECTED')} style={{ padding: '6px 12px', background: '#dc2626', color: 'white', border: 'none', borderRadius: 6, cursor: 'pointer' }}>Reject</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  )
}