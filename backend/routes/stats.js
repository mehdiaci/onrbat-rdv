const express = require('express');
const router = express.Router();
const { db } = require('../database');

// Statuts comptant comme "RDV visité" au dénominateur du taux de concrétisation
// RDV visité = le commercial a rencontré le client (signé, refus en face-à-face, refus à la porte)
const VISITED_STATUTS = `('Devis signé', 'Refus', 'Refus de passage')`;

// Types de travaux non pertinents pour les stats
const EXCLUDED_TRAVAUX = `(
  'Retour MPR', 'Non défini',
  'Admin (récupération docs)', 'Admin (passage huissier)',
  'PAC (remplacement 2007)', 'PAC (fix. RDV installation)',
  'Admin (récupération docs fin chantier)', 'Admin (questionnaire MAR)',
  'Admin (facture ITE)', 'Admin (acte notarié)'
)`;

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

    // ─── Total RDV ───
    const totalRdv = db.prepare(
      `SELECT COUNT(*) as count FROM rdv WHERE 1=1 ${dateFilter}`
    ).get(...params);

    // ─── Devis signés + RAC ───
    const signedRdv = db.prepare(`
      SELECT COUNT(*) as count, COALESCE(SUM(reste_a_charge), 0) as total_rac
      FROM rdv WHERE statut_resultat = 'Devis signé' ${dateFilter}
    `).get(...params);

    // ─── Dénominateur taux : RDV visités uniquement ───
    // Visité = Devis signé | Refus | Refus de passage
    const visitedRdv = db.prepare(`
      SELECT COUNT(*) as count FROM rdv
      WHERE statut_resultat IN ${VISITED_STATUTS}
        ${dateFilter}
    `).get(...params);

    // ─── RDV cette semaine (toujours sans filtre période) ───
    const thisWeekRdv = db.prepare(
      `SELECT COUNT(*) as count FROM rdv WHERE date >= date('now', '-7 days')`
    ).get();

    // ─── Taux du jour ───
    const rdvJour = db.prepare(`
      SELECT
        COUNT(*) as denominateur,
        SUM(CASE WHEN statut_resultat = 'Devis signé' THEN 1 ELSE 0 END) as signes
      FROM rdv
      WHERE date = date('now')
        AND statut_resultat IN ${VISITED_STATUTS}
    `).get();

    // ─── Taux semaine en cours ───
    const rdvSemaineCourante = db.prepare(`
      SELECT
        COUNT(*) as denominateur,
        SUM(CASE WHEN statut_resultat = 'Devis signé' THEN 1 ELSE 0 END) as signes
      FROM rdv
      WHERE strftime('%Y-%W', date) = strftime('%Y-%W', date('now'))
        AND statut_resultat IN ${VISITED_STATUTS}
    `).get();

    // ─── Taux du mois en cours ───
    const rdvMoisCourant = db.prepare(`
      SELECT
        COUNT(*) as denominateur,
        SUM(CASE WHEN statut_resultat = 'Devis signé' THEN 1 ELSE 0 END) as signes
      FROM rdv
      WHERE strftime('%Y-%m', date) = strftime('%Y-%m', date('now'))
        AND statut_resultat IN ${VISITED_STATUTS}
    `).get();

    // ─── Répartition par statut résultat ───
    const statutRepartition = db.prepare(`
      SELECT statut_resultat, COUNT(*) as count
      FROM rdv WHERE 1=1 ${dateFilter}
      GROUP BY statut_resultat ORDER BY count DESC
    `).all(...params);

    // ─── Top départements ───
    const topDepartements = db.prepare(`
      SELECT departement, COUNT(*) as count
      FROM rdv WHERE departement IS NOT NULL ${dateFilter}
      GROUP BY departement ORDER BY count DESC LIMIT 10
    `).all(...params);

    // ─── Performance par type de travaux (nettoyée) ───
    const byTravaux = db.prepare(`
      SELECT
        COALESCE(travaux, 'Non défini') as travaux,
        COUNT(*) as total,
        SUM(CASE WHEN statut_resultat IN ${VISITED_STATUTS} THEN 1 ELSE 0 END) as visitees,
        SUM(CASE WHEN statut_resultat = 'Devis signé' THEN 1 ELSE 0 END) as signes,
        COALESCE(SUM(CASE WHEN statut_resultat = 'Devis signé' THEN reste_a_charge ELSE 0 END), 0) as rac_total
      FROM rdv WHERE 1=1 ${dateFilter}
        AND travaux IS NOT NULL
        AND travaux NOT IN ${EXCLUDED_TRAVAUX}
      GROUP BY travaux ORDER BY total DESC
    `).all(...params);

    // ─── Évolution par semaine (8 dernières semaines) avec taux ───
    const evolutionSemaine = db.prepare(`
      SELECT
        strftime('%Y-W%W', date) as semaine,
        COUNT(*) as total,
        SUM(CASE WHEN statut_resultat = 'Devis signé' THEN 1 ELSE 0 END) as signes,
        SUM(CASE WHEN statut_resultat IN ${VISITED_STATUTS}
          THEN 1 ELSE 0 END) as denominateur
      FROM rdv WHERE date >= date('now', '-56 days')
      GROUP BY semaine ORDER BY semaine ASC
    `).all();

    // ─── Performance par tranche horaire (devis signés) ───
    const byHeureRaw = db.prepare(`
      SELECT
        CAST(CASE
          WHEN instr(heure, 'H') > 0 THEN substr(heure, 1, instr(heure, 'H') - 1)
          ELSE '0'
        END AS INTEGER) as tranche,
        COUNT(*) as signes
      FROM rdv
      WHERE statut_resultat = 'Devis signé'
        AND heure IS NOT NULL AND heure != ''
        AND instr(heure, 'H') > 0
        ${dateFilter}
      GROUP BY tranche
      HAVING tranche >= 8 AND tranche <= 20
      ORDER BY tranche ASC
    `).all(...params);

    // Remplir les heures manquantes 9→18
    const heuresSlots = [9, 10, 11, 12, 13, 14, 15, 16, 17, 18];
    const byHeureMap = {};
    byHeureRaw.forEach(r => { byHeureMap[r.tranche] = r.signes; });
    const byHeure = heuresSlots.map(h => ({
      heure: `${h}H`,
      signes: byHeureMap[h] || 0
    }));

    // ─── Performance par département ───
    const byDepartement = db.prepare(`
      SELECT
        departement,
        COUNT(*) as total,
        SUM(CASE WHEN statut_resultat IN ${VISITED_STATUTS} THEN 1 ELSE 0 END) as visitees,
        SUM(CASE WHEN statut_resultat = 'Devis signé' THEN 1 ELSE 0 END) as signes,
        COALESCE(SUM(CASE WHEN statut_resultat = 'Devis signé' THEN reste_a_charge ELSE 0 END), 0) as rac_total
      FROM rdv WHERE departement IS NOT NULL ${dateFilter}
      GROUP BY departement ORDER BY total DESC
    `).all(...params);

    // ─── 10 derniers RDV ───
    const recentRdv = db.prepare(
      `SELECT * FROM rdv ORDER BY created_at DESC LIMIT 10`
    ).all();

    // ─── Calculs taux ───
    const tauxConcretisation = visitedRdv.count > 0
      ? parseFloat(((signedRdv.count / visitedRdv.count) * 100).toFixed(1))
      : 0;

    const tauxJour = rdvJour.denominateur > 0
      ? parseFloat(((rdvJour.signes / rdvJour.denominateur) * 100).toFixed(1))
      : null;

    const tauxSemaineCourante = rdvSemaineCourante.denominateur > 0
      ? parseFloat(((rdvSemaineCourante.signes / rdvSemaineCourante.denominateur) * 100).toFixed(1))
      : null;

    const tauxMoisCourant = rdvMoisCourant.denominateur > 0
      ? parseFloat(((rdvMoisCourant.signes / rdvMoisCourant.denominateur) * 100).toFixed(1))
      : null;

    // Ajouter taux% à l'évolution hebdo
    const evolutionAvecTaux = evolutionSemaine.map(s => ({
      ...s,
      taux: s.denominateur > 0
        ? parseFloat(((s.signes / s.denominateur) * 100).toFixed(1))
        : 0
    }));

    res.json({
      kpis: {
        totalRdv: totalRdv.count,
        tauxConcretisation,
        totalRacSigne: signedRdv.total_rac || 0,
        rdvCetteSemaine: thisWeekRdv.count,
        totalSignes: signedRdv.count,
        totalVisites: visitedRdv.count,
        // Taux par période
        tauxJour,
        signesJour: rdvJour.signes,
        rdvJourDenominateur: rdvJour.denominateur,
        tauxSemaineCourante,
        signesSemaine: rdvSemaineCourante.signes,
        rdvSemaineDenominateur: rdvSemaineCourante.denominateur,
        tauxMoisCourant,
        signesMois: rdvMoisCourant.signes,
        rdvMoisDenominateur: rdvMoisCourant.denominateur,
      },
      statutRepartition,
      topDepartements,
      byTravaux,
      evolutionSemaine: evolutionAvecTaux,
      byDepartement,
      byHeure,
      recentRdv
    });
  } catch (err) {
    console.error('Stats error:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
