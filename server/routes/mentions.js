const express = require('express')
const router = express.Router()
const jwt = require('jsonwebtoken')
const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()
const JWT_SECRET = process.env.JWT_SECRET || 'pcms-secret-key-2026'

const auth = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1]
  if (!token) return res.status(401).json({ error: 'No token - please login' })
  try {
    req.user = jwt.verify(token, JWT_SECRET)
    next()
  } catch { return res.status(401).json({ error: 'Invalid or expired token - please login again' }) }
}

function detectSentiment(text) {
  const t = String(text || '').toLowerCase()
  const pos = ['win', 'great', 'good', 'support', 'love', 'best', 'excellent', 'amazing', 'strong', 'leader', 'change', 'hope', 'vote', 'proud', 'congrat', 'thanks', 'thank']
  const neg = ['corrupt', 'bad', 'fail', 'lie', 'steal', 'thief', 'hate', 'disappoint', 'scandal', 'arrest', 'fraud', 'cheat', 'shame', 'kill', 'violence', 'scam', 'angry', 'terrible', 'worst', 'refund']
  if (neg.some(w => t.includes(w))) return 'NEGATIVE'
  if (pos.some(w => t.includes(w))) return 'POSITIVE'
  return 'NEUTRAL'
}

function detectIntent(text) {
  const t = String(text || '').toLowerCase()
  if (t.includes('free money') && t.includes('http')) return 'SPAM'
  if (t.includes('?') || t.includes('how') || t.includes('when') || t.includes('where')) return 'QUESTION'
  const s = detectSentiment(text)
  if (s === 'NEGATIVE') return 'COMPLAINT'
  if (s === 'POSITIVE') return 'PRAISE'
  return 'OTHER'
}

function syncAliases(data) {
  const handle = String(data.handle || data.authorHandle || '')
  const link = String(data.link || data.url || '')
  const candidate = String(data.candidateName || data.candidate || '')
  const org = String(data.orgName || data.organization || '')
  return {
    ...data,
    handle, authorHandle: handle,
    link, url: link,
    candidateName: candidate, candidate,
    orgName: org, organization: org,
  }
}

// ================= GET /api/mentions =================
router.get('/', auth, async (req, res) => {
  try {
    const { candidate, sentiment, sourceType, search, platform, limit, status } = req.query
    const where = {}
    const role = String(req.user.role || '').toUpperCase()

    // FIXED: SQLite has NO mode: 'insensitive' - removed ALL of them
    // SQLite contains/equals is already case-insensitive for ASCII
    if (role === 'ORGANIZATION') {
      const me = await prisma.user.findUnique({ where: { id: req.user.id } }).catch(() => null)
      const orgName = (me?.organization || me?.organizationName || me?.fullName || req.user.organization || '').trim()
      if (orgName) {
        where.OR = [
          { organization: orgName },
          { orgName },
          { candidate: orgName },
          { candidateName: orgName },
        ]
      }
    }
    if (role === 'CANDIDATE') {
      const me = await prisma.user.findUnique({ where: { id: req.user.id } }).catch(() => null)
      const myName = (me?.fullName || req.user.fullName || '').trim()
      if (myName) {
        where.OR = [
          { candidate: myName },
          { candidateName: myName },
        ]
      }
    }

    if (candidate && role !== 'ORGANIZATION' && role !== 'CANDIDATE') {
      where.AND = where.AND || []
      where.AND.push({ OR: [{ candidate: { contains: candidate } }, { candidateName: { contains: candidate } }] })
    }
    if (sentiment && sentiment !== 'ALL') where.sentiment = String(sentiment).toUpperCase()
    if (sourceType && sourceType !== 'ALL') where.sourceType = sourceType
    if (platform && platform !== 'ALL') where.platform = platform
    if (status && status !== 'ALL') where.status = String(status).toUpperCase()

    if (search) {
      const searchFilter = { OR: [{ text: { contains: search } }, { author: { contains: search } }, { candidate: { contains: search } }, { candidateName: { contains: search } }] }
      if (where.OR) { where.AND = where.AND || []; where.AND.push({ OR: where.OR }); where.AND.push(searchFilter); delete where.OR }
      else if (where.AND) where.AND.push(searchFilter)
      else where.OR = searchFilter.OR
    }

    const mentions = await prisma.mention.findMany({
      where,
      orderBy: { postedAt: 'desc' },
      take: parseInt(limit) || 200,
      include: { createdBy: { select: { fullName: true, role: true } } }
    })
    res.json({ mentions })
  } catch (e) { console.log('MENTIONS GET ERROR:', e); res.status(500).json({ error: 'Failed to load mentions' }) }
})

// ================= GET /api/mentions/stats/summary =================
router.get('/stats/summary', auth, async (req, res) => {
  try {
    const [total, manual, autoNews, autoSocial, pos, neg, neu, todayCount] = await Promise.all([
      prisma.mention.count(),
      prisma.mention.count({ where: { sourceType: 'MANUAL' } }),
      prisma.mention.count({ where: { sourceType: 'AUTO-NEWS' } }),
      prisma.mention.count({ where: { sourceType: 'AUTO-SOCIAL' } }),
      prisma.mention.count({ where: { sentiment: 'POSITIVE' } }),
      prisma.mention.count({ where: { sentiment: 'NEGATIVE' } }),
      prisma.mention.count({ where: { sentiment: 'NEUTRAL' } }),
      prisma.mention.count({ where: { postedAt: { gte: new Date(new Date().setHours(0,0,0,0)) } } }),
    ])
    res.json({ total, manual, autoNews, autoSocial, positive: pos, negative: neg, neutral: neu, today: todayCount })
  } catch (e) { console.log('STATS ERROR:', e); res.status(500).json({ error: 'Stats failed' }) }
})

// ================= POST /api/mentions - MANUAL =================
router.post('/', auth, async (req, res) => {
  try {
    const { author, handle, authorHandle, platform, text, sentiment, link, url, candidateName, candidate, orgName, organization, county, likes, shares } = req.body
    if (!text) return res.status(400).json({ error: 'Text is required' })
    const me = await prisma.user.findUnique({ where: { id: req.user.id } }).catch(() => null)
    const synced = syncAliases({ handle, authorHandle, link, url, candidateName, candidate, orgName, organization })
    const finalSentiment = sentiment ? String(sentiment).toUpperCase() : detectSentiment(text)
    const created = await prisma.mention.create({
      data: {
        author: author || me?.fullName || req.user.fullName || 'Unknown',
        handle: synced.handle,
        authorHandle: synced.authorHandle,
        platform: String(platform || 'Facebook').toUpperCase(),
        text: String(text).trim(),
        sentiment: finalSentiment,
        intent: detectIntent(text),
        link: synced.link,
        url: synced.url,
        candidateName: synced.candidateName || me?.fullName || '',
        candidate: synced.candidate || me?.fullName || '',
        orgName: synced.orgName || me?.organization || me?.organizationName || req.user.organization || '',
        organization: synced.organization || me?.organization || me?.organizationName || req.user.organization || '',
        county: county || me?.county || req.user.county || '',
        likes: Number(likes || 0),
        shares: Number(shares || 0),
        sourceType: 'MANUAL',
        isAuto: false,
        status: 'NEW',
        addedBy: me?.fullName || req.user.fullName || '',
        addedById: String(req.user.id),
        createdById: String(req.user.id),
        postedAt: new Date(),
        mentionedAt: new Date(),
      }
    })
    res.json(created)
  } catch (e) { console.log('MENTIONS POST ERROR:', e); res.status(500).json({ error: 'Failed to save mention' }) }
})

// ================= POST /api/mentions/auto =================
router.post('/auto', auth, async (req, res) => {
  try {
    const list = Array.isArray(req.body.mentions) ? req.body.mentions : Array.isArray(req.body) ? req.body : []
    if (!list.length) return res.json({ saved: 0, skipped: 0, total: 0 })
    let saved = 0, skipped = 0
    for (const m of list) {
      if (!m.text) { skipped++; continue }
      const synced = syncAliases(m)
      const platform = String(m.platform || 'News').toUpperCase()
      const sentiment = m.sentiment ? String(m.sentiment).toUpperCase() : detectSentiment(m.text)
      const data = {
        author: m.author || 'Auto',
        handle: synced.handle,
        authorHandle: synced.authorHandle,
        platform,
        text: String(m.text).slice(0, 2000),
        sentiment,
        intent: m.intent ? String(m.intent).toUpperCase() : detectIntent(m.text),
        link: synced.link,
        url: synced.url,
        candidateName: synced.candidateName || '',
        candidate: synced.candidate || '',
        orgName: synced.orgName || req.user.organization || '',
        organization: synced.organization || req.user.organization || '',
        county: m.county || req.user.county || '',
        likes: Number(m.likes || 0),
        shares: Number(m.shares || 0),
        sourceType: m.sourceType || 'AUTO-NEWS',
        isAuto: true,
        status: 'NEW',
        addedBy: 'AUTO',
        addedById: 'AUTO',
        createdById: null,
        postedAt: m.postedAt ? new Date(m.postedAt) : new Date(),
        mentionedAt: m.mentionedAt ? new Date(m.mentionedAt) : new Date(),
        externalId: m.externalId ? String(m.externalId) : null,
        authorId: m.authorId ? String(m.authorId) : null,
        mediaUrl: m.mediaUrl || null,
        rawPayload: m.rawPayload || {},
      }
      try {
        if (data.externalId) {
          await prisma.mention.upsert({
            where: { platform_externalId: { platform, externalId: data.externalId } },
            update: {},
            create: data,
          })
          saved++
        } else {
          // FIXED: Old code had invalid Prisma: { OR: [{ link: ..., AND: [...] }] } - AND inside OR object is invalid
          // New: simple dedupe - if link exists and not empty, check link, else check text+platform
          let existing = null
          if (data.link && data.link !== '') {
            existing = await prisma.mention.findFirst({ where: { link: data.link } })
          }
          if (!existing) {
            existing = await prisma.mention.findFirst({ where: { text: data.text, platform } })
          }
          if (existing) { skipped++; continue }
          await prisma.mention.create({ data })
          saved++
        }
      } catch (e) {
        console.log('AUTO SAVE FALLBACK:', e.message)
        try {
          const existing = await prisma.mention.findFirst({ where: { text: data.text, platform } })
          if (existing) { skipped++; continue }
          const { externalId, authorId, mediaUrl, mentionedAt, intent, rawPayload, ...fallback } = data
          await prisma.mention.create({ data: fallback })
          saved++
        } catch { skipped++ }
      }
    }
    res.json({ saved, skipped, total: list.length })
  } catch (e) { console.log('AUTO MENTIONS ERROR:', e); res.status(500).json({ error: 'Failed to save auto mentions' }) }
})

// ================= PATCH /api/mentions/:id =================
router.patch('/:id', auth, async (req, res) => {
  try {
    const { status, sentiment, intent } = req.body
    const updated = await prisma.mention.update({
      where: { id: req.params.id },
      data: {
        ...(status ? { status: String(status).toUpperCase() } : {}),
        ...(sentiment ? { sentiment: String(sentiment).toUpperCase() } : {}),
        ...(intent ? { intent: String(intent).toUpperCase() } : {}),
      }
    })
    res.json(updated)
  } catch (e) { res.status(500).json({ error: 'Failed to update mention' }) }
})

// ================= DELETE /api/mentions/:id =================
router.delete('/:id', auth, async (req, res) => {
  try {
    const role = String(req.user.role || '').toUpperCase()
    const m = await prisma.mention.findUnique({ where: { id: req.params.id } })
    if (!m) return res.status(404).json({ error: 'Not found' })
    if (role !== 'SUPER_ADMIN' && role !== 'ADMIN' && role !== 'CAMPAIGN_ADMIN' && role !== 'ORGANIZATION' && role !== 'CAMPAIGN_MANAGER' && m.createdById !== (req.user.id || req.user.userId)) {
      return res.status(403).json({ error: 'Not allowed' })
    }
    await prisma.mention.delete({ where: { id: req.params.id } })
    res.json({ ok: true })
  } catch (e) { res.status(500).json({ error: 'Delete failed' }) }
})

module.exports = router