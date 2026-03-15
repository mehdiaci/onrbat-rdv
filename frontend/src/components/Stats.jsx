import { useState, useEffect } from 'react'
import { API_BASE } from '../config'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell
} from 'recharts'

const PIE_COLORS = ['#EF4444', '#F59E0B', '#94A3B8', '#8B5CF6', '#3B82F6', '#06B6D4']

const CARD = {
  background: '#1E293B',
  borderRadius: '12px',
  padding: '24px',
  border: '1px solid #334155'
}
const TH = {
  padding: '10px 14px',
  textAlign: 'left',
  color: '#64748B',
  fontSize: '11px',
  fontWeight: 700,
  textTransform: 'uppercase',
  letterSpacing: '0.07em',
  borderBottom: '1px solid #334155',
  whiteSpace: 'nowrap'
}
const TD = { padding: '11px 14px', color: '#CBD5E1', fontSize: '13px', borderBottom: '1px solid #334155' }
const SELECT = {
  background: '#1E293B',
  border: '1px solid #334155',
  borderRadius: '8px',
  padding: '8px 14px',
  color: '#E2E8F0',
  fontSize: '13px',
  cursor: 'pointer',
  outline: 'none'
}

const TOOLTIP_STYLE = {
  contentStyle: {
    background: '#1E293B',
    border: '1px solid #334155',
    borderRadius: '8px',
    color: '#F1F5F9',
    fontSize: '13px'
  }
}

function CustomPieLabel({ cx, cy, midAngle, innerRadius, outerRadius, percent, name }) {
  const RADIAN = Math.PI / 180
  const radius = innerRadius + (outerRadius - innerRadius) * 0.5
  const x = cx + radius * Math.cos(-midAngle * RADIAN)
  const y = cy + radius * Math.sin(-midAngle * RADIAN)
  if (percent < 0.05) return null
  return (
    <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central" style={{ fontSize: '12px', fontWeight: 600 }}>
      {`${(percent * 100).toFixed(0)}%`}
    </text>
  )
}

export default function Stats() {
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [periode, setPeriode] = useState('tout')
  const [departement, setDepartement] = useState('')
  const [departements, setDepartements] = useState([])

  useEffect(() => {
    fetch(`${API_BASE}/api/rdv?limit=5000`)
      .then(r => r.json())
      .then(data => {
        const deps = [...new Set((data.data || []).map(r => r.departement).filter(Boolean))].sort()
        setDepartements(deps)
      })
  }, [])

  useEffect(() => {
    setLoading(true)
    const params = new URLSearchParams()
    if (periode !== 'tout') params.set('periode', periode)
    if (departement) params.set('departement', departement)

    fetch(`${API_BASE}/api/stats?${params}`)
      .then(r => r.json())
      .then(data => { setStats(data); setLoading(false) })
      .catch(() => setLoading(false))
  }, [periode, departement])

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh' }}>
      <div style={{ color: '#475569' }}>Chargement…</div>
    </div>
  )
  if (!stats) return <div style={{ color: '#EF4444' }}>Erreur de chargement</div>

  const { kpis, byTravaux = [], evolutionSemaine = [], byDepartement = [], statutRepartition = [] } = stats

  // Non-signed results for pie chart
  const refusCauses = statutRepartition.filter(
    s => s.statut_resultat && !['Devis signé', 'En attente', 'Passage admin'].includes(s.statut_resultat)
  )

  // Format week labels
  const evolutionData = evolutionSemaine.map(s => ({
    ...s,
    semaine: s.semaine ? 'S' + s.semaine.split('-W')[1] : s.semaine
  }))

  const formatEuro = (n) => n != null && n > 0
    ? new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n)
    : '—'

  const tauxColor = (taux) => {
    if (taux >= 30) return '#22C55E'
    if (taux >= 15) return '#F59E0B'
    return '#EF4444'
  }

  return (
    <div>
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '26px', fontWeight: 800, color: '#F1F5F9', letterSpacing: '-0.02em' }}>
          Statistiques
        </h1>
        <p style={{ color: '#64748B', marginTop: '4px', fontSize: '14px' }}>
          Analyse de performance commerciale
        </p>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: '12px', marginBottom: '24px', flexWrap: 'wrap' }}>
        <select value={periode} onChange={e => setPeriode(e.target.value)} style={SELECT}>
          <option value="tout">Tout le temps</option>
          <option value="semaine">Cette semaine</option>
          <option value="mois">Ce mois</option>
        </select>
        <select value={departement} onChange={e => setDepartement(e.target.value)} style={SELECT}>
          <option value="">Tous les départements</option>
          {departements.map(d => <option key={d} value={d}>Département {d}</option>)}
        </select>
      </div>

      {/* Taux par type de travaux */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '16px', marginBottom: '24px' }}>
        {byTravaux.map(t => {
          const taux = t.total > 0 ? ((t.signes / t.total) * 100).toFixed(1) : 0
          const c = tauxColor(parseFloat(taux))
          return (
            <div key={t.travaux} style={{ ...CARD }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <p style={{ color: '#64748B', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '8px' }}>
                    {t.travaux}
                  </p>
                  <p style={{ color: c, fontSize: '32px', fontWeight: 800, letterSpacing: '-0.02em', lineHeight: 1 }}>
                    {taux}%
                  </p>
                  <p style={{ color: '#64748B', fontSize: '12px', marginTop: '6px' }}>
                    {t.signes} / {t.total} RDV signés
                  </p>
                </div>
                <div style={{ textAlign: 'right' }}>
                  {t.rac_total > 0 && (
                    <p style={{ color: '#22C55E', fontSize: '13px', fontWeight: 600, marginTop: '8px' }}>
                      {formatEuro(t.rac_total)}
                    </p>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Charts row 1 */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px' }}>
        {/* Line chart — évolution hebdo */}
        <div style={CARD}>
          <h3 style={{ color: '#F1F5F9', fontSize: '15px', fontWeight: 700, marginBottom: '20px' }}>
            Évolution hebdomadaire (8 sem.)
          </h3>
          {evolutionData.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={evolutionData} margin={{ top: 0, right: 16, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="semaine" tick={{ fill: '#64748B', fontSize: 11 }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fill: '#64748B', fontSize: 11 }} tickLine={false} axisLine={false} />
                <Tooltip {...TOOLTIP_STYLE} />
                <Legend wrapperStyle={{ color: '#94A3B8', fontSize: '12px' }} />
                <Line type="monotone" dataKey="total" name="Total RDV" stroke="#3B82F6" strokeWidth={2} dot={{ fill: '#3B82F6', r: 4 }} activeDot={{ r: 6 }} />
                <Line type="monotone" dataKey="signes" name="Devis signés" stroke="#22C55E" strokeWidth={2} dot={{ fill: '#22C55E', r: 4 }} activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '250px', color: '#475569' }}>
              Aucune donnée sur les 8 dernières semaines
            </div>
          )}
        </div>

        {/* Pie chart — causes de non-signature */}
        <div style={CARD}>
          <h3 style={{ color: '#F1F5F9', fontSize: '15px', fontWeight: 700, marginBottom: '20px' }}>
            Causes de non-signature
          </h3>
          {refusCauses.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={refusCauses}
                  cx="50%"
                  cy="50%"
                  outerRadius={90}
                  dataKey="count"
                  nameKey="statut_resultat"
                  labelLine={false}
                  label={<CustomPieLabel />}
                >
                  {refusCauses.map((_, i) => (
                    <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  {...TOOLTIP_STYLE}
                  formatter={(value, name, { payload }) => [value, payload.statut_resultat]}
                />
                <Legend
                  formatter={(value, entry) => (
                    <span style={{ color: '#94A3B8', fontSize: '12px' }}>
                      {entry.payload.statut_resultat} ({entry.payload.count})
                    </span>
                  )}
                />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '250px', color: '#475569' }}>
              Aucune donnée disponible
            </div>
          )}
        </div>
      </div>

      {/* Bar chart — performance par département */}
      <div style={{ ...CARD, marginBottom: '24px' }}>
        <h3 style={{ color: '#F1F5F9', fontSize: '15px', fontWeight: 700, marginBottom: '20px' }}>
          Performance par département
        </h3>
        {byDepartement.length > 0 ? (
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={byDepartement} margin={{ top: 0, right: 16, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
              <XAxis dataKey="departement" tick={{ fill: '#64748B', fontSize: 11 }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fill: '#64748B', fontSize: 11 }} tickLine={false} axisLine={false} />
              <Tooltip {...TOOLTIP_STYLE} />
              <Legend wrapperStyle={{ color: '#94A3B8', fontSize: '12px' }} />
              <Bar dataKey="total" name="RDV total" fill="#3B82F6" radius={[4, 4, 0, 0]} />
              <Bar dataKey="signes" name="Signés" fill="#22C55E" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div style={{ textAlign: 'center', color: '#475569', padding: '48px' }}>
            Aucune donnée
          </div>
        )}
      </div>

      {/* Tableau récapitulatif */}
      <div style={CARD}>
        <h3 style={{ color: '#F1F5F9', fontSize: '15px', fontWeight: 700, marginBottom: '20px' }}>
          Récapitulatif par département
        </h3>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%' }}>
            <thead>
              <tr>
                {['Département', 'Total RDV', 'Visités', 'Signés', 'Taux', 'RAC Total'].map(h => (
                  <th key={h} style={TH}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {byDepartement.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ ...TD, textAlign: 'center', padding: '32px', color: '#475569' }}>
                    Aucune donnée
                  </td>
                </tr>
              ) : byDepartement.map((d, i) => {
                const taux = d.total > 0 ? ((d.signes / d.total) * 100).toFixed(1) : '0.0'
                const c = tauxColor(parseFloat(taux))
                return (
                  <tr key={d.departement} style={{ background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.02)' }}>
                    <td style={{ ...TD, fontWeight: 700, color: '#F1F5F9' }}>
                      <span style={{ background: '#3B82F620', color: '#3B82F6', padding: '2px 10px', borderRadius: '6px', fontSize: '12px', fontWeight: 700 }}>
                        {d.departement}
                      </span>
                    </td>
                    <td style={TD}>{d.total}</td>
                    <td style={TD}>{d.total - (d.total - (d.signes + (d.total - d.signes)))}</td>
                    <td style={{ ...TD, color: '#22C55E', fontWeight: 700 }}>{d.signes}</td>
                    <td style={TD}>
                      <span style={{ background: `${c}22`, color: c, padding: '3px 10px', borderRadius: '20px', fontSize: '12px', fontWeight: 700 }}>
                        {taux}%
                      </span>
                    </td>
                    <td style={{ ...TD, color: '#22C55E', fontWeight: 600 }}>
                      {formatEuro(d.rac_total)}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {/* Taux global */}
        {kpis && (
          <div style={{ marginTop: '20px', paddingTop: '20px', borderTop: '1px solid #334155', display: 'flex', gap: '32px', flexWrap: 'wrap' }}>
            <div>
              <span style={{ color: '#64748B', fontSize: '12px' }}>Taux global de concrétisation</span>
              <div style={{ color: tauxColor(kpis.tauxConcretisation), fontSize: '24px', fontWeight: 800, marginTop: '4px' }}>
                {kpis.tauxConcretisation}%
              </div>
            </div>
            <div>
              <span style={{ color: '#64748B', fontSize: '12px' }}>Total RDV</span>
              <div style={{ color: '#F1F5F9', fontSize: '24px', fontWeight: 800, marginTop: '4px' }}>
                {kpis.totalRdv}
              </div>
            </div>
            <div>
              <span style={{ color: '#64748B', fontSize: '12px' }}>Devis signés</span>
              <div style={{ color: '#22C55E', fontSize: '24px', fontWeight: 800, marginTop: '4px' }}>
                {kpis.totalSignes}
              </div>
            </div>
            <div>
              <span style={{ color: '#64748B', fontSize: '12px' }}>RAC total signé</span>
              <div style={{ color: '#F59E0B', fontSize: '24px', fontWeight: 800, marginTop: '4px' }}>
                {formatEuro(kpis.totalRacSigne)}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
