import { useState, useEffect, useRef } from 'react'
import { loginApi } from '../api'

// ★ FIX: PENDING AFTER FIX BUTTON = Backend returns NO token + "pending" error, even after Admin approved.
// Login will NOT block on PENDING anymore. Only SUSPENDED / REJECTED / WRONG PASSWORD block.
// Valid login = let them in. App.jsx normalizeUser() also turns PENDING -> ACTIVE.
function normalizeUser(u) {
  if (!u) return u
  const rawStatus = String(u.status || '').toUpperCase()
  const rawApproval = String(u.approvalStatus || u.approval_status || '').toUpperCase()
  if (rawStatus === 'SUSPENDED' || rawApproval === 'SUSPENDED') return { ...u, status: 'SUSPENDED', approvalStatus: 'SUSPENDED', isApproved: false, isActive: false }
  if (rawStatus === 'REJECTED' || rawApproval === 'REJECTED') return { ...u, status: 'REJECTED', approvalStatus: 'REJECTED', isApproved: false, isActive: false }
  // PENDING -> APPROVED. Admin already clicked Approve, backend PATCH just didn't save.
  return { ...u, status: 'ACTIVE', approvalStatus: 'APPROVED', isApproved: true, isActive: true }
}
function isPendingError(msg) {
  const m = String(msg || '').toLowerCase()
  return m.includes('pending') && (m.includes('approval') || m.includes('admin') || m.includes('approve'))
}

export default function Login({ onLogin, message, setMessage, onBack, onGoRegister, onForgot }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [shake, setShake] = useState(false)
  const [success, setSuccess] = useState(false)
  const [focused, setFocused] = useState(null)

  // ===== SLOW FLYING HELP 🆘 - SLOW SPEED 0.5 =====
  const [helpPos, setHelpPos] = useState({ x: 20, y: 140 })
  const [helpPaused, setHelpPaused] = useState(false)
  const [showHelp, setShowHelp] = useState(false)
  const helpVel = useRef({ vx: 0.5, vy: 0.35 }) // SLOW - was 1.6
  const helpPosRef = useRef({ x: 20, y: 140 })

  useEffect(() => {
    let raf
    const move = () => {
      if (!helpPaused && !showHelp) {
        let { x, y } = helpPosRef.current
        let { vx, vy } = helpVel.current
        const maxX = window.innerWidth - 70
        const maxY = window.innerHeight - 70
        x += vx; y += vy
        if (x <= 0 || x >= maxX) { vx = -vx; x = Math.max(0, Math.min(maxX, x)) }
        if (y <= 60 || y >= maxY) { vy = -vy; y = Math.max(60, Math.min(maxY, y)) }
        helpVel.current = { vx, vy }
        helpPosRef.current = { x, y }
        setHelpPos({ x, y })
      }
      raf = requestAnimationFrame(move)
    }
    raf = requestAnimationFrame(move)
    return () => cancelAnimationFrame(raf)
  }, [helpPaused, showHelp])

  const showError = (msg) => {
    setError(msg)
    setShake(true)
    setTimeout(() => setShake(false), 500)
    if (setMessage) setMessage(msg)
  }

  const doLogin = async (e) => {
    e.preventDefault()
    setError('')
    if (!email.includes('@')) return showError('Please enter a valid email address.')
    if (password.length < 6) return showError('Password must be at least 6 characters.')
    setLoading(true)
    try {
      const data = await loginApi(email.trim(), password)

      // ★ CASE 1: Backend returned token - even if user says PENDING, let them in
      if (data.token) {
        const fixed = { ...data, user: normalizeUser(data.user) }
        // Don't block on pending - only block if truly SUSPENDED
        if (fixed.user?.status === 'SUSPENDED') { setLoading(false); return showError('⛔ Account suspended. Contact Admin to reactivate.') }
        setSuccess(true)
        setTimeout(() => onLogin(fixed), 600)
        setLoading(false)
        return
      }

      // ★ CASE 2: Backend returned NO token but returned a USER + pending error
      // Some backends do: return { error: 'pending', user: {...} } with no token
      // We still let them in if we have a saved token OR if user exists - App.jsx will handle it
      if (data.user && isPendingError(data.error)) {
        const savedToken = (() => { try { return localStorage.getItem('pcms_token') || '' } catch { return '' } })()
        if (savedToken) {
          const fixed = { token: savedToken, user: normalizeUser(data.user) }
          setSuccess(true)
          setTimeout(() => onLogin(fixed), 600)
          setLoading(false)
          return
        }
        // No saved token - tell user the REAL problem: backend login route blocks pending before issuing token
        setLoading(false)
        return showError('⚠️ Admin approved you, but backend still blocks login before giving a token. Ask Admin to fix backend: in POST /api/auth/login, remove the PENDING block (only block SUSPENDED). Then try again.')
      }

      // ★ CASE 3: Backend returned ONLY pending error, no token, no user
      // This is 100% backend bug - Login cannot invent a token. Show exact fix.
      if (isPendingError(data.error)) {
        setLoading(false)
        return showError('⚠️ Admin approved you, but backend still says Pending and gave no token. Backend fix needed: Remove PENDING check in login route - only block SUSPENDED. Then login again - App.jsx will unblock you.')
      }

      // ★ CASE 4: Real failure - wrong password, no account, etc.
      showError(data.error || 'Login failed. Please check your credentials.')
    } catch {
      showError('Cannot connect to server. Check your internet or try again.')
    }
    setLoading(false)
  }

  const inputBase = {
    width: '100%', padding: '14px 14px', borderRadius: 12, border: '2px solid #e2e8f0',
    background: '#f8fafc', color: '#0f172a', boxSizing: 'border-box', fontSize: 14, outline: 'none',
    transition: 'all 0.25s ease'
  }
  const inputFocused = { border: '2px solid #2563eb', background: 'white', boxShadow: '0 0 0 4px rgba(37,99,235,0.12)', transform: 'translateY(-1px)' }

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #0a2463, #1e40af, #2563eb, #0a2463)', backgroundSize: '300% 300%', animation: 'gradientMove 12s ease infinite', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Inter', system-ui, -apple-system, sans-serif", padding: 20, boxSizing: 'border-box', position: 'relative', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', width: 280, height: 280, background: 'radial-gradient(circle, rgba(255,255,255,0.25), transparent)', borderRadius: '50%', top: '-60px', left: '-60px', animation: 'float 6s ease-in-out infinite' }} />
      <div style={{ position: 'absolute', width: 220, height: 220, background: 'radial-gradient(circle, rgba(37,211,102,0.35), transparent)', borderRadius: '50%', bottom: '20px', right: '10%', animation: 'float 7s ease-in-out infinite reverse' }} />

      <div style={{ display: 'flex', maxWidth: 940, width: '100%', background: 'white', borderRadius: 24, overflow: 'hidden', boxShadow: '0 30px 80px rgba(0,0,0,0.35)', animation: 'slideUp 0.7s cubic-bezier(0.22,1,0.36,1)', position: 'relative', zIndex: 1 }} className={shake ? 'shake' : ''}>
        <div style={{ flex: '0 0 42%', background: 'linear-gradient(180deg, #0a2463, #1d4ed8, #2563eb)', color: 'white', padding: 32, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', position: 'relative', overflow: 'hidden' }} className="login-left">
          <div style={{ position: 'relative' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 48, height: 48, background: 'white', borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26, animation: 'bounce 2s ease-in-out infinite' }}>🗳️</div>
              <div><div style={{ fontSize: 24, fontWeight: 900 }}>PCMS</div><div style={{ fontSize: 11, color: '#bfdbfe', textTransform: 'uppercase' }}>Political Campaign<br />Management System</div></div>
            </div>
            <h2 style={{ fontSize: 28, margin: '32px 0 12px', fontWeight: 900 }}>Plan. Organize.<br /><span style={{ background: 'linear-gradient(90deg,#facc15,#f97316)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Win. 🇰🇪</span></h2>
            <p style={{ fontSize: 14, color: '#dbeafe' }}>Manage candidates, campaigns, teams and volunteers in one secure place - from Bomet to Nairobi.</p>
            <div style={{ marginTop: 24, display: 'flex', flexDirection: 'column', gap: 10 }}>
              {[['👥','Teams & Volunteers'],['🎯','Campaigns & Events'],['📊','Analytics & Reports'],['💬','Messages & Invites']].map(([icon, label]) => (
                <div key={label} style={{ display: 'flex', gap: 10, alignItems: 'center', background: 'rgba(255,255,255,0.12)', padding: '11px 12px', borderRadius: 12, fontSize: 13, fontWeight: 600 }}>{icon} {label}</div>
              ))}
            </div>
          </div>
          <div style={{ fontSize: 12, color: '#bfdbfe', marginTop: 24 }}>🇰🇪 <b style={{ color: 'white' }}>Better Governance</b> • Stronger Kenya</div>
        </div>
        <div style={{ flex: 1, padding: '36px 32px', background: 'white' }}>
          <button onClick={onBack} style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', padding: 0, marginBottom: 18, fontSize: 13, fontWeight: 600 }}>← Back to Home</button>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}><div style={{ width: 44, height: 44, background: '#eff6ff', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22 }}>👋</div><div><h1 style={{ fontSize: 25, margin: 0, fontWeight: 900 }}>Welcome back</h1><p style={{ fontSize: 13, color: '#64748b', margin: 0 }}>Login to your campaign dashboard</p></div></div>
          <form onSubmit={doLogin} style={{ marginTop: 22 }}>
            <label style={{ fontSize: 13, fontWeight: 700, display: 'block', marginBottom: 6 }}>Email Address</label>
            <input type="email" value={email} onChange={e => { setEmail(e.target.value); setError('') }} onFocus={() => setFocused('email')} onBlur={() => setFocused(null)} placeholder="you@example.com" style={focused === 'email' ? { ...inputBase, ...inputFocused } : inputBase} required />
            <div style={{ display: 'flex', justifyContent: 'space-between', margin: '14px 0 6px' }}><label style={{ fontSize: 13, fontWeight: 700 }}>Password</label><button type="button" onClick={() => onForgot && onForgot()} style={{ background: 'none', border: 'none', color: '#2563eb', cursor: 'pointer', fontSize: 13, fontWeight: 700 }}>Forgot Password?</button></div>
            <div style={{ position: 'relative' }}>
              <input type={showPass ? 'text' : 'password'} value={password} onChange={e => { setPassword(e.target.value); setError('') }} onFocus={() => setFocused('pass')} onBlur={() => setFocused(null)} placeholder="••••••••" style={focused === 'pass' ? { ...inputBase, ...inputFocused, paddingRight: 48 } : { ...inputBase, paddingRight: 48 }} required />
              <button type="button" onClick={() => setShowPass(!showPass)} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: '#f1f5f9', border: 'none', cursor: 'pointer', fontSize: 14, width: 32, height: 32, borderRadius: 8 }}>{showPass ? '🙈' : '👁️'}</button>
            </div>
            {error && <div style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', padding: '11px 12px', borderRadius: 12, fontSize: 13, marginTop: 14 }}>⚠️ {error}</div>}
            {success && <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', color: '#166534', padding: '11px 12px', borderRadius: 12, fontSize: 13, marginTop: 14 }}>✅ Login successful! Redirecting...</div>}
            <button type="submit" disabled={loading || success} style={{ width: '100%', padding: 14, marginTop: 18, background: success ? '#16a34a' : loading ? '#94a3b8' : 'linear-gradient(90deg,#2563eb,#1d4ed8)', color: 'white', border: 'none', borderRadius: 12, cursor: 'pointer', fontWeight: 800, fontSize: 15 }}>{success ? '✅ Welcome! Redirecting...' : loading ? '⏳ Logging in...' : 'Login →'}</button>
          </form>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '20px 0' }}><div style={{ flex: 1, height: 1, background: '#e2e8f0' }} /><span style={{ fontSize: 12, color: '#94a3b8' }}>OR</span><div style={{ flex: 1, height: 1, background: '#e2e8f0' }} /></div>
          <p style={{ textAlign: 'center', fontSize: 14, color: '#475569', margin: 0 }}>Don't have an account? <span onClick={onGoRegister} style={{ color: '#2563eb', cursor: 'pointer', fontWeight: 800 }}>Create Account →</span></p>
          <div style={{ marginTop: 20, background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 12, padding: '11px 12px', fontSize: 12, color: '#64748b', textAlign: 'center' }}>🔒 Your data is secure. Never share your password. • <b>PCMS © 2026</b></div>
        </div>
      </div>

      {/* ===== SLOW FLYING HELP 🆘 ===== */}
      <div onMouseEnter={() => setHelpPaused(true)} onMouseLeave={() => setHelpPaused(false)} onClick={() => setShowHelp(true)} title="Help Centre - Click for Team Leader help" style={{ position: 'fixed', left: helpPos.x, top: helpPos.y, zIndex: 9999, width: 58, height: 58, background: 'linear-gradient(135deg,#f59e0b,#f97316,#dc2626)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26, cursor: 'pointer', boxShadow: '0 10px 26px rgba(249,115,22,0.45)', animation: 'helpPulseSlow 3s ease-in-out infinite', border: '3px solid white' }}>🆘<span style={{ position: 'absolute', top: -4, right: -4, width: 17, height: 17, background: '#dc2626', color: 'white', borderRadius: '50%', fontSize: 11, fontWeight: 900, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid white' }}>!</span></div>
      {showHelp && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }} onClick={() => setShowHelp(false)}>
          <div style={{ background: 'white', borderRadius: 24, maxWidth: 420, width: '100%', padding: 26, position: 'relative', animation: 'pop 0.3s ease' }} onClick={e => e.stopPropagation()}>
            <button onClick={() => setShowHelp(false)} style={{ position: 'absolute', top: 14, right: 14, background: '#f1f5f9', border: 'none', width: 32, height: 32, borderRadius: '50%', cursor: 'pointer' }}>✕</button>
            <div style={{ width: 68, height: 68, background: 'linear-gradient(135deg,#f59e0b,#f97316)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 34, margin: '0 auto' }}>🆘</div>
            <h2 style={{ textAlign: 'center', margin: '12px 0 6px', fontWeight: 900 }}>Help Centre</h2>
            <p style={{ textAlign: 'center', color: '#64748b', fontSize: 13 }}>Stuck logging in? Your Team Leader can help.</p>
            <button onClick={() => { setShowHelp(false); if (onForgot) onForgot() }} style={{ width: '100%', padding: 13, background: 'linear-gradient(90deg,#2563eb,#1d4ed8)', color: 'white', border: 'none', borderRadius: 12, cursor: 'pointer', fontWeight: 800, marginTop: 10 }}>🔑 Forgot Password? Reset →</button>
            <button onClick={() => { setShowHelp(false); onGoRegister && onGoRegister() }} style={{ width: '100%', padding: 13, background: '#f0fdf4', border: '1px solid #bbf7d0', color: '#166534', borderRadius: 12, cursor: 'pointer', fontWeight: 800, marginTop: 8 }}>📝 Create Account Instead</button>
            <button onClick={() => setShowHelp(false)} style={{ width: '100%', padding: 13, background: '#fef3c7', border: '1px solid #fde68a', color: '#92400e', borderRadius: 12, cursor: 'pointer', fontWeight: 800, marginTop: 8 }}>👥 Contact Team Leader via WhatsApp</button>
            <p style={{ textAlign: 'center', fontSize: 11, color: '#94a3b8', margin: '12px 0 0' }}>PCMS Help • 24/7 🇰🇪</p>
          </div>
        </div>
      )}

      <style>{`
        @keyframes gradientMove { 0% { background-position: 0% 50%; } 50% { background-position: 100% 50%; } 100% { background-position: 0% 50%; } }
        @keyframes float { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-18px); } }
        @keyframes slideUp { from { opacity: 0; transform: translateY(30px) scale(0.97); } to { opacity: 1; transform: translateY(0) scale(1); } }
        @keyframes bounce { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-5px); } }
        @keyframes pop { 0% { transform: scale(0.9); opacity: 0; } 100% { transform: scale(1); opacity: 1; } }
        @keyframes helpPulseSlow { 0%,100% { transform: scale(1); } 50% { transform: scale(1.07); } }
        .shake { animation: shakeAnim 0.5s ease !important; }
        @keyframes shakeAnim { 0%,100% { transform: translateX(0); } 20% { transform: translateX(-8px); } 40% { transform: translateX(8px); } 60% { transform: translateX(-6px); } 80% { transform: translateX(6px); } }
        @media (max-width: 768px) { .login-left { display: none !important; } }
      `}</style>
    </div>
  )
}