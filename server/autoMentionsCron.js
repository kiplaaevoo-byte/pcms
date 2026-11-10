// Run: node server/autoMentionsCron.js  OR  require it in index.js
const cron = require('node-cron')
const fetch = require('node-fetch')

async function fetchNewsFor(keyword) {
  const q = encodeURIComponent(`"${keyword}" Kenya`)
  const url = `https://api.rss2json.com/v1/api.json?rss_url=https://news.google.com/rss/search?q=${q}%26hl=en-KE%26gl=KE%26ceid=KE:en`
  const res = await fetch(url)
  const d = await res.json()
  return (d.items || []).map(it => ({
    author: it.author || 'Google News',
    platform: '📰 News',
    text: `${it.title} - ${String(it.description || '').replace(/<[^>]*>/g, '').slice(0, 220)}`,
    link: it.link,
    candidateName: keyword,
    sourceType: 'AUTO-NEWS'
  }))
}

// Every hour at :00 - fetch for all candidates
cron.schedule('0 * * * *', async () => {
  try {
    const { prisma } = require('./prismaClient')
    const candidates = await prisma.candidate.findMany({ select: { fullName: true } })
    for (const c of candidates) {
      const mentions = await fetchNewsFor(c.fullName)
      for (const m of mentions) {
        const exists = await prisma.mention.findFirst({ where: { link: m.link } })
        if (!exists) await prisma.mention.create({ data: { ...m, isAuto: true } })
      }
    }
    console.log('✅ Auto News cron done')
  } catch (e) { console.log('Auto cron error', e) }
})
module.exports = {}