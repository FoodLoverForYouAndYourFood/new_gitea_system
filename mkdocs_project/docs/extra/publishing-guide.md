# Автодеплой и публикация

Этот проект настроен так, чтобы авторы просто писали статьи в Markdown, а сервер сам подхватывал изменения и публиковал сайт. Ниже — минимальные шаги, которые нужны для обновления контента.

## 1. Подготовка статьи
- Создайте или обновите файл в `mkdocs_project/docs/` в подходящем разделе.
- Если появляется новый раздел, добавьте его в навигацию (`mkdocs_project/mkdocs.yml` → `nav`).
- Компоненты (admonition, вкладки и т.д.) можно подсмотреть в `extra/components-showcase.md`.

## 2. Отправка в репозиторий
```bash
git add mkdocs_project/docs
git commit -m "Добавляет статью <тема>"
git push
```

## 3. Автоматический деплой
- На сервере работает systemd-таймер `mkdocs-autodeploy.timer`. Он каждые 60 секунд проверяет GitHub и, если появились изменения, выполняет:
  1. `git reset --hard origin/main`
  2. `mkdocs build --config-file mkdocs_project/mkdocs.yml --site-dir /srv/mkdocs/site`
  3. `chown -R mkdocs:mkdocs /srv/mkdocs/site`
- Логи деплоя можно посмотреть командой:
  ```bash
  sudo journalctl -u mkdocs-autodeploy.service -u mkdocs-autodeploy.timer -n 100
  ```

## 4. Ручной перезапуск (при необходимости)
```bash
ssh -i <ваш_ключ> root@45.141.102.227
systemctl start mkdocs-autodeploy.service
```
Таймер сам подхватывает изменения спустя минуту, поэтому ручной запуск нужен только в исключительных ситуациях.

## 5. Как это устроено
- Скрипт деплоя лежит в `/usr/local/bin/mkdocs-autodeploy.sh`.
- Таймер и сервис: `/etc/systemd/system/mkdocs-autodeploy.service` и `/etc/systemd/system/mkdocs-autodeploy.timer`.
- При необходимости можно изменить период запуска (`OnUnitActiveSec`) или дополнить скрипт.

### Важно
- Рабочее окружение `mkdocs` в `/srv/mkdocs/.venv`.
- Если добавляете зависимости — обновите `requirements.txt`, пушните и дайте таймеру один цикл: он сам переустановит пакеты (при необходимости запустите `pip install` вручную от пользователя `mkdocs`).

Готово! Теперь достаточно пушить Markdown — публикация произойдёт автоматически.
