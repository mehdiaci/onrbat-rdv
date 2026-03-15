const express = require('express');
const cors = require('cors');
const path = require('path');

// Init DB first (creates tables + seeds if empty)
const { db, extractDepartement } = require('./database');

const rdvRoutes = require('./routes/rdv');
const statsRoutes = require('./routes/stats');

const app = express();
const PORT = process.env.PORT || 3001;
const isProd = process.env.NODE_ENV === 'production';

// En dev, autoriser le port 5173 du frontend Vite; en prod tout vient du même domaine
app.use(cors({ origin: isProd ? false : 'http://localhost:5173' }));
app.use(express.json({ limit: '20mb' }));

// Routes
app.use('/api/rdv', rdvRoutes);
app.use('/api/stats', statsRoutes);

// POST /api/import
app.post('/api/import', (req, res) => {
  try {
    const rdvs = req.body;
    if (!Array.isArray(rdvs)) {
      return res.status(400).json({ error: 'Le body doit être un tableau JSON' });
    }
    const insert = db.prepare(`
      INSERT INTO rdv (date, heure, nom_client, adresse, telephone, travaux,
        statut_confirmation, statut_resultat, reste_a_charge, departement, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const insertMany = db.transaction((items) => {
      for (const rdv of items) {
        const dep = rdv.departement || extractDepartement(rdv.adresse);
        insert.run(
          rdv.date || null, rdv.heure || null, rdv.nom_client || null,
          rdv.adresse || null, rdv.telephone || null, rdv.travaux || null,
          rdv.statut_confirmation || null, rdv.statut_resultat || null,
          rdv.reste_a_charge != null ? parseFloat(rdv.reste_a_charge) : null,
          dep, rdv.notes || null
        );
      }
    });
    insertMany(rdvs);
    res.json({ message: `${rdvs.length} RDV importés avec succès`, count: rdvs.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// En production : servir le build React et SPA fallback
if (isProd) {
  const distPath = path.join(__dirname, 'public');
  app.use(express.static(distPath));
  app.get('*', (req, res) => {
    res.sendFile(path.join(distPath, 'index.html'));
  });
}

app.listen(PORT, () => {
  console.log(`🚀 Serveur ONRBAT démarré sur http://localhost:${PORT}`);
});
