import { useState } from 'react'
import { API } from '../api'

export default function InvitePanel({ token, user }) {
  const [f, setF] = useState({ fullName: '', phone: '+254 ', role: 'VOLUNTEER', message: '' })
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const set = (k, v) => setF({ ...f, [k]: v })
  const input = { width: '100%', padding: 11, borderRadius: 8, border: '1px solid #cbd5e1', boxSizing: 'border-box', fontSize: 14, marginBottom: 10 }
  const submit = async (e) => {
    e.preventDefault()
    if (!f.phone.startsWith('+254')) return setResult({ error: 'Phone must start with +254' })
    setLoading(true)
    try {
      const res = await fetch(`${API}/api/invites/send`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }, body: JSON.stringify(f) })
      const d = await res.json()
      setResult(d)
    } catch { setResult({ error: 'Cannot connect to backend' }) }
    setLoading(false)
  }
  return (
    <div style={{ background: 'white', padding: 20, borderRadius: 12, boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
      <h3 style={{ margin: '0 0 4px' }}>📩 Invite via WhatsApp / SMS</h3>
      <p style={{ color: '#64748b', fontSize: 13, margin: '0 0 14px' }}>Invite a volunteer / team member. Free - opens WhatsApp / SMS app on your phone. No SMS cost.</p>
      <form onSubmit={submit}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))', gap: '0 12px' }}>
          <div><label style={{ fontSize: 13, fontWeight: 'bold' }}>Full Name</label><input value={f.fullName} onChange={e => set('fullName', e.target.value)} placeholder="e.g. Jane Chebet" style={input} /></div>
          <div><label style={{ fontSize: 13, fontWeight: 'bold' }}>Phone * (+254...)</label><input value={f.phone} onChange={e => set('phone', e.target.value)} placeholder="+254712345678" style={input} required /></div>
          <div><label style={{ fontSize: 13, fontWeight: 'bold' }}>Invite As</label><select value={f.role} onChange={e => set('role', e.target.value)} style={input}><option>VOLUNTEER</option><option>TEAM_LEADER</option><option>CAMPAIGN_MANAGER</option><option>CANDIDATE</option></select></div>
        </div>
        <label style={{ fontSize: 13, fontWeight: 'bold' }}>Custom Message (optional - leave empty for auto)</label>
        <textarea value={f.message} onChange={e => set('message', e.target.value)} placeholder="Leave empty to use auto message with your name + register link" style={{ ...input, minHeight: 70 }} />
        <button type="submit" disabled={loading} style={{ background: loading ? '#94a3b8' : '#16a34a', color: 'white', border: 'none', padding: '11px 20px', borderRadius: 8, cursor: 'pointer', fontWeight: 'bold' }}>{loading ? 'Generating...' : 'Generate Invite →'}</button>
      </form>
      {result?.error && <p style={{ color: '#ef4444', fontSize: 13 }}>{result.error}</p>}
      {result?.whatsappLink && (
        <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', padding: 16, borderRadius: 10, marginTop: 14 }}>
          <p style={{ margin: '0 0 8px', fontSize: 13, color: '#166534' }}><b>✅ Invite ready for {f.fullName || f.phone}!</b></p>
          <p style={{ fontSize: 13, background: 'white', padding: 10, borderRadius: 8, border: '1px solid #e2e8f0', lineHeight: 1.5 }}>{result.message}</p>
          <p style={{ fontSize: 12, color: '#64748b', margin: '10px 0' }}>Register link: <b style={{ wordBreak: 'break-all' }}>{result.inviteLink}</b></p>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <a href={result.whatsappLink} target="_blank" rel="noreferrer" style={{ background: '#25D366', color: 'white', padding: '11px 18px', borderRadius: 8, textDecoration: 'none', fontWeight: 'bold' }}>💬 Send via WhatsApp</a>
            <a href={result.smsLink} style={{ background: '#2563eb', color: 'white', padding: '11px 18px', borderRadius: 8, textDecoration: 'none', fontWeight: 'bold' }}>📱 Send via SMS</a>
            <button onClick={() => navigator.clipboard.writeText(result.message)} style={{ background: '#334155', color: 'white', border: 'none', padding: '11px 18px', borderRadius: 8, cursor: 'pointer', fontWeight: 'bold' }}>📋 Copy Message</button>
            <button onClick={() => navigator.clipboard.writeText(result.inviteLink)} style={{ background: '#f1f5f9', border: 'none', padding: '11px 18px', borderRadius: 8, cursor: 'pointer', fontWeight: 'bold' }}>🔗 Copy Link Only</button>
          </div>
          <p style={{ fontSize: 11, color: '#94a3b8', margin: '10px 0 0' }}>Tip: After deploy, change inviteLink in server to your real domain (e.g. https://pcms.vercel.app/register). See comment in server code.</p>
        </div>
      )}
    </div>
  )
}