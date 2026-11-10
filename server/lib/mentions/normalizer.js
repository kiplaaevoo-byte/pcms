const KEYWORDS = [
  'pcms',
  '@pcms',
  '@pcms_bot',
  'pcms kenya',
  'evans kiplangat',
  'kiplangat',
  'uhuru kenyatta',
  'bomet',
  'ruto',
  'raila',
  'gachagua',
];
const hasKeyword = (t = '') => KEYWORDS.some(k => String(t).toLowerCase().includes(k));

// Helper: safe date - if invalid, use now, never Invalid Date
function safeDate(v) {
  const d = v ? new Date(v) : new Date();
  return isNaN(d.getTime()) ? new Date() : d;
}

// Helper: safe externalId - never return "undefined" string
function safeId(v, fallback) {
  if (v === undefined || v === null || String(v) === 'undefined' || String(v) === '') {
    return fallback ? String(fallback) : null;
  }
  return String(v);
}

function normalize(platform, payload) {
  // FIXED: Case-insensitive platform - Telegram / TELEGRAM / telegram all work
  // Webhook route passes req.params.platform which could be any case
  const p = String(platform || '').toLowerCase().trim();

  if (p === 'telegram') {
    const msg = payload.message || payload.channel_post || payload.edited_message || payload.edited_channel_post;
    if (!msg) return null;
    const text = msg.text || msg.caption || '';
    // FIXED: No keyword check for Telegram - DM to your bot = already relevant
    // Old code: if (!text || !hasKeyword(text)) return null; -> dropped "EVANS KIPLANGAT is doing great"
    if (!text) return null;
    const username = msg.from?.username || msg.sender_chat?.username || msg.sender_chat?.title || msg.chat?.title || 'unknown';
    const authorHandle = '@' + username;
    return {
      // FIXED: Capitalized platform to match DB + frontend filter
      platform: 'Telegram',
      externalId: safeId(msg.message_id, `${msg.chat?.id || ''}-${msg.date || Date.now()}`),
      // FIXED: Both author + authorHandle - store.js needs author, frontend needs handle
      author: username,
      authorHandle,
      handle: authorHandle,
      authorId: String(msg.from?.id || msg.sender_chat?.id || msg.chat?.id || ''),
      text,
      mediaUrl: null,
      permalink: null,
      // FIXED: msg.date is seconds, but if missing, safeDate handles it. Old code: new Date(msg.date * 1000) -> Invalid Date if msg.date undefined
      mentionedAt: safeDate(msg.date ? msg.date * 1000 : Date.now()),
      rawPayload: payload,
    };
  }

  if (p === 'instagram') {
    const value = payload.entry?.[0]?.changes?.[0]?.value;
    if (!value) return null;
    const text = value.text || value.caption || '';
    // NOTE: Instagram webhook only sends if you subscribed to mentions - if text empty, still save if media exists
    // But keep keyword check if text exists to avoid spam
    if (text && !hasKeyword(text)) return null;
    const username = value.username || value.from?.username || 'unknown';
    return {
      platform: 'Instagram',
      // FIXED: Never "undefined" - fallback to timestamp + username
      externalId: safeId(value.media?.id || value.id, `${username}-${Date.now()}`),
      author: username,
      authorHandle: '@' + username,
      handle: '@' + username,
      authorId: String(value.from?.id || value.user_id || ''),
      text,
      mediaUrl: value.media?.media_url || null,
      permalink: value.media?.permalink || value.permalink || null,
      mentionedAt: safeDate(value.timestamp || Date.now()),
      rawPayload: payload,
    };
  }

  if (p === 'facebook') {
    const value = payload.entry?.[0]?.changes?.[0]?.value;
    if (!value) return null;
    const text = value.message || value.text || value.caption || '';
    if (text && !hasKeyword(text)) return null;
    const username = value.from?.name || value.sender?.name || 'unknown';
    return {
      platform: 'Facebook',
      externalId: safeId(value.id || value.post_id || value.comment_id, `${username}-${Date.now()}`),
      author: username,
      authorHandle: username,
      handle: username,
      authorId: String(value.from?.id || value.sender?.id || ''),
      text,
      mediaUrl: null,
      permalink: value.permalink_url || null,
      mentionedAt: safeDate(value.created_time || Date.now()),
      rawPayload: payload,
    };
  }

  if (p === 'x' || p === 'twitter') {
    const data = payload.data;
    if (!data) return null;
    const username = payload.includes?.users?.[0]?.username || payload.includes?.users?.[0]?.name || 'unknown';
    const text = data.text || '';
    if (text && !hasKeyword(text)) return null;
    return {
      platform: 'X',
      externalId: safeId(data.id, null),
      author: username,
      authorHandle: '@' + username,
      handle: '@' + username,
      authorId: String(data.author_id || ''),
      text,
      mediaUrl: null,
      permalink: `https://x.com/i/status/${data.id}`,
      mentionedAt: safeDate(data.created_at),
      rawPayload: payload,
    };
  }

  if (p === 'youtube') {
    const snippet = payload.snippet?.topLevelComment?.snippet || payload.snippet;
    if (!snippet) return null;
    const text = (snippet.textDisplay || snippet.textOriginal || '').replace(/<[^>]*>/g, '');
    if (!hasKeyword(text)) return null;
    const authorName = snippet.authorDisplayName || 'unknown';
    return {
      platform: 'YouTube',
      externalId: safeId(payload.id, `${snippet.authorChannelId?.value || ''}-${snippet.publishedAt || Date.now()}`),
      // FIXED: Old code had authorHandle = authorDisplayName without @, frontend expects @handle
      author: authorName,
      authorHandle: authorName,
      handle: authorName,
      authorId: String(snippet.authorChannelId?.value || ''),
      text,
      mediaUrl: null,
      // FIXED: snippet.videoId may be undefined - old code made https://www.youtube.com/watch?v=undefined
      permalink: snippet.videoId ? `https://www.youtube.com/watch?v=${snippet.videoId}` : null,
      mentionedAt: safeDate(snippet.publishedAt),
      rawPayload: payload,
    };
  }

  if (p === 'tiktok') {
    const text = payload.comment_info?.comment_text || payload.caption || payload.desc || '';
    const id = payload.comment_info?.comment_id || payload.video_id || payload.id;
    if (!id || !text || !hasKeyword(text)) return null;
    const username = payload.comment_info?.comment_user_nickname || payload.author?.unique_id || payload.author?.nickname || 'unknown';
    return {
      platform: 'TikTok',
      externalId: safeId(id, null),
      author: username,
      authorHandle: '@' + username,
      handle: '@' + username,
      authorId: String(payload.comment_info?.comment_user_id || payload.author?.user_id || ''),
      text,
      mediaUrl: payload.cover_image_url || null,
      permalink: payload.share_url || null,
      mentionedAt: new Date(),
      rawPayload: payload,
    };
  }

  return null;
}
module.exports = { normalize };