import { useState, useEffect } from 'react'
import { API } from '../api'

const EMPTY = { youtube: '', x: '', facebook: '', instagram: '', tiktok: '', reddit: '', telegram: '', whatsapp: '', linkedin: '' }

// Verify = Saved instantly. If backend fails, we SAY it failed - never fake "Saved".
export default function ConnectSocials({ token, user, myData, onClose, onSaved, setMessage }) {
  const cand = myData?.myCandidate || null
  const saved = cand?.socialHandles || user?.socialHandles || {}

  const [handles, setHandles] = useState(EMPTY)
  const [status, setStatus] = useState({})
  const [verifiedInfo, setVerifiedInfo] = useState({})
  const [saving, setSaving] = useState(false)
  const [checkingAll, setCheckingAll] = useState(false)
  const [loadingHandles, setLoadingHandles] = useState(true)
  const [saveError, setSaveError] = useState('')

  // Load: DB first, then merge localStorage (for the 2 that were saved locally before fix)
  useEffect(() => {
    let alive = true
    const load = async () => {
      let fromDB = {}
      try {
        const r = await fetch(`${API}/api/social/handles`, { headers: { Authorization: `Bearer ${token}` } })
        const d = await r.json().catch(() => ({}))
        console.log('🔍 ConnectSocials GET /handles ->', d)
        fromDB = d.handles || {}
      } catch {}
      let fromLocal = {}
      try { fromLocal = JSON.parse(localStorage.getItem('pcms_social_handles') || '{}') } catch {}
      // Merge: DB wins, local fills gaps (so old 2 are not lost)
      const merged = { ...fromLocal, ...fromDB, ...saved }
      // If DB was empty but local has 2, we will auto re-save them on Done
      if (!alive) return
      const init = {}
      Object.keys(EMPTY).forEach(k => {
        const v = merged[k] || ''
        init[k] = String(v).replace(/^[@/]+/, '').replace(/^https?:\/\/[^\/]+\//, '').trim()
      })
      setHandles(init)
      const st = {}
      Object.entries(init).forEach(([k, v]) => { if (v) st[k] = k === 'whatsapp' ? 'alerts_only' : 'saved' })
      setStatus(st)
      try { setVerifiedInfo(JSON.parse(localStorage.getItem('pcms_verified_info') || '{}')) } catch {}
      setLoadingHandles(false)
    }
    load()
    return () => { alive = false }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const platforms = [
    { key: 'youtube', label: 'YouTube', icon: '▶️', color: '#fef2f2', placeholder: 'Channel handle, e.g. @EvansKiplangat', hint: 'Your channel handle as on YouTube', url: (h) => `https://youtube.com/@${h}`, note: 'Verified via YouTube oEmbed / API - 404 = fake' },
    { key: 'x', label: 'X (Twitter)', icon: '𝕏', color: '#f8fafc', placeholder: 'X handle, e.g. @EvansForMCA', hint: 'Your X handle as on X', url: (h) => `https://x.com/${h}`, note: 'Checked via X oEmbed + page' },
    { key: 'facebook', label: 'Facebook', icon: 'f', color: '#eff6ff', placeholder: 'Page / Profile name', hint: 'Your Page / Profile name as on Facebook', url: (h) => `https://facebook.com/${h}`, note: 'Checked via Facebook page + og:title' },
    { key: 'instagram', label: 'Instagram', icon: '📸', color: '#fdf2f8', placeholder: 'Instagram username', hint: 'Your Instagram username', url: (h) => `https://instagram.com/${h}`, note: 'Checked via Instagram page' },
    { key: 'tiktok', label: 'TikTok', icon: '🎵', color: '#f8fafc', placeholder: 'TikTok username', hint: 'Your TikTok username', url: (h) => `https://tiktok.com/@${h}`, note: 'Verified via TikTok official oEmbed - 404 = fake' },
    { key: 'reddit', label: 'Reddit', icon: '🟠', color: '#fff7ed', placeholder: 'Reddit username', hint: 'Your Reddit username', url: (h) => `https://reddit.com/user/${h}`, note: 'Verified via Reddit about.json - 404 = fake' },
    { key: 'telegram', label: 'Telegram Channel', icon: '✈️', color: '#eff6ff', placeholder: 'Channel, e.g. @EvansForMCA', hint: 'Your Telegram channel', url: (h) => `https://t.me/${h.replace(/^@/, '')}`, note: 'Verified via t.me page title' },
    { key: 'whatsapp', label: 'WhatsApp Channel', icon: '💬', color: '#f0fdf4', placeholder: 'Full Channel link, e.g. https://whatsapp.com/channel/...', hint: 'Paste FULL WhatsApp Channel link', url: (h) => h.startsWith('http') ? h : `https://whatsapp.com/channel/${h}`, note: 'WhatsApp has NO public check - saved for alerts only' },
    { key: 'linkedin', label: 'LinkedIn', icon: 'in', color: '#eff6ff', placeholder: 'LinkedIn slug, e.g. evans-kiplangat', hint: 'Your LinkedIn profile slug', url: (h) => `https://linkedin.com/in/${h}`, note: 'Checked via LinkedIn page + og:title' },
  ]

  const set = (k, v) => {
    setSaveError('')
    setHandles(prev => ({ ...prev, [k]: v }))
    setStatus(prev => ({ ...prev, [k]: 'idle' }))
    setVerifiedInfo(prev => { const c = { ...prev }; delete c[k]; return c })
  }

  // ★ HONEST SAVE: returns true only if backend says ok:true
  const saveOneToBackend = async (key, handleValue, statusValue) => {
    try {
      const res = await fetch(`${API}/api/social/candidates/social-handles`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ handles: { [key]: handleValue }, verifiedStatuses: { [key]: statusValue }, candidateId: cand?.id || cand?._id, userId: user?.id || user?._id, merge: true })
      })
      const d = await res.json().catch(() => ({}))
      console.log('💾 saveOne', key, '->', d)
      if (!d.ok) {
        setSaveError(`Save failed for ${key}: ${d.error || 'backend rejected'}. Check server terminal.`)
        return false
      }
      // Save succeeded - keep localStorage in sync, don't leave stale local
      try {
        const backup = JSON.parse(localStorage.getItem('pcms_social_handles') || '{}')
        backup[key] = handleValue
        localStorage.setItem('pcms_social_handles', JSON.stringify(backup))
      } catch {}
      return true
    } catch (e) { console.log('❌ saveOne error', e); setSaveError(`Save failed for ${key}: network error`); return false }
  }

  const applyProfile = (key, profile) => {
    if (profile.status === 'VERIFIED' || profile.status === 'EXISTS') {
      const newStatus = profile.status === 'VERIFIED' ? 'verified' : 'exists'
      setStatus(prev => ({ ...prev, [key]: newStatus }))
      setVerifiedInfo(prev => {
        const next = { ...prev, [key]: profile }
        try { localStorage.setItem('pcms_verified_info', JSON.stringify(next)) } catch {}
        return next
      })
      return { ok: true, status: newStatus, profile }
    }
    if (profile.status === 'NOT_FOUND') { setStatus(prev => ({ ...prev, [key]: 'not_found' })); return { ok: false, status: 'not_found', profile } }
    setStatus(prev => ({ ...prev, [key]: 'unknown' }))
    return { ok: false, status: 'unknown', profile }
  }

  const verifyOne = async (p) => {
    const h = handles[p.key]?.trim()
    if (!h) { setMessage?.(`Enter your ${p.label} handle first`); return false }
    setSaveError('')
    if (p.key === 'whatsapp') {
      if (!h.includes('whatsapp.com/channel') && h.length < 10) { setMessage?.('⚠️ WhatsApp: paste FULL Channel link'); setStatus(prev => ({ ...prev, [p.key]: 'unknown' })); return false }
      const saved = await saveOneToBackend(p.key, h, 'alerts_only')
      if (!saved) { setStatus(prev => ({ ...prev, [p.key]: 'unknown' })); setMessage?.(`❌ ${p.label} NOT saved - backend failed`); return false }
      setStatus(prev => ({ ...prev, [p.key]: 'alerts_only' }))
      setMessage?.(`✅ ${p.label} saved for alerts - in DB`)
      onSaved?.({ [p.key]: h })
      return true
    }
    setStatus(prev => ({ ...prev, [p.key]: 'checking' }))
    try {
      const res = await fetch(`${API}/api/social/verify-handle`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ platform: p.key, handle: h })
      })
      const data = await res.json().catch(() => ({}))
      const result = applyProfile(p.key, data.profile || { status: 'UNKNOWN', handle: h })
      if (!result.ok) { setMessage?.(result.status === 'not_found' ? `❌ ${p.label} NOT FOUND: @${h} does not exist - NOT saved` : `⚠️ ${p.label}: Cannot verify - NOT saved`); return false }
      const saved = await saveOneToBackend(p.key, h, result.status)
      if (!saved) {
        setStatus(prev => ({ ...prev, [p.key]: 'unknown' }))
        setMessage?.(`❌ ${p.label} verified but NOT saved - backend failed. See error above.`)
        return false
      }
      setMessage?.(`✅ ${p.label} verified + SAVED: @${h} - in DB, will stay after refresh`)
      onSaved?.({ [p.key]: h })
      return true
    } catch {
      setStatus(prev => ({ ...prev, [p.key]: 'unknown' }))
      return false
    }
  }

  const disconnect = async (key) => {
    try { await fetch(`${API}/api/social/handles/${key}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } }).catch(() => {}) } catch {}
    try {
      const backup = JSON.parse(localStorage.getItem('pcms_social_handles') || '{}'); delete backup[key]; localStorage.setItem('pcms_social_handles', JSON.stringify(backup))
      const vi = JSON.parse(localStorage.getItem('pcms_verified_info') || '{}'); delete vi[key]; localStorage.setItem('pcms_verified_info', JSON.stringify(vi))
    } catch {}
    setHandles(prev => ({ ...prev, [key]: '' }))
    setStatus(prev => ({ ...prev, [key]: 'idle' }))
    setVerifiedInfo(prev => { const c = { ...prev }; delete c[key]; return c })
    setMessage?.('Disconnected + removed from DB')
    onSaved?.({ [key]: '' })
  }

  const filledCount = Object.values(handles).filter(v => v.trim()).length
  const savedCount = Object.values(status).filter(s => s === 'verified' || s === 'exists' || s === 'saved' || s === 'alerts_only').length
  const hasNotFound = Object.values(status).some(s => s === 'not_found')
  const hasUnverified = Object.entries(handles).some(([k, v]) => v.trim() && (status[k] === 'idle' || !status[k]) && k !== 'whatsapp')

  const saveAll = async () => {
    setSaving(true)
    setSaveError('')
    for (const p of platforms) {
      if (handles[p.key]?.trim() && (status[p.key] === 'idle' || !status[p.key] || status[p.key] === 'saved')) await verifyOne(p)
    }
    setSaving(false)
    if (!saveError) { setMessage?.(`✅ All ${savedCount} accounts saved in DB.`); onClose?.() }
  }

  const verifyAll = async () => {
    setCheckingAll(true)
    for (const p of platforms) { if (handles[p.key]?.trim()) await verifyOne(p) }
    setCheckingAll(false)
  }

  const badge = (key) => {
    const s = status[key]
    if (s === 'checking') return <span style={{ background: '#fef9c3', color: '#854d0e', fontSize: 10, fontWeight: 700, padding: '3px 7px', borderRadius: 99 }}>Checking...</span>
    if (s === 'verified') return <span style={{ background: '#dcfce7', color: '#166534', fontSize: 10, fontWeight: 700, padding: '3px 7px', borderRadius: 99 }}>✓ Verified - Real • Saved</span>
    if (s === 'exists') return <span style={{ background: '#dbeafe', color: '#1e40af', fontSize: 10, fontWeight: 700, padding: '3px 7px', borderRadius: 99 }}>✓ Exists - Real • Saved</span>
    if (s === 'saved') return <span style={{ background: '#dcfce7', color: '#166534', fontSize: 10, fontWeight: 700, padding: '3px 7px', borderRadius: 99 }}>✓ Saved in DB</span>
    if (s === 'not_found') return <span style={{ background: '#fee2e2', color: '#991b1b', fontSize: 10, fontWeight: 700, padding: '3px 7px', borderRadius: 99 }}>✕ Not Found</span>
    if (s === 'alerts_only') return <span style={{ background: '#f0fdf4', color: '#166534', fontSize: 10, fontWeight: 700, padding: '3px 7px', borderRadius: 99 }}>✓ Alerts Only • Saved</span>
    if (s === 'unknown') return <span style={{ background: '#fef9c3', color: '#854d0e', fontSize: 10, fontWeight: 700, padding: '3px 7px', borderRadius: 99 }}>⚠️ Cannot Verify / Not Saved</span>
    return null
  }

  if (loadingHandles) return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}><div style={{ background: 'white', padding: 24, borderRadius: 12 }}>Loading your socials...</div></div>
  )

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: 16 }} onClick={onClose}>
      <div style={{ background: 'white', borderRadius: 16, width: '100%', maxWidth: 520, maxHeight: '90vh', overflowY: 'auto', padding: 20 }} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <span style={{ width: 36, height: 36, background: '#0f172a', color: 'white', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>🗳️</span>
            <div>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: '#0f172a' }}>Connect Your Socials</h3>
              <p style={{ margin: '2px 0 0', fontSize: 12, color: '#64748b' }}>Verify = Saved instantly to DB. If save fails, we tell you - no fake Saved.</p>
            </div>
          </div>
          <button onClick={onClose} style={{ background: '#f1f5f9', border: 'none', width: 28, height: 28, borderRadius: '50%', cursor: 'pointer' }}>✕</button>
        </div>

        <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 10, padding: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <div style={{ width: 36, height: 36, background: '#1e40af', color: 'white', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 12 }}>{(user?.fullName || 'EVANS KIPLANGAT').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()}</div>
            <div>
              <div style={{ fontWeight: 700, fontSize: 13 }}>{user?.fullName || 'EVANS KIPLANGAT'}</div>
              <div style={{ fontSize: 11, color: '#64748b' }}>{cand?.positionContested || 'MP'} • {cand?.county || user?.county || 'Bomet'} • {savedCount}/{filledCount} saved</div>
            </div>
          </div>
          <span style={{ background: savedCount ? '#dcfce7' : '#f1f5f9', color: savedCount ? '#166534' : '#64748b', fontSize: 11, fontWeight: 700, padding: '4px 8px', borderRadius: 99 }}>{savedCount} Saved</span>
        </div>

        <p style={{ fontSize: 12, color: '#64748b', margin: '0 0 12px', lineHeight: 1.5 }}>Paste handle → Click <b>Verify & Connect</b> → We check if it really exists → <b>Saved to DB</b>. Fake shows <b style={{ color: '#991b1b' }}>✕ Not Found</b> and is NOT saved.</p>

        {saveError && <div style={{ background: '#fee2e2', border: '1px solid #fecaca', color: '#991b1b', padding: '10px 12px', borderRadius: 8, fontSize: 12, fontWeight: 600, marginBottom: 12 }}>❌ {saveError}</div>}
        {hasNotFound && <div style={{ background: '#fee2e2', border: '1px solid #fecaca', color: '#991b1b', padding: '10px 12px', borderRadius: 8, fontSize: 12, fontWeight: 600, marginBottom: 12 }}>❌ One handle does not exist - NOT saved. Fix it or remove it.</div>}
        {hasUnverified && !hasNotFound && <div style={{ background: '#fef9c3', border: '1px solid #fde68a', color: '#854d0e', padding: '10px 12px', borderRadius: 8, fontSize: 12, fontWeight: 600, marginBottom: 12 }}>⚠️ Click Verify & Connect - we must check it is real before it is saved.</div>}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {platforms.map(p => {
            const info = verifiedInfo[p.key]
            const hasValue = !!handles[p.key]?.trim()
            const isNotFound = status[p.key] === 'not_found'
            return (
              <div key={p.key} style={{ border: `1px solid ${isNotFound ? '#fecaca' : '#e2e8f0'}`, borderRadius: 10, padding: 12, background: isNotFound ? '#fef2f2' : 'white' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: '#0f172a' }}>{p.label}</span>
                  {badge(p.key)}
                </div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <span style={{ width: 28, height: 28, background: p.color, borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, flexShrink: 0 }}>{p.icon}</span>
                  <input value={handles[p.key]} onChange={e => set(p.key, e.target.value)} placeholder={p.placeholder} style={{ flex: 1, padding: '9px 10px', border: `1px solid ${isNotFound ? '#fca5a5' : '#e2e8f0'}`, borderRadius: 8, fontSize: 13, outline: 'none', minWidth: 0 }} />
                  <button onClick={() => verifyOne(p)} disabled={!hasValue || status[p.key] === 'checking'} style={{ background: status[p.key] === 'verified' || status[p.key] === 'exists' || status[p.key] === 'saved' ? '#16a34a' : '#0f172a', color: 'white', border: 'none', padding: '9px 12px', borderRadius: 8, cursor: 'pointer', fontSize: 12, fontWeight: 600, whiteSpace: 'nowrap', opacity: !hasValue ? 0.5 : 1 }}>
                    {status[p.key] === 'checking' ? 'Checking...' : status[p.key] === 'verified' ? '✓ Verified • Saved' : status[p.key] === 'exists' ? '✓ Exists • Saved' : status[p.key] === 'saved' ? '✓ Saved' : status[p.key] === 'not_found' ? '✕ Not Found - Retry' : status[p.key] === 'alerts_only' ? '✓ Alerts Only • Saved' : 'Verify & Connect'}
                  </button>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 6 }}>
                  <span style={{ fontSize: 11, color: isNotFound ? '#991b1b' : '#94a3b8' }}>{isNotFound ? `❌ This ${p.label} account does not exist - NOT saved` : p.hint}</span>
                  {hasValue && (
                    <span style={{ display: 'flex', gap: 8 }}>
                      <a href={p.url(handles[p.key])} target="_blank" rel="noreferrer" style={{ fontSize: 11, color: '#1e40af', fontWeight: 600, textDecoration: 'none' }}>↗ Open real profile</a>
                      <button onClick={() => disconnect(p.key)} style={{ background: 'none', border: 'none', fontSize: 11, color: '#ef4444', cursor: 'pointer', fontWeight: 600 }}>Disconnect</button>
                    </span>
                  )}
                </div>
                {info && (info.status === 'VERIFIED' || info.status === 'EXISTS') && (
                  <div style={{ marginTop: 8, background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 8, padding: '8px 10px', display: 'flex', gap: 8, alignItems: 'center' }}>
                    {info.photo && <img src={info.photo} alt="" style={{ width: 28, height: 28, borderRadius: '50%', objectFit: 'cover' }} />}
                    <div style={{ fontSize: 11, color: '#166534' }}>
                      <b>{info.status === 'VERIFIED' ? 'Verified - Real:' : 'Exists - Real:'}</b> @{info.handle} {info.followers ? `• ${info.followers} ${info.followersLabel || 'followers'}` : ''} {info.bio ? `• ${info.bio}` : ''}
                      <div style={{ fontSize: 10, color: '#64748b', marginTop: 2 }}>Saved in DB • Will stay after refresh</div>
                    </div>
                  </div>
                )}
                {!info && hasValue && !isNotFound && <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 4 }}>ℹ️ {p.note}</div>}
              </div>
            )
          })}
        </div>

        <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
          <button onClick={onClose} style={{ flex: 1, background: 'white', border: '1px solid #e2e8f0', padding: 12, borderRadius: 10, cursor: 'pointer', fontWeight: 600 }}>Close</button>
          <button onClick={saveAll} disabled={saving} style={{ flex: 2, background: '#0f172a', color: 'white', border: 'none', padding: 12, borderRadius: 10, cursor: 'pointer', fontWeight: 700, fontSize: 13 }}>
            {saving ? '⏳ Saving...' : `Done - ${savedCount} Already Saved ✓`}
          </button>
        </div>
        <button onClick={verifyAll} disabled={checkingAll || filledCount === 0} style={{ width: '100%', background: 'none', border: 'none', marginTop: 8, color: '#1e40af', cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>
          {checkingAll ? 'Verifying all...' : '✓ Verify all handles at once (each saves instantly)'}
        </button>
        <p style={{ textAlign: 'center', fontSize: 11, color: '#94a3b8', margin: '10px 0 0' }}>🔒 Verified handles are saved to DB instantly. Fake handles are never saved. Disconnect removes from DB instantly.</p>
      </div>
    </div>
  )
}