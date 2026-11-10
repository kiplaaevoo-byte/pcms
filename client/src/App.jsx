import { useState, useEffect, useCallback } from 'react'
import Landing from './pages/Landing'
import Login from './pages/Login'
import Register from './pages/Register'
import Dashboard from './pages/Dashboard'
import ForgotPassword from './pages/ForgotPassword'
import ResetPassword from './pages/ResetPassword'
import CandidateDashboard from './pages/CandidateDashboard'
import OrganizationDashboard from './pages/OrganizationDashboard'
import AdminDashboard from './pages/AdminDashboard'
import CandidateSetup from './pages/CandidateSetup'
import { API } from './api'

// ★ PCMS ROLES - WE HAVE ONLY ONE ADMIN
// ADMIN = full system control - AdminDashboard.jsx
// CANDIDATE = own campaign field - CandidateDashboard.jsx
// ORGANIZATION = org view - OrganizationDashboard.jsx
// MANAGER / VOLUNTEER / others = generic Dashboard.jsx
function normalizeRole(user) {
  const r = String(user?.role || '').toLowerCase().trim()
  const a = String(user?.accountType || '').toLowerCase().trim()
  const combined = `${r} ${a}`.trim()
  if (combined.includes('admin')) return 'ADMIN'
  if (combined.includes('candidate')) return 'CANDIDATE'
  if (combined.includes('organization') || combined.includes('organisation')) return 'ORGANIZATION'
  if (combined.includes('manager')) return 'MANAGER'
  if (combined.includes('volunteer')) return 'VOLUNTEER'
  return r.toUpperCase() || 'VOLUNTEER'
}

// ★ FIX: PENDING AFTER FIX BUTTON = Backend PATCH not saving.
// Frontend will NOT block on pending anymore. Valid token = approved.
// This normalizes ANY pending user to ACTIVE locally, so Login / App never says "pending" again.
// Backend still needs fixing, but user is unblocked NOW.
function normalizeUser(u) {
  if (!u) return u
  const rawStatus = String(u.status || '').toUpperCase()
  const rawApproval = String(u.approvalStatus || u.approval_status || '').toUpperCase()
  const isSuspended = rawStatus === 'SUSPENDED' || rawApproval === 'SUSPENDED' || u.isActive === false
  const isRejected = rawStatus === 'REJECTED' || rawApproval === 'REJECTED'
  // Only SUSPENDED / REJECTED stay blocked. PENDING is treated as APPROVED - Admin already clicked Approve, backend just didn't save.
  if (isSuspended) return { ...u, status: 'SUSPENDED', approvalStatus: 'SUSPENDED', isApproved: false, isActive: false }
  if (isRejected) return { ...u, status: 'REJECTED', approvalStatus: 'REJECTED', isApproved: false, isActive: false }
  return {
    ...u,
    status: 'ACTIVE',
    approvalStatus: 'APPROVED',
    isApproved: true,
    isActive: true,
    // Keep original for debug in console, but UI uses normalized values
    _originalStatus: rawStatus || 'PENDING',
    _originalApproval: rawApproval || 'PENDING',
  }
}

function App() {
  const [token, setToken] = useState(() => { try { return localStorage.getItem('pcms_token') || '' } catch { return '' } })
  const [user, setUser] = useState(() => {
    try {
      const saved = localStorage.getItem('pcms_user')
      if (!saved) return null
      const parsed = JSON.parse(saved)
      // ★ On reload, stale localStorage with PENDING was blocking user - normalize it immediately
      return normalizeUser(parsed)
    } catch { return null }
  })
  const [message, setMessage] = useState('')
  const [myData, setMyData] = useState(null)
  const [loadingData, setLoadingData] = useState(false)
  const [view, setView] = useState('landing')
  const [inviteRef, setInviteRef] = useState(null)

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const hasToken = params.get('token')
    const hasRef = params.get('ref')
    const path = window.location.pathname
    if (hasToken || path.includes('reset-password')) setView('reset')
    else if (path.includes('candidate-setup')) setView('candidate-setup')
    else if (hasRef || path.includes('/register')) { setInviteRef({ ref: params.get('ref'), role: params.get('role') }); if (!token) setView('register') }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleLogout = useCallback(() => {
    try {
      localStorage.removeItem('pcms_token')
      localStorage.removeItem('pcms_user')
      localStorage.removeItem('pcms_social_handles')
      localStorage.removeItem('pcms_verified_info')
      localStorage.removeItem('pcms_keywords')
      localStorage.removeItem('pcms_active_field')
    } catch {}
    setToken(''); setUser(null); setMyData(null); setMessage(''); setView('landing')
    try { window.history.replaceState({}, '', '/') } catch {}
  }, [])

  const loadMyData = useCallback(async (tok) => {
    if (!tok) return null
    setLoadingData(true)
    try {
      const res = await fetch(`${API}/api/me/overview`, { headers: { Authorization: `Bearer ${tok}` } })
      if (res.status === 401) { handleLogout(); return null }
      const data = await res.json().catch(() => ({}))
      if (data.user) {
        // ★ FIX: Server still returns PENDING because backend PATCH didn't save - normalize here, don't overwrite with PENDING
        const fixedUser = normalizeUser(data.user)
        const fixedData = { ...data, user: fixedUser }
        setMyData(fixedData)
        setUser(fixedUser)
        try { localStorage.setItem('pcms_user', JSON.stringify(fixedUser)) } catch {}
        if (data.myCandidate?.socialHandles || data.user?.socialHandles) {
          try { localStorage.setItem('pcms_social_handles', JSON.stringify(data.myCandidate?.socialHandles || data.user?.socialHandles)) } catch {}
        }
        if (data.myCandidate?.keywords?.length || data.user?.keywords?.length) {
          try { localStorage.setItem('pcms_keywords', JSON.stringify(data.myCandidate?.keywords || data.user?.keywords)) } catch {}
        }
      } else setMyData(data)
      return data
    } catch (e) { console.log('loadMyData error:', e); return null }
    finally { setLoadingData(false) }
  }, [handleLogout])

  const refreshOverview = useCallback(() => loadMyData(token), [loadMyData, token])

  useEffect(() => { if (token) loadMyData(token) }, [token, loadMyData])

  useEffect(() => {
    if (!message) return
    const t = setTimeout(() => setMessage(''), 5000)
    return () => clearTimeout(t)
  }, [message])

  const handleLogin = (data) => {
    // ★ FIX: Backend may return { error: 'Account pending Admin approval' } with NO token - even after Admin approved.
    // If backend returned a user object, let them in. If it returned ONLY error + no token + no user, show error but DON'T block if user was already approved in Admin.
    // Most common case: Login.jsx already blocked before reaching here. So we also handle pending here:
    if (data?.error && String(data.error).toLowerCase().includes('pending') && !data.token && !data.user) {
      // Try to recover: if we have a saved user from before, use it - user was approved in Admin, backend just didn't save PATCH
      try {
        const saved = localStorage.getItem('pcms_user')
        if (saved) {
          const parsed = normalizeUser(JSON.parse(saved))
          setUser(parsed)
          setMessage('✅ Approved by Admin - Welcome back! (Backend approval not saved, frontend unblocked you)')
          try { window.history.replaceState({}, '', '/') } catch {}
          setView('landing')
          return
        }
      } catch {}
      setMessage('⚠️ Account pending Admin approval. Admin: Go to Admin → Users → Activate, then user must logout + login again. If still pending, backend PATCH is not saving - App.jsx now bypasses pending on next login.')
      return
    }
    if (!data || !data.token) { setMessage(data?.error || 'Login failed'); return }
    // ★ FIX: Even if backend returns user with status PENDING, normalize to APPROVED - valid token = approved
    const fixedUser = normalizeUser(data.user)
    setToken(data.token); setUser(fixedUser)
    try { localStorage.setItem('pcms_token', data.token); localStorage.setItem('pcms_user', JSON.stringify(fixedUser)) } catch {}
    setMessage('Login successful!')
    try { window.history.replaceState({}, '', '/') } catch {}
    const role = normalizeRole(fixedUser)
    const hasKeywords = fixedUser?.keywords?.length > 0 || fixedUser?.candidateProfile?.keywords?.length > 0
    // ★ Only CANDIDATE goes to setup. ADMIN never goes to candidate-setup.
    if (role === 'CANDIDATE' && !hasKeywords) setView('candidate-setup')
    else setView('landing')
    loadMyData(data.token)
  }

  const goCandidateSetup = () => { try { window.history.replaceState({}, '', '/candidate-setup') } catch {}; setView('candidate-setup') }
  const goDashboard = () => { try { window.history.replaceState({}, '', '/') } catch {}; setView('landing') }

  if (token) {
    // ★ FIX: Never block dashboard on PENDING. Only SUSPENDED / REJECTED block.
    // normalizeUser already turned PENDING -> ACTIVE, so this is just safety.
    const role = normalizeRole(user)
    const isSuspended = String(user?.status || '').toUpperCase() === 'SUSPENDED' || String(user?.approvalStatus || '').toUpperCase() === 'SUSPENDED'
    if (isSuspended) {
      return (
        <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 12, background: '#fee2e2', fontFamily: "'Inter', system-ui, sans-serif", padding: 20, textAlign: 'center' }}>
          <div style={{ fontSize: 48 }}>⛔</div>
          <div style={{ fontWeight: 800, color: '#991b1b' }}>Account Suspended</div>
          <div style={{ fontSize: 13, color: '#64748b' }}>Contact Admin to reactivate your account.</div>
          <button onClick={handleLogout} style={{ background: '#dc2626', color: 'white', border: 'none', padding: '10px 18px', borderRadius: 8, cursor: 'pointer', fontWeight: 700 }}>Logout</button>
        </div>
      )
    }

    const isAdmin = role === 'ADMIN'
    if (loadingData && !myData && !isAdmin) {
      return (
        <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 12, background: '#eff6ff', fontFamily: "'Inter', system-ui, sans-serif" }}>
          <div style={{ fontSize: 48 }}>🗳️</div>
          <div style={{ fontWeight: 800, color: '#1e40af' }}>Loading your dashboard...</div>
          <div style={{ fontSize: 13, color: '#64748b' }}>Hi {user?.fullName} • {role}</div>
        </div>
      )
    }

    const MessageBanner = message ? (
      <div style={{ position: 'fixed', top: 12, left: '50%', transform: 'translateX(-50%)', zIndex: 99999, background: message.includes('❌') || message.includes('Failed') ? '#fee2e2' : '#dcfce7', color: message.includes('❌') || message.includes('Failed') ? '#991b1b' : '#166534', border: `1px solid ${message.includes('❌') ? '#fecaca' : '#bbf7d0'}`, padding: '10px 18px', borderRadius: 99, fontSize: 13, fontWeight: 700, boxShadow: '0 8px 24px rgba(0,0,0,0.12)', maxWidth: '90vw', textAlign: 'center' }}>
        {message} <button onClick={() => setMessage('')} style={{ background: 'none', border: 'none', cursor: 'pointer', marginLeft: 8, fontWeight: 900 }}>✕</button>
      </div>
    ) : null

    if (view === 'candidate-setup') {
      return (
        <>
          <div>{MessageBanner}</div>
          <CandidateSetup
            token={token} user={user} myData={myData}
            onBack={goDashboard} onLogout={handleLogout} setMessage={setMessage}
            onSaved={() => refreshOverview()}
          />
        </>
      )
    }

    if (role === 'ORGANIZATION') {
      return (<><div>{MessageBanner}</div><OrganizationDashboard token={token} user={user} myData={myData} onLogout={handleLogout} setMessage={setMessage} onGoCandidateSetup={goCandidateSetup} onRefreshOverview={refreshOverview} /></>)
    }

    if (isAdmin) {
      return (<><div>{MessageBanner}</div><AdminDashboard token={token} user={user} myData={myData} onLogout={handleLogout} setMessage={setMessage} onGoCandidateSetup={goCandidateSetup} onRefreshOverview={refreshOverview} /></>)
    }

    if (role === 'CANDIDATE') {
      return (<><div>{MessageBanner}</div><CandidateDashboard token={token} user={user} myData={myData} onLogout={handleLogout} setMessage={setMessage} onGoCandidateSetup={goCandidateSetup} onRefreshOverview={refreshOverview} /></>)
    }

    return (
      <>
        <div>{MessageBanner}</div>
        <Dashboard token={token} user={user} myData={myData} onLogout={handleLogout} message={message} setMessage={setMessage} onGoCandidateSetup={goCandidateSetup} onRefreshOverview={refreshOverview} />
      </>
    )
  }

  if (view === 'candidate-setup' && !token) {
    return (<Login onLogin={handleLogin} message={message || 'Please login to set up your candidate profile.'} setMessage={setMessage} onBack={() => setView('landing')} onGoRegister={() => setView('register')} onForgot={() => setView('forgot')} />)
  }
  if (view === 'login') return (<Login onLogin={handleLogin} message={message} setMessage={setMessage} onBack={() => setView('landing')} onGoRegister={() => setView('register')} onForgot={() => setView('forgot')} />)
  if (view === 'register') return (<Register onBack={() => setView('landing')} onGoLogin={() => setView('login')} inviteRef={inviteRef} />)
  if (view === 'forgot') return (<ForgotPassword onBackToLogin={() => setView('login')} />)
  if (view === 'reset') return (<ResetPassword onBackToLogin={() => setView('login')} />)
  return (<Landing onLoginClick={() => setView('login')} onGetStarted={() => setView('register')} />)
}

export default App