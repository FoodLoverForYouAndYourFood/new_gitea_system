# SA Knowledge Hub — skeleton (S2, Dark Violet)

Минимальный каркас для библиотеки знаний системного аналитика на MkDocs Material.

## Быстрый старт

1. Установите зависимости  
   ```bash
   pip install -r requirements.txt
   ```
2. Запустите локальный сервер  
   ```bash
   mkdocs serve
   ```
3. Сборка статики  
   ```bash
   mkdocs build --clean
   ```
4. Деплой на GitHub Pages  
   ```bash
   mkdocs gh-deploy
   ```

## Структура

- `mkdocs.yml` — конфигурация темы, навигации и плагинов.  
- `docs/` — Markdown-страницы (Beginner / Middle / Pro, глоссарий, компоненты).  
- `overrides/assets/styles.css` — тёмная фиолетовая тема.  
- `overrides/assets/progress.js` — клиентская заготовка для учёта прогресса/XP.

## Особенности

- Instant view и мгновенная навигация.  
- Кастомная тёмная палитра с фиолетовыми акцентами.  
- Минификация статики и поддержка локализованных дат.  
- Прогресс хранится в `localStorage`: ключи `sa_read_articles` и `sa_xp`.

> Контент в `docs/` полностью на русском, но конфигурация поддерживает расширение до многоязычности.
