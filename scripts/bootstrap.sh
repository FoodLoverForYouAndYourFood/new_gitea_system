#!/usr/bin/env bash
set -euo pipefail

# Bootstrap MkDocs deployment environment for the Learning Hub project.
# Usage (run as root or via sudo):
#   sudo ./bootstrap.sh gitea_user mkdocs_user domain.name

if [[ $# -lt 3 ]]; then
  echo "Usage: $0 <gitea-user> <mkdocs-user> <fqdn>"
  exit 1
fi

GITEA_USER="$1"
MKDOCS_USER="$2"
FQDN="$3"

install_packages() {
  apt update
  apt install -y git python3 python3-venv nginx
}

create_users_and_dirs() {
  id -u "${MKDOCS_USER}" &>/dev/null || useradd --system --create-home --shell /bin/bash "${MKDOCS_USER}"
  install -d -o "${MKDOCS_USER}" -g "${MKDOCS_USER}" /srv/mkdocs /srv/www
}

configure_nginx() {
  local nginx_conf="/etc/nginx/sites-available/learning-hub"
  cat > "${nginx_conf}" <<EOF
server {
    listen 80;
    server_name ${FQDN};

    root /srv/www/learning-hub;
    index index.html;

    access_log /var/log/nginx/learning-hub.access.log;
    error_log /var/log/nginx/learning-hub.error.log warn;

    location / {
        try_files \$uri \$uri/ =404;
    }
}
EOF
  ln -sf "${nginx_conf}" /etc/nginx/sites-enabled/learning-hub
  nginx -t
  systemctl reload nginx
}

install_packages
create_users_and_dirs
configure_nginx

echo "Bootstrap complete. Clone the repository as ${MKDOCS_USER}, configure the post-receive hook, and push content."
