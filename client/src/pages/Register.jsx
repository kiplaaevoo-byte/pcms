import { useState, useMemo, useEffect, useRef } from 'react'
import { registerApi } from '../api'

export default function Register({ onBack, onGoLogin, inviteRef }) {
  const [form, setForm] = useState({
    fullName: '', email: '', phone: '+254 ', county: '', organization: '',
    organizationOther: '',
    accountType: inviteRef?.role ? inviteRef.role.toLowerCase().replace('campaign_manager', 'manager').replace('team_leader', 'team') : '', password: '', confirmPassword: ''
  })
  const [agree, setAgree] = useState(false)
  const [message, setMessage] = useState('')
  const [success, setSuccess] = useState(null)
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading] = useState(false)
  const [shake, setShake] = useState(false)
  const [focused, setFocused] = useState(null)

  // ===== SLOW FLYING HELP 🆘 - SLOW 0.5 =====
  const [helpPos, setHelpPos] = useState({ x: 20, y: 140 })
  const [helpPaused, setHelpPaused] = useState(false)
  const [showHelp, setShowHelp] = useState(false)
  const helpVel = useRef({ vx: 0.5, vy: 0.35 }) // SLOW - calm, not fast
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

  const counties = ['Bomet', 'Nairobi', 'Kisumu', 'Mombasa', 'Nakuru', 'Kakamega', 'Kiambu', 'Machakos', 'Uasin Gishu', 'Kericho', 'Nandi', 'Bungoma', 'Kisii', 'Migori', 'Other']

  // ===== ORGANIZATION / CAMPAIGN NAME - DROPDOWN OPTIONS =====
  const organizationOptions = [
    { group: '🏛️ Political Parties - Major', options: [
      'UDA - United Democratic Alliance',
      'ODM - Orange Democratic Movement',
      'Wiper Democratic Movement',
      'Jubilee Party',
      'KANU - Kenya African National Union',
      'ANC - Amani National Congress',
      'FORD-Kenya - Forum for Restoration of Democracy',
      'DAP-K - Democratic Action Party of Kenya',
      'NARC-Kenya - National Rainbow Coalition',
      'Chama Cha Kazi (CCK)',
      'Democratic Party (DP)',
      'The Service Party (TSP)',
      'PAA - Pamoja African Alliance',
      'KUP - Kenya Union Party',
      'MDG - Movement for Democracy & Growth',
      'NARC - National Rainbow Coalition',
      'Maendeleo Chap Chap Party',
      'Roots Party of Kenya',
      'Safina Party',
      'Green Congress of Kenya (GCK)',
      'Party of National Unity (PNU)',
    ]},
    { group: '🗳️ Campaign Type', options: [
      'Independent Candidate - No Party',
      'Independent - Youth Campaign',
      'Independent - Women Campaign',
      'Independent - Community Campaign',
    ]},
    { group: '🏢 Organizations & Groups', options: [
      'Community Based Organization (CBO)',
      'Youth Group / Youth Organization',
      'Women Group / Women Organization',
      'Church / Religious Organization',
      'NGO - Non-Governmental Organization',
      'Self Help Group',
      'Cooperative Society / SACCO',
      'Professional Association',
      'Student Organization / University',
      'Sports Club / Association',
      'Business / Private Company',
      'Government / County Government',
      'School / College / Institution',
    ]},
    { group: '🎯 Campaign Office', options: [
      'Governor Campaign',
      'Senator Campaign',
      'MP - Member of Parliament Campaign',
      'MCA - Member of County Assembly Campaign',
      'Women Rep Campaign',
      'President Campaign',
      'Deputy President Campaign',
    ]},
  ]

  const set = (k, v) => { setForm({ ...form, [k]: v }); setMessage('') }

  const strength = useMemo(() => {
    const p = form.password
    if (!p) return { label: '', pct: 0, color: '#e2e8f0' }
    let s = 0
    if (p.length >= 8) s++
    if (/[A-Z]/.test(p)) s++
    if (/[0-9]/.test(p)) s++
    if (/[^A-Za-z0-9]/.test(p)) s++
    if (s <= 1) return { label: 'Weak', pct: 25, color: '#ef4444' }
    if (s === 2) return { label: 'Fair', pct: 50, color: '#f59e0b' }
    if (s === 3) return { label: 'Good', pct: 75, color: '#2563eb' }
    return { label: 'Strong 💪', pct: 100, color: '#16a34a' }
  }, [form.password])

  const progress = useMemo(() => {
    const fields = [form.fullName, form.email, form.phone?.trim().length > 5 ? 'x' : '', form.county, form.accountType, form.password, form.confirmPassword]
    const done = fields.filter(Boolean).length
    return Math.round((done / fields.length) * 100)
  }, [form])

  const showError = (msg) => {
    setMessage(msg)
    setShake(true)
    setTimeout(() => setShake(false), 500)
  }

  const submit = async (e) => {
    e.preventDefault()
    setMessage('')
    if (!form.fullName.trim()) return showError('Please enter your full name.')
    if (!form.email.includes('@')) return showError('Please enter a valid email.')
    if (!form.phone.startsWith('+254')) return showError('Phone must start with +254')
    if (!form.county) return showError('Please select your county.')
    if (!form.organization) return showError('Please select Organization / Campaign Name.')
    if (form.organization === 'Other - Type Your Own' && !form.organizationOther.trim()) return showError('Please type your Organization / Campaign Name.')
    if (!form.accountType) return showError('Please select account type.')
    if (!agree) return showError('Please agree to Terms & Privacy Policy')
    if (form.password !== form.confirmPassword) return showError('Passwords do not match')
    if (form.password.length < 8) return showError('Password must be at least 8 characters')
    setLoading(true)
    try {
      const payload = { ...form, organization: form.organization === 'Other - Type Your Own' ? form.organizationOther.trim() : form.organization }
      delete payload.organizationOther
      const data = await registerApi(payload)
      if (data.userId) setSuccess(data)
      else showError(data.error || 'Registration failed')
    } catch { showError('Cannot connect to backend - Is port 5000 running?') }
    setLoading(false)
  }

  const inputBase = { width: '100%', padding: '13px 14px', borderRadius: 12, border: '2px solid #e2e8f0', background: '#f8fafc', boxSizing: 'border-box', fontSize: 14, outline: 'none', transition: 'all 0.25s ease', color: '#0f172a' }
  const inputFocused = { border: '2px solid #2563eb', background: 'white', boxShadow: '0 0 0 4px rgba(37,99,235,0.12)' }
  const label = { fontSize: 13, fontWeight: 700, margin: '0 0 6px', display: 'block', color: '#334155' }
  const getInput = (key) => ({ ...inputBase, ...(focused === key ? inputFocused : {}) })

  const accountTypes = [
    { v: 'candidate', icon: '🗳️', title: 'Candidate', desc: 'Campaign Owner' },
    { v: 'manager', icon: '🎯', title: 'Campaign Manager', desc: 'Manage campaigns' },
    { v: 'organization', icon: '🏛️', title: 'Organization', desc: 'Political Org' },
    { v: 'team', icon: '👥', title: 'Campaign Team', desc: 'Team Leader' },
    { v: 'volunteer', icon: '🤝', title: 'Volunteer', desc: 'Support team' },
  ]

  // ===== HELP MODAL CONTENT (reused in both success + main) =====
  const helpModal = showHelp && (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, animation: 'fadeIn 0.25s ease' }} onClick={() => setShowHelp(false)}>
      <div style={{ background: 'white', borderRadius: 24, maxWidth: 420, width: '100%', padding: 26, position: 'relative', animation: 'pop 0.3s ease' }} onClick={e => e.stopPropagation()}>
        <button onClick={() => setShowHelp(false)} style={{ position: 'absolute', top: 14, right: 14, background: '#f1f5f9', border: 'none', width: 32, height: 32, borderRadius: '50%', cursor: 'pointer' }}>✕</button>
        <div style={{ width: 68, height: 68, background: 'linear-gradient(135deg,#f59e0b,#f97316)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 34, margin: '0 auto' }}>🆘</div>
        <h2 style={{ textAlign: 'center', margin: '12px 0 6px', fontWeight: 900 }}>Help Centre</h2>
        <p style={{ textAlign: 'center', color: '#64748b', fontSize: 13, lineHeight: 1.5 }}>Stuck registering? Here's quick help:</p>
        <button onClick={() => { setShowHelp(false); onGoLogin && onGoLogin() }} style={{ width: '100%', padding: 13, background: 'linear-gradient(90deg,#2563eb,#1d4ed8)', color: 'white', border: 'none', borderRadius: 12, cursor: 'pointer', fontWeight: 800, marginTop: 10 }}>🔑 Already have account? Login →</button>
        <button onClick={() => setShowHelp(false)} style={{ width: '100%', padding: 13, background: '#f0fdf4', border: '1px solid #bbf7d0', color: '#166534', borderRadius: 12, cursor: 'pointer', fontWeight: 800, marginTop: 8 }}>👥 Contact Team Leader via WhatsApp</button>
        <button onClick={() => setShowHelp(false)} style={{ width: '100%', padding: 13, background: '#fef3c7', border: '1px solid #fde68a', color: '#92400e', borderRadius: 12, cursor: 'pointer', fontWeight: 800, marginTop: 8 }}>📞 Need Approval? Contact Admin</button>
        <div style={{ marginTop: 14, background: '#f8fafc', borderRadius: 12, padding: '11px 12px', fontSize: 12, color: '#64748b', lineHeight: 1.6, textAlign: 'center' }}><b style={{ color: '#0f172a' }}>Quick Tips:</b><br />• Phone must start with +254<br />• Choose Organization from list or Other<br />• Password 8+ chars = Strong 💪<br />• Admin approves in &lt; 24h</div>
        <p style={{ textAlign: 'center', fontSize: 11, color: '#94a3b8', margin: '12px 0 0' }}>PCMS Help • 24/7 🇰🇪</p>
      </div>
    </div>
  )
  const helpButton = (
    <div onMouseEnter={() => setHelpPaused(true)} onMouseLeave={() => setHelpPaused(false)} onClick={() => setShowHelp(true)} title="Help Centre - Click for help" style={{ position: 'fixed', left: helpPos.x, top: helpPos.y, zIndex: 9999, width: 58, height: 58, background: 'linear-gradient(135deg,#f59e0b,#f97316,#dc2626)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26, cursor: 'pointer', boxShadow: '0 10px 26px rgba(249,115,22,0.45)', animation: 'helpPulseSlow 3s ease-in-out infinite', border: '3px solid white' }}>🆘<span style={{ position: 'absolute', top: -4, right: -4, width: 17, height: 17, background: '#dc2626', color: 'white', borderRadius: '50%', fontSize: 11, fontWeight: 900, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid white' }}>!</span></div>
  )

  if (success) {
    return (
      <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg,#0a2463,#1e40af,#2563eb)', backgroundSize: '300% 300%', animation: 'gradientMove 12s ease infinite', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Inter', system-ui, sans-serif", padding: 20 }}>
        <div style={{ background: 'white', padding: 40, borderRadius: 24, maxWidth: 480, width: '100%', textAlign: 'center', boxShadow: '0 30px 80px rgba(0,0,0,0.3)', animation: 'pop 0.6s cubic-bezier(0.22,1,0.36,1)' }}>
          <div style={{ width: 84, height: 84, background: '#f0fdf4', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 44, margin: '0 auto', animation: 'bounce 2s ease-in-out infinite' }}>✅</div>
          <h2 style={{ margin: '16px 0 8px', fontSize: 26, fontWeight: 900 }}>Account Created! 🎉</h2>
          <p style={{ color: '#64748b', margin: '0 0 14px' }}>Welcome to PCMS, <b style={{ color: '#0f172a' }}>{form.fullName}</b></p>
          <p style={{ color: '#64748b', fontSize: 14 }}>Your User ID: <b style={{ color: '#2563eb', background: '#eff6ff', padding: '4px 10px', borderRadius: 8 }}>{success.userId}</b></p>
          <div style={{ background: '#fef9c3', border: '1px solid #fde68a', padding: 14, borderRadius: 12, fontSize: 14, margin: '16px 0', lineHeight: 1.5 }}>⏳ Status: <b>PENDING APPROVAL</b><br /><span style={{ fontSize: 13, color: '#854d0e' }}>Admin will review your account. You can login after approval.</span></div>
          <p style={{ fontSize: 13, color: '#64748b' }}>{success.message || 'Account created! Waiting for Admin Approval.'}</p>
          <button onClick={onGoLogin} style={{ width: '100%', padding: 13, background: 'linear-gradient(90deg,#2563eb,#1d4ed8)', color: 'white', border: 'none', borderRadius: 12, cursor: 'pointer', fontWeight: 800, marginTop: 12, boxShadow: '0 8px 20px rgba(37,99,235,0.3)' }}>Go to Login →</button>
          <button onClick={onBack} style={{ width: '100%', padding: 13, background: 'white', border: '1px solid #e2e8f0', borderRadius: 12, cursor: 'pointer', marginTop: 8, fontWeight: 600 }}>Back to Home</button>
        </div>
        {helpButton}{helpModal}
        <style>{`@keyframes gradientMove{0%{background-position:0% 50%}50%{background-position:100% 50%}100%{background-position:0% 50%}} @keyframes pop{0%{transform:scale(0.9);opacity:0}100%{transform:scale(1);opacity:1}} @keyframes bounce{0%,100%{transform:translateY(0)}50%{transform:translateY(-6px)}} @keyframes fadeIn{from{opacity:0}to{opacity:1}} @keyframes helpPulseSlow{0%,100%{transform:scale(1)}50%{transform:scale(1.07)}}`}</style>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg,#0a2463,#1e40af,#2563eb,#0a2463)', backgroundSize: '300% 300%', animation: 'gradientMove 12s ease infinite', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Inter', system-ui, sans-serif", padding: 20, boxSizing: 'border-box', position: 'relative', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', width: 260, height: 260, background: 'radial-gradient(circle, rgba(255,255,255,0.22), transparent)', borderRadius: '50%', top: '-60px', right: '-40px', animation: 'float 6s ease-in-out infinite' }} />
      <div style={{ position: 'absolute', width: 180, height: 180, background: 'radial-gradient(circle, rgba(250,204,21,0.3), transparent)', borderRadius: '50%', bottom: '10%', left: '5%', animation: 'float 7s ease-in-out infinite reverse' }} />

      <div style={{ display: 'flex', maxWidth: 980, width: '100%', background: 'white', borderRadius: 24, overflow: 'hidden', boxShadow: '0 30px 80px rgba(0,0,0,0.35)', animation: 'slideUp 0.7s cubic-bezier(0.22,1,0.36,1)', position: 'relative', zIndex: 1 }} className={shake ? 'shake' : ''}>

        <div style={{ flex: '0 0 36%', background: 'linear-gradient(180deg,#0a2463,#1d4ed8)', color: 'white', padding: 32, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }} className="reg-left">
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 48, height: 48, background: 'white', borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26, animation: 'bounce 2s ease-in-out infinite' }}>🗳️</div>
              <div><div style={{ fontSize: 24, fontWeight: 900 }}>PCMS</div><div style={{ fontSize: 11, color: '#bfdbfe', textTransform: 'uppercase', letterSpacing: 1 }}>Political Campaign<br />Management System</div></div>
            </div>
            <h2 style={{ fontSize: 26, lineHeight: 1.25, margin: '28px 0 10px', fontWeight: 900 }}>Join the<br /><span style={{ background: 'linear-gradient(90deg,#facc15,#f97316)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Movement 🇰🇪</span></h2>
            <p style={{ fontSize: 14, lineHeight: 1.6, color: '#dbeafe' }}>Create your account in 1 minute. Admin will approve you - then you can start organizing.</p>
            <div style={{ marginTop: 22, background: 'rgba(255,255,255,0.12)', borderRadius: 14, padding: 14 }}>
              <div style={{ fontSize: 12, color: '#bfdbfe', marginBottom: 6, fontWeight: 700 }}>PROFILE COMPLETION</div>
              <div style={{ background: 'rgba(255,255,255,0.2)', height: 8, borderRadius: 99, overflow: 'hidden' }}><div style={{ width: `${progress}%`, height: '100%', background: 'linear-gradient(90deg,#facc15,#16a34a)', borderRadius: 99, transition: 'width 0.4s ease' }} /></div>
              <div style={{ fontSize: 13, fontWeight: 800, marginTop: 6 }}>{progress}% complete {progress === 100 ? '🎉 Ready!' : ''}</div>
            </div>
            <div style={{ marginTop: 18, display: 'flex', flexDirection: 'column', gap: 8 }}>
              {['✅ Free to join', '✅ Admin approval in < 24h', '✅ Secure & private'].map(t => <div key={t} style={{ fontSize: 13, background: 'rgba(255,255,255,0.1)', padding: '9px 12px', borderRadius: 10 }}>{t}</div>)}
            </div>
          </div>
          <div style={{ fontSize: 12, color: '#bfdbfe', marginTop: 20 }}>Already have an account?<br /><button onClick={onGoLogin} style={{ background: 'white', color: '#1d4ed8', border: 'none', padding: '10px 16px', borderRadius: 10, cursor: 'pointer', fontWeight: 800, marginTop: 8, width: '100%' }}>Login →</button></div>
        </div>

        <div style={{ flex: 1, padding: '28px 28px', maxHeight: '92vh', overflowY: 'auto' }}>
          <button onClick={onBack} style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', padding: 0, fontSize: 13, fontWeight: 600 }}>← Back to Home</button>
          <h1 style={{ fontSize: 24, fontWeight: 900, margin: '10px 0 2px', color: '#0f172a' }}>Create Your Account</h1>
          <p style={{ fontSize: 13, color: '#64748b', margin: '0 0 16px' }}>Plan. Organize. Win. — Register to manage your campaign professionally.</p>

          {inviteRef?.role && (
            <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', padding: '12px 14px', borderRadius: 12, marginBottom: 16, fontSize: 13, color: '#166534', animation: 'slideDown 0.4s ease' }}>
              🎉 You were invited as <b>{inviteRef.role}</b> via WhatsApp / SMS! Complete registration below - Admin will approve you.
            </div>
          )}

          <form onSubmit={submit}>
            <h3 style={{ fontSize: 14, margin: '0 0 12px', color: '#2563eb', fontWeight: 800 }}>1️⃣ PERSONAL INFORMATION</h3>
            <div><label style={label}>Full Name *</label><input value={form.fullName} onChange={e => set('fullName', e.target.value)} onFocus={() => setFocused('fullName')} onBlur={() => setFocused(null)} placeholder="e.g. Donald Trumph" style={getInput('fullName')} required /></div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 12 }}>
              <div><label style={label}>Email *</label><input type="email" value={form.email} onChange={e => set('email', e.target.value)} onFocus={() => setFocused('email')} onBlur={() => setFocused(null)} placeholder="you@example.com" style={getInput('email')} required /></div>
              <div><label style={label}>Phone *</label><input value={form.phone} onChange={e => set('phone', e.target.value)} onFocus={() => setFocused('phone')} onBlur={() => setFocused(null)} placeholder="+254 7XX XXX XXX" style={getInput('phone')} required /></div>
            </div>
            <div style={{ marginTop: 12 }}><label style={label}>County *</label>
              <select value={form.county} onChange={e => set('county', e.target.value)} style={getInput('county')} required>
                <option value="">Select county</option>{counties.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>

            <h3 style={{ fontSize: 14, margin: '20px 0 12px', color: '#2563eb', fontWeight: 800 }}>2️⃣ ORGANIZATION & ROLE</h3>
            <div>
              <label style={label}>Organization / Campaign Name * <span style={{ fontWeight: 400, color: '#94a3b8' }}>— Select from list</span></label>
              <select value={form.organization} onChange={e => set('organization', e.target.value)} onFocus={() => setFocused('org')} onBlur={() => setFocused(null)} style={getInput('org')} required>
                <option value="">-- Select Organization / Party / Campaign --</option>
                {organizationOptions.map(g => (
                  <optgroup key={g.group} label={g.group}>
                    {g.options.map(o => <option key={o} value={o}>{o}</option>)}
                  </optgroup>
                ))}
                <option value="Other - Type Your Own">✏️ Other - Type Your Own</option>
              </select>
              {form.organization && form.organization !== 'Other - Type Your Own' && (
                <p style={{ fontSize: 12, color: '#16a34a', fontWeight: 700, margin: '6px 0 0', animation: 'pop 0.3s ease' }}>✅ Selected: {form.organization}</p>
              )}
              {form.organization === 'Other - Type Your Own' && (
                <div style={{ marginTop: 10, animation: 'slideDown 0.3s ease' }}>
                  <label style={label}>Type Your Organization / Campaign Name *</label>
                  <input value={form.organizationOther} onChange={e => set('organizationOther', e.target.value)} onFocus={() => setFocused('orgOther')} onBlur={() => setFocused(null)} placeholder="e.g. Chebet for MCA - Bomet Central, My Youth Group..." style={getInput('orgOther')} required />
                </div>
              )}
              <p style={{ fontSize: 11, color: '#94a3b8', margin: '6px 0 0' }}>Can't find yours? Choose <b>Other - Type Your Own</b> and type it.</p>
            </div>

            <label style={{ ...label, marginTop: 14 }}>Account Type * <span style={{ fontWeight: 400, color: '#94a3b8' }}>— Choose your role</span></label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px,1fr))', gap: 8 }}>
              {accountTypes.map(t => (
                <button key={t.v} type="button" onClick={() => set('accountType', t.v)} style={{ textAlign: 'left', padding: '11px 12px', borderRadius: 12, border: form.accountType === t.v ? '2px solid #2563eb' : '2px solid #e2e8f0', background: form.accountType === t.v ? '#eff6ff' : '#f8fafc', cursor: 'pointer', transition: 'all 0.2s', transform: form.accountType === t.v ? 'scale(1.02)' : 'scale(1)' }}>
                  <div style={{ fontSize: 20 }}>{t.icon}</div>
                  <div style={{ fontSize: 13, fontWeight: 800, color: '#0f172a', marginTop: 2 }}>{t.title}</div>
                  <div style={{ fontSize: 11, color: '#64748b' }}>{t.desc}</div>
                  {form.accountType === t.v && <div style={{ fontSize: 11, color: '#2563eb', fontWeight: 800, marginTop: 4 }}>✓ Selected</div>}
                </button>
              ))}
            </div>
            <p style={{ fontSize: 11, color: '#94a3b8', margin: '8px 0 0' }}>Admin roles are assigned by system only - not selectable.</p>

            <h3 style={{ fontSize: 14, margin: '20px 0 12px', color: '#2563eb', fontWeight: 800 }}>3️⃣ SECURITY</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div><label style={label}>Password *</label><input type={showPass ? 'text' : 'password'} value={form.password} onChange={e => set('password', e.target.value)} onFocus={() => setFocused('pass')} onBlur={() => setFocused(null)} placeholder="Min 8 chars" style={getInput('pass')} required /></div>
              <div><label style={label}>Confirm *</label><input type={showPass ? 'text' : 'password'} value={form.confirmPassword} onChange={e => set('confirmPassword', e.target.value)} onFocus={() => setFocused('confirm')} onBlur={() => setFocused(null)} placeholder="Repeat password" style={getInput('confirm')} required /></div>
            </div>
            {form.password && (
              <div style={{ marginTop: 10 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, fontWeight: 700 }}><span>Password strength</span><span style={{ color: strength.color }}>{strength.label}</span></div>
                <div style={{ background: '#e2e8f0', height: 6, borderRadius: 99, overflow: 'hidden', marginTop: 4 }}><div style={{ width: `${strength.pct}%`, height: '100%', background: strength.color, borderRadius: 99, transition: 'width 0.3s ease' }} /></div>
                <p style={{ fontSize: 11, color: '#94a3b8', margin: '6px 0 0' }}>Tip: Use 8+ chars, capital + number + symbol for Strong 💪</p>
              </div>
            )}
            {form.password && form.confirmPassword && form.password === form.confirmPassword && <p style={{ fontSize: 12, color: '#16a34a', fontWeight: 700, margin: '8px 0 0', animation: 'pop 0.3s ease' }}>✅ Passwords match!</p>}
            {form.password && form.confirmPassword && form.password !== form.confirmPassword && <p style={{ fontSize: 12, color: '#ef4444', fontWeight: 700, margin: '8px 0 0' }}>❌ Passwords do not match</p>}
            <label style={{ fontSize: 13, display: 'flex', gap: 8, alignItems: 'center', cursor: 'pointer', marginTop: 10, color: '#475569' }}><input type="checkbox" checked={showPass} onChange={e => setShowPass(e.target.checked)} /> Show passwords</label>

            <label style={{ display: 'flex', gap: 10, alignItems: 'flex-start', fontSize: 13, margin: '16px 0', cursor: 'pointer', background: agree ? '#f0fdf4' : '#f8fafc', border: agree ? '1px solid #bbf7d0' : '1px solid #e2e8f0', padding: '11px 12px', borderRadius: 12, transition: 'all 0.2s' }}>
              <input type="checkbox" checked={agree} onChange={e => setAgree(e.target.checked)} style={{ marginTop: 2, width: 16, height: 16, accentColor: '#2563eb' }} />
              <span>I agree to the <b>PCMS Terms of Service</b> and <b>Privacy Policy</b>. I understand my account needs Admin approval.</span>
            </label>

            {message && <div style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', padding: '11px 12px', borderRadius: 12, fontSize: 13, marginBottom: 12, animation: 'slideDown 0.3s ease' }}>⚠️ {message}</div>}

            <button type="submit" disabled={!agree || loading} style={{ width: '100%', padding: 14, background: !agree || loading ? '#94a3b8' : 'linear-gradient(90deg,#2563eb,#1d4ed8)', color: 'white', border: 'none', borderRadius: 12, cursor: !agree ? 'not-allowed' : 'pointer', fontWeight: 800, fontSize: 15, boxShadow: '0 8px 20px rgba(37,99,235,0.3)', transition: 'all 0.25s' }}>
              {loading ? '⏳ Creating Account...' : 'Create Account →'}
            </button>

            <p style={{ textAlign: 'center', fontSize: 13, color: '#64748b', margin: '14px 0 0' }}>Already registered? <span onClick={onGoLogin} style={{ color: '#2563eb', cursor: 'pointer', fontWeight: 800 }}>Login to your account →</span></p>
            <p style={{ textAlign: 'center', fontSize: 11, color: '#94a3b8', margin: '10px 0 0' }}>🔒 Your password is securely hashed. Account requires Admin approval.</p>
          </form>
        </div>
      </div>

      {helpButton}{helpModal}

      <style>{`
        @keyframes gradientMove{0%{background-position:0% 50%}50%{background-position:100% 50%}100%{background-position:0% 50%}}
        @keyframes float{0%,100%{transform:translateY(0)}50%{transform:translateY(-16px)}}
        @keyframes slideUp{from{opacity:0;transform:translateY(28px) scale(0.97)}to{opacity:1;transform:translateY(0) scale(1)}}
        @keyframes slideDown{from{opacity:0;transform:translateY(-8px)}to{opacity:1;transform:translateY(0)}}
        @keyframes pop{0%{transform:scale(0.9);opacity:0}100%{transform:scale(1);opacity:1}}
        @keyframes bounce{0%,100%{transform:translateY(0)}50%{transform:translateY(-5px)}}
        @keyframes fadeIn{from{opacity:0}to{opacity:1}}
        @keyframes helpPulseSlow{0%,100%{transform:scale(1)}50%{transform:scale(1.07)}}
        .shake{animation:shakeAnim 0.5s ease !important}
        @keyframes shakeAnim{0%,100%{transform:translateX(0)}20%{transform:translateX(-8px)}40%{transform:translateX(8px)}60%{transform:translateX(-6px)}80%{transform:translateX(6px)}}
        @media (max-width: 820px){ .reg-left{display:none !important} }
      `}</style>
    </div>
  )
}