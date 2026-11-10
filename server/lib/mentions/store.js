const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function saveMention(normalized, analysis) {
  if (!normalized || !normalized.platform || !normalized.externalId) {
    console.log('STORE SKIP: missing platform/externalId', normalized);
    return null;
  }
  const now = new Date();
  const mentionedAt = normalized.mentionedAt && !isNaN(new Date(normalized.mentionedAt).getTime())
    ? new Date(normalized.mentionedAt)
    : now;
  const data = {
    platform: String(normalized.platform),
    externalId: String(normalized.externalId),
    author: String(normalized.author || normalized.authorHandle || 'Unknown'),
    authorHandle: String(normalized.authorHandle || normalized.handle || ''),
    handle: String(normalized.handle || normalized.authorHandle || ''),
    authorId: normalized.authorId ? String(normalized.authorId) : null,
    text: String(normalized.text || ''),
    link: String(normalized.permalink || normalized.link || ''),
    url: String(normalized.permalink || normalized.link || ''),
    mediaUrl: normalized.mediaUrl || null,
    sentiment: String(analysis?.sentiment || 'NEUTRAL').toUpperCase(),
    intent: String(analysis?.intent || 'OTHER').toUpperCase(),
    status: 'NEW',
    sourceType: 'AUTO-SOCIAL',
    isAuto: true,
    postedAt: mentionedAt,
    mentionedAt,
    candidate: '',
    candidateName: '',
    organization: '',
    orgName: '',
    county: '',
    addedBy: 'AUTO',
    addedById: 'AUTO',
    createdById: null,
    likes: 0,
    shares: 0,
    rawPayload: normalized.rawPayload || {},
  };
  try {
    return await prisma.mention.upsert({
      where: { platform_externalId: { platform: data.platform, externalId: data.externalId } },
      update: {},
      create: data,
    });
  } catch (e) {
    console.log('STORE UPSERT FAILED, trying findFirst+create:', e.message);
    try {
      const existing = await prisma.mention.findFirst({
        where: { OR: [{ link: data.link }, { externalId: data.externalId }] },
      });
      if (existing) return existing;
      try {
        return await prisma.mention.create({ data });
      } catch {
        const { rawPayload, ...withoutRaw } = data;
        return await prisma.mention.create({ data: withoutRaw });
      }
    } catch (e3) {
      console.log('STORE CREATE FAILED:', e3.message);
      return null;
    }
  }
}

async function listMentions({ platform, sentiment, status, search }) {
  return prisma.mention.findMany({
    where: {
      // FIXED: Removed mode: 'insensitive' - SQLite does not support it
      ...(platform && String(platform).toLowerCase() !== 'all' ? { platform: String(platform) } : {}),
      ...(sentiment && String(sentiment).toLowerCase() !== 'all' ? { sentiment: String(sentiment).toUpperCase() } : {}),
      ...(status && String(status).toLowerCase() !== 'all' ? { status: String(status).toUpperCase() } : {}),
      ...(search ? { text: { contains: String(search) } } : {}),
    },
    orderBy: { mentionedAt: 'desc' },
    take: 100,
  });
}

module.exports = { saveMention, listMentions, prisma };