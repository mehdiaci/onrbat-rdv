import { useState } from 'react'
import { X, Trash2, CheckCircle, AlertCircle, ArrowLeft, FileJson2 } from 'lucide-react'
import { API_BASE } from '../config'

const TRAVAUX_OPTIONS = ['PAC', 'Ampleur', 'Admin']
const CONFIRMATION_OPTIONS = ['Confirmé', 'NRP', 'NRP à confirmation', '–']

const INPUT = {
  background: '#0F172A',
  border: '1px solid #334155',
  borderRadius: '6px',
  padding: '6px 8px',
  color: '#E2E8F0',
  fontSize: '12px',
  outline: 'none',
  width: '100%',
  boxSizing: 'border-box',
}

const TH = {
  padding: '8px 10px',
  textAlign: 'left',
  color: '#64748B',
  fontSize: '10px',
  fontWeight: 700,
  textTransform: 'uppercase',
  letterSpacing: '0.07em',
  borderBottom: '1px solid #334155',
  background: '#0F172A',
  whiteSpace: 'nowrap',
}

const EXAMPLE = `[
  {
    "date": "2024-03-15",
    "heure": "10H30",
    "nom_client": "M. Dupont Jean",
    "adresse": "12 rue de la Paix, 75001 Paris",
    "telephone": "0612345678",
    "travaux": "PAC",
    "statut_confirmation": "Confirmé",
    "notes": "Maison individuelle"
  }
]`

export default function ImportJsonModal({ isOpen, onClose, onImported }) {
  const [step, setStep] = useState('paste') // 'paste' | 'review'
  const [jsonText, setJsonText] = useState('')
  const [rdvs, setRdvs] = useState([])
  const [error, setError] = useState('')
  const [importing, setImporting] = useState(false)

  const reset = () => {
    setStep('paste')
    setJsonText('')
    setRdvs([])
    setError('')
    setImporting(false)
  }

  const handleClose = () => { reset(); onClose() }

  const parseJson = () => {
    setError('')
    if (!jsonText.trim()) {
      setError('Veuillez coller un tableau JSON avant de continuer.')
      return
    }
    try {
      let parsed = JSON.parse(jsonText.trim())
      if (!Array.isArray(parsed)) parsed = [parsed]
      if (parsed.length === 0) {
        setError('Le tableau JSON est vide.')
        return
      }
      const normalized = parsed.map(r => ({
        date: r.date || null,
        heure: r.heure || null,
        nom_client: r.nom_client || r.client || null,
        adresse: r.adresse || null,
        telephone: r.telephone || null,
        travaux: r.travaux || null,
        statut_confirmation: r.statut_confirmation || null,
        notes: r.notes || null,
      }))
      setRdvs(normalized)
      setStep('review')
    } catch (e) {
      setError(`JSON invalide : ${e.message}`)
    }
  }

  const updateRdv = (idx, field, val) =>
    setRdvs(prev => prev.map((r, i) => i === idx ? { ...r, [field]: val } : r))

  const removeRdv = (idx) =>
    setRdvs(prev => prev.filter((_, i) => i !== idx))

  const confirmImport = async () => {
    if (rdvs.length === 0 || importing) return
    setImporting(true)
    setError('')
    try {
      const res = await fetch(`${API_BASE}/api/import`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(rdvs)
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Erreur import')
      onImported(data.count)
      handleClose()
    } catch (err) {
      setError(err.message)
    } finally {
      setImporting(false)
    }
  }

  if (!isOpen) return null

  const isWide = step === 'review'

  return (
    <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) handleClose() }}>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>

      <div className="fade-in" style={{
        background: '#1E293B',
        borderRadius: '16px',
        padding: '32px',
        width: isWide ? 'min(1200px, 96vw)' : '620px',
        maxWidth: '96vw',
        maxHeight: '93vh',
        overflowY: 'auto',
        border: '1px solid #334155',
        boxShadow: '0 25px 60px rgba(0,0,0,0.65)',
        transition: 'width 0.3s ease',
      }}>

        {/* ── Header ── */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '24px' }}>
          <div>
            <h2 style={{ color: '#F1F5F9', fontSize: '20px', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '10px' }}>
              <FileJson2 size={22} color="#3B82F6" /> Importer JSON
            </h2>
            <p style={{ color: '#64748B', fontSize: '13px', marginTop: '3px' }}>
              {step === 'paste'  && 'Collez un tableau JSON de RDV pour les importer en masse'}
              {step === 'review' && `${rdvs.length} RDV détecté${rdvs.length > 1 ? 's' : ''} — vérifiez et modifiez avant de confirmer`}
            </p>
          </div>
          <button onClick={handleClose} style={{ background: 'transparent', border: 'none', color: '#64748B', cursor: 'pointer', flexShrink: 0 }}>
            <X size={22} />
          </button>
        </div>

        {/* ── Stepper ── */}
        <div style={{ display: 'flex', gap: '0', marginBottom: '28px' }}>
          {[['1', 'Coller JSON'], ['2', 'Vérification']].map(([num, label], i) => {
            const active = (i === 0 && step === 'paste') || (i === 1 && step === 'review')
            const done = i === 0 && step === 'review'
            return (
              <div key={num} style={{ display: 'flex', alignItems: 'center', flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{
                    width: '26px', height: '26px', borderRadius: '50%', flexShrink: 0,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '12px', fontWeight: 700,
                    background: done ? '#22C55E' : active ? '#3B82F6' : '#1E293B',
                    border: `2px solid ${done ? '#22C55E' : active ? '#3B82F6' : '#334155'}`,
                    color: done || active ? '#fff' : '#475569',
                  }}>
                    {done ? '✓' : num}
                  </div>
                  <span style={{ fontSize: '12px', fontWeight: 600, color: active ? '#F1F5F9' : done ? '#22C55E' : '#475569' }}>
                    {label}
                  </span>
                </div>
                {i < 1 && <div style={{ flex: 1, height: '2px', background: done ? '#22C55E33' : '#1E293B', margin: '0 10px' }} />}
              </div>
            )
          })}
        </div>

        {/* ── Error banner ── */}
        {error && (
          <div style={{ background: '#EF444415', border: '1px solid #EF444450', borderRadius: '8px', padding: '11px 16px', color: '#EF4444', fontSize: '13px', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <AlertCircle size={15} style={{ flexShrink: 0 }} /> {error}
          </div>
        )}

        {/* ══════════════════ STEP : PASTE ══════════════════ */}
        {step === 'paste' && (
          <div>
            {/* Format info */}
            <div style={{ background: '#0F172A', border: '1px solid #334155', borderRadius: '10px', padding: '16px 18px', marginBottom: '16px' }}>
              <p style={{ color: '#64748B', fontSize: '11px', marginBottom: '12px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em' }}>
                Format attendu
              </p>
              <pre style={{
                color: '#94A3B8', fontSize: '12px', lineHeight: '1.6',
                fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
                overflowX: 'auto', margin: 0, whiteSpace: 'pre-wrap',
              }}>
                {EXAMPLE}
              </pre>
              <div style={{ marginTop: '14px', display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {['date (YYYY-MM-DD)', 'heure', 'nom_client *', 'adresse', 'telephone', 'travaux', 'statut_confirmation', 'notes'].map(f => (
                  <span key={f} style={{
                    background: '#1E293B', border: '1px solid #334155',
                    borderRadius: '4px', padding: '2px 8px',
                    fontSize: '11px', fontFamily: 'monospace',
                    color: f.includes('*') ? '#F59E0B' : '#64748B',
                  }}>
                    {f}
                  </span>
                ))}
              </div>
            </div>

            {/* Textarea */}
            <textarea
              value={jsonText}
              onChange={e => { setJsonText(e.target.value); setError('') }}
              placeholder={'Collez ici votre tableau JSON…\n[\n  { "date": "2024-03-15", "nom_client": "Dupont", … },\n  …\n]'}
              spellCheck={false}
              style={{
                width: '100%',
                minHeight: '200px',
                background: '#0F172A',
                border: `1px solid ${error ? '#EF444450' : '#334155'}`,
                borderRadius: '10px',
                padding: '14px 16px',
                color: '#E2E8F0',
                fontSize: '13px',
                fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
                lineHeight: '1.6',
                outline: 'none',
                resize: 'vertical',
                boxSizing: 'border-box',
                transition: 'border-color 0.2s',
              }}
            />

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '16px' }}>
              <button onClick={handleClose} style={{ padding: '10px 20px', borderRadius: '8px', border: '1px solid #334155', background: 'transparent', color: '#94A3B8', fontSize: '14px', cursor: 'pointer' }}>
                Annuler
              </button>
              <button
                onClick={parseJson}
                disabled={!jsonText.trim()}
                style={{
                  padding: '10px 22px', borderRadius: '8px', border: 'none',
                  background: jsonText.trim() ? '#3B82F6' : '#1E293B',
                  color: jsonText.trim() ? '#fff' : '#475569',
                  fontSize: '14px', fontWeight: 600,
                  cursor: jsonText.trim() ? 'pointer' : 'not-allowed',
                  display: 'flex', alignItems: 'center', gap: '8px',
                  transition: 'background 0.2s',
                }}
              >
                <FileJson2 size={16} /> Valider et prévisualiser
              </button>
            </div>
          </div>
        )}

        {/* ══════════════════ STEP : REVIEW ══════════════════ */}
        {step === 'review' && (
          <div>
            {/* Summary */}
            <div style={{ background: '#22C55E15', border: '1px solid #22C55E30', borderRadius: '10px', padding: '12px 18px', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <CheckCircle size={18} color="#22C55E" style={{ flexShrink: 0 }} />
              <div>
                <span style={{ color: '#22C55E', fontSize: '14px', fontWeight: 700 }}>
                  {rdvs.length} rendez-vous prêts à importer
                </span>
                <span style={{ color: '#64748B', fontSize: '13px' }}> — modifiez ou supprimez des lignes avant de confirmer</span>
              </div>
            </div>

            {/* Editable table */}
            <div style={{ overflowX: 'auto', borderRadius: '10px', border: '1px solid #334155', marginBottom: '20px' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '900px' }}>
                <thead>
                  <tr>
                    {['#', 'Date', 'Heure', 'Client *', 'Adresse', 'Téléphone', 'Travaux', 'Confirmation', 'Notes', ''].map(h => (
                      <th key={h} style={TH}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rdvs.map((rdv, i) => (
                    <tr key={i} style={{
                      background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.015)',
                      borderBottom: '1px solid #1E293B',
                    }}>
                      <td style={{ padding: '6px 10px', color: '#475569', fontSize: '12px', fontWeight: 700, minWidth: '28px' }}>
                        {i + 1}
                      </td>
                      <td style={{ padding: '5px 6px', minWidth: '138px' }}>
                        <input type="date" value={rdv.date || ''} onChange={e => updateRdv(i, 'date', e.target.value)} style={INPUT} />
                      </td>
                      <td style={{ padding: '5px 6px', minWidth: '80px' }}>
                        <input type="text" value={rdv.heure || ''} onChange={e => updateRdv(i, 'heure', e.target.value)} placeholder="10H30" style={INPUT} />
                      </td>
                      <td style={{ padding: '5px 6px', minWidth: '140px' }}>
                        <input type="text" value={rdv.nom_client || ''} onChange={e => updateRdv(i, 'nom_client', e.target.value)} placeholder="Nom client"
                          style={{ ...INPUT, borderColor: !rdv.nom_client ? '#EF444460' : '#334155' }} />
                      </td>
                      <td style={{ padding: '5px 6px', minWidth: '190px' }}>
                        <input type="text" value={rdv.adresse || ''} onChange={e => updateRdv(i, 'adresse', e.target.value)} placeholder="Adresse + code postal" style={INPUT} />
                      </td>
                      <td style={{ padding: '5px 6px', minWidth: '115px' }}>
                        <input type="text" value={rdv.telephone || ''} onChange={e => updateRdv(i, 'telephone', e.target.value)} placeholder="0612345678" style={INPUT} />
                      </td>
                      <td style={{ padding: '5px 6px', minWidth: '90px' }}>
                        <select value={rdv.travaux || 'PAC'} onChange={e => updateRdv(i, 'travaux', e.target.value)} style={INPUT}>
                          {TRAVAUX_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
                        </select>
                      </td>
                      <td style={{ padding: '5px 6px', minWidth: '148px' }}>
                        <select value={rdv.statut_confirmation || 'Confirmé'} onChange={e => updateRdv(i, 'statut_confirmation', e.target.value)} style={INPUT}>
                          {CONFIRMATION_OPTIONS.map(o => <option key={o} value={o}>{o || '—'}</option>)}
                        </select>
                      </td>
                      <td style={{ padding: '5px 6px', minWidth: '180px' }}>
                        <input type="text" value={rdv.notes || ''} onChange={e => updateRdv(i, 'notes', e.target.value)} placeholder="Notes…" style={INPUT} />
                      </td>
                      <td style={{ padding: '5px 8px', textAlign: 'center' }}>
                        <button
                          onClick={() => removeRdv(i)}
                          title="Supprimer ce RDV"
                          style={{ background: 'transparent', border: 'none', color: '#EF4444', cursor: 'pointer', padding: '4px', borderRadius: '4px', opacity: 0.7, transition: 'opacity 0.15s' }}
                          onMouseEnter={e => e.currentTarget.style.opacity = '1'}
                          onMouseLeave={e => e.currentTarget.style.opacity = '0.7'}
                        >
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {rdvs.length === 0 && (
              <div style={{ textAlign: 'center', padding: '20px', color: '#EF4444', fontSize: '13px' }}>
                Tous les RDV ont été supprimés.
              </div>
            )}

            {/* Footer */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
              <button
                onClick={() => { setStep('paste'); setError('') }}
                style={{ padding: '10px 16px', borderRadius: '8px', border: '1px solid #334155', background: 'transparent', color: '#94A3B8', fontSize: '14px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                <ArrowLeft size={15} /> Modifier JSON
              </button>
              <div style={{ display: 'flex', gap: '12px' }}>
                <button onClick={handleClose} style={{ padding: '10px 20px', borderRadius: '8px', border: '1px solid #334155', background: 'transparent', color: '#94A3B8', fontSize: '14px', cursor: 'pointer' }}>
                  Annuler
                </button>
                <button
                  onClick={confirmImport}
                  disabled={importing || rdvs.length === 0}
                  style={{
                    padding: '10px 24px', borderRadius: '8px', border: 'none',
                    background: importing || rdvs.length === 0 ? '#15803D' : '#22C55E',
                    color: '#fff', fontSize: '14px', fontWeight: 700,
                    cursor: importing || rdvs.length === 0 ? 'not-allowed' : 'pointer',
                    display: 'flex', alignItems: 'center', gap: '8px',
                    opacity: rdvs.length === 0 ? 0.4 : 1,
                    transition: 'background 0.2s',
                  }}
                >
                  {importing ? (
                    <>
                      <div style={{ width: '14px', height: '14px', borderRadius: '50%', border: '2px solid rgba(255,255,255,0.3)', borderTop: '2px solid #fff', animation: 'spin 0.8s linear infinite' }} />
                      Import en cours…
                    </>
                  ) : (
                    <><CheckCircle size={16} /> Confirmer l'import ({rdvs.length} RDV)</>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
