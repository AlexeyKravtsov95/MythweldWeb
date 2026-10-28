# Деплой на VK Cloud Object Storage + CDN — WEB-M0.6A (Issue #12)

Состояние на **2026-10-28**. Документ описывает, как статическая сборка Astro попадает в бакет `mythweld-web` и как владелец вручную настраивает ключи, GitHub, CDN и откат.

**Чего этот PR не делает:** не меняет DNS, не публикует сайт на `mythweld.com`, не снимает `Disallow: /` в `robots.txt`, не трогает `journal.mythweld.com`, `legal.mythweld.com`, `ota.mythweld.com` и ресурсы OTA. Workflow запускается только вручную и только после одобрения владельцем; агент его не запускал.

Источники фактов: официальный репозиторий документации [vk-cs/docs-public](https://github.com/vk-cs/docs-public) (ветка `master`, коммит `b711105` от 28.10.2026, пути ниже — от `docs/ru/`) и анонс хостинга статических сайтов в канале VK Cloud ([пост 1357](https://t.me/s/vk_cloud_news/1357), ~14.07.2026; пост 1347 из Issue — про Managed Kubernetes). Пометка **ПРОВЕРИТЬ** — в документации нет ответа или она противоречит сама себе, нужна проверка на живом ресурсе. Пометка **РЕШЕНИЕ ВЛАДЕЛЬЦА** — выбор за владельцем.

## 1. Схема

```text
GitHub Actions (workflow_dispatch, одобрение владельца)
  └─ npm ci → npm run verify → secret scan → план загрузки → артефакт dist/
       └─ aws s3 cp по одному файлу (Content-Type, Cache-Control) → бакет mythweld-web
            ├─ Static-Site Hosting бакета: index.html / 404.html
            │    http://mythweld-web.hb-website.hb.ru-msk.vkcloud-storage.ru   ← staging (HTTP)
            └─ отдельный CDN-ресурс (не OTA), origin = website-хост бакета
                 https://cl-XXXXXXXX.service.cdn.msk.vkcs.cloud                  ← staging (HTTPS?)
                 mythweld.com — только в WEB-M0.6B, после отдельного GO
```

## 2. Что лежит в репозитории

| Файл                                            | Назначение                                                                                                                                                                                                  |
| ----------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `.github/workflows/deploy-vk-cloud.yml`         | Ручной деплой: `workflow_dispatch`, `permissions: contents: read`, только коммиты из `main`, environment `vk-cloud-staging`, ключи доступны только шагу загрузки.                                           |
| `scripts/deploy/objects.ts`                     | План загрузки: Content-Type и Cache-Control по типу файла, порядок (ассеты → HTML → `404.html`), запрет на `.env`, `*.map`, исходники, `docs/`, `legal-drafts/`, проверка `Disallow: /`.                    |
| `scripts/deploy/deploy.ts`                      | Загрузка через AWS CLI (предустановлен на раннерах GitHub), удаление устаревших объектов (кроме `_astro/`), `--dry-run`, `--no-prune`. Проверяет, что бакет — именно `mythweld-web`, а endpoint — VK Cloud. |
| `scripts/deploy/smoke.ts`                       | HTTP smoke-тест развёрнутого адреса (раздел 8).                                                                                                                                                             |
| `scripts/check-secrets.ts`                      | Поиск ключей и токенов в отслеживаемых файлах и в `dist/`; выводит файл, строку и правило, но не значение.                                                                                                  |
| `deploy/vk-cloud/website.json`                  | Конфигурация Static-Site Hosting: `IndexDocument = index.html`, `ErrorDocument = 404.html`.                                                                                                                 |
| `deploy/vk-cloud/bucket-policy.json`            | Эталон публичной политики: анонимно только `s3:GetObject` на `arn:aws:s3:::mythweld-web/*`.                                                                                                                 |
| `src/pages/404.astro`                           | Общая страница 404 → `dist/404.html`: EN и RU блоки, ссылки на `/` и `/ru/`, `noindex`, нет canonical/hreflang.                                                                                             |
| `tests/deploy.test.ts`, `tests/secrets.test.ts` | Тесты плана, 404, конфигов, прав workflow, smoke на эмуляции бакета и поиска секретов.                                                                                                                      |

Локально: `npm run deploy:plan` (план без загрузки), `npm run secrets:check`, `npm run smoke -- <URL>`.

## 3. Content-Type и Cache-Control

Метаданные задаются при загрузке каждого объекта (`--content-type`, `--cache-control`). Сохраняет ли VK S3 их без изменений, документация не говорит (**ПРОВЕРИТЬ** — smoke-тест проверяет это на каждом деплое). Изменить метаданные уже загруженного объекта можно только повторной загрузкой (`storage/s3/concepts/about`); лимит метаданных — 2048 байт.

| Класс       | Файлы                                                      | Cache-Control                                      | Почему                                                                                                                                    |
| ----------- | ---------------------------------------------------------- | -------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| `document`  | `*.html` (включая `404.html`), `sitemap.xml`, `robots.txt` | `public, max-age=0, s-maxage=300, must-revalidate` | Браузер проверяет каждый раз; CDN держит 5 минут (`s-maxage` важнее `max-age`, `networks/cdn/faq`). Деплой виден везде ≤ 5 мин без purge. |
| `immutable` | `_astro/*` (имя содержит хэш)                              | `public, max-age=31536000, immutable`              | Файл с тем же именем никогда не меняется.                                                                                                 |
| `static`    | `fonts/*`, `og/*`, `favicon.svg`, `OFL.txt`                | `public, max-age=86400`                            | Имена стабильные; при замене файла — выборочный purge.                                                                                    |

Типы: `text/html; charset=utf-8`, `text/css; charset=utf-8`, `text/javascript; charset=utf-8`, `application/xml; charset=utf-8`, `text/plain; charset=utf-8`, `image/svg+xml`, `image/png`, `image/webp`, `image/avif`, `image/jpeg`, `font/woff2`. Файл неизвестного типа останавливает деплой до правки `CONTENT_TYPES`.

## 4. Бакет `mythweld-web`: проверка и Static-Site Hosting

Владелец выполняет команды на своей машине своими ключами (ключи владельца, **не** ключ CI). Ключи передаются через `aws configure --profile` или переменные окружения; в чат, PR и комментарии их не вставлять.

```bash
export AWS_REQUEST_CHECKSUM_CALCULATION=when_required AWS_RESPONSE_CHECKSUM_VALIDATION=when_required
S3="--endpoint-url https://hb.ru-msk.vkcloud-storage.ru --region ru-msk --profile mythweld-owner"
```

1. **Регион и endpoint.** Москва: `https://hb.ru-msk.vkcloud-storage.ru` (или `https://hb.vkcloud-storage.ru`), регион `ru-msk`; Казахстан: `https://hb.kz-ast.vkcloud-storage.ru`, `kz-ast` (`storage/s3/connect/s3-cli`). **ПРОВЕРИТЬ** фактический регион бакета в кабинете.
2. **Политика бакета** — сравнить с `deploy/vk-cloud/bucket-policy.json`. Лишних разрешений для `*` (`ListBucket`, `PutObject`, `DeleteObject`) быть не должно:
   ```bash
   aws s3api get-bucket-policy --bucket mythweld-web $S3
   ```
   Без ACL `public-read` или политики с `GetObject` для `"*"` сайт отвечает `403` (`storage/s3/instructions/manage-static-site`, гайд `storage/s3/how-to-guides/cdn-ssh`). Политики достаточно, ACL `public-read` не нужен.
3. **Static-Site Hosting.** В документации описан только AWS CLI. Режим «Сайт» в кабинете упомянут в анонсе, но шаги не описаны.
   ```bash
   aws s3api put-bucket-website --bucket mythweld-web --website-configuration file://deploy/vk-cloud/website.json $S3
   aws s3api get-bucket-website --bucket mythweld-web $S3
   ```
   Адрес сайта: `mythweld-web.hb-website.hb.ru-msk.vkcloud-storage.ru` (`storage/s3/concepts/static-site-hosting`). Путь на `/` отдаёт `<путь>/index.html`; путь без `/`, для которого нет объекта, перенаправляется на `…/`; при ответе `4XX` отдаётся `ErrorDocument`. **ПРОВЕРИТЬ:** сохраняется ли при этом статус **404** (документация не говорит). Это проверяет smoke-тест; fallback 200 считается провалом.
4. **HTTPS на website-хосте — ПРОВЕРИТЬ.** `storage/s3/concepts/about`: хостинг сайтов «доступен только через HTTP»; гайд cdn-ssh: HTTPS «задается при настройке CDN»; при этом шаблон адреса в `static-site-hosting` начинается с `https://`. Пока считаем website-хост HTTP-only, HTTPS — только через CDN.
5. **Версионирование бакета — РЕШЕНИЕ ВЛАДЕЛЬЦА, сейчас рекомендуется не включать.** Включённое версионирование нельзя выключить, только приостановить (`storage/s3/concepts/versioning`). Lifecycle умеет только Expiration и AbortIncompleteMultipartUpload (`concepts/lifecycle`), поэтому старые версии копятся и тарифицируются. Основной откат — повторный деплой коммита (раздел 9).

## 5. Ключ для GitHub Actions (минимальная область)

В VK Cloud два вида ключей (`storage/s3/concepts/access/account-and-keys`):

- **ключи аккаунта** (Object Storage → Аккаунты) «дают доступ ко всем бакетам аккаунта», в том числе к OTA. Для CI **не использовать**;
- **ключи бакета** «дают доступ к одному бакету или части объектов». Использовать их.

Шаги (`storage/s3/instructions/access-management/bucket-keys`):

1. Object Storage → бакет `mythweld-web` → вкладка **Ключи** → **Добавить ключ**. Имя: `github-actions-mythweld-web`.
2. «Ограничить доступ» по префиксу **не включать**: сайт лежит в корне бакета (`index.html`, `ru/…`, `_astro/…`).
3. Access Key ID и Secret Key сразу сохранить в GitHub (раздел 6), не в файлы, заметки или чат.
4. **ПРОВЕРИТЬ права ключа.** Уровни прав (только чтение, чтение и запись) в документации не описаны, IAM-политик пользователей нет. Деплою нужны `ListBucket`, `PutObject`, `DeleteObject` в `mythweld-web`. Проверка с ключом CI в отдельном профиле (`S3_CI="… --profile mythweld-ci"`):
   ```bash
   aws s3 ls s3://mythweld-web/ $S3_CI                          # должно работать
   aws s3 ls $S3_CI                                             # ожидаем только mythweld-web или отказ
   aws s3 ls s3://<бакет-OTA>/ $S3_CI                           # ожидаем AccessDenied
   aws s3api get-bucket-policy --bucket mythweld-web $S3_CI     # желательно AccessDenied
   ```
   Если ключ бакета может менять политику или website-конфигурацию, записать это как остаточный риск. Bucket policy поддерживает `Deny` для отдельного принципала (форматы принципалов — `concepts/access/bucket-policy`). Применять только после проверки на практике.
5. **Ротация и отзыв:** удалить ключ на вкладке «Ключи» → создать новый → обновить два секрета в GitHub. При подозрении на утечку сначала удалить ключ, потом разбираться.

## 6. GitHub: environment и секреты

1. Settings → Actions → General → **Workflow permissions**: «Read repository contents and packages permissions». Workflow и так запрашивает только `contents: read`.
2. Settings → Environments → **New environment** `vk-cloud-staging`:
   - **Required reviewers**: владелец (`AlexeyKravtsov95`). «Prevent self-review» не включать, иначе единственный владелец не сможет одобрить свой запуск.
   - **Deployment branches and tags**: «Selected branches and tags» → `main`. Изменённый workflow из feature-ветки не получит секреты.
3. В этом environment (не на уровне репозитория):
   - **Secrets:** `VK_S3_ACCESS_KEY_ID`, `VK_S3_SECRET_ACCESS_KEY`. Ввод интерактивный, без следа в истории shell:
     ```bash
     gh secret set VK_S3_ACCESS_KEY_ID --env vk-cloud-staging --repo AlexeyKravtsov95/MythweldWeb
     ```
     ```bash
     gh secret set VK_S3_SECRET_ACCESS_KEY --env vk-cloud-staging --repo AlexeyKravtsov95/MythweldWeb
     ```
   - **Variables** (не секреты):
     - `VK_S3_ENDPOINT` = `https://hb.ru-msk.vkcloud-storage.ru`;
     - `VK_S3_REGION` = `ru-msk`;
     - `STAGING_BASE_URL` — адрес для smoke: сначала `http://mythweld-web.hb-website.hb.ru-msk.vkcloud-storage.ru`, после настройки CDN — `https://cl-….service.cdn.msk.vkcs.cloud`.
4. GitHub маскирует значения секретов в логах. Скрипты ключи не читают и не печатают: их получает только AWS CLI через свои переменные окружения в шаге «Upload to mythweld-web».

## 7. CDN-ресурс для сайта

Отдельный ресурс только для сайта; ресурс OTA не переиспользовать и не менять. Настройки (`networks/cdn/instructions/create-resource`, `manage-cdn/*`):

| Настройка            | Значение                                                                                                                                                                                                                                                                                                                                                                  |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Способ создания      | CDN → «Создать ресурс» со своим источником. Создание из вкладки бакета ставит origin и Host на S3 API-хост `hb.ru-msk.vkcloud-storage.ru` (`storage/s3/_includes/_s3-create-cdn.md`), а он **не** раскрывает `/ru/` → `index.html` и не отдаёт `404.html`.                                                                                                                |
| Источник (origin)    | `mythweld-web.hb-website.hb.ru-msk.vkcloud-storage.ru`. **ПРОВЕРИТЬ:** это вывод из того, где работает Static-Site Hosting, а гайд cdn-ssh советует создание из бакета и HTTPS. Критерий — smoke через CDN: `/ru/` = 200, неизвестный путь = 404.                                                                                                                         |
| Протокол к источнику | HTTP (website-хост HTTP-only, раздел 4). Если HTTPS к website-хосту заработает, переключить на HTTPS.                                                                                                                                                                                                                                                                     |
| Host header          | «Кастомный» = `mythweld-web.hb-website.hb.ru-msk.vkcloud-storage.ru`.                                                                                                                                                                                                                                                                                                     |
| Персональный домен   | **РЕШЕНИЕ ВЛАДЕЛЬЦА.** «После создания CDN-ресурса изменить персональные домены невозможно». Для staging — ресурс со служебным доменом `cl-….service.cdn.msk.vkcs.cloud`; можно ли создать его без персонального домена — **ПРОВЕРИТЬ** в мастере. Для `mythweld.com` в WEB-M0.6B, вероятно, понадобится отдельный ресурс. Домены `journal`, `legal`, `ota` не добавлять. |
| Сертификат           | Let's Encrypt (выпуск обычно до 30 минут; нужен включённый «Доступ к контенту конечным пользователям» и домен, указывающий на CDN) или свой PEM. Есть ли TLS на служебном домене — **ПРОВЕРИТЬ**. TLS ≥ 1.2.                                                                                                                                                              |
| HTTP → HTTPS         | Отдельной опции в документации нет — **ПРОВЕРИТЬ** в кабинете. Smoke отмечает результат как WARN.                                                                                                                                                                                                                                                                         |
| Кэш на CDN           | «Настройка источника»: CDN берёт `Cache-Control` объектов (`s-maxage=300` для HTML, год для `_astro/`). Без заголовка TTL был бы 4 дня, поэтому заголовок есть у каждого объекта.                                                                                                                                                                                         |
| Кэш в браузере       | «По источнику».                                                                                                                                                                                                                                                                                                                                                           |
| Query string         | «Игнорировать все»: параметров на сайте нет, `?x=1` не создаёт копий в кэше.                                                                                                                                                                                                                                                                                              |
| Заголовки ответа     | `staticHeaders` (до 50): `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `X-Frame-Options: DENY`, `Permissions-Policy: camera=(), microphone=(), geolocation=()`. `Strict-Transport-Security` — только в WEB-M0.6B на боевом домене после проверки HTTPS. CSP — отдельно: Astro встраивает стили и скрипт меню inline.             |
| Методы               | GET/HEAD (по умолчанию).                                                                                                                                                                                                                                                                                                                                                  |
| Rewrite              | Не поддерживается («такая возможность не предусмотрена», `networks/cdn/faq`). Раскрытие `/ru/` делает website-хост бакета.                                                                                                                                                                                                                                                |
| www → apex           | Отдельный ресурс с `force_return` 301 — в WEB-M0.6B.                                                                                                                                                                                                                                                                                                                      |

Ограничения:

- Ресурс автоматически приостанавливается, если за 14 дней прошло меньше 1 МБ трафика (`networks/cdn/concepts/resource`). Staging может «уснуть».
- Цены на хранение, исходящий трафик S3 и трафик CDN в документации не приведены (только cloud.vk.ru/pricelist). Бюджет — **РЕШЕНИЕ ВЛАДЕЛЬЦА**.

### Очистка кэша (purge)

- **Обычный деплой purge не требует:** HTML живёт на CDN 5 минут, файлы `_astro/` получают новые имена.
- **Purge нужен,** если заменены `fonts/*`, `og/*`, `favicon.svg` (кэш 24 часа) или откат нужен быстрее 5 минут.
- **В кабинете:** CDN → ресурс → вкладка «Контент» → «Полная» или «Выборочная» (маски с `*`, пути начинаются с `/`, например `/og/*`) (`networks/cdn/instructions/manage-cdn/content-settings`).
- **Через API:** `POST https://msk.cloud.vk.ru/api/cdn/api/v1/projects/{project_id}/resources/{id}/purge`, тело `{"paths": [...]}`, `[]` = очистить всё. Не чаще одного запроса в минуту, иначе 429. Аутентификация — Keystone-токен (`X-Auth-Token`) пользователя OpenStack проекта. Его права шире одного бакета, поэтому в GitHub Secrets в этом PR он **не** добавляется. Автоматический purge — отдельная задача, если понадобится (сначала **ПРОВЕРИТЬ**, есть ли роль только для CDN).

### Apex `mythweld.com` (для WEB-M0.6B, сейчас ничего не менять)

VK CDN документирует подключение домена только через **CNAME** на служебный домен ресурса, A/ALIAS для apex не описаны. CNAME на apex по стандарту DNS невозможен рядом с SOA/NS/MX. Варианты, каждый — после проверки у DNS-провайдера `mythweld.com`, где уже живут `journal`, `legal`, `ota`:

1. Провайдер поддерживает ALIAS/ANAME/CNAME-flattening → apex на служебный домен CDN.
2. Основной адрес — `www.mythweld.com` (CNAME), apex → 301 на `www` средствами DNS-провайдера.
3. Статические IP для A-записей — **ПРОВЕРИТЬ** в поддержке VK Cloud.

NS не переносить, записи поддоменов не трогать. Решение — в WEB-M0.6B.

## 8. Деплой и smoke-тест

1. Workflow появится в Actions только после merge этого PR в `main`: для `workflow_dispatch` файл должен быть в ветке по умолчанию.
2. Actions → **Deploy to VK Cloud** → Run workflow: ветка `main`, `ref` = `main` (или SHA), `prune` = да.
3. Job **Verify and build**:
   - проверяет, что коммит есть в `main`;
   - выполняет `npm ci`, `npm run verify`, поиск секретов и план загрузки;
   - сохраняет артефакт `dist-<sha>` на 30 дней.
4. Job **Upload and smoke-test** ждёт одобрения владельца (Review deployments → Approve).
5. Порядок загрузки: `_astro/` → остальные файлы → HTML → `404.html`. Затем удаляются объекты, которых нет в сборке, кроме `_astro/`.
6. Smoke по `STAGING_BASE_URL` пишет таблицу в Summary и падает при любом FAIL. Что проверяется:
   - 6 маршрутов (`/`, `/talentforge/`, `/forever-journey/`, `/ru/`, `/ru/talentforge/`, `/ru/forever-journey/`): 200, `text/html; charset=utf-8`, Cache-Control `document`, верный `<html lang>`;
   - 4 неизвестных пути (в корне, в `/ru/`, внутри раздела, в `_astro/`): **404** и страница 404 сайта, а не fallback 200;
   - `robots.txt`: 200 и `Disallow: /`; `sitemap.xml`: 200 и XML;
   - `_astro/*.css`, `*.avif`, `*.webp`: тип и `immutable`; шрифт, share card, favicon: тип и `static`;
   - WARN (не провал): `/talentforge` без слеша → редирект на `/talentforge/`; `http://` → `https://`.
7. Вручную после smoke: открыть 6 страниц в браузере (шрифты, изображения, меню) и страницу 404 на `/ru/a/b/`. Превью ссылок проверять только на боевом домене: OG указывает на `https://mythweld.com/…`.

Ручной smoke без деплоя: `npm run smoke -- https://cl-….service.cdn.msk.vkcs.cloud`.

## 9. Откат

1. **Основной способ — повторный деплой прошлого коммита.** Actions → Deploy to VK Cloud → Run workflow → `ref` = SHA предыдущей удачной публикации. Где взять SHA: Settings → Environments → `vk-cloud-staging` (история deployments), Summary запуска («Deploying <sha>») или `git log main`. Что происходит:
   - HTML заменяется;
   - страницы, которых не было в старой сборке, удаляются (`prune`);
   - старые файлы `_astro/` остаются в бакете, поэтому ссылки из старого HTML работают сразу.

   На CDN откат виден через ≤ 5 минут, после полной очистки кэша — сразу.

2. **Быстрее:** открыть прошлый удачный запуск → Re-run all jobs (собирается тот же SHA тем же workflow).
3. **Если сломан сам workflow:** собрать нужный коммит локально и загрузить ключом владельца (в окружении: `S3_ENDPOINT`, `S3_REGION`, `S3_BUCKET=mythweld-web` и ключи):
   ```bash
   git checkout <sha> && npm ci && npm run build && node scripts/deploy/deploy.ts
   ```
4. **Аварийная остановка:** отключить workflow (Actions → … → Disable workflow), удалить ключ бакета. При необходимости временно убрать website-конфигурацию (`aws s3api delete-bucket-website`) или выключить «Доступ к контенту конечным пользователям» на CDN-ресурсе.
5. Версионирование бакета как второй уровень отката — раздел 4, п. 5.

## 10. Staging не приватен

Website-хост бакета и служебный домен CDN публичны: политика разрешает `GetObject` всем. `Disallow: /` в `robots.txt` и `noindex` на 404 доступ не ограничивают. В бакет попадает только `dist/`: план загрузки отклоняет `.env`, `*.map`, исходники, `docs/`, `legal-drafts/`, а RU-образец Straider исключён из сборки тестами B4. Ограничить staging можно ACL по IP на CDN-ресурсе (`networks/cdn/instructions/manage-cdn/security`), но website-хост бакета при этом остаётся открытым. Личных данных на сайте нет; ничего вне `dist/` в бакет не загружать.

## 11. Факты для Privacy (B7)

| Вопрос                     | Что известно                                                                                                                                                                                                                                                                                                     | Статус                                                 |
| -------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------ |
| Где хранятся файлы         | VK Cloud Object Storage; регионы по документации — Москва (`ru-msk`) и Казахстан (`kz-ast`).                                                                                                                                                                                                                     | **ПРОВЕРИТЬ** регион бакета в кабинете                 |
| Журналы доступа к бакету   | Самостоятельного server access logging в документации публичного облака нет; FAQ: журнал действий — через техподдержку (`storage/s3/faq`). Наличие, состав (IP, User-Agent) и срок хранения журналов у провайдера не описаны.                                                                                    | **Подтверждение провайдера** (запрос в поддержку)      |
| Журналы CDN                | Сырые логи владельцу недоступны («не предусмотрена», `networks/cdn/faq`). В API есть поле `logTarget` (syslog в реальном времени). Статистика: трафик, коды ответов, кэш, регионы, страны; выгрузка за период больше месяца недоступна (`networks/cdn/monitoring`). Что и сколько хранит провайдер — не описано. | **Подтверждение провайдера**                           |
| Где обрабатываются запросы | CDN: более 46 точек присутствия — 16 городов РФ, Алматы, Амстердам, Ашберн, Франкфурт, Сингапур и др. (`networks/cdn/faq`, `concepts/about`). Посетителя может обслужить узел за пределами РФ.                                                                                                                   | Факт из документации; формулировку утверждает владелец |
| Cookies инфраструктуры     | Сайт cookies не ставит. Ставят ли свои cookies CDN или S3 — в документации нет.                                                                                                                                                                                                                                  | **ПРОВЕРИТЬ** заголовки `Set-Cookie` на staging        |
| WAF / anti-bot challenge   | WAF и защита от DDoS — через поддержку; secure token, ACL по странам, referrer, IP — опции ресурса. Ничего из этого не включается.                                                                                                                                                                               | Включение — **РЕШЕНИЕ ВЛАДЕЛЬЦА**                      |
| Субпроцессоры              | Провайдер — VK Cloud. Список IP точек CDN опубликован на `api.lk.cdn.megafon.ru` (`networks/cdn/faq`); кто эксплуатирует узлы CDN и какое юрлицо указывать в Privacy — не описано.                                                                                                                               | **Подтверждение провайдера**                           |

Пока провайдер не ответил, текст Privacy не должен утверждать, что технических логов нет.

## 12. Открытые пункты и NO-GO к WEB-M0.6B

- **ПРОВЕРИТЬ на staging:** статус 404 у ErrorDocument; сохранение Content-Type и Cache-Control; origin CDN = website-хост; TLS на служебном домене; HTTP → HTTPS; `Set-Cookie` от инфраструктуры; права ключа бакета.
- **Владелец:** ключ бакета и environment; первый запуск workflow после merge; CDN-ресурс; бюджет; решение по apex; запрос в поддержку о журналах.
- **NO-GO к публичному запуску (WEB-M0.6B):**
  - B7 (Privacy, Terms, Contact);
  - B6 / `RELEASE.checked`;
  - факты о журналах из раздела 11;
  - DNS и apex;
  - снятие `Disallow: /` (вместе с тестами и защитой в `scripts/deploy/objects.ts`);
  - HSTS.
