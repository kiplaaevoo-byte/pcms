import { useState, useEffect } from 'react'
import { API } from '../api'

export default function AnalyticsCharts({ token, fallback = null }) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!token) return
    fetch(`${API}/api/analytics/overview`, { headers: { 'Authorization': `Bearer ${token}` } })
      .then(r => r.json())
      .then(d => { if (!d.error) setData(d); setLoading(false) })
      .catch(() => setLoading(false))
  }, [token])

  // If backend fails, use fallback from Dashboard props (teams/volunteers/campaigns already loaded)
  const d = data || fallback
  if (loading && !d) return <div style={{ background: 'white', padding: 20, borderRadius: 12 }}>📊 Loading analytics...</div>
  if (!d) return null

  const maxTeam = Math.max(1, ...((d.volunteersPerTeam || []).map(t => t.count)))
  const card = { background: 'white', padding: 20, borderRadius: 12, boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }
  const barBg = { height: 22, background: '#f1f5f9', borderRadius: 10, overflow: 'hidden', flex: 1 }

  // Fallback calc if backend didn't return
  const volunteersPerTeam = d.volunteersPerTeam || []
  const campaignProgress = d.campaignProgress || []
  const byStatus = d.byStatus || { PENDING: 0, APPROVED: 0, REJECTED: 0 }
  const totalVols = (byStatus.PENDING || 0) + (byStatus.APPROVED || 0) + (byStatus.REJECTED || 0) || 1
  const totals = d.totals || {}

  return (
    <div>
      {/* TOP STATS ROW */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(150px,1fr))', gap: 12, marginBottom: 14 }}>
        {[
          ['👥 Volunteers', totals.volunteers ?? totalVols, '#16a34a'],
          ['📊 Teams', totals.teams ?? volunteersPerTeam.length, '#f59e0b'],
          ['🎯 Campaigns', totals.campaigns ?? campaignProgress.length, '#2563eb'],
          ['🗳️ Candidates', totals.candidates ?? 0, '#7c3aed'],
          ['📅 Events', totals.events ?? 0, '#ea580c'],
          ['✉️ Unread', totals.unread ?? 0, '#ef4444'],
        ].map(([label, val, color]) => (
          <div key={label} style={{ ...card, padding: 16, borderLeft: `4px solid ${color}` }}>
            <div style={{ fontSize: 13, color: '#64748b' }}>{label}</div>
            <div style={{ fontSize: 28, fontWeight: '900', color }}>{val}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(300px,1fr))', gap: 14 }}>
        {/* CHART 1: Volunteers per Team */}
        <div style={card}>
          <h3 style={{ margin: '0 0 4px' }}>👥 Volunteers per Team</h3>
          <p style={{ margin: '0 0 14px', fontSize: 12, color: '#64748b' }}>Which team has the strongest ground game?</p>
          {volunteersPerTeam.length === 0 ? <p style={{ color: '#94a3b8', fontSize: 13 }}>No teams yet. Create a team first.</p> : volunteersPerTeam.sort((a, b) => b.count - a.count).map((t, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
              <div style={{ width: 130, fontSize: 13, fontWeight: 'bold', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={t.name}>{t.name}</div>
              <div style={barBg}><div style={{ width: `${(t.count / maxTeam) * 100}%`, height: '100%', background: i === 0 ? '#16a34a' : '#22c55e', borderRadius: 10, transition: 'width 0.5s' }} /></div>
              <b style={{ width: 30, textAlign: 'right', fontSize: 14 }}>{t.count}</b>
            </div>
          ))}
        </div>

        {/* CHART 2: Campaign Progress */}
        <div style={card}>
          <h3 style={{ margin: '0 0 4px' }}>🎯 Campaign Progress</h3>
          <p style={{ margin: '0 0 14px', fontSize: 12, color: '#64748b' }}>% Volunteers Approved - higher = more ready</p>
          {campaignProgress.length === 0 ? <p style={{ color: '#94a3b8', fontSize: 13 }}>No campaigns yet.</p> : campaignProgress.map((c, i) => (
            <div key={i} style={{ marginBottom: 14 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 5 }}>
                <b style={{ maxWidth: '70%', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.name}</b>
                <span style={{ fontWeight: 'bold', color: c.progress >= 70 ? '#16a34a' : c.progress >= 40 ? '#f59e0b' : '#ef4444' }}>{c.progress}%</span>
              </div>
              <div style={{ ...barBg, height: 14 }}><div style={{ width: `${c.progress}%`, height: '100%', background: c.progress >= 70 ? '#16a34a' : c.progress >= 40 ? '#f59e0b' : '#ef4444', borderRadius: 10 }} /></div>
              <div style={{ fontSize: 11, color: '#64748b', marginTop: 4 }}>{c.candidate} • {c.teams} teams • {c.volunteers} vols • {c.approved} approved • {c.status}</div>
            </div>
          ))}
        </div>

        {/* CHART 3: Volunteer Status Donut */}
        <div style={card}>
          <h3 style={{ margin: '0 0 14px' }}>✅ Volunteer Onboarding</h3>
          {[
            ['APPROVED', byStatus.APPROVED || 0, '#16a34a'],
            ['PENDING', byStatus.PENDING || 0, '#f59e0b'],
            ['REJECTED', byStatus.REJECTED || 0, '#ef4444'],
          ].map(([label, val, color]) => (
            <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
              <div style={{ width: 14, height: 14, borderRadius: 4, background: color, flexShrink: 0 }} />
              <div style={{ flex: 1, fontSize: 13, fontWeight: 'bold' }}>{label}</div>
              <div style={barBg}><div style={{ width: `${(val / totalVols) * 100}%`, height: '100%', background: color, borderRadius: 10 }} /></div>
              <b style={{ width: 60, textAlign: 'right' }}>{val} ({Math.round((val / totalVols) * 100)}%)</b>
            </div>
          ))}
          <div style={{ marginTop: 14, background: '#f8fafc', padding: 12, borderRadius: 10, fontSize: 13, lineHeight: 1.5 }}>
            {byStatus.PENDING > 0 ? `⚠️ <b>${byStatus.PENDING} volunteer(s)</b> waiting for approval. Go to Volunteers tab to approve.` : '🎉 All volunteers processed!'}
          </div>
        </div>

        {/* CHART 4: Candidates per County */}
        <div style={card}>
          <h3 style={{ margin: '0 0 14px' }}>🗺️ Candidates per County</h3>
          {(d.candidatesPerCounty || []).length === 0 ? <p style={{ color: '#94a3b8', fontSize: 13 }}>No candidates yet.</p> : d.candidatesPerCounty.map((c, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #f1f5f9', fontSize: 13 }}>
              <span>📍 {c.county}</span><b>{c.count} candidate{c.count > 1 ? 's' : ''}</b>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}