import { useState } from 'react'
import { createCandidate } from '../api'

export default function CandidatesTab({ candidates, token, onRefresh, onOpen, message, setMessage }) {
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({
    candidateId: 'CAND-007', fullName: 'Amina Wanjiru', phone: '+254712345678', email: 'amina@pcms.com',
    party: 'Independent', positionContested: 'Member of Parliament', county: 'Nairobi',
    constituency: 'Westlands', ward: 'Kitisuru', biography: 'Community leader and educator',
    education: 'Masters in Public Policy', leadershipExperience: '5 years as MCA'
  })

  const submit = async (e) => {
    e.preventDefault()
    const data = await createCandidate(token, form)
    if (data.id) { setMessage('Candidate created!'); setShowForm(false); onRefresh() }
    else setMessage(data.error)
  }

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h2 style={{ margin: 0 }}>Candidates</h2>
        <button onClick={() => setShowForm(!showForm)} style={{ padding: '10px 20px', background: '#2563eb', color: 'white', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 'bold' }}>{showForm ? 'Close' : '+ Add Candidate'}</button>
      </div>
      {showForm && (
        <form onSubmit={submit} style={{ background: 'white', padding: 20, borderRadius: 12, marginBottom: 20, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          {Object.keys(form).map(k => <input key={k} value={form[k]} onChange={e => setForm({ ...form, [k]: e.target.value })} placeholder={k} style={{ padding: 10, borderRadius: 8, border: '1px solid #cbd5e1' }} />)}
          <button type="submit" style={{ gridColumn: 'span 2', padding: 12, background: '#16a34a', color: 'white', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 'bold' }}>Create Candidate</button>
        </form>
      )}
      {candidates.length === 0 ? <div style={{ background: 'white', padding: 40, borderRadius: 12, textAlign: 'center', color: '#64748b' }}>No candidates yet</div> : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>
          {candidates.map(c => (
            <div key={c.id} onClick={() => onOpen(c.id)} style={{ background: 'white', padding: 20, borderRadius: 12, cursor: 'pointer' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}><h3 style={{ margin: 0 }}>{c.fullName}</h3><span style={{ background: '#dcfce7', color: '#166534', padding: '4px 8px', borderRadius: 20, fontSize: 12 }}>{c.status}</span></div>
              <p style={{ color: '#64748b', margin: '8px 0' }}>{c.candidateId} • {c.party}</p>
              <p style={{ margin: '4px 0' }}><b>Position:</b> {c.positionContested}</p>
              <p style={{ margin: '4px 0' }}><b>Location:</b> {c.county} - {c.constituency}, {c.ward}</p>
              <p style={{ margin: '4px 0' }}><b>Phone:</b> {c.phone}</p>
              <p style={{ color: '#2563eb', fontWeight: 'bold', margin: '12px 0 0', fontSize: 14 }}>View Profile →</p>
            </div>
          ))}
        </div>
      )}
    </>
  )
}