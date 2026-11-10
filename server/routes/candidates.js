import { useState, useEffect, useRef } from 'react'
import ProfileEdit from './ProfileEdit'
import EventsPage from './EventsPage'
import MessagesPage from './MessagesPage'
import NotificationBell from '../components/NotificationBell'
import AnalyticsCharts from '../components/AnalyticsCharts'
import SocialListening from './SocialListening'

export default function CandidateDashboard({ token, user, myData, onLogout, setMessage, onGoCandidateSetup }) {
  const [activeMenu, setActiveMenu] = useState('dashboard')
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [search, setSearch] = useState('')
  const [tabAnim, setTabAnim] = useState('tabIn')
  const [isMobile, setIsMobile] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)

  // ===== HELP 🆘 =====
  const [helpPos, setHelpPos] = useState({ x: 20, y: 140 })
  const [helpPaused, setHelpPaused] = useState(false)
  const [showHelp, setShowHelp] = useState(false)
  const helpVel = useRef({ vx: 0.5, vy: 0.35 })
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

  useEffect(() => {
    const check = () => { const m = window.innerWidth < 768; setIsMobile(m); if (m) setSidebarOpen(false) }
    check(); window.addEventListener('resize', check); return () => window.removeEventListener('resize', check)
  }, [])

  const cand = myData?.myCandidate
  const campaigns = myData?.myCampaigns || []
  const teams = myData?.myTeams || []
  const volunteers = myData?.myVolunteers || []
  const initials = (user?.fullName || 'C').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()

  const openCandidateSetup = () => {
    setMobileOpen(false)
    if (typeof onGoCandidateSetup === 'function') onGoCandidateSetup()
    else setActiveMenu('mentions')
  }

  const goMenu = (id) => { setTabAnim('tabOut'); setTimeout(() => { setActiveMenu(id); setSearch(''); setTabAnim('tabIn') }, 120); setMobileOpen(false) }

  const menu = [
    { id: 'dashboard', label: 'Dashboard', icon: '📊', badge: null },
    { id: 'profile', label: 'My Profile', icon: '👤', badge: null },
    { id: 'campaigns', label: 'My Campaigns', icon: '🎯', badge: campaigns.length },
    { id: 'teams', label: 'My Teams', icon: '👥', badge: teams.length },
    { id: 'volunteers', label: 'Volunteers', icon: '🤝', badge: volunteers.length },
    { id: 'events', label: 'Events', icon: '📅', badge: null },
    { id: 'messages', label: 'Messages', icon: '✉️', badge: null },
    { id: 'mentions', label: 'Online Mentions', icon: '👀', badge: null },
  ]

  const filteredCampaigns = campaigns.filter(c => (c.name || '').toLowerCase().includes(search.toLowerCase()))
  const filteredTeams = teams.filter(t => (t.name || '').toLowerCase().includes(search.toLowerCase()))
  const filteredVolunteers = volunteers.filter(v => (v.fullName || '').toLowerCase().includes(search.toLowerCase()))

  // PROFESSIONAL stats - no rainbow, one accent
  const stats = [
    { label: 'My Campaigns', value: campaigns.length, icon: '🎯', sub: 'Active campaigns', menu: 'campaigns' },
    { label: 'My Teams', value: teams.length, icon: '👥', sub: 'Ground teams', menu: 'teams' },
    { label: 'Volunteers', value: volunteers.length, icon: '🤝', sub: 'Supporting you', menu: 'volunteers' },
    { label: 'Events', value: '📅', icon: '📅', sub: 'Upcoming events', menu: 'events' },
    { label: 'Online Mentions', value: '👀', icon: '👀', sub: 'What people say', menu: 'mentions' },
  ]

  const card = { background: 'white', padding: 20, borderRadius: 14, boxShadow: '0 1px 3px rgba(0,0,0,0.06)', border: '1px solid #e2e8f0' }
  const sidebarContent = (
    <>
      <div style={{ padding: 18, display: 'flex', gap: 10, alignItems: 'center' }}>
        <div style={{ width: 40, height: 40, background: 'white', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, flexShrink: 0 }}>🗳️</div>
        {sidebarOpen && <div><div style={{ fontSize: 20, fontWeight: 800, letterSpacing: -0.5 }}>PCMS</div><div style={{ fontSize: 10, color: '#bfdbfe', letterSpacing: 1, textTransform: 'uppercase' }}>Candidate</div></div>}
      </div>
      {sidebarOpen && (
        <div style={{ margin: '0 14px 16px', background: 'rgba(255,255,255,0.12)', borderRadius: 12, padding: '12px', display: 'flex', gap: 10, alignItems: 'center' }}>
          <div style={{ width: 36, height: 36, background: 'white', color: '#1e40af', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 13 }}>{initials}</div>
          <div style={{ minWidth: 0 }}><div style={{ fontSize: 13, fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{user?.fullName}</div><div style={{ fontSize: 11, color: '#bfdbfe' }}>{cand?.positionContested || 'Candidate'} • {user?.county || 'Kenya'}</div></div>
        </div>
      )}
      <div style={{ padding: '0 10px 10px', display: 'flex', justifyContent: 'flex-end' }}><button onClick={() => setSidebarOpen(!sidebarOpen)} style={{ background: 'rgba(255,255,255,0.15)', color: 'white', border: 'none', borderRadius: 8, padding: '6px 10px', cursor: 'pointer', fontSize: 12 }}>{sidebarOpen ? '◀ Collapse' : '▶'}</button></div>
      <div style={{ padding: '0 10px', flex: 1 }}>{menu.map((m, i) => (
        <button key={m.id} onClick={() => goMenu(m.id)} style={{ width: '100%', textAlign: 'left', padding: sidebarOpen ? '11px 14px' : '11px 0', borderRadius: 10, border: 'none', cursor: 'pointer', background: activeMenu === m.id ? 'white' : 'transparent', color: activeMenu === m.id ? '#1e40af' : 'white', fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: sidebarOpen ? 'flex-start' : 'center', gap: 10, fontWeight: activeMenu === m.id ? '700' : '500', transition: 'all 0.2s' }}>
          <span style={{ fontSize: 17 }}>{m.icon}</span>{sidebarOpen && <span style={{ flex: 1 }}>{m.label}</span>}
          {sidebarOpen && m.badge !== null && m.badge > 0 && <span style={{ background: activeMenu === m.id ? '#1e40af' : 'white', color: activeMenu === m.id ? 'white' : '#1e40af', fontSize: 11, fontWeight: 700, padding: '2px 7px', borderRadius: 99 }}>{m.badge}</span>}
        </button>
      ))}</div>
      <div style={{ padding: 12 }}>
        <button onClick={() => setShowHelp(true)} style={{ width: '100%', background: 'white', color: '#1e40af', border: 'none', padding: 11, borderRadius: 10, cursor: 'pointer', fontWeight: '700', marginBottom: 8, fontSize: 13 }}>🆘 {sidebarOpen && 'Help Centre'}</button>
        <button onClick={onLogout} style={{ width: '100%', background: 'rgba(255,255,255,0.15)', color: 'white', border: 'none', padding: 11, borderRadius: 10, cursor: 'pointer', fontWeight: '700', fontSize: 13 }}>{sidebarOpen ? '← Logout' : '←'}</button>
        {sidebarOpen && <div style={{ textAlign: 'center', marginTop: 12, fontSize: 11, color: '#bfdbfe' }}>🇰🇪 Vote for Change</div>}
      </div>
    </>
  )

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#f8fafc', fontFamily: "'Inter', system-ui, sans-serif" }}>
      {!isMobile && <div style={{ width: sidebarOpen ? 260 : 72, background: '#1e40af', color: 'white', display: 'flex', flexDirection: 'column', flexShrink: 0, position: 'sticky', top: 0, height: '100vh', transition: 'width 0.25s', overflow: 'hidden' }}>{sidebarContent}</div>}
      {isMobile && mobileOpen && (
        <>
          <div onClick={() => setMobileOpen(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 40 }} />
          <div style={{ position: 'fixed', left: 0, top: 0, bottom: 0, width: 260, background: '#1e40af', color: 'white', display: 'flex', flexDirection: 'column', zIndex: 50 }}>{sidebarContent}</div>
        </>
      )}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        <div style={{ background: 'white', padding: '12px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e2e8f0', position: 'sticky', top: 0, zIndex: 10 }}>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <button onClick={() => isMobile ? setMobileOpen(!mobileOpen) : setSidebarOpen(!sidebarOpen)} style={{ background: '#f1f5f9', color: '#1e40af', border: '1px solid #e2e8f0', borderRadius: 8, padding: '8px 11px', cursor: 'pointer' }}>☰</button>
            <b style={{ color: '#0f172a', fontSize: 16 }}>Candidate Dashboard <span style={{ fontWeight: 400, fontSize: 12, color: '#94a3b8' }}>• {cand?.positionContested || user?.county || 'Kenya'}</span></b>
          </div>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            {!isMobile && <div style={{ position: 'relative' }}><span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)' }}>🔍</span><input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search campaigns, teams..." style={{ padding: '8px 12px 8px 32px', borderRadius: 8, border: '1px solid #e2e8f0', background: '#f8fafc', outline: 'none', fontSize: 13, width: 210 }} /></div>}
            <span style={{ fontSize: 13, display: isMobile ? 'none' : 'block', fontWeight: 600, color: '#334155' }}>Hi, {user?.fullName}</span>
            <NotificationBell token={token} onGoMessages={() => goMenu('messages')} />
            {user?.photo ? <img src={user.photo} style={{ width: 34, height: 34, borderRadius: '50%', objectFit: 'cover' }} /> : <div style={{ width: 34, height: 34, borderRadius: '50%', background: '#1e40af', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '700', fontSize: 12 }}>{initials}</div>}
            <button onClick={onLogout} style={{ background: '#0f172a', color: 'white', border: 'none', padding: '8px 14px', borderRadius: 8, cursor: 'pointer', fontWeight: 600, fontSize: 13 }}>Logout</button>
          </div>
        </div>

        <div style={{ padding: isMobile ? 14 : 24, maxWidth: 1100, margin: '0 auto', width: '100%', boxSizing: 'border-box' }}>
          <div key={activeMenu} style={{ animation: tabAnim === 'tabIn' ? 'tabIn 0.3s ease' : 'tabOut 0.12s ease' }}>
          {activeMenu === 'profile' ? (<ProfileEdit token={token} user={user} myData={myData} setMessage={setMessage} onDone={() => window.location.reload()} onCancel={() => goMenu('dashboard')} />)
          : activeMenu === 'events' ? (<EventsPage token={token} user={user} campaigns={campaigns} setMessage={setMessage} />)
          : activeMenu === 'messages' ? (<MessagesPage token={token} user={user} setMessage={setMessage} />)
          : activeMenu === 'mentions' ? (<SocialListening token={token} user={user} myData={myData} setMessage={setMessage} onGoCandidateSetup={openCandidateSetup} />)
          : activeMenu === 'campaigns' ? (
            <div style={card}>
              <h3 style={{ marginTop: 0, color: '#0f172a' }}>My Campaigns ({filteredCampaigns.length})</h3>
              {filteredCampaigns.length === 0 ? <div style={{ textAlign: 'center', padding: 24 }}><div style={{ fontSize: 36 }}>🎯</div><p style={{ color: '#94a3b8', fontSize: 13 }}>No campaigns yet. Ask Admin to create one for you.</p></div>
              : filteredCampaigns.map((c, idx) => (
                <div key={c.id} style={{ borderBottom: '1px solid #f1f5f9', padding: '14px 0', display: 'flex', justifyContent: 'space-between' }}>
                  <div><b style={{ color: '#0f172a' }}>{c.name}</b><br /><span style={{ fontSize: 12, color: '#64748b' }}>{c.objectives || ''} | {c.startDate?.slice(0, 10)} to {c.endDate?.slice(0, 10)}</span></div>
                  <span style={{ fontSize: 12, fontWeight: 600, padding: '4px 10px', borderRadius: 99, background: c.status === 'ACTIVE' ? '#dcfce7' : '#fef9c3', color: c.status === 'ACTIVE' ? '#166534' : '#854d0e', height: 'fit-content' }}>{c.status}</span>
                </div>
              ))}
            </div>
          )
          : activeMenu === 'teams' ? (
            <div style={card}>
              <h3 style={{ marginTop: 0, color: '#0f172a' }}>My Teams ({filteredTeams.length})</h3>
              {filteredTeams.length === 0 ? <div style={{ textAlign: 'center', padding: 24 }}><div style={{ fontSize: 36 }}>👥</div><p style={{ color: '#94a3b8', fontSize: 13 }}>No teams yet.</p></div>
              : filteredTeams.map((t, idx) => (
                <div key={t.id} style={{ borderBottom: '1px solid #f1f5f9', padding: '14px 0', display: 'flex', gap: 12, alignItems: 'center' }}>
                  <div style={{ width: 40, height: 40, background: '#f1f5f9', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#0f172a', fontWeight: 700 }}>{(t.name || 'T').charAt(0).toUpperCase()}</div>
                  <div><b style={{ color: '#0f172a' }}>{t.name}</b><br /><span style={{ fontSize: 12, color: '#64748b' }}>Campaign: {t.campaign?.name || '-'} | Volunteers: {t.volunteers?.length || 0}</span></div>
                </div>
              ))}
            </div>
          )
          : activeMenu === 'volunteers' ? (
            <div style={card}>
              <h3 style={{ marginTop: 0, color: '#0f172a' }}>Volunteers ({filteredVolunteers.length})</h3>
              {filteredVolunteers.length === 0 ? <div style={{ textAlign: 'center', padding: 24 }}><div style={{ fontSize: 36 }}>🤝</div><p style={{ color: '#94a3b8', fontSize: 13 }}>No volunteers yet.</p></div>
              : filteredVolunteers.map((v, idx) => (
                <div key={v.id} style={{ borderBottom: '1px solid #f1f5f9', padding: '12px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                    <div style={{ width: 36, height: 36, background: '#f0fdf4', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, color: '#166534', fontSize: 13 }}>{(v.fullName || 'V').charAt(0).toUpperCase()}</div>
                    <div><b style={{ color: '#0f172a' }}>{v.fullName}</b> - {v.phone}<br /><span style={{ fontSize: 12, color: '#64748b' }}>Team: {v.team?.name || '-'} | {v.onboardingStatus}</span></div>
                  </div>
                  <span style={{ fontSize: 12, fontWeight: 600, padding: '4px 10px', borderRadius: 99, background: v.onboardingStatus === 'APPROVED' ? '#dcfce7' : '#fef9c3', color: v.onboardingStatus === 'APPROVED' ? '#166534' : '#854d0e' }}>{v.onboardingStatus}</span>
                </div>
              ))}
            </div>
          )
          : (<>
              {/* PROFESSIONAL WELCOME - clean, not gradient-heavy */}
              <div style={{ background: 'white', border: '1px solid #e2e8f0', padding: 22, borderRadius: 14, marginBottom: 18, display: 'flex', gap: 16, alignItems: 'flex-start', flexWrap: 'wrap' }}>
                <div style={{ width: 56, height: 56, background: '#1e40af', color: 'white', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, fontWeight: 800, flexShrink: 0 }}>{initials}</div>
                <div style={{ flex: 1, minWidth: 260 }}>
                  <h2 style={{ margin: '0 0 4px', fontSize: 22, fontWeight: 800, color: '#0f172a' }}>Welcome, {user?.fullName}</h2>
                  <p style={{ margin: 0, color: '#64748b', fontSize: 13 }}>{cand ? `${cand.positionContested || ''} • ${cand.constituency || ''}, ${cand.county || ''} • ${cand.party || ''}` : 'Candidate'} • Your campaign at a glance.</p>
                  {cand?.biography && <p style={{ margin: '10px 0 0', fontSize: 13, color: '#475569', lineHeight: 1.6, maxWidth: 620 }}>{cand.biography.slice(0, 200)}</p>}
                  <p style={{ margin: '12px 0 0', fontSize: 12, color: '#64748b' }}>{new Date().toLocaleDateString('en-KE', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })} • {campaigns.length} Campaigns • {volunteers.length} Volunteers</p>
                </div>
                <button onClick={() => goMenu('mentions')} style={{ background: '#0f172a', color: 'white', border: 'none', padding: '10px 16px', borderRadius: 8, cursor: 'pointer', fontWeight: 600, fontSize: 13 }}>👀 View Online Mentions →</button>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 14, marginBottom: 16 }}>
                {stats.map((s, i) => (
                  <div key={s.label} onClick={() => goMenu(s.menu)} style={{ background: 'white', padding: 18, borderRadius: 14, border: '1px solid #e2e8f0', cursor: 'pointer' }}>
                    <div style={{ fontSize: 22 }}>{s.icon}</div>
                    <div style={{ fontSize: 24, fontWeight: 800, margin: '10px 0 2px', color: '#0f172a' }}>{s.value}</div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: '#0f172a' }}>{s.label}</div>
                    <div style={{ fontSize: 11, color: '#94a3b8' }}>{s.sub} →</div>
                  </div>
                ))}
              </div>
              <div><AnalyticsCharts token={token} /></div>
              <div style={{ ...card, marginTop: 16 }}><h3 style={{ marginTop: 0, color: '#0f172a' }}>My Profile Summary</h3><p style={{ fontSize: 13, color: '#475569', lineHeight: 1.7 }}><b>Name:</b> {user?.fullName}<br /><b>Email:</b> {user?.email} | <b>Phone:</b> {user?.phone}<br /><b>County:</b> {user?.county} | <b>Location:</b> {user?.location || cand?.constituency || '-'}<br /><b>Bio:</b> {user?.bio || cand?.biography || 'Not set - click My Profile to add'}<br /><b>Skills:</b> {user?.skills || '-'} | <b>Education:</b> {user?.education || cand?.education || '-'}</p><button onClick={() => goMenu('profile')} style={{ background: '#1e40af', color: 'white', border: 'none', padding: '10px 18px', borderRadius: 8, cursor: 'pointer', fontWeight: '600', fontSize: 13 }}>Edit My Profile</button></div>
            </>)}
          </div>
        </div>
      </div>

      {/* HELP */}
      <div onMouseEnter={() => setHelpPaused(true)} onMouseLeave={() => setHelpPaused(false)} onClick={() => setShowHelp(true)} title="Help Centre" style={{ position: 'fixed', left: helpPos.x, top: helpPos.y, zIndex: 9999, width: 52, height: 52, background: '#0f172a', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, cursor: 'pointer', boxShadow: '0 8px 20px rgba(0,0,0,0.25)', border: '2px solid white' }}>🆘</div>
      {showHelp && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }} onClick={() => setShowHelp(false)}>
          <div style={{ background: 'white', borderRadius: 16, maxWidth: 400, width: '100%', padding: 24, position: 'relative' }} onClick={e => e.stopPropagation()}>
            <button onClick={() => setShowHelp(false)} style={{ position: 'absolute', top: 12, right: 12, background: '#f1f5f9', border: 'none', width: 30, height: 30, borderRadius: '50%', cursor: 'pointer' }}>✕</button>
            <h2 style={{ textAlign: 'center', margin: '8px 0 6px', fontWeight: 800, fontSize: 18 }}>Help Centre</h2>
            <p style={{ textAlign: 'center', color: '#64748b', fontSize: 13 }}>Your campaign, your vision.</p>
            <button onClick={() => { setShowHelp(false); goMenu('campaigns') }} style={{ width: '100%', padding: 12, background: '#1e40af', color: 'white', border: 'none', borderRadius: 10, cursor: 'pointer', fontWeight: 700, marginTop: 10, fontSize: 13 }}>View My Campaigns →</button>
            <button onClick={() => { setShowHelp(false); goMenu('messages') }} style={{ width: '100%', padding: 12, background: '#f8fafc', border: '1px solid #e2e8f0', color: '#0f172a', borderRadius: 10, cursor: 'pointer', fontWeight: 700, marginTop: 8, fontSize: 13 }}>Message My Manager</button>
            <button onClick={() => { setShowHelp(false); goMenu('mentions') }} style={{ width: '100%', padding: 12, background: '#f8fafc', border: '1px solid #e2e8f0', color: '#0f172a', borderRadius: 10, cursor: 'pointer', fontWeight: 700, marginTop: 8, fontSize: 13 }}>See What People Say About Me</button>
            <button onClick={() => { setShowHelp(false); openCandidateSetup() }} style={{ width: '100%', padding: 12, background: '#0f172a', color: 'white', border: 'none', borderRadius: 10, cursor: 'pointer', fontWeight: 700, marginTop: 8, fontSize: 13 }}>Set Up Candidate & Keywords</button>
          </div>
        </div>
      )}

      <style>{`
        @keyframes tabIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
        @keyframes tabOut{from{opacity:1;transform:translateY(0)}to{opacity:0;transform:translateY(-6px)}}
      `}</style>
    </div>
  )
}