const express = require('express');
const cors = require('cors');
const path = require('path');
const multer = require('multer');
const { GoogleGenerativeAI } = require('@google/generative-ai');

// Init DB first (creates tables + seeds if empty)
const { db, extractDepartement, normalizeDate, normVal } = require('./database');

// Multer — stockage en mémoire (pas de fichier temporaire sur disque)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 }, // 20 Mo max
  fileFilter: (_, file, cb) => {
    if (file.mimetype.startsWith('image/')) cb(null, true);
    else cb(new Error('Seules les images sont acceptées'));
  }
});

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

// POST /api/import-screenshot — Analyse une image WhatsApp avec Gemini Vision
app.post('/api/import-screenshot', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'Image manquante. Envoyez le fichier dans le champ "image".' });

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) return res.status(500).json({ error: 'GEMINI_API_KEY non configurée sur le serveur.' });

    // Convertir le buffer en base64 pour l'API Gemini
    const base64Image = req.file.buffer.toString('base64');
    const mimeType = req.file.mimetype;

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

    const prompt = `Analyse ce screenshot de planning WhatsApp.
Extrais TOUS les RDV en JSON : [{date, heure, nom_client, adresse, telephone, travaux, statut_confirmation, notes}]
Réponds UNIQUEMENT avec le tableau JSON.`;

    const imagePart = {
      inlineData: { data: base64Image, mimeType }
    };

    const result = await model.generateContent([prompt, imagePart]);
    let text = result.response.text().trim();

    // Nettoyer les éventuels blocs markdown ```json...```
    text = text.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```\s*$/i, '').trim();

    let rdvs;
    try {
      rdvs = JSON.parse(text);
    } catch {
      return res.status(422).json({ error: 'Gemini n\'a pas retourné un JSON valide. Essayez avec un screenshot plus lisible.' });
    }

    if (!Array.isArray(rdvs)) rdvs = [rdvs];

    // Normaliser dates (DD/MM/YYYY → YYYY-MM-DD) et valeurs vides
    rdvs = rdvs.map(r => ({
      ...r,
      date:                normalizeDate(r.date),
      heure:               normVal(r.heure),
      nom_client:          normVal(r.nom_client),
      adresse:             normVal(r.adresse),
      telephone:           normVal(r.telephone),
      travaux:             normVal(r.travaux),
      statut_confirmation: normVal(r.statut_confirmation),
      notes:               normVal(r.notes),
    }));

    res.json({ rdvs, count: rdvs.length });
  } catch (err) {
    console.error('❌ import-screenshot:', err.message);
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
