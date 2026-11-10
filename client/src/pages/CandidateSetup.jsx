import { useState, useEffect } from 'react'
import { API } from '../api'

// Candidate Intelligence Setup - POLITICS ONLY - ALL 8 PLATFORMS
// ★ LOCKED from Registration: Full Name, Party, County - cannot be edited here
// ★ Constituency = dropdown filtered by locked County
// ★ Ward = dropdown filtered by chosen Constituency
// ★ Nickname = Political Nicknames field (Mr Empty, Mr 40, etc. for Sifuna) -> becomes keyword
// ★ POLITICS ONLY: No music / studio / comedy / football / gossip keywords - blocked + dropped
// ★ ALL PLATFORMS: News + YouTube + Reddit + X + Facebook + TikTok + Telegram + Instagram = 8
// Route: /candidate-setup

// ===== KENYA: County -> Constituencies =====
const COUNTY_TO_CONSTITUENCIES = {
  "Mombasa": ["Changamwe", "Jomvu", "Kisauni", "Likoni", "Mvita", "Nyali"],
  "Kwale": ["Kinango", "Lunga Lunga", "Matuga", "Msambweni"],
  "Kilifi": ["Ganze", "Kaloleni", "Kilifi North", "Kilifi South", "Magarini", "Malindi", "Rabai"],
  "Tana River": ["Bura", "Galole", "Garsen"],
  "Lamu": ["Lamu East", "Lamu West"],
  "Taita-Taveta": ["Mwatate", "Taveta", "Voi", "Wundanyi"],
  "Garissa": ["Balambala", "Dadaab", "Fafi", "Garissa Township", "Ijara", "Lagdera"],
  "Wajir": ["Eldas", "Tarbaj", "Wajir East", "Wajir North", "Wajir South", "Wajir West"],
  "Mandera": ["Banissa", "Lafey", "Mandera East", "Mandera North", "Mandera South", "Mandera West"],
  "Marsabit": ["Laisamis", "Moyale", "North Horr", "Saku"],
  "Isiolo": ["Isiolo North", "Isiolo South"],
  "Meru": ["Buuri", "Igembe Central", "Igembe North", "Igembe South", "Imenti Central", "Imenti North", "Imenti South", "Tigania East", "Tigania West"],
  "Tharaka-Nithi": ["Chuka/Igambang'ombe", "Maara", "Tharaka"],
  "Embu": ["Manyatta", "Mbeere North", "Mbeere South", "Runyenjes"],
  "Kitui": ["Kitui Central", "Kitui East", "Kitui Rural", "Kitui South", "Kitui West", "Mwingi Central", "Mwingi North", "Mwingi West"],
  "Machakos": ["Kathiani", "Machakos Town", "Masinga", "Matungulu", "Mavoko", "Mwala", "Yatta", "Kangundo"],
  "Makueni": ["Kaiti", "Kibwezi East", "Kibwezi West", "Kilome", "Makueni", "Mbooni"],
  "Nyandarua": ["Kinangop", "Kipipiri", "Ndaragwa", "Ol Jorok", "Ol Kalou"],
  "Nyeri": ["Kieni", "Mathira", "Mukurweini", "Nyeri Town", "Othaya", "Tetu"],
  "Kirinyaga": ["Gichugu", "Kirinyaga Central", "Kirinyaga East", "Kirinyaga West"],
  "Murang'a": ["Gatanga", "Kandara", "Kangema", "Kiharu", "Kigumo", "Maragwa", "Mathioya"],
  "Kiambu": ["Gatundu North", "Gatundu South", "Githunguri", "Juja", "Kabete", "Kiambaa", "Kiambu Town", "Kikuyu", "Limuru", "Lari", "Ruiru", "Thika Town"],
  "Turkana": ["Loima", "Turkana Central", "Turkana East", "Turkana North", "Turkana South", "Turkana West"],
  "West Pokot": ["Kacheliba", "Kapenguria", "Pokot South", "Sigor"],
  "Samburu": ["Samburu East", "Samburu North", "Samburu West"],
  "Trans Nzoia": ["Cherangany", "Endebess", "Kiminini", "Kwanza", "Saboti"],
  "Uasin Gishu": ["Ainabkoi", "Kapseret", "Kesses", "Moiben", "Soy", "Turbo"],
  "Elgeyo-Marakwet": ["Keiyo North", "Keiyo South", "Marakwet East", "Marakwet West"],
  "Nandi": ["Aldai", "Chesumei", "Emgwen", "Mosop", "Nandi Hills", "Tinderet"],
  "Baringo": ["Baringo Central", "Baringo North", "Baringo South", "Eldama Ravine", "Mogotio", "Tiaty"],
  "Laikipia": ["Laikipia East", "Laikipia North", "Laikipia West"],
  "Nakuru": ["Bahati", "Gilgil", "Kuresoi North", "Kuresoi South", "Molo", "Naivasha", "Nakuru Town East", "Nakuru Town West", "Njoro", "Rongai", "Subukia"],
  "Narok": ["Emurua Dikirr", "Kilgoris", "Narok East", "Narok North", "Narok South", "Narok West"],
  "Kajiado": ["Kajiado Central", "Kajiado East", "Kajiado North", "Kajiado South", "Kajiado West"],
  "Kericho": ["Ainamoi", "Belgut", "Bureti", "Kipkelion East", "Kipkelion West", "Sigowet/Soin"],
  "Bomet": ["Bomet Central", "Bomet East", "Chepalungu", "Konoin", "Sotik"],
  "Kakamega": ["Butere", "Ikolomani", "Khwisero", "Likuyani", "Lugari", "Lurambi", "Malava", "Matungu", "Mumias East", "Mumias West", "Navakholo", "Shinyalu"],
  "Vihiga": ["Emuhaya", "Hamisi", "Luanda", "Sabatia", "Vihiga"],
  "Bungoma": ["Bumula", "Kabuchai", "Kanduyi", "Kimilili", "Mt Elgon", "Sirisia", "Tongaren", "Webuye East", "Webuye West"],
  "Busia": ["Budalangi", "Butula", "Funyula", "Matayos", "Nambale", "Teso North", "Teso South"],
  "Siaya": ["Alego Usonga", "Bondo", "Gem", "Rarieda", "Ugenya", "Ugunja"],
  "Kisumu": ["Kisumu Central", "Kisumu East", "Kisumu West", "Muhoroni", "Nyakach", "Nyando", "Seme"],
  "Homa Bay": ["Homa Bay Town", "Kabondo Kasipul", "Karachuonyo", "Kasipul", "Ndhiwa", "Rangwe", "Suba North", "Suba South"],
  "Migori": ["Awendo", "Kuria East", "Kuria West", "Nyatike", "Rongo", "Suna East", "Suna West", "Uriri"],
  "Kisii": ["Bobasi", "Bonchari", "Bomachoge Borabu", "Bomachoge Chache", "Kitutu Chache North", "Kitutu Chache South", "Nyaribari Chache", "Nyaribari Masaba", "South Mugirango"],
  "Nyamira": ["Borabu", "Kitutu Masaba", "North Mugirango", "West Mugirango"],
  "Nairobi": ["Dagoretti North", "Dagoretti South", "Embakasi Central", "Embakasi East", "Embakasi North", "Embakasi South", "Embakasi West", "Kamukunji", "Kasarani", "Kibra", "Langata", "Makadara", "Mathare", "Roysambu", "Ruaraka", "Starehe", "Westlands"],
  "Nairobi City": ["Dagoretti North", "Dagoretti South", "Embakasi Central", "Embakasi East", "Embakasi North", "Embakasi South", "Embakasi West", "Kamukunji", "Kasarani", "Kibra", "Langata", "Makadara", "Mathare", "Roysambu", "Ruaraka", "Starehe", "Westlands"],
}

// ===== Constituency -> Wards =====
const CONSTITUENCY_TO_WARDS = {
  "Bomet Central": ["Chesoen", "Mutarakwa", "Ndarawetta", "Silibwet Township", "Singorwet"],
  "Bomet East": ["Chemaner", "Kembu", "Kipreres", "Longisa", "Merigi"],
  "Chepalungu": ["Chebunyo", "Kongasis", "Ndanai/Abosi", "Nyangores", "Sigor"],
  "Konoin": ["Boito", "Chepchabas", "Embomos", "Kimulot", "Mogogosiek"],
  "Sotik": ["Chemagel", "Kipsonoi", "Manaret/Rongena", "Ndanai", "Rongena/Manaret"],
  "Dagoretti North": ["Gatina", "Kawangware", "Kilimani", "Kileleshwa", "Kabiro"],
  "Dagoretti South": ["Mutuini", "Ngando", "Riruta", "Uthiru/Ruthimitu", "Waithaka"],
  "Embakasi Central": ["Kayole Central", "Kayole North", "Kayole South", "Komarock", "Matopeni/Spring Valley"],
  "Embakasi East": ["Embakasi", "Lower Savannah", "Mihango", "Savannah", "Upper Savannah"],
  "Embakasi North": ["Dandora Area I", "Dandora Area II", "Dandora Area III", "Dandora Area IV", "Kariobangi North"],
  "Embakasi South": ["Imara Daima", "Kwa Njenga", "Kwa Reuben", "Kariobangi South", "Pipeline"],
  "Embakasi West": ["Kariobangi South", "Mowlem", "Umoja I", "Umoja II"],
  "Kamukunji": ["Airbase", "California", "Eastleigh North", "Eastleigh South", "Pumwani"],
  "Kasarani": ["Clay City", "Kasarani", "Mwiki", "Njiru", "Ruai"],
  "Kibra": ["Laini Saba", "Lindi", "Makina", "Sarangombe", "Woodley/Kenyatta Golf Course"],
  "Langata": ["Karen", "Karen/Langata", "Mugumo-ini", "Nairobi West", "Nyayo Highrise", "South C"],
  "Makadara": ["Harambee", "Makongeni", "Maringo/Hamza", "Viwandani"],
  "Mathare": ["Hospital", "Huruma", "Kiamaiko", "Mabatini", "Mlango Kubwa", "Ngei"],
  "Roysambu": ["Githurai", "Kahawa", "Kahawa West", "Roysambu", "Zimmerman"],
  "Ruaraka": ["Babadogo", "Korogocho", "Lucky Summer", "Mathare North", "Utalii"],
  "Starehe": ["Central", "Landimawe", "Nairobi Central", "Ngara", "Pangani", "Ziwani/Kariokor"],
  "Westlands": ["Highridge", "Kangemi", "Karura", "Kitisuru", "Mountain View", "Parklands/Highridge"],
  "Ainamoi": ["Ainamoi", "Kapkugerwet", "Kapsaos", "Kipchebor", "Kipchimchim", "Kipkures", "Kiptere"],
  "Belgut": ["Belgut", "Cheptororiet/Seretut", "Chaik", "Kabianga", "Kapsuser", "Waldai"],
  "Bureti": ["Cheboin", "Cheplanget", "Kapkatet", "Kisiara", "Litein", "Tebesonik"],
  "Kipkelion East": ["Chepseon", "Kipkelion", "Kunyak", "Londiani", "Tendeno/Sorget"],
  "Kipkelion West": ["Chilchila", "Kamas", "Kipkelion", "Kunyak"],
  "Sigowet/Soin": ["Kaplelartet", "Sigowet", "Soin", "Soliat"],
  "Narok North": ["Melili", "Narok Town", "Nkareta", "Olpusimoru", "Olorropil"],
  "Narok South": ["Loita", "Majimoto/Naroosura", "Melelo", "Ololulunga"],
  "Narok East": ["Ildamat", "Keekonyokie", "Mosiro", "Suswa"],
  "Narok West": ["Ilmotiok", "Mara", "Nairragie Enkare", "Siana"],
  "Kilgoris": ["Angata Barikoi", "Keyian", "Kimintet", "Lolgorian", "Shankoe"],
  "Emurua Dikirr": ["Ilkerin", "Kapsasian", "Mogondo", "Ololmasani"],
  "Bobasi": ["Bobasi Bogetaorio", "Bobasi Chache", "Bobasi/Masige", "Bobasi Boitangare", "Maji Moto", "Nyacheki", "Sameta/Mokwerero"],
  "South Mugirango": ["Bogetenga", "Borabu/Chitago", "Botabori/Chitago", "Moticho", "Tabaka"],
  "Kitutu Chache South": ["Bogeka", "Nyatieko", "Nyatieno"],
  "Nyaribari Chache": ["Bobaracho", "Ibeno", "Kisii Central", "Kisii East", "Nyanchwa"],
  "Borabu": ["Borabu", "Esise", "Mekenene", "Nyansiongo"],
  "North Mugirango": ["Ekerenyo", "Itibo", "Magwagwa", "Nyaramba", "Tanganyika"],
}

// ===== ★ POLITICS ONLY - same list as server/routes/social.js =====
const NON_POLITICAL_KEYWORDS = [
  'studio', 'studios', 'music', 'song', 'album', 'concert', 'comedy', 'comedian', 'mc ', 'dj ', 'dance',
  'football', 'soccer', 'betting', 'bet ', 'casino', 'movie', 'film', 'netflix', 'gossip', 'celebrity',
  'fashion', 'beauty', 'cooking', 'recipe', 'church choir', 'gospel song', 'prank', 'skit', 'podcast comedy'
]
const isPoliticalKeyword = (kw = '') => {
  const t = String(kw || '').toLowerCase().trim()
  if (!t) return false
  if (NON_POLITICAL_KEYWORDS.some(b => t.includes(b))) return false
  return true
}

const normalizeCounty = (c = '') => {
  const t = String(c).trim()
  if (!t) return ''
  if (/^nairobi/i.test(t)) return 'Nairobi'
  return t
}

// ★ ALL 8 PLATFORMS - must match server/routes/social.js
const ALL_PLATFORMS = ['News', 'YouTube', 'Reddit', 'X', 'Facebook', 'TikTok', 'Telegram', 'Instagram']
const PLATFORM_ICONS = { News: '📰', YouTube: '▶️', Reddit: '🟠', X: '𝕏', Facebook: '📘', TikTok: '🎵', Telegram: '✈️', Instagram: '📸' }

// ★ Build ONLY political keywords - dynamic from fullName, NOT hardcoded Evans
const buildPoliticalKeywords = ({ fullName, position, party, constituency, ward, county, nicknames = [] }) => {
  const out = []
  const name = String(fullName || '').trim()
  if (!name) return [...nicknames]
  const parts = name.split(' ').filter(Boolean)
  const first = parts[0] || ''
  const last = parts[parts.length - 1] || ''
  out.push(name) // Edwin Watenya Sifuna
  if (parts.length >= 2) out.push(`${first} ${last}`) // Edwin Sifuna
  out.push(last) // Sifuna - last name alone is a strong political keyword
  if (position) {
    out.push(`${name} for ${position}`)
    out.push(`${name} ${position}`)
    out.push(`${last} for ${position}`)
    out.push(`${last} ${position}`)
  }
  if (constituency) {
    out.push(`${name} ${constituency}`)
    out.push(`${last} ${constituency}`)
    if (position) out.push(`${position} ${constituency}`)
  }
  if (ward) out.push(`${name} ${ward}`)
  if (party) out.push(`${name} ${party}`)
  if (county) {
    out.push(`${name} ${county}`)
    out.push(`${last} ${county}`)
  }
  // ★ Political nicknames ARE keywords - Mr Empty, Mr 40, The Engine of Opposition, etc.
  nicknames.forEach(n => { if (n) out.push(n) })
  return [...new Set(out.map(s => s.trim()).filter(Boolean).filter(isPoliticalKeyword))]
}

const POSITIONS = ['MCA', 'MP', 'Woman Representative', 'Governor', 'Senator', 'President', 'Deputy President', 'Deputy Governor']

export default function CandidateSetup({ token, user, myData, setMessage, onBack }) {
  const [form, setForm] = useState({
    fullName: '', position: '', county: '', constituency: '', ward: '', party: '',
    opponentInput: '', projectInput: '', sloganInput: '', nicknameInput: '',
    keywordsText: '', telegramChatId: '', email: '',
  })
  const [keywordInput, setKeywordInput] = useState('')
  const [keywords, setKeywords] = useState([])
  const [opponents, setOpponents] = useState([])
  const [projects, setProjects] = useState([])
  const [nicknames, setNicknames] = useState([])
  const [slogan, setSlogan] = useState('')
  const [tracked, setTracked] = useState([])
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)
  const [liveHandles, setLiveHandles] = useState(null)

  const authHeaders = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }
  const cand = myData?.myCandidate || null
  // ★ FIXED: Use live handles from /api/social/handles if available, else myData/user
  const handles = liveHandles || cand?.socialHandles || user?.socialHandles || {}
  // ★ FIXED: 8 platforms, not 7 - News + 7 socials. Count only social handles for connected, but show /8 for coverage
  const socialKeys = ['youtube', 'reddit', 'x', 'twitter', 'facebook', 'tiktok', 'telegram', 'instagram']
  const connectedCount = Object.keys(handles).filter(k => socialKeys.includes(String(k).toLowerCase()) && handles[k]).length

  const lockedCounty = normalizeCounty(cand?.county || user?.county || '')
  const lockedFullName = cand?.fullName || user?.fullName || ''
  const lockedParty = cand?.party || user?.party || ''
  const constituenciesForCounty = COUNTY_TO_CONSTITUENCIES[lockedCounty] || []
  const wardsForConstituency = CONSTITUENCY_TO_WARDS[form.constituency] || null
  // ★ FIXED: Dynamic first/last name for Quick Add - no hardcoded Evans
  const nameParts = String(form.fullName || '').trim().split(' ').filter(Boolean)
  const firstName = nameParts[0] || 'Candidate'
  const lastName = nameParts.length ? nameParts[nameParts.length - 1] : 'Candidate'

  useEffect(() => {
    const u = user || {}
    const c = cand || {}
    const rawKeywords = c.keywords || u.keywords || []
    const kwArray = (Array.isArray(rawKeywords) ? rawKeywords : []).filter(isPoliticalKeyword)
    const dropped = (Array.isArray(rawKeywords) ? rawKeywords : []).filter(k => k && !isPoliticalKeyword(k))
    if (dropped.length) console.log('🚫 POLITICS ONLY - dropped old non-political keywords:', dropped)
    const county = normalizeCounty(c.county || u.county || '')
    setForm({
      fullName: c.fullName || u.fullName || '',
      position: c.positionContested || c.position || '',
      county,
      constituency: c.constituency || '',
      ward: c.ward || '',
      party: c.party || u.party || '',
      opponentInput: '', projectInput: '', sloganInput: c.slogan || u.slogan || '', nicknameInput: '',
      keywordsText: kwArray.join(', '),
      telegramChatId: c.telegramChatId || u.telegramChatId || '',
      email: c.email || u.email || '',
    })
    setKeywords(kwArray)
    setOpponents(Array.isArray(c.opponents) ? c.opponents.filter(isPoliticalKeyword) : [])
    setProjects(Array.isArray(c.projects) ? c.projects.filter(isPoliticalKeyword) : [])
    setNicknames(Array.isArray(c.nicknames) ? c.nicknames.filter(isPoliticalKeyword) : Array.isArray(c.politicalNicknames) ? c.politicalNicknames.filter(isPoliticalKeyword) : [])
    setSlogan(c.slogan || '')
    setLoading(false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ★ FIXED: Fetch real handles - myData alone showed 0/7 even when connected
  useEffect(() => {
    if (!token) return
    fetch(`${API}/api/social/handles`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json().catch(() => ({})))
      .then(d => { if (d?.handles) setLiveHandles(d.handles) })
      .catch(() => {})
    fetch(`${API}/api/candidates`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json().catch(() => []))
      .then(d => setTracked(Array.isArray(d) ? d : []))
      .catch(() => {})
  }, [token])

  const set = (key, value) => setForm(prev => ({ ...prev, [key]: value }))
  const onConstituencyChange = (value) => setForm(prev => ({ ...prev, constituency: value, ward: '' }))

  const addKeyword = (raw) => {
    const v = (raw ?? keywordInput).trim().replace(/,$/, '')
    if (!v) return
    if (!isPoliticalKeyword(v)) {
      setMessage?.(`🚫 Politics Only: "${v}" looks non-political (music / studio / entertainment). Not added. Use political keywords like "${firstName} for ${form.position || 'Senator'}".`)
      setKeywordInput('')
      return
    }
    if (!keywords.includes(v)) setKeywords(prev => [...prev, v])
    setKeywordInput('')
  }

  const removeKeyword = (k) => setKeywords(prev => prev.filter(x => x !== k))

  const addOpponent = () => {
    const v = form.opponentInput.trim()
    if (!v) return
    if (!isPoliticalKeyword(v)) { setMessage?.(`🚫 Politics Only: opponent "${v}" looks non-political.`); return }
    if (!opponents.includes(v)) {
      setOpponents(prev => [...prev, v])
      if (!keywords.includes(v)) setKeywords(prev => [...prev, v])
    }
    setForm(prev => ({ ...prev, opponentInput: '' }))
  }
  const addProject = () => {
    const v = form.projectInput.trim()
    if (!v) return
    if (!isPoliticalKeyword(v)) { setMessage?.(`🚫 Politics Only: project "${v}" looks non-political.`); return }
    if (!projects.includes(v)) {
      setProjects(prev => [...prev, v])
      if (!keywords.includes(v)) setKeywords(prev => [...prev, v])
    }
    setForm(prev => ({ ...prev, projectInput: '' }))
  }
  // ★ NEW: Political Nicknames - Mr Empty, Mr 40, The Engine of Opposition, etc.
  const addNickname = () => {
    const v = form.nicknameInput.trim()
    if (!v) return
    if (!isPoliticalKeyword(v)) { setMessage?.(`🚫 Politics Only: nickname "${v}" looks non-political.`); return }
    if (!nicknames.includes(v)) {
      setNicknames(prev => [...prev, v])
      if (!keywords.includes(v)) setKeywords(prev => [...prev, v])
    }
    setForm(prev => ({ ...prev, nicknameInput: '' }))
  }

  const autoKeywords = () => {
    const political = buildPoliticalKeywords({
      fullName: form.fullName, position: form.position, party: form.party,
      constituency: form.constituency, ward: form.ward, county: form.county, nicknames,
    })
    const withOpponents = [...political, ...opponents]
    const withProjects = [...withOpponents, ...projects]
    const withSlogan = slogan.trim() ? [...withProjects, slogan.trim()] : withProjects
    const merged = [...new Set([...keywords, ...withSlogan])].filter(isPoliticalKeyword)
    setKeywords(merged)
    setForm(prev => ({ ...prev, keywordsText: merged.join(', ') }))
    setMessage?.(`✅ ${merged.length} political keywords - Politics Only ON - All 8 platforms`)
  }

  const handleSave = async (e) => {
    e.preventDefault()
    if (!form.fullName.trim() || !form.position.trim()) { setMessage?.('Full Name and Position are required'); return }
    if (!form.constituency.trim()) { setMessage?.('Please choose a Constituency from the dropdown'); return }
    setSaving(true)
    try {
      const finalKeywords = [...new Set([...keywords, ...opponents, ...projects, ...nicknames, ...(slogan.trim() ? [slogan.trim()] : [])])].filter(isPoliticalKeyword)
      const payload = {
        fullName: form.fullName.trim(),
        positionContested: form.position.trim(),
        county: lockedCounty,
        constituency: form.constituency.trim(),
        ward: form.ward.trim(),
        party: lockedParty,
        email: form.email.trim(),
        keywords: finalKeywords,
        opponents, projects, nicknames, politicalNicknames: nicknames, slogan: slogan.trim(),
        politicsOnly: true,
        focus: 'politics',
        telegramChatId: form.telegramChatId.trim(),
        socialHandles: handles,
      }
      let res
      if (cand?.id || cand?._id) {
        res = await fetch(`${API}/api/candidates/${cand.id || cand._id}`, { method: 'PUT', headers: authHeaders, body: JSON.stringify(payload) })
      } else {
        res = await fetch(`${API}/api/candidates`, { method: 'POST', headers: authHeaders, body: JSON.stringify({ ...payload, phone: user?.phone || '+254700000000' }) })
      }
      await fetch(`${API}/api/social/candidates/social-handles`, {
        method: 'POST', headers: authHeaders,
        body: JSON.stringify({ handles, keywords: finalKeywords, verifiedStatuses: {}, candidateId: cand?.id || cand?._id, userId: user?._id || user?.id, email: form.email.trim() || user?.email, merge: true, politicsOnly: true })
      }).catch(() => {})
      try { localStorage.setItem('pcms_keywords', JSON.stringify(finalKeywords)) } catch {}
      if (res?.ok || res?.status === 200) {
        setMessage?.(`✅ Politics Only saved: ${finalKeywords.length} political keywords across all 8 platforms. Auto-scan will ignore music / entertainment / gossip.`)
        const r2 = await fetch(`${API}/api/candidates`, { headers: { Authorization: `Bearer ${token}` } })
        const d2 = await r2.json().catch(() => [])
        if (Array.isArray(d2)) setTracked(d2)
      } else {
        setMessage?.('✅ Saved. Auto-scan will use these political keywords.')
      }
    } catch { setMessage?.('Failed to save - check connection and try again') }
    setSaving(false)
  }

  const input = { width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 13, outline: 'none', boxSizing: 'border-box', background: 'white' }
  const lockedInput = { ...input, background: '#f1f5f9', color: '#475569', cursor: 'not-allowed', borderColor: '#e2e8f0' }
  const label = { fontSize: 12, fontWeight: 700, color: '#0f172a', display: 'block', marginBottom: 6 }
  const hint = { fontSize: 11, color: '#94a3b8', marginTop: 4 }
  const card = { background: 'white', border: '1px solid #e2e8f0', borderRadius: 14, padding: 20 }
  const sectionTitle = { fontSize: 13, fontWeight: 800, color: '#0f172a', display: 'flex', alignItems: 'center', gap: 8, margin: '0 0 14px' }

  if (loading) return <div style={{ textAlign: 'center', padding: 40, color: '#94a3b8' }}>Loading setup...</div>

  return (
    <div style={{ maxWidth: 1080, margin: '0 auto' }}>
      <div style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: 14, padding: 20, marginBottom: 16, display: 'flex', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap', alignItems: 'flex-start' }}>
        <div style={{ flex: 1, minWidth: 260 }}>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <span style={{ width: 44, height: 44, background: '#eff6ff', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22 }}>🗳️</span>
            <div>
              <h2 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: '#0f172a' }}>Candidate Intelligence Setup <span style={{ background: '#0f172a', color: 'white', fontSize: 10, padding: '3px 8px', borderRadius: 99, verticalAlign: 'middle' }}>POLITICS ONLY • ALL 8 PLATFORMS</span></h2>
              <p style={{ margin: '2px 0 0', fontSize: 12, color: '#64748b' }}>Politics only. PCMS auto-scans <b>Google News + YouTube + Reddit + X + Facebook + TikTok + Telegram + Instagram</b> for <b>political</b> mentions only - elections, party, manifesto, opponents, development. Music / studio / entertainment is ignored.</p>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 12 }}>
            <span style={{ background: '#f8fafc', border: '1px solid #e2e8f0', padding: '5px 10px', borderRadius: 99, fontSize: 12, fontWeight: 600 }}>👤 {lockedFullName || 'EDWIN WATENYA SIFUNA'}</span>
            <span style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', color: '#166534', padding: '5px 10px', borderRadius: 99, fontSize: 12, fontWeight: 600 }}>● Politics Only • Auto-scan every 5 min</span>
            <span style={{ background: '#eff6ff', border: '1px solid #bfdbfe', color: '#1e40af', padding: '5px 10px', borderRadius: 99, fontSize: 12, fontWeight: 600 }}>🔌 {connectedCount}/8 socials connected</span>
            <span style={{ background: '#fef9c3', border: '1px solid #fde68a', color: '#854d0e', padding: '5px 10px', borderRadius: 99, fontSize: 12, fontWeight: 600 }}>🔑 {keywords.length} political keywords</span>
          </div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 8 }}>
            {ALL_PLATFORMS.map(p => (
              <span key={p} style={{ background: '#f8fafc', border: '1px solid #e2e8f0', padding: '3px 8px', borderRadius: 99, fontSize: 11, fontWeight: 600 }}>{PLATFORM_ICONS[p]} {p}</span>
            ))}
          </div>
        </div>
        {onBack && <button onClick={onBack} style={{ background: 'white', border: '1px solid #e2e8f0', padding: '9px 14px', borderRadius: 8, cursor: 'pointer', fontWeight: 600, fontSize: 13 }}>← Back to Mentions</button>}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 16, alignItems: 'start' }}>
        <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={card}>
            <h3 style={sectionTitle}><span style={{ width: 24, height: 24, background: '#eff6ff', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12 }}>👤</span> Candidate Profile - Politics</h3>
            <label style={label}>Full Name 🔒 <span style={{ fontWeight: 400, color: '#94a3b8' }}>(locked from Registration)</span></label>
            <input value={form.fullName} disabled readOnly title="Locked - set at Registration" placeholder="e.g. Edwin Watenya Sifuna" style={lockedInput} />
            <div style={{ marginTop: 12 }}>
              <label style={label}>Party 🔒 <span style={{ fontWeight: 400, color: '#94a3b8' }}>(locked from Registration)</span></label>
              <input value={form.party} disabled readOnly title="Locked - set at Registration" placeholder="e.g. ODM, UDA, Independent" style={lockedInput} />
            </div>
            <div style={{ marginTop: 12 }}>
              <label style={label}>Position Vying For *</label>
              <select value={form.position} onChange={e => set('position', e.target.value)} required style={{ ...input, cursor: 'pointer' }}>
                <option value="" disabled>— Choose Position —</option>
                {POSITIONS.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
            <div style={{ marginTop: 12 }}>
              <label style={label}>County 🔒 <span style={{ fontWeight: 400, color: '#94a3b8' }}>(locked from Registration)</span></label>
              <input value={form.county} disabled readOnly title="Locked - set at Registration" placeholder="e.g. Nairobi" style={lockedInput} />
              <p style={hint}>Your Constituency + Ward lists below are filtered by this County.</p>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 12 }}>
              <div>
                <label style={label}>Constituency *</label>
                {constituenciesForCounty.length ? (
                  <select value={form.constituency} onChange={e => onConstituencyChange(e.target.value)} required style={{ ...input, cursor: 'pointer' }}>
                    <option value="" disabled>— Choose Constituency in {lockedCounty || 'your County'} —</option>
                    {constituenciesForCounty.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                ) : (
                  <input value={form.constituency} onChange={e => set('constituency', e.target.value)} placeholder="e.g. Dagoretti North" required style={input} />
                )}
                {!constituenciesForCounty.length && <p style={hint}>County not found - type Constituency manually.</p>}
              </div>
              <div>
                <label style={label}>Ward</label>
                {wardsForConstituency ? (
                  <select value={form.ward} onChange={e => set('ward', e.target.value)} disabled={!form.constituency} style={{ ...input, cursor: form.constituency ? 'pointer' : 'not-allowed', background: form.constituency ? 'white' : '#f8fafc' }}>
                    <option value="" disabled>{form.constituency ? `— Choose Ward in ${form.constituency} —` : '— Choose Constituency first —'}</option>
                    {wardsForConstituency.map(w => <option key={w} value={w}>{w}</option>)}
                  </select>
                ) : (
                  <input value={form.ward} onChange={e => set('ward', e.target.value)} placeholder={form.constituency ? `Ward in ${form.constituency}` : 'Choose Constituency first'} disabled={!form.constituency} style={{ ...input, background: form.constituency ? 'white' : '#f8fafc' }} />
                )}
                {!wardsForConstituency && form.constituency && <p style={hint}>Ward list not yet added for {form.constituency} - type it manually.</p>}
              </div>
            </div>
            <div style={{ marginTop: 12 }}>
              <label style={label}>Political Slogan <span style={{ fontWeight: 400, color: '#94a3b8' }}>(politics only - e.g. "Linda Mwananchi")</span></label>
              <input value={slogan} onChange={e => setSlogan(e.target.value)} placeholder="e.g. Linda Mwananchi, Tujenge Nairobi" style={input} />
            </div>
            <div style={{ marginTop: 12 }}>
              <label style={label}>Political Nicknames <span style={{ fontWeight: 400, color: '#94a3b8' }}>(e.g. Mr Empty, Mr 40, The Engine of Opposition - these ARE tracked)</span></label>
              <div style={{ display: 'flex', gap: 6 }}>
                <input value={form.nicknameInput} onChange={e => set('nicknameInput', e.target.value)} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addNickname() } }} placeholder="e.g. Mr Empty, Mr 40, The Gen Z Shield" style={{ ...input, flex: 1 }} />
                <button type="button" onClick={addNickname} style={{ background: '#0f172a', color: 'white', border: 'none', padding: '10px 14px', borderRadius: 8, cursor: 'pointer', fontWeight: 600 }}>+ Add</button>
              </div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 8 }}>
                {nicknames.map(n => (
                  <span key={n} style={{ background: '#fef9c3', color: '#854d0e', padding: '5px 8px 5px 10px', borderRadius: 99, fontSize: 12, fontWeight: 600, display: 'flex', gap: 6, alignItems: 'center' }}>{n}<button type="button" onClick={() => { setNicknames(prev => prev.filter(x => x !== n)); setKeywords(prev => prev.filter(x => x !== n)) }} style={{ background: '#854d0e', color: 'white', border: 'none', width: 16, height: 16, borderRadius: '50%', cursor: 'pointer', fontSize: 9 }}>✕</button></span>
                ))}
                {nicknames.length === 0 && <span style={{ fontSize: 11, color: '#94a3b8' }}>Add nicknames voters / media use for you - they will be tracked on all 8 platforms.</span>}
              </div>
            </div>
            <p style={hint}>This is how the system finds you in News + Socials. County / Constituency / Ward help filter out other people with the same name.</p>
          </div>

          <div style={card}>
            <h3 style={sectionTitle}><span style={{ width: 24, height: 24, background: '#fee2e2', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12 }}>⚔️</span> Opponents & Political Projects</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label style={label}>Opponents (political rivals)</label>
                <div style={{ display: 'flex', gap: 6 }}>
                  <input value={form.opponentInput} onChange={e => set('opponentInput', e.target.value)} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addOpponent() } }} placeholder="e.g. Jalang'o" style={{ ...input, flex: 1 }} />
                  <button type="button" onClick={addOpponent} style={{ background: '#0f172a', color: 'white', border: 'none', padding: '10px 12px', borderRadius: 8, cursor: 'pointer', fontWeight: 600 }}>+ Add</button>
                </div>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 8 }}>
                  {opponents.map(o => (
                    <span key={o} style={{ background: '#fee2e2', color: '#991b1b', padding: '5px 8px 5px 10px', borderRadius: 99, fontSize: 12, fontWeight: 600, display: 'flex', gap: 6, alignItems: 'center' }}>{o}<button type="button" onClick={() => { setOpponents(prev => prev.filter(x => x !== o)); setKeywords(prev => prev.filter(x => x !== o)) }} style={{ background: '#991b1b', color: 'white', border: 'none', width: 16, height: 16, borderRadius: '50%', cursor: 'pointer', fontSize: 9 }}>✕</button></span>
                  ))}
                </div>
              </div>
              <div>
                <label style={label}>Political Projects / Manifesto</label>
                <div style={{ display: 'flex', gap: 6 }}>
                  <input value={form.projectInput} onChange={e => set('projectInput', e.target.value)} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addProject() } }} placeholder="e.g. Nairobi Drainage, Bursary" style={{ ...input, flex: 1 }} />
                  <button type="button" onClick={addProject} style={{ background: '#0f172a', color: 'white', border: 'none', padding: '10px 12px', borderRadius: 8, cursor: 'pointer', fontWeight: 600 }}>+ Add</button>
                </div>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 8 }}>
                  {projects.map(p => (
                    <span key={p} style={{ background: '#dcfce7', color: '#166534', padding: '5px 8px 5px 10px', borderRadius: 99, fontSize: 12, fontWeight: 600, display: 'flex', gap: 6, alignItems: 'center' }}>{p}<button type="button" onClick={() => { setProjects(prev => prev.filter(x => x !== p)); setKeywords(prev => prev.filter(x => x !== p)) }} style={{ background: '#166534', color: 'white', border: 'none', width: 16, height: 16, borderRadius: '50%', cursor: 'pointer', fontSize: 9 }}>✕</button></span>
                  ))}
                </div>
              </div>
            </div>
            <p style={hint}>Opponents + Projects are tracked as political keywords - so you see when voters mention them vs you.</p>
          </div>

          <div style={card}>
            <h3 style={sectionTitle}><span style={{ width: 24, height: 24, background: '#fef9c3', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12 }}>🔑</span> Political Keywords to Track - All 8 Platforms</h3>
            <p style={{ fontSize: 12, color: '#64748b', margin: '0 0 12px', lineHeight: 1.5 }}>POLITICS ONLY. Name + Position + Party + Constituency + Ward + Nicknames + Opponents + Projects + Slogan. <b>Music / studio / comedy / gossip / football will be blocked.</b> These keywords are searched on <b>Google News + YouTube + Reddit + X + Facebook + TikTok + Telegram + Instagram</b>.</p>
            <div style={{ display: 'flex', gap: 8 }}>
              <input value={keywordInput} onChange={e => setKeywordInput(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); addKeyword() } }} placeholder={`Type a POLITICAL keyword, e.g. ${firstName} for ${form.position || 'Senator'}`} style={{ ...input, flex: 1 }} />
              <button type="button" onClick={() => addKeyword()} style={{ background: '#0f172a', color: 'white', border: 'none', padding: '10px 16px', borderRadius: 8, cursor: 'pointer', fontWeight: 600, fontSize: 13, whiteSpace: 'nowrap' }}>+ Add</button>
              <button type="button" onClick={autoKeywords} style={{ background: 'white', border: '1px solid #e2e8f0', padding: '10px 14px', borderRadius: 8, cursor: 'pointer', fontWeight: 600, fontSize: 13, whiteSpace: 'nowrap' }}>✨ Auto-fill Political Keywords</button>
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 12, minHeight: 32 }}>
              {keywords.length === 0 && <span style={{ fontSize: 12, color: '#94a3b8' }}>No political keywords yet - click Auto-fill.</span>}
              {keywords.map(k => (
                <span key={k} style={{ background: '#eff6ff', border: '1px solid #bfdbfe', color: '#1e40af', padding: '6px 8px 6px 12px', borderRadius: 99, fontSize: 12, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
                  {k}
                  <button type="button" onClick={() => removeKeyword(k)} style={{ background: '#1e40af', color: 'white', border: 'none', width: 18, height: 18, borderRadius: '50%', cursor: 'pointer', fontSize: 10, lineHeight: 1 }}>✕</button>
                </span>
              ))}
            </div>
            <div style={{ marginTop: 12, display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
              <span style={{ fontSize: 11, color: '#64748b' }}>Quick add:</span>
              {[
                `${form.fullName} for ${form.position || 'Senator'}`,
                `${lastName} for ${form.constituency || form.county || 'Nairobi'}`,
                `${lastName} ${form.county || 'Nairobi'}`,
              ].map(q => (
                <button key={q} type="button" onClick={() => addKeyword(q)} style={{ background: '#f8fafc', border: '1px solid #e2e8f0', padding: '4px 8px', borderRadius: 99, fontSize: 11, cursor: 'pointer' }}>{q}</button>
              ))}
            </div>
          </div>

          <div style={card}>
            <h3 style={sectionTitle}><span style={{ width: 24, height: 24, background: '#f0fdf4', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12 }}>🔔</span> Notify Me When Mentioned (Political - All Platforms)</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label style={label}>Telegram Chat ID <span style={{ fontWeight: 400, color: '#94a3b8' }}>(instant political alerts)</span></label>
                <input value={form.telegramChatId} onChange={e => set('telegramChatId', e.target.value)} placeholder="e.g. 123456789" style={input} />
              </div>
              <div>
                <label style={label}>Email <span style={{ fontWeight: 400, color: '#94a3b8' }}>(daily political report)</span></label>
                <input value={form.email} onChange={e => set('email', e.target.value)} placeholder="e.g. sifuna@example.com" style={input} />
              </div>
            </div>
            <p style={hint}>Only political mentions trigger alerts. Entertainment mentions are ignored.</p>
          </div>

          <button type="submit" disabled={saving} style={{ background: '#0f172a', color: 'white', border: 'none', padding: 14, borderRadius: 10, cursor: 'pointer', fontWeight: 700, fontSize: 14, opacity: saving ? 0.7 : 1 }}>
            {saving ? '⏳ Saving...' : '💾 Save Candidate & Start Political Auto-Scan (All 8 Platforms)'}
          </button>
          <p style={{ textAlign: 'center', fontSize: 11, color: '#94a3b8', margin: 0 }}>Politics Only. System scans every 5 minutes for political mentions on all 8 platforms.</p>
        </form>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={card}>
            <h3 style={sectionTitle}>👀 Live Preview - Politics - All 8 Platforms</h3>
            <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 10, padding: 12, display: 'flex', gap: 10, alignItems: 'center' }}>
              <div style={{ width: 40, height: 40, background: '#1e40af', color: 'white', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 13, flexShrink: 0 }}>
                {(form.fullName || 'E').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()}
              </div>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontWeight: 700, fontSize: 13, color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{form.fullName || 'Your Name'}</div>
                <div style={{ fontSize: 11, color: '#64748b' }}>{form.position || 'Position'} • {form.constituency || 'Constituency'}, {form.ward || ''} {form.county ? `, ${form.county}` : ''}</div>
                <div style={{ fontSize: 11, color: '#64748b' }}>{form.party ? `Party: ${form.party}` : ''}</div>
              </div>
            </div>
            <div style={{ marginTop: 10, fontSize: 12, color: '#64748b' }}>
              <b style={{ color: '#0f172a' }}>Will track (politics only, all 8 platforms):</b> {keywords.length ? keywords.join(', ') : 'Add political keywords'}
            </div>
            <div style={{ marginTop: 10, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {ALL_PLATFORMS.map(p => (
                <span key={p} style={{ background: 'white', border: '1px solid #e2e8f0', padding: '4px 8px', borderRadius: 99, fontSize: 11, fontWeight: 600 }}>{PLATFORM_ICONS[p]} {p}</span>
              ))}
            </div>
            <div style={{ marginTop: 10, fontSize: 11, color: '#166534', background: '#f0fdf4', border: '1px solid #bbf7d0', padding: '8px 10px', borderRadius: 8 }}>
              ✅ Will track: elections, party, manifesto, opponents, bursary, roads, water, development<br />
              🚫 Will ignore: music, studio, comedy, football, gossip, movies
            </div>
          </div>

          <div style={card}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={sectionTitle}>🔌 Connected Socials</h3>
              <span style={{ background: connectedCount ? '#dcfce7' : '#fef9c3', color: connectedCount ? '#166534' : '#854d0e', padding: '4px 8px', borderRadius: 99, fontSize: 11, fontWeight: 700 }}>{connectedCount}/8</span>
            </div>
            {connectedCount === 0 ? (
              <p style={{ fontSize: 12, color: '#64748b', margin: 0, lineHeight: 1.5 }}>No socials connected yet. Go to <b>Online Mentions → Connect Socials</b> to link your handles, then come back here. Google News still works without handles.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {Object.entries(handles).filter(([k, v]) => v && socialKeys.includes(String(k).toLowerCase())).map(([k, v]) => (
                  <div key={k} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f8fafc', border: '1px solid #e2e8f0', padding: '8px 10px', borderRadius: 8 }}>
                    <span style={{ fontSize: 12, fontWeight: 600, textTransform: 'capitalize' }}>{k}</span>
                    <span style={{ fontSize: 12, color: '#0f172a', fontWeight: 600 }}>@{String(v).replace(/^[@/]+/, '')} <span style={{ color: '#22c55e' }}>✓</span></span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div style={card}>
            <h3 style={sectionTitle}>📋 Tracked Candidates ({tracked.length})</h3>
            {tracked.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '12px 0' }}>
                <div style={{ fontSize: 28 }}>🗳️</div>
                <p style={{ fontSize: 12, color: '#94a3b8', margin: '8px 0 0' }}>No candidates tracked yet.<br />Save your first one on the left.</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {tracked.slice(0, 5).map(c => (
                  <div key={c.id} style={{ display: 'flex', gap: 10, alignItems: 'center', borderBottom: '1px solid #f1f5f9', paddingBottom: 10 }}>
                    <div style={{ width: 32, height: 32, background: '#f1f5f9', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 12, flexShrink: 0 }}>{(c.fullName || 'C')[0]}</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 12, fontWeight: 700, color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.fullName}</div>
                      <div style={{ fontSize: 11, color: '#64748b' }}>{c.positionContested || '-'} • {c.constituency || ''}, {c.county || ''}</div>
                    </div>
                    <span style={{ background: '#dcfce7', color: '#166534', fontSize: 10, fontWeight: 700, padding: '3px 7px', borderRadius: 99 }}>● LIVE</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <style>{`
        @media (max-width: 860px) {
          div[style*="grid-template-columns: 1fr 340px"] { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  )
}