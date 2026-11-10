import { useState } from 'react'
import { updateCandidate } from '../api'

export default function CandidateProfile({ selected, user, token, onBack, onRefresh, message, setMessage }) {
  // Dashboard passes user={safeUser}, old code passed selected={...}
  // Accept BOTH so it never crashes
  const data = selected || user || {
    fullName: 'User', email: '', phone: '', county: '', constituency: '', ward: '',
    party: '', positionContested: '', education: '', leadershipExperience: '',
    biography: '', status: 'ACTIVE', candidateId: '', campaigns: []
  }

  const [editing, setEditing] = useState(false)
  const [editForm, setEditForm] = useState(data)

  const initials = data.fullName?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || 'U'

  const save = async (e) => {
    e.preventDefault()
    try {
      if (!data.id) {
        if (setMessage) setMessage('Cannot update - no candidate ID')
        setEditing(false)
        return
      }
      const res = await updateCandidate(token, data.id, editForm)
      if (res.id) {
        if (setMessage) setMessage('Profile updated!')
        setEditing(false)
        if (onRefresh) onRefresh(res)
      } else {
        if (setMessage) setMessage(res.error || 'Update failed')
      }
    } catch {
      if (setMessage) setMessage('Cannot connect to backend')
    }
  }

  return (
    <div style={{ background: 'white', borderRadius: 16, overflow: 'hidden', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', fontFamily: 'sans-serif' }}>
      {onBack && (
        <header style={{ background: '#0f172a', color: 'white', padding: '16px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h1 style={{ margin: 0, fontSize: 20 }}>🗳️ PCMS Dashboard</h1>
          <button onClick={onBack} style={{ padding: '8px 16px', background: '#334155', color: 'white', border: 'none', borderRadius: 8, cursor: 'pointer' }}>← Back</button>
        </header>
      )}
      <div style={{ maxWidth: 900, margin: '0 auto', padding: 24 }}>
        {message && <div style={{ background: '#dbeafe', padding: 12, borderRadius: 8, marginBottom: 16 }}>{message}</div>}
        <div style={{ background: 'white', borderRadius: 16, overflow: 'hidden' }}>
          <div style={{ background: 'linear-gradient(135deg, #0f172a, #2563eb)', padding: 24, color: 'white', display: 'flex', gap: 20, alignItems: 'center', flexWrap: 'wrap' }}>
            <div style={{ width: 100, height: 100, borderRadius: '50%', background: '#f59e0b', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 36, fontWeight: 'bold', border: '4px solid white', flexShrink: 0 }}>{initials}</div>
            <div style={{ flex: 1, minWidth: 200 }}><h2 style={{ margin: 0, fontSize: 28 }}>{data.fullName}</h2><p style={{ margin: '6px 0' }}>{data.positionContested || data.role || ''} • {data.party || ''}</p><p style={{ margin: 0, opacity: 0.8, fontSize: 14 }}>{data.candidateId || data.userId || ''} • {data.county || ''} - {data.constituency || ''}, {data.ward || ''}</p></div>
            <span style={{ background: '#16a34a', padding: '6px 14px', borderRadius: 20, fontSize: 13, fontWeight: 'bold' }}>{data.status || 'ACTIVE'}</span>
          </div>
          <div style={{ padding: 24 }}>
            {!editing ? (
              <>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 20 }}>
                  <div style={{ background: '#f8fafc', padding: 16, borderRadius: 12 }}><p style={{ margin: 0, color: '#64748b', fontSize: 13 }}>📞 PHONE</p><p style={{ margin: '6px 0 0', fontWeight: 'bold' }}>{data.phone || '-'}</p></div>
                  <div style={{ background: '#f8fafc', padding: 16, borderRadius: 12 }}><p style={{ margin: 0, color: '#64748b', fontSize: 13 }}>📧 EMAIL</p><p style={{ margin: '6px 0 0', fontWeight: 'bold' }}>{data.email || 'Not provided'}</p></div>
                  <div style={{ background: '#f8fafc', padding: 16, borderRadius: 12 }}><p style={{ margin: 0, color: '#64748b', fontSize: 13 }}>🎓 EDUCATION</p><p style={{ margin: '6px 0 0' }}>{data.education || '-'}</p></div>
                  <div style={{ background: '#f8fafc', padding: 16, borderRadius: 12 }}><p style={{ margin: 0, color: '#64748b', fontSize: 13 }}>👑 LEADERSHIP</p><p style={{ margin: '6px 0 0' }}>{data.leadershipExperience || '-'}</p></div>
                </div>
                <h3>About</h3><p style={{ color: '#475569', lineHeight: 1.6 }}>{data.biography || 'No biography yet.'}</p>
                <h3>Campaigns ({data.campaigns?.length || data.campaigns?.length || 0})</h3>
                {(!data.campaigns || data.campaigns.length === 0) ? <p style={{ color: '#64748b', background: '#f8fafc', padding: 16, borderRadius: 12 }}>No campaigns yet.</p> : data.campaigns.map(c => (
                  <div key={c.id} style={{ background: '#f8fafc', padding: 16, borderRadius: 12, marginBottom: 10, display: 'flex', justifyContent: 'space-between' }}><div><b>{c.name}</b><p style={{ margin: '4px 0 0', color: '#64748b', fontSize: 13 }}>{c.objectives}</p></div><span style={{ background: '#dbeafe', padding: '4px 10px', borderRadius: 20, fontSize: 12, height: 'fit-content' }}>{c.status}</span></div>
                ))}
                <button onClick={() => { setEditForm(data); setEditing(true) }} style={{ padding: '12px 24px', background: '#2563eb', color: 'white', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 'bold', marginTop: 20 }}>✏️ Edit Profile</button>
              </>
            ) : (
              <form onSubmit={save} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
                {['fullName','phone','email','party','positionContested','county','constituency','ward','education','leadershipExperience','biography','status'].map(k => (
                  <input key={k} value={editForm[k] || ''} onChange={e => setEditForm({ ...editForm, [k]: e.target.value })} placeholder={k} style={{ padding: 12, borderRadius: 8, border: '1px solid #cbd5e1', gridColumn: k === 'biography' ? 'span 2' : 'auto' }} />
                ))}
                <button type="submit" style={{ padding: 12, background: '#16a34a', color: 'white', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 'bold' }}>💾 Save</button>
                <button type="button" onClick={() => setEditing(false)} style={{ padding: 12, background: '#e2e8f0', border: 'none', borderRadius: 8, cursor: 'pointer' }}>Cancel</button>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}