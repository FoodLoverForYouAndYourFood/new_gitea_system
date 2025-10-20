# Learning Hub: полный гид по развёртыванию Gitea + MkDocs + Nginx

Этот проект показывает, как организовать «открытый учебник»: вы пишете статьи в Markdown, пушите их в Git-репозиторий, а сервер автоматически пересобирает и публикует сайт на домене с HTTPS. Ниже — пошаговая инструкция для человека, который раньше не разворачивал подобные штуки.

---

## 1. Что входит в решение

- **Gitea** (или GitHub) — хранит репозиторий. Пуш инициирует сборку.
- **Git hook** — post-receive скрипт, который разворачивает изменения и запускает сборку.
- **MkDocs** — генератор статического сайта из Markdown.
- **Nginx** — отдаёт сгенерированные HTML-файлы во внешнюю сеть.

Почему рекомендуем VPS с 2 vCPU и 2 ГБ RAM:
- MkDocs при сборке нагружает CPU. Два виртуальных ядра сокращают время билда и исключают таймауты при серии пушей.
- 2 ГБ памяти хватает MkDocs, Python-окружению, Nginx и служебным процессам без свопа.
- Такой тариф доступен у большинства провайдеров и покрывает сотни статей и тысячи просмотров в день.

---

## 2. Что подготовить заранее

1. **VPS или выделенный сервер**  
   Ubuntu 22.04 LTS, 20 ГБ диска, 2 vCPU, 2 ГБ RAM. Получите root-доступ (по SSH).
2. **Домены и DNS**  
   Зарегистрируйте домен (например, `learning-hub.example.org`). У регистратора настройте A-запись на IP VPS. Проверить можно командой:
   ```bash
   dig +short learning-hub.example.org
   ```
   Ответ должен совпадать с IP сервера.
3. **Git-аккаунт**  
   - Если используете Gitea: создайте организацию/пользователя и пустой bare-репозиторий `learning-hub.git`.
   - Если предпочитаете GitHub: создайте приватный или публичный репозиторий и добавьте серверный SSH-ключ как deploy key (только на чтение).
4. **Локальная машина**  
   Любой компьютер с Git и возможностью подключаться к серверу по SSH. Лучше всего Linux/WSL2, но можно и macOS/Windows.

---

## 3. Быстрый тест локально (по желанию)

Эти шаги помогут удостовериться, что MkDocs-сайт собирается до выхода на сервер.

```bash
git clone https://github.com/your-org/learning-hub.git
cd learning-hub/mkdocs_project
python -m venv .venv
source .venv/bin/activate  # Windows: .venv\Scripts\activate
pip install -r requirements.txt
mkdocs serve
```

Откройте http://127.0.0.1:8000 — увидите локальную версию сайта. Остановите сервер (Ctrl+C) и деактивируйте окружение `deactivate`.

---

## 4. Развёртывание на сервере (пошагово)

Подключаемся к VPS:
```bash
ssh root@IP-АДРЕС
```

### Шаг 1. Создать системного пользователя и каталоги
```bash
sudo useradd --system --create-home --shell /bin/bash mkdocs
sudo install -d -o mkdocs -g mkdocs /srv/mkdocs /srv/www
```

### Шаг 2. Установить пакеты
```bash
sudo apt update
sudo apt install -y git python3 python3-venv nginx
```

### Шаг 3. Клонировать рабочее дерево
Вариант с Gitea (замените адрес на свой):
```bash
sudo -u mkdocs git clone git@gitea.example.org:teaching/learning-hub.git /srv/mkdocs/learning-hub
```

Вариант с GitHub:
```bash
sudo -u mkdocs git clone git@github.com:your-org/learning-hub.git /srv/mkdocs/learning-hub
```

Если команда запросила подтверждение ключа, введите `yes`.

### Шаг 4. Настроить Python-окружение
```bash
sudo -u mkdocs python3 -m venv /srv/mkdocs/.venv
sudo -u mkdocs /srv/mkdocs/.venv/bin/pip install --upgrade pip
sudo -u mkdocs /srv/mkdocs/.venv/bin/pip install -r /srv/mkdocs/learning-hub/requirements.txt
```

### Шаг 5. Установить post-receive хук
```bash
cd /srv/mkdocs/learning-hub
```
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

Если используете GitHub вместо Gitea, настройте отдельный deploy-скрипт (systemd timer или CI/CD) — принцип тот же: сделать `git pull`, `pip install -r ...`, `mkdocs build`.

### Шаг 6. Прогнать первую сборку вручную
```bash
sudo -u mkdocs /srv/mkdocs/.venv/bin/mkdocs build \
  --config-file /srv/mkdocs/learning-hub/mkdocs.yml \
  --site-dir /srv/www/learning-hub
```

Проверьте, что появились HTML-файлы:
```bash
sudo ls /srv/www/learning-hub
```

### Шаг 7. Настроить Nginx
Автоматический способ:
```bash
sudo ./scripts/bootstrap.sh git mkdocs learning-hub.example.org
```

Ручной способ:
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

Проверка:
```bash
curl http://learning-hub.example.org
```
В ответе должен быть HTML-код главной страницы.

### Шаг 8. Выпустить HTTPS-сертификат
```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d learning-hub.example.org
```
Отвечайте на вопросы мастера, выберите вариант автоматического редиректа на HTTPS.

Проверка:
```bash
curl -I https://learning-hub.example.org
```
Статус должен быть `200` или `301`, сертификат — валидный.

### Шаг 9. Проверить Git-хук

1. На локальной машине измените любую статью или добавьте новую.
2. Выполните `git add`, `git commit`, `git push`.
3. На сервере смотрите лог:
   ```bash
   sudo tail -f /var/lib/gitea/log/gitea.log
   ```
   Должны появиться сообщения вида `[hook] Updating working tree...`.
4. Обновите страницу сайта — изменения должны стать видны.

---

## 5. Публикация и индексация в поиске

1. **Разрешить индексирование**  
   Убедитесь, что в корне сайта есть `robots.txt` с разрешением:
   ```
   User-agent: *
   Allow: /
   Sitemap: https://learning-hub.example.org/sitemap.xml
   ```
   MkDocs Material генерирует карту сайта автоматически.

2. **Google Search Console**  
   - Зайдите на https://search.google.com/search-console.  
   - Добавьте ресурс (тип — домен или URL prefix).  
   - Подтвердите владение (по DNS-записи или через загруженный HTML-файл).  
   - Отправьте карту сайта (`https://learning-hub.example.org/sitemap.xml`).  
   Индексация может занять от нескольких часов до пары недель.

3. **Yandex Webmaster (необязательно)**  
   Аналогично добавьте сайт в https://webmaster.yandex.ru для русскоязычной аудитории.

4. **Проверка наличия в поиске**  
   Через некоторое время попробуйте `site:learning-hub.example.org` в Google. Если результатов нет — проверьте Search Console на наличие ошибок.

---

## 6. Работа редакторов

1. Клонировать репозиторий:
   ```bash
   git clone git@github.com:your-org/learning-hub.git
   ```
2. Создать ветку:
   ```bash
   git checkout -b feature/new-article
   ```
3. Добавить Markdown-файл в `mkdocs_project/docs/articles/`, изображения — в `mkdocs_project/docs/assets/images/`.
4. Обновить `mkdocs_project/mkdocs.yml` (секция `nav`), чтобы статья появилась в меню.
5. Проверить локально `mkdocs serve`.
6. Сделать `git commit`, `git push` и отправить Pull Request (если используете GitHub/Gitea workflow).
7. После мерджа хук автоматически пересоберёт сайт.

---

## 7. Чек-лист проверки после развёртывания

- [ ] Домен указывает на IP сервера (`dig` возвращает правильный адрес).
- [ ] `curl http://домен` и `curl https://домен` возвращают содержимое сайта.
- [ ] Команда `sudo systemctl status nginx` показывает статус `active (running)`.
- [ ] Файл `/srv/www/learning-hub/index.html` обновляется после пуша.
- [ ] В Search Console загружена карта сайта, ошибок нет.
- [ ] Сертификат Let’s Encrypt настроен, cron-задание `certbot` добавлено (`systemctl list-timers | grep certbot`).

---

## 8. Регулярное обслуживание

- Раз в месяц обновляйте систему:
  ```bash
  sudo apt update && sudo apt upgrade
  ```
- Проверяйте автоматическое продление сертификата:
  ```bash
  sudo certbot renew --dry-run
  ```
- Следите за свободным местом:
  ```bash
  df -h /srv/www
  ```
- Периодически обновляйте зависимости MkDocs (предварительно тестируйте локально):
  ```bash
  pip install -U -r mkdocs_project/requirements.txt
  ```
- Делайте резервные копии `/srv/mkdocs/learning-hub` и `/srv/www/learning-hub` (rsync, borg, snapshot провайдера).

---

## 9. Частые вопросы

**Можно ли вести репозиторий только на GitHub?**  
Да. Тогда пост-хук Gitea не нужен. Используйте GitHub Actions, GitLab CI или cron-скрипт на сервере, который делает `git pull` и `mkdocs build`.

**Нужно ли держать сервер включенным 24/7?**  
Да, иначе сайт перестанет открываться. Для статического сайта достаточно бюджетного VPS.

**Когда сайт появится в Google?**  
После добавления в Search Console и индексации. Обычно первые страницы появляются в течение 1–7 дней, но может занять дольше.

**Можно ли обойтись без Nginx?**  
Теоретически да (например, через GitHub Pages), но в этой схеме Nginx даёт контроль над доменом, HTTPS и логами.

---

Теперь у вас есть полный чек-лист: от подготовки VPS и домена до попадания в индекс Google. Следуя шагам сверху вниз, вы развернёте учебник и сможете быстро добавлять новые статьи, просто пуша Markdown-файлы в репозиторий.
