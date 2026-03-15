import { useState, useEffect } from 'react'
import { X } from 'lucide-react'

const TRAVAUX_OPTIONS = ['PAC', 'Ampleur', 'Admin']
const CONFIRMATION_OPTIONS = ['Confirmé', 'NRP', 'NRP à confirmation']
const RESULTAT_OPTIONS = ['En attente', 'Devis signé', 'Refus', 'Refus client', 'Tutelle', 'Déjà équipé', 'NRP', 'Absent', 'Passage admin']

const today = new Date().toISOString().split('T')[0]

const EMPTY = {
  date: today, heure: '', nom_client: '', adresse: '',
  telephone: '', travaux: 'PAC', statut_confirmation: 'Confirmé',
  statut_resultat: 'En attente', reste_a_charge: '', notes: ''
}

const INPUT_STYLE = {
  background: '#0F172A',
  border: '1px solid #334155',
  borderRadius: '8px',
  padding: '9px 12px',
  color: '#E2E8F0',
  fontSize: '14px',
  width: '100%',
  outline: 'none',
  transition: 'border-color 0.15s',
}

const LABEL_STYLE = {
  display: 'block',
  color: '#94A3B8',
  fontSize: '12px',
  fontWeight: 600,
  marginBottom: '6px',
  textTransform: 'uppercase',
  letterSpacing: '0.05em'
}

function Field({ label, children }) {
  return (
    <div>
      <label style={LABEL_STYLE}>{label}</label>
      {children}
    </div>
  )
}

export default function RdvModal({ isOpen, onClose, onSave, rdv }) {
  const [form, setForm] = useState(EMPTY)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!isOpen) return
    if (rdv) {
      setForm({
        date: rdv.date || today,
        heure: rdv.heure || '',
        nom_client: rdv.nom_client || '',
        adresse: rdv.adresse || '',
        telephone: rdv.telephone || '',
        travaux: rdv.travaux || 'PAC',
        statut_confirmation: rdv.statut_confirmation || 'Confirmé',
        statut_resultat: rdv.statut_resultat || 'En attente',
        reste_a_charge: rdv.reste_a_charge != null ? rdv.reste_a_charge : '',
        notes: rdv.notes || ''
      })
    } else {
      setForm(EMPTY)
    }
    setError('')
  }, [rdv, isOpen])

  const set = (key, val) => setForm(f => ({ ...f, [key]: val }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.nom_client.trim()) { setError('Le nom du client est requis.'); return }
    if (!form.date) { setError('La date est requise.'); return }
    setSaving(true)
    setError('')
    try {
      const payload = {
        ...form,
        reste_a_charge: form.reste_a_charge !== '' ? parseFloat(form.reste_a_charge) : null
      }
      await onSave(payload)
      onClose()
    } catch (err) {
      setError(err.message || 'Erreur lors de la sauvegarde')
    } finally {
      setSaving(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="fade-in" style={{
        background: '#1E293B',
        borderRadius: '16px',
        padding: '32px',
        width: '680px',
        maxWidth: '95vw',
        maxHeight: '92vh',
        overflowY: 'auto',
        border: '1px solid #334155',
        boxShadow: '0 25px 60px rgba(0,0,0,0.6)'
      }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '28px' }}>
          <div>
            <h2 style={{ color: '#F1F5F9', fontSize: '20px', fontWeight: 800 }}>
              {rdv ? 'Modifier le RDV' : 'Nouveau rendez-vous'}
            </h2>
            <p style={{ color: '#64748B', fontSize: '13px', marginTop: '2px' }}>
              {rdv ? `RDV #${rdv.id}` : 'Remplissez les informations du rendez-vous'}
            </p>
          </div>
          <button
            onClick={onClose}
            style={{ background: 'transparent', border: 'none', color: '#64748B', cursor: 'pointer', padding: '4px' }}
          >
            <X size={22} />
          </button>
        </div>

        {error && (
          <div style={{ background: '#EF444420', border: '1px solid #EF4444', borderRadius: '8px', padding: '12px 16px', color: '#EF4444', fontSize: '13px', marginBottom: '20px' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {/* Row 1: Date + Heure */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
            <Field label="Date *">
              <input type="date" value={form.date} onChange={e => set('date', e.target.value)} style={INPUT_STYLE} required />
            </Field>
            <Field label="Heure">
              <input type="time" value={form.heure} onChange={e => set('heure', e.target.value)} style={INPUT_STYLE} />
            </Field>
          </div>

          {/* Row 2: Nom + Téléphone */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
            <Field label="Nom du client *">
              <input type="text" value={form.nom_client} onChange={e => set('nom_client', e.target.value)}
                placeholder="Dupont Marie" style={INPUT_STYLE} required />
            </Field>
            <Field label="Téléphone">
              <input type="tel" value={form.telephone} onChange={e => set('telephone', e.target.value)}
                placeholder="06 12 34 56 78" style={INPUT_STYLE} />
            </Field>
          </div>

          {/* Adresse */}
          <div style={{ marginBottom: '16px' }}>
            <Field label="Adresse (inclure le code postal)">
              <input type="text" value={form.adresse} onChange={e => set('adresse', e.target.value)}
                placeholder="12 rue des Lilas, 06000 Nice" style={INPUT_STYLE} />
            </Field>
          </div>

          {/* Row 3: Travaux + Statut conf */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
            <Field label="Type de travaux">
              <select value={form.travaux} onChange={e => set('travaux', e.target.value)} style={INPUT_STYLE}>
                {TRAVAUX_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
              </select>
            </Field>
            <Field label="Statut confirmation">
              <select value={form.statut_confirmation} onChange={e => set('statut_confirmation', e.target.value)} style={INPUT_STYLE}>
                {CONFIRMATION_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
              </select>
            </Field>
          </div>

          {/* Row 4: Statut résultat + RAC */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
            <Field label="Statut résultat">
              <select value={form.statut_resultat} onChange={e => set('statut_resultat', e.target.value)} style={INPUT_STYLE}>
                {RESULTAT_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
              </select>
            </Field>
            <Field label="Reste à charge (€)">
              <input type="number" value={form.reste_a_charge} onChange={e => set('reste_a_charge', e.target.value)}
                placeholder="2 500" min="0" step="100" style={INPUT_STYLE} />
            </Field>
          </div>

          {/* Notes */}
          <div style={{ marginBottom: '28px' }}>
            <Field label="Notes">
              <textarea value={form.notes} onChange={e => set('notes', e.target.value)}
                rows={3} placeholder="Observations, informations complémentaires…"
                style={{ ...INPUT_STYLE, resize: 'vertical', lineHeight: '1.5' }} />
            </Field>
          </div>

          {/* Buttons */}
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
            <button
              type="button" onClick={onClose}
              style={{
                padding: '10px 20px', borderRadius: '8px',
                border: '1px solid #334155', background: 'transparent',
                color: '#94A3B8', fontSize: '14px', fontWeight: 500, cursor: 'pointer'
              }}
            >
              Annuler
            </button>
            <button
              type="submit" disabled={saving}
              style={{
                padding: '10px 24px', borderRadius: '8px', border: 'none',
                background: saving ? '#1D4ED8' : '#3B82F6',
                color: '#fff', fontSize: '14px', fontWeight: 600,
                cursor: saving ? 'not-allowed' : 'pointer',
                opacity: saving ? 0.8 : 1
              }}
            >
              {saving ? 'Enregistrement…' : (rdv ? 'Enregistrer' : 'Créer le RDV')}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
