# Learning Hub: Gitea + MkDocs + Nginx

Этот репозиторий показывает, как развернуть «открытый учебник», где редакторы пишут статьи в Markdown, пушат их в Gitea, а сайт автоматически пересобирается MkDocs и раздаётся Nginx.

## Почему сервер с 2 vCPU и 2 ГБ ОЗУ

- Сборка MkDocs нагружает Python, Jinja и обработку ассетов. Два виртуальных процессора позволяют выполнять пост-хук без подвисаний даже при регулярных пушах.
- 2 ГБ оперативной памяти дают запас для Python-окружения, pip, MkDocs и Nginx одновременно. На меньших тарифах возникает своп и сборка заметно тормозит.
- Конфигурация 2 vCPU / 2 ГБ уверенно обслуживает тысячи статических просмотров с включённым TLS и при этом остаётся доступной у большинства провайдеров VPS.

## Структура репозитория

- `mkdocs_project/` — конфигурация MkDocs, Markdown-файлы и ассеты.
- `mkdocs_project/docs/articles/` — отдельные статьи (по одному `.md` на статью).
- `mkdocs_project/docs/assets/images/` — общие изображения (замените заглушку 1x1 на реальные схемы).
- `mkdocs_project/requirements.txt` — список Python-зависимостей.
- `scripts/post-receive` — post-receive хук Gitea, который устанавливает зависимости и запускает `mkdocs build`.
- `scripts/bootstrap.sh` — вспомогательный скрипт, ставящий пакеты, создающий каталоги и конфигурацию Nginx.

## Предварительные требования

1. Сервер или VPS на Ubuntu 22.04+ с минимум 2 vCPU, 2 ГБ ОЗУ и 20 ГБ диска.
2. Права root или sudo.
3. DNS A/AAAA запись, указывающая на сервер.
4. Настроенный экземпляр Gitea с SSH-доступом (может располагаться на том же сервере).

## Пошаговое развёртывание

### 1. Создать системного пользователя и каталоги

```bash
sudo useradd --system --create-home --shell /bin/bash mkdocs
sudo install -d -o mkdocs -g mkdocs /srv/mkdocs /srv/www
```

### 2. Установить базовые пакеты

```bash
sudo apt update
sudo apt install -y git python3 python3-venv nginx
```

Если Gitea будет работать на этой же машине, установите её сейчас (пакет, бинарник или контейнер).

### 3. Клонировать рабочее дерево

```bash
sudo -u mkdocs git clone git@gitea.example.org:teaching/learning-hub.git /srv/mkdocs/learning-hub
```

Если используете GitHub:

```bash
sudo -u mkdocs git clone git@github.com:your-org/learning-hub.git /srv/mkdocs/learning-hub
```

### 4. Подготовить Python-окружение

```bash
sudo -u mkdocs python3 -m venv /srv/mkdocs/.venv
sudo -u mkdocs /srv/mkdocs/.venv/bin/pip install --upgrade pip
sudo -u mkdocs /srv/mkdocs/.venv/bin/pip install -r /srv/mkdocs/learning-hub/requirements.txt
```

### 5. Установить post-receive хук Gitea

```bash
sudo install -o git -g git -m 750 scripts/post-receive \
  /var/lib/gitea/repos/teaching/learning-hub.git/hooks/post-receive
sudo -u git mkdir -p /var/lib/gitea/repos/teaching/learning-hub.git/hooks/post-receive.d
sudo tee /var/lib/gitea/repos/teaching/learning-hub.git/hooks/post-receive.d/env <<'EOF'
WORK_TREE=/srv/mkdocs/learning-hub
VENV_PATH=/srv/mkdocs/.venv
SITE_OUTPUT=/srv/www/learning-hub
EOF
sudo chmod 640 /var/lib/gitea/repos/teaching/learning-hub.git/hooks/post-receive.d/env
sudo chown git:git /var/lib/gitea/repos/teaching/learning-hub.git/hooks/post-receive.d/env
```

### 6. Выполнить первую сборку вручную

```bash
sudo -u mkdocs /srv/mkdocs/.venv/bin/mkdocs build \
  --config-file /srv/mkdocs/learning-hub/mkdocs.yml \
  --site-dir /srv/www/learning-hub
```

### 7. Настроить Nginx

Запустите скрипт:

```bash
sudo ./scripts/bootstrap.sh git mkdocs learning-hub.example.org
```

или создайте конфиг вручную:

```bash
sudo tee /etc/nginx/sites-available/learning-hub <<'EOF'
server {
    listen 80;
    server_name learning-hub.example.org;

    root /srv/www/learning-hub;
    index index.html;

    access_log /var/log/nginx/learning-hub.access.log;
    error_log /var/log/nginx/learning-hub.error.log warn;

    location / {
        try_files $uri $uri/ =404;
    }
}
EOF
sudo ln -s /etc/nginx/sites-available/learning-hub /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### 8. Подключить HTTPS

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d learning-hub.example.org
```

Certbot выпустит сертификат Let’s Encrypt и автоматически активирует TLS в конфигурации Nginx.

## Процесс работы редакторов

1. Клонировать репозиторий: `git clone git@github.com:your-org/learning-hub.git`.
2. Создать ветку и добавить статьи в `mkdocs_project/docs/articles/`.
3. Положить изображения в `mkdocs_project/docs/assets/images/` и ссылаться на них относительными путями.
4. Обновить навигацию в `mkdocs.yml`, чтобы статья появилась в меню.
5. Закоммитить и запушить изменения. Post-receive хук пересоберёт сайт и Nginx мгновенно отдаст обновлённый контент.

## Локальный предпросмотр

```bash
cd mkdocs_project
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
mkdocs serve
```

Живой предпросмотр будет доступен на http://127.0.0.1:8000/ с автообновлением при изменении файлов.

## Публикация репозитория на GitHub

Если вы начали на локальной машине:

```bash
git init
git add .
git commit -m "Initial Learning Hub setup"
git branch -M main
git remote add origin git@github.com:your-org/learning-hub.git
git push -u origin main
```

Предоставьте продовому серверу доступ по SSH (deploy key или отдельный пользователь), чтобы он мог клонировать из GitHub и получать обновления.

## Плановое обслуживание

- Раз в месяц ставьте обновления: `sudo apt update && sudo apt upgrade`.
- Проверяйте автоматическое продление сертификата: `sudo certbot renew --dry-run`.
- Следите за заполнением диска в `/srv/www` (примерно 60 МБ на 1000 статей с картинками).
- Периодически обновляйте зависимости MkDocs: `pip install -U -r requirements.txt` (предварительно протестируйте локально).

По этой инструкции можно быстро подготовить VPS, развернуть пайплайн и публиковать новый учебный контент простым пушем Markdown-файлов в Gitea или GitHub.
