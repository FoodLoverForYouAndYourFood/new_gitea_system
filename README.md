# Learning Hub / SA Knowledge Hub

Репозиторий содержит полностью готовую инфраструктуру для сборки и публикации MkDocs-сайта:

1. **mkdocs_project/** — локализованный портал с тёмной темой Material (SA Knowledge Hub).
2. **scripts/** — утилиты для настройки сервера и автоматического деплоя.

Схема работы: авторы пишут статьи в Markdown, пушат в GitHub, сервер автоматически подтягивает изменения и пересобирает сайт.

---

## Быстрый старт локально

```bash
cd mkdocs_project
python -m venv .venv
source .venv/bin/activate        # Windows: .venv\Scripts\Activate.ps1
pip install -r requirements.txt
mkdocs serve                     # превью по http://127.0.0.1:8000/
```

Сборка статики:

```bash
mkdocs build --clean
```

---

## Структура проекта

- `mkdocs_project/mkdocs.yml` — тема, навигация, плагины, instant view.
- `mkdocs_project/docs/` — контент (Beginner / Middle / Pro, глоссарий, компоненты, инструкции).
- `mkdocs_project/overrides/assets/` — кастомные стили и прогресс-бар (localStorage).
- `mkdocs_project/requirements.txt` — зависимости (MkDocs 1.6.1, Material 9.0.0 и плагины).
- `scripts/bootstrap.sh` — установка Python/MkDocs/Nginx на сервере.
- `scripts/post-receive` — пример Git hook (если нужен собственный bare-репозиторий).

---

## Автодеплой на сервере

### 1. Пользователь и окружение

```bash
sudo useradd --system --create-home --shell /bin/bash mkdocs
sudo -u mkdocs git clone https://github.com/FoodLoverForYouAndYourFood/new_gitea_system.git /srv/mkdocs/app
sudo -u mkdocs python3 -m venv /srv/mkdocs/.venv
sudo -u mkdocs /srv/mkdocs/.venv/bin/pip install -r /srv/mkdocs/app/mkdocs_project/requirements.txt
```

### 2. Скрипт автодеплоя

Создайте `/usr/local/bin/mkdocs-autodeploy.sh`:

```bash
sudo tee /usr/local/bin/mkdocs-autodeploy.sh >/dev/null <<'EOF'
#!/bin/bash
set -euo pipefail
exec >> /var/log/mkdocs-autodeploy.log 2>&1
(
  flock -n 9 || exit 0
  timestamp() { date '+%Y-%m-%d %H:%M:%S'; }
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
EOF
sudo chmod +x /usr/local/bin/mkdocs-autodeploy.sh
```

### 3. systemd unit и таймер

```bash
sudo tee /etc/systemd/system/mkdocs-autodeploy.service >/dev/null <<'EOF'
[Unit]
Description=MkDocs auto deployment

[Service]
Type=oneshot
ExecStart=/usr/local/bin/mkdocs-autodeploy.sh
EOF

sudo tee /etc/systemd/system/mkdocs-autodeploy.timer >/dev/null <<'EOF'
[Unit]
Description=Run MkDocs auto deployment every minute

[Timer]
OnBootSec=1min
OnUnitActiveSec=1min
Unit=mkdocs-autodeploy.service

[Install]
WantedBy=timers.target
EOF

sudo systemctl daemon-reload
sudo systemctl enable --now mkdocs-autodeploy.timer
```

Таймер раз в минуту проверяет GitHub и деплоит изменения. Логи:

```bash
sudo journalctl -u mkdocs-autodeploy.service -u mkdocs-autodeploy.timer -n 100
```

---

## Рабочий процесс автора

1. Добавьте/обновите Markdown в `mkdocs_project/docs/`.
2. `git add`, `git commit`, `git push`.
3. Через ~60 секунд сайт автоматически обновлён (деплой выполняет systemd-таймер).

Принудительный запуск: `systemctl start mkdocs-autodeploy.service`.

---

## Контакты

- Telegram: https://t.me/analyst_exe
- GitHub: https://github.com/FoodLoverForYouAndYourFood

Pull request'ы приветствуются — улучшайте тему, наполняйте разделы и расширяйте автоматику.
