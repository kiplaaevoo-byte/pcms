const mongoose = require('mongoose');

const CandidateSchema = new mongoose.Schema({
  fullName: { type: String, required: true }, // e.g. Evans Kiplangat
  nickname: { type: String }, // e.g. Evans
  position: { type: String }, // e.g. MCA - Siongiroi Ward
  party: { type: String },
  county: { type: String },
  constituency: { type: String },
  ward: { type: String },
  photoUrl: { type: String },
  // All keywords system will scan for - auto generated + custom
  keywords: [{ type: String }],
  // Where to notify
  notifyTelegramChatId: { type: String },
  notifyEmail: { type: String },
  notifyWhatsApp: { type: String },
  isActive: { type: Boolean, default: true },
  lastScanAt: { type: Date },
  totalMentions: { type: Number, default: 0 },
}, { timestamps: true });

// Auto-build keywords from name + nicknames before save
CandidateSchema.pre('save', function(next) {
  const parts = [this.fullName, this.nickname, this.position].filter(Boolean);
  const auto = [];
  if (this.fullName) {
    auto.push(this.fullName); // "Evans Kiplangat"
    auto.push(this.fullName.split(' ')[0]); // "Evans"
    auto.push(this.fullName.split(' ').slice(-1)[0]); // "Kiplangat"
  }
  if (this.nickname) auto.push(this.nickname);
  // Merge without duplicates
  this.keywords = [...new Set([...(this.keywords || []), ...auto].map(k => k.trim()).filter(Boolean))];
  next();
});

module.exports = mongoose.model('Candidate', CandidateSchema);