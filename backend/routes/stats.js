const express = require('express');
const router = express.Router();
const { db } = require('../database');

router.get('/', (req, res) => {
  try {
    const { periode, departement } = req.query;

    let dateFilter = '';
    const params = [];

    if (periode === 'semaine') {
      dateFilter += " AND date >= date('now', '-7 days')";
    } else if (periode === 'mois') {
      dateFilter += " AND date >= date('now', 'start of month')";
    }
    if (departement) {
      dateFilter += ' AND departement = ?';
      params.push(departement);
    }

    // Total RDV
    const totalRdv = db.prepare(`SELECT COUNT(*) as count FROM rdv WHERE 1=1 ${dateFilter}`).get(...params);

    // Devis signés + RAC
    const signedRdv = db.prepare(`
      SELECT COUNT(*) as count, COALESCE(SUM(reste_a_charge), 0) as total_rac
      FROM rdv WHERE statut_resultat = 'Devis signé' ${dateFilter}
    `).get(...params);

    // Visités (RDV qui ont eu lieu = pas NRP ni En attente)
    const visitedRdv = db.prepare(`
      SELECT COUNT(*) as count FROM rdv
      WHERE statut_resultat IS NOT NULL
        AND statut_resultat NOT IN ('NRP', 'En attente')
        ${dateFilter}
    `).get(...params);

    // RDV cette semaine (toujours sans filtre période)
    const thisWeekRdv = db.prepare(`SELECT COUNT(*) as count FROM rdv WHERE date >= date('now', '-7 days')`).get();

    // Répartition par statut résultat
    const statutRepartition = db.prepare(`
      SELECT statut_resultat, COUNT(*) as count
      FROM rdv WHERE 1=1 ${dateFilter}
      GROUP BY statut_resultat ORDER BY count DESC
    `).all(...params);

    // Top départements
    const topDepartements = db.prepare(`
      SELECT departement, COUNT(*) as count
      FROM rdv WHERE departement IS NOT NULL ${dateFilter}
      GROUP BY departement ORDER BY count DESC LIMIT 10
    `).all(...params);

    // Performance par type de travaux
    const byTravaux = db.prepare(`
      SELECT
        COALESCE(travaux, 'Non défini') as travaux,
        COUNT(*) as total,
        SUM(CASE WHEN statut_resultat = 'Devis signé' THEN 1 ELSE 0 END) as signes,
        COALESCE(SUM(CASE WHEN statut_resultat = 'Devis signé' THEN reste_a_charge ELSE 0 END), 0) as rac_total
      FROM rdv WHERE 1=1 ${dateFilter}
      GROUP BY travaux ORDER BY total DESC
    `).all(...params);

    // Évolution par semaine (8 dernières semaines, fixe)
    const evolutionSemaine = db.prepare(`
      SELECT
        strftime('%Y-W%W', date) as semaine,
        COUNT(*) as total,
        SUM(CASE WHEN statut_resultat = 'Devis signé' THEN 1 ELSE 0 END) as signes
      FROM rdv WHERE date >= date('now', '-56 days')
      GROUP BY semaine ORDER BY semaine ASC
    `).all();

    // Performance par département
    const byDepartement = db.prepare(`
      SELECT
        departement,
        COUNT(*) as total,
        SUM(CASE WHEN statut_resultat = 'Devis signé' THEN 1 ELSE 0 END) as signes,
        COALESCE(SUM(CASE WHEN statut_resultat = 'Devis signé' THEN reste_a_charge ELSE 0 END), 0) as rac_total
      FROM rdv WHERE departement IS NOT NULL ${dateFilter}
      GROUP BY departement ORDER BY total DESC
    `).all(...params);

    // 10 derniers RDV
    const recentRdv = db.prepare(`SELECT * FROM rdv ORDER BY created_at DESC LIMIT 10`).all();

    const tauxConcretisation = visitedRdv.count > 0
      ? parseFloat(((signedRdv.count / visitedRdv.count) * 100).toFixed(1))
      : 0;

    res.json({
      kpis: {
        totalRdv: totalRdv.count,
        tauxConcretisation,
        totalRacSigne: signedRdv.total_rac || 0,
        rdvCetteSemaine: thisWeekRdv.count,
        totalSignes: signedRdv.count,
        totalVisites: visitedRdv.count
      },
      statutRepartition,
      topDepartements,
      byTravaux,
      evolutionSemaine,
      byDepartement,
      recentRdv
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
