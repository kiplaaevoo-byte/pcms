const Candidate = require('../models/Candidate');
const Mention = require('../models/Mention'); // your existing model
const { fetchYouTube } = require('./fetchers/youtube');
const { fetchReddit } = require('./fetchers/reddit');
const { fetchX } = require('./fetchers/x');
const { fetchFacebook } = require('./fetchers/facebook');
const { fetchTikTok } = require('./fetchers/tiktok');
const { fetchInstagram } = require('./fetchers/instagram');
const { sendTelegramAlert } = require('./notifyTelegram');

async function scanCandidate(candidate) {
  console.log(`🔍 Scanning for ${candidate.fullName} - Keywords: ${candidate.keywords.join(', ')}`);
  let newMentions = [];

  for (const keyword of candidate.keywords) {
    try {
      // Run all in parallel, one failing should NOT stop others
      const results = await Promise.allSettled([
        fetchYouTube(keyword),
        fetchReddit(keyword),
        fetchX(keyword),
        fetchFacebook(keyword),
        fetchTikTok(keyword),
        fetchInstagram(keyword),
      ]);

      for (const r of results) {
        if (r.status === 'fulfilled' && r.value?.length) {
          newMentions.push(...r.value);
        }
      }
    } catch (e) { console.log(`Scan failed for keyword ${keyword}:`, e.message); }
  }

  // Deduplicate + Save only NEW mentions
  let savedCount = 0;
  for (const m of newMentions) {
    const exists = await Mention.findOne({ sourceUrl: m.sourceUrl });
    if (!exists) {
      await Mention.create({
        ...m,
        candidateId: candidate._id,
        candidateName: candidate.fullName,
        sourceType: 'AUTO-SOCIAL',
        isAuto: true,
      });
      savedCount++;

      // Instant notify if negative / high reach
      if (m.sentiment === 'Negative' || m.reach > 1000) {
        await sendTelegramAlert(candidate, m);
      }
    }
  }

  candidate.lastScanAt = new Date();
  candidate.totalMentions += savedCount;
  await candidate.save();
  return savedCount;
}

// Run every 5 mins for ALL active candidates
async function startAutoScanner() {
  setInterval(async () => {
    const candidates = await Candidate.find({ isActive: true });
    for (const c of candidates) await scanCandidate(c);
  }, 5 * 60 * 1000);
  console.log('✅ Auto Scanner running every 5 mins');
}

module.exports = { scanCandidate, startAutoScanner };