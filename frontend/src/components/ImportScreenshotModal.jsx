import { useState, useCallback, useRef } from 'react'
import { X, Upload, Camera, Trash2, CheckCircle, AlertCircle, ArrowLeft } from 'lucide-react'
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

export default function ImportScreenshotModal({ isOpen, onClose, onImported }) {
  const [step, setStep] = useState('upload') // 'upload' | 'analyzing' | 'review'
  const [imagePreview, setImagePreview] = useState(null)
  const [imageFile, setImageFile] = useState(null)   // File object → envoyé en FormData à multer
  const [rdvs, setRdvs] = useState([])
  const [error, setError] = useState('')
  const [importing, setImporting] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const fileRef = useRef()

  const reset = () => {
    setStep('upload')
    setImagePreview(null)
    setImageFile(null)
    setRdvs([])
    setError('')
    setImporting(false)
    setDragOver(false)
  }

  const handleClose = () => { reset(); onClose() }

  const processFile = (file) => {
    if (!file) return
    if (!file.type.startsWith('image/')) {
      setError('Fichier invalide. Veuillez sélectionner une image (PNG, JPG, WEBP).')
      return
    }
    setError('')
    setImageFile(file)
    // Aperçu local via DataURL (lecture navigateur, pas envoyée au serveur)
    const reader = new FileReader()
    reader.onload = (e) => setImagePreview(e.target.result)
    reader.readAsDataURL(file)
  }

  const handleDrop = useCallback((e) => {
    e.preventDefault()
    setDragOver(false)
    processFile(e.dataTransfer.files[0])
  }, [])

  const handleDragOver = (e) => { e.preventDefault(); setDragOver(true) }
  const handleDragLeave = () => setDragOver(false)
  const handleFileChange = (e) => processFile(e.target.files[0])

  const analyzeImage = async () => {
    if (!imageFile) return
    setStep('analyzing')
    setError('')
    try {
      // Envoi multipart/form-data — multer reçoit le binaire côté backend
      const formData = new FormData()
      formData.append('image', imageFile)

      const res = await fetch(`${API_BASE}/api/import-screenshot`, {
        method: 'POST',
        body: formData   // pas de Content-Type manuel : le navigateur le gère (boundary)
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Erreur lors de l\'analyse')
      if (!data.rdvs || data.rdvs.length === 0) {
        setError('Aucun RDV détecté dans cette image. Essayez avec un screenshot plus lisible.')
        setStep('upload')
        return
      }
      setRdvs(data.rdvs)
      setStep('review')
    } catch (err) {
      setError(err.message)
      setStep('upload')
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
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes fadeTag { 0%,100% { opacity: .35 } 50% { opacity: 1 } }
      `}</style>

      <div className="fade-in" style={{
        background: '#1E293B',
        borderRadius: '16px',
        padding: '32px',
        width: isWide ? 'min(1200px, 96vw)' : '580px',
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
              📸 Importer planning WhatsApp
            </h2>
            <p style={{ color: '#64748B', fontSize: '13px', marginTop: '3px' }}>
              {step === 'upload'    && 'Uploadez un screenshot de planning WhatsApp'}
              {step === 'analyzing' && 'Analyse en cours par Claude AI…'}
              {step === 'review'    && `${rdvs.length} RDV détecté${rdvs.length > 1 ? 's' : ''} — vérifiez et modifiez avant de confirmer`}
            </p>
          </div>
          <button onClick={handleClose} style={{ background: 'transparent', border: 'none', color: '#64748B', cursor: 'pointer', flexShrink: 0 }}>
            <X size={22} />
          </button>
        </div>

        {/* ── Stepper ── */}
        <div style={{ display: 'flex', gap: '0', marginBottom: '28px' }}>
          {[['1', 'Upload'], ['2', 'Analyse'], ['3', 'Vérification']].map(([num, label], i) => {
            const active = (i === 0 && step === 'upload') || (i === 1 && step === 'analyzing') || (i === 2 && step === 'review')
            const done = (i === 0 && step !== 'upload') || (i === 1 && step === 'review')
            return (
              <div key={num} style={{ display: 'flex', alignItems: 'center', flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{
                    width: '26px', height: '26px', borderRadius: '50%', flexShrink: 0,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '12px', fontWeight: 700,
                    background: done ? '#22C55E' : active ? '#8B5CF6' : '#1E293B',
                    border: `2px solid ${done ? '#22C55E' : active ? '#8B5CF6' : '#334155'}`,
                    color: done || active ? '#fff' : '#475569',
                  }}>
                    {done ? '✓' : num}
                  </div>
                  <span style={{ fontSize: '12px', fontWeight: 600, color: active ? '#F1F5F9' : done ? '#22C55E' : '#475569' }}>
                    {label}
                  </span>
                </div>
                {i < 2 && <div style={{ flex: 1, height: '2px', background: done ? '#22C55E33' : '#1E293B', margin: '0 10px' }} />}
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

        {/* ══════════════════ STEP : UPLOAD ══════════════════ */}
        {step === 'upload' && (
          <div>
            <div
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onClick={() => fileRef.current?.click()}
              style={{
                border: `2px dashed ${dragOver ? '#8B5CF6' : imagePreview ? '#22C55E' : '#334155'}`,
                borderRadius: '14px',
                padding: imagePreview ? '16px' : '52px 24px',
                textAlign: 'center',
                cursor: 'pointer',
                background: dragOver ? '#8B5CF610' : '#0F172A',
                transition: 'all 0.2s',
                marginBottom: '24px',
                position: 'relative',
              }}
            >
              {imagePreview ? (
                <div>
                  <img
                    src={imagePreview} alt="preview"
                    style={{ maxWidth: '100%', maxHeight: '320px', borderRadius: '10px', objectFit: 'contain', boxShadow: '0 4px 20px rgba(0,0,0,0.4)' }}
                  />
                  <p style={{ color: '#22C55E', fontSize: '13px', marginTop: '14px', fontWeight: 600 }}>
                    ✓ Image chargée — cliquez pour en choisir une autre
                  </p>
                </div>
              ) : (
                <div>
                  <div style={{
                    width: '60px', height: '60px', borderRadius: '12px',
                    background: '#1E293B', border: '1px solid #334155',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    margin: '0 auto 18px'
                  }}>
                    <Upload size={26} color={dragOver ? '#8B5CF6' : '#475569'} />
                  </div>
                  <p style={{ color: '#E2E8F0', fontSize: '15px', fontWeight: 700, marginBottom: '6px' }}>
                    Glissez votre screenshot ici
                  </p>
                  <p style={{ color: '#64748B', fontSize: '13px', marginBottom: '14px' }}>
                    ou cliquez pour sélectionner un fichier
                  </p>
                  <p style={{ color: '#334155', fontSize: '12px' }}>PNG · JPG · WEBP · HEIC</p>
                </div>
              )}
            </div>

            <input ref={fileRef} type="file" accept="image/*" onChange={handleFileChange} style={{ display: 'none' }} />

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button onClick={handleClose} style={{ padding: '10px 20px', borderRadius: '8px', border: '1px solid #334155', background: 'transparent', color: '#94A3B8', fontSize: '14px', cursor: 'pointer' }}>
                Annuler
              </button>
              <button
                onClick={analyzeImage}
                disabled={!imageFile}
                style={{
                  padding: '10px 22px', borderRadius: '8px', border: 'none',
                  background: imageFile ? '#8B5CF6' : '#1E293B',
                  color: imageFile ? '#fff' : '#475569',
                  fontSize: '14px', fontWeight: 600,
                  cursor: imageFile ? 'pointer' : 'not-allowed',
                  display: 'flex', alignItems: 'center', gap: '8px',
                  transition: 'background 0.2s',
                }}
              >
                <Camera size={16} /> Analyser avec Claude AI
              </button>
            </div>
          </div>
        )}

        {/* ══════════════════ STEP : ANALYZING ══════════════════ */}
        {step === 'analyzing' && (
          <div style={{ textAlign: 'center', padding: '48px 24px' }}>
            <div style={{
              width: '60px', height: '60px', borderRadius: '50%',
              border: '4px solid #1E293B', borderTop: '4px solid #8B5CF6',
              margin: '0 auto 28px',
              animation: 'spin 0.9s linear infinite',
            }} />
            <p style={{ color: '#F1F5F9', fontSize: '17px', fontWeight: 700, marginBottom: '10px' }}>
              Claude analyse votre planning…
            </p>
            <p style={{ color: '#64748B', fontSize: '14px', marginBottom: '24px' }}>
              Extraction des RDV en cours, cela peut prendre 10-20 secondes
            </p>
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', flexWrap: 'wrap' }}>
              {['date', 'heure', 'client', 'adresse', 'travaux', 'confirmation'].map((tag, i) => (
                <span key={tag} style={{
                  background: '#0F172A', border: '1px solid #334155',
                  borderRadius: '20px', padding: '4px 14px',
                  color: '#64748B', fontSize: '12px',
                  animation: `fadeTag ${1.2 + i * 0.25}s ease-in-out infinite`,
                }}>
                  {tag}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* ══════════════════ STEP : REVIEW ══════════════════ */}
        {step === 'review' && (
          <div>
            {/* Summary bar */}
            <div style={{ display: 'flex', gap: '16px', marginBottom: '20px', alignItems: 'center', flexWrap: 'wrap' }}>
              <img src={imagePreview} alt="screenshot" style={{ width: '64px', height: '64px', objectFit: 'cover', borderRadius: '8px', border: '1px solid #334155', flexShrink: 0 }} />
              <div style={{ flex: 1, minWidth: '200px' }}>
                <div style={{ background: '#22C55E15', border: '1px solid #22C55E30', borderRadius: '10px', padding: '10px 16px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <CheckCircle size={18} color="#22C55E" style={{ flexShrink: 0 }} />
                  <div>
                    <span style={{ color: '#22C55E', fontSize: '14px', fontWeight: 700 }}>
                      {rdvs.length} rendez-vous détecté{rdvs.length > 1 ? 's'  : ''}
                    </span>
                    <span style={{ color: '#64748B', fontSize: '13px' }}> — modifiez ou supprimez des lignes avant de confirmer</span>
                  </div>
                </div>
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
                        <input
                          type="date"
                          value={rdv.date || ''}
                          onChange={e => updateRdv(i, 'date', e.target.value)}
                          style={INPUT}
                        />
                      </td>
                      <td style={{ padding: '5px 6px', minWidth: '80px' }}>
                        <input
                          type="text"
                          value={rdv.heure || ''}
                          onChange={e => updateRdv(i, 'heure', e.target.value)}
                          placeholder="10H30"
                          style={INPUT}
                        />
                      </td>
                      <td style={{ padding: '5px 6px', minWidth: '140px' }}>
                        <input
                          type="text"
                          value={rdv.nom_client || ''}
                          onChange={e => updateRdv(i, 'nom_client', e.target.value)}
                          placeholder="Nom client"
                          style={{ ...INPUT, borderColor: !rdv.nom_client ? '#EF444460' : '#334155' }}
                        />
                      </td>
                      <td style={{ padding: '5px 6px', minWidth: '190px' }}>
                        <input
                          type="text"
                          value={rdv.adresse || ''}
                          onChange={e => updateRdv(i, 'adresse', e.target.value)}
                          placeholder="Adresse + code postal"
                          style={INPUT}
                        />
                      </td>
                      <td style={{ padding: '5px 6px', minWidth: '115px' }}>
                        <input
                          type="text"
                          value={rdv.telephone || ''}
                          onChange={e => updateRdv(i, 'telephone', e.target.value)}
                          placeholder="0612345678"
                          style={INPUT}
                        />
                      </td>
                      <td style={{ padding: '5px 6px', minWidth: '90px' }}>
                        <select
                          value={rdv.travaux || 'PAC'}
                          onChange={e => updateRdv(i, 'travaux', e.target.value)}
                          style={INPUT}
                        >
                          {TRAVAUX_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
                        </select>
                      </td>
                      <td style={{ padding: '5px 6px', minWidth: '148px' }}>
                        <select
                          value={rdv.statut_confirmation || 'Confirmé'}
                          onChange={e => updateRdv(i, 'statut_confirmation', e.target.value)}
                          style={INPUT}
                        >
                          {CONFIRMATION_OPTIONS.map(o => <option key={o} value={o}>{o || '—'}</option>)}
                        </select>
                      </td>
                      <td style={{ padding: '5px 6px', minWidth: '180px' }}>
                        <input
                          type="text"
                          value={rdv.notes || ''}
                          onChange={e => updateRdv(i, 'notes', e.target.value)}
                          placeholder="Notes…"
                          style={INPUT}
                        />
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
                onClick={() => { setStep('upload'); setError('') }}
                style={{ padding: '10px 16px', borderRadius: '8px', border: '1px solid #334155', background: 'transparent', color: '#94A3B8', fontSize: '14px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                <ArrowLeft size={15} /> Recommencer
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
