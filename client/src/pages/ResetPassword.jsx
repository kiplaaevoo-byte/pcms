import { useState, useEffect } from 'react'
import { API } from '../api'

export default function ResetPassword({ onBackToLogin }) {
  const [token, setToken] = useState('')
  const [email, setEmail] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [msg, setMsg] = useState('')
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)

  useEffect(() => {
    const p = new URLSearchParams(window.location.search)
    setToken(p.get('token') || '')
    setEmail(p.get('email') || '')
  }, [])

  const submit = async (e) => {
    e.preventDefault()
    if (newPassword !== confirmPassword) return setMsg('Passwords do not match')
    if (newPassword.length < 8) return setMsg('Password must be at least 8 characters')
    setLoading(true)
    try {
      const res = await fetch(`${API}/api/auth/reset-password`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token, email, newPassword, confirmPassword }) })
      const d = await res.json()
      if (d.error) setMsg(d.error); else { setMsg(d.message); setDone(true) }
    } catch { setMsg('Cannot connect to backend') }
    setLoading(false)
  }
  return (
    <div style={{ maxWidth: 460, margin: '40px auto', background: 'white', padding: 28, borderRadius: 14, boxShadow: '0 4px 20px rgba(0,0,0,0.08)', fontFamily: 'sans-serif' }}>
      <h2 style={{ margin: '0 0 6px', color: '#0a2463' }}>🔐 Reset Password</h2>
      <p style={{ color: '#64748b', fontSize: 14, margin: '0 0 18px' }}>Create a new password for <b>{email || 'your account'}</b></p>
      {done ? (
        <div style={{ background: '#f0fdf4', padding: 16, borderRadius: 10, textAlign: 'center' }}>
          <div style={{ fontSize: 36 }}>✅</div><p style={{ fontSize: 14 }}>{msg}</p>
          <button onClick={onBackToLogin} style={{ background: '#2563eb', color: 'white', border: 'none', padding: '11px 20px', borderRadius: 8, cursor: 'pointer', fontWeight: 'bold' }}>Go to Login →</button>
        </div>
      ) : (
        <form onSubmit={submit}>
          <label style={{ fontSize: 13, fontWeight: 'bold' }}>Email</label>
          <input value={email} onChange={e => setEmail(e.target.value)} style={{ width: '100%', padding: 12, borderRadius: 8, border: '1px solid #cbd5e1', boxSizing: 'border-box', margin: '6px 0 12px' }} required />
          <label style={{ fontSize: 13, fontWeight: 'bold' }}>Reset Token</label>
          <input value={token} onChange={e => setToken(e.target.value)} placeholder="Paste from link if empty" style={{ width: '100%', padding: 12, borderRadius: 8, border: '1px solid #cbd5e1', boxSizing: 'border-box', margin: '6px 0 12px' }} required />
          <label style={{ fontSize: 13, fontWeight: 'bold' }}>New Password (min 8)</label>
          <input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} style={{ width: '100%', padding: 12, borderRadius: 8, border: '1px solid #cbd5e1', boxSizing: 'border-box', margin: '6px 0 12px' }} required />
          <label style={{ fontSize: 13, fontWeight: 'bold' }}>Confirm New Password</label>
          <input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} style={{ width: '100%', padding: 12, borderRadius: 8, border: '1px solid #cbd5e1', boxSizing: 'border-box', margin: '6px 0 14px' }} required />
          {msg && <p style={{ fontSize: 13, color: done ? '#16a34a' : '#ef4444' }}>{msg}</p>}
          <button type="submit" disabled={loading} style={{ width: '100%', padding: 12, background: loading ? '#94a3b8' : '#16a34a', color: 'white', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 'bold', fontSize: 15 }}>{loading ? 'Resetting...' : 'Reset Password'}</button>
        </form>
      )}
      <button onClick={onBackToLogin} style={{ marginTop: 16, background: 'none', border: 'none', color: '#2563eb', cursor: 'pointer', fontWeight: 'bold' }}>← Back to Login</button>
    </div>
  )
}