import { useState, useEffect, useMemo } from 'react'
import { API } from '../api'
import ConnectSocials from '../components/ConnectSocials'

export default function SocialListening({ token, user, myData, setMessage, onGoCandidateSetup }) {
  const [mentions, setMentions] = useState([])
  const [loading, setLoading] = useState(false)
  const [fetching, setFetching] = useState('')
  const [search, setSearch] = useState('')
  const [filterSource, setFilterSource] = useState('ALL') // ALL | MANUAL | AUTO-NEWS | AUTO-SOCIAL
  const [filterSentiment, setFilterSentiment] = useState('ALL')
  const [filterPlatform, setFilterPlatform] = useState('ALL')
  const [showManualForm, setShowManualForm] = useState(false)
  const [showConnect, setShowConnect] = useState(false)
  const [manual, setManual] = useState({ platform: 'Facebook', text: '', author: '', url: '' })

  // --- Candidate identity - from backend, never hardcoded ---
  const cand = myData?.myCandidate || myData?.candidate || null
  const keywords = cand?.keywords || user?.keywords || user?.candidateProfile?.keywords || []
  const handles = cand?.socialHandles || user?.socialHandles || {}
  const connectedCount = Object.keys(handles).filter(k => handles[k]).length
  const candidateName = user?.fullName || cand?.fullName || 'Candidate'
  const authHeaders = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }

  const loadMentions = async () => {
    setLoading(true)
    try {
      const res = await fetch(`${API}/api/social/mentions`, { headers: { Authorization: `Bearer ${token}` } })
      const data = await res.json().catch(() => [])
      const list = Array.isArray(data) ? data : data.mentions || data.data || []
      setMentions(list)
    } catch (e) { console.log('mentions load', e) }
    setLoading(false)
  }

  useEffect(() => { if (token) loadMentions() }, [token])

  // Auto-refresh every 10 min - silent, no reload
  useEffect(() => {
    const t = setInterval(() => { loadMentions() }, 10 * 60 * 1000)
    return () => clearInterval(t)
  }, [token])

  const fetchAutoNews = async () => {
    setFetching('news')
    try {
      const res = await fetch(`${API}/api/social/fetch-news`, { method: 'POST', headers: authHeaders, body: JSON.stringify({ keywords, handles }) })
      const d = await res.json().catch(() => ({}))
      setMessage?.(d.message || `✅ Auto News fetched - ${d.count || 0} new`)
      loadMentions()
    } catch { setMessage?.('Auto News fetch failed - will retry in 10 min') }
    setFetching('')
  }

  const fetchAutoSocials = async () => {
    setFetching('socials')
    try {
      const res = await fetch(`${API}/api/social/fetch-socials`, { method: 'POST', headers: authHeaders, body: JSON.stringify({ keywords, handles }) })
      const d = await res.json().catch(() => ({}))
      setMessage?.(d.message || `✅ Auto Socials fetched - ${d.count || 0} new`)
      loadMentions()
    } catch { setMessage?.('Auto Socials fetch failed - will retry in 10 min') }
    setFetching('')
  }

  const addManual = async (e) => {
    e.preventDefault()
    if (!manual.text.trim()) return
    try {
      const res = await fetch(`${API}/api/social/mentions`, {
        method: 'POST', headers: authHeaders,
        body: JSON.stringify({ ...manual, candidateName, sourceType: 'MANUAL', sentiment: 'Neutral' })
      })
      if (res.ok) { setMessage?.('✅ Manual mention saved'); setShowManualForm(false); setManual({ platform: 'Facebook', text: '', author: '', url: '' }); loadMentions() }
      else setMessage?.('Failed to save manual mention')
    } catch { setMessage?.('Failed to save') }
  }

  // --- Filters ---
  const filtered = useMemo(() => {
    return mentions.filter(m => {
      if (filterSource !== 'ALL' && (m.sourceType || m.source) !== filterSource) return false
      if (filterSentiment !== 'ALL' && m.sentiment !== filterSentiment) return false
      if (filterPlatform !== 'ALL' && m.platform !== filterPlatform) return false
      if (search && !((m.text || '').toLowerCase().includes(search.toLowerCase()) || (m.author || '').toLowerCase().includes(search.toLowerCase()))) return false
      return true
    })
  }, [mentions, filterSource, filterSentiment, filterPlatform, search])

  const stats = useMemo(() => ({
    total: mentions.length,
    manual: mentions.filter(m => (m.sourceType || m.source) === 'MANUAL').length,
    news: mentions.filter(m => (m.sourceType || m.source) === 'AUTO-NEWS').length,
    social: mentions.filter(m => (m.sourceType || m.source) === 'AUTO-SOCIAL').length,
    positive: mentions.filter(m => m.sentiment === 'Positive').length,
    negative: mentions.filter(m => m.sentiment === 'Negative').length,
  }), [mentions])

  const platforms = ['ALL', ...new Set(mentions.map(m => m.platform).filter(Boolean))]
  const chip = { background: '#f8fafc', border: '1px solid #e2e8f0', padding: '5px 10px', borderRadius: 99, fontSize: 12, fontWeight: 600, color: '#334155' }
  const btn = { background: 'white', color: '#0f172a', border: '1px solid #e2e8f0', padding: '9px 14px', borderRadius: 8, cursor: 'pointer', fontWeight: 600, fontSize: 13 }
  const btnPrimary = { ...btn, background: '#1e40af', color: 'white', border: 'none' }
  const btnDark = { ...btn, background: '#0f172a', color: 'white', border: 'none' }

  return (
    <div>
      {/* ===== PROFESSIONAL HEADER ===== */}
      <div style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: 14, padding: 20, marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: 260 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <span style={{ width: 44, height: 44, background: '#eff6ff', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22 }}>👀</span>
              <div>
                <h2 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: '#0f172a' }}>Online Mentions</h2>
                <p style={{ margin: '2px 0 0', fontSize: 12, color: '#64748b' }}>Manual + Auto • Saved to backend • Shared across roles</p>
              </div>
            </div>
            <div style={{ marginTop: 14, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <span style={chip}>👤 {candidateName}</span>
              <span style={{ ...chip, background: '#f0fdf4', borderColor: '#bbf7d0', color: '#166534' }}>● Auto-refresh every 10 min</span>
              <span style={{ ...chip, background: '#eff6ff', borderColor: '#bfdbfe', color: '#1e40af' }}>🔑 {keywords.length ? keywords.join(', ') : 'No keywords yet'}</span>
              <span style={{ ...chip, background: connectedCount ? '#f0fdf4' : '#fef9c3', borderColor: connectedCount ? '#bbf7d0' : '#fde68a', color: connectedCount ? '#166534' : '#854d0e' }}>🔌 {connectedCount}/7 socials connected</span>
            </div>
            <p style={{ margin: '10px 0 0', fontSize: 12, color: '#94a3b8', lineHeight: 1.5 }}>
              Manual (you add) • Auto News (Google News, free) • Auto Socials (YouTube / Reddit free, X / FB / TikTok via your handles)
            </p>
          </div>
          <button onClick={onGoCandidateSetup} style={{ ...btnDark, padding: '10px 16px', whiteSpace: 'nowrap' }}>⚙️ Set Up Candidate & Keywords</button>
        </div>

        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 16, paddingTop: 16, borderTop: '1px solid #f1f5f9', alignItems: 'center' }}>
          <button onClick={fetchAutoNews} disabled={fetching} style={btnPrimary}>{fetching === 'news' ? '⏳ Fetching...' : '📰 Fetch Auto News'}</button>
          <button onClick={fetchAutoSocials} disabled={fetching} style={btn}>{fetching === 'socials' ? '⏳ Fetching...' : '🤖 Fetch Auto Socials'}</button>
          <button onClick={() => setShowManualForm(true)} style={btn}>✍️ Add Manual</button>
          <button onClick={() => setShowConnect(true)} style={btn}>🔌 Connect Socials</button>
          <span style={{ marginLeft: 'auto', fontSize: 12, color: '#94a3b8', display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ width: 8, height: 8, background: '#22c55e', borderRadius: '50%', display: 'inline-block' }} /> Auto-save to DB • Live
          </span>
        </div>
      </div>

      {/* ===== CONNECTED ACCOUNTS STRIP - shows real profiles, not keys ===== */}
      {connectedCount > 0 && (
        <div style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: 12, padding: '12px 16px', marginBottom: 16, display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: '#64748b' }}>CONNECTED:</span>
          {Object.entries(handles).filter(([, v]) => v).map(([platform, handle]) => (
            <span key={platform} style={{ background: '#f8fafc', border: '1px solid #e2e8f0', padding: '5px 10px', borderRadius: 99, fontSize: 12, fontWeight: 600, color: '#0f172a' }}>
              {platform === 'youtube' ? '▶️' : platform === 'x' ? '𝕏' : platform === 'facebook' ? 'f' : platform === 'instagram' ? '📸' : platform === 'tiktok' ? '🎵' : platform === 'reddit' ? '🟠' : '✈️'} @{handle.replace(/^[@/u]+/, '')} <span style={{ color: '#22c55e' }}>✓</span>
            </span>
          ))}
          <button onClick={() => setShowConnect(true)} style={{ marginLeft: 'auto', background: 'none', border: 'none', color: '#1e40af', cursor: 'pointer', fontSize: 12, fontWeight: 700 }}>Manage →</button>
        </div>
      )}

      {/* ===== STATS ===== */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 12, marginBottom: 16 }}>
        {[
          { label: 'Total', value: stats.total, sub: 'All saved to DB' },
          { label: 'Manual', value: stats.manual, sub: 'You added' },
          { label: 'Auto News', value: stats.news, sub: 'Google News' },
          { label: 'Auto Social', value: stats.social, sub: 'YouTube / Reddit / X / FB / TikTok' },
          { label: 'Positive', value: stats.positive, sub: 'Good sentiment' },
          { label: 'Negative', value: stats.negative, sub: 'Needs attention' },
        ].map(s => (
          <div key={s.label} style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: 12, padding: 14 }}>
            <div style={{ fontSize: 22, fontWeight: 800, color: '#0f172a' }}>{s.value}</div>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#0f172a' }}>{s.label}</div>
            <div style={{ fontSize: 11, color: '#94a3b8' }}>{s.sub}</div>
          </div>
        ))}
      </div>

      {/* ===== FILTERS ===== */}
      <div style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: 12, padding: 12, marginBottom: 16, display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="🔍 Search mentions..." style={{ flex: 1, minWidth: 180, padding: '9px 12px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 13, outline: 'none' }} />
        <select value={filterSource} onChange={e => setFilterSource(e.target.value)} style={{ padding: '9px 10px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 13 }}>
          <option value="ALL">All Sources</option><option value="MANUAL">Manual</option><option value="AUTO-NEWS">Auto News</option><option value="AUTO-SOCIAL">Auto Social</option>
        </select>
        <select value={filterSentiment} onChange={e => setFilterSentiment(e.target.value)} style={{ padding: '9px 10px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 13 }}>
          <option value="ALL">All Sentiments</option><option value="Positive">Positive</option><option value="Neutral">Neutral</option><option value="Negative">Negative</option>
        </select>
        <select value={filterPlatform} onChange={e => setFilterPlatform(e.target.value)} style={{ padding: '9px 10px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 13 }}>
          {platforms.map(p => <option key={p} value={p}>{p === 'ALL' ? 'All Platforms' : p}</option>)}
        </select>
        <button onClick={loadMentions} style={btn}>↻ Refresh from DB</button>
      </div>

      {/* ===== MANUAL FORM - clean modal, not a big box ===== */}
      {showManualForm && (
        <form onSubmit={addManual} style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: 12, padding: 16, marginBottom: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}><b style={{ color: '#0f172a' }}>Add Manual Mention</b><button type="button" onClick={() => setShowManualForm(false)} style={{ background: '#f1f5f9', border: 'none', width: 28, height: 28, borderRadius: '50%', cursor: 'pointer' }}>✕</button></div>
          <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
            <select value={manual.platform} onChange={e => setManual({ ...manual, platform: e.target.value })} style={{ padding: 10, borderRadius: 8, border: '1px solid #e2e8f0' }}>
              {['Facebook', 'X', 'Instagram', 'TikTok', 'YouTube', 'Reddit', 'Telegram', 'WhatsApp', 'News'].map(p => <option key={p}>{p}</option>)}
            </select>
            <input value={manual.author} onChange={e => setManual({ ...manual, author: e.target.value })} placeholder="Author / Page name" style={{ flex: 1, minWidth: 140, padding: 10, borderRadius: 8, border: '1px solid #e2e8f0' }} />
            <input value={manual.url} onChange={e => setManual({ ...manual, url: e.target.value })} placeholder="Link (optional)" style={{ flex: 1, minWidth: 140, padding: 10, borderRadius: 8, border: '1px solid #e2e8f0' }} />
          </div>
          <textarea value={manual.text} onChange={e => setManual({ ...manual, text: e.target.value })} placeholder="What did they say about the candidate?" required style={{ width: '100%', marginTop: 10, padding: 10, borderRadius: 8, border: '1px solid #e2e8f0', minHeight: 70, boxSizing: 'border-box' }} />
          <button type="submit" style={{ ...btnDark, marginTop: 10 }}>Save Manual Mention</button>
        </form>
      )}

      {/* ===== LIST ===== */}
      {loading ? <div style={{ textAlign: 'center', padding: 32, color: '#94a3b8', background: 'white', borderRadius: 12, border: '1px solid #e2e8f0' }}>Loading mentions from DB...</div>
      : filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 32, background: 'white', borderRadius: 12, border: '1px solid #e2e8f0' }}>
          <div style={{ fontSize: 36 }}>👀</div>
          <p style={{ fontWeight: 700, color: '#0f172a', margin: '8px 0 4px' }}>No mentions yet</p>
          <p style={{ color: '#94a3b8', fontSize: 13, margin: 0 }}>{keywords.length === 0 ? 'Set up your keywords first, then fetch.' : `No mentions for: ${keywords.join(', ')} - Try Fetch Auto News / Socials above.`}</p>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginTop: 14, flexWrap: 'wrap' }}>
            <button onClick={onGoCandidateSetup} style={btnDark}>Set Up Keywords</button>
            <button onClick={() => setShowConnect(true)} style={btn}>Connect Socials</button>
            <button onClick={fetchAutoNews} style={btn}>Fetch Auto News</button>
          </div>
        </div>
      ) : filtered.map(m => (
        <div key={m._id || m.id} style={{ background: 'white', border: '1px solid #e2e8f0', borderLeft: `4px solid ${m.sentiment === 'Negative' ? '#ef4444' : m.sentiment === 'Positive' ? '#22c55e' : '#e2e8f0'}`, borderRadius: 12, padding: 14, marginBottom: 10 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
            <b style={{ fontSize: 13, color: '#0f172a' }}>{m.platform || 'Unknown'} • {m.author || 'Unknown'} • <span style={{ color: m.sentiment === 'Negative' ? '#ef4444' : m.sentiment === 'Positive' ? '#166534' : '#64748b' }}>{m.sentiment || 'Neutral'}</span></b>
            <span style={{ fontSize: 11, color: '#94a3b8' }}>{m.sourceType || m.source} • {m.createdAt ? new Date(m.createdAt).toLocaleString('en-KE') : ''}</span>
          </div>
          <p style={{ fontSize: 14, color: '#334155', lineHeight: 1.6, margin: '8px 0' }}>{m.text || m.content || ''}</p>
          {(m.sourceUrl || m.url) && <a href={m.sourceUrl || m.url} target="_blank" rel="noreferrer" style={{ fontSize: 12, color: '#1e40af', fontWeight: 600 }}>View original →</a>}
        </div>
      ))}

      {/* ===== NEW PROFESSIONAL CONNECT MODAL - handles, no keys ===== */}
      {showConnect && (
        <ConnectSocials token={token} user={user} myData={myData} setMessage={setMessage} onClose={() => { setShowConnect(false); loadMentions() }} />
      )}
    </div>
  )
}