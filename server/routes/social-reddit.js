const express = require('express')
const router = express.Router()
const jwt = require('jsonwebtoken')
const { PrismaClient } = require('@prisma/client')

// FIXED: Same as index.js - no ../prismaClient file exists
const prisma = new PrismaClient()

// FIXED: Same secret as index.js
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
  const neg = ['corrupt', 'bad', 'fail', 'lie', 'steal', 'thief', 'hate', 'scandal', 'arrest', 'fraud', 'cheat', 'shame', 'kill', 'violence', 'rig', 'scam', 'angry', 'terrible']
  const pos = ['win', 'great', 'good', 'support', 'love', 'best', 'excellent', 'amazing', 'strong', 'leader', 'hope', 'vote', 'proud', 'thanks']
  if (neg.some(w => t.includes(w))) return 'NEGATIVE'
  if (pos.some(w => t.includes(w))) return 'POSITIVE'
  return 'NEUTRAL'
}

function detectIntent(text) {
  const t = String(text || '').toLowerCase()
  if (t.includes('?') || t.includes('how') || t.includes('when')) return 'QUESTION'
  const s = detectSentiment(text)
  if (s === 'NEGATIVE') return 'COMPLAINT'
  if (s === 'POSITIVE') return 'PRAISE'
  return 'OTHER'
}

// GET /api/social/reddit?q=Evans Kiplangat&save=true
router.get('/', auth, async (req, res) => {
  try {
    const q = req.query.q || req.user.fullName || 'Kenya'
    const save = req.query.save === 'true'
    // Reddit public search - no key needed
    // Use old.reddit + User-Agent header or Reddit blocks us
    const url = `https://www.reddit.com/search.json?q=${encodeURIComponent(q)}&limit=10&sort=new`
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 10000)
    let r
    try {
      r = await fetch(url, {
        headers: { 'User-Agent': 'PCMS/1.0 (Political Campaign Management)' },
        signal: controller.signal,
      })
    } finally { clearTimeout(timeout) }

    if (!r.ok) {
      // FIXED: Don't 400 - return empty list so frontend doesn't crash, frontend already shows "try again"
      // Reddit rate-limits hard: 429 = wait, 403 = blocked IP
      return res.json({ count: 0, saved: 0, skipped: 0, mentions: [], warning: `Reddit blocked: ${r.status} - try again in 30 sec` })
    }
    const d = await r.json()

    const items = (d.data?.children || []).map(c => {
      const p = c.data
      return {
        author: p.author || 'Reddit User',
        handle: 'u/' + (p.author || ''),
        // FIXED: No emoji - must be plain 'Reddit' to match platform filter in mentions.js
        platform: 'Reddit',
        text: `${p.title} - ${(p.selftext || '').slice(0, 180)}`,
        sentiment: detectSentiment(p.title + ' ' + (p.selftext || '')),
        intent: detectIntent(p.title + ' ' + (p.selftext || '')),
        link: `https://reddit.com${p.permalink}`,
        candidateName: q,
        candidate: q,
        sourceType: 'AUTO-SOCIAL',
        isAuto: true,
        createdAt: new Date(p.created_utc * 1000).toISOString(),
        score: p.score || 0,
        subreddit: p.subreddit || '',
        numComments: p.num_comments || 0,
        // FIXED: Reddit post id for dedupe - old code had no externalId, so same post saved twice if link changed
        externalId: String(p.id || ''),
      }
    })

    let saved = 0, skipped = 0
    if (save && items.length) {
      const me = await prisma.user.findUnique({ where: { id: req.user.id } }).catch(() => null)
      for (const m of items) {
        // FIXED: Dedupe by platform + externalId first, fallback to link
        try {
          if (m.externalId) {
            await prisma.mention.upsert({
              where: { platform_externalId: { platform: 'Reddit', externalId: m.externalId } },
              update: {},
              create: {
                author: m.author, handle: m.handle, authorHandle: m.handle,
                platform: 'Reddit', text: String(m.text).slice(0, 2000), sentiment: m.sentiment, intent: m.intent,
                link: m.link, url: m.link,
                candidateName: q, candidate: q,
                orgName: me?.organization || me?.organizationName || req.user.organization || '',
                organization: me?.organization || me?.organizationName || req.user.organization || '',
                county: me?.county || req.user.county || '',
                sourceType: 'AUTO-SOCIAL', isAuto: true,
                likes: Number(m.score || 0),
                shares: Number(m.numComments || 0),
                externalId: m.externalId,
                mediaUrl: null,
                status: 'NEW',
                addedBy: 'Reddit Auto',
                // FIXED: Was '' - must be null or 'AUTO', empty string breaks Prisma
                addedById: 'AUTO',
                createdById: null,
                postedAt: new Date(m.createdAt),
                mentionedAt: new Date(m.createdAt),
                rawPayload: { subreddit: m.subreddit, score: m.score, numComments: m.numComments },
              },
            })
            saved++
          } else {
            const exists = await prisma.mention.findFirst({ where: { link: m.link } })
            if (exists) { skipped++; continue }
            await prisma.mention.create({
              data: {
                author: m.author, handle: m.handle, authorHandle: m.handle,
                platform: 'Reddit', text: String(m.text).slice(0, 2000), sentiment: m.sentiment, intent: m.intent,
                link: m.link, url: m.link,
                candidateName: q, candidate: q,
                orgName: me?.organization || '', organization: me?.organization || '',
                county: me?.county || '', sourceType: 'AUTO-SOCIAL', isAuto: true,
                likes: Number(m.score || 0),
                status: 'NEW', addedBy: 'Reddit Auto', addedById: 'AUTO', createdById: null,
                postedAt: new Date(m.createdAt), mentionedAt: new Date(m.createdAt),
              }
            })
            saved++
          }
        } catch (e) {
          // If schema not yet migrated (no externalId), fallback to link dedupe
          console.log('REDDIT SAVE FALLBACK:', e.message)
          try {
            const exists = await prisma.mention.findFirst({ where: { link: m.link } })
            if (exists) { skipped++; continue }
            await prisma.mention.create({
              data: {
                author: m.author, handle: m.handle, authorHandle: m.handle,
                platform: 'Reddit', text: String(m.text).slice(0, 2000), sentiment: m.sentiment,
                link: m.link, url: m.link,
                candidateName: q, candidate: q,
                orgName: me?.organization || '', organization: me?.organization || '',
                county: me?.county || '', sourceType: 'AUTO-SOCIAL', isAuto: true,
                status: 'NEW', addedBy: 'Reddit Auto', addedById: 'AUTO', createdById: null,
                postedAt: new Date(m.createdAt), mentionedAt: new Date(m.createdAt),
              }
            })
            saved++
          } catch { skipped++ }
        }
      }
    }
    res.json({ count: items.length, saved, skipped, mentions: items })
  } catch (e) {
    // FIXED: Timeout / network error should not 500 - return empty so frontend keeps working
    if (e.name === 'AbortError') return res.json({ count: 0, saved: 0, skipped: 0, mentions: [], warning: 'Reddit timed out - try again' })
    console.log('REDDIT ERROR:', e)
    res.status(500).json({ error: 'Reddit fetch failed - check internet' })
  }
})

module.exports = router