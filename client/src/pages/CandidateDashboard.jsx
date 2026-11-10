import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import ProfileEdit from './ProfileEdit'
import EventsPage from './EventsPage'
import MessagesPage from './MessagesPage'
import NotificationBell from '../components/NotificationBell'
import AnalyticsCharts from '../components/AnalyticsCharts'
import OnlineMentions from './OnlineMentions'
import { API } from '../api'

const ALL_PLATFORMS = ['News', 'YouTube', 'Reddit', 'X', 'Facebook', 'TikTok', 'Telegram', 'Instagram']
const PLATFORM_ICONS = { News: '📰', YouTube: '▶️', Reddit: '🟠', X: '𝕏', Facebook: '📘', TikTok: '🎵', Telegram: '✈️', Instagram: '📸' }
const PLATFORM_LABELS = { News: 'Google News', YouTube: 'YouTube', Reddit: 'Reddit', X: 'X (Twitter)', Facebook: 'Facebook', TikTok: 'TikTok', Telegram: 'Telegram', Instagram: 'Instagram' }
const PLATFORM_COLORS = { News: '#2563eb', YouTube: '#ef4444', Reddit: '#f59e0b', X: '#22c55e', Facebook: '#3b82f6', TikTok: '#6366f1', Telegram: '#38bdf8', Instagram: '#f472b6' }
const SOCIAL_HANDLE_KEYS = ['youtube', 'reddit', 'x', 'twitter', 'facebook', 'tiktok', 'telegram', 'instagram']
const cleanVal = (v) => String(v || '').replace(/^[@/]+/, '').replace(/^https?:\/\/[^/]+\//, '').trim()
const cleanHandlesObj = (obj = {}) => { const out = {}; Object.entries(obj || {}).forEach(([k, v]) => { const cv = cleanVal(v); if (cv) out[String(k).toLowerCase()] = cv }); return out }
const TOUR_IMG = 'https://images.unsplash.com/photo-1541872703-74c5e44368f9?q=80&w=1600&auto=format&fit=crop'

export default function CandidateDashboard({ token, user, myData, onLogout, setMessage, onGoCandidateSetup, onRefreshOverview }) {
  const [activeMenu, setActiveMenu] = useState('dashboard')
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [search, setSearch] = useState('')
  const [tabAnim, setTabAnim] = useState('tabIn')
  const [isMobile, setIsMobile] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [syncNote, setSyncNote] = useState('')
  const [fetching, setFetching] = useState('')
  const [range, setRange] = useState('Last 7 Days')

  const [selectedCampaignId, setSelectedCampaignId] = useState(() => { try { return localStorage.getItem('pcms_active_field') || 'all' } catch { return 'all' } })
  const setActiveField = (id) => { const v = String(id || 'all'); setSelectedCampaignId(v); try { localStorage.setItem('pcms_active_field', v) } catch {}; window.dispatchEvent(new CustomEvent('pcms_field_changed', { detail: { campaignId: v } })) }
  const [fieldTab, setFieldTab] = useState('people')
  const [showField, setShowField] = useState(true)

  const [profilePhoto, setProfilePhoto] = useState(() => { try { return localStorage.getItem('pcms_photo') || user?.photo || '' } catch { return user?.photo || '' } })
  useEffect(() => {
    const onStorage = (e) => { if (e.key === 'pcms_photo') setProfilePhoto(e.newValue || ''); if (e.key === 'pcms_active_field') setSelectedCampaignId(e.newValue || 'all') }
    const onCustom = (e) => { if (e.detail?.photo !== undefined) setProfilePhoto(e.detail.photo) }
    const onField = (e) => { if (e.detail?.campaignId) setSelectedCampaignId(String(e.detail.campaignId)) }
    window.addEventListener('storage', onStorage); window.addEventListener('pcms_photo_updated', onCustom); window.addEventListener('pcms_field_changed', onField)
    return () => { window.removeEventListener('storage', onStorage); window.removeEventListener('pcms_photo_updated', onCustom); window.removeEventListener('pcms_field_changed', onField) }
  }, [])
  useEffect(() => { if (user?.photo && !profilePhoto) setProfilePhoto(user.photo) }, [user?.photo]) // eslint-disable-line
  const effectiveUser = { ...user, photo: profilePhoto || user?.photo }

  const [liveHandles, setLiveHandles] = useState({})
  const [liveKeywords, setLiveKeywords] = useState([])
  const [mentionsCount, setMentionsCount] = useState(0)
  const [mentionsPositive, setMentionsPositive] = useState(0)
  const [mentionsNegative, setMentionsNegative] = useState(0)
  const [mentionsNeutral, setMentionsNeutral] = useState(0)
  const [perPlatform, setPerPlatform] = useState({ All: 0, News: 0, YouTube: 0, Reddit: 0, X: 0, Facebook: 0, TikTok: 0, Telegram: 0, Instagram: 0 })
  const [mentionsList, setMentionsList] = useState([])
  const [lastFetch, setLastFetch] = useState(null)

  const [campaigns, setCampaigns] = useState(myData?.myCampaigns || [])
  const [teams, setTeams] = useState(myData?.myTeams || [])
  const [volunteers, setVolunteers] = useState(myData?.myVolunteers || [])
  const [events, setEvents] = useState(myData?.myEvents || [])
  const [campFilter, setCampFilter] = useState('All')
  const [teamFilter, setTeamFilter] = useState('All')
  const [volFilter, setVolFilter] = useState('All')
  const [volView, setVolView] = useState('cards')
  const [eventTab, setEventTab] = useState('Upcoming')
  const [eventType, setEventType] = useState('All Types')
  const [selectedTeamId, setSelectedTeamId] = useState(null)
  const [showCampModal, setShowCampModal] = useState(false)
  const [showTeamModal, setShowTeamModal] = useState(false)
  const [showVolModal, setShowVolModal] = useState(false)
  const [showEventModal, setShowEventModal] = useState(false)
  const [campForm, setCampForm] = useState({ name: '', objectives: '', startDate: '', endDate: '', status: 'ACTIVE', budget: '', field: '', wards: '' })
  const [teamForm, setTeamForm] = useState({ name: '', leader: '', campaignId: '', location: '', ward: '' })
  const [volForm, setVolForm] = useState({ fullName: '', phone: '', teamId: '', location: '', ward: '' })
  const [eventForm, setEventForm] = useState({ title: '', type: 'Rally', date: '', location: '', description: '', campaignId: '' })
  const [saving, setSaving] = useState(false)

  const fallbackRef = useRef({ handles: {}, keywords: [] })
  fallbackRef.current = { handles: cleanHandlesObj(myData?.myCandidate?.socialHandles || user?.socialHandles || {}), keywords: myData?.myCandidate?.keywords || user?.keywords || [] }
  const refreshingRef = useRef(false)
  const hasSyncedRef = useRef(false)

  const fetchLiveSocials = useCallback(async () => {
    let dbHandles = {}, dbKeywords = []
    try { const r = await fetch(`${API}/api/social/handles`, { headers: { Authorization: `Bearer ${token}` } }); const d = await r.json().catch(() => ({})); dbHandles = cleanHandlesObj(d.handles || {}); if (Array.isArray(d.keywords)) dbKeywords = d.keywords } catch {}
    let localHandles = {}, localKeywords = []
    try { localHandles = cleanHandlesObj(JSON.parse(localStorage.getItem('pcms_social_handles') || '{}')); localKeywords = JSON.parse(localStorage.getItem('pcms_keywords') || '[]') } catch {}
    const mergedHandles = { ...fallbackRef.current.handles, ...localHandles, ...dbHandles }
    const mergedKeywords = dbKeywords.length ? dbKeywords : (localKeywords.length ? localKeywords : fallbackRef.current.keywords)
    setLiveHandles(mergedHandles); setLiveKeywords(mergedKeywords)
    try { if (Object.keys(mergedHandles).length) localStorage.setItem('pcms_social_handles', JSON.stringify(mergedHandles)); if (mergedKeywords.length) localStorage.setItem('pcms_keywords', JSON.stringify(mergedKeywords)) } catch {}
    const dbCount = Object.keys(dbHandles).length, localCount = Object.keys(localHandles).length
    if (dbCount === 0 && localCount > 0 && !hasSyncedRef.current) {
      hasSyncedRef.current = true; setSyncing(true); setSyncNote(`Found ${localCount} socials - re-saving...`)
      try { const res = await fetch(`${API}/api/social/candidates/social-handles`, { method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ handles: localHandles, verifiedStatuses: Object.fromEntries(Object.keys(localHandles).map(k => [k, 'exists'])), merge: true }) }); const d = await res.json().catch(() => ({})); if (d.ok) { setSyncNote(`✅ Recovered ${localCount} socials`); setTimeout(() => setSyncNote(''), 5000) } else { setSyncNote('❌ Re-save failed'); hasSyncedRef.current = false } } catch { setSyncNote('❌ Re-save failed'); hasSyncedRef.current = false }
      setSyncing(false)
    }
    return { handles: mergedHandles, keywords: mergedKeywords }
  }, [token, setMessage])

  const fetchMentionsCount = useCallback(async () => {
    try {
      const r = await fetch(`${API}/api/social/mentions?counts=1`, { headers: { Authorization: `Bearer ${token}` } })
      const d = await r.json().catch(() => []); const list = Array.isArray(d) ? d : (d.mentions || []); const counts = d.perPlatform || d.counts || null
      setMentionsList(list); setMentionsCount(list.length)
      setMentionsPositive(list.filter(m => m.sentiment === 'Positive').length); setMentionsNegative(list.filter(m => m.sentiment === 'Negative').length); setMentionsNeutral(list.filter(m => m.sentiment !== 'Positive' && m.sentiment !== 'Negative').length)
      if (counts) setPerPlatform({ All: list.length, News: 0, YouTube: 0, Reddit: 0, X: 0, Facebook: 0, TikTok: 0, Telegram: 0, Instagram: 0, ...counts })
      else { const pp = { All: list.length, News: 0, YouTube: 0, Reddit: 0, X: 0, Facebook: 0, TikTok: 0, Telegram: 0, Instagram: 0 }; list.forEach(m => { if (pp[m.platform] !== undefined) pp[m.platform]++ }); setPerPlatform(pp) }
    } catch {}
  }, [token])

  // ★ REAL FIGURES: Only overwrite if backend actually returns data. Never wipe myData with []
  const fetchOverviewData = useCallback(async () => {
    try {
      const [rc, rt, rv, re] = await Promise.all([
        fetch(`${API}/api/campaigns`, { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json().catch(() => null)),
        fetch(`${API}/api/teams`, { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json().catch(() => null)),
        fetch(`${API}/api/volunteers`, { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json().catch(() => null)),
        fetch(`${API}/api/events`, { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json().catch(() => null)),
      ])
      const arr = (x) => Array.isArray(x) ? x : (Array.isArray(x?.data) ? x.data : (Array.isArray(x?.items) ? x.items : null))
      const c = arr(rc), t = arr(rt), v = arr(rv), e = arr(re)
      if (c && c.length) setCampaigns(c)
      if (t && t.length) setTeams(t)
      if (v && v.length) setVolunteers(v)
      if (e && e.length) setEvents(e)
      // Sync myData into state if state is empty but myData has data
      if (!c?.length && myData?.myCampaigns?.length) setCampaigns(myData.myCampaigns)
      if (!t?.length && myData?.myTeams?.length) setTeams(myData.myTeams)
      if (!v?.length && myData?.myVolunteers?.length) setVolunteers(myData.myVolunteers)
      if (!e?.length && myData?.myEvents?.length) setEvents(myData.myEvents)
    } catch {}
  }, [token, myData])

  const refreshAll = useCallback(async () => {
    if (refreshingRef.current) return; refreshingRef.current = true; setRefreshing(true)
    try { await Promise.all([fetchLiveSocials(), fetchMentionsCount(), fetchOverviewData()]); if (typeof onRefreshOverview === 'function') await onRefreshOverview() } finally { refreshingRef.current = false; setRefreshing(false) }
  }, [fetchLiveSocials, fetchMentionsCount, fetchOverviewData, onRefreshOverview])

  const doFetch = async (kind) => {
    setFetching(kind)
    try {
      const endpoint = kind === 'news' ? 'fetch-news' : kind === 'socials' ? 'fetch-socials' : 'fetch-all'
      const r = await fetch(`${API}/api/social/${endpoint}`, { method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ keywords: liveKeywords }) })
      const d = await r.json().catch(() => ({})); setMessage?.(d.message || `✅ Fetch ${kind} done`); setLastFetch(new Date().toLocaleTimeString()); await fetchMentionsCount()
    } catch { setMessage?.('Fetch failed') }
    setFetching('')
  }

  useEffect(() => { fetchLiveSocials(); fetchMentionsCount(); fetchOverviewData() }, [fetchLiveSocials, fetchMentionsCount, fetchOverviewData])
  // ★ REAL FIGURES: Sync myData when it arrives late (after login)
  useEffect(() => {
    if (myData?.myCampaigns?.length && !campaigns.length) setCampaigns(myData.myCampaigns)
    if (myData?.myTeams?.length && !teams.length) setTeams(myData.myTeams)
    if (myData?.myVolunteers?.length && !volunteers.length) setVolunteers(myData.myVolunteers)
    if (myData?.myEvents?.length && !events.length) setEvents(myData.myEvents)
  }, [myData]) // eslint-disable-line
  useEffect(() => { const check = () => { const m = window.innerWidth < 860; setIsMobile(m); if (m) setSidebarOpen(false) }; check(); window.addEventListener('resize', check); return () => window.removeEventListener('resize', check) }, [])
  const [showHelp, setShowHelp] = useState(false)
  useEffect(() => { const onKey = (e) => { if (e.key === 'Escape') { setShowHelp(false); setMobileOpen(false) } }; window.addEventListener('keydown', onKey); return () => window.removeEventListener('keydown', onKey) }, [])

  const cand = myData?.myCandidate
  const firstName = (user?.fullName || 'Edwin').split(' ')[0]
  const initials = (user?.fullName || 'E').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
  const connectedCount = Object.keys(liveHandles).filter(k => SOCIAL_HANDLE_KEYS.includes(String(k).toLowerCase()) && liveHandles[k]).length
  const hasKeywords = liveKeywords.length > 0
  const posPct = mentionsCount ? Math.round((mentionsPositive / mentionsCount) * 100) : 0
  const negPct = mentionsCount ? Math.round((mentionsNegative / mentionsCount) * 100) : 0
  const neuPct = mentionsCount ? Math.max(0, 100 - posPct - negPct) : 0
  const fmtK = (n) => n >= 1000 ? `${(n / 1000).toFixed(1).replace('.0', '')}K` : `${n}`
  const donutStyle = { width: 150, height: 150, borderRadius: '50%', background: mentionsCount ? `conic-gradient(#ef4444 0% ${negPct}%, #9ca3af ${negPct}% ${negPct + neuPct}%, #16a34a ${negPct + neuPct}% 100%)` : '#e5e7eb', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }
  const last7 = []
  for (let i = 6; i >= 0; i--) { const d = new Date(); d.setDate(d.getDate() - i); const key = d.toISOString().slice(0, 10); const label = d.toLocaleDateString('en-KE', { day: 'numeric', month: 'short' }); const count = mentionsList.filter(m => String(m.createdAt || '').slice(0, 10) === key).length; last7.push({ key, label, count }) }
  const maxDay = Math.max(...last7.map(x => x.count), 1)
  const chartW = 380, chartH = 130
  const points = last7.map((x, i) => `${(i / 6) * (chartW - 20) + 10},${chartH - 18 - (x.count / maxDay) * (chartH - 36)}`).join(' ')
  const areaPoints = `10,${chartH - 18} ${points} ${(chartW - 10)},${chartH - 18}`
  const maxPlatform = perPlatform.All > 0 ? Math.max(...ALL_PLATFORMS.map(p => perPlatform[p] || 0), 1) : 1
  const peak = last7.reduce((a, b) => b.count > a.count ? b : a, last7[0] || { count: 0 })

  // ★ REAL FIGURES - Effective lists = state OR myData, NO fake fallback numbers
  const effectiveCampaigns = campaigns.length ? campaigns : (myData?.myCampaigns || [])
  const effectiveTeams = teams.length ? teams : (myData?.myTeams || [])
  const effectiveVolunteers = volunteers.length ? volunteers : (myData?.myVolunteers || [])
  const effectiveEvents = events.length ? events : (myData?.myEvents || [])

  const selectedCampaign = useMemo(() => effectiveCampaigns.find(c => String(c.id || c._id) === String(selectedCampaignId)) || null, [effectiveCampaigns, selectedCampaignId])
  const getCampId = (obj) => String(obj?.campaign?.id || obj?.campaignId || obj?.campaign?.name || obj?.campaignName || '')
  // ★ FIX: Teams with NO campaign link belong to Active Field - otherwise Field shows 0
  const teamsInCampaign = useMemo(() => {
    if (selectedCampaignId === 'all') return effectiveTeams
    const filtered = effectiveTeams.filter(t => { const cid = getCampId(t); if (!cid) return true; return cid === String(selectedCampaignId) || cid === String(selectedCampaign?.name || '') || cid === String(selectedCampaign?.id || '') })
    return filtered
  }, [effectiveTeams, selectedCampaignId, selectedCampaign])
  const volunteersInCampaign = useMemo(() => {
    if (selectedCampaignId === 'all') return effectiveVolunteers
    const teamIds = new Set(teamsInCampaign.map(t => String(t.id || t._id)))
    const byTeam = effectiveVolunteers.filter(v => teamIds.has(String(v.team?.id || v.team?.id || v.teamId || '')))
    if (byTeam.length) return byTeam
    return effectiveVolunteers.filter(v => { const cid = getCampId(v) || String(v.team?.campaign?.id || v.team?.campaignId || ''); if (!cid) return true; return cid === String(selectedCampaignId) || cid === String(selectedCampaign?.name || '') })
  }, [effectiveVolunteers, selectedCampaignId, teamsInCampaign, selectedCampaign])
  const eventsInCampaign = useMemo(() => {
    if (selectedCampaignId === 'all') return effectiveEvents
    return effectiveEvents.filter(e => { const cid = getCampId(e); if (!cid) return true; return cid === String(selectedCampaignId) || cid === String(selectedCampaign?.name || '') })
  }, [effectiveEvents, selectedCampaignId, selectedCampaign])
  const coverage = useMemo(() => {
    const map = {}
    const add = (loc, w = 1) => { const k = String(loc || 'Nairobi').trim() || 'Nairobi'; map[k] = (map[k] || 0) + w }
    teamsInCampaign.forEach(t => add(t.ward || t.location || 'Nairobi', 8))
    volunteersInCampaign.forEach(v => add(v.ward || v.location || v.team?.location || v.team?.ward || 'Nairobi', 1))
    const entries = Object.entries(map).sort((a, b) => b[1] - a[1]).slice(0, 8)
    const max = Math.max(...entries.map(([, v]) => v), 1)
    if (!entries.length) return []
    return entries.map(([ward, val]) => ({ ward, pct: Math.min(100, Math.max(5, Math.round((val / max) * 100))), people: val, teams: teamsInCampaign.filter(t => (t.ward || t.location) === ward).length, vols: volunteersInCampaign.filter(v => (v.ward || v.location) === ward).length }))
  }, [teamsInCampaign, volunteersInCampaign])
  const fieldStrength = useMemo(() => {
    if (!teamsInCampaign.length && !volunteersInCampaign.length) return 0
    return Math.min(98, Math.round(20 + teamsInCampaign.length * 4 + Math.min(50, volunteersInCampaign.length * 0.2) + (mentionsPositive > mentionsNegative ? 8 : 0)))
  }, [teamsInCampaign, volunteersInCampaign, mentionsPositive, mentionsNegative])
  const topTeam = useMemo(() => {
    if (!teamsInCampaign.length) return null
    return [...teamsInCampaign].map(t => ({ ...t, members: effectiveVolunteers.filter(v => String(v.team?.id || v.teamId || '') === String(t.id || t._id)).length })).sort((a, b) => b.members - a.members)[0]
  }, [teamsInCampaign, effectiveVolunteers])
  const approvedVols = volunteersInCampaign.filter(v => v.onboardingStatus === 'APPROVED').length

  const openCandidateSetup = () => { setMobileOpen(false); if (typeof onGoCandidateSetup === 'function') onGoCandidateSetup(); else setActiveMenu('mentions') }
  const goMenu = (id) => { if (id === activeMenu) { setMobileOpen(false); return } setTabAnim('tabOut'); setTimeout(() => { setActiveMenu(id); setSearch(''); setTabAnim('tabIn') }, 120); setMobileOpen(false); if (id === 'mentions' || id === 'analytics') { fetchLiveSocials(); fetchMentionsCount() } if (['campaigns', 'teams', 'volunteers', 'events'].includes(id)) fetchOverviewData() }

  const menu = [
    { id: 'dashboard', label: 'Dashboard', icon: '🏠', badge: null },
    { id: 'campaigns', label: 'Campaigns', icon: '📣', badge: effectiveCampaigns.length || null },
    { id: 'teams', label: 'Teams', icon: '👥', badge: effectiveTeams.length || null },
    { id: 'volunteers', label: 'Volunteers', icon: '💛', badge: effectiveVolunteers.length || null },
    { id: 'events', label: 'Events', icon: '📅', badge: effectiveEvents.length || null },
    { id: 'analytics', label: 'Analytics', icon: '📊', badge: null },
    { id: 'mentions', label: 'Mentions', icon: '💬', badge: mentionsCount > 99 ? '99+' : (mentionsCount || null), badgeTitle: `${mentionsCount} mentions` },
    { id: 'profile', label: 'Settings', icon: '⚙️', badge: null },
  ]

  const q = search.trim().toLowerCase()
  const filteredCampaigns = effectiveCampaigns.filter(c => { if (q && !(c.name || '').toLowerCase().includes(q)) return false; if (campFilter !== 'All' && (c.status || 'ACTIVE') !== campFilter) return false; return true })
  const filteredTeams = effectiveTeams.filter(t => { if (q && !(t.name || '').toLowerCase().includes(q)) return false; if (teamFilter !== 'All' && String(t.campaign?.name || '') !== teamFilter) return false; if (selectedCampaignId !== 'all' && !teamsInCampaign.some(x => String(x.id || x._id) === String(t.id || t._id))) return false; return true })
  const filteredVolunteers = effectiveVolunteers.filter(v => { if (q && !`${v.fullName || ''} ${v.phone || ''}`.toLowerCase().includes(q)) return false; if (volFilter !== 'All' && (v.onboardingStatus || 'PENDING') !== volFilter) return false; if (selectedTeamId && String(v.team?.id || v.teamId || '') !== String(selectedTeamId)) return false; if (selectedCampaignId !== 'all' && !volunteersInCampaign.some(x => String(x.id || x._id) === String(v.id || v._id))) return false; return true })
  const todayStr = new Date().toISOString().slice(0, 10)
  const filteredEvents = effectiveEvents.filter(e => { const d = String(e.date || e.startDate || '').slice(0, 10); if (eventTab === 'Upcoming' && d && d < todayStr) return false; if (eventTab === 'Past' && d && d >= todayStr) return false; if (eventType !== 'All Types' && (e.type || 'Rally') !== eventType) return false; if (q && !`${e.title || e.name || ''} ${e.location || ''}`.toLowerCase().includes(q)) return false; if (selectedCampaignId !== 'all' && !eventsInCampaign.some(x => String(x.id || x._id) === String(e.id || e._id))) return false; return true })
  const displayEvents = filteredEvents

  const createCampaign = async (e) => { e?.preventDefault(); if (!campForm.name.trim()) return setMessage?.('Campaign name required'); setSaving(true); const payload = { ...campForm, candidateId: cand?.id }; try { const r = await fetch(`${API}/api/campaigns`, { method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify(payload) }); const d = await r.json().catch(() => ({})); const nc = d.campaign || d || { ...payload, id: `local-${Date.now()}` }; setCampaigns(prev => [nc, ...prev]); setActiveField(String(nc.id || nc._id)) } catch { const nc = { ...payload, id: `local-${Date.now()}` }; setCampaigns(prev => [nc, ...prev]); setActiveField(String(nc.id)) } setShowCampModal(false); setCampForm({ name: '', objectives: '', startDate: '', endDate: '', status: 'ACTIVE', budget: '', field: '', wards: '' }); setMessage?.('✅ Campaign created + set as ACTIVE FIELD'); setSaving(false) }
  const createTeam = async (e) => { e?.preventDefault(); if (!teamForm.name.trim()) return setMessage?.('Team name required'); setSaving(true); const campaignIdForTeam = teamForm.campaignId || (selectedCampaignId !== 'all' ? selectedCampaignId : ''); const campaignObj = effectiveCampaigns.find(c => String(c.id || c._id) === String(campaignIdForTeam)); const payload = { ...teamForm, campaignId: campaignIdForTeam, campaign: campaignObj, campaignName: campaignObj?.name || '' }; try { const r = await fetch(`${API}/api/teams`, { method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify(payload) }); const d = await r.json().catch(() => ({})); setTeams(prev => [d.team || d || { ...payload, id: `local-${Date.now()}`, volunteers: [] }, ...prev]) } catch { setTeams(prev => [{ ...payload, id: `local-${Date.now()}`, volunteers: [] }, ...prev]) } setShowTeamModal(false); setTeamForm({ name: '', leader: '', campaignId: '', location: '', ward: '' }); setMessage?.(`✅ Team created${campaignObj?.name ? ` in ${campaignObj.name}` : ''}${teamForm.ward ? ` - ${teamForm.ward} coverage increased` : ''}`); setSaving(false) }
  const createVolunteer = async (e) => { e?.preventDefault(); if (!volForm.fullName.trim()) return setMessage?.('Volunteer name required'); setSaving(true); const team = effectiveTeams.find(t => String(t.id || t._id) === String(volForm.teamId)); const campaignIdForVol = team?.campaign?.id || team?.campaignId || (selectedCampaignId !== 'all' ? selectedCampaignId : ''); const campaignObj = effectiveCampaigns.find(c => String(c.id || c._id) === String(campaignIdForVol)); const payload = { ...volForm, team, campaign: campaignObj, campaignId: campaignIdForVol, campaignName: campaignObj?.name || '', onboardingStatus: 'PENDING' }; try { const r = await fetch(`${API}/api/volunteers`, { method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify(payload) }); const d = await r.json().catch(() => ({})); setVolunteers(prev => [d.volunteer || d || { ...payload, id: `local-${Date.now()}` }, ...prev]) } catch { setVolunteers(prev => [{ ...payload, id: `local-${Date.now()}` }, ...prev]) } setShowVolModal(false); setVolForm({ fullName: '', phone: '', teamId: '', location: '', ward: '' }); setMessage?.(`✅ Volunteer added${campaignObj?.name ? ` to ${campaignObj.name}` : ''}`); setSaving(false) }
  const updateVolunteerStatus = async (v, status) => { setVolunteers(prev => prev.map(x => (x.id || x._id) === (v.id || v._id) ? { ...x, onboardingStatus: status } : x)); try { await fetch(`${API}/api/volunteers/${v.id || v._id}`, { method: 'PATCH', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ onboardingStatus: status }) }) } catch {}; setMessage?.(status === 'APPROVED' ? `✅ ${v.fullName} approved` : `⚠️ ${v.fullName} ${status.toLowerCase()}`) }
  const createEvent = async (e) => { e?.preventDefault(); if (!eventForm.title.trim()) return setMessage?.('Event title required'); setSaving(true); const campaignIdForEvent = eventForm.campaignId || (selectedCampaignId !== 'all' ? selectedCampaignId : ''); const campaignObj = effectiveCampaigns.find(c => String(c.id || c._id) === String(campaignIdForEvent)); const payload = { ...eventForm, campaignId: campaignIdForEvent, campaign: campaignObj, campaignName: campaignObj?.name || '', attendees: 0 }; try { const r = await fetch(`${API}/api/events`, { method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify(payload) }); const d = await r.json().catch(() => ({})); setEvents(prev => [d.event || d || { ...payload, id: `local-${Date.now()}` }, ...prev]) } catch { setEvents(prev => [{ ...payload, id: `local-${Date.now()}` }, ...prev]) } setShowEventModal(false); setEventForm({ title: '', type: 'Rally', date: '', location: '', description: '', campaignId: '' }); setMessage?.('✅ Event created in selected campaign'); setSaving(false) }

  // ★ REAL FIGURES ONLY - no || 12 / || 256 / || 1.2K
  const stats = [
    { label: 'Campaigns', value: selectedCampaignId === 'all' ? effectiveCampaigns.length : 1, icon: '📣', bg: '#2563eb', sub: selectedCampaign ? `Active: ${selectedCampaign.name}` : `${effectiveCampaigns.length} total`, menu: 'campaigns' },
    { label: 'Teams', value: teamsInCampaign.length, icon: '👥', bg: '#9333ea', sub: selectedCampaign ? `In ${selectedCampaign.name}` : `${effectiveTeams.length} total`, menu: 'teams' },
    { label: 'Volunteers', value: volunteersInCampaign.length, icon: '🤍', bg: '#16a34a', sub: `${approvedVols} approved • ${volunteersInCampaign.length - approvedVols} pending`, menu: 'volunteers' },
    { label: 'Events', value: eventsInCampaign.length, icon: '📅', bg: '#f97316', sub: selectedCampaign ? `In ${selectedCampaign.name}` : `${effectiveEvents.length} total`, menu: 'events' },
    { label: 'Online Mentions', value: mentionsCount, icon: '💬', bg: '#06b6d4', sub: mentionsCount ? `${posPct}% positive` : 'No mentions yet - Fetch All', menu: 'mentions' },
  ]
  const card = { background: 'white', padding: 18, borderRadius: 14, boxShadow: '0 1px 3px rgba(0,0,0,0.06)', border: '1px solid #e5e7eb' }
  const inputStyle = { width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #e5e7eb', fontSize: 13, outline: 'none', boxSizing: 'border-box', background: 'white' }
  const btnPrimary = { background: '#2563eb', color: 'white', border: 'none', padding: '10px 16px', borderRadius: 8, cursor: 'pointer', fontWeight: 700, fontSize: 13 }
  const btnDark = { background: '#0f172a', color: 'white', border: 'none', padding: '10px 16px', borderRadius: 8, cursor: 'pointer', fontWeight: 700, fontSize: 13 }
  const btnGhost = { background: 'white', border: '1px solid #e5e7eb', padding: '10px 14px', borderRadius: 8, cursor: 'pointer', fontWeight: 600, fontSize: 13 }
  const modalOverlay = { position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200, padding: 16 }
  const modalBox = { background: 'white', borderRadius: 14, padding: 20, width: '100%', maxWidth: 480, maxHeight: '90vh', overflowY: 'auto' }
  const Avatar = ({ size = 36, fontSize = 12 }) => profilePhoto ? <img src={profilePhoto} alt={user?.fullName} style={{ width: size, height: size, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} /> : <div style={{ width: size, height: size, borderRadius: '50%', background: '#2563eb', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize, flexShrink: 0 }}>{initials}</div>
  const Spark = ({ color }) => (<svg viewBox="0 0 120 28" style={{ width: '100%', height: 22, marginTop: 8 }}><polygon points="0,28 0,18 20,14 40,20 60,10 80,16 100,8 120,12 120,28" fill={color} opacity="0.12" /><polyline points="0,18 20,14 40,20 60,10 80,16 100,8 120,12" fill="none" stroke={color} strokeWidth="2" /></svg>)

  const CampaignDropdown = ({ style = {} }) => (
    <select value={selectedCampaignId} onChange={e => { setActiveField(e.target.value); setSelectedTeamId(null) }} style={{ padding: '9px 12px', borderRadius: 10, border: '1px solid #e5e7eb', fontSize: 13, fontWeight: 700, outline: 'none', background: 'white', color: '#0f172a', cursor: 'pointer', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', ...style }}>
      <option value="all">🎯 All Campaigns</option>
      {effectiveCampaigns.map(c => <option key={c.id || c._id} value={String(c.id || c._id)}>🎯 {c.name}{String(selectedCampaignId) === String(c.id || c._id) ? ' • ACTIVE' : ''}</option>)}
    </select>
  )

  const sidebarContent = (
    <>
      <div style={{ padding: '16px 14px 12px', textAlign: 'center', flexShrink: 0 }}>
        <div style={{ fontSize: 32, lineHeight: 1 }}>🗳️</div>
        {sidebarOpen && <><div style={{ fontSize: 24, fontWeight: 900, letterSpacing: -0.5, lineHeight: 1.1 }}>PCMS</div><div style={{ fontSize: 9, color: '#bfdbfe', lineHeight: 1.3 }}>Political Campaign<br />Management System</div></>}
      </div>
      {sidebarOpen && (
        <div style={{ margin: '0 12px 10px', background: 'rgba(255,255,255,0.10)', borderRadius: 10, padding: '10px 12px', flexShrink: 0 }}>
          <div style={{ fontSize: 10, color: '#bfdbfe', fontWeight: 700, letterSpacing: 1 }}>🎯 CAMPAIGN FIELD</div>
          <CampaignDropdown style={{ width: '100%', marginTop: 6 }} />
          <div style={{ fontSize: 11, color: '#bfdbfe', marginTop: 6, lineHeight: 1.4 }}>{selectedCampaign ? `● ACTIVE: ${selectedCampaign.name}` : 'Field: All Campaigns'}<br />{effectiveTeams.length} teams • {effectiveVolunteers.length} people • {mentionsCount} mentions</div>
        </div>
      )}
      <nav style={{ padding: '0 10px', flex: 1 }}>
        {menu.map((m) => {
          const isActive = m.id === activeMenu
          return (
            <button key={m.label} onClick={() => goMenu(m.id)} title={m.badgeTitle || m.label} style={{ width: '100%', textAlign: 'left', padding: sidebarOpen ? '11px 12px' : '11px 0', borderRadius: 10, border: 'none', cursor: 'pointer', background: isActive ? '#2563eb' : 'transparent', color: 'white', fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: sidebarOpen ? 'flex-start' : 'center', gap: 12, fontWeight: isActive ? '700' : '500', marginBottom: 2 }}>
              <span style={{ fontSize: 18 }}>{m.icon}</span>
              {sidebarOpen && <span style={{ flex: 1 }}>{m.label}</span>}
              {sidebarOpen && m.badge && <span style={{ background: '#ef4444', color: 'white', fontSize: 11, fontWeight: 800, padding: '2px 7px', borderRadius: 99 }}>{m.badge}</span>}
            </button>
          )
        })}
      </nav>
      {sidebarOpen && (
        <div style={{ margin: '10px 12px', background: 'rgba(255,255,255,0.08)', borderRadius: 14, padding: 14, textAlign: 'center', flexShrink: 0 }}>
          <div style={{ position: 'relative', display: 'inline-block' }}><Avatar size={64} fontSize={16} /><span style={{ position: 'absolute', bottom: 2, right: 2, width: 14, height: 14, background: '#22c55e', borderRadius: '50%', border: '2px solid #1e3a6e' }} /></div>
          <div style={{ fontWeight: 800, fontSize: 14, marginTop: 8 }}>{user?.fullName || 'Edwin M. Sifuna'}</div>
          <div style={{ fontSize: 12, color: '#bfdbfe' }}>{cand?.positionContested || user?.jobTitle || 'Senator'}</div>
          <div style={{ display: 'inline-flex', gap: 4, alignItems: 'center', background: 'rgba(255,255,255,0.12)', padding: '4px 10px', borderRadius: 99, fontSize: 11, marginTop: 8 }}>📍 {cand?.county || user?.county || 'Nairobi'}, Kenya</div>
          <div style={{ marginTop: 8 }}><span style={{ display: 'inline-block', background: '#2563eb', color: 'white', fontSize: 11, fontWeight: 700, padding: '5px 12px', borderRadius: 99 }}>⭐ {cand?.party || user?.party || 'ODM'} Party</span></div>
          <div style={{ fontSize: 11, color: '#bfdbfe', marginTop: 8 }}>✅ {connectedCount}/8 socials • 👀 {mentionsCount} mentions</div>
          {syncNote && <div style={{ fontSize: 11, color: '#bbf7d0', marginTop: 6 }}>{syncNote}</div>}
        </div>
      )}
      <div style={{ padding: '0 12px 20px', display: 'flex', flexDirection: 'column', gap: 8, flexShrink: 0 }}>
        <button onClick={() => setShowHelp(true)} style={{ width: '100%', background: '#2563eb', color: 'white', border: 'none', padding: '11px', borderRadius: 10, cursor: 'pointer', fontWeight: 700, fontSize: 13, display: 'flex', gap: 8, alignItems: 'center', justifyContent: sidebarOpen ? 'flex-start' : 'center' }}><span>❓</span>{sidebarOpen && 'Help Centre'}</button>
        <button onClick={() => setSidebarOpen(!sidebarOpen)} style={{ width: '100%', background: 'rgba(255,255,255,0.12)', color: 'white', border: 'none', padding: '11px', borderRadius: 10, cursor: 'pointer', fontWeight: 700, fontSize: 13, display: 'flex', gap: 8, alignItems: 'center', justifyContent: sidebarOpen ? 'flex-start' : 'center' }}><span>←</span>{sidebarOpen && 'Collapse'}</button>
        <button onClick={onLogout} style={{ width: '100%', background: '#ef4444', color: 'white', border: 'none', padding: '11px', borderRadius: 10, cursor: 'pointer', fontWeight: 700, fontSize: 13, display: 'flex', gap: 8, alignItems: 'center', justifyContent: sidebarOpen ? 'flex-start' : 'center' }}><span>↩</span>{sidebarOpen && 'Logout'}</button>
      </div>
    </>
  )

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#f1f5f9', fontFamily: "'Inter', system-ui, sans-serif" }}>
      {!isMobile && <div style={{ width: sidebarOpen ? 250 : 72, background: 'linear-gradient(180deg,#0a1a4a 0%,#0f2a6b 100%)', color: 'white', display: 'flex', flexDirection: 'column', flexShrink: 0, position: 'sticky', top: 0, height: '100vh', transition: 'width 0.25s', overflowY: 'auto', overflowX: 'hidden' }}>{sidebarContent}</div>}
      {isMobile && mobileOpen && (<><div onClick={() => setMobileOpen(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 40 }} /><div style={{ position: 'fixed', left: 0, top: 0, bottom: 0, width: 250, background: '#0a1a4a', color: 'white', display: 'flex', flexDirection: 'column', zIndex: 50, overflowY: 'auto' }}>{sidebarContent}</div></>)}

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        <header style={{ background: 'white', padding: '12px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e5e7eb', position: 'sticky', top: 0, zIndex: 10, gap: 10 }}>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center', flex: 1, minWidth: 0 }}>
            <button onClick={() => isMobile ? setMobileOpen(!mobileOpen) : setSidebarOpen(!sidebarOpen)} style={{ background: 'transparent', border: 'none', fontSize: 20, cursor: 'pointer' }}>☰</button>
            {!isMobile && <div style={{ position: 'relative', flex: 1, maxWidth: 420 }}><span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)' }}>🔍</span><input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search campaigns, teams, volunteers..." style={{ width: '100%', padding: '10px 12px 10px 34px', borderRadius: 10, border: 'none', background: '#f1f5f9', outline: 'none', fontSize: 13, boxSizing: 'border-box' }} /></div>}
            {!isMobile && <span style={{ background: selectedCampaign ? '#16a34a' : '#eef4ff', color: selectedCampaign ? 'white' : '#1e40af', fontSize: 12, fontWeight: 700, padding: '6px 10px', borderRadius: 99, whiteSpace: 'nowrap' }}>● {selectedCampaign ? `ACTIVE: ${selectedCampaign.name}` : 'All Campaigns'}</span>}
          </div>
          <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
            <NotificationBell token={token} onGoMessages={() => goMenu('mentions')} />
            <span style={{ position: 'relative', fontSize: 22, cursor: 'pointer' }} onClick={() => goMenu('mentions')}>✉️<span style={{ position: 'absolute', top: -8, right: -8, background: '#ef4444', color: 'white', fontSize: 10, fontWeight: 800, width: 18, height: 18, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>7</span></span>
            <div style={{ position: 'relative' }}><Avatar size={36} fontSize={12} /><span style={{ position: 'absolute', bottom: 0, right: 0, width: 10, height: 10, background: '#22c55e', borderRadius: '50%', border: '2px solid white' }} /></div>
            <button onClick={refreshAll} disabled={refreshing} style={{ background: '#2563eb', color: 'white', border: 'none', padding: '8px 14px', borderRadius: 8, cursor: 'pointer', fontWeight: 700, fontSize: 13 }}>{refreshing ? '⏳' : '⬇ Export ▾'}</button>
          </div>
        </header>

        <main style={{ padding: isMobile ? 12 : 18, maxWidth: 1320, margin: '0 auto', width: '100%', boxSizing: 'border-box' }}>
          <div key={activeMenu} style={{ animation: tabAnim === 'tabIn' ? 'tabIn 0.3s ease' : 'tabOut 0.12s ease' }}>
            {activeMenu === 'profile' ? (
              <ProfileEdit token={token} user={effectiveUser} myData={myData} setMessage={setMessage} onPhotoUpdated={(photo) => { setProfilePhoto(photo); try { localStorage.setItem('pcms_photo', photo) } catch {}; window.dispatchEvent(new CustomEvent('pcms_photo_updated', { detail: { photo } })); setMessage?.('✅ Photo updated') }} onDone={async () => { await refreshAll(); goMenu('dashboard') }} onCancel={() => goMenu('dashboard')} />
            )
            : activeMenu === 'analytics' ? (
              <div>
                <div style={{ background: 'white', borderRadius: 14, border: '1px solid #e5e7eb', padding: 16, marginBottom: 14, display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, alignItems: 'center' }}>
                  <div><h2 style={{ margin: 0, fontSize: 20, fontWeight: 800 }}>📊 Analytics {selectedCampaign ? `• ${selectedCampaign.name}` : ''}</h2><p style={{ margin: '4px 0 0', color: '#64748b', fontSize: 13 }}>Real mentions, sentiment, trends for selected campaign. {mentionsCount} mentions total.</p></div>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}><CampaignDropdown /><button onClick={() => doFetch('all')} disabled={!!fetching} style={btnPrimary}>{fetching === 'all' ? '⏳...' : '↻ Fetch All'}</button></div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 12, marginBottom: 14 }}>
                  {stats.map((s) => (
                    <div key={s.label} onClick={() => goMenu(s.menu)} style={{ background: 'white', padding: 14, borderRadius: 14, border: '1px solid #e5e7eb', cursor: 'pointer' }}><div style={{ display: 'flex', gap: 10, alignItems: 'center' }}><span style={{ width: 38, height: 38, background: s.bg, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>{s.icon}</span><span style={{ fontSize: 12, fontWeight: 600 }}>{s.label}</span></div><div style={{ fontSize: 28, fontWeight: 900 }}>{s.value}</div><div style={{ fontSize: 11, color: '#16a34a', fontWeight: 600 }}>{s.sub}</div><Spark color={s.bg} /></div>
                  ))}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr 1.2fr', gap: 14, marginBottom: 14 }}>
                  <section style={{ ...card, padding: 0, overflow: 'hidden' }}>
                    <div style={{ background: '#0a1a4a', color: 'white', padding: '12px 14px', display: 'flex', justifyContent: 'space-between' }}><b style={{ fontSize: 14 }}>📊 Mentions by Platform</b><select value={range} onChange={e => setRange(e.target.value)} style={{ background: 'rgba(255,255,255,0.15)', color: 'white', border: 'none', padding: '4px 8px', borderRadius: 6, fontSize: 11 }}><option>Last 7 Days</option><option>Last 30 Days</option></select></div>
                    <div style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 12 }}>{ALL_PLATFORMS.map(p => { const count = perPlatform[p] || 0; const pct = maxPlatform ? Math.round((count / maxPlatform) * 100) : 0; return (<div key={p} style={{ display: 'flex', alignItems: 'center', gap: 8 }}><span style={{ fontSize: 14, width: 20 }}>{PLATFORM_ICONS[p]}</span><span style={{ fontSize: 12, fontWeight: 600, width: 82 }}>{PLATFORM_LABELS[p]}</span><div style={{ flex: 1, height: 8, background: '#e5e7eb', borderRadius: 99, overflow: 'hidden' }}><div style={{ width: `${pct}%`, height: '100%', background: PLATFORM_COLORS[p], borderRadius: 99 }} /></div><span style={{ fontSize: 12, fontWeight: 700, width: 28, textAlign: 'right' }}>{count}</span></div>) })}</div>
                  </section>
                  <section style={card}>
                    <h3 style={{ margin: '0 0 14px', fontSize: 15, fontWeight: 800 }}>😊 Sentiment Breakdown</h3>
                    <div style={{ display: 'flex', justifyContent: 'center' }}><div style={donutStyle}><div style={{ width: 84, height: 84, background: 'white', borderRadius: '50%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}><b style={{ fontSize: 18 }}>{fmtK(mentionsCount)}</b><span style={{ fontSize: 11, color: '#64748b' }}>Mentions</span></div></div></div>
                    <div style={{ fontSize: 13, lineHeight: 2, marginTop: 12 }}><div style={{ display: 'flex', justifyContent: 'space-between' }}><span>🟢 Positive</span><b>{posPct}% ({mentionsPositive})</b></div><div style={{ display: 'flex', justifyContent: 'space-between' }}><span>⚪ Neutral</span><b>{neuPct}% ({mentionsNeutral})</b></div><div style={{ display: 'flex', justifyContent: 'space-between' }}><span>🔴 Negative</span><b>{negPct}% ({mentionsNegative})</b></div></div>
                  </section>
                  <section style={{ ...card, padding: 0, overflow: 'hidden' }}>
                    <div style={{ background: '#0a1a4a', color: 'white', padding: '12px 14px', display: 'flex', justifyContent: 'space-between' }}><b style={{ fontSize: 14 }}>📈 Mentions Over Time</b><select value={range} onChange={e => setRange(e.target.value)} style={{ background: 'rgba(255,255,255,0.15)', color: 'white', border: 'none', padding: '4px 8px', borderRadius: 6, fontSize: 11 }}><option>Last 7 Days</option><option>Last 30 Days</option></select></div>
                    <div style={{ padding: 14 }}>{mentionsCount === 0 ? <p style={{ fontSize: 12, color: '#94a3b8' }}>No data yet - click Fetch All</p> : (<><div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#64748b' }}><span>Peak</span><span style={{ background: '#eef4ff', border: '1px solid #bfdbfe', padding: '3px 8px', borderRadius: 99, fontWeight: 700 }}>{peak.count} mentions</span></div><svg viewBox={`0 0 ${chartW} ${chartH}`} style={{ width: '100%', height: 120, marginTop: 6 }}><polygon points={areaPoints} fill="#dbeafe" opacity="0.7" /><polyline points={points} fill="none" stroke="#2563eb" strokeWidth="2.5" />{last7.map((x, i) => (<circle key={x.key} cx={(i / 6) * (chartW - 20) + 10} cy={chartH - 18 - (x.count / maxDay) * (chartH - 36)} r="4" fill="#2563eb" stroke="white" strokeWidth="1.5" />))}</svg><div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#94a3b8' }}><span>{last7[0]?.label}</span><span>{last7[2]?.label}</span><span>{last7[4]?.label}</span><span>{last7[6]?.label}</span></div></>)}
                    </div>
                  </section>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1.8fr 1fr', gap: 14, marginBottom: 14 }}>
                  <section style={card}><h3 style={{ margin: '0 0 10px', fontSize: 15, fontWeight: 800 }}>🔗 Political Keywords</h3><div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>{hasKeywords ? liveKeywords.slice(0, 10).map(k => <span key={k} style={{ background: '#dbeafe', color: '#1e40af', padding: '6px 10px', borderRadius: 99, fontSize: 12, fontWeight: 600 }}>{k}</span>) : <span style={{ fontSize: 12, color: '#94a3b8' }}>No keywords yet - add in Candidate Setup</span>}</div></section>
                  <section style={{ background: 'linear-gradient(135deg,#0a1a4a,#1e40af)', color: 'white', borderRadius: 14, padding: 16 }}><div style={{ fontSize: 20 }}>⭐</div><b>Your Campaign<br />Stronger with Data</b><div style={{ fontSize: 11, opacity: 0.8 }}>Monitor • Engage • Win • Field {fieldStrength}%</div></section>
                </div>
                <AnalyticsCharts token={token} />
              </div>
            )
            : activeMenu === 'events' ? (
              <div>
                <div style={{ background: '#0a1a4a', borderRadius: 14, padding: 20, marginBottom: 16, display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, alignItems: 'center', color: 'white' }}><div><h2 style={{ margin: 0, fontSize: 20, fontWeight: 800 }}>📅 Events {selectedCampaign ? `• ${selectedCampaign.name}` : ''} ({displayEvents.length})</h2><p style={{ margin: '4px 0 0', opacity: 0.8, fontSize: 13 }}>Real events in selected campaign field.</p></div><button onClick={() => setShowEventModal(true)} style={btnDark}>+ Create Event</button></div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}><CampaignDropdown style={{ width: 230 }} />{['Upcoming', 'Past'].map(t => <button key={t} onClick={() => setEventTab(t)} style={{ background: eventTab === t ? '#0f172a' : 'white', color: eventTab === t ? 'white' : '#0f172a', border: '1px solid #e5e7eb', padding: '8px 14px', borderRadius: 99, cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>{t}</button>)}{['All Types', 'Rally', 'Meeting', 'Door-to-Door', 'Fundraiser'].map(t => <button key={t} onClick={() => setEventType(t)} style={{ background: eventType === t ? '#2563eb' : 'white', color: eventType === t ? 'white' : '#0f172a', border: '1px solid #e5e7eb', padding: '8px 14px', borderRadius: 99, cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>{t}</button>)}</div>
                {displayEvents.length === 0 ? <div style={{ ...card, textAlign: 'center', padding: 32 }}><b>No events yet in this campaign</b><p style={{ fontSize: 12, color: '#94a3b8' }}>Create your first real event.</p><button onClick={() => setShowEventModal(true)} style={btnPrimary}>+ Create Event</button></div> : <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 14 }}>{displayEvents.map(e => { const d = new Date(e.date || e.startDate || Date.now()); return (<div key={e.id || e._id} style={{ ...card, display: 'flex', gap: 14 }}><div style={{ background: '#eef4ff', borderRadius: 12, padding: '12px 14px', textAlign: 'center', height: 'fit-content' }}><div style={{ fontSize: 22, fontWeight: 900, color: '#1e40af' }}>{d.getDate()}</div><div style={{ fontSize: 11, fontWeight: 700, color: '#1e40af' }}>{d.toLocaleDateString('en-KE', { month: 'short' }).toUpperCase()}</div></div><div style={{ flex: 1 }}><span style={{ background: '#dbeafe', color: '#1e40af', fontSize: 11, fontWeight: 700, padding: '3px 8px', borderRadius: 99 }}>{e.type || 'Rally'}</span><b style={{ display: 'block', marginTop: 6 }}>{e.title || e.name}</b><div style={{ fontSize: 12, color: '#64748b' }}>📍 {e.location || 'Nairobi'} • 👥 {e.attendees || 0} expected • 🎯 {e.campaignName || selectedCampaign?.name || 'All'}</div><button onClick={() => setMessage?.('RSVP saved!')} style={{ marginTop: 10, ...btnGhost, padding: '6px 12px', fontSize: 12 }}>✅ RSVP</button></div></div>) })}</div>}
                <div style={{ marginTop: 16 }}><EventsPage token={token} user={effectiveUser} campaigns={effectiveCampaigns} setMessage={setMessage} /></div>
              </div>
            )
            : activeMenu === 'messages' ? (<MessagesPage token={token} user={effectiveUser} setMessage={setMessage} />)
            : activeMenu === 'mentions' ? (<OnlineMentions token={token} user={effectiveUser} myData={myData} setMessage={setMessage} onRefreshOverview={refreshAll} />)
            : activeMenu === 'campaigns' ? (
              <div>
                <div style={{ background: '#eef4ff', borderRadius: 14, padding: 20, marginBottom: 16, display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}><div><h2 style={{ margin: 0 }}>🎯 Campaigns ({filteredCampaigns.length})</h2><p style={{ color: '#475569', fontSize: 13 }}>Click Set as Field on any campaign to make it the ACTIVE FIELD.</p></div><button onClick={() => setShowCampModal(true)} style={btnDark}>+ Create Campaign</button></div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}><CampaignDropdown style={{ width: 230 }} /><span style={{ background: selectedCampaign ? '#16a34a' : '#f1f5f9', color: selectedCampaign ? 'white' : '#0f172a', fontSize: 12, fontWeight: 700, padding: '9px 12px', borderRadius: 10 }}>● {selectedCampaign ? `ACTIVE FIELD: ${selectedCampaign.name}` : 'No Active Field - All Campaigns'}</span></div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 16 }}>{[['Total Campaigns', effectiveCampaigns.length], ['Active', effectiveCampaigns.filter(c => (c.status || 'ACTIVE') === 'ACTIVE').length], ['Teams in Field', teamsInCampaign.length], ['People in Field', volunteersInCampaign.length]].map(([l, v]) => (<div key={l} style={card}><div style={{ fontSize: 24, fontWeight: 900 }}>{v}</div><div style={{ fontSize: 12, fontWeight: 700 }}>{l}</div></div>))}</div>
                {filteredCampaigns.length === 0 ? <div style={{ ...card, textAlign: 'center', padding: 32 }}><div style={{ fontSize: 36 }}>🎯</div><b>No campaigns yet</b><p style={{ fontSize: 12, color: '#94a3b8' }}>Create your first real campaign.</p><button onClick={() => setShowCampModal(true)} style={{ ...btnPrimary, marginTop: 10 }}>+ Create Campaign</button></div> : <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 14 }}>{filteredCampaigns.map(c => { const isActiveField = String(selectedCampaignId) === String(c.id || c._id); const tCount = effectiveTeams.filter(t => getCampId(t) === String(c.id || c._id) || getCampId(t) === String(c.name)).length; return (<div key={c.id || c._id} style={{ ...card, border: isActiveField ? '2px solid #16a34a' : '1px solid #e5e7eb' }}><div style={{ display: 'flex', justifyContent: 'space-between' }}><b>{c.name}</b><span style={{ fontSize: 11, padding: '4px 8px', borderRadius: 99, background: isActiveField ? '#16a34a' : '#dcfce7', color: isActiveField ? 'white' : '#166534', fontWeight: 700 }}>{isActiveField ? '● ACTIVE FIELD' : (c.status || 'ACTIVE')}</span></div><p style={{ fontSize: 12, color: '#64748b' }}>{c.objectives || 'No description'}<br />{c.startDate?.slice(0, 10) || ''} → {c.endDate?.slice(0, 10) || ''} {c.field ? `• Field: ${c.field}` : ''}</p><div style={{ fontSize: 12, color: '#64748b' }}>👥 {tCount} teams • 📍 {c.field || c.wards || 'Nairobi'}</div><div style={{ display: 'flex', gap: 8, marginTop: 12 }}><button onClick={() => { setActiveField(String(c.id || c._id)); goMenu('dashboard'); setMessage?.(`🎯 ACTIVE FIELD: ${c.name}`) }} style={{ flex: 1, background: isActiveField ? '#16a34a' : '#2563eb', color: 'white', border: 'none', padding: '10px', borderRadius: 8, cursor: 'pointer', fontWeight: 700 }}>{isActiveField ? '✓ Active Field' : 'Set as Field →'}</button><button onClick={() => { setActiveField(String(c.id || c._id)); goMenu('teams') }} style={btnGhost}>Teams →</button></div></div>) })}</div>}
              </div>
            )
            : activeMenu === 'teams' ? (
              <div>
                <div style={{ background: '#eef4ff', borderRadius: 14, padding: 20, marginBottom: 16, display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}><div><h2 style={{ margin: 0 }}>👥 Teams {selectedCampaign ? `• ${selectedCampaign.name}` : ''} ({filteredTeams.length})</h2><p style={{ color: '#475569', fontSize: 13 }}>Real teams in selected campaign field. Click team → see its people.</p></div><button onClick={() => setShowTeamModal(true)} style={btnDark}>+ Create Team</button></div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 14 }}><CampaignDropdown style={{ width: 230 }} /><select value={teamFilter} onChange={e => setTeamFilter(e.target.value)} style={{ ...inputStyle, width: 180 }}><option value="All">All Campaigns</option>{effectiveCampaigns.map(c => <option key={c.id || c._id} value={c.name}>{c.name}</option>)}</select></div>
                {filteredTeams.length === 0 ? <div style={{ ...card, textAlign: 'center', padding: 32 }}><b>No teams in this field yet</b><p style={{ fontSize: 12, color: '#94a3b8' }}>Create a team in {selectedCampaign?.name || 'this campaign'} - assign a Ward.</p><button onClick={() => setShowTeamModal(true)} style={{ ...btnPrimary, marginTop: 10 }}>+ Create Team</button></div> : <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 14 }}>{filteredTeams.map(t => { const members = effectiveVolunteers.filter(v => String(v.team?.id || v.teamId || '') === String(t.id || t._id)); return (<div key={t.id || t._id} style={{ ...card, cursor: 'pointer', border: selectedTeamId === String(t.id || t._id) ? '2px solid #2563eb' : '1px solid #e5e7eb' }} onClick={() => { setSelectedTeamId(String(t.id || t._id)); goMenu('volunteers') }}><div style={{ display: 'flex', gap: 12, alignItems: 'center' }}><div style={{ width: 48, height: 48, background: '#eef4ff', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 18 }}>{(t.name || 'T')[0]}</div><div><b>{t.name}</b><div style={{ fontSize: 12, color: '#64748b' }}>Leader: {t.leader || t.leaderName || 'Not set'} • 📍 {t.ward || t.location || 'Nairobi'} • 🎯 {t.campaign?.name || t.campaignName || selectedCampaign?.name || ''}</div></div></div><div style={{ fontSize: 12, color: '#64748b', marginTop: 10 }}>👥 {members.length} people • ✅ {members.filter(m => m.onboardingStatus === 'APPROVED').length} approved</div><button style={{ ...btnGhost, marginTop: 10, width: '100%' }}>View People →</button></div>) })}</div>}
              </div>
            )
            : activeMenu === 'volunteers' ? (
              <div>
                <div style={{ background: '#eef4ff', borderRadius: 14, padding: 20, marginBottom: 16, display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}><div><h2 style={{ margin: 0 }}>🤝 People in Campaign {selectedCampaign ? `• ${selectedCampaign.name}` : ''} ({filteredVolunteers.length})</h2><p style={{ color: '#475569', fontSize: 13 }}>{selectedTeamId ? 'Filtered to selected team' : 'Real people in selected campaign field.'}</p></div><button onClick={() => setShowVolModal(true)} style={btnDark}>+ Add Volunteer</button></div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 14 }}>{[['People in Campaign', volunteersInCampaign.length], ['Approved', volunteersInCampaign.filter(v => v.onboardingStatus === 'APPROVED').length], ['Pending', volunteersInCampaign.filter(v => (v.onboardingStatus || 'PENDING') === 'PENDING').length], ['Teams in Campaign', teamsInCampaign.length]].map(([l, v]) => (<div key={l} style={card}><div style={{ fontSize: 24, fontWeight: 900 }}>{v}</div><div style={{ fontSize: 12, fontWeight: 700 }}>{l}</div></div>))}</div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 14 }}><CampaignDropdown style={{ width: 230 }} />{['All', 'APPROVED', 'PENDING', 'REJECTED'].map(s => <button key={s} onClick={() => setVolFilter(s)} style={{ background: volFilter === s ? '#0f172a' : 'white', color: volFilter === s ? 'white' : '#0f172a', border: '1px solid #e5e7eb', padding: '8px 14px', borderRadius: 99, cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>{s}</button>)}<button onClick={() => setVolView(volView === 'cards' ? 'table' : 'cards')} style={btnGhost}>{volView === 'cards' ? '📋 Table' : '🃏 Cards'}</button>{selectedTeamId && <button onClick={() => setSelectedTeamId(null)} style={btnGhost}>✕ Clear team</button>}</div>
                {filteredVolunteers.length === 0 ? <div style={{ ...card, textAlign: 'center', padding: 32 }}><b>No people in this campaign yet</b><button onClick={() => setShowVolModal(true)} style={{ ...btnPrimary, marginTop: 10 }}>+ Add Volunteer</button></div> : <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 14 }}>{filteredVolunteers.map(v => (<div key={v.id || v._id} style={card}><div style={{ display: 'flex', gap: 10, alignItems: 'center' }}><div style={{ width: 44, height: 44, background: '#f0fdf4', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, color: '#166534' }}>{(v.fullName || 'V')[0]}</div><div><b>{v.fullName}</b><div style={{ fontSize: 12, color: '#64748b' }}>{v.phone} • {v.team?.name || 'No team'} • 📍 {v.ward || v.location || ''}</div></div><span style={{ marginLeft: 'auto', fontSize: 11, padding: '4px 8px', borderRadius: 99, background: v.onboardingStatus === 'APPROVED' ? '#dcfce7' : '#fef9c3', fontWeight: 700 }}>{v.onboardingStatus || 'PENDING'}</span></div><div style={{ display: 'flex', gap: 8, marginTop: 10 }}><button onClick={() => updateVolunteerStatus(v, 'APPROVED')} style={{ flex: 1, background: '#16a34a', color: 'white', border: 'none', padding: '8px', borderRadius: 8, cursor: 'pointer', fontWeight: 700 }}>✅ Approve</button><button onClick={() => updateVolunteerStatus(v, 'REJECTED')} style={{ flex: 1, ...btnGhost }}>Reject</button></div></div>))}</div>}
              </div>
            )
            : (<>
              <section style={{ background: 'white', borderRadius: 14, border: '1px solid #e5e7eb', padding: 14, marginBottom: 14, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
                <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 12, fontWeight: 800, color: '#64748b' }}>🎯 CAMPAIGN FIELD</span>
                  <CampaignDropdown style={{ minWidth: 240, border: '2px solid #2563eb' }} />
                  <span style={{ background: selectedCampaign ? '#16a34a' : '#f1f5f9', color: selectedCampaign ? 'white' : '#0f172a', fontSize: 12, fontWeight: 800, padding: '8px 12px', borderRadius: 99 }}>● {selectedCampaign ? `ACTIVE FIELD: ${selectedCampaign.name}` : 'All Campaigns'}</span>
                </div>
                <div style={{ display: 'flex', gap: 8 }}><button onClick={() => goMenu('analytics')} style={{ background: '#0f172a', color: 'white', border: 'none', padding: '9px 14px', borderRadius: 8, cursor: 'pointer', fontWeight: 700, fontSize: 12 }}>📊 View Analytics →</button><button onClick={() => doFetch('all')} disabled={!!fetching} style={btnPrimary}>{fetching === 'all' ? '⏳...' : '↻ Fetch All'}</button></div>
              </section>

              <section style={{ position: 'relative', borderRadius: 16, overflow: 'hidden', minHeight: isMobile ? 320 : 420, marginBottom: 14, background: '#0a1a4a' }}>
                <img src={TOUR_IMG} alt="Campaign Tour" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} onError={(e) => { e.target.style.display = 'none' }} />
                <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(10,26,74,0.25) 0%, rgba(10,26,74,0.75) 55%, rgba(10,26,74,0.95) 100%)' }} />
                <div style={{ position: 'relative', zIndex: 1, padding: isMobile ? 16 : 24, color: 'white', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', minHeight: isMobile ? 320 : 420, boxSizing: 'border-box' }}>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}><span style={{ background: '#ef4444', padding: '5px 10px', borderRadius: 99, fontSize: 11, fontWeight: 800 }}>🔴 LIVE TOUR</span><span style={{ background: 'rgba(255,255,255,0.2)', padding: '5px 10px', borderRadius: 99, fontSize: 11, fontWeight: 700 }}>{new Date().toLocaleDateString('en-KE', { day: 'numeric', month: 'short', year: 'numeric' })} • {cand?.county || user?.county || 'Nairobi'}, Kenya</span><span style={{ background: '#16a34a', padding: '5px 10px', borderRadius: 99, fontSize: 11, fontWeight: 800 }}>Field Strength {fieldStrength}%</span></div>
                  <h1 style={{ margin: '12px 0 6px', fontSize: isMobile ? 28 : 44, fontWeight: 900, lineHeight: 1.05 }}>{selectedCampaign ? selectedCampaign.name : 'Campaign Tour'}<br /><span style={{ color: '#facc15' }}>On The Ground. With The People.</span></h1>
                  <p style={{ margin: '0 0 14px', fontSize: 14, opacity: 0.95, maxWidth: 620 }}>{selectedCampaign?.objectives || `Join ${firstName} on the campaign trail - rallies, town halls, door-to-door in ${selectedCampaign?.field || selectedCampaign?.wards || 'your field'}. Meet teams, volunteers, and voters.`}</p>
                  <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}><span style={{ width: 34, height: 34, borderRadius: '50%', background: '#2563eb', border: '2px solid white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 800, overflow: 'hidden' }}>{profilePhoto ? <img src={profilePhoto} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : initials}</span><span style={{ fontSize: 12, fontWeight: 600 }}>{volunteersInCampaign.length} people on tour • {teamsInCampaign.length} teams • {eventsInCampaign.length} events</span></div>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 14 }}>
                    <button onClick={() => goMenu('events')} style={{ background: '#2563eb', color: 'white', border: 'none', padding: '11px 18px', borderRadius: 10, cursor: 'pointer', fontWeight: 800, fontSize: 13 }}>📅 View Tour Events ({eventsInCampaign.length}) →</button>
                    <button onClick={() => goMenu('teams')} style={{ background: 'white', color: '#0f172a', border: 'none', padding: '11px 18px', borderRadius: 10, cursor: 'pointer', fontWeight: 800, fontSize: 13 }}>👥 Meet The Teams ({teamsInCampaign.length})</button>
                    <button onClick={() => goMenu('volunteers')} style={{ background: 'rgba(255,255,255,0.2)', color: 'white', border: '1px solid rgba(255,255,255,0.4)', padding: '11px 18px', borderRadius: 10, cursor: 'pointer', fontWeight: 800, fontSize: 13 }}>🤝 Join As Volunteer</button>
                  </div>
                </div>
              </section>

              {eventsInCampaign.length > 0 ? (
                <section style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(4, 1fr)', gap: 12, marginBottom: 14 }}>
                  {eventsInCampaign.slice(0, 4).map((e, i) => { const d = new Date(e.date || e.startDate || Date.now()); return (<div key={e.id || e._id} style={{ ...card, padding: 14 }}><div style={{ fontSize: 11, fontWeight: 800, color: '#2563eb' }}>STOP {i + 1} • {d.toLocaleDateString('en-KE', { day: 'numeric', month: 'short' })}</div><b style={{ fontSize: 14, display: 'block', marginTop: 4 }}>{e.title || e.name}</b><div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>📍 {e.location || 'Nairobi'} • {e.type || 'Rally'}</div><button onClick={() => goMenu('events')} style={{ ...btnGhost, marginTop: 10, width: '100%', fontSize: 12 }}>View Stop →</button></div>) })}
                </section>
              ) : (
                <section style={{ ...card, textAlign: 'center', padding: 18, marginBottom: 14 }}><b>No tour stops yet in {selectedCampaign ? selectedCampaign.name : 'this campaign'}</b><p style={{ fontSize: 12, color: '#94a3b8', margin: '4px 0 10px' }}>Create a real event to add a tour stop.</p><button onClick={() => setShowEventModal(true)} style={btnPrimary}>+ Create Tour Event</button></section>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 12, marginBottom: 16 }}>
                {stats.map((s) => (
                  <div key={s.label} onClick={() => goMenu(s.menu)} style={{ background: 'white', padding: 14, borderRadius: 14, border: '1px solid #e5e7eb', cursor: 'pointer' }}>
                    <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}><span style={{ width: 38, height: 38, background: s.bg, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>{s.icon}</span><span style={{ fontSize: 12, fontWeight: 600 }}>{s.label}</span></div>
                    <div style={{ fontSize: 28, fontWeight: 900 }}>{s.value}</div><div style={{ fontSize: 11, color: '#16a34a', fontWeight: 600 }}>{s.sub}</div><Spark color={s.bg} />
                  </div>
                ))}
              </div>

              {showField && (
                <section style={{ ...card, marginBottom: 14 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                    <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800 }}>🎯 Campaign Field {selectedCampaign ? `- ${selectedCampaign.name}` : '- All Campaigns'} <span style={{ background: '#16a34a', color: 'white', fontSize: 11, padding: '3px 8px', borderRadius: 99 }}>Strength {fieldStrength}%</span></h3>
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>{['people', 'coverage', 'events'].map(t => <button key={t} onClick={() => setFieldTab(t)} style={{ background: fieldTab === t ? '#0f172a' : 'white', color: fieldTab === t ? 'white' : '#0f172a', border: '1px solid #e5e7eb', padding: '6px 12px', borderRadius: 99, cursor: 'pointer', fontSize: 12, fontWeight: 600, textTransform: 'capitalize' }}>{t === 'people' ? '👥 People' : t === 'coverage' ? '📍 Coverage' : '📅 Events'}</button>)}<button onClick={() => setShowField(false)} style={{ background: 'white', border: '1px solid #e5e7eb', padding: '6px 10px', borderRadius: 99, cursor: 'pointer', fontSize: 12 }}>Hide</button></div>
                  </div>
                  {fieldTab === 'people' && (
                    <div style={{ marginTop: 14 }}>
                      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr 1fr', gap: 12 }}>
                        <div style={{ background: '#eef4ff', borderRadius: 12, padding: 14 }}><div style={{ fontSize: 12, color: '#64748b', fontWeight: 700 }}>TEAMS IN CAMPAIGN</div><div style={{ fontSize: 26, fontWeight: 900 }}>{teamsInCampaign.length}</div><div style={{ fontSize: 12 }}>{topTeam ? `Top: ${topTeam.name} (${topTeam.members} people)` : 'No teams yet in this field'}</div><button onClick={() => goMenu('teams')} style={{ ...btnGhost, marginTop: 10, width: '100%' }}>View Teams →</button></div>
                        <div style={{ background: '#f0fdf4', borderRadius: 12, padding: 14 }}><div style={{ fontSize: 12, color: '#64748b', fontWeight: 700 }}>PEOPLE IN CAMPAIGN</div><div style={{ fontSize: 26, fontWeight: 900 }}>{volunteersInCampaign.length}</div><div style={{ fontSize: 12 }}>{approvedVols} approved • {volunteersInCampaign.length - approvedVols} pending</div><button onClick={() => goMenu('volunteers')} style={{ ...btnGhost, marginTop: 10, width: '100%' }}>View People →</button></div>
                        <div style={{ background: '#fef9c3', borderRadius: 12, padding: 14 }}><div style={{ fontSize: 12, color: '#64748b', fontWeight: 700 }}>FIELD EVENTS</div><div style={{ fontSize: 26, fontWeight: 900 }}>{eventsInCampaign.length}</div><div style={{ fontSize: 12 }}>{eventsInCampaign[0]?.title || 'No events yet in this field'}</div><button onClick={() => goMenu('events')} style={{ ...btnGhost, marginTop: 10, width: '100%' }}>View Events →</button></div>
                      </div>
                      <div style={{ marginTop: 14, display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 10 }}>
                        <div><div style={{ fontSize: 12, fontWeight: 700, color: '#64748b', marginBottom: 6 }}>TEAMS</div>{teamsInCampaign.slice(0, 5).map(t => (<div key={t.id || t._id} style={{ background: '#f8fafc', border: '1px solid #e5e7eb', borderRadius: 10, padding: '8px 10px', marginBottom: 6, fontSize: 12 }}><b>{t.name}</b> • {t.leader || 'No leader'} • 📍 {t.ward || t.location || 'Nairobi'}</div>))}{!teamsInCampaign.length && <span style={{ fontSize: 12, color: '#94a3b8' }}>No teams yet.</span>}</div>
                        <div><div style={{ fontSize: 12, fontWeight: 700, color: '#64748b', marginBottom: 6 }}>VOLUNTEERS</div>{volunteersInCampaign.slice(0, 5).map(v => (<div key={v.id || v._id} style={{ background: '#f8fafc', border: '1px solid #e5e7eb', borderRadius: 10, padding: '8px 10px', marginBottom: 6, fontSize: 12 }}><b>{v.fullName}</b> • {v.team?.name || 'No team'} • 📍 {v.ward || v.location || ''} • {v.onboardingStatus || 'PENDING'}</div>))}{!volunteersInCampaign.length && <span style={{ fontSize: 12, color: '#94a3b8' }}>No volunteers yet.</span>}</div>
                      </div>
                      <div style={{ marginTop: 10, display: 'flex', gap: 8, flexWrap: 'wrap' }}><button onClick={() => setShowTeamModal(true)} style={btnPrimary}>+ Add Team to Field</button><button onClick={() => setShowVolModal(true)} style={btnGhost}>+ Add Person to Field</button></div>
                    </div>
                  )}
                  {fieldTab === 'coverage' && (
                    <div style={{ marginTop: 14 }}>{coverage.length ? coverage.map(c => (<div key={c.ward} style={{ marginBottom: 12 }}><div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, fontWeight: 600 }}><span>📍 {c.ward}</span><span>{c.pct}% • {c.teams} teams • {c.vols} volunteers</span></div><div style={{ height: 10, background: '#e5e7eb', borderRadius: 99, overflow: 'hidden', marginTop: 4 }}><div style={{ width: `${c.pct}%`, height: '100%', background: c.pct > 60 ? '#16a34a' : c.pct > 35 ? '#f59e0b' : '#ef4444', borderRadius: 99 }} /></div></div>)) : <p style={{ fontSize: 12, color: '#94a3b8' }}>No coverage yet - create a team with Ward Karen to see Karen rise.</p>}<button onClick={() => setShowTeamModal(true)} style={{ ...btnPrimary, marginTop: 10 }}>+ Add Team - Increase Coverage</button></div>
                  )}
                  {fieldTab === 'events' && (
                    <div style={{ marginTop: 14, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 10 }}>{eventsInCampaign.length ? eventsInCampaign.slice(0, 6).map(e => (<div key={e.id || e._id} style={{ background: '#f8fafc', border: '1px solid #e5e7eb', borderRadius: 10, padding: 12 }}><b style={{ fontSize: 13 }}>{e.title || e.name}</b><div style={{ fontSize: 12, color: '#64748b' }}>{String(e.date || e.startDate || '').slice(0, 10)} • {e.location || 'Nairobi'} • {e.type || 'Rally'}</div></div>)) : <span style={{ fontSize: 12, color: '#94a3b8' }}>No events in this campaign yet.</span>}</div>
                  )}
                </section>
              )}
              {!showField && <button onClick={() => setShowField(true)} style={{ ...btnGhost, marginBottom: 14 }}>🎯 Show Campaign Field</button>}

              <section style={{ background: 'white', borderRadius: 14, border: '1px solid #e5e7eb', padding: 16 }}>
                <h3 style={{ margin: '0 0 12px', fontSize: 15, fontWeight: 800 }}>⚡ Quick Access</h3>
                <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(7, 1fr)', gap: 10 }}>
                  {[
                    { label: 'Campaigns', sub: `${effectiveCampaigns.length} campaigns`, icon: '📣', btn: 'View All →', menu: 'campaigns' },
                    { label: 'Teams', sub: `${effectiveTeams.length} teams`, icon: '👥', btn: 'View Teams →', menu: 'teams' },
                    { label: 'Volunteers', sub: `${effectiveVolunteers.length} people`, icon: '💚', btn: 'View Volunteers →', menu: 'volunteers' },
                    { label: 'Events', sub: `${effectiveEvents.length} events`, icon: '📅', btn: 'View Events →', menu: 'events' },
                    { label: 'Analytics', sub: `${mentionsCount} mentions`, icon: '📊', btn: 'View Analytics →', menu: 'analytics' },
                    { label: 'Mentions', sub: 'Track media', icon: '💬', btn: 'View Mentions →', menu: 'mentions' },
                    { label: 'Settings', sub: 'Configure system', icon: '⚙️', btn: 'Open Settings →', menu: 'profile' },
                  ].map(q => (<div key={q.label} onClick={() => goMenu(q.menu)} style={{ background: '#f8fafc', border: '1px solid #f1f5f9', borderRadius: 12, padding: 12, textAlign: 'center', cursor: 'pointer' }}><div style={{ fontSize: 22 }}>{q.icon}</div><b style={{ fontSize: 13, display: 'block', marginTop: 4 }}>{q.label}</b><div style={{ fontSize: 11, color: '#64748b' }}>{q.sub}</div><div style={{ background: '#eef4ff', color: '#1e40af', fontSize: 11, fontWeight: 700, padding: '6px 8px', borderRadius: 99, marginTop: 8 }}>{q.btn}</div></div>))}
                </div>
              </section>
            </>)}
          </div>
        </main>
      </div>

      {showCampModal && (<div style={modalOverlay} onClick={() => setShowCampModal(false)}><form onSubmit={createCampaign} style={modalBox} onClick={e => e.stopPropagation()}><h3>🎯 Create Campaign</h3><input value={campForm.name} onChange={e => setCampForm({ ...campForm, name: e.target.value })} placeholder="Campaign name" style={{ ...inputStyle, marginBottom: 10 }} /><textarea value={campForm.objectives} onChange={e => setCampForm({ ...campForm, objectives: e.target.value })} placeholder="Objectives" rows={3} style={{ ...inputStyle, marginBottom: 10 }} /><input value={campForm.field} onChange={e => setCampForm({ ...campForm, field: e.target.value })} placeholder="Field - e.g. Karen, Langata" style={{ ...inputStyle, marginBottom: 10 }} /><input value={campForm.wards} onChange={e => setCampForm({ ...campForm, wards: e.target.value })} placeholder="Wards" style={{ ...inputStyle, marginBottom: 10 }} /><div style={{ display: 'flex', gap: 8 }}><input type="date" value={campForm.startDate} onChange={e => setCampForm({ ...campForm, startDate: e.target.value })} style={{ ...inputStyle, marginBottom: 10 }} /><input type="date" value={campForm.endDate} onChange={e => setCampForm({ ...campForm, endDate: e.target.value })} style={{ ...inputStyle, marginBottom: 10 }} /></div><div style={{ display: 'flex', gap: 8 }}><button type="button" onClick={() => setShowCampModal(false)} style={{ flex: 1, ...btnGhost }}>Cancel</button><button type="submit" disabled={saving} style={{ flex: 1, ...btnDark }}>{saving ? 'Saving...' : 'Create + Set as Field'}</button></div></form></div>)}
      {showTeamModal && (<div style={modalOverlay} onClick={() => setShowTeamModal(false)}><form onSubmit={createTeam} style={modalBox} onClick={e => e.stopPropagation()}><h3>👥 Create Team in {selectedCampaign?.name || 'Selected Campaign'}</h3><input value={teamForm.name} onChange={e => setTeamForm({ ...teamForm, name: e.target.value })} placeholder="Team name - e.g. Karen Ground Team" style={{ ...inputStyle, marginBottom: 10 }} /><input value={teamForm.leader} onChange={e => setTeamForm({ ...teamForm, leader: e.target.value })} placeholder="Leader" style={{ ...inputStyle, marginBottom: 10 }} /><input value={teamForm.ward} onChange={e => setTeamForm({ ...teamForm, ward: e.target.value })} placeholder="Ward - e.g. Karen (increases Karen coverage)" style={{ ...inputStyle, marginBottom: 10 }} /><input value={teamForm.location} onChange={e => setTeamForm({ ...teamForm, location: e.target.value })} placeholder="Location" style={{ ...inputStyle, marginBottom: 10 }} /><select value={teamForm.campaignId} onChange={e => setTeamForm({ ...teamForm, campaignId: e.target.value })} style={{ ...inputStyle, marginBottom: 10 }}><option value="">Campaign (defaults to ACTIVE FIELD)</option>{effectiveCampaigns.map(c => <option key={c.id || c._id} value={String(c.id || c._id)}>{c.name}</option>)}</select><div style={{ display: 'flex', gap: 8 }}><button type="button" onClick={() => setShowTeamModal(false)} style={{ flex: 1, ...btnGhost }}>Cancel</button><button type="submit" disabled={saving} style={{ flex: 1, ...btnDark }}>{saving ? 'Saving...' : 'Create Team'}</button></div></form></div>)}
      {showVolModal && (<div style={modalOverlay} onClick={() => setShowVolModal(false)}><form onSubmit={createVolunteer} style={modalBox} onClick={e => e.stopPropagation()}><h3>🤝 Add Person to {selectedCampaign?.name || 'Campaign'}</h3><input value={volForm.fullName} onChange={e => setVolForm({ ...volForm, fullName: e.target.value })} placeholder="Full name" style={{ ...inputStyle, marginBottom: 10 }} /><input value={volForm.phone} onChange={e => setVolForm({ ...volForm, phone: e.target.value })} placeholder="Phone" style={{ ...inputStyle, marginBottom: 10 }} /><input value={volForm.ward} onChange={e => setVolForm({ ...volForm, ward: e.target.value })} placeholder="Ward - e.g. Karen" style={{ ...inputStyle, marginBottom: 10 }} /><input value={volForm.location} onChange={e => setVolForm({ ...volForm, location: e.target.value })} placeholder="Location" style={{ ...inputStyle, marginBottom: 10 }} /><select value={volForm.teamId} onChange={e => setVolForm({ ...volForm, teamId: e.target.value })} style={{ ...inputStyle, marginBottom: 10 }}><option value="">Select Team (in selected campaign)</option>{teamsInCampaign.map(t => <option key={t.id || t._id} value={String(t.id || t._id)}>{t.name} • {t.ward || ''}</option>)}</select><div style={{ display: 'flex', gap: 8 }}><button type="button" onClick={() => setShowVolModal(false)} style={{ flex: 1, ...btnGhost }}>Cancel</button><button type="submit" disabled={saving} style={{ flex: 1, ...btnDark }}>{saving ? 'Saving...' : 'Add to Campaign'}</button></div></form></div>)}
      {showEventModal && (<div style={modalOverlay} onClick={() => setShowEventModal(false)}><form onSubmit={createEvent} style={modalBox} onClick={e => e.stopPropagation()}><h3>📅 Create Event in {selectedCampaign?.name || 'Campaign'}</h3><input value={eventForm.title} onChange={e => setEventForm({ ...eventForm, title: e.target.value })} placeholder="Event title" style={{ ...inputStyle, marginBottom: 10 }} /><select value={eventForm.type} onChange={e => setEventForm({ ...eventForm, type: e.target.value })} style={{ ...inputStyle, marginBottom: 10 }}><option>Rally</option><option>Meeting</option><option>Door-to-Door</option><option>Fundraiser</option></select><input type="date" value={eventForm.date} onChange={e => setEventForm({ ...eventForm, date: e.target.value })} style={{ ...inputStyle, marginBottom: 10 }} /><input value={eventForm.location} onChange={e => setEventForm({ ...eventForm, location: e.target.value })} placeholder="Location" style={{ ...inputStyle, marginBottom: 10 }} /><select value={eventForm.campaignId} onChange={e => setEventForm({ ...eventForm, campaignId: e.target.value })} style={{ ...inputStyle, marginBottom: 10 }}><option value="">Campaign (defaults to ACTIVE FIELD)</option>{effectiveCampaigns.map(c => <option key={c.id || c._id} value={String(c.id || c._id)}>{c.name}</option>)}</select><div style={{ display: 'flex', gap: 8 }}><button type="button" onClick={() => setShowEventModal(false)} style={{ flex: 1, ...btnGhost }}>Cancel</button><button type="submit" disabled={saving} style={{ flex: 1, ...btnDark }}>{saving ? 'Saving...' : 'Create Event'}</button></div></form></div>)}

      <button onClick={() => setShowHelp(true)} style={{ position: 'fixed', left: 20, bottom: 20, zIndex: 9999, width: 44, height: 44, background: '#0f172a', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, cursor: 'pointer', border: '2px solid white', opacity: 0.9 }}>🆘</button>
      {showHelp && (<div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }} onClick={() => setShowHelp(false)}><div style={{ background: 'white', borderRadius: 16, maxWidth: 400, width: '100%', padding: 24 }} onClick={e => e.stopPropagation()}><button onClick={() => setShowHelp(false)} style={{ float: 'right', background: '#f1f5f9', border: 'none', width: 30, height: 30, borderRadius: '50%', cursor: 'pointer' }}>✕</button><h2 style={{ textAlign: 'center' }}>Help Centre</h2><p style={{ textAlign: 'center', fontSize: 13, color: '#64748b' }}>Real figures: {effectiveCampaigns.length} campaigns • {effectiveTeams.length} teams • {effectiveVolunteers.length} people • {mentionsCount} mentions</p><button onClick={() => { setShowHelp(false); goMenu('campaigns') }} style={{ width: '100%', padding: 12, background: '#1e40af', color: 'white', border: 'none', borderRadius: 10, cursor: 'pointer', fontWeight: 700, marginTop: 10 }}>View Campaigns →</button><button onClick={() => { setShowHelp(false); goMenu('analytics') }} style={{ width: '100%', padding: 12, background: '#0f172a', color: 'white', border: 'none', borderRadius: 10, cursor: 'pointer', fontWeight: 700, marginTop: 8 }}>View Analytics →</button></div></div>)}
      <style>{`
        @keyframes tabIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
        @keyframes tabOut{from{opacity:1;transform:translateY(0)}to{opacity:0;transform:translateY(-6px)}}
        @media (max-width: 1100px) { div[style*="grid-template-columns: repeat(5, 1fr)"] { grid-template-columns: repeat(2, 1fr) !important; } div[style*="grid-template-columns: repeat(7, 1fr)"] { grid-template-columns: repeat(2, 1fr) !important; } }
      `}</style>
    </div>
  )
}