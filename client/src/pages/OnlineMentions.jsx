import { useState, useEffect, useCallback } from 'react'
import { API } from '../api'
import ConnectSocials from '../components/ConnectSocials'

// Online Mentions - PROFESSIONAL - MATCHES NEW CandidateDashboard JPEG
// ★ SINGLE SOURCE OF TRUTH = GET /api/social/handles + GET /api/social/mentions?counts=1
// ★ ALL 8 PLATFORMS: News + YouTube + Reddit + X + Facebook + TikTok + Telegram + Instagram
// ★ POLITICS ONLY
export default function OnlineMentions({ token, user, myData, setMessage, onRefreshOverview }) {
  const [mentions, setMentions] = useState([])
  const [loading, setLoading] = useState(false)
  const [fetching, setFetching] = useState('') // 'news' | 'socials' | 'all' | ''

  const [liveHandles, setLiveHandles] = useState({})
  const [liveKeywords, setLiveKeywords] = useState([])
  const [liveLoading, setLiveLoading] = useState(true)
  // ★ NEW: perPlatform from backend - for pills + bars
  const [perPlatform, setPerPlatform] = useState({ All: 0, News: 0, YouTube: 0, Reddit: 0, X: 0, Facebook: 0, TikTok: 0, Telegram: 0, Instagram: 0 })

  const [showConnect, setShowConnect] = useState(false)
  const [showManual, setShowManual] = useState(false)
  const [manual, setManual] = useState({ platform: 'Facebook', text: '', author: '', url: '' })
  const [search, setSearch] = useState('')
  const [filterSource, setFilterSource] = useState('All Sources')
  const [filterSentiment, setFilterSentiment] = useState('All Sentiments')
  const [filterPlatform, setFilterPlatform] = useState('All Platforms')

  const ALL_PLATFORMS = ['News', 'YouTube', 'Reddit', 'X', 'Facebook', 'TikTok', 'Telegram', 'Instagram']
  const PLATFORM_ICONS = { News: '📰', YouTube: '▶️', Reddit: '🟠', X: '𝕏', Facebook: '📘', TikTok: '🎵', Telegram: '✈️', Instagram: '📸' }

  const fetchLive = useCallback(async () => {
    try {
      const r = await fetch(`${API}/api/social/handles`, { headers: { Authorization: `Bearer ${token}` } })
      const d = await r.json().catch(() => ({}))
      if (d.handles) {
        setLiveHandles(d.handles)
        try { localStorage.setItem('pcms_social_handles', JSON.stringify(d.handles)) } catch {}
      }
      if (Array.isArray(d.keywords)) {
        setLiveKeywords(d.keywords)
        try { localStorage.setItem('pcms_keywords', JSON.stringify(d.keywords)) } catch {}
      }
    } catch {
      try {
        const h = myData?.myCandidate?.socialHandles || user?.socialHandles || JSON.parse(localStorage.getItem('pcms_social_handles') || '{}')
        const k = myData?.myCandidate?.keywords || user?.keywords || JSON.parse(localStorage.getItem('pcms_keywords') || '[]')
        setLiveHandles(h || {})
        setLiveKeywords(k || [])
      } catch {}
    }
    setLiveLoading(false)
  }, [token, myData, user])

  // ★ FIXED: Use ?counts=1 to get perPlatform - pills need this
  const fetchMentions = useCallback(async () => {
    setLoading(true)
    try {
      const r = await fetch(`${API}/api/social/mentions?counts=1`, { headers: { Authorization: `Bearer ${token}` } })
      const d = await r.json().catch(() => [])
      const list = Array.isArray(d) ? d : (d.mentions || [])
      setMentions(list)
      const counts = d.perPlatform || d.counts || null
      if (counts) setPerPlatform({ All: list.length, News: 0, YouTube: 0, Reddit: 0, X: 0, Facebook: 0, TikTok: 0, Telegram: 0, Instagram: 0, ...counts })
      else {
        const pp = { All: list.length, News: 0, YouTube: 0, Reddit: 0, X: 0, Facebook: 0, TikTok: 0, Telegram: 0, Instagram: 0 }
        list.forEach(m => { if (pp[m.platform] !== undefined) pp[m.platform]++ })
        setPerPlatform(pp)
      }
    } catch { setMentions([]) }
    setLoading(false)
  }, [token])

  useEffect(() => { fetchLive(); fetchMentions() }, [fetchLive, fetchMentions])

  useEffect(() => {
    const t = setInterval(() => { fetchMentions(); fetchLive() }, 10 * 60 * 1000)
    return () => clearInterval(t)
  }, [fetchMentions, fetchLive])

  const handles = liveHandles
  const keywords = liveKeywords
  // ★ FIXED: /8 not /9 - count only social handles, News is via Google News
  const SOCIAL_KEYS = ['youtube', 'reddit', 'x', 'twitter', 'facebook', 'tiktok', 'telegram', 'instagram']
  const connectedCount = Object.keys(handles).filter(k => SOCIAL_KEYS.includes(String(k).toLowerCase()) && handles[k]).length
  const hasKeywords = keywords.length > 0
  const connectedList = Object.entries(handles).filter(([k, v]) => v && SOCIAL_KEYS.includes(String(k).toLowerCase())).map(([k, v]) => `${k}: @${v}`).join(' • ')
  const firstName = (user?.fullName || 'Candidate').split(' ')[0]

  const doFetch = async (kind) => {
    setFetching(kind)
    try {
      const endpoint = kind === 'news' ? 'fetch-news' : kind === 'socials' ? 'fetch-socials' : 'fetch-all'
      const r = await fetch(`${API}/api/social/${endpoint}`, { method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ keywords, handles }) })
      const d = await r.json().catch(() => ({}))
      setMessage?.(d.message || 'Scan done')
      await fetchMentions()
      onRefreshOverview?.()
    } catch { setMessage?.('❌ Fetch failed - check server') }
    setFetching('')
  }

  const addManual = async () => {
    if (!manual.text.trim()) { setMessage?.('Write the mention text first'); return }
    try {
      const r = await fetch(`${API}/api/social/mentions`, { method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify(manual) })
      if (r.ok) { setMessage?.('✅ Manual mention saved'); setShowManual(false); setManual({ platform: 'Facebook', text: '', author: '', url: '' }); await fetchMentions() }
      else setMessage?.('❌ Failed to save mention')
    } catch { setMessage?.('❌ Failed to save mention') }
  }

  const filtered = mentions.filter(m => {
    if (search && !`${m.text} ${m.author} ${m.platform}`.toLowerCase().includes(search.toLowerCase())) return false
    if (filterSource !== 'All Sources' && m.sourceType !== filterSource && m.source !== filterSource) return false
    if (filterSentiment !== 'All Sentiments' && m.sentiment !== filterSentiment) return false
    if (filterPlatform !== 'All Platforms' && m.platform !== filterPlatform) return false
    return true
  })
  const total = mentions.length
  const manualCount = mentions.filter(m => m.sourceType === 'MANUAL' || m.source === 'MANUAL').length
  const newsCount = mentions.filter(m => m.sourceType === 'AUTO-NEWS').length
  const socialCount = mentions.filter(m => m.sourceType === 'AUTO-SOCIAL').length
  const posCount = mentions.filter(m => m.sentiment === 'Positive').length
  const negCount = mentions.filter(m => m.sentiment === 'Negative').length
  const neuCount = mentions.filter(m => m.sentiment !== 'Positive' && m.sentiment !== 'Negative').length
  const maxPlatform = Math.max(...ALL_PLATFORMS.map(p => perPlatform[p] || 0), 1)

  const sentimentColor = (s) => s === 'Positive' ? { background: '#dcfce7', color: '#166534' } : s === 'Negative' ? { background: '#fee2e2', color: '#991b1b' } : { background: '#f1f5f9', color: '#64748b' }
  // ★ FIXED: Show source correctly - Instagram • Auto Social, NOT Instagram • Instagram
  const sourceLabel = (m) => {
    if (m.sourceType === 'MANUAL' || m.source === 'MANUAL') return 'Manual'
    if (m.sourceType === 'AUTO-NEWS') return 'Google News'
    if (m.sourceType === 'AUTO-SOCIAL') return 'Auto Social'
    return m.sourceType || m.source || 'Manual'
  }

  return (
    <div style={{ fontFamily: "'Inter', system-ui, sans-serif" }}>
      {/* ★ JPEG-style Header Banner - Light Blue */}
      <div style={{ background: '#eef4ff', borderRadius: 14, padding: 20, marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
        <div style={{ flex: 1, minWidth: 260 }}>
          <h2 style={{ margin: '0 0 4px', fontSize: 20, fontWeight: 800, color: '#0f172a' }}>Online Mentions <span style={{ background: '#0f172a', color: 'white', fontSize: 10, padding: '2px 7px', borderRadius: 99 }}>POLITICS ONLY • 8 PLATFORMS</span></h2>
          <p style={{ margin: 0, fontSize: 13, color: '#475569' }}>Hi {firstName} - what people say about you on <b>Google News + YouTube + Reddit + X + Facebook + TikTok + Telegram + Instagram</b>. Manual + Auto • Saved to backend.</p>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 10 }}>
            <span style={{ background: 'white', border: '1px solid #e5e7eb', padding: '5px 10px', borderRadius: 99, fontSize: 12, fontWeight: 600 }}>👤 {user?.fullName || 'Candidate'}</span>
            <span style={{ background: 'white', border: '1px solid #e5e7eb', padding: '5px 10px', borderRadius: 99, fontSize: 12, fontWeight: 600 }}>🔄 Auto-refresh every 10 min</span>
            <span style={{ background: connectedCount ? '#dcfce7' : '#fef9c3', color: connectedCount ? '#166534' : '#854d0e', padding: '5px 10px', borderRadius: 99, fontSize: 12, fontWeight: 600 }}>
              {liveLoading ? '⏳ Loading socials...' : connectedCount ? `✅ ${connectedCount}/8 socials connected` : '📌 0/8 socials connected'}
            </span>
          </div>
          {hasKeywords && (
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 8 }}>
              <span style={{ fontSize: 11, color: '#64748b', fontWeight: 700, alignSelf: 'center' }}>🔑 Keywords:</span>
              {keywords.slice(0, 8).map(k => <span key={k} style={{ background: '#dbeafe', color: '#1e40af', padding: '3px 8px', borderRadius: 99, fontSize: 11, fontWeight: 600 }}>{k}</span>)}
              {keywords.length > 8 && <span style={{ fontSize: 11, color: '#64748b' }}>+{keywords.length - 8} more</span>}
            </div>
          )}
          {!hasKeywords && <span style={{ display: 'inline-block', background: '#fef9c3', color: '#854d0e', padding: '5px 10px', borderRadius: 99, fontSize: 12, fontWeight: 600, marginTop: 8 }}>⚠️ No keywords yet - set them in Candidate Setup</span>}
          {connectedCount > 0 && <p style={{ fontSize: 12, color: '#64748b', margin: '8px 0 0' }}>Connected: {connectedList}</p>}
        </div>
        <button onClick={() => { setMessage?.('Opening Candidate Setup - set keywords to scan'); window.location.hash = '#candidate-setup' }} style={{ background: '#0f172a', color: 'white', border: 'none', padding: '10px 14px', borderRadius: 8, cursor: 'pointer', fontSize: 12, fontWeight: 700, whiteSpace: 'nowrap' }}>⚙️ Set Up Candidate & Keywords</button>
      </div>

      {/* ★ Actions - 3 Fetch buttons like Dashboard */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
        <button onClick={() => doFetch('news')} disabled={!!fetching} style={{ background: '#2563eb', color: 'white', border: 'none', padding: '10px 16px', borderRadius: 8, cursor: 'pointer', fontSize: 12, fontWeight: 700 }}>{fetching === 'news' ? '⏳ Fetching...' : '📰 Fetch Google News'}</button>
        <button onClick={() => doFetch('socials')} disabled={!!fetching} style={{ background: 'white', border: '1px solid #e5e7eb', padding: '10px 14px', borderRadius: 8, cursor: 'pointer', fontSize: 12, fontWeight: 700 }}>{fetching === 'socials' ? '⏳ Fetching...' : '📱 Fetch Auto Socials (7)'}</button>
        <button onClick={() => doFetch('all')} disabled={!!fetching} style={{ background: '#0f172a', color: 'white', border: 'none', padding: '10px 16px', borderRadius: 8, cursor: 'pointer', fontSize: 12, fontWeight: 700 }}>{fetching === 'all' ? '⏳ Fetching...' : '🚀 Fetch All (8 Platforms)'}</button>
        <button onClick={() => setShowManual(true)} style={{ background: 'white', border: '1px solid #e5e7eb', padding: '10px 14px', borderRadius: 8, cursor: 'pointer', fontSize: 12, fontWeight: 700 }}>✏️ Add Manual</button>
        <button onClick={() => setShowConnect(true)} style={{ background: 'white', border: '1px solid #e5e7eb', padding: '10px 14px', borderRadius: 8, cursor: 'pointer', fontSize: 12, fontWeight: 700 }}>🔗 Connect Socials</button>
        <span style={{ marginLeft: 'auto', fontSize: 12, color: '#16a34a', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>● Auto-save to DB • Live</span>
      </div>

      {/* ★ Stats - 6 cards like JPEG */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 10, marginBottom: 16 }}>
        {[
          { label: 'Total', value: total, sub: 'All saved to DB' },
          { label: 'Manual', value: manualCount, sub: 'You added' },
          { label: 'Auto News', value: newsCount, sub: 'Google News' },
          { label: 'Auto Social', value: socialCount, sub: '7 socials' },
          { label: 'Positive', value: posCount, sub: 'Good sentiment' },
          { label: 'Negative', value: negCount, sub: 'Needs attention' },
        ].map(s => (
          <div key={s.label} style={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: 12, padding: 14, boxShadow: '0 1px 2px rgba(0,0,0,0.04)' }}>
            <div style={{ fontSize: 24, fontWeight: 900, color: '#0f172a' }}>{s.value}</div>
            <div style={{ fontSize: 12, fontWeight: 700 }}>{s.label}</div>
            <div style={{ fontSize: 11, color: '#94a3b8' }}>{s.sub}</div>
          </div>
        ))}
      </div>

      {/* ★ NEW: Mentions by Platform - Horizontal Bars like Dashboard JPEG */}
      <div style={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: 14, padding: 18, marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800 }}>Mentions by Platform - All 8</h3>
          <span style={{ fontSize: 12, color: '#64748b' }}>{perPlatform.All} total • {posCount} 👍 • {negCount} 👎 • {neuCount} 😐</span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 14 }}>
          {ALL_PLATFORMS.map(p => {
            const count = perPlatform[p] || 0
            const pct = maxPlatform ? Math.round((count / maxPlatform) * 100) : 0
            const active = filterPlatform === p
            return (
              <div key={p} onClick={() => setFilterPlatform(active ? 'All Platforms' : p)} style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', background: active ? '#eef4ff' : 'transparent', padding: '4px 8px', borderRadius: 8 }}>
                <span style={{ fontSize: 16, width: 22, textAlign: 'center' }}>{PLATFORM_ICONS[p]}</span>
                <span style={{ fontSize: 13, fontWeight: 600, width: 100, flexShrink: 0 }}>{p === 'News' ? 'Google News' : p === 'X' ? 'X (Twitter)' : p}</span>
                <div style={{ flex: 1, height: 9, background: '#e5e7eb', borderRadius: 99, overflow: 'hidden' }}><div style={{ width: `${pct}%`, height: '100%', background: '#2563eb', borderRadius: 99 }} /></div>
                <span style={{ fontSize: 13, fontWeight: 700, width: 32, textAlign: 'right' }}>{count}</span>
              </div>
            )
          })}
        </div>
        <p style={{ fontSize: 11, color: '#94a3b8', margin: '10px 0 0' }}>Click a platform row to filter the list below. Click again to show All.</p>
      </div>

      {/* ★ Filters - Search + Pills */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="🔍 Search mentions..." style={{ flex: 1, minWidth: 180, padding: '10px 12px', border: '1px solid #e5e7eb', borderRadius: 10, fontSize: 13, outline: 'none', background: 'white' }} />
        <select value={filterSource} onChange={e => setFilterSource(e.target.value)} style={{ padding: '10px', border: '1px solid #e5e7eb', borderRadius: 10, fontSize: 12, background: 'white' }}><option>All Sources</option><option>MANUAL</option><option>AUTO-NEWS</option><option>AUTO-SOCIAL</option></select>
        <select value={filterSentiment} onChange={e => setFilterSentiment(e.target.value)} style={{ padding: '10px', border: '1px solid #e5e7eb', borderRadius: 10, fontSize: 12, background: 'white' }}><option>All Sentiments</option><option>Positive</option><option>Neutral</option><option>Negative</option></select>
        <button onClick={() => { fetchMentions(); fetchLive(); onRefreshOverview?.() }} style={{ background: 'white', border: '1px solid #e5e7eb', padding: '10px 12px', borderRadius: 10, cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>↻ Refresh from DB</button>
      </div>

      {/* ★ Platform Pills - All 8 */}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 14 }}>
        {['All Platforms', ...ALL_PLATFORMS].map(p => {
          const active = filterPlatform === p
          const count = p === 'All Platforms' ? perPlatform.All : (perPlatform[p] || 0)
          return (
            <button key={p} onClick={() => setFilterPlatform(p)} style={{ background: active ? '#0f172a' : 'white', color: active ? 'white' : '#0f172a', border: '1px solid #e5e7eb', padding: '6px 12px', borderRadius: 99, cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>
              {p === 'All Platforms' ? 'All' : `${PLATFORM_ICONS[p]} ${p}`} ({count})
            </button>
          )
        })}
      </div>

      {/* List */}
      {loading ? <div style={{ textAlign: 'center', padding: 32, color: '#64748b' }}>Loading mentions...</div>
        : filtered.length === 0 ? (
          <div style={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: 14, padding: 32, textAlign: 'center' }}>
            <div style={{ fontSize: 32 }}>👀</div>
            <div style={{ fontWeight: 800, marginTop: 8 }}>No mentions yet</div>
            <p style={{ fontSize: 12, color: '#64748b', margin: '4px 0 14px' }}>{hasKeywords ? 'Set your keywords first, then fetch.' : 'Set keywords + connect socials, then fetch.'}</p>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap' }}>
              <button onClick={() => setShowConnect(true)} style={{ background: '#0f172a', color: 'white', border: 'none', padding: '10px 14px', borderRadius: 8, cursor: 'pointer', fontSize: 12, fontWeight: 700 }}>Connect Socials</button>
              <button onClick={() => doFetch('all')} style={{ background: 'white', border: '1px solid #e5e7eb', padding: '10px 14px', borderRadius: 8, cursor: 'pointer', fontSize: 12, fontWeight: 700 }}>🚀 Fetch All (8)</button>
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <p style={{ fontSize: 12, color: '#64748b', margin: 0 }}>Showing {filtered.length} of {total} mentions {filterPlatform !== 'All Platforms' ? `• Filter: ${filterPlatform}` : ''}</p>
            {filtered.map(m => (
              <div key={m._id || m.id || m.sourceUrl} style={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: 12, padding: 14, boxShadow: '0 1px 2px rgba(0,0,0,0.03)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                  {/* ★ FIXED: Platform • Source - Instagram • Auto Social, NOT Instagram • Instagram */}
                  <span style={{ fontSize: 12, fontWeight: 700, display: 'flex', gap: 6, alignItems: 'center' }}>
                    <span style={{ background: '#eef4ff', padding: '3px 8px', borderRadius: 99 }}>{PLATFORM_ICONS[m.platform] || '📰'} {m.platform}</span>
                    <span style={{ color: '#64748b', fontWeight: 600 }}>• {sourceLabel(m)}</span>
                    <span style={{ color: '#94a3b8', fontWeight: 500 }}>• {m.author || 'Unknown'}</span>
                  </span>
                  <span style={{ ...sentimentColor(m.sentiment), fontSize: 11, fontWeight: 700, padding: '4px 9px', borderRadius: 99 }}>{m.sentiment || 'Neutral'}</span>
                </div>
                <p style={{ fontSize: 13, margin: '10px 0', lineHeight: 1.6, color: '#0f172a' }}>{m.text || m.content}</p>
                {m.sourceUrl && <a href={m.sourceUrl} target="_blank" rel="noreferrer" style={{ fontSize: 12, color: '#2563eb', fontWeight: 600 }}>↗ Open source</a>}
                <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 4 }}>{m.sourceType || m.source} • {m.createdAt ? new Date(m.createdAt).toLocaleString() : ''}</div>
              </div>
            ))}
          </div>
        )}

      {showManual && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200, padding: 16 }} onClick={() => setShowManual(false)}>
          <div style={{ background: 'white', borderRadius: 14, padding: 20, width: '100%', maxWidth: 420 }} onClick={e => e.stopPropagation()}>
            <h4 style={{ margin: '0 0 12px', fontWeight: 800 }}>Add Manual Mention</h4>
            <select value={manual.platform} onChange={e => setManual({ ...manual, platform: e.target.value })} style={{ width: '100%', padding: 10, border: '1px solid #e5e7eb', borderRadius: 8, marginBottom: 10 }}><option>Facebook</option><option>X</option><option>YouTube</option><option>Reddit</option><option>Telegram</option><option>Instagram</option><option>TikTok</option><option>News</option></select>
            <input value={manual.author} onChange={e => setManual({ ...manual, author: e.target.value })} placeholder="Author (optional)" style={{ width: '100%', padding: 10, border: '1px solid #e5e7eb', borderRadius: 8, marginBottom: 10 }} />
            <textarea value={manual.text} onChange={e => setManual({ ...manual, text: e.target.value })} placeholder="What did they say about you?" rows={4} style={{ width: '100%', padding: 10, border: '1px solid #e5e7eb', borderRadius: 8, marginBottom: 10 }} />
            <input value={manual.url} onChange={e => setManual({ ...manual, url: e.target.value })} placeholder="Source link (optional)" style={{ width: '100%', padding: 10, border: '1px solid #e5e7eb', borderRadius: 8, marginBottom: 12 }} />
            <div style={{ display: 'flex', gap: 8 }}><button onClick={() => setShowManual(false)} style={{ flex: 1, padding: 10, borderRadius: 8, border: '1px solid #e5e7eb', background: 'white', cursor: 'pointer' }}>Cancel</button><button onClick={addManual} style={{ flex: 1, padding: 10, borderRadius: 8, border: 'none', background: '#0f172a', color: 'white', cursor: 'pointer', fontWeight: 700 }}>Save Mention</button></div>
          </div>
        </div>
      )}

      {showConnect && (
        <ConnectSocials
          token={token} user={user} myData={myData}
          onClose={() => { setShowConnect(false); fetchLive(); fetchMentions(); onRefreshOverview?.() }}
          onSaved={() => { fetchLive(); fetchMentions(); onRefreshOverview?.() }}
          setMessage={setMessage}
        />
      )}

      <style>{`
        @media (max-width: 900px) {
          div[style*="grid-template-columns: repeat(6, 1fr)"] { grid-template-columns: repeat(2, 1fr) !important; }
        }
      `}</style>
    </div>
  )
}