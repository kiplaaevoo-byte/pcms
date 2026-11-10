import { useState, useEffect, useCallback, useRef } from 'react'
import { API } from '../api'
import CandidateProfile from './CandidateProfile'
import CandidateDashboard from './CandidateDashboard'
import ManagerDashboard from './ManagerDashboard'
import TeamLeaderDashboard from './TeamLeaderDashboard'
import VolunteerDashboard from './VolunteerDashboard'
import OrganizationDashboard from './OrganizationDashboard'
import AdminDashboard from './AdminDashboard'
import SocialListening from './SocialListening'
import EventsPage from './EventsPage'
import MessagesPage from './MessagesPage'
import NotificationBell from '../components/NotificationBell'
import AnalyticsCharts from '../components/AnalyticsCharts'

export default function Dashboard({ token, user, myData: myDataProp, onLogout, message, setMessage }) {
  const [activeTab, setActiveTab] = useState('overview')
  const [candidates, setCandidates] = useState([])
  const [campaigns, setCampaigns] = useState([])
  const [teams, setTeams] = useState([])
  const [volunteers, setVolunteers] = useState([])
  // FIX: Use myData from App.jsx if provided, don't overwrite with null
  const [myData, setMyData] = useState(myDataProp || null)
  const [loading, setLoading] = useState(false)
  const [showForm, setShowForm] = useState(null)
  const [editing, setEditing] = useState(null)
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const [search, setSearch] = useState('')
  const [tabAnim, setTabAnim] = useState('tabIn')
  const [refreshSpin, setRefreshSpin] = useState(false)

  // ===== HELP CENTRE FLOATING ICON - SLOW 0.5 =====
  const [helpPos, setHelpPos] = useState({ x: 20, y: 120 })
  const [helpPaused, setHelpPaused] = useState(false)
  const [showHelp, setShowHelp] = useState(false)
  const [showTeamLeader, setShowTeamLeader] = useState(false)
  const [helpTooltip, setHelpTooltip] = useState(true)
  const helpVel = useRef({ vx: 0.5, vy: 0.35 })
  const helpPosRef = useRef({ x: 20, y: 120 })

  const safeUser = user || { fullName: 'User', email: '', role: 'CANDIDATE', userId: '', county: '', accountType: '' }
  // Normalize role - handles ORGANIZATION / organization / Organization
  const roleNorm = String(safeUser.role || safeUser.accountType || '').toUpperCase().trim()
  const isAdmin = roleNorm === 'SUPER_ADMIN' || roleNorm === 'CAMPAIGN_ADMIN' || roleNorm === 'ADMIN'
  const headers = { 'Authorization': `Bearer ${token}` }
  const loadAll = useCallback(async () => {
    if (!token) return
    setLoading(true)
    setRefreshSpin(true)
    try {
      const [c1, c2, c3, c4, me] = await Promise.all([
        fetch(`${API}/api/candidates`, { headers }).then(r => r.json()).catch(() => []),
        fetch(`${API}/api/campaigns`, { headers }).then(r => r.json()).catch(() => []),
        fetch(`${API}/api/teams`, { headers }).then(r => r.json()).catch(() => []),
        fetch(`${API}/api/volunteers`, { headers }).then(r => r.json()).catch(() => []),
        // FIX: Only fetch overview if App.jsx didn't already provide it
        myDataProp ? Promise.resolve(myDataProp) : fetch(`${API}/api/me/overview`, { headers }).then(r => r.json()).catch(() => null),
      ])
      setCandidates(Array.isArray(c1) ? c1 : []); setCampaigns(Array.isArray(c2) ? c2 : []); setTeams(Array.isArray(c3) ? c3 : []); setVolunteers(Array.isArray(c4) ? c4 : []); setMyData(me)
    } catch (e) { console.log('loadAll error', e) }
    setLoading(false)
    setTimeout(() => setRefreshSpin(false), 600)
  }, [token, myDataProp])
  useEffect(() => { loadAll() }, [loadAll])
  // FIX: Sync myData when App.jsx loads it later (on refresh)
  useEffect(() => { if (myDataProp) setMyData(myDataProp) }, [myDataProp])
  useEffect(() => {
    const check = () => { const m = window.innerWidth < 768; setIsMobile(m); if (m) setSidebarOpen(false) }
    check(); window.addEventListener('resize', check); return () => window.removeEventListener('resize', check)
  }, [])

  // ===== HELP ICON FLIES SLOWLY ACROSS SCREEN =====
  useEffect(() => {
    let raf
    const move = () => {
      if (!helpPaused && !showHelp && !showTeamLeader) {
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
  }, [helpPaused, showHelp, showTeamLeader])

  useEffect(() => {
    const t = setTimeout(() => setHelpTooltip(false), 6000)
    return () => clearTimeout(t)
  }, [])

  // If user clicks Help -> TeamLeader, show TeamLeader Dashboard
  if (showTeamLeader) {
    return (
      <div style={{ position: 'relative' }}>
        <div style={{ position: 'fixed', top: 12, left: 12, zIndex: 100, display: 'flex', gap: 8 }}>
          <button onClick={() => setShowTeamLeader(false)} style={{ background: '#0a2463', color: 'white', border: 'none', padding: '10px 16px', borderRadius: 99, cursor: 'pointer', fontWeight: 800, boxShadow: '0 4px 14px rgba(0,0,0,0.2)' }}>← Back to Dashboard</button>
          <span style={{ background: 'white', padding: '10px 14px', borderRadius: 99, fontSize: 13, fontWeight: 700, boxShadow: '0 4px 14px rgba(0,0,0,0.1)' }}>🆘 Help Centre → Team Leader</span>
        </div>
        <TeamLeaderDashboard token={token} user={safeUser} myData={myData} onLogout={onLogout} setMessage={setMessage} />
      </div>
    )
  }

  // ===== ROLE ROUTING - ALL ROLES - FIXED =====
  // FIX: Admin now goes to full AdminDashboard.jsx (with Mentions + Users Approval), not inline admin UI below
  if (isAdmin) return <AdminDashboard token={token} user={safeUser} myData={myData} onLogout={onLogout} setMessage={setMessage} />
  if (roleNorm === 'CANDIDATE') return <CandidateDashboard token={token} user={safeUser} myData={myData} onLogout={onLogout} setMessage={setMessage} />
  if (roleNorm === 'CAMPAIGN_MANAGER') return <ManagerDashboard token={token} user={safeUser} myData={myData} onLogout={onLogout} setMessage={setMessage} />
  if (roleNorm === 'TEAM_LEADER') return <TeamLeaderDashboard token={token} user={safeUser} myData={myData} onLogout={onLogout} setMessage={setMessage} />
  if (roleNorm === 'VOLUNTEER') return <VolunteerDashboard token={token} user={safeUser} myData={myData} onLogout={onLogout} setMessage={setMessage} />
  if (roleNorm === 'ORGANIZATION' || roleNorm === 'ORG') return <OrganizationDashboard token={token} user={safeUser} myData={myData} onLogout={onLogout} setMessage={setMessage} />
  // FINANCE_OFFICER / AUDITOR / REGIONAL_COORD / CONSTITUENCY_COORD fall through to Admin-style Dashboard below

  const del = async (type, id) => {
    if (!window.confirm('Delete this? This cannot be undone.')) return
    const map = { candidate: 'candidates', campaign: 'campaigns', team: 'teams', volunteer: 'volunteers' }
    try {
      const res = await fetch(`${API}/api/${map[type]}/${id}`, { method: 'DELETE', headers })
      const d = await res.json().catch(() => ({}))
      if (d.error) setMessage && setMessage(d.error); else setMessage && setMessage('Deleted successfully')
      loadAll()
    } catch { setMessage && setMessage('Delete failed - check backend') }
  }
  const goTab = (id) => { setTabAnim('tabOut'); setTimeout(() => { setActiveTab(id); setShowForm(null); setEditing(null); setSearch(''); setTabAnim('tabIn') }, 120); if (isMobile) setMobileOpen(false) }
  const toggleSidebar = () => { if (isMobile) setMobileOpen(!mobileOpen); else setSidebarOpen(!sidebarOpen) }
  const goToTeamLeader = () => {
    setShowHelp(false)
    setShowTeamLeader(true)
    if (setMessage) setMessage('🆘 Help Centre: Opening Team Leader Dashboard...')
  }

  const adminMenu = [
    { id: 'overview', label: 'Overview', icon: '📊', badge: null },
    { id: 'candidates', label: 'Candidates', icon: '👤', badge: candidates.length },
    { id: 'campaigns', label: 'Campaigns', icon: '🎯', badge: campaigns.length },
    { id: 'teams', label: 'Teams', icon: '👥', badge: teams.length },
    { id: 'volunteers', label: 'Volunteers', icon: '🤝', badge: volunteers.length },
    { id: 'events', label: 'Events', icon: '📅', badge: null },
    { id: 'messages', label: 'Messages', icon: '✉️', badge: null },
    { id: 'mentions', label: 'Online Mentions', icon: '👀', badge: null },
    ...(isAdmin ? [{ id: 'users', label: 'Users / Approval', icon: '🛡️', badge: null }] : []),
    { id: 'profile', label: 'Profile', icon: '⚙️', badge: null },
  ]
  const sidebarWidth = isMobile ? 250 : (sidebarOpen ? 260 : 72)
  const showLabels = isMobile ? true : sidebarOpen
  const sidebarBtn = (active) => ({ width: '100%', textAlign: 'left', padding: showLabels ? '12px 14px' : '12px 0', borderRadius: 12, border: 'none', cursor: 'pointer', background: active ? 'linear-gradient(90deg,#2563eb,#1d4ed8)' : 'transparent', color: 'white', fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: showLabels ? 'flex-start' : 'center', gap: 10, fontWeight: active ? '800' : '500', boxShadow: active ? '0 4px 14px rgba(37,99,235,0.4)' : 'none', transition: 'all 0.25s ease', transform: active ? 'translateX(2px)' : 'translateX(0)' })
  const sidebarContent = (
    <>
      <div style={{ padding: showLabels ? '20px 16px 12px' : '20px 8px 12px', display: 'flex', gap: 10, alignItems: 'center', justifyContent: showLabels ? 'flex-start' : 'center' }}>
        <div style={{ width: 44, height: 44, background: 'white', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, flexShrink: 0, animation: 'bounce 2s ease-in-out infinite' }}>🗳️</div>
        {showLabels && <div><div style={{ fontSize: 24, fontWeight: '900', lineHeight: 1 }}>PCMS</div><div style={{ fontSize: 10, color: '#bfdbfe', letterSpacing: 0.5 }}>Plan. Organize. Win.</div></div>}
      </div>
      {showLabels && (
        <div style={{ margin: '0 14px 14px', background: 'rgba(255,255,255,0.12)', borderRadius: 12, padding: '11px 12px', display: 'flex', gap: 10, alignItems: 'center', animation: 'fadeIn 0.4s ease' }}>
          <div style={{ width: 36, height: 36, background: 'linear-gradient(135deg,#facc15,#f97316)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, color: '#0f172a', fontSize: 14, flexShrink: 0 }}>{safeUser.fullName?.charAt(0)?.toUpperCase() || 'U'}</div>
          <div style={{ minWidth: 0 }}><div style={{ fontSize: 13, fontWeight: 800, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{safeUser.fullName}</div><div style={{ fontSize: 11, color: '#bfdbfe' }}>{safeUser.role} • {safeUser.county || 'Kenya'}</div></div>
        </div>
      )}
      <div style={{ padding: '0 10px 10px', display: 'flex', justifyContent: showLabels ? 'flex-end' : 'center' }}>
        <button onClick={toggleSidebar} style={{ background: 'rgba(255,255,255,0.15)', color: 'white', border: 'none', borderRadius: 8, padding: '6px 10px', cursor: 'pointer', fontSize: 13, transition: 'all 0.2s' }}>{isMobile ? '✕ Close' : (sidebarOpen ? '◀ Collapse' : '▶')}</button>
      </div>
      <div style={{ padding: '0 10px', flex: 1, overflowY: 'auto' }}>
        {adminMenu.map((m, i) => (
          <button key={m.id} onClick={() => goTab(m.id)} title={!showLabels ? m.label : ''} style={{ ...sidebarBtn(activeTab === m.id), animation: `fadeInLeft ${0.1 + i * 0.05}s ease` }}
            onMouseEnter={e => { if (activeTab !== m.id) e.currentTarget.style.background = 'rgba(255,255,255,0.12)'; e.currentTarget.style.transform = 'translateX(4px)' }}
            onMouseLeave={e => { if (activeTab !== m.id) e.currentTarget.style.background = 'transparent'; e.currentTarget.style.transform = 'translateX(0)' }}>
            <span style={{ fontSize: 18, flexShrink: 0 }}>{m.icon}</span>
            {showLabels && <span style={{ flex: 1 }}>{m.label}</span>}
            {showLabels && m.badge !== null && m.badge > 0 && <span style={{ background: activeTab === m.id ? 'white' : 'rgba(255,255,255,0.2)', color: activeTab === m.id ? '#2563eb' : 'white', fontSize: 11, fontWeight: 800, padding: '2px 7px', borderRadius: 99, minWidth: 20, textAlign: 'center' }}>{m.badge}</span>}
          </button>
        ))}
      </div>
      <div style={{ padding: 12 }}>
        <button onClick={() => setShowHelp(true)} style={{ width: '100%', background: 'linear-gradient(90deg,#f59e0b,#f97316)', color: 'white', border: 'none', padding: showLabels ? '11px' : '10px 0', borderRadius: 12, cursor: 'pointer', fontWeight: '800', fontSize: 14, marginBottom: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>🆘 {showLabels && 'Help Centre'}</button>
        <button onClick={onLogout} style={{ width: '100%', background: 'linear-gradient(90deg,#dc2626,#b91c1c)', color: 'white', border: 'none', padding: showLabels ? '12px' : '10px 0', borderRadius: 12, cursor: 'pointer', fontWeight: '800', fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, transition: 'all 0.2s' }}><span>←</span>{showLabels && 'Logout'}</button>
        {showLabels && <div style={{ textAlign: 'center', marginTop: 14, fontSize: 12, lineHeight: 1.4, opacity: 0.9 }}>🇰🇪 <b>Better Governance</b><br />Stronger Kenya</div>}
      </div>
    </>
  )
  const card = { background: 'white', padding: 20, borderRadius: 16, boxShadow: '0 2px 12px rgba(0,0,0,0.05)', border: '1px solid #f1f5f9', transition: 'all 0.25s' }
  const btnPrimary = { padding: '10px 18px', background: 'linear-gradient(90deg,#2563eb,#1d4ed8)', color: 'white', border: 'none', borderRadius: 10, cursor: 'pointer', fontWeight: '800', transition: 'all 0.2s' }
  const btnGreen = { padding: '9px 15px', background: 'linear-gradient(90deg,#16a34a,#15803d)', color: 'white', border: 'none', borderRadius: 10, cursor: 'pointer', fontWeight: '700', transition: 'all 0.2s' }
  const btnEdit = { padding: '7px 12px', background: '#fef3c7', color: '#92400e', border: '1px solid #fde68a', borderRadius: 8, cursor: 'pointer', fontSize: 12, fontWeight: 700, transition: 'all 0.2s' }
  const btnDel = { padding: '7px 12px', background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca', borderRadius: 8, cursor: 'pointer', fontSize: 12, fontWeight: 700, transition: 'all 0.2s' }
  const filteredCandidates = candidates.filter(c => (c.fullName || '').toLowerCase().includes(search.toLowerCase()) || (c.county || '').toLowerCase().includes(search.toLowerCase()))
  const filteredCampaigns = campaigns.filter(c => (c.name || '').toLowerCase().includes(search.toLowerCase()))
  const filteredTeams = teams.filter(t => (t.name || '').toLowerCase().includes(search.toLowerCase()))
  const filteredVolunteers = volunteers.filter(v => (v.fullName || '').toLowerCase().includes(search.toLowerCase()))
  const stats = [
    { label: 'Candidates', value: candidates.length, icon: '👤', bg: 'linear-gradient(135deg,#2563eb,#1d4ed8)', sub: 'Active leaders', tab: 'candidates' },
    { label: 'Campaigns', value: campaigns.length, icon: '🎯', bg: 'linear-gradient(135deg,#16a34a,#15803d)', sub: 'In progress', tab: 'campaigns' },
    { label: 'Teams', value: teams.length, icon: '👥', bg: 'linear-gradient(135deg,#f59e0b,#d97706)', sub: 'Ground teams', tab: 'teams' },
    { label: 'Volunteers', value: volunteers.length, icon: '🤝', bg: 'linear-gradient(135deg,#7c3aed,#6d28d9)', sub: 'Onboarded', tab: 'volunteers' },
    { label: 'Online Mentions', value: '👀', icon: '👀', bg: 'linear-gradient(135deg,#f59e0b,#d97706)', sub: 'What people say', tab: 'mentions' },
  ]
  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#f1f5f9', fontFamily: "'Inter', system-ui, -apple-system, sans-serif" }}>
      {!isMobile && <div style={{ width: sidebarWidth, background: 'linear-gradient(180deg,#0a2463,#1d4ed8)', color: 'white', display: 'flex', flexDirection: 'column', flexShrink: 0, transition: 'width 0.3s cubic-bezier(0.22,1,0.36,1)', position: 'sticky', top: 0, height: '100vh', overflow: 'hidden', boxShadow: '4px 0 20px rgba(0,0,0,0.08)' }}>{sidebarContent}</div>}
      {isMobile && mobileOpen && (
        <>
          <div onClick={() => setMobileOpen(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 40, animation: 'fadeIn 0.2s ease' }}></div>
          <div style={{ position: 'fixed', left: 0, top: 0, bottom: 0, width: 260, background: 'linear-gradient(180deg,#0a2463,#1d4ed8)', color: 'white', display: 'flex', flexDirection: 'column', zIndex: 50, overflowY: 'auto', animation: 'slideInLeft 0.3s ease' }}>{sidebarContent}</div>
        </>
      )}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        <div style={{ background: 'rgba(255,255,255,0.95)', backdropFilter: 'blur(10px)', padding: '12px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, borderBottom: '1px solid #e2e8f0', position: 'sticky', top: 0, zIndex: 30 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button onClick={toggleSidebar} style={{ background: '#0a2463', color: 'white', border: 'none', borderRadius: 10, padding: '9px 12px', cursor: 'pointer', fontSize: 16, transition: 'all 0.2s' }}>{isMobile ? '☰' : (sidebarOpen ? '◀' : '▶')}</button>
            <span style={{ fontWeight: '900', fontSize: 18, color: '#0a2463' }}>PCMS <span style={{ fontWeight: 'normal', fontSize: 12, color: '#64748b' }}>{isMobile ? '' : `• ${safeUser.role} • ${safeUser.county || 'Kenya'}`}</span></span>
          </div>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            {!isMobile && <div style={{ position: 'relative' }}><span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)' }}>🔍</span><input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search candidates, campaigns..." style={{ padding: '9px 12px 9px 32px', borderRadius: 99, border: '1px solid #e2e8f0', background: '#f8fafc', outline: 'none', fontSize: 13, width: 220 }} /></div>}
            <span style={{ fontSize: 13, display: isMobile ? 'none' : 'block', fontWeight: 600 }}>Hi, {safeUser.fullName} {safeUser.userId ? <span style={{ color: '#94a3b8' }}>({safeUser.userId})</span> : ''}</span>
            <NotificationBell token={token} onGoMessages={() => goTab('messages')} />
            <button onClick={loadAll} style={{ background: '#334155', color: 'white', border: 'none', padding: '9px 14px', borderRadius: 10, cursor: 'pointer', fontWeight: 700, transition: 'all 0.2s' }}><span style={{ display: 'inline-block', animation: refreshSpin ? 'spin 0.6s ease' : 'none' }}>↻</span> {isMobile ? '' : 'Refresh'}</button>
            <button onClick={onLogout} style={{ background: '#ef4444', color: 'white', border: 'none', padding: '9px 14px', borderRadius: 10, cursor: 'pointer', fontWeight: 700 }}>Logout</button>
          </div>
        </div>
        {message && <div style={{ margin: '16px 20px 0', background: '#dbeafe', border: '1px solid #bfdbfe', padding: '12px 14px', borderRadius: 12, fontSize: 14, animation: 'slideDown 0.3s ease' }}>{message} <button onClick={() => setMessage && setMessage('')} style={{ float: 'right', border: 'none', background: 'none', cursor: 'pointer', fontSize: 16 }}>✕</button></div>}
        <div style={{ padding: isMobile ? 12 : 20, maxWidth: 1200, margin: '0 auto', width: '100%', boxSizing: 'border-box' }}>
          <div key={activeTab} className={tabAnim} style={{ animation: tabAnim === 'tabIn' ? 'tabIn 0.35s ease' : 'tabOut 0.12s ease' }}>
          {activeTab === 'overview' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: 10 }}>
                <div><h2 style={{ margin: '0 0 4px', fontSize: 26, fontWeight: 900 }}>Dashboard Overview {loading ? <span style={{ fontSize: 13, color: '#94a3b8', fontWeight: 400 }}>⏳ Loading...</span> : <span style={{ fontSize: 13, color: '#16a34a', fontWeight: 700 }}>● Live</span>}</h2><p style={{ color: '#64748b', fontSize: 13, margin: 0 }}>Live analytics • Volunteers per team • Campaign progress • Onboarding</p></div>
                <span style={{ fontSize: 12, color: '#64748b', background: 'white', padding: '6px 12px', borderRadius: 99, border: '1px solid #e2e8f0' }}>📅 {new Date().toLocaleDateString('en-KE', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14, margin: '18px 0' }}>
                {stats.map((s, i) => (
                  <div key={s.label} onClick={() => goTab(s.tab)} style={{ background: 'white', padding: 18, borderRadius: 16, boxShadow: '0 2px 12px rgba(0,0,0,0.05)', border: '1px solid #f1f5f9', cursor: 'pointer', transition: 'all 0.25s', animation: `slideUp ${0.2 + i * 0.08}s ease` }}
                    onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-5px)'; e.currentTarget.style.boxShadow = '0 12px 24px rgba(0,0,0,0.1)' }}
                    onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 2px 12px rgba(0,0,0,0.05)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div style={{ width: 44, height: 44, background: s.bg, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, color: 'white' }}>{s.icon}</div>
                      <span style={{ fontSize: 11, color: '#16a34a', fontWeight: 800, background: '#f0fdf4', padding: '3px 7px', borderRadius: 99 }}>● Live</span>
                    </div>
                    <div style={{ fontSize: 28, fontWeight: 900, margin: '12px 0 2px' }}>{s.value}</div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#0f172a' }}>{s.label}</div>
                    <div style={{ fontSize: 11, color: '#94a3b8' }}>{s.sub} • Click to view →</div>
                  </div>
                ))}
              </div>
              <div style={{ animation: 'fadeIn 0.5s ease' }}><AnalyticsCharts token={token} /></div>
              <div style={{ ...card, marginTop: 16, background: 'linear-gradient(135deg,#eff6ff,#dbeafe)', border: '1px solid #bfdbfe', animation: 'slideUp 0.5s ease' }}>
                <h3 style={{ margin: '0 0 8px' }}>Welcome, {safeUser.fullName}! 👋</h3>
                <p style={{ color: '#475569', margin: 0, fontSize: 14 }}>Role: <b style={{ color: '#0f172a' }}>{safeUser.role}</b> | County: <b style={{ color: '#0f172a' }}>{safeUser.county || '-'}</b> | Status: <b style={{ color: '#16a34a' }}>● ACTIVE</b></p>
                <p style={{ margin: '10px 0 0', color: '#475569', fontSize: 13 }}>Create in order: <b>Candidate → Campaign → Team → Volunteer</b></p>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 12 }}>
                  <button onClick={() => { setActiveTab('candidates'); setShowForm('candidate') }} style={btnPrimary}>+ Add Candidate</button>
                  <button onClick={() => { setActiveTab('campaigns'); setShowForm('campaign') }} style={{ ...btnPrimary, background: 'linear-gradient(90deg,#16a34a,#15803d)' }}>+ Add Campaign</button>
                  <button onClick={() => { setActiveTab('teams'); setShowForm('team') }} style={{ ...btnPrimary, background: 'linear-gradient(90deg,#f59e0b,#d97706)' }}>+ Add Team</button>
                  <button onClick={() => { setActiveTab('volunteers'); setShowForm('volunteer') }} style={{ ...btnPrimary, background: 'linear-gradient(90deg,#7c3aed,#6d28d9)' }}>+ Add Volunteer</button>
                </div>
              </div>
            </div>
          )}
          {activeTab === 'candidates' && (
            <div style={card}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
                <h3 style={{ margin: 0 }}>Candidates ({filteredCandidates.length}{search ? ` / ${candidates.length}` : ''})</h3>
                <button onClick={() => { setShowForm(showForm === 'candidate' ? null : 'candidate'); setEditing(null) }} style={btnGreen}>{showForm === 'candidate' ? '✕ Close Form' : '+ Add Candidate'}</button>
              </div>
              {search && <p style={{ fontSize: 12, color: '#64748b', margin: '8px 0 0' }}>🔍 Filtering by "{search}" - <span onClick={() => setSearch('')} style={{ color: '#2563eb', cursor: 'pointer', fontWeight: 700 }}>Clear</span></p>}
              {showForm === 'candidate' && !editing && <CandidateForm token={token} onDone={() => { setShowForm(null); loadAll() }} onCancel={() => setShowForm(null)} setMessage={setMessage} />}
              {editing?.type === 'candidate' && <CandidateForm token={token} initial={editing.data} onDone={() => { setEditing(null); loadAll() }} onCancel={() => setEditing(null)} setMessage={setMessage} />}
              {filteredCandidates.length === 0 ? <div style={{ textAlign: 'center', padding: 28 }}><div style={{ fontSize: 40 }}>👤</div><p style={{ color: '#94a3b8', margin: '10px 0 0' }}>{search ? 'No candidates match search.' : 'No candidates yet. Click + Add Candidate to start.'}</p></div> : filteredCandidates.map((c, idx) => (
                <div key={c.id} style={{ borderBottom: '1px solid #f1f5f9', padding: '14px 0', animation: `fadeIn ${0.15 + idx * 0.05}s ease` }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                    <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                      <div style={{ width: 44, height: 44, background: 'linear-gradient(135deg,#2563eb,#1d4ed8)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 900, flexShrink: 0 }}>{(c.fullName || 'U').charAt(0).toUpperCase()}</div>
                      <div><b>{c.fullName || 'Unnamed'}</b> - {c.positionContested || ''} - {c.county || ''} - {c.party || ''}<br /><span style={{ fontSize: 12, color: '#64748b' }}>{c.candidateId || ''} | {c.phone || ''} | {c.email || ''} | {c.constituency || ''}, {c.ward || ''} | Manager: {c.assignedManager?.fullName || 'Not assigned'}</span></div>
                    </div>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button onClick={() => { setEditing({ type: 'candidate', data: c }); setShowForm(null) }} style={btnEdit}>✏️ Edit</button>
                      <button onClick={() => del('candidate', c.id)} style={btnDel}>🗑️ Delete</button>
                    </div>
                  </div>
                  {isAdmin && <AssignManager candidate={c} token={token} onDone={loadAll} setMessage={setMessage} />}
                </div>
              ))}
            </div>
          )}
          {activeTab === 'campaigns' && (
            <div style={card}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
                <h3 style={{ margin: 0 }}>Campaigns ({filteredCampaigns.length})</h3>
                <button onClick={() => { setShowForm(showForm === 'campaign' ? null : 'campaign'); setEditing(null) }} style={btnGreen}>{showForm === 'campaign' ? '✕ Close Form' : '+ Add Campaign'}</button>
              </div>
              {showForm === 'campaign' && !editing && <CampaignForm token={token} candidates={candidates} onDone={() => { setShowForm(null); loadAll() }} onCancel={() => setShowForm(null)} setMessage={setMessage} />}
              {editing?.type === 'campaign' && <CampaignForm token={token} candidates={candidates} initial={editing.data} onDone={() => { setEditing(null); loadAll() }} onCancel={() => setEditing(null)} setMessage={setMessage} />}
              {filteredCampaigns.length === 0 ? <div style={{ textAlign: 'center', padding: 28 }}><div style={{ fontSize: 40 }}>🎯</div><p style={{ color: '#94a3b8', margin: '10px 0 0' }}>No campaigns yet.</p></div> : filteredCampaigns.map(c => (
                <div key={c.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #f1f5f9', padding: '14px 0', flexWrap: 'wrap', gap: 8 }}>
                  <div><b>{c.name}</b> - <span style={{ background: c.status === 'ACTIVE' ? '#dcfce7' : '#fef9c3', color: c.status === 'ACTIVE' ? '#166534' : '#854d0e', padding: '3px 10px', borderRadius: 99, fontSize: 12, fontWeight: 700 }}>{c.status || 'PLANNING'}</span><br /><span style={{ fontSize: 12, color: '#64748b' }}>{c.candidate?.fullName || ''} | {c.objectives || ''}</span></div>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button onClick={() => { setEditing({ type: 'campaign', data: c }); setShowForm(null) }} style={btnEdit}>✏️ Edit</button>
                    <button onClick={() => del('campaign', c.id)} style={btnDel}>🗑️ Delete</button>
                  </div>
                </div>
              ))}
            </div>
          )}
          {activeTab === 'teams' && (
            <div style={card}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
                <h3 style={{ margin: 0 }}>Teams ({filteredTeams.length})</h3>
                <button onClick={() => { setShowForm(showForm === 'team' ? null : 'team'); setEditing(null) }} style={btnGreen}>{showForm === 'team' ? '✕ Close Form' : '+ Add Team'}</button>
              </div>
              {showForm === 'team' && !editing && <TeamForm token={token} campaigns={campaigns} onDone={() => { setShowForm(null); loadAll() }} onCancel={() => setShowForm(null)} setMessage={setMessage} />}
              {editing?.type === 'team' && <TeamForm token={token} campaigns={campaigns} initial={editing.data} onDone={() => { setEditing(null); loadAll() }} onCancel={() => setEditing(null)} setMessage={setMessage} />}
              {filteredTeams.length === 0 ? <div style={{ textAlign: 'center', padding: 28 }}><div style={{ fontSize: 40 }}>👥</div><p style={{ color: '#94a3b8', margin: '10px 0 0' }}>No teams yet.</p></div> : filteredTeams.map(t => (
                <div key={t.id} style={{ borderBottom: '1px solid #f1f5f9', padding: '14px 0' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                    <div><b>{t.name}</b><br /><span style={{ fontSize: 12, color: '#64748b' }}>Campaign: {t.campaign?.name || '-'} | Leader ID: {t.leaderId || 'Not assigned'} | {t.volunteers?.length || 0} volunteers</span></div>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button onClick={() => { setEditing({ type: 'team', data: t }); setShowForm(null) }} style={btnEdit}>✏️ Edit</button>
                      <button onClick={() => del('team', t.id)} style={btnDel}>🗑️ Delete</button>
                    </div>
                  </div>
                  {isAdmin && <AssignLeader team={t} token={token} onDone={loadAll} setMessage={setMessage} />}
                </div>
              ))}
            </div>
          )}
          {activeTab === 'volunteers' && (
            <div style={card}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
                <h3 style={{ margin: 0 }}>Volunteers ({filteredVolunteers.length})</h3>
                <button onClick={() => { setShowForm(showForm === 'volunteer' ? null : 'volunteer'); setEditing(null) }} style={btnGreen}>{showForm === 'volunteer' ? '✕ Close Form' : '+ Add Volunteer'}</button>
              </div>
              {showForm === 'volunteer' && !editing && <VolunteerForm token={token} teams={teams} onDone={() => { setShowForm(null); loadAll() }} onCancel={() => setShowForm(null)} setMessage={setMessage} />}
              {editing?.type === 'volunteer' && <VolunteerForm token={token} teams={teams} initial={editing.data} onDone={() => { setEditing(null); loadAll() }} onCancel={() => setEditing(null)} setMessage={setMessage} />}
              {filteredVolunteers.length === 0 ? <div style={{ textAlign: 'center', padding: 28 }}><div style={{ fontSize: 40 }}>🤝</div><p style={{ color: '#94a3b8', margin: '10px 0 0' }}>No volunteers yet.</p></div> : filteredVolunteers.map(v => (
                <div key={v.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #f1f5f9', padding: '14px 0', flexWrap: 'wrap', gap: 8 }}>
                  <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                    <div style={{ width: 38, height: 38, background: '#f0fdf4', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, color: '#166534' }}>{(v.fullName || 'U').charAt(0).toUpperCase()}</div>
                    <div><b>{v.fullName || 'Unnamed'}</b> - {v.phone || ''}<br /><span style={{ fontSize: 12, color: '#64748b' }}>Team: {v.team?.name || 'No team'} | Onboarding: {v.onboardingStatus} | Consent: {v.consentRecord ? '✅ Yes' : '❌ No'}</span></div>
                  </div>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button onClick={() => { setEditing({ type: 'volunteer', data: v }); setShowForm(null) }} style={btnEdit}>✏️ Edit</button>
                    <button onClick={() => del('volunteer', v.id)} style={btnDel}>🗑️ Delete</button>
                  </div>
                </div>
              ))}
            </div>
          )}
          {activeTab === 'events' && <EventsPage token={token} user={safeUser} campaigns={campaigns} setMessage={setMessage} />}
          {activeTab === 'messages' && <MessagesPage token={token} user={safeUser} setMessage={setMessage} />}
          {activeTab === 'mentions' && <SocialListening token={token} user={safeUser} myData={myData} setMessage={setMessage} />}
          {activeTab === 'users' && isAdmin && <AdminUsers token={token} setMessage={setMessage} />}
          {activeTab === 'profile' && <CandidateProfile selected={safeUser} user={safeUser} token={token} message={message} setMessage={setMessage} onRefresh={() => loadAll()} />}
          </div>
        </div>
      </div>

      {/* ===== FLOATING HELP CENTRE - SLOW ===== */}
      <div
        onMouseEnter={() => setHelpPaused(true)}
        onMouseLeave={() => setHelpPaused(false)}
        onClick={() => setShowHelp(true)}
        title="Help Centre - Click to go to Team Leader"
        style={{
          position: 'fixed', left: helpPos.x, top: helpPos.y, zIndex: 9999, width: 62, height: 62,
          background: 'linear-gradient(135deg,#f59e0b,#f97316,#dc2626)', borderRadius: '50%',
          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28, cursor: 'pointer',
          boxShadow: '0 10px 30px rgba(249,115,22,0.5), 0 0 0 4px rgba(255,255,255,0.9)',
          animation: 'helpPulseSlow 3s ease-in-out infinite', border: '3px solid white', userSelect: 'none'
        }}
      >
        🆘
        <span style={{ position: 'absolute', top: -4, right: -4, width: 18, height: 18, background: '#dc2626', color: 'white', borderRadius: '50%', fontSize: 11, fontWeight: 900, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid white', animation: 'helpBlink 1s infinite' }}>!</span>
      </div>
      {helpTooltip && !showHelp && (
        <div style={{ position: 'fixed', left: Math.min(helpPos.x + 70, window.innerWidth - 230), top: helpPos.y + 12, zIndex: 9998, background: '#0f172a', color: 'white', padding: '8px 12px', borderRadius: 12, fontSize: 12, fontWeight: 700, boxShadow: '0 8px 20px rgba(0,0,0,0.25)', pointerEvents: 'none', whiteSpace: 'nowrap', animation: 'fadeIn 0.4s ease' }}>
          🆘 Need help? Click me → Team Leader
        </div>
      )}

      {/* ===== HELP CENTRE MODAL ===== */}
      {showHelp && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, animation: 'fadeIn 0.25s ease' }} onClick={() => setShowHelp(false)}>
          <div style={{ background: 'white', borderRadius: 24, maxWidth: 440, width: '100%', padding: 26, position: 'relative', animation: 'pop 0.35s cubic-bezier(0.22,1,0.36,1)', boxShadow: '0 30px 80px rgba(0,0,0,0.35)' }} onClick={e => e.stopPropagation()}>
            <button onClick={() => setShowHelp(false)} style={{ position: 'absolute', top: 14, right: 14, background: '#f1f5f9', border: 'none', width: 32, height: 32, borderRadius: '50%', cursor: 'pointer', fontSize: 16 }}>✕</button>
            <div style={{ width: 72, height: 72, background: 'linear-gradient(135deg,#f59e0b,#f97316)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 36, margin: '0 auto', animation: 'bounce 2s infinite' }}>🆘</div>
            <h2 style={{ textAlign: 'center', margin: '14px 0 6px', fontSize: 24, fontWeight: 900 }}>Help Centre</h2>
            <p style={{ textAlign: 'center', color: '#64748b', fontSize: 13, margin: '0 0 16px', lineHeight: 1.5 }}>Stuck? Your Team Leader can help you with campaigns, teams, volunteers & events.</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <button onClick={goToTeamLeader} style={{ padding: 14, background: 'linear-gradient(90deg,#2563eb,#1d4ed8)', color: 'white', border: 'none', borderRadius: 14, cursor: 'pointer', fontWeight: 900, fontSize: 15, boxShadow: '0 8px 20px rgba(37,99,235,0.35)' }}>👥 Go to Team Leader →</button>
              <button onClick={() => { setShowHelp(false); goTab('messages') }} style={{ padding: 13, background: '#f0fdf4', border: '1px solid #bbf7d0', color: '#166534', borderRadius: 14, cursor: 'pointer', fontWeight: 800 }}>💬 Message Team Leader</button>
              <button onClick={() => { setShowHelp(false); goTab('mentions') }} style={{ padding: 13, background: '#fffbeb', border: '1px solid #fde68a', color: '#92400e', borderRadius: 14, cursor: 'pointer', fontWeight: 800 }}>👀 See Online Mentions</button>
              <button onClick={() => { setShowHelp(false); goTab('teams') }} style={{ padding: 13, background: '#fef3c7', border: '1px solid #fde68a', color: '#92400e', borderRadius: 14, cursor: 'pointer', fontWeight: 800 }}>👥 View All Teams</button>
              <button onClick={() => { setShowHelp(false); goTab('events') }} style={{ padding: 13, background: '#eff6ff', border: '1px solid #bfdbfe', color: '#1e40af', borderRadius: 14, cursor: 'pointer', fontWeight: 800 }}>📅 View Events & Help Guide</button>
            </div>
            <div style={{ marginTop: 16, background: '#f8fafc', borderRadius: 12, padding: '11px 12px', fontSize: 12, color: '#64748b', lineHeight: 1.6, textAlign: 'center' }}>
              <b style={{ color: '#0f172a' }}>Quick Help:</b><br />• Add Candidate → Candidate → Team → Volunteer<br />• Invite via WhatsApp in Messages<br />• Approval: Contact Admin
            </div>
            <p style={{ textAlign: 'center', fontSize: 11, color: '#94a3b8', margin: '12px 0 0' }}>PCMS Help Centre • Available 24/7 🇰🇪</p>
          </div>
        </div>
      )}

      <style>{`
        @keyframes tabIn{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}
        @keyframes tabOut{from{opacity:1;transform:translateY(0)}to{opacity:0;transform:translateY(-8px)}}
        @keyframes slideUp{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}
        @keyframes fadeIn{from{opacity:0}to{opacity:1}}
        @keyframes fadeInLeft{from{opacity:0;transform:translateX(-12px)}to{opacity:1;transform:translateX(0)}}
        @keyframes slideDown{from{opacity:0;transform:translateY(-8px)}to{opacity:1;transform:translateY(0)}}
        @keyframes slideInLeft{from{transform:translateX(-100%)}to{transform:translateX(0)}}
        @keyframes bounce{0%,100%{transform:translateY(0)}50%{transform:translateY(-4px)}}
        @keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}
        @keyframes formIn{from{opacity:0;transform:translateY(-10px) scale(0.98)}to{opacity:1;transform:translateY(0) scale(1)}}
        @keyframes pop{0%{transform:scale(0.9);opacity:0}100%{transform:scale(1);opacity:1}}
        @keyframes helpPulseSlow{0%,100%{transform:scale(1)}50%{transform:scale(1.07)}}
        @keyframes helpBlink{0%,100%{opacity:1}50%{opacity:0.4}}
      `}</style>
    </div>
  )
}

function AssignManager({ candidate, token, onDone, setMessage }) {
  const [users, setUsers] = useState([])
  const [open, setOpen] = useState(false)
  useEffect(() => { if (open) fetch(`${API}/api/admin/users-for-assign`, { headers: { 'Authorization': `Bearer ${token}` } }).then(r => r.json()).then(d => setUsers(Array.isArray(d) ? d.filter(u => u.role === 'CAMPAIGN_MANAGER') : [])).catch(() => []) }, [open])
  if (!open) return <button onClick={() => setOpen(true)} style={{ marginTop: 8, background: '#e0e7ff', border: 'none', padding: '7px 11px', borderRadius: 8, cursor: 'pointer', fontSize: 12, fontWeight: 700, color: '#1e40af' }}>👔 Assign Manager</button>
  return (
    <div style={{ marginTop: 8, display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center', animation: 'slideDown 0.25s ease' }}>
      <select onChange={async (e) => {
        const res = await fetch(`${API}/api/candidates/${candidate.id}/assign-manager`, { method: 'PUT', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }, body: JSON.stringify({ managerId: e.target.value || null }) })
        const d = await res.json().catch(() => ({}))
        if (d.error) setMessage && setMessage(d.error); else { setMessage && setMessage('Manager assigned!'); onDone() }
        setOpen(false)
      }} style={{ padding: 7, borderRadius: 8, border: '1px solid #cbd5e1' }}>
        <option value="">-- Select Manager / Clear --</option>
        {users.map(u => <option key={u.id} value={u.id}>{u.fullName} ({u.email})</option>)}
      </select>
      <button onClick={() => setOpen(false)} style={{ border: 'none', background: 'none', cursor: 'pointer' }}>✕</button>
    </div>
  )
}

function AssignLeader({ team, token, onDone, setMessage }) {
  const [users, setUsers] = useState([])
  const [open, setOpen] = useState(false)
  useEffect(() => { if (open) fetch(`${API}/api/admin/users-for-assign`, { headers: { 'Authorization': `Bearer ${token}` } }).then(r => r.json()).then(d => setUsers(Array.isArray(d) ? d.filter(u => u.role === 'TEAM_LEADER') : [])).catch(() => []) }, [open])
  if (!open) return <button onClick={() => setOpen(true)} style={{ marginTop: 8, background: '#fef3c7', border: 'none', padding: '7px 11px', borderRadius: 8, cursor: 'pointer', fontSize: 12, fontWeight: 700, color: '#92400e' }}>👥 Assign Leader</button>
  return (
    <div style={{ marginTop: 8, display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center', animation: 'slideDown 0.25s ease' }}>
      <select onChange={async (e) => {
        const res = await fetch(`${API}/api/teams/${team.id}/assign-leader`, { method: 'PUT', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }, body: JSON.stringify({ leaderId: e.target.value || null }) })
        const d = await res.json().catch(() => ({}))
        if (d.error) setMessage && setMessage(d.error); else { setMessage && setMessage('Leader assigned!'); onDone() }
        setOpen(false)
      }} style={{ padding: 7, borderRadius: 8, border: '1px solid #cbd5e1' }}>
        <option value="">-- Select Leader / Clear --</option>
        {users.map(u => <option key={u.id} value={u.id}>{u.fullName} ({u.email})</option>)}
      </select>
      <button onClick={() => setOpen(false)} style={{ border: 'none', background: 'none', cursor: 'pointer' }}>✕</button>
    </div>
  )
}

const input = { width: '100%', padding: '12px 13px', borderRadius: 10, border: '2px solid #e2e8f0', background: '#f8fafc', boxSizing: 'border-box', fontSize: 14, marginBottom: 10, outline: 'none', transition: 'all 0.2s' }
const label = { fontSize: 13, fontWeight: '700', display: 'block', marginBottom: 4, color: '#334155' }
const formBox = { background: '#f8fafc', padding: 18, borderRadius: 14, marginTop: 16, border: '1px solid #e2e8f0', animation: 'formIn 0.35s ease' }
function Field({ label: l, children }) { return <div><label style={label}>{l}</label>{children}</div> }

function CandidateForm({ token, initial, onDone, onCancel, setMessage }) {
  const [f, setF] = useState(initial ? { fullName: initial.fullName || '', phone: initial.phone || '', email: initial.email || '', party: initial.party || '', positionContested: initial.positionContested || '', county: initial.county || '', constituency: initial.constituency || '', ward: initial.ward || '', education: initial.education || '', leadershipExperience: initial.leadershipExperience || '', biography: initial.biography || '', status: initial.status || 'ACTIVE' } : { fullName: '', phone: '+254 ', email: '', party: '', positionContested: '', county: '', constituency: '', ward: '', education: '', leadershipExperience: '', biography: '', status: 'ACTIVE' })
  const [loading, setLoading] = useState(false)
  const set = (k, v) => setF({ ...f, [k]: v })
  const submit = async (e) => {
    e.preventDefault()
    if (!f.fullName || !f.phone || !f.positionContested || !f.county || !f.constituency) return setMessage && setMessage('Full Name, Phone, Position, County, Constituency are required')
    setLoading(true)
    try {
      const url = initial ? `${API}/api/candidates/${initial.id}` : `${API}/api/candidates`
      const res = await fetch(url, { method: initial ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }, body: JSON.stringify(f) })
      const d = await res.json().catch(() => ({}))
      if (d.error) setMessage && setMessage(d.error); else { setMessage && setMessage(initial ? 'Candidate updated!' : 'Candidate created!'); onDone() }
    } catch { setMessage && setMessage('Cannot connect to backend') }
    setLoading(false)
  }
  return (
    <form onSubmit={submit} style={formBox}>
      <h4 style={{ margin: '0 0 12px' }}>{initial ? '✏️ Edit Candidate' : '➕ Add Candidate'}</h4>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '0 12px' }}>
        <Field label="Full Name *"><input value={f.fullName} onChange={e => set('fullName', e.target.value)} placeholder="John Doe" style={input} required /></Field>
        <Field label="Phone *"><input value={f.phone} onChange={e => set('phone', e.target.value)} placeholder="+254 7XX XXX XXX" style={input} required /></Field>
        <Field label="Email"><input type="email" value={f.email} onChange={e => set('email', e.target.value)} placeholder="john@example.com" style={input} /></Field>
        <Field label="Party"><input value={f.party} onChange={e => set('party', e.target.value)} placeholder="Party name" style={input} /></Field>
        <Field label="Position Contested *"><select value={f.positionContested} onChange={e => set('positionContested', e.target.value)} style={input} required><option value="">Select position</option><option>President</option><option>Governor</option><option>Senator</option><option>MP</option><option>Woman Rep</option><option>MCA</option></select></Field>
        <Field label="County *"><input value={f.county} onChange={e => set('county', e.target.value)} placeholder="Bomet" style={input} required /></Field>
        <Field label="Constituency *"><input value={f.constituency} onChange={e => set('constituency', e.target.value)} placeholder="Sotik" style={input} required /></Field>
        <Field label="Ward"><input value={f.ward} onChange={e => set('ward', e.target.value)} placeholder="Rongena" style={input} /></Field>
        <Field label="Education"><input value={f.education} onChange={e => set('education', e.target.value)} placeholder="Degree / Diploma" style={input} /></Field>
        <Field label="Status"><select value={f.status} onChange={e => set('status', e.target.value)} style={input}><option>ACTIVE</option><option>INACTIVE</option></select></Field>
      </div>
      <Field label="Leadership Experience"><input value={f.leadershipExperience} onChange={e => set('leadershipExperience', e.target.value)} placeholder="e.g. MCA 2017-2022" style={input} /></Field>
      <Field label="Biography"><textarea value={f.biography} onChange={e => set('biography', e.target.value)} placeholder="About the candidate..." style={{ ...input, minHeight: 70, resize: 'vertical' }} /></Field>
      <div style={{ display: 'flex', gap: 8 }}>
        <button type="submit" disabled={loading} style={{ padding: '11px 22px', background: loading ? '#94a3b8' : '#16a34a', color: 'white', border: 'none', borderRadius: 10, cursor: 'pointer', fontWeight: 'bold' }}>{loading ? 'Saving...' : initial ? 'Update Candidate' : 'Create Candidate'}</button>
        <button type="button" onClick={onCancel} style={{ padding: '11px 18px', background: '#e2e8f0', border: 'none', borderRadius: 10, cursor: 'pointer' }}>Cancel</button>
      </div>
    </form>
  )
}

function CampaignForm({ token, candidates, initial, onDone, onCancel, setMessage }) {
  const [f, setF] = useState(initial ? { name: initial.name || '', candidateId: initial.candidateId || initial.candidate?.id || '', objectives: initial.objectives || '', startDate: initial.startDate ? initial.startDate.slice(0, 10) : '', endDate: initial.endDate ? initial.endDate.slice(0, 10) : '', status: initial.status || 'PLANNING' } : { name: '', candidateId: '', objectives: '', startDate: '', endDate: '', status: 'PLANNING' })
  const [loading, setLoading] = useState(false)
  const set = (k, v) => setF({ ...f, [k]: v })
  const submit = async (e) => {
    e.preventDefault()
    if (!f.name) return setMessage && setMessage('Campaign name required')
    if (!f.candidateId) return setMessage && setMessage('Candidate is required')
    setLoading(true)
    try {
      const url = initial ? `${API}/api/campaigns/${initial.id}` : `${API}/api/campaigns`
      const res = await fetch(url, { method: initial ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }, body: JSON.stringify({ ...f, candidateId: f.candidateId }) })
      const d = await res.json().catch(() => ({}))
      if (d.error) setMessage && setMessage(d.error); else { setMessage && setMessage(initial ? 'Campaign updated!' : 'Campaign created!'); onDone() }
    } catch { setMessage && setMessage('Cannot connect to backend') }
    setLoading(false)
  }
  return (
    <form onSubmit={submit} style={formBox}>
      <h4 style={{ margin: '0 0 12px' }}>{initial ? '✏️ Edit Campaign' : '➕ Add Campaign'}</h4>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '0 12px' }}>
        <Field label="Campaign Name *"><input value={f.name} onChange={e => set('name', e.target.value)} placeholder="e.g. Sotik Ground Game 2027" style={input} required /></Field>
        <Field label="Candidate *"><select value={f.candidateId} onChange={e => set('candidateId', e.target.value)} style={input} required><option value="">Select Candidate (required)</option>{candidates.map(c => <option key={c.id} value={c.id}>{c.fullName} - {c.positionContested || ''}</option>)}</select></Field>
        <Field label="Start Date"><input type="date" value={f.startDate} onChange={e => set('startDate', e.target.value)} style={input} /></Field>
        <Field label="End Date"><input type="date" value={f.endDate} onChange={e => set('endDate', e.target.value)} style={input} /></Field>
        <Field label="Status"><select value={f.status} onChange={e => set('status', e.target.value)} style={input}><option>PLANNING</option><option>ACTIVE</option><option>PAUSED</option><option>COMPLETED</option><option>SUSPENDED</option></select></Field>
      </div>
      <Field label="Objectives"><textarea value={f.objectives} onChange={e => set('objectives', e.target.value)} placeholder="What will this campaign achieve?" style={{ ...input, minHeight: 70, resize: 'vertical' }} /></Field>
      <div style={{ display: 'flex', gap: 8 }}>
        <button type="submit" disabled={loading} style={{ padding: '11px 22px', background: loading ? '#94a3b8' : '#16a34a', color: 'white', border: 'none', borderRadius: 10, cursor: 'pointer', fontWeight: 'bold' }}>{loading ? 'Saving...' : initial ? 'Update Campaign' : 'Create Campaign'}</button>
        <button type="button" onClick={onCancel} style={{ padding: '11px 18px', background: '#e2e8f0', border: 'none', borderRadius: 10, cursor: 'pointer' }}>Cancel</button>
      </div>
    </form>
  )
}

function TeamForm({ token, campaigns, initial, onDone, onCancel, setMessage }) {
  const [f, setF] = useState(initial ? { name: initial.name || '', campaignId: initial.campaignId || initial.campaign?.id || '', leaderId: initial.leaderId || '' } : { name: '', campaignId: '', leaderId: '' })
  const [loading, setLoading] = useState(false)
  const set = (k, v) => setF({ ...f, [k]: v })
  const submit = async (e) => {
    e.preventDefault()
    if (!f.name) return setMessage && setMessage('Team name required')
    if (!f.campaignId) return setMessage && setMessage('Campaign is required')
    setLoading(true)
    try {
      const url = initial ? `${API}/api/teams/${initial.id}` : `${API}/api/teams`
      const res = await fetch(url, { method: initial ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }, body: JSON.stringify({ name: f.name, campaignId: f.campaignId, leaderId: f.leaderId || null }) })
      const d = await res.json().catch(() => ({}))
      if (d.error) setMessage && setMessage(d.error); else { setMessage && setMessage(initial ? 'Team updated!' : 'Team created!'); onDone() }
    } catch { setMessage && setMessage('Cannot connect to backend') }
    setLoading(false)
  }
  return (
    <form onSubmit={submit} style={formBox}>
      <h4 style={{ margin: '0 0 12px' }}>{initial ? '✏️ Edit Team' : '➕ Add Team'}</h4>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '0 12px' }}>
        <Field label="Team Name *"><input value={f.name} onChange={e => set('name', e.target.value)} placeholder="e.g. Rongena Ground Team" style={input} required /></Field>
        <Field label="Campaign *"><select value={f.campaignId} onChange={e => set('campaignId', e.target.value)} style={input} required><option value="">Select Campaign (required)</option>{campaigns.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></Field>
        <Field label="Leader ID (optional)"><input value={f.leaderId} onChange={e => set('leaderId', e.target.value)} placeholder="User ID of leader (optional)" style={input} /></Field>
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        <button type="submit" disabled={loading} style={{ padding: '11px 22px', background: loading ? '#94a3b8' : '#16a34a', color: 'white', border: 'none', borderRadius: 10, cursor: 'pointer', fontWeight: 'bold' }}>{loading ? 'Saving...' : initial ? 'Update Team' : 'Create Team'}</button>
        <button type="button" onClick={onCancel} style={{ padding: '11px 18px', background: '#e2e8f0', border: 'none', borderRadius: 10, cursor: 'pointer' }}>Cancel</button>
      </div>
    </form>
  )
}

function VolunteerForm({ token, teams, initial, onDone, onCancel, setMessage }) {
  const [f, setF] = useState(initial ? { fullName: initial.fullName || '', phone: initial.phone || '', teamId: initial.teamId || initial.team?.id || '', onboardingStatus: initial.onboardingStatus || 'PENDING', consentRecord: !!initial.consentRecord } : { fullName: '', phone: '+254 ', teamId: '', onboardingStatus: 'PENDING', consentRecord: false })
  const [loading, setLoading] = useState(false)
  const set = (k, v) => setF({ ...f, [k]: v })
  const submit = async (e) => {
    e.preventDefault()
    if (!f.fullName || !f.phone) return setMessage && setMessage('Full Name and Phone required')
    setLoading(true)
    try {
      const url = initial ? `${API}/api/volunteers/${initial.id}` : `${API}/api/volunteers`
      const res = await fetch(url, { method: initial ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }, body: JSON.stringify({ fullName: f.fullName, phone: f.phone, teamId: f.teamId || null, onboardingStatus: f.onboardingStatus, consentRecord: f.consentRecord }) })
      const d = await res.json().catch(() => ({}))
      if (d.error) setMessage && setMessage(d.error); else { setMessage && setMessage(initial ? 'Volunteer updated!' : 'Volunteer created!'); onDone() }
    } catch { setMessage && setMessage('Cannot connect to backend') }
    setLoading(false)
  }
  return (
    <form onSubmit={submit} style={formBox}>
      <h4 style={{ margin: '0 0 12px' }}>{initial ? '✏️ Edit Volunteer' : '➕ Add Volunteer'}</h4>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '0 12px' }}>
        <Field label="Full Name *"><input value={f.fullName} onChange={e => set('fullName', e.target.value)} placeholder="Jane Chebet" style={input} required /></Field>
        <Field label="Phone *"><input value={f.phone} onChange={e => set('phone', e.target.value)} placeholder="+254 7XX XXX XXX" style={input} required /></Field>
        <Field label="Team"><select value={f.teamId} onChange={e => set('teamId', e.target.value)} style={input}><option value="">No team / Select</option>{teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}</select></Field>
        <Field label="Onboarding Status"><select value={f.onboardingStatus} onChange={e => set('onboardingStatus', e.target.value)} style={input}><option>PENDING</option><option>APPROVED</option><option>REJECTED</option></select></Field>
      </div>
      <label style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 13, marginBottom: 12 }}><input type="checkbox" checked={f.consentRecord} onChange={e => set('consentRecord', e.target.checked)} /> Has given consent (consentRecord)</label>
      <div style={{ display: 'flex', gap: 8 }}>
        <button type="submit" disabled={loading} style={{ padding: '11px 22px', background: loading ? '#94a3b8' : '#16a34a', color: 'white', border: 'none', borderRadius: 10, cursor: 'pointer', fontWeight: 'bold' }}>{loading ? 'Saving...' : initial ? 'Update Volunteer' : 'Create Volunteer'}</button>
        <button type="button" onClick={onCancel} style={{ padding: '11px 18px', background: '#e2e8f0', border: 'none', borderRadius: 10, cursor: 'pointer' }}>Cancel</button>
      </div>
    </form>
  )
}

function AdminUsers({ token, setMessage }) {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(false)
  const load = async () => {
    setLoading(true)
    try {
      const res = await fetch(`${API}/api/admin/users`, { headers: { 'Authorization': `Bearer ${token}` } })
      const data = await res.json()
      setUsers(Array.isArray(data) ? data : [])
    } catch { setUsers([]) }
    setLoading(false)
  }
  useEffect(() => { load() }, [])
  const act = async (id, action) => {
    try {
      await fetch(`${API}/api/admin/users/${id}/${action}`, { method: 'PUT', headers: { 'Authorization': `Bearer ${token}` } })
      if (setMessage) setMessage(`User ${action}d successfully`)
      load()
    } catch { if (setMessage) setMessage('Action failed - check backend') }
  }
  return (
    <div style={{ background: 'white', padding: 20, borderRadius: 16, boxShadow: '0 2px 12px rgba(0,0,0,0.05)' }}>
      <h3 style={{ margin: '0 0 12px' }}>Users / Approval ({users.length}) {loading ? '⏳ Loading...' : ''}</h3>
      {users.length === 0 ? <div style={{ textAlign: 'center', padding: 28 }}><div style={{ fontSize: 40 }}>🛡️</div><p style={{ color: '#94a3b8' }}>No users yet.</p></div> : users.map(u => (
        <div key={u.id || u._id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #f1f5f9', padding: '14px 0', flexWrap: 'wrap', gap: 8 }}>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <div style={{ width: 44, height: 44, background: u.status === 'ACTIVE' ? '#dcfce7' : u.status === 'PENDING' ? '#fef9c3' : '#fee2e2', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900 }}>{(u.fullName || 'U').charAt(0).toUpperCase()}</div>
            <div><b>{u.fullName}</b> ({u.userId})<br /><span style={{ fontSize: 12, color: '#64748b' }}>{u.email} | {u.phone} | {u.county} | {u.accountType} | {u.role}</span><br />
              <span style={{ fontSize: 12, padding: '3px 10px', borderRadius: 99, fontWeight: 700, background: u.status === 'ACTIVE' ? '#dcfce7' : u.status === 'PENDING' ? '#fef9c3' : '#fee2e2', color: u.status === 'ACTIVE' ? '#166534' : u.status === 'PENDING' ? '#854d0e' : '#991b1b' }}>{u.status}</span>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {u.status === 'PENDING' && <button onClick={() => act(u.id, 'approve')} style={{ background: '#16a34a', color: 'white', border: 'none', padding: '9px 13px', borderRadius: 10, cursor: 'pointer', fontWeight: 700 }}>✅ Approve</button>}
            {u.status !== 'SUSPENDED' && <button onClick={() => act(u.id, 'suspend')} style={{ background: '#ef4444', color: 'white', border: 'none', padding: '9px 13px', borderRadius: 10, cursor: 'pointer', fontWeight: 700 }}>⛔ Suspend</button>}
            {u.status === 'SUSPENDED' && <button onClick={() => act(u.id, 'approve')} style={{ background: '#2563eb', color: 'white', border: 'none', padding: '9px 13px', borderRadius: 10, cursor: 'pointer', fontWeight: 700 }}>🔄 Reactivate</button>}
          </div>
        </div>
      ))}
    </div>
  )
}