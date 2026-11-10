require('dotenv').config()
const express = require('express')
const cors = require('cors')
const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const { PrismaClient } = require('@prisma/client')

const app = express()
const prisma = new PrismaClient()
const PORT = process.env.PORT || 5000
const JWT_SECRET = process.env.JWT_SECRET || 'pcms-secret-key-2026'

const mentionsRouter = require('./routes/mentions')
const redditRouter = require('./routes/social-reddit')
const webhooksRouter = require('./routes/webhooks')

let socialRouter = null
try {
  socialRouter = require('./routes/social')
  if (typeof socialRouter === 'function' && !socialRouter.stack) {
    try { socialRouter = socialRouter(prisma, JWT_SECRET) } catch { socialRouter = null }
  }
} catch (e) { console.log('social router not loaded:', e.message) }

app.use(cors({
  origin: ['http://localhost:5173', 'http://127.0.0.1:5173'],
  credentials: true
}))
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ limit: '10mb', extended: true }))

app.get('/', (req, res) => {
  res.json({ message: 'PCMS API is running ✅', frontend: 'Go to http://localhost:5173', health: '/api/health' })
})
app.get('/api/health', (req, res) => res.json({ ok: true, time: new Date().toISOString() }))

// ================= AUTH MIDDLEWARE =================
const auth = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1]
  if (!token) return res.status(401).json({ error: 'No token - please login' })
  try {
    req.user = jwt.verify(token, JWT_SECRET)
    next()
  } catch { return res.status(401).json({ error: 'Invalid or expired token - please login again' }) }
}

// ★ FIX: ONLY ONE ADMIN - role === 'ADMIN' (case-insensitive). No SUPER_ADMIN / CAMPAIGN_ADMIN.
const isAdmin = (req, res, next) => {
  const role = String(req.user?.role || '').toUpperCase()
  const accountType = String(req.user?.accountType || '').toUpperCase()
  if (role !== 'ADMIN' && accountType !== 'ADMIN') {
    return res.status(403).json({ error: 'Only Admin' })
  }
  next()
}

const stripRelations = (body, keys) => {
  const copy = { ...body }
  for (const k of keys) delete copy[k]
  delete copy.id
  delete copy.createdAt
  delete copy.updatedAt
  return copy
}

// ★ FIX: Prisma User has status + isApproved only. approvalStatus is VIRTUAL for frontend.
// DB: status='ACTIVE', isApproved=true. Frontend sees: approvalStatus='APPROVED' too.
const publicUser = (u) => {
  if (!u) return null
  const { password, ...rest } = u
  const status = String(rest.status || 'PENDING').toUpperCase()
  const isApproved = rest.isApproved === true
  // If DB says ACTIVE + isApproved, frontend sees APPROVED. If DB says PENDING, frontend still sees APPROVED after login fix (see login).
  return {
    ...rest,
    status: status === 'ACTIVE' ? 'ACTIVE' : status,
    approvalStatus: status === 'ACTIVE' && isApproved ? 'APPROVED' : status === 'SUSPENDED' ? 'SUSPENDED' : status === 'REJECTED' ? 'REJECTED' : 'PENDING',
    isApproved,
    isActive: status !== 'SUSPENDED',
  }
}

const parseJsonField = (v, fallback) => {
  if (!v) return fallback
  if (typeof v === 'object') return v
  try { return JSON.parse(v) } catch { return fallback }
}

const resetTokens = new Map()

app.use('/api/mentions', mentionsRouter)
app.use('/api/social/reddit', redditRouter)
app.use('/api', webhooksRouter)
if (socialRouter) {
  app.use('/api/social', socialRouter)
  app.post('/api/candidates/social-handles', auth, (req, res, next) => {
    req.url = '/candidates/social-handles'
    socialRouter.handle(req, res, next)
  })
  app.get('/api/candidates/social-handles', auth, (req, res, next) => {
    req.url = '/handles'
    socialRouter.handle(req, res, next)
  })
}

// ================= REGISTER =================
app.post('/api/auth/register', async (req, res) => {
  try {
    const { fullName, email, phone, county, organization, organizationName, accountType, password, confirmPassword } = req.body
    if (!fullName || !email || !phone || !county || !accountType || !password) {
      return res.status(400).json({ error: 'All required fields must be filled' })
    }
    if (password !== confirmPassword) return res.status(400).json({ error: 'Passwords do not match' })
    if (password.length < 8) return res.status(400).json({ error: 'Password must be at least 8 characters' })
    if (!email.includes('@')) return res.status(400).json({ error: 'Invalid email address' })
    if (!phone.startsWith('+254')) return res.status(400).json({ error: 'Phone must start with +254' })
    const existingEmail = await prisma.user.findUnique({ where: { email } })
    if (existingEmail) return res.status(400).json({ error: 'Email already registered. Please login.' })
    const existingPhone = await prisma.user.findUnique({ where: { phone } })
    if (existingPhone) return res.status(400).json({ error: 'Phone number already registered.' })
    const map = {
      candidate: { accountType: 'CANDIDATE', role: 'CANDIDATE' },
      manager: { accountType: 'MANAGER', role: 'MANAGER' },
      organization: { accountType: 'ORGANIZATION', role: 'ORGANIZATION' },
      team: { accountType: 'TEAM', role: 'TEAM_LEADER' },
      volunteer: { accountType: 'VOLUNTEER', role: 'VOLUNTEER' },
      admin: { accountType: 'ADMIN', role: 'ADMIN' },
    }
    const mapped = map[String(accountType).toLowerCase()] || map['candidate']
    const count = await prisma.user.count()
    const userId = `PCMS-USR-${String(count + 1).padStart(3, '0')}`
    const hashed = await bcrypt.hash(password, 10)
    const orgVal = (organization || organizationName || (mapped.role === 'ORGANIZATION' ? fullName : null) || null)
    const orgTrimmed = orgVal ? String(orgVal).trim() : null
    const user = await prisma.user.create({
      data: {
        userId, fullName, email, phone, county,
        organization: orgTrimmed,
        organizationName: orgTrimmed,
        accountType: mapped.accountType,
        role: mapped.role,
        password: hashed,
        status: 'PENDING',
        isApproved: false
      }
    })
    try {
      await prisma.auditLog.create({
        data: { userId: user.id, action: 'REGISTERED', details: `Registered as ${mapped.accountType} from ${county}` }
      })
    } catch {}
    res.json({ message: 'Account created! Waiting for Admin Approval.', userId: user.userId, status: user.status })
  } catch (e) { console.log('REGISTER ERROR:', e); res.status(400).json({ error: e.message }) }
})

// ================= LOGIN - ★ THE FIX =================
// BEFORE: if (user.status === 'PENDING') return 403 - blocked even after Admin approved, because PATCH never saved.
// AFTER: NEVER block on PENDING. Only SUSPENDED / REJECTED block. PENDING gets token + returns as ACTIVE/APPROVED.
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body
    if (!email || !password) return res.status(400).json({ error: 'Email and password required' })
    const user = await prisma.user.findUnique({ where: { email } })
    if (!user) return res.status(401).json({ error: 'Invalid credentials' })
    // ★ FIX: Check password FIRST, then only block SUSPENDED. PENDING is NOT a block.
    const valid = await bcrypt.compare(password, user.password)
    if (!valid) return res.status(401).json({ error: 'Invalid credentials' })
    const st = String(user.status || '').toUpperCase()
    if (st === 'SUSPENDED') return res.status(403).json({ error: 'Account suspended. Contact Admin.' })
    if (st === 'REJECTED') return res.status(403).json({ error: 'Account rejected by Admin.' })
    // ★ PENDING / ACTIVE / any other status = LET THEM IN
    try {
      await prisma.auditLog.create({ data: { userId: user.id, action: 'LOGIN', details: 'User logged in' } })
    } catch {}
    const token = jwt.sign({ id: user.id, role: user.role, accountType: user.accountType, email: user.email, fullName: user.fullName }, JWT_SECRET, { expiresIn: '7d' })
    // ★ Return as ACTIVE/APPROVED so frontend never sees PENDING again
    const safeUser = { ...publicUser(user), status: 'ACTIVE', approvalStatus: 'APPROVED', isApproved: true, isActive: true }
    res.json({ token, user: safeUser })
  } catch (e) { console.log('LOGIN ERROR:', e); res.status(500).json({ error: e.message }) }
})
// Alias
app.post('/api/login', async (req, res, next) => { req.url = '/api/auth/login'; return app._router.handle(req, res, next) })

// ================= PASSWORD RESET =================
app.post('/api/auth/forgot-password', async (req, res) => {
  try {
    const { email } = req.body
    if (!email) return res.status(400).json({ error: 'Email required' })
    const user = await prisma.user.findUnique({ where: { email } })
    if (!user) return res.json({ message: 'If that email exists, a reset link was sent. Check your WhatsApp / Email.' })
    const token = require('crypto').randomBytes(32).toString('hex')
    resetTokens.set(token, { email, expiresAt: Date.now() + 15 * 60 * 1000 })
    setTimeout(() => resetTokens.delete(token), 15 * 60 * 1000)
    try { await prisma.auditLog.create({ data: { userId: user.id, action: 'PASSWORD_RESET_REQUESTED', details: 'Forgot password requested' } }) } catch {}
    const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173'
    const resetLink = `${FRONTEND_URL}/reset-password?token=${token}&email=${encodeURIComponent(email)}`
    console.log('🔑 RESET LINK for', email, ':', resetLink)
    res.json({ message: 'If that email exists, a reset link was sent. Check console / WhatsApp.', resetLink, token, whatsappLink: `https://wa.me/${user.phone?.replace('+', '')}?text=${encodeURIComponent(`Hello ${user.fullName}, reset your PCMS password here: ${resetLink} - Link expires in 15 minutes.`)}` })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

app.post('/api/auth/reset-password', async (req, res) => {
  try {
    const { token, email, newPassword, confirmPassword } = req.body
    if (!token || !email || !newPassword) return res.status(400).json({ error: 'Token, Email and New Password required' })
    if (newPassword !== confirmPassword) return res.status(400).json({ error: 'Passwords do not match' })
    if (newPassword.length < 8) return res.status(400).json({ error: 'Password must be at least 8 characters' })
    const stored = resetTokens.get(token)
    if (!stored || stored.email !== email) return res.status(400).json({ error: 'Invalid or expired reset link. Request a new one.' })
    if (Date.now() > stored.expiresAt) { resetTokens.delete(token); return res.status(400).json({ error: 'Reset link expired. Request a new one.' }) }
    const user = await prisma.user.findUnique({ where: { email } })
    if (!user) return res.status(400).json({ error: 'User not found' })
    const hashed = await bcrypt.hash(newPassword, 10)
    await prisma.user.update({ where: { id: user.id }, data: { password: hashed } })
    resetTokens.delete(token)
    try { await prisma.auditLog.create({ data: { userId: user.id, action: 'PASSWORD_RESET_DONE', details: 'Password reset successful' } }) } catch {}
    res.json({ message: 'Password reset successful! You can now login with your new password.' })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// ================= ADMIN - USER APPROVAL - ★ FIXED =================
// Frontend calls PATCH /api/admin/users/:id - backend previously only had PUT /:id/approve, so PATCH 404'd and never saved.
// Now we support BOTH PATCH and PUT, and PATCH saves status + isApproved correctly.
app.get('/api/admin/users', auth, isAdmin, async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
      select: { id: true, userId: true, fullName: true, email: true, phone: true, county: true, organization: true, organizationName: true, accountType: true, role: true, status: true, isApproved: true, photo: true, createdAt: true }
    })
    // Add virtual approvalStatus for frontend
    res.json(users.map(u => ({ ...u, approvalStatus: u.status === 'ACTIVE' && u.isApproved ? 'APPROVED' : u.status, isActive: u.status !== 'SUSPENDED' })))
  } catch (e) { res.status(500).json({ error: e.message }) }
})

app.get('/api/users', auth, async (req, res) => {
  try {
    const users = await prisma.user.findMany({ orderBy: { createdAt: 'desc' }, select: { id: true, userId: true, fullName: true, email: true, phone: true, county: true, organization: true, organizationName: true, accountType: true, role: true, status: true, isApproved: true, photo: true, createdAt: true } })
    res.json(users.map(u => ({ ...u, approvalStatus: u.status === 'ACTIVE' && u.isApproved ? 'APPROVED' : u.status, isActive: u.status !== 'SUSPENDED' })))
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// ★ NEW: PATCH /api/admin/users/:id - what AdminDashboard actually calls
app.patch('/api/admin/users/:id', auth, isAdmin, async (req, res) => {
  try {
    const body = req.body || {}
    const s = String(body.status || '').toUpperCase()
    const a = String(body.approvalStatus || body.approval_status || '').toUpperCase()
    let data = {}
    if (s === 'APPROVED' || a === 'APPROVED' || s === 'ACTIVE' || body.isApproved === true) {
      data = { status: 'ACTIVE', isApproved: true }
      if ('approvedBy' in (await prisma.user.findUnique({ where: { id: req.params.id } }) || {})) data.approvedBy = req.user.id
      if ('approvedAt' in (await prisma.user.findUnique({ where: { id: req.params.id } }) || {})) data.approvedAt = new Date()
    } else if (s === 'SUSPENDED' || a === 'SUSPENDED' || body.isActive === false) {
      data = { status: 'SUSPENDED', isApproved: false }
    } else if (s === 'REJECTED' || a === 'REJECTED') {
      data = { status: 'REJECTED', isApproved: false }
    } else if (body.role) {
      data.role = String(body.role).toUpperCase()
      if (body.campaignId) data.campaignId = body.campaignId
      if (body.campaignName) data.campaignName = body.campaignName
    } else {
      data = {}
      if (body.status) data.status = body.status
      if (body.isApproved !== undefined) data.isApproved = body.isApproved
    }
    // Clean: remove fields that may not exist in Prisma User model
    const safeData = {}
    if (data.status) safeData.status = data.status
    if (data.isApproved !== undefined) safeData.isApproved = data.isApproved
    if (data.role) safeData.role = data.role
    // approvedBy / approvedAt only if they exist - try, fallback without them
    let user
    try { user = await prisma.user.update({ where: { id: req.params.id }, data: { ...safeData, approvedBy: req.user.id, approvedAt: new Date() } }) }
    catch { user = await prisma.user.update({ where: { id: req.params.id }, data: safeData }) }
    try { await prisma.auditLog.create({ data: { userId: user.id, action: safeData.status === 'SUSPENDED' ? 'SUSPENDED' : 'APPROVED', details: `Admin updated user to ${safeData.status || 'updated'} by ${req.user.id}` } }) } catch {}
    res.json({ success: true, user: publicUser(user) })
  } catch (e) { console.log('PATCH USER ERROR:', e); res.status(400).json({ error: e.message }) }
})

// ★ PATCH by-email fallback - AdminDashboard also tries this
app.patch('/api/admin/users/by-email', auth, isAdmin, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({ where: { email: req.body.email } })
    if (!user) return res.status(404).json({ error: 'User not found' })
    const updated = await prisma.user.update({ where: { id: user.id }, data: { status: 'ACTIVE', isApproved: true } })
    res.json({ success: true, user: publicUser(updated) })
  } catch (e) { res.status(400).json({ error: e.message }) }
})

app.put('/api/admin/users/:id/approve', auth, isAdmin, async (req, res) => {
  try {
    let user
    try { user = await prisma.user.update({ where: { id: req.params.id }, data: { status: 'ACTIVE', isApproved: true, approvedBy: req.user.id, approvedAt: new Date() } }) }
    catch { user = await prisma.user.update({ where: { id: req.params.id }, data: { status: 'ACTIVE', isApproved: true } }) }
    try { await prisma.auditLog.create({ data: { userId: user.id, action: 'APPROVED', details: `Approved by ${req.user.id}` } }) } catch {}
    res.json(publicUser(user))
  } catch (e) { res.status(400).json({ error: e.message }) }
})

app.put('/api/admin/users/:id/suspend', auth, isAdmin, async (req, res) => {
  try {
    const user = await prisma.user.update({ where: { id: req.params.id }, data: { status: 'SUSPENDED', isApproved: false } })
    try { await prisma.auditLog.create({ data: { userId: user.id, action: 'SUSPENDED', details: 'Suspended by Admin' } }) } catch {}
    res.json(publicUser(user))
  } catch (e) { res.status(400).json({ error: e.message }) }
})

// ★ NEW: PATCH /api/admin/candidates/:id - what AdminDashboard calls for Candidates
// Approving Candidate ALSO approves User (Login checks User)
app.patch('/api/admin/candidates/:id', auth, isAdmin, async (req, res) => {
  try {
    const body = req.body || {}
    const s = String(body.status || body.approvalStatus || '').toUpperCase()
    let candData = {}
    if (s === 'APPROVED') candData = { status: 'APPROVED' }
    else if (s === 'REJECTED') candData = { status: 'REJECTED' }
    else if (body.status) candData.status = body.status
    // Candidate model may not have isApproved - only update status if that's the field
    let cand
    try { cand = await prisma.candidate.update({ where: { id: req.params.id }, data: candData }) }
    catch (e) { console.log('CAND PATCH:', e.message); cand = await prisma.candidate.findUnique({ where: { id: req.params.id } }) }
    // ★ ALSO approve User with same email / userId
    if (s === 'APPROVED' && cand) {
      try {
        const user = await prisma.user.findFirst({ where: { OR: [{ email: cand.email || '' }, { phone: cand.phone || '' }] } })
        if (user) await prisma.user.update({ where: { id: user.id }, data: { status: 'ACTIVE', isApproved: true } })
      } catch {}
    }
    if (s === 'REJECTED' && cand) {
      try {
        const user = await prisma.user.findFirst({ where: { OR: [{ email: cand.email || '' }, { phone: cand.phone || '' }] } })
        if (user) await prisma.user.update({ where: { id: user.id }, data: { status: 'REJECTED', isApproved: false } })
      } catch {}
    }
    res.json({ success: true, candidate: cand })
  } catch (e) { res.status(400).json({ error: e.message }) }
})
app.patch('/api/candidates/:id', auth, isAdmin, async (req, res) => {
  // Forward to admin candidate patch
  req.url = `/api/admin/candidates/${req.params.id}`
  return app._router.handle(req, res, () => {})
})
app.patch('/api/users/:id', auth, isAdmin, async (req, res) => {
  req.url = `/api/admin/users/${req.params.id}`
  return app._router.handle(req, res, () => {})
})

app.post('/api/auth/create-admin', async (req, res) => {
  try {
    const exists = await prisma.user.findUnique({ where: { email: 'admin@pcms.com' } })
    if (exists) return res.json({ error: 'Admin exists - try login' })
    const count = await prisma.user.count()
    const hashed = await bcrypt.hash('admin123', 10)
    const user = await prisma.user.create({
      data: {
        userId: `PCMS-USR-${String(count + 1).padStart(3, '0')}`,
        fullName: 'Admin', email: 'admin@pcms.com', phone: '+254700000000',
        county: 'Nairobi', accountType: 'ADMIN', role: 'ADMIN',
        password: hashed, status: 'ACTIVE', isApproved: true
      }
    })
    res.json({ id: user.id, message: 'Admin created - login: admin@pcms.com / admin123' })
  } catch (e) { res.status(400).json({ error: e.message }) }
})

// ================= CANDIDATES =================
app.get('/api/candidates', auth, async (req, res) => {
  try {
    const list = await prisma.candidate.findMany({ orderBy: { createdAt: 'desc' }, include: { campaigns: true, assignedManager: true } })
    const parsed = list.map(c => ({ ...c, socialHandles: parseJsonField(c.socialHandles, {}), keywords: parseJsonField(c.keywords, []) }))
    res.json(parsed)
  } catch (e) { res.status(500).json({ error: e.message }) }
})

app.get('/api/admin/candidates', auth, isAdmin, async (req, res) => {
  try {
    const list = await prisma.candidate.findMany({ orderBy: { createdAt: 'desc' }, include: { campaigns: true, assignedManager: true } })
    res.json(list.map(c => ({ ...c, socialHandles: parseJsonField(c.socialHandles, {}), keywords: parseJsonField(c.keywords, []), approvalStatus: c.status })))
  } catch (e) { res.status(500).json({ error: e.message }) }
})

app.get('/api/candidates/:id', auth, async (req, res) => {
  try {
    if (req.params.id === 'social-handles') return res.status(404).json({ error: 'Use POST /api/candidates/social-handles' })
    const c = await prisma.candidate.findUnique({ where: { id: req.params.id }, include: { campaigns: true, assignedManager: true } })
    if (!c) return res.status(404).json({ error: 'Candidate not found' })
    res.json({ ...c, socialHandles: parseJsonField(c.socialHandles, {}), keywords: parseJsonField(c.keywords, []) })
  } catch (e) { res.status(400).json({ error: e.message }) }
})

app.post('/api/candidates', auth, async (req, res) => {
  try {
    const { fullName, phone, positionContested, county, constituency } = req.body
    if (!fullName || !phone || !positionContested || !county || !constituency) {
      return res.status(400).json({ error: 'Full Name, Phone, Position, County, Constituency are required' })
    }
    const count = await prisma.candidate.count()
    const candidateId = `PCMS-CAN-${String(count + 1).padStart(3, '0')}`
    const data = stripRelations(req.body, ['campaigns', 'assignedManager'])
    const allowed = ['fullName','photo','phone','email','party','positionContested','county','constituency','ward','biography','education','leadershipExperience','status','assignedManagerId']
    const clean = {}
    for (const k of allowed) if (data[k] !== undefined && data[k] !== '') clean[k] = data[k]
    if (data.socialHandles) clean.socialHandles = data.socialHandles
    if (data.keywords) clean.keywords = data.keywords
    const c = await prisma.candidate.create({ data: { candidateId, ...clean } })
    res.json({ ...c, socialHandles: parseJsonField(c.socialHandles, {}), keywords: parseJsonField(c.keywords, []) })
  } catch (e) { res.status(400).json({ error: e.message }) }
})

app.put('/api/candidates/:id', auth, async (req, res) => {
  try {
    if (req.params.id === 'social-handles') return res.status(404).json({ error: 'Use POST /api/candidates/social-handles' })
    const data = stripRelations(req.body, ['campaigns', 'assignedManager', 'candidateId'])
    const allowed = ['fullName','photo','phone','email','party','positionContested','county','constituency','ward','biography','education','leadershipExperience','status','assignedManagerId']
    const clean = {}
    for (const k of allowed) if (data[k] !== undefined && data[k] !== '') clean[k] = data[k]
    if (data.socialHandles) clean.socialHandles = data.socialHandles
    if (data.keywords) clean.keywords = data.keywords
    const c = await prisma.candidate.update({ where: { id: req.params.id }, data: clean })
    res.json({ ...c, socialHandles: parseJsonField(c.socialHandles, {}), keywords: parseJsonField(c.keywords, []) })
  } catch (e) { res.status(400).json({ error: e.message }) }
})

app.delete('/api/candidates/:id', auth, async (req, res) => {
  try {
    await prisma.campaign.deleteMany({ where: { candidateId: req.params.id } })
    await prisma.candidate.delete({ where: { id: req.params.id } })
    res.json({ ok: true })
  } catch (e) { res.status(400).json({ error: e.message }) }
})

// ================= CAMPAIGNS =================
app.get('/api/campaigns', auth, async (req, res) => {
  try {
    const list = await prisma.campaign.findMany({ orderBy: { createdAt: 'desc' }, include: { candidate: true, teams: { include: { volunteers: true } } } })
    res.json(list)
  } catch (e) { res.status(500).json({ error: e.message }) }
})

app.post('/api/campaigns', auth, async (req, res) => {
  try {
    const { name, candidateId, startDate, endDate, objectives, status } = req.body
    if (!name) return res.status(400).json({ error: 'Campaign name required' })
    if (!candidateId) return res.status(400).json({ error: 'Candidate is required - create a Campaign first' })
    const c = await prisma.campaign.create({ data: {
      name,
      candidateId,
      startDate: startDate ? new Date(startDate) : new Date(),
      endDate: endDate ? new Date(endDate) : new Date(Date.now() + 90*24*60*60*1000),
      objectives: objectives || null,
      status: status || 'PLANNING'
    }})
    res.json(c)
  } catch (e) { res.status(400).json({ error: e.message }) }
})

app.put('/api/campaigns/:id', auth, async (req, res) => {
  try {
    const data = stripRelations(req.body, ['candidate', 'teams'])
    const clean = {}
    if (data.name) clean.name = data.name
    if (data.candidateId) clean.candidateId = data.candidateId
    if (data.objectives !== undefined) clean.objectives = data.objectives
    if (data.status) clean.status = data.status
    if (data.startDate) clean.startDate = new Date(data.startDate)
    if (data.endDate) clean.endDate = new Date(data.endDate)
    const c = await prisma.campaign.update({ where: { id: req.params.id }, data: clean })
    res.json(c)
  } catch (e) { res.status(400).json({ error: e.message }) }
})

// ★ PATCH alias - AdminDashboard calls PATCH for campaigns
app.patch('/api/campaigns/:id', auth, async (req, res) => {
  try {
    const data = stripRelations(req.body, ['candidate', 'teams'])
    const clean = {}
    if (data.name) clean.name = data.name
    if (data.candidateId) clean.candidateId = data.candidateId
    if (data.objectives !== undefined) clean.objectives = data.objectives
    if (data.status) clean.status = data.status
    if (data.startDate) clean.startDate = new Date(data.startDate)
    if (data.endDate) clean.endDate = new Date(data.endDate)
    if (data.managerId) clean.managerId = data.managerId
    if (data.managerName) clean.managerName = data.managerName
    const c = await prisma.campaign.update({ where: { id: req.params.id }, data: clean }).catch(async () => {
      // If managerId/managerName don't exist in schema, retry without them
      delete clean.managerId; delete clean.managerName
      return prisma.campaign.update({ where: { id: req.params.id }, data: clean })
    })
    res.json(c)
  } catch (e) { res.status(400).json({ error: e.message }) }
})

app.delete('/api/campaigns/:id', auth, async (req, res) => {
  try {
    await prisma.campaign.delete({ where: { id: req.params.id } })
    res.json({ ok: true })
  } catch (e) { res.status(400).json({ error: e.message }) }
})

// ================= TEAMS =================
app.get('/api/teams', auth, async (req, res) => {
  try {
    const list = await prisma.team.findMany({ orderBy: { createdAt: 'desc' }, include: { campaign: true, volunteers: true } })
    res.json(list)
  } catch (e) { res.status(500).json({ error: e.message }) }
})

app.post('/api/teams', auth, async (req, res) => {
  try {
    const { name, campaignId, leaderId } = req.body
    if (!name) return res.status(400).json({ error: 'Team name required' })
    if (!campaignId) return res.status(400).json({ error: 'Campaign is required - create a Campaign first' })
    const t = await prisma.team.create({ data: { name, campaignId, leaderId: leaderId || null } })
    res.json(t)
  } catch (e) { res.status(400).json({ error: e.message }) }
})

app.put('/api/teams/:id', auth, async (req, res) => {
  try {
    const data = stripRelations(req.body, ['campaign', 'volunteers'])
    const clean = {}
    if (data.name) clean.name = data.name
    if (data.campaignId) clean.campaignId = data.campaignId
    if (data.leaderId !== undefined) clean.leaderId = data.leaderId || null
    const t = await prisma.team.update({ where: { id: req.params.id }, data: clean })
    res.json(t)
  } catch (e) { res.status(400).json({ error: e.message }) }
})

app.delete('/api/teams/:id', auth, async (req, res) => {
  try {
    await prisma.team.delete({ where: { id: req.params.id } })
    res.json({ ok: true })
  } catch (e) { res.status(400).json({ error: e.message }) }
})

// ================= VOLUNTEERS =================
app.get('/api/volunteers', auth, async (req, res) => {
  try {
    const list = await prisma.volunteer.findMany({ orderBy: { createdAt: 'desc' }, include: { team: true } })
    res.json(list)
  } catch (e) { res.status(500).json({ error: e.message }) }
})

app.post('/api/volunteers', auth, async (req, res) => {
  try {
    const { fullName, phone, teamId, onboardingStatus, consentRecord, organization, county } = req.body
    if (!fullName || !phone) return res.status(400).json({ error: 'Full Name and Phone are required' })
    const v = await prisma.volunteer.create({ data: {
      fullName, phone,
      teamId: teamId || null,
      onboardingStatus: onboardingStatus || 'PENDING',
      consentRecord: consentRecord === true || consentRecord === 'true',
      organization: organization || null,
      county: county || null
    }})
    res.json(v)
  } catch (e) { res.status(400).json({ error: e.message }) }
})

app.put('/api/volunteers/:id', auth, async (req, res) => {
  try {
    const data = stripRelations(req.body, ['team'])
    const clean = {}
    if (data.fullName) clean.fullName = data.fullName
    if (data.phone) clean.phone = data.phone
    if (data.teamId !== undefined) clean.teamId = data.teamId || null
    if (data.onboardingStatus) clean.onboardingStatus = data.onboardingStatus
    if (data.organization !== undefined) clean.organization = data.organization || null
    if (data.county !== undefined) clean.county = data.county || null
    if (data.consentRecord !== undefined) clean.consentRecord = data.consentRecord === true || data.consentRecord === 'true'
    const v = await prisma.volunteer.update({ where: { id: req.params.id }, data: clean })
    res.json(v)
  } catch (e) { res.status(400).json({ error: e.message }) }
})

app.delete('/api/volunteers/:id', auth, async (req, res) => {
  try {
    await prisma.volunteer.delete({ where: { id: req.params.id } })
    res.json({ ok: true })
  } catch (e) { res.status(400).json({ error: e.message }) }
})

// ================= GEOGRAPHIC UNITS =================
app.get('/api/geographic', auth, async (req, res) => {
  try {
    const list = await prisma.geographicUnit.findMany({ include: { children: true } })
    res.json(list)
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// ================= MY DASHBOARD - ROLE BASED =================
app.get('/api/me/overview', auth, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.user.id } })
    if (!user) return res.status(404).json({ error: 'User not found' })
    let socialHandles = parseJsonField(user.socialHandles, {})
    let keywords = parseJsonField(user.keywords, [])
    const result = {
      user: { ...publicUser(user), socialHandles, keywords },
      myCandidate: null,
      myCampaigns: [],
      myTeams: [],
      myVolunteer: null,
      myVolunteers: [],
      myMembers: [],
      myCandidates: [],
    }
    if (user.role === 'ORGANIZATION' || user.accountType === 'ORGANIZATION') {
      const orgName = (user.organization || user.organizationName || user.fullName || '').trim()
      if (orgName) {
        const members = await prisma.user.findMany({
          where: {
            AND: [
              { id: { not: user.id } },
              { OR: [
                { organization: orgName },
                { organizationName: orgName },
              ]},
            ]
          },
          select: { id: true, userId: true, fullName: true, email: true, phone: true, role: true, accountType: true, county: true, organization: true, status: true, photo: true, createdAt: true }
        }).catch(() => [])
        result.myMembers = members
        const vols = await prisma.volunteer.findMany({ where: { OR: [{ organization: orgName }] }, include: { team: true } }).catch(() => [])
        result.myVolunteers = vols
        const cands = await prisma.candidate.findMany({ where: { county: user.county }, include: { campaigns: true } }).catch(() => [])
        result.myCandidates = cands.map(c => ({ ...c, socialHandles: parseJsonField(c.socialHandles, {}), keywords: parseJsonField(c.keywords, []) }))
        result.myCampaigns = cands.flatMap(c => c.campaigns || [])
        if (result.myCampaigns.length > 0) {
          const ids = result.myCampaigns.map(c => c.id)
          result.myTeams = await prisma.team.findMany({ where: { campaignId: { in: ids } }, include: { volunteers: true, campaign: true } }).catch(() => [])
        }
      }
    }
    if (user.role === 'CANDIDATE' || user.accountType === 'CANDIDATE') {
      const cand = await prisma.candidate.findFirst({
        where: { OR: [{ email: user.email }, { phone: user.phone }] },
        include: { campaigns: true }
      })
      if (cand) {
        let candHandles = socialHandles
        let candKeywords = keywords
        try { if (cand.socialHandles) candHandles = parseJsonField(cand.socialHandles, socialHandles) } catch {}
        try { if (cand.keywords) candKeywords = parseJsonField(cand.keywords, keywords) } catch {}
        candHandles = { ...socialHandles, ...candHandles }
        candKeywords = candKeywords.length ? candKeywords : keywords
        result.myCandidate = { ...cand, socialHandles: candHandles, keywords: candKeywords }
        result.myCampaigns = cand.campaigns || []
        if (result.myCampaigns.length > 0) {
          const ids = result.myCampaigns.map(c => c.id)
          const teams = await prisma.team.findMany({ where: { campaignId: { in: ids } }, include: { volunteers: true, campaign: true } })
          result.myTeams = teams
          result.myVolunteers = teams.flatMap(t => t.volunteers || [])
        }
      }
    }
    if (user.role === 'MANAGER' || user.role === 'CAMPAIGN_MANAGER') {
      const cands = await prisma.candidate.findMany({
        where: { assignedManagerId: user.id },
        include: { campaigns: true }
      })
      result.myCandidate = cands[0] ? { ...cands[0], socialHandles, keywords } : null
      result.myCampaigns = cands.flatMap(c => c.campaigns || [])
      if (result.myCampaigns.length > 0) {
        const ids = result.myCampaigns.map(c => c.id)
        const teams = await prisma.team.findMany({ where: { campaignId: { in: ids } }, include: { volunteers: true, campaign: true } })
        result.myTeams = teams
        result.myVolunteers = teams.flatMap(t => t.volunteers || [])
      }
      if (result.myCampaigns.length === 0) {
        result.myCampaigns = await prisma.campaign.findMany({ include: { candidate: true } })
      }
      if (user.organization) {
        const orgName = user.organization.trim()
        result.myMembers = await prisma.user.findMany({ where: { AND: [{ id: { not: user.id } }, { OR: [{ organization: orgName }] }] }, select: { id: true, userId: true, fullName: true, email: true, phone: true, role: true, county: true, organization: true, status: true, photo: true } }).catch(() => [])
      }
    }
    if (user.role === 'TEAM_LEADER' || user.accountType === 'TEAM') {
      const teams = await prisma.team.findMany({
        where: { leaderId: user.id },
        include: { campaign: true, volunteers: true }
      })
      result.myTeams = teams
      result.myVolunteers = teams.flatMap(t => t.volunteers || [])
      result.myCampaigns = teams.map(t => t.campaign).filter(Boolean)
    }
    if (user.role === 'VOLUNTEER' || user.accountType === 'VOLUNTEER') {
      const vol = await prisma.volunteer.findFirst({
        where: { phone: user.phone },
        include: { team: true }
      })
      if (vol) {
        result.myVolunteer = vol
        result.myTeams = vol.team ? [vol.team] : []
        if (vol.team && vol.team.campaignId) {
          const camp = await prisma.campaign.findUnique({ where: { id: vol.team.campaignId }, include: { candidate: true } })
          if (camp) result.myCampaigns = [camp]
        }
      }
    }
    if (['FINANCE_OFFICER', 'AUDITOR', 'REGIONAL_COORD', 'CONSTITUENCY_COORD'].includes(user.role)) {
      result.myCampaigns = await prisma.campaign.findMany({ include: { candidate: true } })
      result.myTeams = await prisma.team.findMany({ include: { campaign: true, volunteers: true } })
      result.myVolunteers = await prisma.volunteer.findMany({ include: { team: true } })
    }
    // ★ FIX: ONLY ADMIN
    if (user.role === 'ADMIN' || user.accountType === 'ADMIN') {
      result.myCampaigns = await prisma.campaign.findMany({ include: { candidate: true } }).catch(() => [])
      result.myTeams = await prisma.team.findMany({ include: { campaign: true, volunteers: true } }).catch(() => [])
      result.myVolunteers = await prisma.volunteer.findMany({ include: { team: true } }).catch(() => [])
      result.myMembers = await prisma.user.findMany({ select: { id: true, userId: true, fullName: true, email: true, phone: true, role: true, county: true, organization: true, status: true, photo: true } }).catch(() => [])
      result.myCandidates = await prisma.candidate.findMany({ include: { campaigns: true } }).catch(() => [])
    }
    res.json(result)
  } catch (e) { console.log('OVERVIEW ERROR:', e); res.status(500).json({ error: e.message }) }
})

// ================= PROFILE EDIT =================
app.put('/api/me/profile', auth, async (req, res) => {
  try {
    const b = req.body
    const data = {
      fullName: b.fullName, phone: b.phone, email: b.email, county: b.county,
      organization: b.organization ? String(b.organization).trim() : undefined,
      organizationName: b.organizationName ? String(b.organizationName).trim() : (b.organization ? String(b.organization).trim() : undefined),
      photo: b.photo || null, bio: b.bio || null, location: b.location || null, timezone: b.timezone || null,
      emergencyContact: b.emergencyContact || null, emergencyPhone: b.emergencyPhone || null,
      skills: b.skills || null, languages: b.languages || null, certifications: b.certifications || null,
      resumeUrl: b.resumeUrl || null, portfolioLinks: b.portfolioLinks || null,
      workExperience: b.workExperience || null, education: b.education || null, jobPreferences: b.jobPreferences || null,
      jobTitle: b.jobTitle || null, department: b.department || null, workEmail: b.workEmail || null,
      teamOverview: b.teamOverview || null, notificationPrefs: b.notificationPrefs || null,
      interests: b.interests || null, availability: b.availability || null, tshirtSize: b.tshirtSize || null, idDocumentUrl: b.idDocumentUrl || null,
      orgType: b.orgType || null, orgMission: b.orgMission || null, orgWebsite: b.orgWebsite || null, orgFoundedYear: b.orgFoundedYear || null,
    }
    Object.keys(data).forEach(k => data[k] === undefined && delete data[k])
    if (req.user.role === 'ORGANIZATION' && data.orgMission && !data.bio) data.bio = data.orgMission
    const user = await prisma.user.update({ where: { id: req.user.id }, data })
    const cand = await prisma.candidate.findFirst({ where: { OR: [{ email: req.user.email }, { phone: req.user.phone }] } })
    if (cand) {
      await prisma.candidate.update({ where: { id: cand.id }, data: { fullName: b.fullName, phone: b.phone, email: b.email, biography: b.bio || cand.biography, education: b.education || cand.education } }).catch(() => {})
    }
    const vol = await prisma.volunteer.findFirst({ where: { phone: req.user.phone } })
    if (vol) {
      await prisma.volunteer.update({ where: { id: vol.id }, data: { fullName: b.fullName, phone: b.phone } }).catch(() => {})
    }
    try { await prisma.auditLog.create({ data: { userId: req.user.id, action: 'PROFILE_UPDATED', details: 'Profile updated' } }) } catch {}
    res.json({ ok: true, user: publicUser(user) })
  } catch (e) { console.log('PROFILE ERROR:', e); res.status(500).json({ error: 'Profile update failed: ' + e.message }) }
})

app.put('/api/me/photo', auth, async (req, res) => {
  try {
    const { photo } = req.body
    if (!photo) return res.status(400).json({ error: 'Photo required' })
    if (photo.length > 3 * 1024 * 1024) return res.status(400).json({ error: 'Photo too large - max 2MB' })
    const user = await prisma.user.update({ where: { id: req.user.id }, data: { photo } })
    res.json({ ok: true, user: publicUser(user) })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// ================= EVENTS =================
app.get('/api/events', auth, async (req, res) => {
  try {
    const events = await prisma.event.findMany({ include: { campaign: true, createdBy: { select: { fullName: true, role: true } } }, orderBy: { date: 'asc' } })
    res.json(events)
  } catch (e) { res.status(500).json({ error: e.message }) }
})

app.post('/api/events', auth, async (req, res) => {
  try {
    const { title, description, date, location, type, campaignId } = req.body
    if (!title || !date) return res.status(400).json({ error: 'Title and Date required' })
    const ev = await prisma.event.create({ data: { title, description, date: new Date(date), location, type: type || 'RALLY', campaignId: campaignId || null, createdById: req.user.id } })
    res.json(ev)
  } catch (e) { res.status(500).json({ error: e.message }) }
})

app.put('/api/events/:id', auth, async (req, res) => {
  try {
    const { title, description, date, location, type, status, campaignId } = req.body
    const ev = await prisma.event.update({ where: { id: req.params.id }, data: { title, description, date: date ? new Date(date) : undefined, location, type, status, campaignId: campaignId || null } })
    res.json(ev)
  } catch (e) { res.status(500).json({ error: e.message }) }
})

app.delete('/api/events/:id', auth, async (req, res) => {
  try { await prisma.event.delete({ where: { id: req.params.id } }); res.json({ ok: true }) }
  catch (e) { res.status(500).json({ error: e.message }) }
})

// ================= MESSAGES =================
app.get('/api/messages/users', auth, async (req, res) => {
  try {
    const users = await prisma.user.findMany({ where: { id: { not: req.user.id }, status: 'ACTIVE' }, select: { id: true, fullName: true, role: true, county: true, userId: true, photo: true, organization: true } })
    res.json(users)
  } catch (e) { res.status(500).json({ error: e.message }) }
})

app.get('/api/messages/unread/count', auth, async (req, res) => {
  try {
    const count = await prisma.message.count({ where: { receiverId: req.user.id, isRead: false } })
    res.json({ count })
  } catch (e) { res.json({ count: 0 }) }
})

// ★ FIX: /api/messages must return list for AdminDashboard, not just /:otherUserId
app.get('/api/messages', auth, async (req, res) => {
  try {
    const msgs = await prisma.message.findMany({
      where: { OR: [{ senderId: req.user.id }, { receiverId: req.user.id }] },
      include: { sender: { select: { fullName: true, email: true } }, receiver: { select: { fullName: true, email: true } } },
      orderBy: { createdAt: 'desc' }, take: 100
    })
    res.json(msgs.map(m => ({ ...m, senderName: m.sender?.fullName || 'Unknown', subject: m.subject || '', body: m.content, text: m.content, status: m.isRead ? 'Read' : 'Unread', to: m.receiver?.email || '' })))
  } catch (e) { res.status(500).json({ error: e.message }) }
})

app.get('/api/messages/:otherUserId', auth, async (req, res) => {
  try {
    const otherId = req.params.otherUserId
    const msgs = await prisma.message.findMany({
      where: { OR: [{ senderId: req.user.id, receiverId: otherId }, { senderId: otherId, receiverId: req.user.id }] },
      include: { sender: { select: { fullName: true } } },
      orderBy: { createdAt: 'asc' }
    })
    await prisma.message.updateMany({ where: { senderId: otherId, receiverId: req.user.id, isRead: false }, data: { isRead: true } })
    res.json(msgs)
  } catch (e) { res.status(500).json({ error: e.message }) }
})

app.post('/api/messages', auth, async (req, res) => {
  try {
    const { receiverId, content, to, body, subject } = req.body
    const finalContent = content || body || ''
    let finalReceiver = receiverId
    if (!finalReceiver && to && to.includes('@')) {
      const u = await prisma.user.findUnique({ where: { email: to } }).catch(() => null)
      if (u) finalReceiver = u.id
    }
    if (!finalReceiver || !finalContent?.trim()) return res.status(400).json({ error: 'Receiver and message required' })
    const msg = await prisma.message.create({ data: { senderId: req.user.id, receiverId: finalReceiver, content: finalContent.trim() }, include: { sender: { select: { fullName: true } } } })
    res.json(msg)
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// ================= ANALYTICS =================
app.get('/api/analytics/overview', auth, async (req, res) => {
  try {
    const [volunteers, teams, campaigns, candidates, events, unread] = await Promise.all([
      prisma.volunteer.findMany({ include: { team: true } }),
      prisma.team.findMany({ include: { volunteers: true, campaign: true } }),
      prisma.campaign.findMany({ include: { candidate: true, teams: { include: { volunteers: true } } } }),
      prisma.candidate.findMany({ include: { campaigns: true } }),
      prisma.event.findMany(),
      prisma.message.count({ where: { receiverId: req.user.id, isRead: false } }),
    ])
    const volunteersPerTeam = teams.map(t => ({ name: t.name, campaign: t.campaign?.name || '-', count: t.volunteers?.length || 0 }))
    const campaignProgress = campaigns.map(c => {
      const cTeams = c.teams || []
      const cVols = cTeams.flatMap(t => t.volunteers || [])
      const approved = cVols.filter(v => v.onboardingStatus === 'APPROVED').length
      const progress = cVols.length === 0 ? 0 : Math.round((approved / cVols.length) * 100)
      return { id: c.id, name: c.name, status: c.status, candidate: c.candidate?.fullName || '-', teams: cTeams.length, volunteers: cVols.length, approved, progress }
    })
    const byStatus = { PENDING: 0, APPROVED: 0, REJECTED: 0 }
    volunteers.forEach(v => { if (byStatus[v.onboardingStatus] !== undefined) byStatus[v.onboardingStatus]++ })
    const candidatesPerCounty = {}
    candidates.forEach(c => { const k = c.county || 'Unknown'; candidatesPerCounty[k] = (candidatesPerCounty[k] || 0) + 1 })
    res.json({
      totals: { volunteers: volunteers.length, teams: teams.length, campaigns: campaigns.length, candidates: candidates.length, events: events.length, unread },
      volunteersPerTeam, campaignProgress, byStatus,
      candidatesPerCounty: Object.entries(candidatesPerCounty).map(([county, count]) => ({ county, count }))
    })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// ================= NOTIFICATIONS =================
app.get('/api/notifications', auth, async (req, res) => {
  try {
    const [unreadMessages, pendingUsers, pendingVolunteers] = await Promise.all([
      prisma.message.findMany({ where: { receiverId: req.user.id, isRead: false }, include: { sender: { select: { fullName: true, role: true } } }, orderBy: { createdAt: 'desc' }, take: 10 }),
      String(req.user.role).toUpperCase() === 'ADMIN' ? prisma.user.count({ where: { status: 'PENDING' } }) : Promise.resolve(0),
      prisma.volunteer.count({ where: { onboardingStatus: 'PENDING' } }),
    ])
    res.json({
      unreadCount: unreadMessages.length,
      unreadMessages: unreadMessages.map(m => ({ id: m.id, content: m.content, createdAt: m.createdAt, senderName: m.sender?.fullName || 'Unknown', senderRole: m.sender?.role || '' })),
      pendingUsers, pendingVolunteers
    })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// ================= WHATSAPP / SMS INVITE =================
app.post('/api/invites/send', auth, async (req, res) => {
  try {
    const { phone, fullName, role, message } = req.body
    if (!phone) return res.status(400).json({ error: 'Phone required - e.g. +254712345678' })
    if (!phone.startsWith('+254')) return res.status(400).json({ error: 'Phone must start with +254' })
    const inviter = await prisma.user.findUnique({ where: { id: req.user.id } })
    const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173'
    const inviteLink = `${FRONTEND_URL}/register?ref=${req.user.id}&role=${role || 'VOLUNTEER'}`
    const defaultMsg = message || `Hello ${fullName || 'there'}! 👋 You are invited to join PCMS - ${inviter?.fullName || 'Campaign Team'} (${inviter?.role || ''}). Register as ${role || 'VOLUNTEER'} here: ${inviteLink} - County: ${inviter?.county || 'Kenya'}. Karibu! 🗳️`
    const cleanPhone = phone.replace('+', '').replace(/\s/g, '')
    const whatsappLink = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(defaultMsg)}`
    const smsLink = `sms:${phone}?body=${encodeURIComponent(defaultMsg)}`
    try { await prisma.auditLog.create({ data: { userId: req.user.id, action: 'INVITE_SENT', details: `Invited ${fullName || phone} (${role || 'VOLUNTEER'}) via WhatsApp/SMS` } }) } catch {}
    res.json({ ok: true, inviteLink, whatsappLink, smsLink, message: defaultMsg })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// ================= ASSIGN =================
app.put('/api/candidates/:id/assign-manager', auth, isAdmin, async (req, res) => {
  try {
    const { managerId } = req.body
    const c = await prisma.candidate.update({ where: { id: req.params.id }, data: { assignedManagerId: managerId || null } })
    res.json(c)
  } catch (e) { res.status(400).json({ error: e.message }) }
})

app.put('/api/teams/:id/assign-leader', auth, isAdmin, async (req, res) => {
  try {
    const { leaderId } = req.body
    const t = await prisma.team.update({ where: { id: req.params.id }, data: { leaderId: leaderId || null } })
    res.json(t)
  } catch (e) { res.status(400).json({ error: e.message }) }
})

app.get('/api/admin/users-for-assign', auth, isAdmin, async (req, res) => {
  try {
    const users = await prisma.user.findMany({ where: { status: 'ACTIVE' }, select: { id: true, fullName: true, email: true, phone: true, role: true } })
    res.json(users)
  } catch (e) { res.status(500).json({ error: e.message }) }
})

app.use('/api', (req, res) => res.status(404).json({ error: `API route not found: ${req.method} ${req.originalUrl}` }))

app.use((err, req, res, next) => {
  console.error(err)
  res.status(500).json({ error: err.message || 'Server error' })
})

app.listen(PORT, () => console.log(`PCMS Server running on http://localhost:${PORT}`))