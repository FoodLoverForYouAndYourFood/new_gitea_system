#!/bin/bash
set -euo pipefail

exec >> /var/log/mkdocs-autodeploy.log 2>&1

(
  flock -n 9 || exit 0

  timestamp() {
    date '+%Y-%m-%d %H:%M:%S'
  }

  echo "[$(timestamp)] Checking for updates"
  su - mkdocs -c 'cd /srv/mkdocs/app && git fetch origin'

  LOCAL=$(su - mkdocs -c 'cd /srv/mkdocs/app && git rev-parse HEAD')
  REMOTE=$(su - mkdocs -c 'cd /srv/mkdocs/app && git rev-parse origin/main')

  if [[ "$LOCAL" != "$REMOTE" ]]; then
    echo "[$(timestamp)] Deploying new version"
    su - mkdocs -c 'cd /srv/mkdocs/app && git reset --hard origin/main'
    su - mkdocs -c '/srv/mkdocs/.venv/bin/mkdocs build --config-file /srv/mkdocs/app/mkdocs_project/mkdocs.yml --site-dir /srv/mkdocs/site'
    chown -R mkdocs:mkdocs /srv/mkdocs/site
    echo "[$(timestamp)] Done"
  else
    echo "[$(timestamp)] No changes"
  fi
) 9>/tmp/mkdocs-autodeploy.lock
