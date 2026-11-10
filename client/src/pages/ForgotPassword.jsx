import { useState } from 'react'
import { API } from '../api'

export default function ForgotPassword({ onBackToLogin }) {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)
  const submit = async (e) => {
    e.preventDefault()
    if (!email.includes('@')) return setResult({ error: 'Enter a valid email' })
    setLoading(true)
    try {
      const res = await fetch(`${API}/api/auth/forgot-password`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email }) })
      const d = await res.json()
      setResult(d)
    } catch { setResult({ error: 'Cannot connect to backend. Is server running?' }) }
    setLoading(false)
  }
  return (
    <div style={{ maxWidth: 460, margin: '40px auto', background: 'white', padding: 28, borderRadius: 14, boxShadow: '0 4px 20px rgba(0,0,0,0.08)', fontFamily: 'sans-serif' }}>
      <h2 style={{ margin: '0 0 6px', color: '#0a2463' }}>🔑 Forgot Password?</h2>
      <p style={{ color: '#64748b', fontSize: 14, margin: '0 0 18px' }}>Enter your email. We'll send you a reset link (valid 15 minutes).</p>
      {!result?.resetLink ? (
        <form onSubmit={submit}>
          <label style={{ fontSize: 13, fontWeight: 'bold' }}>Email Address</label>
          <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" style={{ width: '100%', padding: 12, borderRadius: 8, border: '1px solid #cbd5e1', boxSizing: 'border-box', margin: '6px 0 14px', fontSize: 14 }} required />
          <button type="submit" disabled={loading} style={{ width: '100%', padding: 12, background: loading ? '#94a3b8' : '#2563eb', color: 'white', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 'bold', fontSize: 15 }}>{loading ? 'Sending...' : 'Send Reset Link →'}</button>
          {result?.error && <p style={{ color: '#ef4444', fontSize: 13 }}>{result.error}</p>}
          {result?.message && !result.resetLink && <p style={{ color: '#16a34a', fontSize: 13 }}>{result.message}</p>}
        </form>
      ) : (
        <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', padding: 16, borderRadius: 10 }}>
          <p style={{ margin: '0 0 10px', fontSize: 14, color: '#166534' }}>✅ Reset link generated!</p>
          <p style={{ fontSize: 12, color: '#475569', margin: '0 0 10px' }}>In production this goes by Email. For now, copy it or send via WhatsApp:</p>
          <div style={{ background: 'white', padding: 10, borderRadius: 8, fontSize: 12, wordBreak: 'break-all', border: '1px solid #e2e8f0' }}>{result.resetLink}</div>
          <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
            <button onClick={() => navigator.clipboard.writeText(result.resetLink)} style={{ background: '#2563eb', color: 'white', border: 'none', padding: '9px 14px', borderRadius: 8, cursor: 'pointer', fontWeight: 'bold' }}>📋 Copy Link</button>
            {result.whatsappLink && <a href={result.whatsappLink} target="_blank" rel="noreferrer" style={{ background: '#25D366', color: 'white', padding: '9px 14px', borderRadius: 8, textDecoration: 'none', fontWeight: 'bold' }}>💬 Send via WhatsApp</a>}
            <a href={result.resetLink} style={{ background: '#16a34a', color: 'white', padding: '9px 14px', borderRadius: 8, textDecoration: 'none', fontWeight: 'bold' }}>Open Reset Page →</a>
          </div>
          <p style={{ fontSize: 11, color: '#94a3b8', margin: '10px 0 0' }}>Link expires in 15 minutes. Check backend console too - link is logged there.</p>
        </div>
      )}
      <button onClick={onBackToLogin} style={{ marginTop: 16, background: 'none', border: 'none', color: '#2563eb', cursor: 'pointer', fontWeight: 'bold' }}>← Back to Login</button>
    </div>
  )
}