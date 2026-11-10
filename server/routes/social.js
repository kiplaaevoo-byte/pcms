const express = require('express')
const router = express.Router()

// --- SAFE AUTH ---
let auth
try {
  const m = require('../middleware/auth')
  auth = typeof m === 'function' ? m : (m.auth || m.default || ((req, res, next) => next()))
} catch {
  auth = (req, res, next) => {
    try {
      const h = req.headers.authorization || ''
      const tok = h.replace('Bearer ', '')
      if (tok) {
        const jwt = require('jsonwebtoken')
        const decoded = jwt.verify(tok, process.env.JWT_SECRET || 'pcms-secret-key-2026')
        req.user = decoded
      }
    } catch {}
    next()
  }
}

const safeRequire = (path) => { try { return require(path) } catch { return null } }
const getCandidateModel = () => safeRequire('../models/Candidate')
const getUserModel = () => safeRequire('../models/User')
const getMentionModel = () => safeRequire('../models/Mention')

let prisma = null
try { const { PrismaClient } = require('@prisma/client'); if (PrismaClient) prisma = new PrismaClient() } catch {}
const usePrisma = () => !!prisma && !getCandidateModel() && !getUserModel()

// ===== ★ POLITICS ONLY =====
const NON_POLITICAL_KEYWORDS = [
  'studio', 'studios', 'music', 'song', 'album', 'concert', 'comedy', 'comedian', 'mc ', 'dj ', 'dance',
  'football', 'soccer', 'betting', 'bet ', 'casino', 'movie', 'film', 'netflix', 'gossip', 'celebrity',
  'fashion', 'beauty', 'cooking', 'recipe', 'church choir', 'gospel song', 'prank', 'skit', 'podcast comedy'
]
const NON_POLITICAL_MENTION_SIGNALS = /(studio|music video|new song|new album|concert|comedy show|comedian|dj mix|dance video|football|soccer match|betting|casino|movie|netflix|gossip|celebrity fashion|beauty tutorial|cooking recipe|church choir|gospel song|prank|comedy skit|funny video|tiktok dance)/i
const POLITICAL_SIGNALS = /(election|elect|vote|voting|voter|campaign|mca|mp\b|women rep|governor|senator|president|deputy|party|uda|odm|wiper|anc|ford|narc|jubilee|azimio|kenya kwanza|parliament|assembly|county|constituency|ward|bursary|manifesto|development|roads|water|health|education|budget|policy|government|governor|leader|leadership|opponent|rival|debate|rally|nomination|ballot|iebc|representative|tujenge|kazi|maendeleo|serikali|bunge|politics|political|aspirant|candidate|nominated|primaries|poll|polling|voters)/i

const isPoliticalKeyword = (kw = '') => {
  const t = String(kw || '').toLowerCase().trim()
  if (!t) return false
  if (NON_POLITICAL_KEYWORDS.some(b => t.includes(b))) return false
  return true
}
const parseJson = (v, fallback) => {
  if (!v) return fallback
  if (typeof v === 'object') return v
  try { return JSON.parse(v) } catch { return fallback }
}
const cleanKeywords = (arr) => {
  if (!arr) return []
  const list = Array.isArray(arr) ? arr : String(arr).split(',').map(s => s.trim())
  return [...new Set(list.map(s => String(s || '').trim()).filter(Boolean))].filter(isPoliticalKeyword)
}

function isPoliticalMention(text = '', keywords = [], platform = '') {
  const t = String(text || '')
  const low = t.toLowerCase()
  if (!t.trim()) return false
  if (NON_POLITICAL_MENTION_SIGNALS.test(low)) return false
  if (POLITICAL_SIGNALS.test(low)) return true
  const hasName = (keywords || []).some(k => k && low.includes(String(k).toLowerCase()))
  if (hasName && /(chepalungu|sotik|bomet|nairobi|constituency|ward|county|mca|mp|governor|senator|uda|odm|election|vote|campaign)/i.test(low)) return true
  if (['News', 'X', 'Facebook', 'TikTok', 'Instagram', 'Reddit', 'Telegram', 'YouTube'].includes(platform) && hasName) return true
  return false
}
const buildPoliticalQuery = (kw) => {
  const base = String(kw || '').trim()
  if (!base) return base
  if (POLITICAL_SIGNALS.test(base)) return base
  return `"${base}" (MCA OR MP OR election OR politics OR campaign OR UDA OR ODM OR constituency OR ward OR county)`
}

const getAuthUserId = (req) => {
  const u = req.user || {}
  return u._id || u.id || u.userId || u.sub || req.body?.userId || req.query?.userId || null
}
const getAuthEmail = (req) => req.user?.email || req.body?.email || null

const cleanHandle = (value, platform = '') => {
  let v = String(value || '').trim()
  if (!v) return ''
  if (platform.toLowerCase() === 'whatsapp' && v.includes('whatsapp.com/channel')) {
    const m = v.match(/https?:\/\/[^\s"'<>]+whatsapp\.com\/channel\/[^\s"'<>]+/i)
    return (m ? m[0] : v).trim()
  }
  v = v.replace(/^https?:\/\/(www\.)?whatsapp\.com\/channel\//i, '')
  v = v.replace(/^https?:\/\/(www\.)?(youtube\.com\/@?|youtube\.com\/channel\/|youtube\.com\/c\/|x\.com\/|twitter\.com\/|facebook\.com\/|fb\.com\/|instagram\.com\/|tiktok\.com\/@?|t\.me\/|telegram\.me\/|reddit\.com\/u\/|reddit\.com\/user\/|linkedin\.com\/in\/|linkedin\.com\/company\/)/i, '')
  v = v.replace(/^[@/]+/, '').replace(/^u\//i, '')
  v = v.split(/[?#\s/]/)[0]
  return v.trim()
}
const profileUrlFor = (platform, handle) => {
  const h = cleanHandle(handle, platform)
  if (!h) return ''
  if (platform === 'whatsapp' && h.startsWith('http')) return h
  const map = {
    youtube: `https://youtube.com/@${h}`, x: `https://x.com/${h}`, twitter: `https://x.com/${h}`,
    facebook: `https://facebook.com/${h}`, instagram: `https://instagram.com/${h}`, tiktok: `https://tiktok.com/@${h}`,
    reddit: `https://reddit.com/user/${h}`, telegram: `https://t.me/${h}`, whatsapp: `https://whatsapp.com/channel/${h}`, linkedin: `https://linkedin.com/in/${h}`,
  }
  return map[platform] || ''
}
const fetchWithTimeout = async (url, opts = {}, ms = 12000) => {
  const ctrl = new AbortController()
  const t = setTimeout(() => ctrl.abort(), ms)
  try { return await fetch(url, { ...opts, signal: ctrl.signal }) } finally { clearTimeout(t) }
}

// ===== ★ SHARED HELPERS - ALL 8 PLATFORMS =====
const parseRssItems = (xml, limit = 8) => {
  const items = [...String(xml || '').matchAll(/<item>([\s\S]*?)<\/item>/g)].slice(0, limit)
  return items.map(([, itemXml]) => ({
    title: (itemXml.match(/<title>([\s\S]*?)<\/title>/)?.[1] || '').replace(/<!\[CDATA\[|\]\]>/g, '').trim(),
    link: (itemXml.match(/<link>([\s\S]*?)<\/link>/)?.[1] || '').trim(),
    source: (itemXml.match(/<source[^>]*>([\s\S]*?)<\/source>/)?.[1] || 'Google News').trim(),
  })).filter(x => x.title && x.link)
}

// ★ FIXED: Socials = AUTO-SOCIAL, News = AUTO-NEWS. Title cleaned of " - Instagram" suffix.
async function fetchPlatformViaGoogleNews({ platform, site, keywords, cand, userDoc, req, seen, limitPerKeyword = 4 }) {
  let found = 0, added = 0, dropped = 0
  const perKeyword = {}
  const isNews = platform === 'News'
  const sourceType = isNews ? 'AUTO-NEWS' : 'AUTO-SOCIAL'
  for (const kw of keywords.slice(0, 6)) {
    try {
      const politicalQuery = buildPoliticalQuery(kw)
      const q = site ? `site:${site} ${politicalQuery}` : politicalQuery
      const rssUrl = `https://news.google.com/rss/search?q=${encodeURIComponent(q)}&hl=en-KE&gl=KE&ceid=KE:en`
      const r = await fetchWithTimeout(rssUrl, { headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' } })
      if (!r?.ok) { perKeyword[kw] = { found: 0, added: 0, dropped: 0, error: `Google News HTTP ${r?.status}` }; continue }
      const xml = await r.text()
      const items = parseRssItems(xml, limitPerKeyword)
      let a = 0, d = 0
      for (const item of items) {
        if (seen.has(item.link)) continue; seen.add(item.link)
        // ★ Clean " - Instagram" / " - X" suffix Google adds
        const cleanTitle = String(item.title || '').replace(/\s*-\s*(Instagram|X|Facebook|TikTok|Reddit|YouTube|Telegram)\s*$/i, '').trim()
        const ok = await saveMentionIfNew({ platform, text: cleanTitle, author: item.source, sourceUrl: item.link, sourceType, candidateId: cand?._id || cand?.id, candidateName: cand?.fullName || userDoc?.fullName, createdBy: getAuthUserId(req), keywords, politicsOnly: true })
        if (ok) { added++; a++ } else { dropped++; d++ }
      }
      found += items.length
      perKeyword[kw] = { found: items.length, added: a, dropped: d, query: q }
    } catch (e) { perKeyword[kw] = { found: 0, added: 0, dropped: 0, error: e.message } }
  }
  return { found, added, dropped, perKeyword }
}

const ALL_PLATFORMS = ['News', 'YouTube', 'Reddit', 'X', 'Facebook', 'TikTok', 'Telegram', 'Instagram']
const emptyPerPlatform = () => { const o = { All: 0 }; ALL_PLATFORMS.forEach(p => { o[p] = 0 }); return o }

async function getCandidateForUser(req) {
  try {
    const id = getAuthUserId(req)
    const email = getAuthEmail(req)
    if (usePrisma()) {
      const candId = req.body?.candidateId || req.query?.candidateId
      if (candId) {
        const c = await prisma.candidate.findUnique({ where: { id: String(candId) } }).catch(() => null)
        if (c) return { ...c, _id: c.id, socialHandles: parseJson(c.socialHandles, {}), keywords: parseJson(c.keywords, []), verifiedStatuses: parseJson(c.verifiedStatuses, {}), opponents: parseJson(c.opponents, []), projects: parseJson(c.projects, []) }
        const c2 = await prisma.candidate.findFirst({ where: { candidateId: String(candId) } }).catch(() => null)
        if (c2) return { ...c2, _id: c2.id, socialHandles: parseJson(c2.socialHandles, {}), keywords: parseJson(c2.keywords, []), verifiedStatuses: parseJson(c2.verifiedStatuses, {}), opponents: parseJson(c2.opponents, []), projects: parseJson(c2.projects, []) }
      }
      const userDoc = await getUserDoc(req)
      if (userDoc?.candidateId) {
        const c = await prisma.candidate.findUnique({ where: { id: String(userDoc.candidateId) } }).catch(() => null)
        if (c) return { ...c, _id: c.id, socialHandles: parseJson(c.socialHandles, {}), keywords: parseJson(c.keywords, []), verifiedStatuses: parseJson(c.verifiedStatuses, {}), opponents: parseJson(c.opponents, []), projects: parseJson(c.projects, []) }
      }
      if (id) {
        const c = await prisma.candidate.findFirst({ where: { assignedManagerId: String(id) } }).catch(() => null)
        if (c) return { ...c, _id: c.id, socialHandles: parseJson(c.socialHandles, {}), keywords: parseJson(c.keywords, []), verifiedStatuses: parseJson(c.verifiedStatuses, {}), opponents: parseJson(c.opponents, []), projects: parseJson(c.projects, []) }
      }
      if (email) {
        const c = await prisma.candidate.findFirst({ where: { email } }).catch(() => null)
        if (c) return { ...c, _id: c.id, socialHandles: parseJson(c.socialHandles, {}), keywords: parseJson(c.keywords, []), verifiedStatuses: parseJson(c.verifiedStatuses, {}), opponents: parseJson(c.opponents, []), projects: parseJson(c.projects, []) }
      }
      if (req.user?.phone) {
        const c = await prisma.candidate.findFirst({ where: { phone: req.user.phone } }).catch(() => null)
        if (c) return { ...c, _id: c.id, socialHandles: parseJson(c.socialHandles, {}), keywords: parseJson(c.keywords, []), verifiedStatuses: parseJson(c.verifiedStatuses, {}), opponents: parseJson(c.opponents, []), projects: parseJson(c.projects, []) }
      }
      const fullName = req.user?.fullName || req.body?.candidateName
      if (fullName) {
        const c = await prisma.candidate.findFirst({ where: { fullName } }).catch(() => null)
        if (c) return { ...c, _id: c.id, socialHandles: parseJson(c.socialHandles, {}), keywords: parseJson(c.keywords, []), verifiedStatuses: parseJson(c.verifiedStatuses, {}), opponents: parseJson(c.opponents, []), projects: parseJson(c.projects, []) }
      }
      return null
    }
    const Candidate = getCandidateModel()
    if (!Candidate) return null
    if (id) {
      let c = await Candidate.findOne({ userId: id }).catch(() => null) || await Candidate.findOne({ user: id }).catch(() => null) || await Candidate.findOne({ ownerId: id }).catch(() => null) || await Candidate.findById(id).catch(() => null)
      if (c) return c
    }
    if (email) { let c = await Candidate.findOne({ email }).catch(() => null); if (c) return c }
    const fullName = req.user?.fullName || req.body?.candidateName
    if (fullName) { let c = await Candidate.findOne({ fullName }).catch(() => null); if (c) return c }
    const candId2 = req.body?.candidateId || req.query?.candidateId
    if (candId2) { let c = await Candidate.findById(candId2).catch(() => null); if (c) return c }
    return null
  } catch (e) { console.log('getCandidateForUser error', e.message); return null }
}

async function getUserDoc(req) {
  try {
    const id = getAuthUserId(req)
    const email = getAuthEmail(req)
    if (!id && !email) return null
    if (usePrisma()) {
      if (id) {
        const user = await prisma.user.findUnique({ where: { id: String(id) } }).catch(() => null)
        if (user) return { ...user, _id: user.id, socialHandles: parseJson(user.socialHandles, {}), keywords: parseJson(user.keywords, []), verifiedStatuses: parseJson(user.verifiedStatuses, {}) }
      }
      if (email) {
        const byEmail = await prisma.user.findUnique({ where: { email } }).catch(() => null)
        if (byEmail) return { ...byEmail, _id: byEmail.id, socialHandles: parseJson(byEmail.socialHandles, {}), keywords: parseJson(byEmail.keywords, []), verifiedStatuses: parseJson(byEmail.verifiedStatuses, {}) }
      }
      return null
    }
    const User = getUserModel()
    if (!User) return null
    let doc = null
    if (id) doc = await User.findById(id).catch(() => null)
    if (!doc && email) doc = await User.findOne({ email }).catch(() => null)
    return doc
  } catch { return null }
}

function guessSentiment(text = '') {
  const t = String(text || '').toLowerCase()
  if (/(corrupt|thief|steal|stole|liar|lying|fake|bad|fail|failed|shame|rigged|bribe|bribery|scam|fraud|arrest|jail|kill|violence|hate|useless|worst|disappoint|angry|protest against|reject|oppose|against)/.test(t)) return 'Negative'
  if (/(great|good|excellent|win|winning|support|love|best|amazing|thank|leader|leadership|progress|develop|development|change|hope|proud|congrat|well done|vote for|endorse|tunaamini|pongezi|hongera|tujenge|maendeleo|kazi)/.test(t)) return 'Positive'
  return 'Neutral'
}
function classifyPoliticalCategory(text = '') {
  const t = String(text || '').toLowerCase()
  if (/(election|vote|campaign|ballot|iebc|nomination|primaries|poll)/.test(t)) return 'Election'
  if (/(bursary|education|school|health|hospital|roads|water|development|manifesto|project|budget|policy)/.test(t)) return 'Development'
  if (/(corrupt|bribe|scam|fraud|arrest|protest|oppose|reject|against)/.test(t)) return 'Controversy'
  if (/(party|uda|odm|azimio|kenya kwanza|parliament|assembly|government|serikali|bunge)/.test(t)) return 'Party & Government'
  if (/(opponent|rival|debate|rally)/.test(t)) return 'Opponent'
  return 'Political'
}

async function saveMentionIfNew(data) {
  try {
    const url = data.sourceUrl || data.url || ''
    const text = String(data.text || '').trim()
    if (!text && !url) return false
    const isAuto = (data.sourceType || '').startsWith('AUTO')
    if (isAuto) {
      if (!isPoliticalMention(text, data.keywords || [], data.platform || '')) {
        console.log(`🚫 POLITICS ONLY - dropped: "${text.slice(0, 80)}..."`)
        return false
      }
    }
    if (usePrisma()) {
      if (!prisma.mention) return false
      if (url) {
        const exists = await prisma.mention.findFirst({ where: { OR: [{ sourceUrl: url }, { url }] } }).catch(() => null)
        if (exists) return false
      } else if (text) {
        const exists2 = await prisma.mention.findFirst({ where: { text } }).catch(() => null)
        if (exists2) return false
      }
      const externalId = url ? url.slice(0, 200) : null
      const category = classifyPoliticalCategory(text)
      await prisma.mention.create({
        data: {
          platform: data.platform || 'Facebook', text, content: text, author: data.author || 'Unknown',
          sourceUrl: url, url, sourceType: data.sourceType || 'AUTO-SOCIAL', source: data.sourceType || 'AUTO-SOCIAL',
          sentiment: data.sentiment || guessSentiment(text),
          candidateId: data.candidateId ? String(data.candidateId) : null, candidateName: data.candidateName || '',
          createdBy: data.createdBy ? String(data.createdBy) : null, createdById: data.createdBy ? String(data.createdBy) : null,
          externalId, isAuto, category, politicsOnly: true, focus: 'politics',
        }
      }).catch((e) => {
        if (String(e.message || '').includes('Unknown argument')) {
          return prisma.mention.create({
            data: {
              platform: data.platform || 'Facebook', text, content: text, author: data.author || 'Unknown', sourceUrl: url, url,
              sourceType: data.sourceType || 'AUTO-SOCIAL', source: data.sourceType || 'AUTO-SOCIAL',
              sentiment: data.sentiment || guessSentiment(text),
              candidateId: data.candidateId ? String(data.candidateId) : null, candidateName: data.candidateName || '',
              createdBy: data.createdBy ? String(data.createdBy) : null, createdById: data.createdBy ? String(data.createdBy) : null,
              externalId, isAuto,
            }
          }).catch(() => null)
        }
        if (!String(e.message || '').includes('Unique constraint')) console.log('saveMention create failed', e.message)
        return null
      })
      return true
    }
    const Mention = getMentionModel()
    if (!Mention) return false
    if (url) { const exists = await Mention.findOne({ $or: [{ sourceUrl: url }, { url }] }).catch(() => null); if (exists) return false }
    await Mention.create({ platform: data.platform, text, content: text, author: data.author || 'Unknown', sourceUrl: url, url, sourceType: data.sourceType, source: data.sourceType, sentiment: data.sentiment || guessSentiment(text), candidateId: data.candidateId, candidateName: data.candidateName, createdBy: data.createdBy, category: classifyPoliticalCategory(text), politicsOnly: true, focus: 'politics' })
    return true
  } catch (e) { console.log('saveMention failed', e.message); return false }
}

async function saveHandlesToDB(req, cleanHandles, keywords, opts = {}) {
  const userId = getAuthUserId(req)
  const email = getAuthEmail(req)
  if (!userId && !email) return null
  let merged = {}, mergedVerified = {}
  let mergedKeywords = cleanKeywords(keywords)
  if (!opts.replace) {
    const existingUser = await getUserDoc(req)
    const existingCand = await getCandidateForUser(req)
    merged = { ...(existingUser?.socialHandles || {}), ...(existingCand?.socialHandles || {}), ...cleanHandles }
    mergedVerified = { ...(existingUser?.verifiedStatuses || {}), ...(existingCand?.verifiedStatuses || {}), ...(opts.verifiedStatuses || {}) }
    if (!mergedKeywords.length) mergedKeywords = cleanKeywords(existingUser?.keywords?.length ? existingUser.keywords : existingCand?.keywords)
  } else { merged = { ...cleanHandles }; mergedVerified = { ...(opts.verifiedStatuses || {}) } }
  Object.keys(merged).forEach(k => { if (!merged[k]) { delete merged[k]; delete mergedVerified[k] } })
  Object.keys(mergedVerified).forEach(k => { if (!merged[k]) delete mergedVerified[k] })
  console.log('💾 saveHandles', userId, 'merged=', merged, 'keywords(politics only)=', mergedKeywords)
  try {
    if (usePrisma()) {
      const userDoc = await getUserDoc(req)
      if (!userDoc) return null
      const realId = String(userDoc._id || userDoc.id)
      const userData = { socialHandles: merged, verifiedStatuses: mergedVerified }
      if (mergedKeywords.length) userData.keywords = mergedKeywords
      await prisma.user.update({ where: { id: realId }, data: userData })
      const cand = await getCandidateForUser(req)
      if (cand?.id) {
        const candData = { socialHandles: merged, verifiedStatuses: mergedVerified }
        if (mergedKeywords.length) candData.keywords = mergedKeywords
        await prisma.candidate.update({ where: { id: cand.id }, data: candData }).catch(() => {})
      }
      return { handles: merged, verifiedStatuses: mergedVerified, keywords: mergedKeywords }
    }
    const User = getUserModel()
    const userDoc = await getUserDoc(req)
    if (!User || !userDoc) return null
    const update = { socialHandles: merged, verifiedStatuses: mergedVerified }
    if (mergedKeywords.length) update.keywords = mergedKeywords
    await User.findByIdAndUpdate(userDoc._id, update).catch(() => {})
    const cand = await getCandidateForUser(req)
    if (cand) { cand.socialHandles = merged; cand.verifiedStatuses = mergedVerified; if (mergedKeywords.length) cand.keywords = mergedKeywords; await cand.save().catch(() => {}) }
    return { handles: merged, verifiedStatuses: mergedVerified, keywords: mergedKeywords }
  } catch (e) { console.log('❌ saveHandlesToDB crash', e.message); return null }
}

async function deleteHandleFromDB(req, key) {
  try {
    const userDoc = await getUserDoc(req)
    const cand = await getCandidateForUser(req)
    const current = { ...(userDoc?.socialHandles || {}), ...(cand?.socialHandles || {}) }
    const currentVerified = { ...(userDoc?.verifiedStatuses || {}), ...(cand?.verifiedStatuses || {}) }
    delete current[key]; delete currentVerified[key]
    const res = await saveHandlesToDB(req, current, null, { replace: true, verifiedStatuses: currentVerified })
    return res?.handles || current
  } catch { return {} }
}

const NOT_FOUND_MARKERS = ["this account doesn't exist", "this account doesn’t exist", "account doesn't exist", "sorry, this page isn't available", "this page isn't available", "couldn't find this account", "user not found", "profile isn't available", "page not found", "no longer available", "this channel does not exist", "channel does not exist", "does not exist"]
const hasNotFoundMarker = (html = '') => NOT_FOUND_MARKERS.some(m => String(html).toLowerCase().includes(m))
const extractOg = (html = '', prop) => {
  const m = html.match(new RegExp(`<meta[^>]*property=["']${prop}["'][^>]*content=["']([^"']+)["']`, 'i')) || html.match(new RegExp(`<meta[^>]*content=["']([^"']+)["'][^>]*property=["']${prop}["']`, 'i'))
  return m ? m[1] : ''
}

async function verifyHandleReal(platform, clean) {
  const profileUrl = profileUrlFor(platform, clean)
  let profile = { handle: clean, verified: false, exists: false, status: 'UNKNOWN', pending: true, platform, profileUrl, reason: '', followersLabel: 'followers' }
  try {
    if (platform === 'reddit') {
      const r = await fetchWithTimeout(`https://www.reddit.com/user/${clean}/about.json`, { headers: { 'User-Agent': 'PCMS/1.0' } })
      if (r?.status === 404) profile = { handle: clean, verified: false, exists: false, status: 'NOT_FOUND', platform, profileUrl, reason: 'Reddit user not found', followersLabel: 'karma' }
      else if (r?.ok) {
        const j = await r.json().catch(() => ({}))
        if (j.data?.name) profile = { handle: clean, verified: true, exists: true, status: 'VERIFIED', followers: j.data?.total_karma, followersLabel: 'karma', photo: j.data?.icon_img?.split('?')[0] || '', bio: j.data?.subreddit?.public_description?.slice(0, 120) || '', platform, profileUrl }
        else profile = { handle: clean, verified: false, exists: false, status: 'NOT_FOUND', platform, profileUrl, reason: 'Reddit user not found', followersLabel: 'karma' }
      }
    }
    if (platform === 'youtube') {
      let done = false
      if (process.env.YOUTUBE_API_KEY) {
        const r = await fetchWithTimeout(`https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics&forHandle=${encodeURIComponent(clean)}&key=${process.env.YOUTUBE_API_KEY}`)
        if (r?.ok) { const j = await r.json().catch(() => ({})); const ch = j.items?.[0]; if (ch) { profile = { handle: clean, verified: true, exists: true, status: 'VERIFIED', followers: ch.statistics?.subscriberCount, followersLabel: 'subscribers', photo: ch.snippet?.thumbnails?.default?.url, bio: ch.snippet?.description?.slice(0, 120), platform, profileUrl }; done = true } }
      }
      if (!done) {
        const r = await fetchWithTimeout(`https://www.youtube.com/oembed?url=${encodeURIComponent(`https://www.youtube.com/@${clean}`)}&format=json`, { headers: { 'User-Agent': 'Mozilla/5.0' } })
        if (r?.status === 404) profile = { handle: clean, verified: false, exists: false, status: 'NOT_FOUND', platform, profileUrl, reason: 'YouTube channel not found', followersLabel: 'subscribers' }
        else if (r?.ok) { const j = await r.json().catch(() => ({})); if (j.title || j.author_name) profile = { handle: clean, verified: true, exists: true, status: 'VERIFIED', photo: j.thumbnail_url || '', bio: j.title || '', platform, profileUrl, followersLabel: 'subscribers' } }
      }
    }
    if (platform === 'tiktok') {
      const r = await fetchWithTimeout(`https://www.tiktok.com/oembed?url=${encodeURIComponent(`https://www.tiktok.com/@${clean}`)}`, { headers: { 'User-Agent': 'Mozilla/5.0' } })
      if (r?.status === 404) profile = { handle: clean, verified: false, exists: false, status: 'NOT_FOUND', platform, profileUrl, reason: 'TikTok user not found', followersLabel: 'followers' }
      else if (r?.ok) { const j = await r.json().catch(() => ({})); if (j.author_name || j.title) profile = { handle: clean, verified: true, exists: true, status: 'VERIFIED', photo: j.thumbnail_url || '', bio: j.title?.slice(0, 120) || '', platform, profileUrl, followersLabel: 'followers' } }
    }
    if (platform === 'x' || platform === 'twitter') {
      const r = await fetchWithTimeout(`https://publish.twitter.com/oembed?url=${encodeURIComponent(`https://x.com/${clean}`)}`, { headers: { 'User-Agent': 'Mozilla/5.0' } })
      if (r?.status === 404) profile = { handle: clean, verified: false, exists: false, status: 'NOT_FOUND', platform: 'x', profileUrl, reason: 'X account not found', followersLabel: 'followers' }
      else if (r?.ok) { const j = await r.json().catch(() => ({})); if (j.author_name) profile = { handle: clean, verified: false, exists: true, status: 'EXISTS', bio: j.author_name, platform: 'x', profileUrl, followersLabel: 'followers' } }
    }
    if (platform === 'instagram') {
      const r = await fetchWithTimeout(`https://www.instagram.com/${clean}/`, { headers: { 'User-Agent': 'Mozilla/5.0' } })
      if (r?.status === 404) profile = { handle: clean, verified: false, exists: false, status: 'NOT_FOUND', platform, profileUrl, reason: 'Instagram account not found', followersLabel: 'followers' }
      else if (r?.ok) {
        const html = await r.text().catch(() => '')
        if (hasNotFoundMarker(html)) profile = { handle: clean, verified: false, exists: false, status: 'NOT_FOUND', platform, profileUrl, reason: 'Instagram account not found', followersLabel: 'followers' }
        else if (html.length > 10000) profile = { handle: clean, verified: false, exists: true, status: 'EXISTS', platform, profileUrl, followersLabel: 'followers' }
      }
    }
    if (platform === 'facebook') {
      const r = await fetchWithTimeout(`https://www.facebook.com/${clean}`, { headers: { 'User-Agent': 'Mozilla/5.0' } })
      if (r?.ok) {
        const html = await r.text().catch(() => '')
        if (hasNotFoundMarker(html)) profile = { handle: clean, verified: false, exists: false, status: 'NOT_FOUND', platform, profileUrl, reason: 'Facebook Page not found', followersLabel: 'followers' }
        else if (html.length > 8000) profile = { handle: clean, verified: false, exists: true, status: 'EXISTS', platform, profileUrl, followersLabel: 'followers' }
      }
    }
    if (platform === 'telegram') {
      const r = await fetchWithTimeout(`https://t.me/${clean}`, { headers: { 'User-Agent': 'Mozilla/5.0' } })
      if (r?.ok) {
        const html = await r.text().catch(() => '')
        const titleMatch = html.match(/<div class="tgme_page_title"[^>]*>([\s\S]*?)<\/div>/)
        const title = titleMatch ? titleMatch[1].replace(/<[^>]+>/g, '').trim() : ''
        if (title && !hasNotFoundMarker(html)) profile = { handle: clean, verified: true, exists: true, status: 'VERIFIED', bio: title.slice(0, 120), platform, profileUrl, followersLabel: 'followers' }
        else profile = { handle: clean, verified: false, exists: false, status: 'NOT_FOUND', platform, profileUrl, reason: 'Telegram channel not found', followersLabel: 'followers' }
      }
    }
    if (platform === 'whatsapp') profile = { handle: clean, verified: false, exists: false, status: 'UNKNOWN', platform, profileUrl, reason: 'WhatsApp has no public check - saved for alerts only', followersLabel: 'followers' }
  } catch { profile = { handle: clean, verified: false, exists: false, status: 'UNKNOWN', platform, profileUrl, reason: 'Check failed - try again', followersLabel: 'followers' } }
  return profile
}

router.get('/handles', auth, async (req, res) => {
  try {
    const userDoc = await getUserDoc(req)
    const cand = await getCandidateForUser(req)
    const handles = { ...(userDoc?.socialHandles || {}), ...(cand?.socialHandles || {}) }
    const verifiedStatuses = { ...(userDoc?.verifiedStatuses || {}), ...(cand?.verifiedStatuses || {}) }
    const keywords = cleanKeywords(cand?.keywords?.length ? cand.keywords : userDoc?.keywords)
    res.json({ ok: true, handles, verifiedStatuses, keywords, politicsOnly: true, focus: 'politics', candidate: cand ? { id: cand._id || cand.id, fullName: cand.fullName, positionContested: cand.positionContested, county: cand.county, constituency: cand.constituency, ward: cand.ward, party: cand.party } : null, debugUserId: getAuthUserId(req) })
  } catch (e) { res.json({ ok: true, handles: {}, verifiedStatuses: {}, keywords: [], politicsOnly: true, focus: 'politics' }) }
})

// ★ FIXED: Always returns perPlatform counts. Frontend pills need this even without ?counts=1
router.get('/mentions', auth, async (req, res) => {
  try {
    const platformFilter = String(req.query.platform || '').trim()
    const wantCounts = req.query.counts === '1' || req.query.includeCounts === '1'
    if (usePrisma()) {
      if (!prisma.mention) return res.json(wantCounts ? { mentions: [], counts: emptyPerPlatform(), perPlatform: emptyPerPlatform(), total: 0 } : [])
      const cand = await getCandidateForUser(req)
      const userDoc = await getUserDoc(req)
      const name = cand?.fullName || userDoc?.fullName || ''
      let list = await prisma.mention.findMany({
        where: name ? { OR: [{ candidateName: name }, { candidateId: cand?.id ? String(cand.id) : undefined }, { createdBy: getAuthUserId(req) }] } : {},
        orderBy: { createdAt: 'desc' }, take: 500
      }).catch(() => [])
      list = list.filter(m => {
        if (m.sourceType === 'MANUAL') return true
        return isPoliticalMention(m.text || m.content || '', cleanKeywords(cand?.keywords || userDoc?.keywords || []), m.platform)
      })
      // ★ Counts BEFORE platform filter - so pills show true totals for ALL platforms
      const perPlatform = emptyPerPlatform()
      perPlatform.All = list.length
      list.forEach(m => { if (perPlatform[m.platform] !== undefined) perPlatform[m.platform]++ })
      if (platformFilter && platformFilter !== 'All') list = list.filter(m => String(m.platform).toLowerCase() === platformFilter.toLowerCase())
      if (wantCounts) return res.json({ mentions: list, counts: perPlatform, perPlatform, total: perPlatform.All, politicsOnly: true })
      return res.json(list)
    }
    const Mention = getMentionModel()
    if (!Mention) return res.json([])
    const cand = await getCandidateForUser(req)
    const userDoc = await getUserDoc(req)
    let query = {}
    if (cand) { query = { $or: [{ candidateId: cand._id }, { candidateName: cand.fullName }] } }
    else if (userDoc?.fullName) query = { $or: [{ candidateName: userDoc.fullName }, { createdBy: userDoc._id }] }
    else if (req.user?.id) query = { createdBy: req.user.id }
    let mentions = await Mention.find(query).sort({ createdAt: -1 }).limit(500)
    mentions = mentions.filter(m => m.sourceType === 'MANUAL' || isPoliticalMention(m.text || m.content || '', cleanKeywords(cand?.keywords || []), m.platform))
    const perPlatform = emptyPerPlatform()
    perPlatform.All = mentions.length
    mentions.forEach(m => { if (perPlatform[m.platform] !== undefined) perPlatform[m.platform]++ })
    if (platformFilter && platformFilter !== 'All') mentions = mentions.filter(m => String(m.platform).toLowerCase() === platformFilter.toLowerCase())
    if (wantCounts) return res.json({ mentions, counts: perPlatform, perPlatform, total: perPlatform.All, politicsOnly: true })
    res.json(mentions)
  } catch { res.json([]) }
})

router.post('/mentions', auth, async (req, res) => {
  try {
    if (usePrisma()) {
      if (!prisma.mention) return res.status(500).json({ error: 'Mention model not in schema' })
      const cand = await getCandidateForUser(req)
      const userDoc = await getUserDoc(req)
      const text = String(req.body.text || '').trim()
      if (!text) return res.status(400).json({ error: 'text required' })
      const doc = await prisma.mention.create({
        data: {
          platform: req.body.platform || 'Facebook', text, content: text, author: req.body.author || 'Manual',
          sourceUrl: req.body.url || req.body.sourceUrl || '', url: req.body.url || req.body.sourceUrl || '',
          sourceType: 'MANUAL', source: 'MANUAL', sentiment: req.body.sentiment || guessSentiment(text),
          candidateId: cand?.id ? String(cand.id) : null, candidateName: req.body.candidateName || cand?.fullName || userDoc?.fullName || req.user?.fullName || '',
          createdBy: getAuthUserId(req), createdById: getAuthUserId(req), externalId: req.body.url ? String(req.body.url).slice(0, 200) : null,
        }
      })
      return res.json(doc)
    }
    const Mention = getMentionModel()
    if (!Mention) return res.status(500).json({ error: 'Mention model not found' })
    const cand = await getCandidateForUser(req)
    const userDoc = await getUserDoc(req)
    const doc = await Mention.create({ platform: req.body.platform || 'Facebook', text: req.body.text, content: req.body.text, author: req.body.author || 'Manual', sourceUrl: req.body.url || req.body.sourceUrl || '', url: req.body.url || '', sourceType: 'MANUAL', source: 'MANUAL', sentiment: req.body.sentiment || guessSentiment(req.body.text), candidateId: cand?._id, candidateName: req.body.candidateName || cand?.fullName || userDoc?.fullName || req.user?.fullName, createdBy: getAuthUserId(req) })
    res.json(doc)
  } catch (e) { res.status(500).json({ error: e.message }) }
})

router.post('/verify-handle', auth, async (req, res) => {
  const platform = String(req.body.platform || '').toLowerCase()
  const clean = cleanHandle(req.body.handle, platform)
  if (!clean) return res.status(400).json({ error: 'Handle required' })
  const profile = await verifyHandleReal(platform, clean)
  res.json({ profile })
})
router.post('/verify-all', auth, async (req, res) => {
  const handles = req.body.handles || {}
  const results = {}
  for (const [platform, raw] of Object.entries(handles)) {
    const clean = cleanHandle(raw, platform)
    if (!clean) continue
    results[platform.toLowerCase()] = await verifyHandleReal(platform.toLowerCase(), clean)
  }
  res.json({ ok: true, results })
})

router.post('/candidates/social-handles', auth, async (req, res) => {
  try {
    const { handles } = req.body
    const keywords = cleanKeywords(req.body.keywords)
    const dropped = (Array.isArray(req.body.keywords) ? req.body.keywords : []).filter(k => k && !isPoliticalKeyword(k))
    if (!handles && !keywords.length && !dropped.length) return res.status(400).json({ error: 'handles or keywords required' })
    if (!handles && !keywords.length && dropped.length) return res.status(400).json({ error: `🚫 Politics Only: all keywords dropped: ${dropped.join(', ')}`, dropped })
    const cleanHandles = {}
    Object.entries(handles || {}).forEach(([k, v]) => { if (v) cleanHandles[String(k).toLowerCase()] = cleanHandle(v, k) })
    if (!req.body.verifiedStatuses) {
      const blocked = []
      for (const [k, v] of Object.entries(cleanHandles)) {
        if (k === 'whatsapp') continue
        const p = await verifyHandleReal(k, v)
        if (p.status === 'NOT_FOUND') blocked.push({ platform: k, handle: v, reason: p.reason })
      }
      if (blocked.length) return res.status(400).json({ error: 'One or more handles do not exist', blocked })
    } else {
      const blocked = Object.entries(req.body.verifiedStatuses).filter(([, s]) => s === 'NOT_FOUND').map(([k]) => ({ platform: k, handle: cleanHandles[k] }))
      if (blocked.length) return res.status(400).json({ error: 'One or more handles do not exist', blocked })
    }
    const verifiedStatuses = {}
    Object.entries(req.body.verifiedStatuses || {}).forEach(([k, v]) => { if (v) verifiedStatuses[String(k).toLowerCase()] = String(v).toLowerCase() === 'verified' ? 'VERIFIED' : String(v).toLowerCase() === 'exists' ? 'EXISTS' : String(v) })
    const result = await saveHandlesToDB(req, cleanHandles, keywords, { verifiedStatuses })
    if (!result) return res.status(500).json({ error: 'Save failed - user not found in DB.' })
    const cand = await getCandidateForUser(req)
    res.json({ ok: true, handles: result.handles, verifiedStatuses: result.verifiedStatuses, keywords: result.keywords, dropped, politicsOnly: true, focus: 'politics', candidate: cand })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

router.post('/social-handles', auth, async (req, res) => {
  try {
    const { handles } = req.body
    const keywords = cleanKeywords(req.body.keywords)
    if (!handles && !keywords.length) return res.status(400).json({ error: 'handles or keywords required' })
    const cleanHandles = {}
    Object.entries(handles || {}).forEach(([k, v]) => { if (v) cleanHandles[String(k).toLowerCase()] = cleanHandle(v, k) })
    if (!req.body.verifiedStatuses) {
      const blocked = []
      for (const [k, v] of Object.entries(cleanHandles)) {
        if (k === 'whatsapp') continue
        const p = await verifyHandleReal(k, v)
        if (p.status === 'NOT_FOUND') blocked.push({ platform: k, handle: v, reason: p.reason })
      }
      if (blocked.length) return res.status(400).json({ error: 'One or more handles do not exist', blocked })
    }
    const verifiedStatuses = {}
    Object.entries(req.body.verifiedStatuses || {}).forEach(([k, v]) => { if (v) verifiedStatuses[String(k).toLowerCase()] = String(v) })
    const result = await saveHandlesToDB(req, cleanHandles, keywords, { verifiedStatuses })
    if (!result) return res.status(500).json({ error: 'Save failed - user not found in DB.' })
    res.json({ ok: true, handles: result.handles, verifiedStatuses: result.verifiedStatuses, keywords: result.keywords, politicsOnly: true, focus: 'politics' })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

router.delete('/handles/:platform', auth, async (req, res) => {
  try {
    const key = String(req.params.platform || '').toLowerCase()
    const current = await deleteHandleFromDB(req, key)
    res.json({ ok: true, handles: current })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// ===== FETCH NEWS - Google News - POLITICS ONLY =====
router.post('/fetch-news', auth, async (req, res) => {
  try {
    const cand = await getCandidateForUser(req)
    const userDoc = await getUserDoc(req)
    const keywords = cleanKeywords(req.body.keywords?.length ? req.body.keywords : (cand?.keywords || userDoc?.keywords || [cand?.fullName || userDoc?.fullName || req.user?.fullName]))
    if (!keywords.length) return res.json({ message: 'No political keywords set.', count: 0, perPlatform: {}, perKeyword: {}, politicsOnly: true })
    const seen = new Set()
    const news = await fetchPlatformViaGoogleNews({ platform: 'News', site: null, keywords, cand, userDoc, req, seen, limitPerKeyword: 8 })
    const perPlatform = { News: { found: news.found, added: news.added, dropped: news.dropped } }
    const count = news.added
    const msg = count > 0
      ? `✅ Google News scan done - ${count} new political mentions${news.dropped ? ` (${news.dropped} non-political dropped)` : ''}`
      : `No new Google News - checked ${keywords.slice(0, 6).join(', ')} - all already saved or no political news today`
    res.json({ message: msg, count, dropped: news.dropped, perPlatform, perKeyword: { News: news.perKeyword }, keywords: keywords.slice(0, 6), politicsOnly: true, focus: 'politics' })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// ===== FETCH SOCIALS - ALL 7 SOCIALS - POLITICS ONLY =====
router.post('/fetch-socials', auth, async (req, res) => {
  try {
    const cand = await getCandidateForUser(req)
    const userDoc = await getUserDoc(req)
    const keywords = cleanKeywords(req.body.keywords?.length ? req.body.keywords : (cand?.keywords || userDoc?.keywords || [cand?.fullName || userDoc?.fullName]))
    const handles = req.body.handles || cand?.socialHandles || userDoc?.socialHandles || {}
    if (!keywords.length) return res.json({ message: 'No political keywords set.', count: 0, perPlatform: {}, perKeyword: {}, politicsOnly: true })
    const seen = new Set()
    const perPlatform = {}
    const perKeyword = {}
    let totalAdded = 0, totalDropped = 0, totalFound = 0

    // --- 1. YOUTUBE ---
    {
      let found = 0, added = 0, dropped = 0, detail = {}
      if (process.env.YOUTUBE_API_KEY) {
        for (const kw of keywords.slice(0, 6)) {
          try {
            const q = buildPoliticalQuery(kw)
            const r = await fetchWithTimeout(`https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(q)}&maxResults=5&type=video&key=${process.env.YOUTUBE_API_KEY}`)
            if (!r?.ok) { detail[kw] = { found: 0, added: 0, dropped: 0, error: `YouTube API HTTP ${r?.status}` }; continue }
            const j = await r.json()
            let a = 0, d = 0
            for (const item of j.items || []) {
              const url = `https://youtube.com/watch?v=${item.id?.videoId}`
              if (!item.id?.videoId || seen.has(url)) continue; seen.add(url)
              const text = `${item.snippet?.title} - ${(item.snippet?.description || '').slice(0, 150)}`
              const ok = await saveMentionIfNew({ platform: 'YouTube', text, author: item.snippet?.channelTitle, sourceUrl: url, sourceType: 'AUTO-SOCIAL', candidateId: cand?._id || cand?.id, candidateName: cand?.fullName || userDoc?.fullName, createdBy: getAuthUserId(req), keywords, politicsOnly: true })
              if (ok) { added++; a++ } else { dropped++; d++ }
            }
            found += j.items?.length || 0; detail[kw] = { found: j.items?.length || 0, added: a, dropped: d }
          } catch (e) { detail[kw] = { found: 0, added: 0, dropped: 0, error: e.message } }
        }
      } else {
        const via = await fetchPlatformViaGoogleNews({ platform: 'YouTube', site: 'youtube.com', keywords, cand, userDoc, req, seen, limitPerKeyword: 4 })
        found = via.found; added = via.added; dropped = via.dropped; detail = via.perKeyword
        detail._note = 'via Google News site:youtube.com - add YOUTUBE_API_KEY for direct YouTube API'
      }
      perPlatform.YouTube = { found, added, dropped }
      perKeyword.YouTube = detail
      totalAdded += added; totalDropped += dropped; totalFound += found
    }

    // --- 2. REDDIT ---
    {
      let found = 0, added = 0, dropped = 0, detail = {}
      let directOk = false
      for (const kw of keywords.slice(0, 3)) {
        try {
          const r = await fetchWithTimeout(`https://www.reddit.com/search.json?q=${encodeURIComponent(kw)}&limit=5`, { headers: { 'User-Agent': 'PCMS/1.0' } })
          if (!r?.ok) continue
          directOk = true
          const j = await r.json()
          let a = 0, d = 0
          for (const child of j.data?.children || []) {
            const dta = child.data
            const url = `https://reddit.com${dta.permalink}`
            if (seen.has(url)) continue; seen.add(url)
            const text = `${dta.title} - ${(dta.selftext || '').slice(0, 150)}`
            const ok = await saveMentionIfNew({ platform: 'Reddit', text, author: `u/${dta.author}`, sourceUrl: url, sourceType: 'AUTO-SOCIAL', candidateId: cand?._id || cand?.id, candidateName: cand?.fullName || userDoc?.fullName, createdBy: getAuthUserId(req), keywords, politicsOnly: true })
            if (ok) { added++; a++ } else { dropped++; d++ }
          }
          found += j.data?.children?.length || 0; detail[kw] = { found: j.data?.children?.length || 0, added: a, dropped: d, source: 'Reddit API' }
        } catch {}
      }
      if (!directOk) {
        const via = await fetchPlatformViaGoogleNews({ platform: 'Reddit', site: 'reddit.com', keywords, cand, userDoc, req, seen, limitPerKeyword: 4 })
        found = via.found; added = via.added; dropped = via.dropped; detail = via.perKeyword
        detail._note = 'via Google News site:reddit.com - Reddit direct API blocked (403)'
      }
      perPlatform.Reddit = { found, added, dropped }
      perKeyword.Reddit = detail
      totalAdded += added; totalDropped += dropped; totalFound += found
    }

    // --- 3. X ---
    {
      const via = await fetchPlatformViaGoogleNews({ platform: 'X', site: 'x.com', keywords, cand, userDoc, req, seen, limitPerKeyword: 4 })
      perPlatform.X = { found: via.found, added: via.added, dropped: via.dropped, source: 'Google News site:x.com' }
      perKeyword.X = via.perKeyword
      totalAdded += via.added; totalDropped += via.dropped; totalFound += via.found
    }

    // --- 4. FACEBOOK ---
    {
      const via = await fetchPlatformViaGoogleNews({ platform: 'Facebook', site: 'facebook.com', keywords, cand, userDoc, req, seen, limitPerKeyword: 4 })
      perPlatform.Facebook = { found: via.found, added: via.added, dropped: via.dropped, source: 'Google News site:facebook.com' }
      perKeyword.Facebook = via.perKeyword
      totalAdded += via.added; totalDropped += via.dropped; totalFound += via.found
    }

    // --- 5. TIKTOK ---
    {
      const via = await fetchPlatformViaGoogleNews({ platform: 'TikTok', site: 'tiktok.com', keywords, cand, userDoc, req, seen, limitPerKeyword: 4 })
      perPlatform.TikTok = { found: via.found, added: via.added, dropped: via.dropped, source: 'Google News site:tiktok.com' }
      perKeyword.TikTok = via.perKeyword
      totalAdded += via.added; totalDropped += via.dropped; totalFound += via.found
    }

    // --- 6. TELEGRAM ---
    {
      let found = 0, added = 0, dropped = 0, detail = {}
      if (handles.telegram) {
        try {
          const tgHandle = cleanHandle(handles.telegram, 'telegram')
          const r = await fetchWithTimeout(`https://t.me/s/${tgHandle}`, { headers: { 'User-Agent': 'Mozilla/5.0' } })
          if (r?.ok) {
            const html = await r.text()
            const posts = [...html.matchAll(/data-post="[^"]+"[\s\S]*?tgme_widget_message_text[^>]*>([\s\S]*?)<\/div>/g)].slice(0, 5)
            for (const [, txt] of posts) {
              const cleanText = txt.replace(/<[^>]+>/g, '').trim().slice(0, 200)
              if (!cleanText) continue
              const url = `https://t.me/${tgHandle}`
              const key = url + cleanText
              if (seen.has(key)) continue; seen.add(key)
              const ok = await saveMentionIfNew({ platform: 'Telegram', text: cleanText, author: `@${tgHandle}`, sourceUrl: url, sourceType: 'AUTO-SOCIAL', candidateId: cand?._id || cand?.id, candidateName: cand?.fullName || userDoc?.fullName, createdBy: getAuthUserId(req), keywords, politicsOnly: true })
              if (ok) { added++ } else { dropped++ }
            }
            found = posts.length; detail = { found, added, dropped, handle: tgHandle }
          } else {
            detail = { found: 0, added: 0, dropped: 0, error: `Telegram channel not public or blocked (HTTP ${r?.status}) - make channel public` }
          }
        } catch (e) { detail = { found: 0, added: 0, dropped: 0, error: e.message } }
      } else {
        detail = { found: 0, added: 0, dropped: 0, error: 'No Telegram handle connected - connect in Connect Socials to fetch Telegram' }
      }
      perPlatform.Telegram = { found, added, dropped }
      perKeyword.Telegram = detail
      totalAdded += added; totalDropped += dropped; totalFound += found
    }

    // --- 7. INSTAGRAM ---
    {
      const via = await fetchPlatformViaGoogleNews({ platform: 'Instagram', site: 'instagram.com', keywords, cand, userDoc, req, seen, limitPerKeyword: 4 })
      perPlatform.Instagram = { found: via.found, added: via.added, dropped: via.dropped, source: 'Google News site:instagram.com' }
      perKeyword.Instagram = via.perKeyword
      totalAdded += via.added; totalDropped += via.dropped; totalFound += via.found
    }

    const msg = totalAdded > 0
      ? `✅ Auto Socials scan done - ${totalAdded} new political mentions across YouTube, Reddit, X, Facebook, TikTok, Telegram, Instagram${totalDropped ? ` (${totalDropped} non-political dropped)` : ''}`
      : `No new socials - checked ${keywords.slice(0, 6).join(', ')} - all already saved or no political posts today${totalDropped ? ` (${totalDropped} non-political dropped)` : ''}`
    res.json({ message: msg, count: totalAdded, found: totalFound, dropped: totalDropped, perPlatform, perKeyword, keywords: keywords.slice(0, 6), politicsOnly: true, focus: 'politics' })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// ===== FETCH ALL - Google News + All Socials (incl. Telegram) =====
router.post('/fetch-all', auth, async (req, res) => {
  try {
    const cand = await getCandidateForUser(req)
    const userDoc = await getUserDoc(req)
    const keywords = cleanKeywords(req.body.keywords?.length ? req.body.keywords : (cand?.keywords || userDoc?.keywords || [cand?.fullName || userDoc?.fullName]))
    const handles = req.body.handles || cand?.socialHandles || userDoc?.socialHandles || {}
    if (!keywords.length) return res.json({ message: 'No political keywords set.', count: 0, politicsOnly: true })
    const seen = new Set()
    const news = await fetchPlatformViaGoogleNews({ platform: 'News', site: null, keywords, cand, userDoc, req, seen, limitPerKeyword: 6 })
    const yt = await fetchPlatformViaGoogleNews({ platform: 'YouTube', site: 'youtube.com', keywords, cand, userDoc, req, seen, limitPerKeyword: 4 })
    const rd = await fetchPlatformViaGoogleNews({ platform: 'Reddit', site: 'reddit.com', keywords, cand, userDoc, req, seen, limitPerKeyword: 4 })
    const x = await fetchPlatformViaGoogleNews({ platform: 'X', site: 'x.com', keywords, cand, userDoc, req, seen, limitPerKeyword: 4 })
    const fb = await fetchPlatformViaGoogleNews({ platform: 'Facebook', site: 'facebook.com', keywords, cand, userDoc, req, seen, limitPerKeyword: 4 })
    const tt = await fetchPlatformViaGoogleNews({ platform: 'TikTok', site: 'tiktok.com', keywords, cand, userDoc, req, seen, limitPerKeyword: 4 })
    const ig = await fetchPlatformViaGoogleNews({ platform: 'Instagram', site: 'instagram.com', keywords, cand, userDoc, req, seen, limitPerKeyword: 4 })
    // Telegram direct (was missing before)
    let tg = { found: 0, added: 0, dropped: 0 }
    if (handles.telegram) {
      try {
        const tgHandle = cleanHandle(handles.telegram, 'telegram')
        const r = await fetchWithTimeout(`https://t.me/s/${tgHandle}`, { headers: { 'User-Agent': 'Mozilla/5.0' } })
        if (r?.ok) {
          const html = await r.text()
          const posts = [...html.matchAll(/data-post="[^"]+"[\s\S]*?tgme_widget_message_text[^>]*>([\s\S]*?)<\/div>/g)].slice(0, 5)
          for (const [, txt] of posts) {
            const cleanText = txt.replace(/<[^>]+>/g, '').trim().slice(0, 200)
            if (!cleanText) continue
            const key = `https://t.me/${tgHandle}` + cleanText
            if (seen.has(key)) continue; seen.add(key)
            const ok = await saveMentionIfNew({ platform: 'Telegram', text: cleanText, author: `@${tgHandle}`, sourceUrl: `https://t.me/${tgHandle}`, sourceType: 'AUTO-SOCIAL', candidateId: cand?._id || cand?.id, candidateName: cand?.fullName || userDoc?.fullName, createdBy: getAuthUserId(req), keywords, politicsOnly: true })
            if (ok) tg.added++; else tg.dropped++
          }
          tg.found = posts.length
        }
      } catch {}
    }
    const perPlatform = {
      News: { found: news.found, added: news.added, dropped: news.dropped },
      YouTube: { found: yt.found, added: yt.added, dropped: yt.dropped },
      Reddit: { found: rd.found, added: rd.added, dropped: rd.dropped },
      X: { found: x.found, added: x.added, dropped: x.dropped },
      Facebook: { found: fb.found, added: fb.added, dropped: fb.dropped },
      TikTok: { found: tt.found, added: tt.added, dropped: tt.dropped },
      Telegram: { found: tg.found, added: tg.added, dropped: tg.dropped },
      Instagram: { found: ig.found, added: ig.added, dropped: ig.dropped },
    }
    const count = Object.values(perPlatform).reduce((s, p) => s + p.added, 0)
    res.json({ message: `✅ Fetch All done - ${count} new political mentions across Google News + YouTube + Reddit + X + Facebook + TikTok + Telegram + Instagram`, count, perPlatform, keywords: keywords.slice(0, 6), politicsOnly: true, focus: 'politics' })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

module.exports = router