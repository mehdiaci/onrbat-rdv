import { useState, useEffect } from 'react'
import { TrendingUp, Calendar, CalendarDays, Clock } from 'lucide-react'
import { API_BASE } from '../config'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell
} from 'recharts'

// ─── Couleurs CTI ───
const C = {
  primary:   '#00B4D8',
  secondary: '#0077B6',
  accent:    '#39FF14',
  card:      '#112240',
  border:    '#1E3A5F',
  bg:        '#0A1628',
}

// Statuts pertinents pour le pie chart
const STATUTS_GARDES = ['Devis signé', 'Hors cible', 'NRP', 'En attente', 'Récupération docs', 'Refus', 'Refus client', 'Refus de passage', 'Tutelle', 'Déjà équipé', 'Absent']

const STATUT_COLORS_PIE = {
  'Devis signé':      '#00B4D8',
  'Hors cible':       '#F59E0B',
  'NRP':              '#6B7280',
  'En attente':       '#3B82F6',
  'Récupération docs':'#8B5CF6',
  'Refus':            '#EF4444',
  'Refus client':     '#EF4444',
  'Refus de passage': '#F97316',
  'Tutelle':          '#DC2626',
  'Déjà équipé':     '#B91C1C',
  'Absent':           '#475569',
}

const PIE_COLORS = ['#EF4444', '#F59E0B', '#6B7280', '#8B5CF6', '#3B82F6', '#06B6D4', '#DC2626', '#475569']

const CARD = { background: C.card, borderRadius: '12px', padding: '24px', border: `1px solid ${C.border}` }

const TH = {
  padding: '10px 14px', textAlign: 'left', color: '#64748B',
  fontSize: '11px', fontWeight: 700, textTransform: 'uppercase',
  letterSpacing: '0.07em', borderBottom: `1px solid ${C.border}`, whiteSpace: 'nowrap'
}
const TD = { padding: '11px 14px', color: '#CBD5E1', fontSize: '13px', borderBottom: `1px solid ${C.border}` }

const SELECT = {
  background: C.card, border: `1px solid ${C.border}`,
  borderRadius: '8px', padding: '8px 14px',
  color: '#E2E8F0', fontSize: '13px', cursor: 'pointer', outline: 'none'
}

const TOOLTIP_STYLE = {
  contentStyle: {
    background: C.card, border: `1px solid ${C.border}`,
    borderRadius: '8px', color: '#F1F5F9', fontSize: '13px'
  }
}

function CustomPieLabel({ cx, cy, midAngle, innerRadius, outerRadius, percent }) {
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

// Carte KPI de taux
function TauxCard({ label, taux, signes, denominateur, icon: Icon, color }) {
  const isNull = taux === null
  const tauxColor = isNull ? '#475569'
    : taux >= 30 ? C.primary
    : taux >= 15 ? '#F59E0B'
    : '#EF4444'
  return (
    <div style={{
      ...CARD,
      display: 'flex', flexDirection: 'column', gap: '6px',
      borderTop: `3px solid ${isNull ? C.border : tauxColor}`,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
        <div style={{ background: `${color}20`, borderRadius: '8px', padding: '6px', color }}>
          <Icon size={16} />
        </div>
        <span style={{ color: '#64748B', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          {label}
        </span>
      </div>
      <div style={{ color: tauxColor, fontSize: '36px', fontWeight: 900, lineHeight: 1, letterSpacing: '-0.03em' }}>
        {isNull ? '—' : `${taux}%`}
      </div>
      <div style={{ color: '#475569', fontSize: '12px' }}>
        {isNull
          ? 'Aucun RDV visité'
          : `${signes} signé${signes > 1 ? 's' : ''} / ${denominateur} visité${denominateur > 1 ? 's' : ''}`}
      </div>
    </div>
  )
}

const formatEuro = (n) => n != null && n > 0
  ? new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n)
  : '—'

const tauxColor = (t) => t >= 30 ? C.primary : t >= 15 ? '#F59E0B' : '#EF4444'

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

  const {
    kpis, byTravaux = [], evolutionSemaine = [],
    byDepartement = [], statutRepartition = [], byHeure = []
  } = stats

  // Filtrer statutRepartition pour le pie chart
  const refusCauses = statutRepartition.filter(
    s => s.statut_resultat && STATUTS_GARDES.includes(s.statut_resultat)
      && !['Devis signé', 'En attente'].includes(s.statut_resultat)
  )

  // Format semaine labels
  const evolutionData = evolutionSemaine.map(s => ({
    ...s,
    semaine: s.semaine ? 'S' + s.semaine.split('-W')[1] : s.semaine,
  }))

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '26px', fontWeight: 800, color: '#F1F5F9', letterSpacing: '-0.02em' }}>
          Statistiques
        </h1>
        <p style={{ color: '#64748B', marginTop: '4px', fontSize: '14px' }}>
          Analyse de performance commerciale — Capital Talent Invest
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

      {/* ── KPIs taux par période ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '24px' }}>
        <TauxCard
          label="Taux du jour"
          taux={kpis.tauxJour}
          signes={kpis.signesJour}
          denominateur={kpis.rdvJourDenominateur}
          icon={Clock}
          color={C.primary}
        />
        <TauxCard
          label="Taux semaine en cours"
          taux={kpis.tauxSemaineCourante}
          signes={kpis.signesSemaine}
          denominateur={kpis.rdvSemaineDenominateur}
          icon={CalendarDays}
          color={C.secondary}
        />
        <TauxCard
          label="Taux du mois en cours"
          taux={kpis.tauxMoisCourant}
          signes={kpis.signesMois}
          denominateur={kpis.rdvMoisDenominateur}
          icon={Calendar}
          color="#8B5CF6"
        />
      </div>

      {/* ── Taux par type de travaux (nettoyé) ── */}
      {byTravaux.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '16px', marginBottom: '24px' }}>
          {byTravaux.map(t => {
            // Dénominateur = RDV visités : Devis signé + Refus
            const isAdmin = t.travaux === 'Passage Admin'
            const taux = (t.visitees || 0) > 0 ? ((t.signes / t.visitees) * 100).toFixed(1) : 0
            const c = isAdmin ? '#6B7280' : tauxColor(parseFloat(taux))
            return (
              <div key={t.travaux} style={CARD}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <p style={{ color: '#64748B', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '8px' }}>
                      {t.travaux}
                    </p>
                    <p style={{ color: c, fontSize: '32px', fontWeight: 800, letterSpacing: '-0.02em', lineHeight: 1 }}>
                      {taux}%
                    </p>
                    <p style={{ color: '#64748B', fontSize: '12px', marginTop: '6px' }}>
                      {t.signes} signé{t.signes > 1 ? 's' : ''} / {t.visitees || 0} visité{(t.visitees || 0) > 1 ? 's' : ''}
                    </p>
                    {isAdmin && (
                      <p style={{ color: '#475569', fontSize: '11px', marginTop: '4px', fontStyle: 'italic' }}>
                        Hors taux commercial
                      </p>
                    )}
                  </div>
                  {t.rac_total > 0 && (
                    <div style={{ textAlign: 'right' }}>
                      <p style={{ color: C.primary, fontSize: '13px', fontWeight: 600, marginTop: '8px' }}>
                        {formatEuro(t.rac_total)}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* ── Charts row 1 : Évolution taux + Causes non-signature ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px' }}>

        {/* Line chart — évolution taux hebdo */}
        <div style={CARD}>
          <h3 style={{ color: '#F1F5F9', fontSize: '15px', fontWeight: 700, marginBottom: '4px' }}>
            Évolution du taux — 8 semaines
          </h3>
          <p style={{ color: '#475569', fontSize: '12px', marginBottom: '20px' }}>
            Taux de concrétisation (%) et volume de RDV signés par semaine
          </p>
          {evolutionData.length > 0 ? (
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={evolutionData} margin={{ top: 0, right: 16, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={C.border} />
                <XAxis dataKey="semaine" tick={{ fill: '#64748B', fontSize: 11 }} tickLine={false} axisLine={false} />
                <YAxis yAxisId="left" tick={{ fill: '#64748B', fontSize: 11 }} tickLine={false} axisLine={false} />
                <YAxis yAxisId="right" orientation="right" tick={{ fill: '#64748B', fontSize: 11 }} tickLine={false} axisLine={false} unit="%" domain={[0, 100]} />
                <Tooltip {...TOOLTIP_STYLE} />
                <Legend wrapperStyle={{ color: '#94A3B8', fontSize: '12px' }} />
                <Line yAxisId="left" type="monotone" dataKey="signes" name="Devis signés" stroke={C.primary} strokeWidth={2} dot={{ fill: C.primary, r: 4 }} activeDot={{ r: 6 }} />
                <Line yAxisId="right" type="monotone" dataKey="taux" name="Taux (%)" stroke={C.accent} strokeWidth={2} dot={{ fill: C.accent, r: 4 }} activeDot={{ r: 6 }} strokeDasharray="4 2" />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '260px', color: '#475569' }}>
              Aucune donnée sur les 8 dernières semaines
            </div>
          )}
        </div>

        {/* Pie chart — causes de non-signature */}
        <div style={CARD}>
          <h3 style={{ color: '#F1F5F9', fontSize: '15px', fontWeight: 700, marginBottom: '4px' }}>
            Causes de non-signature
          </h3>
          <p style={{ color: '#475569', fontSize: '12px', marginBottom: '20px' }}>
            Répartition des résultats (hors "Devis signé" et "En attente")
          </p>
          {refusCauses.length > 0 ? (
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie
                  data={refusCauses} cx="50%" cy="50%" outerRadius={90}
                  dataKey="count" nameKey="statut_resultat"
                  labelLine={false} label={<CustomPieLabel />}
                >
                  {refusCauses.map((entry, i) => (
                    <Cell key={i} fill={STATUT_COLORS_PIE[entry.statut_resultat] || PIE_COLORS[i % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip {...TOOLTIP_STYLE} formatter={(value, name, { payload }) => [value, payload.statut_resultat]} />
                <Legend formatter={(value, entry) => (
                  <span style={{ color: '#94A3B8', fontSize: '12px' }}>
                    {entry.payload.statut_resultat} ({entry.payload.count})
                  </span>
                )} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '260px', color: '#475569' }}>
              Aucune donnée disponible
            </div>
          )}
        </div>
      </div>

      {/* ── Nouveau graphique : Performance par tranche horaire ── */}
      <div style={{ ...CARD, marginBottom: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '20px', flexWrap: 'wrap', gap: '8px' }}>
          <div>
            <h3 style={{ color: '#F1F5F9', fontSize: '15px', fontWeight: 700, marginBottom: '4px' }}>
              Signatures par tranche horaire
            </h3>
            <p style={{ color: '#475569', fontSize: '12px' }}>
              Nombre de devis signés selon l'heure du RDV — identifiez les créneaux les plus performants
            </p>
          </div>
          <div style={{ background: `${C.accent}15`, border: `1px solid ${C.accent}40`, borderRadius: '8px', padding: '6px 12px' }}>
            <span style={{ color: C.accent, fontSize: '12px', fontWeight: 600 }}>
              {byHeure.reduce((s, h) => s + h.signes, 0)} signatures total
            </span>
          </div>
        </div>
        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={byHeure} margin={{ top: 0, right: 16, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={C.border} vertical={false} />
            <XAxis dataKey="heure" tick={{ fill: '#64748B', fontSize: 12 }} tickLine={false} axisLine={false} />
            <YAxis tick={{ fill: '#64748B', fontSize: 11 }} tickLine={false} axisLine={false} allowDecimals={false} />
            <Tooltip
              {...TOOLTIP_STYLE}
              formatter={(value) => [value, 'Devis signés']}
            />
            <Bar dataKey="signes" name="Devis signés" radius={[6, 6, 0, 0]}>
              {byHeure.map((entry, i) => {
                const maxSignes = Math.max(...byHeure.map(h => h.signes), 1)
                const intensity = entry.signes / maxSignes
                const alpha = Math.round(80 + intensity * 175).toString(16).padStart(2, '0')
                return <Cell key={i} fill={entry.signes === 0 ? C.border : `${C.primary}${alpha}`} />
              })}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* ── Bar chart performance par département ── */}
      <div style={{ ...CARD, marginBottom: '24px' }}>
        <h3 style={{ color: '#F1F5F9', fontSize: '15px', fontWeight: 700, marginBottom: '20px' }}>
          Performance par département
        </h3>
        {byDepartement.length > 0 ? (
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={byDepartement} margin={{ top: 0, right: 16, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={C.border} vertical={false} />
              <XAxis dataKey="departement" tick={{ fill: '#64748B', fontSize: 11 }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fill: '#64748B', fontSize: 11 }} tickLine={false} axisLine={false} />
              <Tooltip {...TOOLTIP_STYLE} />
              <Legend wrapperStyle={{ color: '#94A3B8', fontSize: '12px' }} />
              <Bar dataKey="total" name="RDV total" fill={C.secondary} radius={[4, 4, 0, 0]} />
              <Bar dataKey="signes" name="Signés" fill={C.primary} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div style={{ textAlign: 'center', color: '#475569', padding: '48px' }}>Aucune donnée</div>
        )}
      </div>

      {/* ── Tableau récapitulatif par département ── */}
      <div style={CARD}>
        <h3 style={{ color: '#F1F5F9', fontSize: '15px', fontWeight: 700, marginBottom: '20px' }}>
          Récapitulatif par département
        </h3>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%' }}>
            <thead>
              <tr>
                {['Département', 'Total RDV', 'Signés', 'Taux', 'RAC Total'].map(h => (
                  <th key={h} style={TH}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {byDepartement.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ ...TD, textAlign: 'center', padding: '32px', color: '#475569' }}>
                    Aucune donnée
                  </td>
                </tr>
              ) : byDepartement.map((d, i) => {
                const taux = (d.visitees || 0) > 0 ? ((d.signes / d.visitees) * 100).toFixed(1) : '0.0'
                const c = tauxColor(parseFloat(taux))
                return (
                  <tr key={d.departement} style={{ background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.02)' }}>
                    <td style={{ ...TD, fontWeight: 700, color: '#F1F5F9' }}>
                      <span style={{ background: `${C.primary}20`, color: C.primary, padding: '2px 10px', borderRadius: '6px', fontSize: '12px', fontWeight: 700 }}>
                        {d.departement}
                      </span>
                    </td>
                    <td style={TD}>{d.total}</td>
                    <td style={{ ...TD, color: C.primary, fontWeight: 700 }}>{d.signes}</td>
                    <td style={TD}>
                      <span style={{ background: `${c}22`, color: c, padding: '3px 10px', borderRadius: '20px', fontSize: '12px', fontWeight: 700 }}>
                        {taux}%
                      </span>
                    </td>
                    <td style={{ ...TD, color: C.primary, fontWeight: 600 }}>{formatEuro(d.rac_total)}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {/* Métriques globales */}
        {kpis && (
          <div style={{ marginTop: '20px', paddingTop: '20px', borderTop: `1px solid ${C.border}`, display: 'flex', gap: '32px', flexWrap: 'wrap' }}>
            <div>
              <span style={{ color: '#64748B', fontSize: '12px' }}>Taux global de concrétisation</span>
              <div style={{ color: tauxColor(kpis.tauxConcretisation), fontSize: '24px', fontWeight: 800, marginTop: '4px' }}>
                {kpis.tauxConcretisation}%
              </div>
              <div style={{ color: '#475569', fontSize: '11px' }}>sur {kpis.totalVisites} RDV visités (Devis signé + Refus)</div>
            </div>
            <div>
              <span style={{ color: '#64748B', fontSize: '12px' }}>Total RDV</span>
              <div style={{ color: '#F1F5F9', fontSize: '24px', fontWeight: 800, marginTop: '4px' }}>{kpis.totalRdv}</div>
            </div>
            <div>
              <span style={{ color: '#64748B', fontSize: '12px' }}>Devis signés</span>
              <div style={{ color: C.primary, fontSize: '24px', fontWeight: 800, marginTop: '4px' }}>{kpis.totalSignes}</div>
            </div>
            <div>
              <span style={{ color: '#64748B', fontSize: '12px' }}>RAC total signé</span>
              <div style={{ color: '#F59E0B', fontSize: '24px', fontWeight: 800, marginTop: '4px' }}>{formatEuro(kpis.totalRacSigne)}</div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
