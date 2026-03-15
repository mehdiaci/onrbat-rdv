# ONRBAT — Gestion des Rendez-vous Commerciaux

Application web locale de gestion des RDV pour une entreprise de rénovation énergétique.

**Stack :** React (Vite) + Express.js + SQLite (better-sqlite3)

---

## Prérequis

- **Node.js** ≥ 18 ([nodejs.org](https://nodejs.org))
- **npm** ≥ 9
- Sur macOS : les **Xcode Command Line Tools** sont requis pour compiler `better-sqlite3`
  ```bash
  xcode-select --install
  ```

---

## Installation et lancement

### 1. Installer toutes les dépendances

```bash
npm install
```

Cette commande installe automatiquement les dépendances du backend (`/backend`) et du frontend (`/frontend`).

### 2. Lancer l'application

```bash
npm run dev
```

- **Backend** → `http://localhost:3001`
- **Frontend** → `http://localhost:5173`

Ouvrez votre navigateur sur **http://localhost:5173**

---

## Données initiales (seed)

Au premier lancement, si la base de données est vide, le fichier `backend/seed.json` est importé automatiquement (30 RDV d'exemple).

**Pour utiliser votre propre fichier seed :**
1. Remplacez `backend/seed.json` par votre fichier JSON
2. Supprimez `backend/rdv.db` si la base est déjà créée
3. Relancez `npm run dev`

### Format du JSON seed

```json
[
  {
    "date": "2026-03-15",
    "heure": "09:00",
    "nom_client": "Dupont Marie",
    "adresse": "45 avenue Jean Médecin, 06000 Nice",
    "telephone": "0612345678",
    "travaux": "PAC",
    "statut_confirmation": "Confirmé",
    "statut_resultat": "Devis signé",
    "reste_a_charge": 2800,
    "notes": "Client très motivé"
  }
]
```

> **Note :** Le département est extrait automatiquement du code postal dans l'adresse.

---

## Structure des fichiers

```
/Application ONRBAT
├── package.json           ← Scripts racine + concurrently
├── README.md
│
├── /backend
│   ├── server.js          ← Serveur Express (port 3001)
│   ├── database.js        ← Init SQLite + seed auto
│   ├── seed.json          ← Données initiales (modifiable)
│   ├── rdv.db             ← Base de données (générée auto)
│   ├── package.json
│   └── routes/
│       ├── rdv.js         ← CRUD RDV
│       └── stats.js       ← Statistiques
│
└── /frontend
    ├── vite.config.js
    ├── index.html
    ├── package.json
    └── src/
        ├── App.jsx
        ├── main.jsx
        ├── index.css
        └── components/
            ├── Navbar.jsx
            ├── Dashboard.jsx   ← Vue 1 : Tableau de bord
            ├── RdvList.jsx     ← Vue 2 : Liste des RDV
            ├── RdvModal.jsx    ← Modal création/édition
            ├── Stats.jsx       ← Vue 3 : Statistiques
            └── KpiCard.jsx
```

---

## API REST (port 3001)

| Méthode | Route            | Description               |
|---------|------------------|---------------------------|
| GET     | `/api/rdv`       | Liste des RDV (avec filtres) |
| POST    | `/api/rdv`       | Créer un RDV              |
| PUT     | `/api/rdv/:id`   | Modifier un RDV           |
| DELETE  | `/api/rdv/:id`   | Supprimer un RDV          |
| GET     | `/api/stats`     | Statistiques globales     |
| POST    | `/api/import`    | Importer des RDV (JSON)   |

### Filtres disponibles sur GET /api/rdv

```
?search=dupont        # Recherche nom/adresse/téléphone
?date=2026-03-15      # Filtrer par date
?statut=Devis signé   # Filtrer par statut résultat
?travaux=PAC          # Filtrer par type de travaux
?departement=06       # Filtrer par département
?limit=20&offset=0    # Pagination
```

---

## Fonctionnalités

### Tableau de bord
- 4 KPIs : Total RDV, Taux de concrétisation, RAC total signé, RDV cette semaine
- Graphique répartition des résultats
- Top départements par volume
- Tableau des 10 derniers RDV

### Liste des RDV
- Recherche full-text
- Filtres : date, travaux, statut résultat, département
- Pagination (20 par page)
- Création / modification / suppression
- Export Excel (`.xlsx`) et PDF

### Statistiques
- Taux de concrétisation global et par type de travaux (PAC / Ampleur / Admin)
- Évolution hebdomadaire (8 semaines)
- Répartition des causes de non-signature (pie chart)
- Performance par département (bar chart + tableau)

---

## Commandes utiles

```bash
# Lancer les deux serveurs simultanément
npm run dev

# Lancer uniquement le backend
npm run dev:backend

# Lancer uniquement le frontend
npm run dev:frontend

# Réinstaller toutes les dépendances
npm run install:all
```

---

## Dépannage

**Erreur `node-gyp` ou `better-sqlite3` :**
```bash
xcode-select --install
cd backend && npm install
```

**La base de données ne se charge pas :**
- Vérifiez que le backend tourne sur le port 3001
- Regardez les logs dans le terminal backend

**Port déjà utilisé :**
```bash
lsof -i :3001   # Vérifier quel processus utilise le port
lsof -i :5173
```
