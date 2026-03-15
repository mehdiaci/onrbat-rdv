import { useState, useEffect } from 'react'
import { Users, TrendingUp, Euro, CalendarDays } from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell
} from 'recharts'
import KpiCard from './KpiCard'
import { API_BASE } from '../config'

const STATUT_COLORS = {
  'Devis signé':    '#22C55E',
  'Refus client':   '#EF4444',
  'Tutelle':        '#EF4444',
  'Déjà équipé':   '#EF4444',
  'Refus':          '#EF4444',
  'NRP':            '#F59E0B',
  'Absent':         '#64748B',
  'En attente':     '#3B82F6',
  'Passage admin':  '#8B5CF6',
}

function StatutBadge({ statut }) {
  const colors = STATUT_COLORS[statut] || '#64748B'
  return (
    <span style={{
      display: 'inline-block',
      background: `${colors}22`,
      color: colors,
      padding: '3px 10px',
      borderRadius: '20px',
      fontSize: '12px',
      fontWeight: 600,
      whiteSpace: 'nowrap'
    }}>
      {statut || '—'}
    </span>
  )
}

const CARD = {
  background: '#1E293B',
  borderRadius: '12px',
  padding: '24px',
  border: '1px solid #334155'
}

const TH = {
  padding: '10px 16px',
  textAlign: 'left',
  color: '#64748B',
  fontSize: '11px',
  fontWeight: 700,
  textTransform: 'uppercase',
  letterSpacing: '0.08em',
  borderBottom: '1px solid #334155',
  whiteSpace: 'nowrap'
}

const TD = {
  padding: '12px 16px',
  color: '#CBD5E1',
  fontSize: '13px',
  borderBottom: '1px solid #1E293B'
}

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div style={{ background: '#1E293B', border: '1px solid #334155', borderRadius: '8px', padding: '10px 14px' }}>
      <p style={{ color: '#94A3B8', fontSize: '12px', marginBottom: '4px' }}>{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color, fontWeight: 600, fontSize: '14px' }}>{p.value} RDV</p>
      ))}
    </div>
  )
}

export default function Dashboard() {
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    fetch(`${API_BASE}/api/stats`)
      .then(r => r.json())
      .then(data => { setStats(data); setLoading(false) })
      .catch(err => { setError(err.message); setLoading(false) })
  }, [])

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh' }}>
      <div style={{ color: '#475569', fontSize: '16px' }}>Chargement…</div>
    </div>
  )

  if (error) return (
    <div style={{ color: '#EF4444', padding: '24px' }}>
      Erreur : {error}. Vérifiez que le backend tourne sur le port 3001.
    </div>
  )

  const { kpis, statutRepartition = [], topDepartements = [], recentRdv = [] } = stats

  const formatEuro = (n) => n != null
    ? new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n)
    : '—'

  return (
    <div>
      <div style={{ marginBottom: '28px' }}>
        <h1 style={{ fontSize: '26px', fontWeight: 800, color: '#F1F5F9', letterSpacing: '-0.02em' }}>
          Tableau de bord
        </h1>
        <p style={{ color: '#64748B', marginTop: '4px', fontSize: '14px' }}>
          Vue d'ensemble de l'activité commerciale ONRBAT
        </p>
      </div>

      {/* KPI Cards */}
      <div style={{ display: 'flex', gap: '16px', marginBottom: '24px', flexWrap: 'wrap' }}>
        <KpiCard
          title="Total RDV"
          value={kpis.totalRdv}
          subtitle={`${kpis.totalVisites} visités`}
          icon={Users}
          color="#3B82F6"
        />
        <KpiCard
          title="Taux de concrétisation"
          value={`${kpis.tauxConcretisation}%`}
          subtitle={`${kpis.totalSignes} devis signés`}
          icon={TrendingUp}
          color="#22C55E"
        />
        <KpiCard
          title="RAC total signé"
          value={formatEuro(kpis.totalRacSigne)}
          subtitle="Reste à charge (signés)"
          icon={Euro}
          color="#F59E0B"
        />
        <KpiCard
          title="RDV cette semaine"
          value={kpis.rdvCetteSemaine}
          subtitle="7 derniers jours"
          icon={CalendarDays}
          color="#8B5CF6"
        />
      </div>

      {/* Charts */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px' }}>
        {/* Bar chart statuts */}
        <div style={CARD}>
          <h3 style={{ color: '#F1F5F9', fontSize: '15px', fontWeight: 700, marginBottom: '20px' }}>
            Répartition des résultats
          </h3>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={statutRepartition} margin={{ top: 0, right: 8, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
              <XAxis
                dataKey="statut_resultat"
                tick={{ fill: '#64748B', fontSize: 11 }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis tick={{ fill: '#64748B', fontSize: 11 }} tickLine={false} axisLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                {statutRepartition.map((entry, i) => (
                  <Cell key={i} fill={STATUT_COLORS[entry.statut_resultat] || '#475569'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Horizontal bar — top départements */}
        <div style={CARD}>
          <h3 style={{ color: '#F1F5F9', fontSize: '15px', fontWeight: 700, marginBottom: '20px' }}>
            Top départements
          </h3>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart
              data={topDepartements}
              layout="vertical"
              margin={{ top: 0, right: 24, left: 0, bottom: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" horizontal={false} />
              <XAxis type="number" tick={{ fill: '#64748B', fontSize: 11 }} tickLine={false} axisLine={false} />
              <YAxis
                type="category"
                dataKey="departement"
                tick={{ fill: '#94A3B8', fontSize: 12 }}
                tickLine={false}
                axisLine={false}
                width={32}
              />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="count" fill="#3B82F6" radius={[0, 6, 6, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Recent RDV table */}
      <div style={CARD}>
        <h3 style={{ color: '#F1F5F9', fontSize: '15px', fontWeight: 700, marginBottom: '20px' }}>
          10 derniers rendez-vous
        </h3>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%' }}>
            <thead>
              <tr>
                {['Date', 'Client', 'Travaux', 'Département', 'Résultat', 'RAC'].map(h => (
                  <th key={h} style={TH}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {recentRdv.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ ...TD, color: '#475569', textAlign: 'center', padding: '32px' }}>
                    Aucun RDV enregistré
                  </td>
                </tr>
              ) : recentRdv.map((rdv, i) => (
                <tr
                  key={rdv.id}
                  style={{ background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.02)' }}
                >
                  <td style={TD}>{rdv.date || '—'}</td>
                  <td style={{ ...TD, color: '#F1F5F9', fontWeight: 500 }}>{rdv.nom_client || '—'}</td>
                  <td style={TD}>
                    <span style={{ color: '#3B82F6', fontSize: '12px', fontWeight: 600 }}>
                      {rdv.travaux || '—'}
                    </span>
                  </td>
                  <td style={TD}>
                    {rdv.departement ? `Dép. ${rdv.departement}` : '—'}
                  </td>
                  <td style={TD}><StatutBadge statut={rdv.statut_resultat} /></td>
                  <td style={TD}>
                    {rdv.reste_a_charge != null
                      ? <span style={{ color: '#22C55E', fontWeight: 600 }}>{formatEuro(rdv.reste_a_charge)}</span>
                      : <span style={{ color: '#475569' }}>—</span>
                    }
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
