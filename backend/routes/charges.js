const express = require('express');
const router = express.Router();
const { db } = require('../database');

// ── Helpers ───────────────────────────────────────────────────────────────
function buildDateFilter(periode, date_debut, date_fin, params) {
  let f = '';
  if (periode === 'semaine') {
    f += " AND strftime('%Y-%W', date) = strftime('%Y-%W', date('now'))";
  } else if (periode === 'mois') {
    f += " AND strftime('%Y-%m', date) = strftime('%Y-%m', date('now'))";
  } else if (periode === 'trimestre') {
    f += " AND date >= date('now', '-3 months')";
  }
  if (date_debut) { f += ' AND date >= ?'; params.push(date_debut); }
  if (date_fin)   { f += ' AND date <= ?'; params.push(date_fin); }
  return f;
}

// ── GET /api/charges/stats  (doit être AVANT /:id) ────────────────────────
router.get('/stats', (req, res) => {
  try {
    const { periode, date_debut, date_fin } = req.query;
    const params = [];
    const df = buildDateFilter(periode, date_debut, date_fin, params);

    const total = db.prepare(
      `SELECT COALESCE(SUM(montant),0) as total, COUNT(*) as count FROM charges WHERE 1=1${df}`
    ).get(...params);

    const parType = db.prepare(
      `SELECT type, COALESCE(SUM(montant),0) as montant, COUNT(*) as count
       FROM charges WHERE 1=1${df} GROUP BY type ORDER BY montant DESC`
    ).all(...params);

    // Par semaine × type (pour stacked bar)
    const parSemaineRaw = db.prepare(
      `SELECT strftime('%Y-S%W', date) as semaine, type,
              COALESCE(SUM(montant),0) as montant
       FROM charges WHERE 1=1${df}
       GROUP BY semaine, type ORDER BY semaine`
    ).all(...params);

    // Par mois × type (pour stacked bar)
    const parMoisRaw = db.prepare(
      `SELECT strftime('%Y-%m', date) as mois, type,
              COALESCE(SUM(montant),0) as montant
       FROM charges WHERE 1=1${df}
       GROUP BY mois, type ORDER BY mois`
    ).all(...params);

    const gazole = db.prepare(
      `SELECT COALESCE(SUM(litres),0) as total_litres,
              AVG(CASE WHEN prix_litre > 0 THEN prix_litre ELSE NULL END) as prix_moyen
       FROM charges WHERE type='Gazole' AND 1=1${df}`
    ).get(...params);

    const peage = db.prepare(
      `SELECT COALESCE(SUM(kilometrage),0) as total_km,
              COALESCE(SUM(montant),0) as total_montant
       FROM charges WHERE type='Péage' AND 1=1${df}`
    ).get(...params);

    const entretien = db.prepare(
      `SELECT COALESCE(SUM(montant),0) as total
       FROM charges WHERE type IN ('Entretien','Pneus','Réparation') AND 1=1${df}`
    ).get(...params);

    // Évolution prix gazole dans le temps
    const prixGazoleEvolution = db.prepare(
      `SELECT date, ROUND(AVG(prix_litre),3) as prix_litre
       FROM charges WHERE type='Gazole' AND prix_litre > 0 AND 1=1${df}
       GROUP BY date ORDER BY date`
    ).all(...params);

    // Tableau mensuel récapitulatif
    const monthlyTable = db.prepare(
      `SELECT
        strftime('%Y-%m', date) as mois,
        COUNT(DISTINCT date) as jours_travailles,
        COALESCE(SUM(CASE WHEN type='Péage' THEN kilometrage ELSE 0 END),0) as km_peages,
        COALESCE(SUM(CASE WHEN type='Gazole' THEN montant ELSE 0 END),0) as gazole_eur,
        COALESCE(SUM(CASE WHEN type='Péage' THEN montant ELSE 0 END),0) as peages_eur,
        COALESCE(SUM(CASE WHEN type IN ('Entretien','Pneus','Réparation') THEN montant ELSE 0 END),0) as entretien_eur,
        COALESCE(SUM(CASE WHEN type NOT IN ('Gazole','Péage','Entretien','Pneus','Réparation') THEN montant ELSE 0 END),0) as autres_eur,
        COALESCE(SUM(montant),0) as total_eur
       FROM charges WHERE 1=1${df}
       GROUP BY mois ORDER BY mois DESC`
    ).all(...params);

    // Km par semaine (pour bar chart)
    const kmParSemaine = db.prepare(
      `SELECT strftime('%Y-S%W', date) as semaine,
              COALESCE(SUM(kilometrage),0) as km
       FROM charges WHERE type='Péage' AND 1=1${df}
       GROUP BY semaine ORDER BY semaine`
    ).all(...params);

    // Indicateurs dérivés
    const distinctDays  = db.prepare(`SELECT COUNT(DISTINCT date) as n FROM charges WHERE 1=1${df}`).get(...params).n;
    const distinctWeeks = db.prepare(`SELECT COUNT(DISTINCT strftime('%Y-%W',date)) as n FROM charges WHERE 1=1${df}`).get(...params).n;
    const distinctMonths= db.prepare(`SELECT COUNT(DISTINCT strftime('%Y-%m',date)) as n FROM charges WHERE 1=1${df}`).get(...params).n;

    const totalKm = peage.total_km || 0;

    res.json({
      total_periode:       total.total,
      count_periode:       total.count,
      par_type:            parType,
      par_semaine:         parSemaineRaw,
      par_mois:            parMoisRaw,
      total_litres_gazole: gazole.total_litres,
      prix_moyen_litre:    gazole.prix_moyen || 0,
      total_km_peages:     totalKm,
      total_peages_eur:    peage.total_montant,
      total_entretien_eur: entretien.total,
      cout_moyen_par_jour: distinctDays  > 0 ? total.total / distinctDays  : 0,
      cout_moyen_semaine:  distinctWeeks > 0 ? total.total / distinctWeeks : 0,
      cout_moyen_mois:     distinctMonths> 0 ? total.total / distinctMonths: 0,
      cout_par_km:         totalKm       > 0 ? total.total / totalKm       : 0,
      km_moyen_jour:       distinctDays  > 0 ? totalKm / distinctDays      : 0,
      km_moyen_semaine:    distinctWeeks > 0 ? totalKm / distinctWeeks     : 0,
      km_moyen_mois:       distinctMonths> 0 ? totalKm / distinctMonths    : 0,
      prix_gazole_evolution: prixGazoleEvolution,
      km_par_semaine:      kmParSemaine,
      monthly_table:       monthlyTable,
      distinct_days:       distinctDays,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/charges ──────────────────────────────────────────────────────
router.get('/', (req, res) => {
  try {
    const { date_debut, date_fin, type, limit = 100, offset = 0 } = req.query;
    let query = 'SELECT * FROM charges WHERE 1=1';
    const params = [];
    if (date_debut) { query += ' AND date >= ?'; params.push(date_debut); }
    if (date_fin)   { query += ' AND date <= ?'; params.push(date_fin); }
    if (type)       { query += ' AND type = ?';  params.push(type); }

    const countQuery = query.replace('SELECT *', 'SELECT COUNT(*) as count');
    const total = db.prepare(countQuery).get(...params).count;

    query += ' ORDER BY date DESC, created_at DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), parseInt(offset));
    const charges = db.prepare(query).all(...params);

    res.json({ charges, total });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/charges ─────────────────────────────────────────────────────
router.post('/', (req, res) => {
  try {
    const { date, type, fournisseur, ville, montant, litres, prix_litre, kilometrage, notes } = req.body;
    if (!date || !type || montant == null) {
      return res.status(400).json({ error: 'Champs requis : date, type, montant' });
    }
    const result = db.prepare(
      `INSERT INTO charges (date,type,fournisseur,ville,montant,litres,prix_litre,kilometrage,notes)
       VALUES (?,?,?,?,?,?,?,?,?)`
    ).run(date, type, fournisseur || null, ville || null, parseFloat(montant),
          litres ? parseFloat(litres) : null,
          prix_litre ? parseFloat(prix_litre) : null,
          kilometrage ? parseFloat(kilometrage) : null,
          notes || null);
    const created = db.prepare('SELECT * FROM charges WHERE id=?').get(result.lastInsertRowid);
    res.status(201).json(created);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/charges/import ──────────────────────────────────────────────
router.post('/import', (req, res) => {
  try {
    const items = req.body;
    if (!Array.isArray(items)) return res.status(400).json({ error: 'Tableau JSON attendu' });
    const insert = db.prepare(
      `INSERT INTO charges (date,type,fournisseur,ville,montant,litres,prix_litre,kilometrage,notes)
       VALUES (?,?,?,?,?,?,?,?,?)`
    );
    const insertMany = db.transaction((rows) => {
      for (const c of rows) {
        insert.run(
          c.date, c.type, c.fournisseur || null, c.ville || null,
          parseFloat(c.montant),
          c.litres ? parseFloat(c.litres) : null,
          c.prix_litre ? parseFloat(c.prix_litre) : null,
          c.kilometrage ? parseFloat(c.kilometrage) : null,
          c.notes || null
        );
      }
    });
    insertMany(items);
    res.json({ message: `${items.length} charges importées`, count: items.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── PUT /api/charges/:id ──────────────────────────────────────────────────
router.put('/:id', (req, res) => {
  try {
    const { date, type, fournisseur, ville, montant, litres, prix_litre, kilometrage, notes } = req.body;
    const result = db.prepare(
      `UPDATE charges SET date=?,type=?,fournisseur=?,ville=?,montant=?,
       litres=?,prix_litre=?,kilometrage=?,notes=? WHERE id=?`
    ).run(date, type, fournisseur || null, ville || null, parseFloat(montant),
          litres ? parseFloat(litres) : null,
          prix_litre ? parseFloat(prix_litre) : null,
          kilometrage ? parseFloat(kilometrage) : null,
          notes || null, req.params.id);
    if (result.changes === 0) return res.status(404).json({ error: 'Charge introuvable' });
    res.json(db.prepare('SELECT * FROM charges WHERE id=?').get(req.params.id));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── DELETE /api/charges/:id ───────────────────────────────────────────────
router.delete('/:id', (req, res) => {
  try {
    const result = db.prepare('DELETE FROM charges WHERE id=?').run(req.params.id);
    if (result.changes === 0) return res.status(404).json({ error: 'Charge introuvable' });
    res.json({ message: 'Supprimé' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
