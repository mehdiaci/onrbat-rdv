const express = require('express');
const router = express.Router();
const { db, extractDepartement } = require('../database');

// GET /api/rdv
router.get('/', (req, res) => {
  try {
    const { dateFrom, dateTo, statut, departement, travaux, search, limit = 1000, offset = 0 } = req.query;

    let query = 'SELECT * FROM rdv WHERE 1=1';
    const params = [];

    if (dateFrom) { query += ' AND date >= ?'; params.push(dateFrom); }
    if (dateTo)   { query += ' AND date <= ?'; params.push(dateTo); }
    if (statut) { query += ' AND statut_resultat = ?'; params.push(statut); }
    if (departement) { query += ' AND departement = ?'; params.push(departement); }
    if (travaux) { query += ' AND travaux = ?'; params.push(travaux); }
    if (search) {
      query += ' AND (nom_client LIKE ? OR adresse LIKE ? OR telephone LIKE ?)';
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }

    const countQuery = query.replace('SELECT *', 'SELECT COUNT(*) as count');
    const total = db.prepare(countQuery).get(...params);

    query += ' ORDER BY date DESC, heure ASC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), parseInt(offset));

    const rdvs = db.prepare(query).all(...params);
    res.json({ data: rdvs, total: total.count });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/rdv
router.post('/', (req, res) => {
  try {
    const { date, heure, nom_client, adresse, telephone, travaux,
      statut_confirmation, statut_resultat, reste_a_charge, notes } = req.body;
    const departement = extractDepartement(adresse);

    const stmt = db.prepare(`
      INSERT INTO rdv (date, heure, nom_client, adresse, telephone, travaux,
        statut_confirmation, statut_resultat, reste_a_charge, departement, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const result = stmt.run(
      date, heure, nom_client, adresse, telephone, travaux,
      statut_confirmation, statut_resultat,
      reste_a_charge != null && reste_a_charge !== '' ? parseFloat(reste_a_charge) : null,
      departement, notes || null
    );
    const newRdv = db.prepare('SELECT * FROM rdv WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json(newRdv);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/rdv/:id
router.put('/:id', (req, res) => {
  try {
    const { id } = req.params;
    const { date, heure, nom_client, adresse, telephone, travaux,
      statut_confirmation, statut_resultat, reste_a_charge, notes } = req.body;
    const departement = extractDepartement(adresse);

    const stmt = db.prepare(`
      UPDATE rdv SET
        date = ?, heure = ?, nom_client = ?, adresse = ?, telephone = ?,
        travaux = ?, statut_confirmation = ?, statut_resultat = ?,
        reste_a_charge = ?, departement = ?, notes = ?
      WHERE id = ?
    `);
    const result = stmt.run(
      date, heure, nom_client, adresse, telephone, travaux,
      statut_confirmation, statut_resultat,
      reste_a_charge != null && reste_a_charge !== '' ? parseFloat(reste_a_charge) : null,
      departement, notes || null, id
    );
    if (result.changes === 0) return res.status(404).json({ error: 'RDV non trouvé' });

    const updated = db.prepare('SELECT * FROM rdv WHERE id = ?').get(id);
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/rdv/:id
router.delete('/:id', (req, res) => {
  try {
    const { id } = req.params;
    const result = db.prepare('DELETE FROM rdv WHERE id = ?').run(id);
    if (result.changes === 0) return res.status(404).json({ error: 'RDV non trouvé' });
    res.json({ message: 'RDV supprimé' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
