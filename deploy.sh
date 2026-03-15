#!/bin/bash
# ============================================================
# deploy.sh — Déploiement ONRBAT sur VPS Ubuntu 22.04
#
# Usage :
#   sudo bash deploy.sh <url-repo-github> [domaine] [email-ssl]
#
# Exemples :
#   # Accès par IP uniquement (pas de SSL) :
#   sudo bash deploy.sh https://github.com/USER/onrbat.git
#
#   # Avec domaine + SSL automatique :
#   sudo bash deploy.sh https://github.com/USER/onrbat.git \
#                       onrbat.mondomaine.com \
#                       contact@mondomaine.com
# ============================================================

set -euo pipefail

REPO_URL="${1:-}"
DOMAIN="${2:-}"
EMAIL="${3:-}"
APP_DIR="/opt/onrbat"

GREEN='\033[0;32m'; YELLOW='\033[1;33m'; RED='\033[0;31m'; NC='\033[0m'
log()   { echo -e "${GREEN}[ONRBAT]${NC} $1"; }
warn()  { echo -e "${YELLOW}[WARN]${NC}  $1"; }
error() { echo -e "${RED}[ERROR]${NC} $1"; exit 1; }

[[ $EUID -ne 0 ]]   && error "Exécuter en root : sudo bash deploy.sh ..."
[[ -z "$REPO_URL" ]] && error "URL du dépôt GitHub manquante. Usage : sudo bash deploy.sh <url-repo>"

log "=== Déploiement ONRBAT ==="
log "Dépôt  : $REPO_URL"
[[ -n "$DOMAIN" ]] && log "Domaine : $DOMAIN"

# ── 1. Mise à jour système ────────────────────────────────────
log "Mise à jour des paquets..."
apt-get update -qq
apt-get upgrade -y -qq

# ── 2. Installation Docker, Docker Compose, Nginx, Certbot ───
log "Installation des dépendances..."
apt-get install -y \
    docker.io \
    docker-compose \
    nginx \
    certbot \
    python3-certbot-nginx \
    git \
    curl

systemctl enable docker
systemctl start docker
systemctl enable nginx
log "Dépendances installées ✅"

# ── 3. Clone ou mise à jour du dépôt ─────────────────────────
log "Récupération du code source..."
if [ -d "$APP_DIR/.git" ]; then
    log "Mise à jour du dépôt existant..."
    git -C "$APP_DIR" pull
else
    git clone "$REPO_URL" "$APP_DIR"
fi

# ── 4. Build et lancement Docker Compose ─────────────────────
log "Build de l'image Docker et démarrage..."
cd "$APP_DIR"
docker-compose down --remove-orphans 2>/dev/null || true
docker-compose up -d --build
log "Application démarrée sur le port 3000 ✅"

# ── 5. Configuration Nginx ────────────────────────────────────
log "Configuration de Nginx..."
SERVER_NAME="${DOMAIN:-_}"
sed "s/VOTRE_DOMAINE/$SERVER_NAME/g" "$APP_DIR/nginx.conf" \
    > /etc/nginx/sites-available/onrbat

ln -sf /etc/nginx/sites-available/onrbat /etc/nginx/sites-enabled/onrbat
rm -f /etc/nginx/sites-enabled/default

nginx -t
systemctl restart nginx
log "Nginx configuré ✅"

# ── 6. Certificat SSL (uniquement si domaine fourni) ─────────
if [[ -n "$DOMAIN" && -n "$EMAIL" ]]; then
    log "Génération du certificat SSL pour $DOMAIN..."
    certbot --nginx \
        -d "$DOMAIN" \
        --non-interactive \
        --agree-tos \
        --email "$EMAIL" \
        --redirect

    # Renouvellement automatique
    if ! crontab -l 2>/dev/null | grep -q "certbot renew"; then
        (crontab -l 2>/dev/null; echo "0 3 * * * certbot renew --quiet && systemctl reload nginx") | crontab -
        log "Renouvellement SSL automatique configuré ✅"
    fi
elif [[ -n "$DOMAIN" && -z "$EMAIL" ]]; then
    warn "Domaine fourni mais email manquant — SSL ignoré."
    warn "Pour activer SSL : certbot --nginx -d $DOMAIN"
else
    warn "Pas de domaine fourni — SSL ignoré."
    warn "L'app est accessible sur http://$(hostname -I | awk '{print $1}')/"
fi

# ── 7. Vérification finale ────────────────────────────────────
sleep 3
HEALTH_URL="http://localhost:3000/api/health"
if curl -sf "$HEALTH_URL" > /dev/null; then
    log "✅ Health check OK"
    if [[ -n "$DOMAIN" ]]; then
        log "   Application : https://$DOMAIN"
    else
        log "   Application : http://$(hostname -I | awk '{print $1}')/"
    fi
else
    warn "Le container ne répond pas encore — attendez quelques secondes."
    warn "Vérifiez : docker-compose -f $APP_DIR/docker-compose.yml logs"
fi

echo ""
log "Commandes utiles :"
log "   Logs        : docker-compose -f $APP_DIR/docker-compose.yml logs -f"
log "   Redémarrer  : docker-compose -f $APP_DIR/docker-compose.yml restart"
log "   Mise à jour : cd $APP_DIR && git pull && docker-compose up -d --build"
log "   Backup BDD  : docker cp onrbat-app:/data/rdv.db ./backup-\$(date +%Y%m%d).db"
