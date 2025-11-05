# Learning Hub / SA Knowledge Hub

Репозиторий объединяет два ключевых блока:

1. **`mkdocs_project/`** — полностью локализованный сайт на Material for MkDocs в темной фиолетовой теме (SA Knowledge Hub).  
2. **`scripts/`** — набор shell-скриптов для автоматизации деплоя на сервере с Gitea и Nginx.

Таким образом, можно вести документацию в Markdown, пушить изменения в Git, а сервер будет пересобирать и публиковать сайт.

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

## Структура репозитория

- `mkdocs_project/mkdocs.yml` — конфигурация темы, навигации, плагинов и instant view.  
- `mkdocs_project/docs/` — контент библиотеки (Beginner / Middle / Pro, глоссарий, компоненты).  
- `mkdocs_project/overrides/assets/` — кастомные стили и логика прогресса (localStorage + кнопки «Отметить прочитанным»).  
- `mkdocs_project/requirements.txt` — зависимости (MkDocs 1.6.1, Material 9.0.0, плагины).  
- `scripts/bootstrap.sh` — установщик окружения на сервере (Python, MkDocs, Nginx).  
- `scripts/post-receive` — Git hook, который после пуша пересобирает сайт и выкладывает в `site/`.

---

## Сборка и деплой на сервере

1. **Подготовьте VPS**  
   Ubuntu 22.04 LTS, 1–2 vCPU, 1–2 ГБ RAM, 20 ГБ SSD достаточно для MkDocs и Nginx.

2. **Заведите отдельного пользователя** (пример в `scripts/bootstrap.sh`):
   ```bash
   sudo useradd --system --create-home --shell /bin/bash mkdocs
   ```

3. **Клонируйте репозиторий и установите зависимости**:
   ```bash
   sudo -u mkdocs git clone <ваш-репозиторий> /srv/mkdocs/new_gitea_system
   sudo -u mkdocs python3 -m venv /srv/mkdocs/.venv
   sudo -u mkdocs /srv/mkdocs/.venv/bin/pip install -r /srv/mkdocs/new_gitea_system/mkdocs_project/requirements.txt
   ```

4. **Настройте Git hook `scripts/post-receive`** — он будет запускать `mkdocs build --clean` и перекладывать папку `site/` в каталог, который отдаёт Nginx.

5. **Сконфигурируйте Nginx**  
   Отдавайте статический контент из `/srv/mkdocs/site` (или того пути, который указали в hook).

> Подробная инструкция по автоматическому развёртыванию, настройке Gitea и Nginx — в исходной версии README (`git show origin/main:README.md`).

---

## Что нового в SA Knowledge Hub

- Полностью переписанный контент на русском: Beginner/Middle/Pro, глоссарий, компоненты, changelog.  
- Instant View, вкладки, подсветка кода, кнопки копирования, прогресс-бар.  
- Очищенные requirements (MkDocs 1.6.1) и отключаемый PDF-экспорт (WeasyPrint можно подключить позднее).  
- Тёмная фиолетовая тема (overrides/assets/styles.css) и client-side трекинг прогресса (overrides/assets/progress.js).

Используйте репозиторий как базу: расширяйте MkDocs-навигацию, дорабатывайте скрипты деплоя, подключайте CI или GitHub Actions.
