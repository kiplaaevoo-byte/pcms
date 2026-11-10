import { useState } from 'react'
import { API } from '../api'

export default function ProfileEdit({ token, user, myData, onDone, onCancel, setMessage, onPhotoUpdated }) {
  const roleNorm = String(user?.role || user?.accountType || 'VOLUNTEER').toUpperCase().trim()
  const role = roleNorm
  const isCandidate = role === 'CANDIDATE'
  const isManager = role === 'CAMPAIGN_MANAGER' || role === 'TEAM_LEADER' || role === 'SUPER_ADMIN' || role === 'CAMPAIGN_ADMIN' || role === 'ADMIN'
  const isVolunteer = role === 'VOLUNTEER'
  const isOrganization = role === 'ORGANIZATION' || role === 'ORG'
  const cand = myData?.myCandidate || null
  const [f, setF] = useState({
    fullName: user?.fullName || '', phone: user?.phone || '', email: user?.email || '', county: user?.county || '',
    photo: user?.photo || '', bio: user?.bio || cand?.biography || '', location: user?.location || cand?.constituency || '',
    timezone: user?.timezone || 'Africa/Nairobi', emergencyContact: user?.emergencyContact || '', emergencyPhone: user?.emergencyPhone || '',
    skills: user?.skills || '', languages: user?.languages || '', certifications: user?.certifications || '',
    resumeUrl: user?.resumeUrl || '', portfolioLinks: user?.portfolioLinks || '', workExperience: user?.workExperience || cand?.leadershipExperience || '',
    education: user?.education || cand?.education || '', jobPreferences: user?.jobPreferences || '',
    jobTitle: user?.jobTitle || '', department: user?.department || '', workEmail: user?.workEmail || user?.email || '',
    teamOverview: user?.teamOverview || '', notificationPrefs: user?.notificationPrefs || 'Email, WhatsApp',
    interests: user?.interests || '', availability: user?.availability || '', tshirtSize: user?.tshirtSize || '', idDocumentUrl: user?.idDocumentUrl || '',
    organization: user?.organization || user?.organizationName || '',
    organizationName: user?.organizationName || user?.organization || '',
    orgType: user?.orgType || 'Political Organization',
    orgMission: user?.orgMission || user?.bio || '',
    orgWebsite: user?.orgWebsite || '',
    orgFoundedYear: user?.orgFoundedYear || '',
  })
  const [loading, setLoading] = useState(false)
  const [photoPreview, setPhotoPreview] = useState(user?.photo || '')
  const set = (k, v) => setF({ ...f, [k]: v })
  const input = { width: '100%', padding: 11, borderRadius: 8, border: '1px solid #cbd5e1', boxSizing: 'border-box', fontSize: 14, marginBottom: 10 }
  const label = { fontSize: 13, fontWeight: 'bold', display: 'block', marginBottom: 4, color: '#334155' }
  const section = { background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 12, padding: 16, marginBottom: 14 }
  const sectionTitle = { margin: '0 0 12px', fontSize: 15, color: '#0a2463' }

  // ★ FIX: Broadcast photo to Dashboard instantly - sidebar bottom-left + header top-right
  const broadcastPhoto = (photoUrl) => {
    try { if (photoUrl) localStorage.setItem('pcms_photo', photoUrl); else localStorage.removeItem('pcms_photo') } catch {}
    try { window.dispatchEvent(new CustomEvent('pcms_photo_updated', { detail: { photo: photoUrl || '' } })) } catch {}
    if (typeof onPhotoUpdated === 'function') onPhotoUpdated(photoUrl || '')
  }

  // UPDATED: Photo Upload - size check + instant preview + localStorage sync + Dashboard sync
  const onPhoto = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 2 * 1024 * 1024) return setMessage && setMessage('❌ Photo too big - max 2MB. Pick a smaller photo.')
    if (!file.type.startsWith('image/')) return setMessage && setMessage('❌ Please pick an image file (JPG / PNG)')
    const reader = new FileReader()
    reader.onload = () => {
      const url = reader.result
      setPhotoPreview(url)
      set('photo', url)
      // ★ INSTANT: Show in sidebar + header BEFORE Save is clicked
      broadcastPhoto(url)
      setMessage && setMessage('📸 Photo selected - now showing in sidebar + header. Click Save to keep it.')
    }
    reader.readAsDataURL(file)
  }
  const onRemovePhoto = () => {
    setPhotoPreview('')
    set('photo', '')
    broadcastPhoto('')
    setMessage && setMessage('Photo removed - showing initials again.')
  }
  const onFile = (field) => (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    set(field, file.name + ' - uploaded on this device')
    setMessage && setMessage(`📁 ${file.name} selected.`)
  }
  const submit = async (e) => {
    e.preventDefault()
    if (!f.fullName || !f.phone) return setMessage && setMessage('Full Name and Phone required')
    if (isOrganization && !f.organization && !f.organizationName) return setMessage && setMessage('Organization Name is required - members join by this exact name')
    setLoading(true)
    try {
      const payload = { ...f }
      if (isOrganization) {
        const orgName = (f.organization || f.organizationName || f.fullName).trim()
        payload.organization = orgName
        payload.organizationName = orgName
        payload.bio = f.orgMission || f.bio
      }
      // 1. Try dedicated photo endpoint first (if backend has it)
      if (photoPreview && photoPreview !== user?.photo) {
        try {
          await fetch(`${API}/api/me/photo`, { method: 'PUT', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }, body: JSON.stringify({ photo: photoPreview }) }).catch(() => null)
        } catch {}
      }
      // 2. Save full profile
      const res = await fetch(`${API}/api/me/profile`, { method: 'PUT', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }, body: JSON.stringify(payload) })
      const d = await res.json().catch(() => ({}))
      if (d.error) setMessage && setMessage(d.error)
      else {
        // ★ FIX: Save to BOTH keys - pcms_user (old) + pcms_photo (Dashboard listens to this)
        try {
          const saved = JSON.parse(localStorage.getItem('pcms_user') || '{}')
          const updated = { ...saved, ...payload, photo: photoPreview }
          localStorage.setItem('pcms_user', JSON.stringify(updated))
          if (photoPreview) localStorage.setItem('pcms_photo', photoPreview)
          else localStorage.removeItem('pcms_photo')
        } catch {}
        // ★ FIX: Broadcast again on Save - so it survives refresh + other tabs
        broadcastPhoto(photoPreview)
        setMessage && setMessage('Profile updated! ✅ Photo now showing in sidebar + header.')
        onDone && onDone()
      }
    } catch { setMessage && setMessage('Cannot connect to backend') }
    setLoading(false)
  }
  const initials = (f.fullName || 'U').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
  return (
    <div style={{ background: 'white', borderRadius: 14, padding: 20, boxShadow: '0 2px 10px rgba(0,0,0,0.05)' }}>
      <h3 style={{ margin: '0 0 4px' }}>✏️ Edit My Profile - {isOrganization ? '🏛️ ORGANIZATION' : role.replace(/_/g, ' ')}</h3>
      <p style={{ color: '#64748b', fontSize: 13, margin: '0 0 16px' }}>User ID: {user?.userId} • {user?.email} • Changes save instantly.</p>
      {isOrganization && (
        <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', padding: '12px 14px', borderRadius: 10, fontSize: 13, marginBottom: 14, color: '#1e40af' }}>
          🏛️ <b>Organization Linking:</b> Members join you by typing your <b>Organization Name</b> exactly as below. Tell members to use: <b style={{ background: 'white', padding: '2px 8px', borderRadius: 6 }}>{f.organization || f.organizationName || f.fullName || 'Your Organization Name'}</b> when they register.
        </div>
      )}
      <form onSubmit={submit}>
        <div style={section}>
          <h4 style={sectionTitle}>📸 Profile Photo / {isOrganization ? 'Organization Logo' : 'Avatar'}</h4>
          <div style={{ display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap' }}>
            {photoPreview ? <img src={photoPreview} alt="Profile" style={{ width: 90, height: 90, borderRadius: isOrganization ? 14 : '50%', objectFit: 'cover', border: '3px solid #2563eb' }} /> : <div style={{ width: 90, height: 90, borderRadius: isOrganization ? 14 : '50%', background: '#2563eb', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28, fontWeight: 'bold' }}>{initials}</div>}
            <div>
              <label style={{ background: '#2563eb', color: 'white', padding: '9px 16px', borderRadius: 10, cursor: 'pointer', fontWeight: 800, fontSize: 13, display: 'inline-block' }}>📷 {isOrganization ? 'Choose Logo' : 'Choose Photo'}
                <input type="file" accept="image/*" onChange={onPhoto} style={{ display: 'none' }} />
              </label>
              <div style={{ fontSize: 12, color: '#64748b', marginTop: 6 }}>JPG / PNG, max 2MB. Will show in sidebar, header & member lists.</div>
              {photoPreview && <button type="button" onClick={onRemovePhoto} style={{ marginTop: 6, background: '#fee2e2', border: 'none', padding: '6px 10px', borderRadius: 6, cursor: 'pointer', fontSize: 12 }}>Remove Photo</button>}
            </div>
          </div>
          <p style={{ fontSize: 11, color: '#94a3b8', margin: '10px 0 0' }}>✅ Photo appears instantly on the blue profile icon in the sidebar (bottom-left) and header (top-right). Click Save to keep it after refresh.</p>
        </div>

        {isOrganization && (
          <>
            <div style={{ ...section, background: '#eff6ff', border: '1px solid #bfdbfe' }}>
              <h4 style={sectionTitle}>🏛️ Organization Details - This Links Your Members</h4>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))', gap: '0 12px' }}>
                <div><label style={label}>Organization Name *</label><input value={f.organization} onChange={e => { set('organization', e.target.value); set('organizationName', e.target.value) }} placeholder="e.g. Sotik Youth Alliance" style={input} required /></div>
                <div><label style={label}>Organization Type</label><select value={f.orgType} onChange={e => set('orgType', e.target.value)} style={input}><option>Political Organization</option><option>Youth Group</option><option>Women Group</option><option>Community Based Org</option><option>NGO</option><option>Party Chapter</option><option>Other</option></select></div>
                <div><label style={label}>Founded Year</label><input value={f.orgFoundedYear} onChange={e => set('orgFoundedYear', e.target.value)} placeholder="e.g. 2022" style={input} /></div>
                <div><label style={label}>Website / Social Link</label><input value={f.orgWebsite} onChange={e => set('orgWebsite', e.target.value)} placeholder="https://..." style={input} /></div>
              </div>
              <div><label style={label}>Mission / What Your Organization Does</label><textarea value={f.orgMission} onChange={e => set('orgMission', e.target.value)} placeholder="e.g. We mobilize youth in Sotik for voter education, leadership training..." style={{ ...input, minHeight: 80 }} /></div>
              <div><label style={label}>Contact Person (You)</label><input value={f.fullName} onChange={e => set('fullName', e.target.value)} style={input} /></div>
            </div>
            <div style={section}>
              <h4 style={sectionTitle}>📍 Organization Location & Contact</h4>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))', gap: '0 12px' }}>
                <div><label style={label}>Phone *</label><input value={f.phone} onChange={e => set('phone', e.target.value)} style={input} required /></div>
                <div><label style={label}>Email</label><input type="email" value={f.email} onChange={e => set('email', e.target.value)} style={input} /></div>
                <div><label style={label}>Work Email</label><input type="email" value={f.workEmail} onChange={e => set('workEmail', e.target.value)} style={input} /></div>
                <div><label style={label}>County</label><input value={f.county} onChange={e => set('county', e.target.value)} placeholder="Bomet" style={input} /></div>
                <div><label style={label}>Location / Town</label><input value={f.location} onChange={e => set('location', e.target.value)} placeholder="e.g. Sotik Town" style={input} /></div>
                <div><label style={label}>Emergency Contact</label><input value={f.emergencyContact} onChange={e => set('emergencyContact', e.target.value)} placeholder="e.g. Deputy - Jane" style={input} /></div>
              </div>
            </div>
          </>
        )}

        {!isOrganization && (
          <div style={section}>
            <h4 style={sectionTitle}>👤 {isCandidate ? 'Candidate Profile' : isManager ? 'Manager Profile' : 'Volunteer Profile'} - Basic Info</h4>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))', gap: '0 12px' }}>
              <div><label style={label}>Full Name *</label><input value={f.fullName} onChange={e => set('fullName', e.target.value)} style={input} required /></div>
              <div><label style={label}>Phone *</label><input value={f.phone} onChange={e => set('phone', e.target.value)} style={input} required /></div>
              <div><label style={label}>Email</label><input type="email" value={f.email} onChange={e => set('email', e.target.value)} style={input} /></div>
              <div><label style={label}>County</label><input value={f.county} onChange={e => set('county', e.target.value)} style={input} /></div>
              <div><label style={label}>Location {isManager ? '/ Office Location' : ''}</label><input value={f.location} onChange={e => set('location', e.target.value)} placeholder="e.g. Sotik, Bomet" style={input} /></div>
              <div><label style={label}>Organization (to join an Org)</label><input value={f.organization} onChange={e => set('organization', e.target.value)} placeholder="Type exact Organization Name" style={input} /><div style={{ fontSize: 11, color: '#64748b', marginTop: -6, marginBottom: 8 }}>Must match Organization's name exactly - case doesn't matter.</div></div>
              {isManager && <div><label style={label}>Timezone</label><select value={f.timezone} onChange={e => set('timezone', e.target.value)} style={input}><option>Africa/Nairobi</option><option>Africa/Mombasa</option><option>UTC</option></select></div>}
            </div>
          </div>
        )}
        {isCandidate && (
          <>
            <div style={section}>
              <h4 style={sectionTitle}>📝 Bio / Professional Summary</h4>
              <textarea value={f.bio} onChange={e => set('bio', e.target.value)} placeholder="Tell voters who you are, your vision, your values..." style={{ ...input, minHeight: 90 }} />
            </div>
            <div style={section}>
              <h4 style={sectionTitle}>📄 Resume / CV & Portfolio</h4>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(240px,1fr))', gap: '0 12px' }}>
                <div><label style={label}>Resume / CV Upload</label><input type="file" accept=".pdf,.doc,.docx" onChange={onFile('resumeUrl')} style={input} /><div style={{ fontSize: 12, color: '#64748b' }}>{f.resumeUrl || 'No CV uploaded yet'}</div></div>
                <div><label style={label}>Portfolio / Links (LinkedIn, GitHub)</label><textarea value={f.portfolioLinks} onChange={e => set('portfolioLinks', e.target.value)} placeholder={'https://linkedin.com/in/yourname\nhttps://github.com/yourname\nhttps://yourwebsite.com'} style={{ ...input, minHeight: 70 }} /></div>
              </div>
            </div>
            <div style={section}>
              <h4 style={sectionTitle}>💼 Work Experience & Education</h4>
              <div><label style={label}>Work Experience & Employment History</label><textarea value={f.workExperience} onChange={e => set('workExperience', e.target.value)} placeholder="e.g. MCA 2017-2022, Teacher 2010-2017..." style={{ ...input, minHeight: 80 }} /></div>
              <div><label style={label}>Education & Certifications</label><textarea value={f.education} onChange={e => set('education', e.target.value)} placeholder="e.g. BA Political Science, UoN 2015..." style={{ ...input, minHeight: 70 }} /></div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))', gap: '0 12px' }}>
                <div><label style={label}>Key Skills & Software Proficiencies</label><input value={f.skills} onChange={e => set('skills', e.target.value)} placeholder="Public Speaking, Canvassing, Excel, Social Media" style={input} /></div>
                <div><label style={label}>Languages</label><input value={f.languages} onChange={e => set('languages', e.target.value)} placeholder="English, Swahili, Kalenjin" style={input} /></div>
              </div>
            </div>
            <div style={section}>
              <h4 style={sectionTitle}>🎯 Job Preferences</h4>
              <textarea value={f.jobPreferences} onChange={e => set('jobPreferences', e.target.value)} placeholder="Role types, Salary expectations, Relocation / Remote status" style={{ ...input, minHeight: 70 }} />
            </div>
          </>
        )}
        {isManager && (
          <>
            <div style={section}>
              <h4 style={sectionTitle}>💼 Job Title & Department</h4>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))', gap: '0 12px' }}>
                <div><label style={label}>Job Title</label><input value={f.jobTitle} onChange={e => set('jobTitle', e.target.value)} placeholder="e.g. Campaign Manager, Team Leader" style={input} /></div>
                <div><label style={label}>Department</label><input value={f.department} onChange={e => set('department', e.target.value)} placeholder="e.g. Ground Operations" style={input} /></div>
                <div><label style={label}>Work Email</label><input type="email" value={f.workEmail} onChange={e => set('workEmail', e.target.value)} style={input} /></div>
                <div><label style={label}>Work Phone</label><input value={f.phone} onChange={e => set('phone', e.target.value)} style={input} /></div>
              </div>
              <div><label style={label}>Professional Bio</label><textarea value={f.bio} onChange={e => set('bio', e.target.value)} placeholder="Your experience managing campaigns / teams..." style={{ ...input, minHeight: 80 }} /></div>
              <div><label style={label}>Team / Department Overview</label><textarea value={f.teamOverview} onChange={e => set('teamOverview', e.target.value)} placeholder="What does your team do? How many volunteers? Which wards?" style={{ ...input, minHeight: 70 }} /></div>
            </div>
            <div style={section}>
              <h4 style={sectionTitle}>🚨 Management Contact & Emergency Details</h4>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))', gap: '0 12px' }}>
                <div><label style={label}>Emergency Contact Name</label><input value={f.emergencyContact} onChange={e => set('emergencyContact', e.target.value)} placeholder="e.g. Jane Doe - Spouse" style={input} /></div>
                <div><label style={label}>Emergency Phone</label><input value={f.emergencyPhone} onChange={e => set('emergencyPhone', e.target.value)} placeholder="+254 ..." style={input} /></div>
                <div><label style={label}>Skills</label><input value={f.skills} onChange={e => set('skills', e.target.value)} placeholder="Leadership, Organizing, Reporting" style={input} /></div>
                <div><label style={label}>Languages</label><input value={f.languages} onChange={e => set('languages', e.target.value)} placeholder="English, Swahili" style={input} /></div>
              </div>
            </div>
            <div style={section}>
              <h4 style={sectionTitle}>🔔 Notification & Communication Preferences</h4>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {['Email', 'SMS', 'WhatsApp', 'In-App'].map(p => {
                  const active = (f.notificationPrefs || '').includes(p)
                  return <button key={p} type="button" onClick={() => {
                    const list = (f.notificationPrefs || '').split(',').map(s => s.trim()).filter(Boolean)
                    const next = active ? list.filter(x => x !== p) : [...list, p]
                    set('notificationPrefs', next.join(', '))
                  }} style={{ padding: '8px 14px', borderRadius: 20, border: 'none', cursor: 'pointer', background: active ? '#2563eb' : '#e2e8f0', color: active ? 'white' : '#0f172a', fontWeight: 'bold' }}>{active ? '✓ ' : ''}{p}</button>
                })}
              </div>
              <div style={{ fontSize: 12, color: '#64748b', marginTop: 8 }}>Selected: {f.notificationPrefs || 'None'}</div>
            </div>
          </>
        )}
        {isVolunteer && (
          <>
            <div style={section}>
              <h4 style={sectionTitle}>💬 Personal Bio / Motivation Statement</h4>
              <textarea value={f.bio} onChange={e => set('bio', e.target.value)} placeholder="Why do you volunteer? What change do you want to see?" style={{ ...input, minHeight: 80 }} />
            </div>
            <div style={section}>
              <h4 style={sectionTitle}>🛠️ Skills, Languages & Certifications</h4>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))', gap: '0 12px' }}>
                <div><label style={label}>Skills</label><input value={f.skills} onChange={e => set('skills', e.target.value)} placeholder="Canvassing, Driving, Photography, First Aid" style={input} /></div>
                <div><label style={label}>Languages</label><input value={f.languages} onChange={e => set('languages', e.target.value)} placeholder="English, Swahili, Kalenjin" style={input} /></div>
                <div><label style={label}>Special Certifications (e.g. First Aid)</label><input value={f.certifications} onChange={e => set('certifications', e.target.value)} placeholder="First Aid, Driving License, CPR" style={input} /></div>
              </div>
            </div>
            <div style={section}>
              <h4 style={sectionTitle}>❤️ Areas of Interest & Availability</h4>
              <div><label style={label}>Areas of Interest / Preferred Volunteer Activities</label><textarea value={f.interests} onChange={e => set('interests', e.target.value)} placeholder="Door-to-door, Rallies, Social Media, Fundraising, Data Entry..." style={{ ...input, minHeight: 70 }} /></div>
              <div><label style={label}>Availability & Schedule Preferences</label><input value={f.availability} onChange={e => set('availability', e.target.value)} placeholder="e.g. Sat-Sun, 9am-5pm, Weekly" style={input} /></div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 4 }}>
                {['Weekdays', 'Weekends', 'Mornings', 'Afternoons', 'Evenings', 'Full Day'].map(a => {
                  const active = (f.availability || '').includes(a)
                  return <button key={a} type="button" onClick={() => set('availability', active ? f.availability.replace(a, '').replace(/,,/g, ',').trim() : (f.availability ? f.availability + ', ' + a : a))} style={{ padding: '7px 12px', borderRadius: 20, border: 'none', cursor: 'pointer', background: active ? '#16a34a' : '#e2e8f0', color: active ? 'white' : '#0f172a', fontSize: 12, fontWeight: 'bold' }}>{a}</button>
                })}
              </div>
            </div>
            <div style={section}>
              <h4 style={sectionTitle}>👕 Logistics & Emergency</h4>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))', gap: '0 12px' }}>
                <div><label style={label}>T-Shirt Size</label><select value={f.tshirtSize} onChange={e => set('tshirtSize', e.target.value)} style={input}><option value="">Select Size</option><option>S</option><option>M</option><option>L</option><option>XL</option><option>XXL</option><option>XXXL</option></select></div>
                <div><label style={label}>Emergency Contact Name</label><input value={f.emergencyContact} onChange={e => set('emergencyContact', e.target.value)} placeholder="e.g. Mother - Mary" style={input} /></div>
                <div><label style={label}>Emergency Contact Phone</label><input value={f.emergencyPhone} onChange={e => set('emergencyPhone', e.target.value)} placeholder="+254 ..." style={input} /></div>
                <div><label style={label}>Background Check / ID Verification Upload</label><input type="file" accept=".pdf,.jpg,.png" onChange={onFile('idDocumentUrl')} style={input} /><div style={{ fontSize: 12, color: '#64748b' }}>{f.idDocumentUrl || 'No document uploaded yet'}</div></div>
              </div>
            </div>
          </>
        )}
        <div style={{ display: 'flex', gap: 8 }}>
          <button type="submit" disabled={loading} style={{ padding: '12px 26px', background: loading ? '#94a3b8' : '#16a34a', color: 'white', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 'bold', fontSize: 15 }}>{loading ? 'Saving...' : '💾 Save Profile'}</button>
          {onCancel && <button type="button" onClick={onCancel} style={{ padding: '12px 18px', background: '#e2e8f0', border: 'none', borderRadius: 8, cursor: 'pointer' }}>Cancel</button>}
        </div>
      </form>
    </div>
  )
}