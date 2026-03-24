const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const DB_PATH = process.env.NODE_ENV === 'production'
  ? '/data/rdv.db'
  : path.join(__dirname, 'rdv.db');
const db = new Database(DB_PATH);

db.pragma('journal_mode = WAL');

db.exec(`
  CREATE TABLE IF NOT EXISTS charges (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    date TEXT NOT NULL,
    type TEXT NOT NULL,
    fournisseur TEXT,
    ville TEXT,
    montant REAL NOT NULL,
    litres REAL,
    prix_litre REAL,
    kilometrage REAL,
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS rdv (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    date TEXT,
    heure TEXT,
    nom_client TEXT,
    adresse TEXT,
    telephone TEXT,
    travaux TEXT,
    statut_confirmation TEXT,
    statut_resultat TEXT,
    reste_a_charge REAL,
    departement TEXT,
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

function extractDepartement(adresse) {
  if (!adresse) return null;
  const match = adresse.match(/\b(\d{5})\b/);
  if (match) return match[1].substring(0, 2);
  return null;
}

function normalizeDate(dateStr) {
  if (!dateStr) return null;
  const s = String(dateStr).trim();
  if (s === '–' || s === '-' || s === '') return null;
  const match = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (match) {
    const [, day, month, year] = match;
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  }
  return s;
}

function normVal(val) {
  if (val === null || val === undefined) return null;
  const s = String(val).trim();
  if (s === '–' || s === '-' || s === '') return null;
  return s;
}

function seedIfEmpty() {
  const count = db.prepare('SELECT COUNT(*) as count FROM rdv').get();
  if (count.count === 0) {
    const seedPath = path.join(__dirname, 'seed.json');
    if (fs.existsSync(seedPath)) {
      try {
        const seedData = JSON.parse(fs.readFileSync(seedPath, 'utf-8'));
        const insert = db.prepare(`
          INSERT INTO rdv (date, heure, nom_client, adresse, telephone, travaux,
            statut_confirmation, statut_resultat, reste_a_charge, departement, notes)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);
        const insertMany = db.transaction((rdvs) => {
          for (const rdv of rdvs) {
            const dep = normVal(rdv.departement) || extractDepartement(rdv.adresse);
            insert.run(
              normalizeDate(rdv.date), normVal(rdv.heure), normVal(rdv.nom_client),
              normVal(rdv.adresse), normVal(rdv.telephone), normVal(rdv.travaux),
              normVal(rdv.statut_confirmation), normVal(rdv.statut_resultat),
              rdv.reste_a_charge != null ? rdv.reste_a_charge : null,
              dep, normVal(rdv.notes)
            );
          }
        });
        insertMany(seedData);
        console.log(`✅ ${seedData.length} RDV importés depuis seed.json`);
      } catch (err) {
        console.error('❌ Erreur seeding:', err.message);
      }
    } else {
      console.log('ℹ️  Aucun seed.json trouvé, base vide');
    }
  }
}

seedIfEmpty();

// ── Migration : DD/MM/YYYY → YYYY-MM-DD (idempotente, SQL natif) ─────────────
// Une seule requête SQL convertit tous les "26/01/2026" en "2026-01-26".
// S'exécute à chaque démarrage sans effet si tout est déjà en ISO.
const migrationResult = db.prepare(`
  UPDATE rdv
  SET date = substr(date,7,4) || '-' || substr(date,4,2) || '-' || substr(date,1,2)
  WHERE date LIKE '__/__/____'
`).run();
if (migrationResult.changes > 0) {
  console.log(`✅ Migration dates: ${migrationResult.changes} ligne(s) converties DD/MM/YYYY → YYYY-MM-DD`);
}

// ── Vérification post-migration ───────────────────────────────────────────────
const badDates = db.prepare("SELECT COUNT(*) as n FROM rdv WHERE date IS NOT NULL AND date NOT LIKE '____-__-__'").get();
if (badDates.n > 0) {
  console.error(`❌ ${badDates.n} date(s) encore dans un format non-ISO — vérifiez la base.`);
} else {
  console.log('✅ Toutes les dates sont au format YYYY-MM-DD');
}

module.exports = { db, extractDepartement, normalizeDate, normVal };
