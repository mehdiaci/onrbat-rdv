import { useState, useEffect, useCallback } from 'react'
import { Plus, Download, Pencil, Trash2, ChevronLeft, ChevronRight, FileJson2 } from 'lucide-react'
import * as XLSX from 'xlsx'
import { API_BASE } from '../config'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell
} from 'recharts'

// ── Constantes ────────────────────────────────────────────────────────────
const PAGE_SIZE = 20

const TYPE_OPTIONS = ['Gazole', 'Péage', 'Entretien', 'Pneus', 'Réparation', 'Fournitures', 'Hôtel', 'Autre']

const TYPE_COLORS = {
  'Gazole':      '#F59E0B',
  'Péage':       '#3B82F6',
  'Entretien':   '#8B5CF6',
  'Pneus':       '#6B7280',
  'Réparation':  '#EF4444',
  'Fournitures': '#06B6D4',
  'Hôtel':       '#EC4899',
  'Autre':       '#9CA3AF',
}

// Adresses de départ selon période
const ADRESSES_DEPART = [
  { debut: '2026-01-15', fin: '2026-01-31', adresse: '45 Avenue de la Commune de Paris, 95500 Gonesse' },
  { debut: '2026-02-01', fin: null,          adresse: '29 Allée des Lilas, 93390 Clichy-sous-Bois' },
]

const C = { primary: '#00B4D8', card: '#112240', border: '#1E3A5F', bg: '#0A1628' }

const TOOLTIP_STYLE = {
  contentStyle: {
    backgroundColor: '#1E3A5F', border: '1px solid #00B4D8',
    borderRadius: '8px', color: '#FFFFFF',
    fontSize: '14px', padding: '10px 14px',
    boxShadow: '0 4px 12px rgba(0,0,0,0.4)'
  },
  labelStyle: { color: '#00B4D8', fontWeight: 'bold' },
  itemStyle:  { color: '#FFFFFF' }
}

const CARD = { background: C.card, borderRadius: '12px', padding: '20px', border: `1px solid ${C.border}` }

const INPUT_STYLE = {
  width: '100%', padding: '8px 12px', background: '#0D1B2A',
  border: '1px solid #1E3A5F', borderRadius: '6px',
  color: '#F1F5F9', fontSize: '13px', boxSizing: 'border-box'
}

const TH = {
  padding: '10px 14px', textAlign: 'left', color: '#64748B',
  fontSize: '11px', fontWeight: 700, textTransform: 'uppercase',
  letterSpacing: '0.07em', borderBottom: '1px solid #1E3A5F', whiteSpace: 'nowrap'
}
const TD = {
  padding: '12px 14px', color: '#94A3B8', fontSize: '13px',
  borderBottom: '1px solid rgba(30,58,95,0.5)'
}

// ── Helpers ───────────────────────────────────────────────────────────────
function formatEuro(n) {
  if (n == null || n === '') return '—'
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency', currency: 'EUR',
    minimumFractionDigits: 0, maximumFractionDigits: 2
  }).format(n)
}

function fmtDate(d) {
  if (!d) return '—'
  const parts = d.split('-')
  if (parts.length !== 3) return d
  return `${parts[2]}/${parts[1]}/${parts[0]}`
}

function fmtMois(m) {
  if (!m) return ''
  const [y, mo] = m.split('-')
  const noms = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc']
  return `${noms[parseInt(mo) - 1]} ${y.slice(2)}`
}

// Pivote [{semaine/mois, type, montant}] → [{label, Gazole:x, Péage:y, ...}]
function pivotData(rows, keyField) {
  const map = {}
  rows.forEach(r => {
    if (!map[r[keyField]]) map[r[keyField]] = { [keyField]: r[keyField] }
    map[r[keyField]][r.type] = (map[r[keyField]][r.type] || 0) + r.montant
  })
  return Object.values(map)
}

function LabelStyle({ children }) {
  return <span style={{ color: '#64748B', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', display: 'block', marginBottom: '6px' }}>{children}</span>
}

// ── Badge type ────────────────────────────────────────────────────────────
function Badge({ type }) {
  const color = TYPE_COLORS[type] || '#9CA3AF'
  return (
    <span style={{
      background: color + '22', color,
      padding: '3px 10px', borderRadius: '20px',
      fontSize: '12px', fontWeight: 600, whiteSpace: 'nowrap'
    }}>{type}</span>
  )
}

// ── Modal Charge ──────────────────────────────────────────────────────────
function ChargeModal({ charge, onClose, onSaved }) {
  const today = new Date().toISOString().split('T')[0]
  const [form, setForm] = useState(charge ? {
    date: charge.date || today, type: charge.type || 'Gazole',
    fournisseur: charge.fournisseur || '', ville: charge.ville || '',
    montant: charge.montant || '', litres: charge.litres || '',
    prix_litre: charge.prix_litre || '', kilometrage: charge.kilometrage || '',
    notes: charge.notes || ''
  } : { date: today, type: 'Gazole', fournisseur: '', ville: '', montant: '', litres: '', prix_litre: '', kilometrage: '', notes: '' })
  const [saving, setSaving] = useState(false)

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  // Auto-calcul prix/L
  useEffect(() => {
    if (form.type === 'Gazole' && form.montant && form.litres && parseFloat(form.litres) > 0) {
      set('prix_litre', (parseFloat(form.montant) / parseFloat(form.litres)).toFixed(3))
    }
  }, [form.montant, form.litres])

  const submit = async (e) => {
    e.preventDefault(); setSaving(true)
    try {
      const body = {
        date: form.date, type: form.type,
        fournisseur: form.fournisseur || null, ville: form.ville || null,
        montant: parseFloat(form.montant),
        litres:      form.litres      ? parseFloat(form.litres)      : null,
        prix_litre:  form.prix_litre  ? parseFloat(form.prix_litre)  : null,
        kilometrage: form.kilometrage ? parseFloat(form.kilometrage) : null,
        notes: form.notes || null
      }
      const url    = charge ? `${API_BASE}/api/charges/${charge.id}` : `${API_BASE}/api/charges`
      const method = charge ? 'PUT' : 'POST'
      const r = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      if (!r.ok) throw new Error((await r.json()).error)
      onSaved()
    } catch (err) { alert('Erreur : ' + err.message) }
    finally { setSaving(false) }
  }

  const showLitres = form.type === 'Gazole'
  const showKm     = form.type === 'Péage'

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }}>
      <div style={{ background: '#0F2035', borderRadius: '16px', border: '1px solid #1E3A5F', padding: '28px', width: '100%', maxWidth: '520px', maxHeight: '90vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h2 style={{ color: '#F1F5F9', fontSize: '18px', fontWeight: 700 }}>{charge ? 'Modifier la charge' : 'Nouvelle charge'}</h2>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: '#64748B', cursor: 'pointer', fontSize: '20px', lineHeight: 1 }}>✕</button>
        </div>
        <form onSubmit={submit}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '14px' }}>
            <div><LabelStyle>Date</LabelStyle>
              <input type="date" value={form.date} onChange={e => set('date', e.target.value)} required style={INPUT_STYLE} />
            </div>
            <div><LabelStyle>Type</LabelStyle>
              <select value={form.type} onChange={e => set('type', e.target.value)} style={INPUT_STYLE}>
                {TYPE_OPTIONS.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '14px' }}>
            <div><LabelStyle>Fournisseur</LabelStyle>
              <input type="text" value={form.fournisseur} onChange={e => set('fournisseur', e.target.value)} placeholder="Total, Intermarché…" style={INPUT_STYLE} />
            </div>
            <div><LabelStyle>Ville</LabelStyle>
              <input type="text" value={form.ville} onChange={e => set('ville', e.target.value)} placeholder="Paris, Lyon…" style={INPUT_STYLE} />
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: showLitres ? '1fr 1fr 1fr' : showKm ? '1fr 1fr' : '1fr', gap: '14px', marginBottom: '14px' }}>
            <div><LabelStyle>Montant (€)</LabelStyle>
              <input type="number" value={form.montant} onChange={e => set('montant', e.target.value)} placeholder="0.00" min="0" step="0.01" required style={INPUT_STYLE} />
            </div>
            {showLitres && <>
              <div><LabelStyle>Litres</LabelStyle>
                <input type="number" value={form.litres} onChange={e => set('litres', e.target.value)} placeholder="50.00" min="0" step="0.01" style={INPUT_STYLE} />
              </div>
              <div><LabelStyle>Prix/L (€) — auto</LabelStyle>
                <input type="number" value={form.prix_litre} readOnly placeholder="—" style={{ ...INPUT_STYLE, opacity: 0.7 }} />
              </div>
            </>}
            {showKm && <div><LabelStyle>Km (trajet)</LabelStyle>
              <input type="number" value={form.kilometrage} onChange={e => set('kilometrage', e.target.value)} placeholder="150" min="0" step="0.1" style={INPUT_STYLE} />
            </div>}
          </div>
          <div style={{ marginBottom: '20px' }}>
            <LabelStyle>Notes</LabelStyle>
            <textarea value={form.notes} onChange={e => set('notes', e.target.value)} rows={2} placeholder="Observations…" style={{ ...INPUT_STYLE, resize: 'vertical' }} />
          </div>
          <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
            <button type="button" onClick={onClose} style={{ padding: '9px 18px', borderRadius: '8px', border: '1px solid #334155', background: 'transparent', color: '#94A3B8', fontSize: '14px', cursor: 'pointer' }}>Annuler</button>
            <button type="submit" disabled={saving} style={{ padding: '9px 22px', borderRadius: '8px', border: 'none', background: '#00B4D8', color: '#fff', fontSize: '14px', fontWeight: 600, cursor: 'pointer', opacity: saving ? 0.7 : 1 }}>
              {saving ? 'Enregistrement…' : (charge ? 'Enregistrer' : 'Créer')}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Modal Import JSON ─────────────────────────────────────────────────────
function ImportModal({ onClose, onImported }) {
  const [text, setText] = useState('')
  const [loading, setLoading] = useState(false)

  const submit = async () => {
    setLoading(true)
    try {
      const data = JSON.parse(text)
      const r = await fetch(`${API_BASE}/api/charges/import`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data)
      })
      const j = await r.json()
      if (!r.ok) throw new Error(j.error)
      alert(`${j.count} charge(s) importée(s)`)
      onImported()
    } catch (err) { alert('Erreur : ' + err.message) }
    finally { setLoading(false) }
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }}>
      <div style={{ background: '#0F2035', borderRadius: '16px', border: '1px solid #1E3A5F', padding: '28px', width: '100%', maxWidth: '560px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h2 style={{ color: '#F1F5F9', fontSize: '18px', fontWeight: 700 }}>Importer JSON</h2>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: '#64748B', cursor: 'pointer', fontSize: '20px' }}>✕</button>
        </div>
        <p style={{ color: '#64748B', fontSize: '13px', marginBottom: '12px' }}>
          Tableau JSON : <code style={{ color: '#00B4D8' }}>[{"{"}"date","type","montant",...{"}"}]</code>
        </p>
        <textarea value={text} onChange={e => setText(e.target.value)} rows={10}
          placeholder='[{"date":"2026-03-01","type":"Gazole","montant":85.50,"litres":46.2,"fournisseur":"Total"}]'
          style={{ ...INPUT_STYLE, resize: 'vertical', fontFamily: 'monospace', fontSize: '12px' }} />
        <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '14px' }}>
          <button onClick={onClose} style={{ padding: '9px 18px', borderRadius: '8px', border: '1px solid #334155', background: 'transparent', color: '#94A3B8', fontSize: '14px', cursor: 'pointer' }}>Annuler</button>
          <button onClick={submit} disabled={loading || !text.trim()} style={{ padding: '9px 22px', borderRadius: '8px', border: 'none', background: '#00B4D8', color: '#fff', fontSize: '14px', fontWeight: 600, cursor: 'pointer', opacity: (!text.trim() || loading) ? 0.5 : 1 }}>
            {loading ? 'Import…' : 'Importer'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── KPI Card ──────────────────────────────────────────────────────────────
function KpiCard({ label, value, sub, color }) {
  return (
    <div style={CARD}>
      <p style={{ color: '#64748B', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '8px' }}>{label}</p>
      <p style={{ color: color || C.primary, fontSize: '22px', fontWeight: 800, lineHeight: 1 }}>{value}</p>
      {sub && <p style={{ color: '#475569', fontSize: '11px', marginTop: '6px' }}>{sub}</p>}
    </div>
  )
}

// ── ONGLET STATS ──────────────────────────────────────────────────────────
function ChargesStats({ stats, periode, onPeriode, dateFrom, dateTo, onDateFrom, onDateTo }) {
  if (!stats) return <div style={{ color: '#64748B', textAlign: 'center', padding: '60px' }}>Chargement…</div>

  const parSemaine = pivotData(stats.par_semaine || [], 'semaine')
  const parMois    = pivotData(stats.par_mois || [], 'mois')

  const pieData = (stats.par_type || []).map(t => ({ name: t.type, value: parseFloat(t.montant.toFixed(2)) }))

  const PERIODES = [
    { id: 'semaine', label: 'Cette semaine' },
    { id: 'mois',    label: 'Ce mois' },
    { id: 'trimestre', label: 'Ce trimestre' },
    { id: 'custom',  label: 'Personnalisé' },
  ]

  return (
    <div>
      {/* Filtre période */}
      <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap' }}>
        {PERIODES.map(p => (
          <button key={p.id} onClick={() => onPeriode(p.id)} style={{
            padding: '8px 16px', borderRadius: '8px', border: `1px solid ${periode === p.id ? C.primary : '#1E3A5F'}`,
            background: periode === p.id ? 'rgba(0,180,216,0.12)' : 'transparent',
            color: periode === p.id ? C.primary : '#64748B',
            fontSize: '13px', fontWeight: periode === p.id ? 600 : 400, cursor: 'pointer'
          }}>{p.label}</button>
        ))}
        {periode === 'custom' && <>
          <input type="date" value={dateFrom} onChange={e => onDateFrom(e.target.value)} style={{ ...INPUT_STYLE, width: '150px' }} />
          <span style={{ color: '#64748B', fontSize: '12px' }}>au</span>
          <input type="date" value={dateTo} onChange={e => onDateTo(e.target.value)} style={{ ...INPUT_STYLE, width: '150px' }} />
        </>}
      </div>

      {/* 8 KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '14px', marginBottom: '24px' }}>
        <KpiCard label="Total charges" value={formatEuro(stats.total_periode)} sub={`${stats.count_periode} entrées`} />
        <KpiCard label="Gazole" value={formatEuro((stats.par_type || []).find(t => t.type === 'Gazole')?.montant || 0)}
          sub={`${(stats.total_litres_gazole || 0).toFixed(1)} L — moy. ${stats.prix_moyen_litre > 0 ? stats.prix_moyen_litre.toFixed(3) + ' €/L' : '—'}`}
          color={TYPE_COLORS['Gazole']} />
        <KpiCard label="Péages" value={formatEuro(stats.total_peages_eur)}
          sub={`${(stats.total_km_peages || 0).toFixed(0)} km total`} color={TYPE_COLORS['Péage']} />
        <KpiCard label="Entretien & réparations" value={formatEuro(stats.total_entretien_eur)} color={TYPE_COLORS['Entretien']} />
        <KpiCard label="Coût / jour travaillé" value={stats.cout_moyen_par_jour > 0 ? formatEuro(stats.cout_moyen_par_jour) : '—'} sub={`${stats.distinct_days || 0} jours`} />
        <KpiCard label="Coût moyen / semaine" value={stats.cout_moyen_semaine > 0 ? formatEuro(stats.cout_moyen_semaine) : '—'} />
        <KpiCard label="Coût moyen / mois" value={stats.cout_moyen_mois > 0 ? formatEuro(stats.cout_moyen_mois) : '—'} />
        <KpiCard label="Coût / km" value={stats.cout_par_km > 0 ? stats.cout_par_km.toFixed(2) + ' €/km' : '—'} sub={`km moyen/j : ${(stats.km_moyen_jour || 0).toFixed(0)}`} />
      </div>

      {/* Graphiques row 1 */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
        {/* Bar chart empilé par semaine */}
        <div style={CARD}>
          <h3 style={{ color: '#F1F5F9', fontSize: '15px', fontWeight: 700, marginBottom: '4px' }}>Charges par semaine</h3>
          <p style={{ color: '#64748B', fontSize: '12px', marginBottom: '16px' }}>Montant € par type</p>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={parSemaine} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1E3A5F" />
              <XAxis dataKey="semaine" tick={{ fill: '#64748B', fontSize: 11 }} tickFormatter={s => s.split('-S')[1] ? 'S' + s.split('-S')[1] : s} />
              <YAxis tick={{ fill: '#64748B', fontSize: 11 }} />
              <Tooltip {...TOOLTIP_STYLE} formatter={(v) => formatEuro(v)} />
              <Legend wrapperStyle={{ color: '#94A3B8', fontSize: '12px' }} />
              {TYPE_OPTIONS.map(t => (
                <Bar key={t} dataKey={t} stackId="a" fill={TYPE_COLORS[t]} />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Line chart prix gazole */}
        <div style={CARD}>
          <h3 style={{ color: '#F1F5F9', fontSize: '15px', fontWeight: 700, marginBottom: '4px' }}>Évolution prix gazole</h3>
          <p style={{ color: '#64748B', fontSize: '12px', marginBottom: '16px' }}>Prix au litre (€/L) dans le temps</p>
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={stats.prix_gazole_evolution || []} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1E3A5F" />
              <XAxis dataKey="date" tick={{ fill: '#64748B', fontSize: 11 }} tickFormatter={fmtDate} />
              <YAxis domain={['auto', 'auto']} tick={{ fill: '#64748B', fontSize: 11 }} />
              <Tooltip {...TOOLTIP_STYLE} labelFormatter={fmtDate} formatter={(v) => [`${v} €/L`, 'Prix gazole']} />
              <Line type="monotone" dataKey="prix_litre" stroke={TYPE_COLORS['Gazole']} strokeWidth={2} dot={{ r: 3, fill: TYPE_COLORS['Gazole'] }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Graphiques row 2 */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px', marginBottom: '16px' }}>
        {/* Pie chart répartition */}
        <div style={CARD}>
          <h3 style={{ color: '#F1F5F9', fontSize: '15px', fontWeight: 700, marginBottom: '16px' }}>Répartition des charges</h3>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={pieData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
                {pieData.map((entry, i) => <Cell key={i} fill={TYPE_COLORS[entry.name] || '#9CA3AF'} />)}
              </Pie>
              <Tooltip {...TOOLTIP_STYLE} formatter={(v) => formatEuro(v)} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Bar chart par mois */}
        <div style={{ ...CARD, gridColumn: 'span 2' }}>
          <h3 style={{ color: '#F1F5F9', fontSize: '15px', fontWeight: 700, marginBottom: '4px' }}>Charges par mois</h3>
          <p style={{ color: '#64748B', fontSize: '12px', marginBottom: '16px' }}>Comparaison mensuelle par type</p>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={parMois} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1E3A5F" />
              <XAxis dataKey="mois" tick={{ fill: '#64748B', fontSize: 11 }} tickFormatter={fmtMois} />
              <YAxis tick={{ fill: '#64748B', fontSize: 11 }} />
              <Tooltip {...TOOLTIP_STYLE} labelFormatter={fmtMois} formatter={(v) => formatEuro(v)} />
              <Legend wrapperStyle={{ color: '#94A3B8', fontSize: '12px' }} />
              {TYPE_OPTIONS.map(t => <Bar key={t} dataKey={t} stackId="a" fill={TYPE_COLORS[t]} />)}
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Bar chart km par semaine */}
      <div style={{ ...CARD, marginBottom: '16px' }}>
        <h3 style={{ color: '#F1F5F9', fontSize: '15px', fontWeight: 700, marginBottom: '4px' }}>Kilomètres péages par semaine</h3>
        <p style={{ color: '#64748B', fontSize: '12px', marginBottom: '16px' }}>
          Total : {(stats.total_km_peages || 0).toFixed(0)} km — moy./sem. : {(stats.km_moyen_semaine || 0).toFixed(0)} km — moy./mois : {(stats.km_moyen_mois || 0).toFixed(0)} km
        </p>
        <ResponsiveContainer width="100%" height={180}>
          <BarChart data={stats.km_par_semaine || []} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1E3A5F" />
            <XAxis dataKey="semaine" tick={{ fill: '#64748B', fontSize: 11 }} tickFormatter={s => 'S' + (s.split('-S')[1] || s)} />
            <YAxis tick={{ fill: '#64748B', fontSize: 11 }} unit=" km" />
            <Tooltip {...TOOLTIP_STYLE} formatter={(v) => [`${v} km`, 'Distance']} />
            <Bar dataKey="km" fill={TYPE_COLORS['Péage']} radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Tableau mensuel récapitulatif */}
      <div style={{ ...CARD, padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid #1E3A5F' }}>
          <h3 style={{ color: '#F1F5F9', fontSize: '15px', fontWeight: 700 }}>Récapitulatif mensuel</h3>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: 'rgba(0,0,0,0.2)' }}>
                {['Mois', 'Jours', 'Km péages', 'Gazole', 'Péages', 'Entretien', 'Autres', 'Total', 'Coût/jour'].map(h => (
                  <th key={h} style={TH}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(stats.monthly_table || []).length === 0 ? (
                <tr><td colSpan={9} style={{ ...TD, textAlign: 'center', padding: '32px', color: '#475569' }}>Aucune donnée</td></tr>
              ) : (stats.monthly_table || []).map((row, i) => (
                <tr key={row.mois} style={{ background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.015)' }}>
                  <td style={{ ...TD, fontWeight: 600, color: '#F1F5F9' }}>{fmtMois(row.mois)}</td>
                  <td style={TD}>{row.jours_travailles}</td>
                  <td style={TD}>{row.km_peages.toFixed(0)} km</td>
                  <td style={{ ...TD, color: TYPE_COLORS['Gazole'] }}>{formatEuro(row.gazole_eur)}</td>
                  <td style={{ ...TD, color: TYPE_COLORS['Péage'] }}>{formatEuro(row.peages_eur)}</td>
                  <td style={{ ...TD, color: TYPE_COLORS['Entretien'] }}>{formatEuro(row.entretien_eur)}</td>
                  <td style={TD}>{formatEuro(row.autres_eur)}</td>
                  <td style={{ ...TD, fontWeight: 700, color: '#F1F5F9' }}>{formatEuro(row.total_eur)}</td>
                  <td style={{ ...TD, color: '#64748B' }}>
                    {row.jours_travailles > 0 ? formatEuro(row.total_eur / row.jours_travailles) : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Adresses de départ */}
      <div style={{ ...CARD, marginTop: '16px' }}>
        <h3 style={{ color: '#F1F5F9', fontSize: '14px', fontWeight: 700, marginBottom: '12px' }}>📍 Adresses de départ</h3>
        {ADRESSES_DEPART.map((a, i) => (
          <div key={i} style={{ display: 'flex', gap: '12px', alignItems: 'flex-start', marginBottom: i < ADRESSES_DEPART.length - 1 ? '8px' : 0 }}>
            <span style={{ color: '#64748B', fontSize: '12px', whiteSpace: 'nowrap' }}>
              {fmtDate(a.debut)} → {a.fin ? fmtDate(a.fin) : "aujourd'hui"}
            </span>
            <span style={{ color: '#94A3B8', fontSize: '12px' }}>{a.adresse}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Page principale Charges ───────────────────────────────────────────────
export default function Charges({ initialDate }) {
  const [tab, setTab] = useState(initialDate ? 'liste' : 'liste')

  // Liste state
  const [charges, setCharges] = useState([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(false)
  const [filters, setFilters] = useState({
    dateFrom: initialDate || '',
    dateTo:   initialDate || '',
    type: ''
  })
  const [showModal, setShowModal]   = useState(false)
  const [editCharge, setEditCharge] = useState(null)
  const [showImport, setShowImport] = useState(false)

  // Stats state
  const [stats, setStats]           = useState(null)
  const [statsPeriode, setStatsPeriode] = useState('mois')
  const [statsDateFrom, setStatsDateFrom] = useState('')
  const [statsDateTo, setStatsDateTo]     = useState('')

  const fetchCharges = useCallback(async () => {
    setLoading(true)
    try {
      const p = new URLSearchParams()
      if (filters.dateFrom) p.set('date_debut', filters.dateFrom)
      if (filters.dateTo)   p.set('date_fin',   filters.dateTo)
      if (filters.type)     p.set('type',        filters.type)
      p.set('limit',  PAGE_SIZE)
      p.set('offset', (page - 1) * PAGE_SIZE)
      const r = await fetch(`${API_BASE}/api/charges?${p}`)
      const d = await r.json()
      setCharges(d.charges || [])
      setTotal(d.total   || 0)
    } finally { setLoading(false) }
  }, [filters, page])

  const fetchStats = useCallback(async () => {
    const p = new URLSearchParams()
    if (statsPeriode !== 'custom') p.set('periode', statsPeriode)
    if (statsDateFrom) p.set('date_debut', statsDateFrom)
    if (statsDateTo)   p.set('date_fin',   statsDateTo)
    const r = await fetch(`${API_BASE}/api/charges/stats?${p}`)
    const d = await r.json()
    setStats(d)
  }, [statsPeriode, statsDateFrom, statsDateTo])

  useEffect(() => { if (tab === 'liste') fetchCharges() }, [fetchCharges, tab])
  useEffect(() => { if (tab === 'stats') fetchStats()   }, [fetchStats,   tab])

  const deleteCharge = async (id) => {
    if (!confirm('Supprimer cette charge ?')) return
    await fetch(`${API_BASE}/api/charges/${id}`, { method: 'DELETE' })
    fetchCharges()
  }

  const exportExcel = () => {
    const data = charges.map(c => ({
      Date: fmtDate(c.date), Type: c.type,
      Fournisseur: c.fournisseur || '', Ville: c.ville || '',
      Litres: c.litres || '', 'Prix/L': c.prix_litre || '',
      Km: c.kilometrage || '', 'Montant (€)': c.montant,
      Notes: c.notes || ''
    }))
    const ws = XLSX.utils.json_to_sheet(data)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Charges')
    XLSX.writeFile(wb, `charges_${new Date().toISOString().split('T')[0]}.xlsx`)
  }

  // KPIs liste (page courante)
  const kpiTotal    = charges.reduce((s, c) => s + (c.montant || 0), 0)
  const kpiGazole   = charges.filter(c => c.type === 'Gazole').reduce((s, c) => s + (c.montant || 0), 0)
  const kpiPeage    = charges.filter(c => c.type === 'Péage').reduce((s, c) => s + (c.montant || 0), 0)
  const kpiLitres   = charges.filter(c => c.type === 'Gazole').reduce((s, c) => s + (c.litres || 0), 0)
  const gazItems    = charges.filter(c => c.type === 'Gazole' && c.prix_litre)
  const kpiPrixMoy  = gazItems.length > 0 ? gazItems.reduce((s, c) => s + c.prix_litre, 0) / gazItems.length : 0

  return (
    <div style={{ maxWidth: '1400px' }}>
      {/* Header */}
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ color: '#F1F5F9', fontSize: '28px', fontWeight: 800 }}>Charges & Frais</h1>
        <p style={{ color: '#64748B', fontSize: '14px', marginTop: '4px' }}>Suivi des dépenses — Capital Talent Invest</p>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '0', marginBottom: '24px', borderBottom: '1px solid #1E3A5F' }}>
        {[{ id: 'liste', label: '📋 Liste des charges' }, { id: 'stats', label: '📊 Statistiques' }].map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{
            padding: '10px 22px', background: 'transparent', border: 'none',
            color: tab === t.id ? C.primary : '#64748B',
            fontWeight: tab === t.id ? 700 : 400, fontSize: '14px', cursor: 'pointer',
            borderBottom: tab === t.id ? `2px solid ${C.primary}` : '2px solid transparent',
            marginBottom: '-1px',
          }}>{t.label}</button>
        ))}
      </div>

      {/* ── ONGLET LISTE ── */}
      {tab === 'liste' && <>
        {/* KPI Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '14px', marginBottom: '20px' }}>
          <KpiCard label="Total charges" value={formatEuro(kpiTotal)} sub={`${total} entrées au total`} />
          <KpiCard label="Gazole" value={formatEuro(kpiGazole)} sub="carburant" color={TYPE_COLORS['Gazole']} />
          <KpiCard label="Péages" value={formatEuro(kpiPeage)} sub="autoroutes" color={TYPE_COLORS['Péage']} />
          <KpiCard label="Litres gazole" value={kpiLitres.toFixed(1) + ' L'} sub="sur la période" />
          <KpiCard label="Prix moyen / L" value={kpiPrixMoy > 0 ? kpiPrixMoy.toFixed(3) + ' €/L' : '—'} sub="gazole" color={TYPE_COLORS['Gazole']} />
        </div>

        {/* Filtres + Actions */}
        <div style={{ ...CARD, marginBottom: '16px' }}>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
            <span style={{ color: '#64748B', fontSize: '12px', fontWeight: 600 }}>Du</span>
            <input type="date" value={filters.dateFrom}
              onChange={e => { setFilters(f => ({ ...f, dateFrom: e.target.value })); setPage(1) }}
              style={{ ...INPUT_STYLE, width: '150px' }} />
            <span style={{ color: '#64748B', fontSize: '12px', fontWeight: 600 }}>au</span>
            <input type="date" value={filters.dateTo}
              onChange={e => { setFilters(f => ({ ...f, dateTo: e.target.value })); setPage(1) }}
              style={{ ...INPUT_STYLE, width: '150px' }} />
            <select value={filters.type}
              onChange={e => { setFilters(f => ({ ...f, type: e.target.value })); setPage(1) }}
              style={{ ...INPUT_STYLE, width: '160px' }}>
              <option value="">Tous les types</option>
              {TYPE_OPTIONS.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
            {(filters.dateFrom || filters.dateTo || filters.type) && (
              <button onClick={() => { setFilters({ dateFrom: '', dateTo: '', type: '' }); setPage(1) }}
                style={{ padding: '7px 14px', borderRadius: '6px', border: '1px solid #334155', background: 'transparent', color: '#94A3B8', fontSize: '13px', cursor: 'pointer' }}>
                Réinitialiser
              </button>
            )}
            <div style={{ flex: 1 }} />
            <button onClick={() => setShowImport(true)}
              style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 14px', borderRadius: '8px', border: '1px solid #1E3A5F', background: 'transparent', color: '#94A3B8', fontSize: '13px', cursor: 'pointer' }}>
              <FileJson2 size={15} /> Importer JSON
            </button>
            <button onClick={exportExcel}
              style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 14px', borderRadius: '8px', border: '1px solid #1E3A5F', background: 'transparent', color: '#94A3B8', fontSize: '13px', cursor: 'pointer' }}>
              <Download size={15} /> Excel
            </button>
            <button onClick={() => { setEditCharge(null); setShowModal(true) }}
              style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '9px 16px', borderRadius: '8px', border: 'none', background: C.primary, color: '#fff', fontSize: '14px', fontWeight: 600, cursor: 'pointer' }}>
              <Plus size={16} /> Nouvelle charge
            </button>
          </div>
        </div>

        {/* Tableau */}
        <div style={{ ...CARD, padding: 0, overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: 'rgba(0,0,0,0.2)' }}>
                  {['Date', 'Type', 'Fournisseur', 'Ville', 'Litres', 'Prix/L', 'Km', 'Montant', 'Actions'].map(h => (
                    <th key={h} style={TH}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={9} style={{ ...TD, textAlign: 'center', padding: '48px' }}>Chargement…</td></tr>
                ) : charges.length === 0 ? (
                  <tr><td colSpan={9} style={{ ...TD, textAlign: 'center', padding: '48px', color: '#475569' }}>Aucune charge — cliquez sur "+ Nouvelle charge" pour commencer</td></tr>
                ) : charges.map((c, i) => (
                  <tr key={c.id}
                    style={{ background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.015)' }}
                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(0,180,216,0.05)'}
                    onMouseLeave={e => e.currentTarget.style.background = i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.015)'}>
                    <td style={{ ...TD, fontWeight: 500, color: '#F1F5F9' }}>{fmtDate(c.date)}</td>
                    <td style={TD}><Badge type={c.type} /></td>
                    <td style={{ ...TD, color: '#F1F5F9' }}>{c.fournisseur || '—'}</td>
                    <td style={TD}>{c.ville || '—'}</td>
                    <td style={TD}>{c.litres ? c.litres.toFixed(2) + ' L' : '—'}</td>
                    <td style={TD}>{c.prix_litre ? c.prix_litre.toFixed(3) + ' €' : '—'}</td>
                    <td style={TD}>{c.kilometrage ? c.kilometrage.toFixed(0) + ' km' : '—'}</td>
                    <td style={{ ...TD, fontWeight: 700, color: TYPE_COLORS['Gazole'] }}>{formatEuro(c.montant)}</td>
                    <td style={TD}>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button onClick={() => { setEditCharge(c); setShowModal(true) }}
                          style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#64748B', padding: '4px' }}
                          onMouseEnter={e => e.currentTarget.style.color = C.primary}
                          onMouseLeave={e => e.currentTarget.style.color = '#64748B'}>
                          <Pencil size={15} />
                        </button>
                        <button onClick={() => deleteCharge(c.id)}
                          style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#64748B', padding: '4px' }}
                          onMouseEnter={e => e.currentTarget.style.color = '#EF4444'}
                          onMouseLeave={e => e.currentTarget.style.color = '#64748B'}>
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {total > PAGE_SIZE && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderTop: `1px solid ${C.border}` }}>
              <span style={{ color: '#64748B', fontSize: '13px' }}>{total} charges — page {page}/{Math.ceil(total / PAGE_SIZE)}</span>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                  style={{ background: 'transparent', border: `1px solid ${C.border}`, borderRadius: '6px', padding: '6px 10px', color: '#94A3B8', cursor: page === 1 ? 'not-allowed' : 'pointer', opacity: page === 1 ? 0.4 : 1 }}>
                  <ChevronLeft size={15} />
                </button>
                <button onClick={() => setPage(p => p + 1)} disabled={page >= Math.ceil(total / PAGE_SIZE)}
                  style={{ background: 'transparent', border: `1px solid ${C.border}`, borderRadius: '6px', padding: '6px 10px', color: '#94A3B8', cursor: page >= Math.ceil(total / PAGE_SIZE) ? 'not-allowed' : 'pointer', opacity: page >= Math.ceil(total / PAGE_SIZE) ? 0.4 : 1 }}>
                  <ChevronRight size={15} />
                </button>
              </div>
            </div>
          )}
        </div>
      </>}

      {/* ── ONGLET STATS ── */}
      {tab === 'stats' && (
        <ChargesStats
          stats={stats}
          periode={statsPeriode} onPeriode={setStatsPeriode}
          dateFrom={statsDateFrom} dateTo={statsDateTo}
          onDateFrom={setStatsDateFrom} onDateTo={setStatsDateTo}
        />
      )}

      {/* Modals */}
      {showModal && (
        <ChargeModal charge={editCharge} onClose={() => setShowModal(false)}
          onSaved={() => { setShowModal(false); fetchCharges() }} />
      )}
      {showImport && (
        <ImportModal onClose={() => setShowImport(false)}
          onImported={() => { setShowImport(false); fetchCharges() }} />
      )}
    </div>
  )
}
