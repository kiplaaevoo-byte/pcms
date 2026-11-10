import { useState, useEffect, useRef } from 'react'
import ProfileEdit from './ProfileEdit'
import EventsPage from './EventsPage'
import MessagesPage from './MessagesPage'
import NotificationBell from '../components/NotificationBell'
import AnalyticsCharts from '../components/AnalyticsCharts'

export default function VolunteerDashboard({ token, user, myData, onLogout, setMessage }) {
  const [activeMenu, setActiveMenu] = useState('dashboard')
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [search, setSearch] = useState('')
  const [tabAnim, setTabAnim] = useState('tabIn')
  const [isMobile, setIsMobile] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)

  // ===== SLOW FLYING HELP 🆘 - SLOW 0.5 =====
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

  const vol = myData?.myVolunteer
  const teams = myData?.myTeams || []
  const campaigns = myData?.myCampaigns || []
  const initials = (user?.fullName || 'V').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()

  const goMenu = (id) => { setTabAnim('tabOut'); setTimeout(() => { setActiveMenu(id); setSearch(''); setTabAnim('tabIn') }, 120); setMobileOpen(false) }

  const menu = [
    { id: 'dashboard', label: 'Dashboard', icon: '📊', badge: null },
    { id: 'profile', label: 'My Profile', icon: '👤', badge: null },
    { id: 'team', label: 'My Team', icon: '👥', badge: teams.length },
    { id: 'campaigns', label: 'Campaigns', icon: '🎯', badge: campaigns.length },
    { id: 'events', label: 'Events', icon: '📅', badge: null },
    { id: 'messages', label: 'Messages', icon: '✉️', badge: null },
  ]

  const filteredTeams = teams.filter(t => (t.name || '').toLowerCase().includes(search.toLowerCase()))
  const filteredCampaigns = campaigns.filter(c => (c.name || '').toLowerCase().includes(search.toLowerCase()))

  const isApproved = vol?.onboardingStatus === 'APPROVED'
  const stats = [
    { label: 'My Team', value: teams[0]?.name ? teams[0].name.split(' ')[0] : 'None', icon: '👥', bg: 'linear-gradient(135deg,#16a34a,#15803d)', sub: teams[0]?.name || 'Not assigned', menu: 'team', isText: true },
    { label: 'Campaigns', value: campaigns.length, icon: '🎯', bg: 'linear-gradient(135deg,#2563eb,#1d4ed8)', sub: 'You support', menu: 'campaigns' },
    { label: 'Status', value: vol?.onboardingStatus || 'PENDING', icon: isApproved ? '✅' : '⏳', bg: isApproved ? 'linear-gradient(135deg,#16a34a,#15803d)' : 'linear-gradient(135deg,#f59e0b,#d97706)', sub: isApproved ? 'You are approved!' : 'Waiting approval', menu: 'team', isText: true },
    { label: 'Events', value: '📅', icon: '📅', bg: 'linear-gradient(135deg,#7c3aed,#6d28d9)', sub: 'Join events', menu: 'events' },
  ]

  const card = { background: 'white', padding: 20, borderRadius: 16, boxShadow: '0 2px 12px rgba(0,0,0,0.05)', border: '1px solid #dcfce7' }
  const sidebarContent = (
    <>
      <div style={{ padding: 16, display: 'flex', gap: 10, alignItems: 'center' }}>
        <div style={{ width: 44, height: 44, background: 'white', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, flexShrink: 0, animation: 'bounce 2s ease-in-out infinite' }}>🗳️</div>
        {sidebarOpen && <div><div style={{ fontSize: 22, fontWeight: 900 }}>PCMS</div><div style={{ fontSize: 10, color: '#bbf7d0', letterSpacing: 0.5 }}>Volunteer • Green</div></div>}
      </div>
      {sidebarOpen && (
        <div style={{ margin: '0 14px 14px', background: 'rgba(255,255,255,0.15)', borderRadius: 12, padding: '11px 12px', display: 'flex', gap: 10, alignItems: 'center', animation: 'fadeIn 0.4s ease' }}>
          <div style={{ width: 36, height: 36, background: 'white', color: '#15803d', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: 13 }}>{initials}</div>
          <div style={{ minWidth: 0 }}><div style={{ fontSize: 13, fontWeight: 800, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{user?.fullName}</div><div style={{ fontSize: 11, color: '#bbf7d0' }}>Volunteer • {user?.county || 'Kenya'} • {vol?.onboardingStatus || 'PENDING'}</div></div>
        </div>
      )}
      <div style={{ padding: '0 10px 10px', display: 'flex', justifyContent: 'flex-end' }}><button onClick={() => setSidebarOpen(!sidebarOpen)} style={{ background: '#166534', color: 'white', border: 'none', borderRadius: 8, padding: '6px 10px', cursor: 'pointer' }}>{sidebarOpen ? '◀ Collapse' : '▶'}</button></div>
      <div style={{ padding: '0 10px', flex: 1 }}>{menu.map((m, i) => (
        <button key={m.id} onClick={() => goMenu(m.id)} style={{ width: '100%', textAlign: 'left', padding: sidebarOpen ? '12px 14px' : '12px 0', borderRadius: 12, border: 'none', cursor: 'pointer', background: activeMenu === m.id ? 'linear-gradient(90deg,#22c55e,#16a34a)' : 'transparent', color: 'white', fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: sidebarOpen ? 'flex-start' : 'center', gap: 10, fontWeight: activeMenu === m.id ? '800' : '500', boxShadow: activeMenu === m.id ? '0 4px 14px rgba(34,197,94,0.4)' : 'none', transition: 'all 0.25s', animation: `fadeInLeft ${0.1 + i * 0.04}s ease` }}
          onMouseEnter={e => { if (activeMenu !== m.id) e.currentTarget.style.background = 'rgba(255,255,255,0.12)'; e.currentTarget.style.transform = 'translateX(4px)' }}
          onMouseLeave={e => { if (activeMenu !== m.id) e.currentTarget.style.background = 'transparent'; e.currentTarget.style.transform = 'translateX(0)' }}>
          <span style={{ fontSize: 18 }}>{m.icon}</span>{sidebarOpen && <span style={{ flex: 1 }}>{m.label}</span>}
          {sidebarOpen && m.badge !== null && m.badge > 0 && <span style={{ background: 'white', color: '#16a34a', fontSize: 11, fontWeight: 800, padding: '2px 7px', borderRadius: 99 }}>{m.badge}</span>}
        </button>
      ))}</div>
      <div style={{ padding: 12 }}>
        <button onClick={() => setShowHelp(true)} style={{ width: '100%', background: 'white', color: '#15803d', border: 'none', padding: 11, borderRadius: 12, cursor: 'pointer', fontWeight: '800', marginBottom: 8 }}>🆘 {sidebarOpen && 'Help Centre'}</button>
        <button onClick={onLogout} style={{ width: '100%', background: '#dc2626', color: 'white', border: 'none', padding: 12, borderRadius: 12, cursor: 'pointer', fontWeight: '800' }}>{sidebarOpen ? '← Logout' : '←'}</button>
        {sidebarOpen && <div style={{ textAlign: 'center', marginTop: 12, fontSize: 12, opacity: 0.9 }}>🇰🇪 <b>Thank You for Serving</b></div>}
      </div>
    </>
  )

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#f0fdf4', fontFamily: "'Inter', system-ui, sans-serif" }}>
      {!isMobile && <div style={{ width: sidebarOpen ? 260 : 72, background: 'linear-gradient(180deg,#15803d,#22c55e)', color: 'white', display: 'flex', flexDirection: 'column', flexShrink: 0, position: 'sticky', top: 0, height: '100vh', transition: 'width 0.3s', overflow: 'hidden', boxShadow: '4px 0 20px rgba(0,0,0,0.08)' }}>{sidebarContent}</div>}
      {isMobile && mobileOpen && (
        <>
          <div onClick={() => setMobileOpen(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 40 }} />
          <div style={{ position: 'fixed', left: 0, top: 0, bottom: 0, width: 260, background: 'linear-gradient(180deg,#15803d,#22c55e)', color: 'white', display: 'flex', flexDirection: 'column', zIndex: 50, animation: 'slideInLeft 0.3s ease' }}>{sidebarContent}</div>
        </>
      )}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        <div style={{ background: 'rgba(255,255,255,0.95)', backdropFilter: 'blur(10px)', padding: '12px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #dcfce7', position: 'sticky', top: 0, zIndex: 10 }}>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <button onClick={() => isMobile ? setMobileOpen(!mobileOpen) : setSidebarOpen(!sidebarOpen)} style={{ background: '#15803d', color: 'white', border: 'none', borderRadius: 10, padding: '9px 12px', cursor: 'pointer' }}>☰</button>
            <b style={{ color: '#15803d', fontSize: 17 }}>Volunteer Dashboard <span style={{ fontWeight: 400, fontSize: 12, color: '#94a3b8' }}>• {teams[0]?.name || user?.county || 'Kenya'}</span></b>
          </div>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            {!isMobile && <div style={{ position: 'relative' }}><span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)' }}>🔍</span><input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search teams, campaigns..." style={{ padding: '9px 12px 9px 32px', borderRadius: 99, border: '1px solid #bbf7d0', background: '#f0fdf4', outline: 'none', fontSize: 13, width: 210 }} /></div>}
            <span style={{ fontSize: 13, display: isMobile ? 'none' : 'block', fontWeight: 600 }}>Hi, {user?.fullName} ({user?.userId})</span>
            <NotificationBell token={token} onGoMessages={() => goMenu('messages')} />
            {user?.photo ? <img src={user.photo} style={{ width: 36, height: 36, borderRadius: '50%', objectFit: 'cover', border: '2px solid #bbf7d0' }} /> : <div style={{ width: 36, height: 36, borderRadius: '50%', background: '#15803d', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: 12 }}>{initials}</div>}
            <button onClick={onLogout} style={{ background: '#ef4444', color: 'white', border: 'none', padding: '9px 14px', borderRadius: 10, cursor: 'pointer', fontWeight: 700 }}>Logout</button>
          </div>
        </div>

        <div style={{ padding: isMobile ? 12 : 20, maxWidth: 1100, margin: '0 auto', width: '100%', boxSizing: 'border-box' }}>
          <div key={activeMenu} style={{ animation: tabAnim === 'tabIn' ? 'tabIn 0.35s ease' : 'tabOut 0.12s ease' }}>
          {activeMenu === 'profile' ? (<ProfileEdit token={token} user={user} myData={myData} setMessage={setMessage} onDone={() => window.location.reload()} onCancel={() => goMenu('dashboard')} />)
          : activeMenu === 'events' ? (<EventsPage token={token} user={user} campaigns={campaigns} setMessage={setMessage} />)
          : activeMenu === 'messages' ? (<MessagesPage token={token} user={user} setMessage={setMessage} />)
          : activeMenu === 'team' ? (
            <div style={card}>
              <h3 style={{ marginTop: 0 }}>👥 My Team</h3>
              {filteredTeams.length === 0 ? <div style={{ textAlign: 'center', padding: 24 }}><div style={{ fontSize: 40 }}>👥</div><p style={{ color: '#94a3b8' }}>Not assigned to a team yet. Ask your Team Leader.</p></div>
              : filteredTeams.map((t, idx) => (
                <div key={t.id} style={{ borderBottom: '1px solid #f0fdf4', padding: '14px 0', display: 'flex', gap: 12, alignItems: 'center', animation: `fadeIn ${0.1 + idx * 0.05}s ease` }}>
                  <div style={{ width: 44, height: 44, background: 'linear-gradient(135deg,#16a34a,#15803d)', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 900 }}>{(t.name || 'T').charAt(0).toUpperCase()}</div>
                  <div><b>{t.name}</b><br /><span style={{ fontSize: 12, color: '#64748b' }}>Campaign: {t.campaign?.name || '-'} | Status in team: {vol?.onboardingStatus || 'PENDING'}</span></div>
                </div>
              ))}
              <div style={{ marginTop: 14, background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 12, padding: '12px 14px', fontSize: 13, lineHeight: 1.6 }}>
                Your onboarding: <b style={{ color: isApproved ? '#166534' : '#854d0e' }}>{vol?.onboardingStatus || 'PENDING'}</b> | Consent: <b>{vol?.consentRecord ? '✅ Yes' : '❌ No'}</b><br />
                {isApproved ? '🎉 You are approved! You can join events and help your team.' : '⏳ Your Team Leader / Admin will approve you soon. Complete your profile to speed it up.'}
              </div>
              {!isApproved && <button onClick={() => goMenu('profile')} style={{ marginTop: 12, background: '#16a34a', color: 'white', border: 'none', padding: '10px 18px', borderRadius: 10, cursor: 'pointer', fontWeight: 800 }}>✏️ Complete My Profile →</button>}
            </div>
          )
          : activeMenu === 'campaigns' ? (
            <div style={card}>
              <h3 style={{ marginTop: 0 }}>🎯 Campaigns ({filteredCampaigns.length})</h3>
              {filteredCampaigns.length === 0 ? <div style={{ textAlign: 'center', padding: 24 }}><div style={{ fontSize: 40 }}>🎯</div><p style={{ color: '#94a3b8' }}>No campaigns yet.</p></div>
              : filteredCampaigns.map((c, idx) => (
                <div key={c.id} style={{ borderBottom: '1px solid #f0fdf4', padding: '14px 0', display: 'flex', justifyContent: 'space-between', animation: `fadeIn ${0.1 + idx * 0.05}s ease` }}>
                  <div><b>{c.name}</b><br /><span style={{ fontSize: 12, color: '#64748b' }}>{c.candidate?.fullName || ''} | {c.objectives || ''}</span></div>
                  <span style={{ fontSize: 12, fontWeight: 700, padding: '4px 10px', borderRadius: 99, background: c.status === 'ACTIVE' ? '#dcfce7' : '#fef9c3', color: c.status === 'ACTIVE' ? '#166534' : '#854d0e', height: 'fit-content' }}>{c.status}</span>
                </div>
              ))}
            </div>
          )
          : (<>
              <div style={{ background: 'linear-gradient(135deg,#15803d,#22c55e,#4ade80)', color: 'white', padding: 24, borderRadius: 18, marginBottom: 16, position: 'relative', overflow: 'hidden', animation: 'slideUp 0.4s ease' }}>
                <div style={{ position: 'absolute', width: 160, height: 160, background: 'rgba(255,255,255,0.14)', borderRadius: '50%', right: -40, top: -40 }} />
                <div style={{ position: 'relative' }}>
                  <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start', flexWrap: 'wrap' }}>
                    <div style={{ width: 64, height: 64, background: 'white', color: '#15803d', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26, fontWeight: 900, flexShrink: 0 }}>{initials}</div>
                    <div><h2 style={{ margin: '0 0 6px', fontSize: 26, fontWeight: 900 }}>Welcome, {user?.fullName}! 🙏</h2><p style={{ margin: 0, opacity: 0.95 }}>Volunteer • {user?.county || ''} | Team: {teams[0]?.name || 'Not assigned yet'} | Status: <b>{vol?.onboardingStatus || 'PENDING'}</b></p>{user?.bio && <p style={{ margin: '10px 0 0', fontSize: 13, opacity: 0.9 }}>“{user.bio.slice(0, 200)}”</p>}</div>
                  </div>
                  <p style={{ margin: '14px 0 0', fontSize: 12, background: 'rgba(255,255,255,0.22)', display: 'inline-block', padding: '6px 12px', borderRadius: 99 }}>📅 {new Date().toLocaleDateString('en-KE', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })} • {isApproved ? '✅ Approved - Ready to serve!' : '⏳ Pending Approval'} • Thank you for serving 🇰🇪</p>
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 14, marginBottom: 16 }}>
                {stats.map((s, i) => (
                  <div key={s.label} onClick={() => goMenu(s.menu)} style={{ background: 'white', padding: 18, borderRadius: 16, boxShadow: '0 2px 12px rgba(0,0,0,0.05)', cursor: 'pointer', transition: 'all 0.25s', animation: `slideUp ${0.2 + i * 0.07}s ease` }}
                    onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-5px)'; e.currentTarget.style.boxShadow = '0 12px 24px rgba(0,0,0,0.1)' }}
                    onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 2px 12px rgba(0,0,0,0.05)' }}>
                    <div style={{ width: 44, height: 44, background: s.bg, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22 }}>{s.icon}</div>
                    <div style={{ fontSize: s.isText ? 16 : 26, fontWeight: 900, margin: '10px 0 2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{s.value}</div>
                    <div style={{ fontSize: 13, fontWeight: 700 }}>{s.label}</div>
                    <div style={{ fontSize: 11, color: '#94a3b8' }}>{s.sub} →</div>
                  </div>
                ))}
              </div>
              <div style={{ animation: 'fadeIn 0.5s ease' }}><AnalyticsCharts token={token} /></div>
              <div style={{ ...card, marginTop: 16 }}><h3 style={{ marginTop: 0 }}>📋 My Volunteer Profile</h3><p style={{ fontSize: 14, color: '#475569', lineHeight: 1.7 }}><b>Skills:</b> {user?.skills || 'Not set'}<br /><b>Languages:</b> {user?.languages || '-'} | <b>Certifications:</b> {user?.certifications || '-'}<br /><b>Interests:</b> {user?.interests || '-'}<br /><b>Availability:</b> {user?.availability || '-'} | <b>T-Shirt:</b> {user?.tshirtSize || '-'}<br /><b>Emergency:</b> {user?.emergencyContact || '-'} - {user?.emergencyPhone || '-'}</p><button onClick={() => goMenu('profile')} style={{ background: 'linear-gradient(90deg,#16a34a,#15803d)', color: 'white', border: 'none', padding: '11px 20px', borderRadius: 10, cursor: 'pointer', fontWeight: '800' }}>✏️ Edit My Profile - Add Skills, Availability, T-Shirt</button></div>
            </>)}
          </div>
        </div>
      </div>

      {/* SLOW FLYING HELP */}
      <div onMouseEnter={() => setHelpPaused(true)} onMouseLeave={() => setHelpPaused(false)} onClick={() => setShowHelp(true)} title="Help Centre - Click for help" style={{ position: 'fixed', left: helpPos.x, top: helpPos.y, zIndex: 9999, width: 58, height: 58, background: 'linear-gradient(135deg,#f59e0b,#f97316,#dc2626)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26, cursor: 'pointer', boxShadow: '0 10px 26px rgba(249,115,22,0.45)', animation: 'helpPulseSlow 3s ease-in-out infinite', border: '3px solid white' }}>🆘<span style={{ position: 'absolute', top: -4, right: -4, width: 17, height: 17, background: '#dc2626', color: 'white', borderRadius: '50%', fontSize: 11, fontWeight: 900, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid white' }}>!</span></div>
      {showHelp && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, animation: 'fadeIn 0.25s ease' }} onClick={() => setShowHelp(false)}>
          <div style={{ background: 'white', borderRadius: 24, maxWidth: 420, width: '100%', padding: 26, position: 'relative', animation: 'pop 0.3s ease' }} onClick={e => e.stopPropagation()}>
            <button onClick={() => setShowHelp(false)} style={{ position: 'absolute', top: 14, right: 14, background: '#f1f5f9', border: 'none', width: 32, height: 32, borderRadius: '50%', cursor: 'pointer' }}>✕</button>
            <div style={{ width: 68, height: 68, background: 'linear-gradient(135deg,#f59e0b,#f97316)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 34, margin: '0 auto' }}>🆘</div>
            <h2 style={{ textAlign: 'center', margin: '12px 0 6px', fontWeight: 900 }}>Help Centre - Volunteer</h2>
            <p style={{ textAlign: 'center', color: '#64748b', fontSize: 13 }}>Thank you for serving! Your Team Leader is here to help.</p>
            <button onClick={() => { setShowHelp(false); goMenu('team') }} style={{ width: '100%', padding: 13, background: 'linear-gradient(90deg,#16a34a,#15803d)', color: 'white', border: 'none', borderRadius: 12, cursor: 'pointer', fontWeight: 800, marginTop: 10 }}>👥 View My Team →</button>
            <button onClick={() => { setShowHelp(false); goMenu('messages') }} style={{ width: '100%', padding: 13, background: '#eff6ff', border: '1px solid #bfdbfe', color: '#1e40af', borderRadius: 12, cursor: 'pointer', fontWeight: 800, marginTop: 8 }}>💬 Message Team Leader</button>
            <button onClick={() => { setShowHelp(false); goMenu('profile') }} style={{ width: '100%', padding: 13, background: '#fef3c7', border: '1px solid #fde68a', color: '#92400e', borderRadius: 12, cursor: 'pointer', fontWeight: 800, marginTop: 8 }}>✏️ Complete My Profile - Get Approved Faster</button>
            <p style={{ textAlign: 'center', fontSize: 11, color: '#94a3b8', margin: '12px 0 0' }}>PCMS Help • Volunteer Support 🇰🇪</p>
          </div>
        </div>
      )}

      <style>{`
        @keyframes tabIn{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}
        @keyframes tabOut{from{opacity:1;transform:translateY(0)}to{opacity:0;transform:translateY(-8px)}}
        @keyframes slideUp{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}
        @keyframes fadeIn{from{opacity:0}to{opacity:1}}
        @keyframes fadeInLeft{from{opacity:0;transform:translateX(-12px)}to{opacity:1;transform:translateX(0)}}
        @keyframes slideInLeft{from{transform:translateX(-100%)}to{transform:translateX(0)}}
        @keyframes bounce{0%,100%{transform:translateY(0)}50%{transform:translateY(-4px)}}
        @keyframes pop{0%{transform:scale(0.9);opacity:0}100%{transform:scale(1);opacity:1}}
        @keyframes helpPulseSlow{0%,100%{transform:scale(1)}50%{transform:scale(1.07)}}
      `}</style>
    </div>
  )
}