import React, { useState, useEffect, useRef } from 'react'

export default function Landing({ onLoginClick, onGetStarted }) {
  const blue = '#2563eb'
  const darkBlue = '#0a2463'
  const goLogin = onLoginClick || (() => {})
  const goStart = onGetStarted || (() => {})
  const [openFaq, setOpenFaq] = useState(null)
  const [count, setCount] = useState({ counties: 0, constituencies: 0, wards: 0, volunteers: 0 })
  const [scrolled, setScrolled] = useState(false)
  const [visible, setVisible] = useState({})

  // Sticky nav shadow on scroll
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10)
    window.addEventListener('scroll', onScroll)
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  // Animated counters
  useEffect(() => {
    const t = setInterval(() => {
      setCount(c => ({
        counties: Math.min(47, c.counties + 2),
        constituencies: Math.min(290, c.constituencies + 12),
        wards: Math.min(1450, c.wards + 60),
        volunteers: Math.min(12480, c.volunteers + 520),
      }))
    }, 30)
    return () => clearInterval(t)
  }, [])

  // Scroll reveal - simple
  const reveal = (id) => (el) => {
    if (!el) return
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) setVisible(v => ({ ...v, [id]: true })) }, { threshold: 0.15 })
    obs.observe(el)
  }

  const scrollTo = (id) => {
    const el = document.getElementById(id)
    if (el) el.scrollIntoView({ behavior: 'smooth' })
  }

  const sectionTitle = (t, sub) => (
    <div style={{ textAlign: 'center', marginBottom: 28 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, justifyContent: 'center', marginBottom: 10 }}>
        <div style={{ height: 2, width: 40, background: blue, borderRadius: 99 }} />
        <span style={{ fontSize: 12, fontWeight: 800, color: blue, letterSpacing: 2, textTransform: 'uppercase' }}>PCMS • Kenya</span>
        <div style={{ height: 2, width: 40, background: blue, borderRadius: 99 }} />
      </div>
      <h2 style={{ margin: 0, fontSize: 28, fontWeight: 900, color: '#0f172a' }}>{t}</h2>
      {sub && <p style={{ color: '#64748b', fontSize: 14, margin: '8px 0 0' }}>{sub}</p>}
    </div>
  )

  const faqs = [
    { q: 'Is my candidate data private?', a: 'Yes. 100% data isolation. Each candidate sees ONLY their own data. Admin cannot see other campaigns unless assigned. Your strategy stays yours.' },
    { q: 'Can I use it for 2027 elections?', a: 'Yes! PCMS is built for 2027 - Governor, Senator, MP, MCA, Women Rep, President. Plan now, win in 2027.' },
    { q: 'Does it work on phone?', a: 'Yes. 100% mobile responsive. Works on Android, iPhone, tablet and desktop. Invite volunteers via WhatsApp in 1 tap.' },
    { q: 'How do I add volunteers?', a: 'Go to Dashboard → Invite via WhatsApp / SMS → Enter phone → Send. They register in 1 minute. You approve them. Done.' },
    { q: 'Can I get a demo?', a: 'Yes. Click Get Started Free, create an account, and Admin will approve you. You can explore Dashboard immediately.' },
  ]

  return (
    <div style={{ fontFamily: "'Inter', system-ui, -apple-system, sans-serif", background: 'white', color: '#0f172a', overflowX: 'hidden' }}>
      {/* NAVBAR */}
      <header style={{ background: scrolled ? 'rgba(255,255,255,0.95)' : 'white', backdropFilter: 'blur(10px)', padding: '12px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: 0, zIndex: 20, boxShadow: scrolled ? '0 4px 20px rgba(0,0,0,0.08)' : '0 1px 5px rgba(0,0,0,0.05)', flexWrap: 'wrap', gap: 10, transition: 'all 0.3s' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }} onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
          <div style={{ width: 42, height: 42, background: 'linear-gradient(135deg,#0a2463,#2563eb)', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, animation: 'bounce 2s ease-in-out infinite' }}>🗳️</div>
          <div><h1 style={{ margin: 0, fontSize: 24, color: darkBlue, lineHeight: 1, fontWeight: 900 }}>PCMS</h1><p style={{ margin: 0, fontSize: 10, color: '#475569', fontWeight: 700, letterSpacing: 0.5 }}>Plan. Organize. Win.</p></div>
        </div>
        <div style={{ display: 'flex', gap: 22, fontSize: 14, fontWeight: 600, color: '#334155' }} className="nav-links">
          <span style={{ cursor: 'pointer' }} onClick={() => scrollTo('features')}>Features</span>
          <span style={{ cursor: 'pointer' }} onClick={() => scrollTo('how')}>How It Works</span>
          <span style={{ cursor: 'pointer' }} onClick={() => scrollTo('candidates')}>Candidates</span>
          <span style={{ cursor: 'pointer' }} onClick={() => scrollTo('pricing')}>Pricing / FAQ</span>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={goLogin} style={{ padding: '9px 20px', background: 'white', border: `2px solid ${blue}`, color: blue, borderRadius: 99, cursor: 'pointer', fontWeight: 800, transition: 'all 0.2s' }} onMouseEnter={e => e.target.style.background = '#eff6ff'} onMouseLeave={e => e.target.style.background = 'white'}>Login</button>
          <button onClick={goStart} style={{ padding: '9px 20px', background: 'linear-gradient(90deg,#2563eb,#1d4ed8)', color: 'white', border: 'none', borderRadius: 99, cursor: 'pointer', fontWeight: 800, boxShadow: '0 4px 14px rgba(37,99,235,0.35)', transition: 'all 0.2s' }} onMouseEnter={e => e.target.style.transform = 'translateY(-2px)'} onMouseLeave={e => e.target.style.transform = 'translateY(0)'}>Get Started →</button>
        </div>
      </header>

      {/* HERO */}
      <div style={{ background: 'linear-gradient(135deg,#dbeafe 0%, #eff6ff 40%, white 100%)', padding: '32px 24px 40px', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', width: 300, height: 300, background: 'radial-gradient(circle, rgba(37,99,235,0.15), transparent)', borderRadius: '50%', top: -80, right: -80, animation: 'float 6s ease-in-out infinite' }} />
        <div style={{ position: 'absolute', width: 180, height: 180, background: 'radial-gradient(circle, rgba(250,204,21,0.25), transparent)', borderRadius: '50%', bottom: 0, left: -60, animation: 'float 7s ease-in-out infinite reverse' }} />
        <div style={{ maxWidth: 1200, margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 28, alignItems: 'center', position: 'relative' }}>
          <div style={{ animation: 'fadeInLeft 0.7s ease' }}>
            <span style={{ background: 'white', padding: '7px 14px', borderRadius: 99, fontSize: 12, fontWeight: 800, boxShadow: '0 2px 10px rgba(0,0,0,0.08)', display: 'inline-flex', gap: 6, alignItems: 'center' }}><span style={{ width: 8, height: 8, background: '#16a34a', borderRadius: '50%', animation: 'pulse 1.5s infinite' }} /> 🇰🇪 Built for Kenyan Campaigns • 2027 Elections</span>
            <h1 style={{ fontSize: 46, lineHeight: 1.05, margin: '18px 0 12px', fontWeight: 900 }}>Win Your Campaign<br />With <span style={{ background: 'linear-gradient(90deg,#2563eb,#f97316)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Data,</span><br />Not Guesswork.</h1>
            <p style={{ color: '#475569', fontSize: 16, margin: '0 0 20px', lineHeight: 1.6 }}>Candidates, Campaigns, Teams, Volunteers in one secure place. Stop Excel chaos. Start winning.</p>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <button onClick={goStart} style={{ padding: '13px 24px', background: 'linear-gradient(90deg,#2563eb,#1d4ed8)', color: 'white', border: 'none', borderRadius: 99, cursor: 'pointer', fontWeight: 800, boxShadow: '0 8px 20px rgba(37,99,235,0.35)', transition: 'all 0.2s' }} onMouseEnter={e => e.target.style.transform = 'translateY(-2px)'} onMouseLeave={e => e.target.style.transform = 'translateY(0)'}>Get Started Free →</button>
              <button onClick={goLogin} style={{ padding: '13px 24px', background: 'white', border: '2px solid #e2e8f0', borderRadius: 99, cursor: 'pointer', fontWeight: 800, transition: 'all 0.2s' }} onMouseEnter={e => e.target.style.border = '2px solid #2563eb'} onMouseLeave={e => e.target.style.border = '2px solid #e2e8f0'}>Login to Dashboard</button>
            </div>
            <div style={{ display: 'flex', gap: 16, marginTop: 18, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 13, fontWeight: 600 }}>⭐⭐⭐⭐⭐ <b>4.9/5</b> <span style={{ color: '#64748b', fontWeight: 400 }}>• 200+ campaigns</span></span>
              <span style={{ fontSize: 13, color: '#64748b' }}>✅ Free to start • No card needed</span>
            </div>
            <p style={{ fontSize: 13, margin: '12px 0 0', color: '#64748b' }}>✅ Trusted by teams in <b style={{ color: '#0f172a' }}>Nairobi, Bomet, Kisumu, Mombasa...</b></p>
          </div>

          {/* LAPTOP MOCKUP - Animated */}
          <div style={{ background: '#0f172a', borderRadius: 16, padding: 6, boxShadow: '0 24px 50px rgba(0,0,0,0.3)', border: '4px solid #1e293b', animation: 'float 5s ease-in-out infinite' }}>
            <div style={{ background: 'white', borderRadius: 10, overflow: 'hidden', display: 'flex' }}>
              <div style={{ background: darkBlue, color: 'white', padding: 12, width: 100, fontSize: 11, flexShrink: 0 }}>
                <p style={{ fontWeight: 900, margin: '0 0 12px' }}>🗳️ PCMS</p>
                <p style={{ background: 'rgba(255,255,255,0.15)', padding: '6px 8px', borderRadius: 8 }}>📊 Dashboard</p><p>👤 Candidates</p><p>📢 Campaigns</p><p>👥 Teams</p><p>🙋 Volunteers</p><p>📈 Reports</p><p>⚙️ Settings</p>
              </div>
              <div style={{ flex: 1, padding: 12, minWidth: 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}><b>Dashboard</b><span style={{ fontSize: 12, background: '#f0fdf4', color: '#166534', padding: '4px 8px', borderRadius: 99, fontWeight: 700 }}>● Live</span></div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, margin: '12px 0' }}>
                  <div style={{ background: 'linear-gradient(135deg,#2563eb,#1d4ed8)', color: 'white', padding: 10, borderRadius: 10, textAlign: 'center' }}><b style={{ fontSize: 18 }}>{count.counties}</b><p style={{ margin: 0, fontSize: 10 }}>Counties</p></div>
                  <div style={{ background: 'linear-gradient(135deg,#16a34a,#15803d)', color: 'white', padding: 10, borderRadius: 10, textAlign: 'center' }}><b style={{ fontSize: 18 }}>{count.constituencies}</b><p style={{ margin: 0, fontSize: 10 }}>Constituencies</p></div>
                  <div style={{ background: 'linear-gradient(135deg,#f59e0b,#d97706)', color: 'white', padding: 10, borderRadius: 10, textAlign: 'center' }}><b style={{ fontSize: 18 }}>{count.wards.toLocaleString()}</b><p style={{ margin: 0, fontSize: 10 }}>Wards</p></div>
                  <div style={{ background: 'linear-gradient(135deg,#a855f7,#7c3aed)', color: 'white', padding: 10, borderRadius: 10, textAlign: 'center' }}><b style={{ fontSize: 18 }}>{count.volunteers.toLocaleString()}</b><p style={{ margin: 0, fontSize: 10 }}>Volunteers</p></div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: 10 }}>
                  <div style={{ background: '#f8fafc', padding: 10, borderRadius: 10 }}><b style={{ fontSize: 12 }}>Campaign Overview</b><p style={{ fontSize: 20, margin: '8px 0 0' }}>📈 ↗️ ↗️ ↗️</p><p style={{ fontSize: 10, color: '#16a34a', margin: 0, fontWeight: 700 }}>+24% growth this month</p></div>
                  <div style={{ background: '#f8fafc', padding: 10, borderRadius: 10 }}><b style={{ fontSize: 12 }}>Top Counties</b><p style={{ fontSize: 11, margin: '6px 0 2px' }}>Nairobi — 18% <span style={{ background: '#2563eb', display: 'inline-block', width: 30, height: 6, borderRadius: 99 }} /></p><p style={{ fontSize: 11, margin: '2px 0' }}>Bomet — 16%</p><p style={{ fontSize: 11, margin: '2px 0' }}>Kisumu — 14%</p></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* STATS BAR - Animated Counters */}
      <div style={{ background: 'linear-gradient(90deg,#0a2463,#1d4ed8)', color: 'white', padding: '16px 24px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', textAlign: 'center', gap: 10 }}>
        <div style={{ animation: 'fadeIn 0.5s ease' }}>📍 <b style={{ fontSize: 18 }}>{count.counties}</b> <span style={{ fontSize: 13, opacity: 0.9 }}>Counties</span></div>
        <div>🏛️ <b style={{ fontSize: 18 }}>{count.constituencies}</b> <span style={{ fontSize: 13, opacity: 0.9 }}>Constituencies</span></div>
        <div>👥 <b style={{ fontSize: 18 }}>{count.wards.toLocaleString()}</b> <span style={{ fontSize: 13, opacity: 0.9 }}>Wards</span></div>
        <div>✅ <b style={{ fontSize: 18 }}>100%</b> <span style={{ fontSize: 13, opacity: 0.9 }}>Data Isolation</span></div>
      </div>

      {/* PROBLEM */}
      <div ref={reveal('problem')} style={{ maxWidth: 1200, margin: '0 auto', padding: '32px 24px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 20, alignItems: 'center', opacity: visible.problem ? 1 : 0, transform: visible.problem ? 'translateY(0)' : 'translateY(20px)', transition: 'all 0.6s' }}>
        <div><h2 style={{ fontSize: 28, margin: 0, lineHeight: 1.2, fontWeight: 900 }}>Still using<br /><span style={{ color: blue }}>Excel + WhatsApp groups?</span></h2><p style={{ color: '#64748b', fontSize: 14, lineHeight: 1.6 }}>Stop the chaos. Get a smarter way to manage your campaign - all in one place, secure, and on your phone.</p><button onClick={goStart} style={{ marginTop: 10, padding: '10px 18px', background: blue, color: 'white', border: 'none', borderRadius: 99, cursor: 'pointer', fontWeight: 800 }}>Fix It Now →</button></div>
        <div style={{ display: 'flex', gap: 20, justifyContent: 'center' }}>
          {[
            ['⚠️', 'Lost', 'volunteers'],
            ['🔍', 'No', 'tracking'],
            ['🔒', 'Leaked', 'data'],
          ].map(([icon, a, b]) => (
            <div key={a} style={{ textAlign: 'center', background: '#fef2f2', padding: 14, borderRadius: 14, minWidth: 90, transition: 'all 0.2s' }} onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-4px)'} onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}><div style={{ fontSize: 32 }}>{icon}</div><p style={{ fontSize: 12, fontWeight: 800, margin: '4px 0 0' }}>{a}<br />{b}</p></div>
          ))}
        </div>
        <div style={{ background: 'linear-gradient(135deg,#fef3c7,#fde68a)', borderRadius: 16, padding: 16, textAlign: 'center', fontSize: 48, animation: 'bounce 2s ease-in-out infinite' }}>😩<p style={{ fontSize: 12, fontWeight: 800, margin: '8px 0 0', color: '#92400e' }}>Old Way = Stress</p></div>
      </div>

      {/* FEATURES */}
      <div id="features" style={{ maxWidth: 1200, margin: '0 auto', padding: '0 24px 32px' }}>
        {sectionTitle('Powerful Features for Winning Campaigns', 'Everything you need to run a professional campaign - in your pocket.')}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14 }}>
          {[
            ['👤', 'Candidate Management', 'Manage your candidates easily.', '#eff6ff'],
            ['📊', 'Campaign Tracking', 'Monitor progress in real-time.', '#f0fdf4'],
            ['👥', 'Teams & Ground Game', 'Organize your teams effectively.', '#fef3c7'],
            ['🤝', 'Volunteer Onboarding', 'Recruit and manage volunteers.', '#fdf2f8'],
            ['🛡️', 'Role-Based Access', 'Control who sees what. 6 roles.', '#f5f3ff'],
            ['📈', 'Dashboard & Reports', 'Get insights & reports instantly.', '#ecfeff'],
            ['💬', 'Messages & Invites', 'Chat + WhatsApp invite in 1 tap.', '#f0fdf4'],
            ['🔔', 'Notifications', 'Never miss approval or message.', '#fef2f2'],
          ].map(([icon, title, desc, bg]) => (
            <div key={title} style={{ border: '1px solid #e2e8f0', padding: 18, borderRadius: 16, textAlign: 'center', background: 'white', transition: 'all 0.25s', cursor: 'pointer' }}
              onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-6px)'; e.currentTarget.style.boxShadow = '0 12px 24px rgba(0,0,0,0.1)'; e.currentTarget.style.border = '1px solid #2563eb' }}
              onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none'; e.currentTarget.style.border = '1px solid #e2e8f0' }}>
              <div style={{ width: 52, height: 52, background: bg, borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26, margin: '0 auto' }}>{icon}</div><h4 style={{ margin: '12px 0 6px', fontSize: 14, fontWeight: 800 }}>{title}</h4><p style={{ fontSize: 12, color: '#64748b', margin: '0 0 10px', lineHeight: 1.5 }}>{desc}</p><span onClick={goStart} style={{ color: blue, fontSize: 12, fontWeight: 800, cursor: 'pointer' }}>Learn more →</span>
            </div>
          ))}
        </div>
      </div>

      {/* HOW IT WORKS */}
      <div id="how" style={{ background: '#f8fafc', padding: '32px 24px' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          {sectionTitle('How It Works', 'From signup to winning - in 4 simple steps.')}
          <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start', justifyContent: 'center', flexWrap: 'wrap', textAlign: 'center' }}>
            {[
              ['1', 'Create Account', 'Sign up in 1 minute.', '📝'],
              ['2', 'Add Candidate', 'Create your profile.', '🗳️'],
              ['3', 'Build Team', 'Invite volunteers via WhatsApp.', '👥'],
              ['4', 'Win Election', 'Track and achieve your goals.', '🏆'],
            ].map(([n, t, d, icon], i) => (
              <React.Fragment key={t}>
                <div style={{ minWidth: 150, maxWidth: 200, background: 'white', padding: 18, borderRadius: 16, boxShadow: '0 4px 14px rgba(0,0,0,0.05)', transition: 'all 0.2s' }} onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-4px)'} onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}>
                  <div style={{ fontSize: 28 }}>{icon}</div>
                  <div style={{ width: 32, height: 32, background: blue, color: 'white', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '10px auto', fontWeight: 900 }}>{n}</div>
                  <h4 style={{ margin: '8px 0 4px', fontSize: 15, fontWeight: 800 }}>{t}</h4><p style={{ fontSize: 12, color: '#64748b', margin: 0, lineHeight: 1.5 }}>{d}</p>
                </div>
                {i < 3 && <span style={{ color: blue, fontSize: 24, marginTop: 40, animation: 'bounce 1.5s infinite' }}>→</span>}
              </React.Fragment>
            ))}
          </div>
        </div>
      </div>

      {/* FEATURED CANDIDATES */}
      <div id="candidates" style={{ maxWidth: 1200, margin: '0 auto', padding: '32px 24px' }}>
        {sectionTitle('Featured Candidates', 'Leaders already using PCMS to win.')}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 16 }}>
          {[
            ['https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=200&h=200&fit=crop', 'Amina Wanjiru', 'Westlands, Nairobi', 'MCA', '🔵 UDA'],
            ['https://images.unsplash.com/photo-1560250097-0b93528c311a?w=200&h=200&fit=crop', 'David Kibet', 'Kisumu East, Kisumu', 'MP', '🟠 ODM'],
            ['https://images.unsplash.com/photo-1580489944761-15a19d654956?w=200&h=200&fit=crop', 'Grace Njeri', 'Mombasa County', 'Women Rep', '🟢 Independent'],
          ].map(([img, name, loc, role, party]) => (
            <div key={name} style={{ display: 'flex', gap: 12, alignItems: 'center', border: '1px solid #e2e8f0', borderRadius: 16, padding: 14, transition: 'all 0.2s', background: 'white' }} onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.boxShadow = '0 10px 20px rgba(0,0,0,0.08)' }} onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none' }}>
              <img src={img} alt={name} style={{ width: 72, height: 72, borderRadius: 14, objectFit: 'cover' }} />
              <div style={{ flex: 1 }}><h4 style={{ margin: 0, fontSize: 15 }}>{name}</h4><p style={{ margin: '4px 0 2px', fontSize: 12, color: '#64748b' }}>{loc}</p><p style={{ margin: '0 0 8px', fontSize: 11, fontWeight: 700 }}>{role} • {party}</p><button onClick={goStart} style={{ background: blue, color: 'white', border: 'none', padding: '6px 12px', borderRadius: 99, fontSize: 12, cursor: 'pointer', fontWeight: 700 }}>View Profile →</button></div>
            </div>
          ))}
        </div>
        <div style={{ textAlign: 'center', marginTop: 16 }}><button onClick={goStart} style={{ padding: '11px 20px', background: 'white', border: `2px solid ${blue}`, color: blue, borderRadius: 99, cursor: 'pointer', fontWeight: 800 }}>See it in action →</button></div>
      </div>

      {/* TESTIMONIALS */}
      <div style={{ background: '#f8fafc', padding: '32px 24px' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          {sectionTitle('What Our Users Say', 'Real feedback from real campaign teams.')}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 16 }}>
            {[
              ['MK', '"PCMS has transformed our campaign planning. We now track volunteers easily."', 'Margaret K., Campaign Manager, Westlands', '#2563eb'],
              ['DK', '"Simple, powerful and secure. Highly recommended!"', 'David K., Team Leader, Kisumu', '#16a34a'],
              ['JM', '"Finally, a system that understands Kenyan politics."', 'John M., Volunteer, Mombasa', '#f59e0b'],
            ].map(([init, text, who, bg]) => (
              <div key={who} style={{ background: 'white', border: '1px solid #e2e8f0', padding: 18, borderRadius: 16, display: 'flex', gap: 12, transition: 'all 0.2s' }} onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-4px)'} onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}>
                <div style={{ width: 44, height: 44, background: bg, color: 'white', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, flexShrink: 0 }}>{init}</div>
                <div><p style={{ margin: 0, fontSize: 13, lineHeight: 1.6 }}>{text}</p><p style={{ fontSize: 12, color: '#475569', margin: '10px 0 4px', fontWeight: 600 }}>— {who}</p><p style={{ margin: 0, color: '#f59e0b' }}>⭐⭐⭐⭐⭐</p></div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* SECURITY */}
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '32px 24px' }}>
        <div style={{ background: 'linear-gradient(135deg,#eff6ff,#dbeafe)', borderRadius: 16, padding: 20, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16, alignItems: 'center' }}>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}><span style={{ fontSize: 36 }}>🔒</span><div><b style={{ fontSize: 15 }}>Your Data. Our Priority.</b><p style={{ fontSize: 12, color: '#64748b', margin: '4px 0 0', lineHeight: 1.5 }}>PCMS is built with security and compliance in mind.</p></div></div>
          <div style={{ fontSize: 13 }}><b>✅ Data Isolation</b><br /><span style={{ color: '#64748b', fontSize: 12 }}>Each candidate sees only their data</span></div>
          <div style={{ fontSize: 13 }}><b>✅ Role-Based Access</b><br /><span style={{ color: '#64748b', fontSize: 12 }}>6 roles • Secure JWT login</span></div>
          <div style={{ fontSize: 13 }}><b>✅ Consent Tracking</b><br /><span style={{ color: '#64748b', fontSize: 12 }}>For volunteers • Audit logs</span></div>
        </div>
      </div>

      {/* PRICING + FAQ - Interactive */}
      <div id="pricing" style={{ maxWidth: 1200, margin: '0 auto', padding: '0 24px 32px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 24 }}>
        <div>
          <h2 style={{ textAlign: 'center', fontSize: 22, fontWeight: 900, margin: '0 0 18px' }}>Simple & Transparent Pricing</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12 }}>
            <div style={{ border: '1px solid #e2e8f0', borderRadius: 16, padding: 18, textAlign: 'center', transition: 'all 0.2s' }} onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-4px)'} onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}><b>Free Plan</b><p style={{ fontSize: 12, color: '#64748b' }}>Perfect for small campaigns</p><p style={{ fontSize: 12, lineHeight: 1.6 }}>1 Candidate • 1 Campaign<br />10 Volunteers</p><button onClick={goStart} style={{ width: '100%', padding: '10px', background: 'white', border: '1px solid #cbd5e1', borderRadius: 99, cursor: 'pointer', fontWeight: 700 }}>Get Started</button></div>
            <div style={{ background: 'linear-gradient(180deg,#2563eb,#1d4ed8)', color: 'white', borderRadius: 16, padding: 18, textAlign: 'center', position: 'relative', transform: 'scale(1.03)', boxShadow: '0 12px 24px rgba(37,99,235,0.3)' }}><span style={{ position: 'absolute', top: -10, left: '50%', transform: 'translateX(-50%)', background: '#f59e0b', color: 'white', fontSize: 10, padding: '3px 10px', borderRadius: 99, fontWeight: 800 }}>MOST POPULAR</span><b>Pro Plan</b><p style={{ fontSize: 12, opacity: 0.9 }}>For serious campaigns</p><p style={{ fontSize: 12, lineHeight: 1.6 }}>Unlimited Candidates<br />Teams & Volunteers</p><button onClick={goStart} style={{ width: '100%', padding: '10px', background: 'white', color: blue, border: 'none', borderRadius: 99, cursor: 'pointer', fontWeight: 800 }}>KSh 2,999 / month</button></div>
            <div style={{ border: '1px solid #e2e8f0', borderRadius: 16, padding: 18, textAlign: 'center', transition: 'all 0.2s' }} onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-4px)'} onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}><b>Enterprise</b><p style={{ fontSize: 12, color: '#64748b' }}>For large organisations</p><p style={{ fontSize: 12, lineHeight: 1.6 }}>Custom solutions<br />Dedicated support</p><button onClick={goStart} style={{ width: '100%', padding: '10px', background: 'white', border: '1px solid #cbd5e1', borderRadius: 99, cursor: 'pointer', fontWeight: 700 }}>Contact Us</button></div>
          </div>
        </div>
        <div>
          <h2 style={{ fontSize: 20, fontWeight: 900, margin: '0 0 14px' }}>Frequently Asked Questions</h2>
          {faqs.map((f, i) => (
            <div key={f.q} style={{ borderBottom: '1px solid #e2e8f0', overflow: 'hidden' }}>
              <div onClick={() => setOpenFaq(openFaq === i ? null : i)} style={{ display: 'flex', justifyContent: 'space-between', padding: '13px 0', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
                <span>{f.q}</span><span style={{ color: blue, transform: openFaq === i ? 'rotate(45deg)' : 'rotate(0deg)', transition: 'transform 0.2s', fontSize: 18 }}>{openFaq === i ? '×' : '+'}</span>
              </div>
              {openFaq === i && <p style={{ fontSize: 13, color: '#64748b', margin: '0 0 14px', lineHeight: 1.6, animation: 'slideDown 0.3s ease' }}>{f.a}</p>}
            </div>
          ))}
          <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 12, padding: 12, marginTop: 14, fontSize: 13, color: '#166534' }}>💡 Still have questions? <b style={{ cursor: 'pointer', textDecoration: 'underline' }} onClick={goStart}>Create a free account</b> and ask your Campaign Manager.</div>
        </div>
      </div>

      {/* FINAL CTA */}
      <div style={{ background: 'linear-gradient(135deg,#0a2463,#2563eb)', color: 'white', padding: '28px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16, position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', width: 200, height: 200, background: 'rgba(255,255,255,0.08)', borderRadius: '50%', right: -60, top: -60 }} />
        <div style={{ display: 'flex', gap: 16, alignItems: 'center', position: 'relative' }}><span style={{ fontSize: 52, animation: 'bounce 2s ease-in-out infinite' }}>🏆</span><div><h2 style={{ margin: 0, fontSize: 22, fontWeight: 900 }}>Ready to Run a Professional Campaign?</h2><p style={{ margin: '6px 0 0', opacity: 0.9, fontSize: 14 }}>Join hundreds of Kenyan leaders using PCMS today.</p></div></div>
        <button onClick={goStart} style={{ padding: '13px 26px', background: 'white', color: blue, border: 'none', borderRadius: 99, cursor: 'pointer', fontWeight: 900, boxShadow: '0 8px 20px rgba(0,0,0,0.2)', position: 'relative', transition: 'all 0.2s' }} onMouseEnter={e => e.target.style.transform = 'translateY(-2px)'} onMouseLeave={e => e.target.style.transform = 'translateY(0)'}>Start Now - It's Free →</button>
      </div>

      {/* FOOTER */}
      <footer style={{ background: '#0f172a', color: 'white', padding: '24px' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 20, alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}><span style={{ fontSize: 28 }}>🗳️</span><div><h2 style={{ margin: 0, fontSize: 22, fontWeight: 900 }}>PCMS</h2><p style={{ margin: 0, fontSize: 11, opacity: 0.8 }}>Plan. Organize. Win.</p></div></div>
          <p style={{ fontSize: 12, color: '#94a3b8', maxWidth: 280, lineHeight: 1.5 }}>About PCMS - The complete campaign management solution for 2027 and beyond.</p>
          <div style={{ display: 'flex', gap: 20, fontSize: 13 }}><span style={{ cursor: 'pointer' }} onClick={() => scrollTo('features')}>Features</span><span style={{ cursor: 'pointer' }} onClick={() => scrollTo('pricing')}>Pricing</span><span style={{ cursor: 'pointer' }} onClick={goLogin}>Login</span><span>Contact</span></div>
          <div style={{ fontSize: 13 }}>📍 Nairobi, Westlands • 🇰🇪 Kenya</div>
          <div style={{ display: 'flex', gap: 12, fontSize: 18 }}><span style={{ cursor: 'pointer' }}>𝕏</span><span style={{ cursor: 'pointer' }}>f</span><span style={{ cursor: 'pointer' }}>🟢</span></div>
        </div>
        <p style={{ textAlign: 'center', fontSize: 12, color: '#64748b', margin: '20px 0 0' }}>© 2026 PCMS. All rights reserved. • Built for Kenya 🇰🇪</p>
      </footer>

      <style>{`
        @keyframes float{0%,100%{transform:translateY(0)}50%{transform:translateY(-14px)}}
        @keyframes fadeIn{from{opacity:0}to{opacity:1}}
        @keyframes fadeInLeft{from{opacity:0;transform:translateX(-20px)}to{opacity:1;transform:translateX(0)}}
        @keyframes slideDown{from{opacity:0;transform:translateY(-8px)}to{opacity:1;transform:translateY(0)}}
        @keyframes bounce{0%,100%{transform:translateY(0)}50%{transform:translateY(-6px)}}
        @keyframes pulse{0%,100%{opacity:1;transform:scale(1)}50%{opacity:0.5;transform:scale(1.3)}}
        @media (max-width: 768px){ .nav-links{display:none !important} }
      `}</style>
    </div>
  )
}