// FIXED: Must return UPPERCASE to match Prisma + frontend filter + routes/mentions.js
// Old file returned 'positive' / 'negative' lowercase -> stats + filter always 0
function analyze(text = '') {
  const t = String(text || '').toLowerCase();
  let sentiment = 'NEUTRAL', intent = 'OTHER';

  const NEG = ['bad', 'scam', 'fraud', 'angry', 'terrible', 'worst', 'hate', 'disappointed', 'refund', 'corrupt', 'steal', 'thief', 'lie', 'scandal', 'arrest', 'cheat', 'shame', 'kill', 'violence', 'rig', 'fail', 'disgusting', 'useless'];
  const POS = ['love', 'great', 'amazing', 'thanks', 'thank', 'excellent', 'best', 'awesome', 'win', 'good', 'support', 'strong', 'leader', 'hope', 'vote', 'proud', 'fantastic', 'wonderful'];

  if (NEG.some(w => t.includes(w))) {
    sentiment = 'NEGATIVE'; intent = 'COMPLAINT';
  } else if (POS.some(w => t.includes(w))) {
    sentiment = 'POSITIVE'; intent = 'PRAISE';
  }

  // FIXED: Question overrides intent, but keeps sentiment
  // Old: if text had '?' + 'bad', intent became 'question' lowercase and sentiment stayed negative - correct logic, wrong case
  if (t.includes('?') || t.includes('how') || t.includes('when') || t.includes('where') || t.includes('why')) intent = 'QUESTION';
  if (t.includes('free money') && t.includes('http')) intent = 'SPAM';

  return { sentiment, intent };
}

module.exports = { analyze };