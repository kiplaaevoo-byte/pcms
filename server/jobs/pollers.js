const axios = require('axios');
const { normalize } = require('../lib/mentions/normalizer');
const { analyze } = require('../lib/mentions/sentiment');
const { saveMention } = require('../lib/mentions/store');

async function ingest(platform, payload) {
  const n = normalize(platform, payload);
  if (!n) return;
  await saveMention(n, analyze(n.text || ''));
}
async function pollYouTube() {
  try {
    const { data } = await axios.get('https://www.googleapis.com/youtube/v3/commentThreads', {
      params: { key: process.env.YOUTUBE_API_KEY, part: 'snippet', searchTerms: 'PCMS', maxResults: 50, order: 'time' }
    });
    for (const item of data.items || []) await ingest('youtube', item);
    console.log('[poll] youtube', data.items?.length);
  } catch (e) { console.error('[poll] youtube failed', e.message); }
}
async function startPollers() {
  setInterval(pollYouTube, 15 * 60 * 1000);
  pollYouTube();
}
async function startXStream() {
  while (true) {
    try {
      const res = await axios.get('https://api.twitter.com/2/tweets/search/stream', {
        headers: { Authorization: `Bearer ${process.env.X_BEARER_TOKEN}` },
        params: { 'tweet.fields': 'created_at,author_id', expansions: 'author_id' },
        responseType: 'stream',
      });
      res.data.on('data', async (chunk) => {
        const line = chunk.toString().trim();
        if (!line) return;
        try { await ingest('x', JSON.parse(line)); } catch {}
      });
      await new Promise((resolve) => res.data.on('end', resolve));
    } catch (e) {
      console.error('[x] disconnected, retry 5s', e.message);
      await new Promise(r => setTimeout(r, 5000));
    }
  }
}
module.exports = { startPollers, startXStream, pollYouTube };