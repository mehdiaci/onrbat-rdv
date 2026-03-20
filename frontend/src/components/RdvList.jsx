import { useState, useEffect, useCallback } from 'react'
import { Plus, Search, Download, FileText, Pencil, Trash2, ChevronLeft, ChevronRight, Filter, FileJson2 } from 'lucide-react'
import * as XLSX from 'xlsx'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import RdvModal from './RdvModal'
import ImportJsonModal from './ImportJsonModal'
import { API_BASE } from '../config'

const PAGE_SIZE = 20

// Convertit YYYY-MM-DD → DD/MM/YYYY pour l'affichage (ne touche pas aux valeurs ISO envoyées au backend)
const fmtDate = (d) => {
  if (!d) return '—'
  const m = d.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  return m ? `${m[3]}/${m[2]}/${m[1]}` : d
}

const STATUT_COLORS = {
  'Devis signé':   { bg: '#00B4D822', color: '#00B4D8' },
  'Hors cible':    { bg: '#F59E0B22', color: '#F59E0B' },
  'Refus client':  { bg: '#EF444422', color: '#EF4444' },
  'Tutelle':       { bg: '#EF444422', color: '#EF4444' },
  'Déjà équipé':  { bg: '#EF444422', color: '#EF4444' },
  'Refus':            { bg: '#EF444422', color: '#EF4444' },
  'Refus de passage': { bg: '#F9731622', color: '#F97316' },
  'NRP':              { bg: '#6B728022', color: '#6B7280' },
  'Absent':        { bg: '#64748B22', color: '#94A3B8' },
  'En attente':    { bg: '#3B82F622', color: '#3B82F6' },
  'Passage admin': { bg: '#8B5CF622', color: '#8B5CF6' },
}

const TRAVAUX_OPTIONS = ['', 'PAC', 'Ampleur', 'Admin']
const RESULTAT_OPTIONS = ['', 'En attente', 'Devis signé', 'Hors cible', 'Refus', 'Refus client', 'Refus de passage', 'Tutelle', 'Déjà équipé', 'NRP', 'Absent', 'Passage admin']

function Badge({ statut }) {
  const s = STATUT_COLORS[statut] || { bg: '#64748B22', color: '#94A3B8' }
  return (
    <span style={{
      background: s.bg, color: s.color,
      padding: '3px 10px', borderRadius: '20px',
      fontSize: '12px', fontWeight: 600, whiteSpace: 'nowrap'
    }}>
      {statut || '—'}
    </span>
  )
}

const TH = {
  padding: '10px 14px',
  textAlign: 'left',
  color: '#64748B',
  fontSize: '11px',
  fontWeight: 700,
  textTransform: 'uppercase',
  letterSpacing: '0.07em',
  borderBottom: '1px solid #1E3A5F',
  whiteSpace: 'nowrap',
  background: '#112240'
}
const TD = {
  padding: '11px 14px',
  color: '#CBD5E1',
  fontSize: '13px',
  borderBottom: '1px solid #1E3A5F',
  verticalAlign: 'middle'
}

const BTN_ICON = {
  background: 'transparent', border: '1px solid #1E3A5F',
  borderRadius: '6px', padding: '6px', cursor: 'pointer',
  color: '#64748B', display: 'flex', alignItems: 'center'
}
const SELECT_STYLE = {
  background: '#112240', border: '1px solid #1E3A5F',
  borderRadius: '8px', padding: '8px 12px',
  color: '#E2E8F0', fontSize: '13px', cursor: 'pointer', outline: 'none'
}

export default function RdvList() {
  const [rdvs, setRdvs] = useState([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState('')
  const [searchInput, setSearchInput] = useState('')
  const [filters, setFilters] = useState({ statut: '', travaux: '', departement: '', dateFrom: '', dateTo: '' })
  const [departements, setDepartements] = useState([])
  const [modal, setModal] = useState({ open: false, rdv: null })
  const [importJson, setImportJson] = useState(false)
  const [deleteId, setDeleteId] = useState(null)
  const [error, setError] = useState('')
  const [importSuccess, setImportSuccess] = useState('')

  const totalPages = Math.ceil(total / PAGE_SIZE)

  const buildParams = useCallback((p = page) => {
    const params = new URLSearchParams({ limit: PAGE_SIZE, offset: (p - 1) * PAGE_SIZE })
    if (search) params.set('search', search)
    if (filters.statut) params.set('statut', filters.statut)
    if (filters.travaux) params.set('travaux', filters.travaux)
    if (filters.departement) params.set('departement', filters.departement)
    if (filters.dateFrom) params.set('dateFrom', filters.dateFrom)
    if (filters.dateTo)   params.set('dateTo',   filters.dateTo)
    return params
  }, [page, search, filters])

  const fetchRdvs = useCallback(async (p = page) => {
    setLoading(true)
    try {
      const res = await fetch(`${API_BASE}/api/rdv?${buildParams(p)}`)
      const data = await res.json()
      setRdvs(data.data || [])
      setTotal(data.total || 0)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [buildParams])

  const fetchAll = async () => {
    const params = new URLSearchParams({ limit: 10000, offset: 0 })
    if (search) params.set('search', search)
    if (filters.statut) params.set('statut', filters.statut)
    if (filters.travaux) params.set('travaux', filters.travaux)
    if (filters.departement) params.set('departement', filters.departement)
    if (filters.dateFrom) params.set('dateFrom', filters.dateFrom)
    if (filters.dateTo)   params.set('dateTo',   filters.dateTo)
    const res = await fetch(`${API_BASE}/api/rdv?${params}`)
    const data = await res.json()
    return data.data || []
  }

  const refreshDeps = () => {
    fetch(`${API_BASE}/api/rdv?limit=5000`)
      .then(r => r.json())
      .then(data => {
        const deps = [...new Set((data.data || []).map(r => r.departement).filter(Boolean))].sort()
        setDepartements(deps)
      })
  }

  useEffect(() => { refreshDeps() }, [])
  useEffect(() => { setPage(1) }, [search, filters])
  useEffect(() => { fetchRdvs(page) }, [page, search, filters])

  const handleSearch = (e) => { e.preventDefault(); setSearch(searchInput) }

  const saveRdv = async (payload) => {
    const isEdit = !!modal.rdv
    const url = isEdit ? `${API_BASE}/api/rdv/${modal.rdv.id}` : `${API_BASE}/api/rdv`
    const res = await fetch(url, {
      method: isEdit ? 'PUT' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })
    if (!res.ok) { const err = await res.json(); throw new Error(err.error || 'Erreur serveur') }
    fetchRdvs(page)
    refreshDeps()
  }

  const deleteRdv = async (id) => {
    const res = await fetch(`${API_BASE}/api/rdv/${id}`, { method: 'DELETE' })
    if (!res.ok) { const e = await res.json(); throw new Error(e.error) }
    setDeleteId(null)
    fetchRdvs(page)
  }

  const exportExcel = async () => {
    const all = await fetchAll()
    const rows = all.map(r => ({
      'Date': fmtDate(r.date), 'Heure': r.heure || '', 'Client': r.nom_client || '',
      'Adresse': r.adresse || '', 'Téléphone': r.telephone || '', 'Travaux': r.travaux || '',
      'Confirmation': r.statut_confirmation || '', 'Résultat': r.statut_resultat || '',
      'RAC (€)': r.reste_a_charge ?? '', 'Département': r.departement || '', 'Notes': r.notes || ''
    }))
    const ws = XLSX.utils.json_to_sheet(rows)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'RDV')
    XLSX.writeFile(wb, `ONRBAT_RDV_${new Date().toISOString().split('T')[0]}.xlsx`)
  }

  const exportPDF = async () => {
    const all = await fetchAll()
    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })
    doc.setFontSize(16); doc.setTextColor(40, 40, 40)
    doc.text('Capital Talent Invest — Liste des Rendez-vous', 14, 18)
    doc.setFontSize(9); doc.setTextColor(120, 120, 120)
    doc.text(`Exporté le ${new Date().toLocaleDateString('fr-FR')} · ${all.length} RDV`, 14, 24)
    autoTable(doc, {
      startY: 30,
      head: [['Date', 'Heure', 'Client', 'Adresse', 'Téléphone', 'Travaux', 'Confirmation', 'Résultat', 'RAC (€)']],
      body: all.map(r => [fmtDate(r.date), r.heure || '', r.nom_client || '', r.adresse || '',
        r.telephone || '', r.travaux || '', r.statut_confirmation || '',
        r.statut_resultat || '', r.reste_a_charge != null ? `${r.reste_a_charge} €` : '']),
      styles: { fontSize: 8, cellPadding: 3, textColor: [50, 50, 50] },
      headStyles: { fillColor: [0, 180, 216], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8 },
      alternateRowStyles: { fillColor: [248, 250, 252] },
      margin: { left: 14, right: 14 }
    })
    doc.save(`CTI_RDV_${new Date().toISOString().split('T')[0]}.pdf`)
  }

  const formatEuro = (n) => n != null
    ? new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n)
    : '—'

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ fontSize: '26px', fontWeight: 800, color: '#F1F5F9', letterSpacing: '-0.02em' }}>Rendez-vous</h1>
          <p style={{ color: '#64748B', fontSize: '14px', marginTop: '4px' }}>{total} RDV au total</p>
        </div>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <button onClick={exportExcel} style={{ ...SELECT_STYLE, display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Download size={15} /> Excel
          </button>
          <button onClick={exportPDF} style={{ ...SELECT_STYLE, display: 'flex', alignItems: 'center', gap: '6px' }}>
            <FileText size={15} /> PDF
          </button>
          <button onClick={() => setImportJson(true)} style={{
            display: 'flex', alignItems: 'center', gap: '8px',
            padding: '9px 18px', borderRadius: '8px', border: 'none',
            background: '#0077B6', color: '#fff', fontSize: '14px', fontWeight: 600, cursor: 'pointer'
          }}>
            <FileJson2 size={16} /> Importer JSON
          </button>
          <button onClick={() => setModal({ open: true, rdv: null })} style={{
            display: 'flex', alignItems: 'center', gap: '8px',
            padding: '9px 18px', borderRadius: '8px', border: 'none',
            background: '#00B4D8', color: '#fff', fontSize: '14px', fontWeight: 600, cursor: 'pointer'
          }}>
            <Plus size={16} /> Nouveau RDV
          </button>
        </div>
      </div>

      {/* Search + Filters */}
      <div style={{ background: '#112240', borderRadius: '12px', padding: '16px', border: '1px solid #1E3A5F', marginBottom: '16px' }}>
        <form onSubmit={handleSearch} style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#0A1628', border: '1px solid #1E3A5F', borderRadius: '8px', padding: '0 12px', flex: '1', minWidth: '200px' }}>
            <Search size={15} color="#64748B" />
            <input type="text" value={searchInput} onChange={e => setSearchInput(e.target.value)}
              placeholder="Rechercher par nom, adresse, téléphone…"
              style={{ background: 'transparent', border: 'none', outline: 'none', color: '#E2E8F0', fontSize: '14px', padding: '9px 0', width: '100%' }} />
          </div>
          <button type="submit" style={{ padding: '9px 16px', borderRadius: '8px', border: 'none', background: '#00B4D8', color: '#fff', fontSize: '14px', fontWeight: 600, cursor: 'pointer' }}>
            Rechercher
          </button>
        </form>

        <div style={{ display: 'flex', gap: '10px', marginTop: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
          <Filter size={14} color="#64748B" />
          {/* Plage de dates */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ color: '#64748B', fontSize: '12px', whiteSpace: 'nowrap' }}>Du</span>
            <input
              type="date"
              value={filters.dateFrom}
              onChange={e => setFilters(f => ({ ...f, dateFrom: e.target.value }))}
              style={{ ...SELECT_STYLE, fontSize: '13px' }}
            />
            <span style={{ color: '#64748B', fontSize: '12px', whiteSpace: 'nowrap' }}>au</span>
            <input
              type="date"
              value={filters.dateTo}
              onChange={e => setFilters(f => ({ ...f, dateTo: e.target.value }))}
              style={{ ...SELECT_STYLE, fontSize: '13px' }}
            />
          </div>
          <select value={filters.travaux} onChange={e => setFilters(f => ({ ...f, travaux: e.target.value }))} style={SELECT_STYLE}>
            <option value="">Tous travaux</option>
            {TRAVAUX_OPTIONS.filter(Boolean).map(o => <option key={o} value={o}>{o}</option>)}
          </select>
          <select value={filters.statut} onChange={e => setFilters(f => ({ ...f, statut: e.target.value }))} style={SELECT_STYLE}>
            <option value="">Tous statuts</option>
            {RESULTAT_OPTIONS.filter(Boolean).map(o => <option key={o} value={o}>{o}</option>)}
          </select>
          <select value={filters.departement} onChange={e => setFilters(f => ({ ...f, departement: e.target.value }))} style={SELECT_STYLE}>
            <option value="">Tous dép.</option>
            {departements.map(d => <option key={d} value={d}>Dép. {d}</option>)}
          </select>
          {(search || Object.values(filters).some(Boolean)) && (
            <button
              onClick={() => { setSearch(''); setSearchInput(''); setFilters({ statut: '', travaux: '', departement: '', dateFrom: '', dateTo: '' }) }}
              style={{ background: 'transparent', border: '1px solid #EF444440', borderRadius: '6px', color: '#EF4444', fontSize: '13px', cursor: 'pointer', padding: '6px 12px' }}>
              Réinitialiser
            </button>
          )}
        </div>
      </div>

      {importSuccess && (
        <div style={{ background: '#22C55E15', border: '1px solid #22C55E40', borderRadius: '8px', padding: '12px 16px', color: '#22C55E', marginBottom: '16px', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          ✓ {importSuccess}
          <button onClick={() => setImportSuccess('')} style={{ marginLeft: 'auto', background: 'transparent', border: 'none', color: '#22C55E', cursor: 'pointer', fontSize: '16px' }}>×</button>
        </div>
      )}

      {error && (
        <div style={{ background: '#EF444422', border: '1px solid #EF4444', borderRadius: '8px', padding: '12px', color: '#EF4444', marginBottom: '16px', fontSize: '13px' }}>
          {error}
        </div>
      )}

      {/* Table */}
      <div style={{ background: '#112240', borderRadius: '12px', border: '1px solid #1E3A5F', overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', minWidth: '960px' }}>
            <thead>
              <tr>
                {['Date', 'Heure', 'Client', 'Adresse', 'Téléphone', 'Travaux', 'Résultat', 'RAC', 'Actions'].map(h => (
                  <th key={h} style={TH}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={9} style={{ ...TD, textAlign: 'center', padding: '48px', color: '#475569' }}>Chargement…</td></tr>
              ) : rdvs.length === 0 ? (
                <tr><td colSpan={9} style={{ ...TD, textAlign: 'center', padding: '48px', color: '#475569' }}>Aucun rendez-vous trouvé</td></tr>
              ) : rdvs.map((rdv, i) => (
                <tr key={rdv.id}
                  style={{ background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.015)' }}
                  onMouseEnter={e => e.currentTarget.style.background = 'rgba(0,180,216,0.05)'}
                  onMouseLeave={e => e.currentTarget.style.background = i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.015)'}
                >
                  <td style={{ ...TD, fontWeight: 500 }}>{fmtDate(rdv.date)}</td>
                  <td style={TD}>{rdv.heure || '—'}</td>
                  <td style={{ ...TD, color: '#F1F5F9', fontWeight: 500, whiteSpace: 'nowrap' }}>{rdv.nom_client || '—'}</td>
                  <td style={{ ...TD, maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={rdv.adresse}>
                    {rdv.adresse || '—'}
                  </td>
                  <td style={{ ...TD, whiteSpace: 'nowrap' }}>{rdv.telephone || '—'}</td>
                  <td style={TD}>
                    <span style={{ color: '#00B4D8', fontWeight: 600, fontSize: '12px' }}>{rdv.travaux || '—'}</span>
                  </td>
                  <td style={TD}><Badge statut={rdv.statut_resultat} /></td>
                  <td style={TD}>
                    {rdv.reste_a_charge != null
                      ? <span style={{ color: '#00B4D8', fontWeight: 600 }}>{formatEuro(rdv.reste_a_charge)}</span>
                      : <span style={{ color: '#475569' }}>—</span>}
                  </td>
                  <td style={TD}>
                    <div style={{ display: 'flex', gap: '6px' }}>
                      <button style={{ ...BTN_ICON, color: '#00B4D8', borderColor: '#00B4D820' }}
                        onClick={() => setModal({ open: true, rdv })} title="Modifier">
                        <Pencil size={14} />
                      </button>
                      <button style={{ ...BTN_ICON, color: '#EF4444', borderColor: '#EF444420' }}
                        onClick={() => setDeleteId(rdv.id)} title="Supprimer">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 20px', borderTop: '1px solid #1E3A5F' }}>
            <span style={{ color: '#64748B', fontSize: '13px' }}>Page {page} / {totalPages} — {total} résultats</span>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} style={{ ...BTN_ICON, opacity: page === 1 ? 0.4 : 1 }}>
                <ChevronLeft size={16} />
              </button>
              {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
                const p = totalPages <= 7 ? i + 1 : page <= 4 ? i + 1 : page >= totalPages - 3 ? totalPages - 6 + i : page - 3 + i
                return (
                  <button key={p} onClick={() => setPage(p)} style={{
                    padding: '6px 10px', borderRadius: '6px',
                    border: p === page ? 'none' : '1px solid #1E3A5F',
                    background: p === page ? '#00B4D8' : 'transparent',
                    color: p === page ? '#fff' : '#94A3B8',
                    fontSize: '13px', fontWeight: p === page ? 700 : 400, cursor: 'pointer'
                  }}>{p}</button>
                )
              })}
              <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} style={{ ...BTN_ICON, opacity: page === totalPages ? 0.4 : 1 }}>
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>

      <RdvModal isOpen={modal.open} onClose={() => setModal({ open: false, rdv: null })} onSave={saveRdv} rdv={modal.rdv} />

      <ImportJsonModal
        isOpen={importJson}
        onClose={() => setImportJson(false)}
        onImported={(count) => {
          setImportSuccess(`${count} RDV importés avec succès via JSON !`)
          fetchRdvs(1); setPage(1); refreshDeps()
        }}
      />

      {/* Modal suppression */}
      {deleteId && (
        <div className="modal-overlay" onClick={() => setDeleteId(null)}>
          <div className="fade-in" style={{
            background: '#112240', borderRadius: '16px', padding: '32px',
            width: '420px', maxWidth: '95vw', border: '1px solid #1E3A5F',
            boxShadow: '0 20px 50px rgba(0,0,0,0.5)'
          }} onClick={e => e.stopPropagation()}>
            <h3 style={{ color: '#F1F5F9', fontSize: '18px', fontWeight: 700, marginBottom: '12px' }}>Supprimer ce RDV ?</h3>
            <p style={{ color: '#64748B', fontSize: '14px', marginBottom: '24px' }}>Cette action est irréversible.</p>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button onClick={() => setDeleteId(null)}
                style={{ padding: '9px 18px', borderRadius: '8px', border: '1px solid #1E3A5F', background: 'transparent', color: '#94A3B8', cursor: 'pointer', fontSize: '14px' }}>
                Annuler
              </button>
              <button onClick={() => deleteRdv(deleteId)}
                style={{ padding: '9px 18px', borderRadius: '8px', border: 'none', background: '#EF4444', color: '#fff', cursor: 'pointer', fontSize: '14px', fontWeight: 600 }}>
                Supprimer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
