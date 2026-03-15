# Déploiement ONRBAT — VPS Hostinger Ubuntu 22.04

**IP du VPS :** `72.62.233.193`

---

## Architecture de production

```
Internet (HTTP 80 / HTTPS 443)
    │
    ▼
Nginx (reverse proxy)
    │  port 80  → redirect HTTPS (si domaine configuré)
    │  port 443 → SSL Let's Encrypt
    ▼
Docker container "onrbat" (port 3000)
    ├── Express.js  →  /api/*  (REST API)
    ├── Express.js  →  /*      (React build statique + SPA fallback)
    └── SQLite      →  /data/rdv.db  (volume Docker persistant)
```

---

## Étape 1 — Pousser le projet sur GitHub

```bash
# Sur votre Mac
cd "/Users/mehdi/Application ONRBAT"

# Le repo git est déjà initialisé. Il suffit de :
# 1. Créer un dépôt vide sur github.com (sans README, sans .gitignore)
# 2. Puis :
git remote add origin https://github.com/VOTRE-USER/onrbat.git
git branch -M main
git push -u origin main
```

> `backend/rdv.db` et `node_modules/` sont exclus par `.gitignore` — vos données ne seront pas publiées.

---

## Étape 2 — Se connecter au VPS en SSH

```bash
ssh root@72.62.233.193
```

---

## Étape 3 — Lancer le déploiement

### Option A — Accès par IP uniquement (immédiat, sans domaine)

```bash
# Sur le VPS :
curl -fsSL https://raw.githubusercontent.com/VOTRE-USER/onrbat/main/deploy.sh -o deploy.sh

sudo bash deploy.sh https://github.com/VOTRE-USER/onrbat.git
```

Application disponible sur : **http://72.62.233.193/**

---

### Option B — Avec un domaine + HTTPS (recommandé pour iPhone)

Prérequis : avoir un domaine et pointer le DNS vers le VPS.

**DNS à créer** (chez votre registrar) :

| Type | Nom    | Valeur          |
|------|--------|-----------------|
| A    | onrbat | `72.62.233.193` |

Puis sur le VPS :

```bash
sudo bash deploy.sh \
    https://github.com/VOTRE-USER/onrbat.git \
    onrbat.mondomaine.com \
    votre@email.com
```

Application disponible sur : **https://onrbat.mondomaine.com/** ✅

---

## Ce que fait deploy.sh automatiquement

1. `apt-get install docker.io docker-compose nginx certbot` (si absents)
2. `git clone` du dépôt (ou `git pull` si déjà présent)
3. `docker-compose up -d --build` — build l'image et démarre
4. Copie `nginx.conf` dans `/etc/nginx/sites-available/onrbat`
5. `systemctl restart nginx`
6. _(Si domaine)_ `certbot --nginx` → certificat SSL + redirect HTTP→HTTPS
7. _(Si domaine)_ Cron de renouvellement SSL automatique

---

## Mises à jour de l'application

```bash
# Sur le VPS
cd /opt/onrbat
git pull
docker-compose up -d --build
```

---

## Sauvegarde de la base de données

```bash
# Copier rdv.db depuis le container vers le VPS
docker cp onrbat-app:/data/rdv.db ./backup-$(date +%Y%m%d).db

# Télécharger sur votre Mac
scp root@72.62.233.193:/opt/onrbat/backup-*.db ~/Desktop/
```

---

## Commandes utiles sur le VPS

```bash
# Logs en temps réel
docker-compose -f /opt/onrbat/docker-compose.yml logs -f

# Statut du container
docker ps

# Redémarrer
docker-compose -f /opt/onrbat/docker-compose.yml restart

# Health check
curl http://localhost:3000/api/health

# Statut Nginx
systemctl status nginx

# Renouveler SSL manuellement
certbot renew && systemctl reload nginx
```

---

## Variables d'environnement (docker-compose.yml)

| Variable       | Valeur       | Description                    |
|----------------|--------------|--------------------------------|
| `NODE_ENV`     | `production` | Mode Express                   |
| `PORT`         | `3000`       | Port interne du container      |
| `VITE_API_URL` | _(vide)_     | Laisser vide (même domaine)    |
