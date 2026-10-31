# Деплой на VK Cloud Object Storage + CDN — WEB-M0.6A (Issue #12, #14)

Статус актуализирован **2026-10-31** в [Issue #16](https://github.com/AlexeyKravtsov95/MythweldWeb/issues/16).
Runbook сохраняет процедуры и исторические наблюдения от **2026-10-28** после первого
деплоя (run [40681410586](https://github.com/AlexeyKravtsov95/MythweldWeb/actions/runs/40681410586))
и решения владельца по HTTP 403 (Issue #14).

**Текущий статус по сведениям владельца (2026-10-30):** отдельный CDN уже создан,
`mythweld.com` подключён через Cloudflare Free, apex CNAME flattening, DNS only на
`cl-541e19d9.service.cdn.msk.vkcs.cloud`; NS `aragorn.ns.cloudflare.com`, `mira.ns.cloudflare.com`.
HTTPS `/` и `/ru/` → HTTP/2 200, TLS 1.3, Let's Encrypt до 2027-01-28.
HTTP apex → 200 без редиректа. CNAME поддоменов `journal`, `legal`, `ota` сохранены;
их HTTPS этим не подтверждён. Повторная сетевая проверка и инспекция кабинетов в Issue #16 не проводились.

Сверено из репозитория: workflow остаётся ручным, environment называется `vk-cloud-staging`,
`robots.txt` сохраняет `Disallow: /`, B6/B7 открыты. Название environment не изолирует бакет
от работающего домена. Техническая доступность не означает release approval.
Issue #16 меняет только документацию и skills; merge, production deploy и изменения
DNS/CDN/S3/secrets не выполняются. Сводка оставшихся проверок — [current-state.md](current-state.md).

Источники фактов: официальный репозиторий документации [vk-cs/docs-public](https://github.com/vk-cs/docs-public) (ветка `master`, коммит `b711105` от 28.10.2026, пути ниже — от `docs/ru/`) и анонс хостинга статических сайтов в канале VK Cloud ([пост 1357](https://t.me/s/vk_cloud_news/1357), ~14.07.2026; пост 1347 из Issue — про Managed Kubernetes). Пометка **ПРОВЕРИТЬ** — в документации нет ответа или она противоречит сама себе, нужна проверка на живом ресурсе. Пометка **РЕШЕНИЕ ВЛАДЕЛЬЦА** — выбор за владельцем.

## 1. Схема

```text
GitHub Actions (workflow_dispatch, одобрение владельца)
  └─ npm ci → npm run verify → secret scan → план загрузки → артефакт dist/
       └─ aws s3 cp по одному файлу (Content-Type, Cache-Control) → бакет mythweld-web
            ├─ Static-Site Hosting бакета: index.html / 404.html
            │    https://mythweld-web.hb-website.ru-msk.vkcloud-storage.ru
            └─ отдельный CDN-ресурс (не OTA), уже создан по сведениям владельца
                 cl-541e19d9.service.cdn.msk.vkcs.cloud
                 mythweld.com ← Cloudflare apex CNAME flattening, DNS only
```

Origin/Host CDN должны указывать на website-хост; фактические настройки и поведение через CDN ещё требуют проверки. Схема не подтверждает настройки кабинета.

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

Метаданные задаются при загрузке каждого объекта (`--content-type`, `--cache-control`). Документация не говорит, сохраняет ли VK S3 их без изменений; первый деплой подтвердил: website-хост отдаёт ровно заданные Content-Type и Cache-Control (smoke проверяет это на каждом деплое). Изменить метаданные уже загруженного объекта можно только повторной загрузкой (`storage/s3/concepts/about`); лимит метаданных — 2048 байт.

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

   Адрес сайта (подтверждён на живом бакете): **`https://mythweld-web.hb-website.ru-msk.vkcloud-storage.ru`**. Раньше здесь был ошибочный `mythweld-web.hb-website.hb.ru-msk.…` с лишним `hb.` — его не использовать. Путь на `/` отдаёт `<путь>/index.html`; путь без `/`, для которого нет объекта, перенаправляется на `…/` (`/talentforge` → 302 на `/talentforge/`).

   **Отсутствующий URL → HTTP 403 с нашей страницей 404 (известное ограничение VK Cloud, неблокирующее).** Наблюдение 2026-10-28 (smoke run 40681410586 и `curl -i` владельца):
   - `GET /404.html` → **200**, `text/html; charset=utf-8`, `Cache-Control` класса `document`, фирменная страница «Page not found · Страница не найдена» (`data-not-found="en"`, `noindex`);
   - `GET /this-page-does-not-exist` → **403 Forbidden**, `text/html; charset=utf-8`, **та же** фирменная страница.

   То есть `ErrorDocument` настроен и работает, но сервис сохраняет статус 403, а не 404. Вероятная причина — у анонимного пользователя нет `s3:ListBucket` (так ведёт себя S3 GetObject API), но для website endpoint это поведение провайдера не задокументировано; причина **не подтверждена** VK Cloud. **Решение владельца (Issue #14):** принять как известную особенность, в поддержку ради этого не обращаться, **публичный `s3:ListBucket` не добавлять** (он позволил бы перечислять все объекты бакета). Smoke считает такой ответ WARN (раздел 8), любой другой ответ на отсутствующий URL — FAIL. Остаточный риск: поисковики увидят 403 вместо 404 для несуществующих адресов; пока действует `Disallow: /` это не важно, пересмотреть в WEB-M0.6B.

4. **HTTPS на website-хосте работает** (подтверждено smoke из GitHub Actions и `curl` владельца), вопреки фразе `storage/s3/concepts/about` о «доступе только через HTTP». **Редиректа HTTP → HTTPS на website-хосте нет:** `http://…/` отвечает 200 — smoke отмечает это WARN. Принудительный HTTPS — задача CDN (раздел 7.1).
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
     - `STAGING_BASE_URL` — адрес для smoke: сейчас `https://mythweld-web.hb-website.ru-msk.vkcloud-storage.ru`, после проверки CDN — `https://cl-….service.cdn.msk.vkcs.cloud` (раздел 7.1, шаг 6).
4. GitHub маскирует значения секретов в логах. Скрипты ключи не читают и не печатают: их получает только AWS CLI через свои переменные окружения в шаге «Upload to mythweld-web».

## 7. CDN-ресурс для сайта

Отдельный ресурс сайта **уже создан** (сведения владельца, Issue #16); ресурс OTA не переиспользовать, не копировать и не менять. Таблица ниже — исходные рекомендации настройки от 2026-10-28, а не отчёт об их применении. Раздел 7.1 сохранён как исторический чек-лист; повторно создавать ресурс по нему не нужно. Настройки (`networks/cdn/instructions/create-resource`, `manage-cdn/*`):

| Настройка            | Значение                                                                                                                                                                                                                                                                                                                                                                    |
| -------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Способ создания      | CDN → «Создать ресурс» со своим источником. Создание из вкладки бакета ставит origin и Host на S3 API-хост `hb.ru-msk.vkcloud-storage.ru` (`storage/s3/_includes/_s3-create-cdn.md`), а он **не** раскрывает `/ru/` → `index.html` и не отдаёт `404.html`.                                                                                                                  |
| Источник (origin)    | Website-хост бакета `mythweld-web.hb-website.ru-msk.vkcloud-storage.ru` — без схемы и `/`, **не** S3 API-хост. Критерий — smoke через CDN (раздел 7.1, шаг 6).                                                                                                                                                                                                              |
| Протокол к источнику | HTTPS, если мастер его предлагает: website-хост отвечает по HTTPS (раздел 4). Если доступен только HTTP — записать выбор в Issue.                                                                                                                                                                                                                                           |
| Host header          | «Кастомный» = `mythweld-web.hb-website.ru-msk.vkcloud-storage.ru` (тот же хост, что origin, без схемы).                                                                                                                                                                                                                                                                     |
| Персональный домен   | `mythweld.com` уже подключён к отдельному ресурсу `cl-541e19d9.service.cdn.msk.vkcs.cloud` (владелец, 2026-10-30). Сведения о домене заменяют прежнее предположение о будущем отдельном ресурсе. Домены `journal`, `legal`, `ota` не добавлять.                                                                                                                             |
| Сертификат           | Let's Encrypt (выпуск обычно до 30 минут; нужен включённый «Доступ к контенту конечным пользователям» и домен, указывающий на CDN) или свой PEM. Есть ли TLS на служебном домене — **ПРОВЕРИТЬ**. TLS ≥ 1.2.                                                                                                                                                                |
| HTTP → HTTPS         | Отдельной опции в документации нет — **ПРОВЕРИТЬ** в кабинете («принудительный HTTPS» или аналог). На website-хосте редиректа нет. Smoke отмечает результат как WARN.                                                                                                                                                                                                       |
| Кэш на CDN           | «Настройка источника»: CDN берёт `Cache-Control` объектов (`s-maxage=300` для HTML, год для `_astro/`). Без заголовка TTL был бы 4 дня, поэтому заголовок есть у каждого объекта.                                                                                                                                                                                           |
| Кэш в браузере       | «По источнику».                                                                                                                                                                                                                                                                                                                                                             |
| Query string         | «Игнорировать все»: параметров на сайте нет, `?x=1` не создаёт копий в кэше.                                                                                                                                                                                                                                                                                                |
| Заголовки ответа     | `staticHeaders` (до 50): `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `X-Frame-Options: DENY`, `Permissions-Policy: camera=(), microphone=(), geolocation=()`. `Strict-Transport-Security` — только в WEB-M0.6B на боевом домене после проверки HTTPS. CSP — отдельно: Astro встраивает стили и скрипт меню inline.               |
| Методы               | GET/HEAD (по умолчанию).                                                                                                                                                                                                                                                                                                                                                    |
| Rewrite              | Не поддерживается («такая возможность не предусмотрена», `networks/cdn/faq`). Раскрытие `/ru/` делает website-хост бакета. Умеет ли CDN превратить 403 отсутствующего объекта в 404 — **не проверено**: так не утверждать и глобальную замену 403 → 404 не настраивать (настоящие отказы в доступе должны оставаться 403). Прокси или VM только ради кода 404 не добавлять. |
| www → apex           | Поведение DNS/TLS/редиректа `www` ещё не подтверждено. Вариант `force_return` 301 — прежняя рекомендация, не выполненная настройка и не разрешение создать ресурс.                                                                                                                                                                                                          |

### 7.1. Исторический чек-лист создания CDN (2026-10-28)

**Не инструкция к повторному выполнению:** на 2026-10-31 ресурс и apex уже настроены по сведениям владельца. Ограничения staging и будущий выбор домена в шагах ниже относятся к Issue #12/#14; актуальные открытые проверки — раздел 12.

Агент ничего не создаёт и не меняет: каждый шаг выполняет владелец в кабинете VK Cloud. Ресурс OTA не открывать на редактирование и не использовать как шаблон. Результат каждого шага с пометкой «записать» — в комментарий к Issue.

0. **Исходное состояние.** Последний деплой без FAIL; ожидаемые WARN — 4 × `403` на отсутствующих URL и `http → https`. Проверка: `curl -sI https://mythweld-web.hb-website.ru-msk.vkcloud-storage.ru/ru/` → `200`.
1. **Создание.** CDN → «Создать ресурс» (не из вкладки бакета). Имя, например, `mythweld-web-staging`.
2. **Источник.**
   - Адрес: `mythweld-web.hb-website.ru-msk.vkcloud-storage.ru` — без `https://` и без `/`. Не `hb.ru-msk.vkcloud-storage.ru` (S3 API-хост).
   - Протокол к источнику: HTTPS, если есть в мастере; иначе HTTP. Записать, что выбрано и какие варианты были.
   - Host header: «Кастомный» = `mythweld-web.hb-website.ru-msk.vkcloud-storage.ru`.
3. **Домен.**
   - Если мастер позволяет создать ресурс только со служебным доменом `cl-….service.cdn.msk.vkcs.cloud` — так и сделать.
   - **Если мастер требует персональный домен — остановиться.** Это ручной blocker: персональные домены после создания не меняются, а DNS в этой задаче не трогаем. Записать в Issue, что требуется, и предложить владельцу вариант на согласование (например, отдельный staging-поддомен). Ничего не создавать до решения. `mythweld.com`, `www`, `journal`, `legal`, `ota` не добавлять.
4. **TLS и HTTPS.**
   - Записать, есть ли сертификат на служебном домене без своего сертификата. Let's Encrypt выпускается только для персонального домена, который уже указывает на CDN (до ~30 минут).
   - Найти опцию принудительного HTTPS (HTTP → HTTPS). Если есть — включить и записать её название; если нет — WARN в smoke остаётся.
   - Минимальная версия TLS — 1.2.
5. **Кэш и заголовки.**
   - Кэш на CDN — «Настройка источника»: HTML `s-maxage=300`, `_astro/` — `max-age=31536000, immutable`, `fonts/`, `og/`, `favicon.svg` — сутки. Если такого режима нет — единый TTL не больше 5 минут, записать.
   - Кэш в браузере — «По источнику»; query string — «Игнорировать все».
   - `staticHeaders` — из таблицы выше; `Strict-Transport-Security` не добавлять.
   - Правила подмены кода ответа (403 → 404) не включать, пока не доказано, что они затрагивают только отсутствующие объекты.
6. **Проверка служебного URL CDN** — до смены `STAGING_BASE_URL`:
   ```bash
   npm run smoke -- https://cl-XXXXXXXX.service.cdn.msk.vkcs.cloud
   ```
   Ожидание: 6 маршрутов = `200` с верным `<html lang>`; ассеты, шрифт, OG, favicon, `robots.txt`, `sitemap.xml` — PASS; 4 отсутствующих URL — PASS (`404`) или WARN (`403` + наша страница); `http → https` — PASS или WARN. **Любой FAIL — ресурс настроен неверно**, `STAGING_BASE_URL` не менять. Дополнительно вручную (подставить свой `cl-…`):
   ```bash
   curl -sI https://cl-XXXXXXXX.service.cdn.msk.vkcs.cloud/ru/
   ```
   ```bash
   curl -si https://cl-XXXXXXXX.service.cdn.msk.vkcs.cloud/no-such-page/ | head -n 20
   ```
   ```bash
   curl -sI http://cl-XXXXXXXX.service.cdn.msk.vkcs.cloud/
   ```
   ```bash
   openssl s_client -connect cl-XXXXXXXX.service.cdn.msk.vkcs.cloud:443 -servername cl-XXXXXXXX.service.cdn.msk.vkcs.cloud </dev/null | openssl x509 -noout -subject -issuer -dates
   ```
   Записать: статус и тело отсутствующего URL через CDN (403 не считать исправленным без этой проверки), повторный запрос `/ru/` — есть ли заголовок попадания в кэш и как он называется, `Cache-Control` на ответе CDN, редирект HTTP → HTTPS, сертификат (субъект, издатель, срок), `Set-Cookie` (раздел 11).
7. **Только после smoke без FAIL:** сменить `STAGING_BASE_URL` в environment `vk-cloud-staging` на служебный URL CDN. DNS не трогать.
8. **Apex `mythweld.com`** — ниже; текущие DNS-записи остаются без изменений, выбор ALIAS/ANAME или `www` с редиректом — в WEB-M0.6B.

Ограничения:

- Ресурс автоматически приостанавливается, если за 14 дней прошло меньше 1 МБ трафика (`networks/cdn/concepts/resource`). Staging может «уснуть».
- Цены на хранение, исходящий трафик S3 и трафик CDN в документации не приведены (только cloud.vk.ru/pricelist). Бюджет — **РЕШЕНИЕ ВЛАДЕЛЬЦА**.

### Очистка кэша (purge)

- **Обычный деплой purge не требует:** HTML живёт на CDN 5 минут, файлы `_astro/` получают новые имена.
- **Purge нужен,** если заменены `fonts/*`, `og/*`, `favicon.svg` (кэш 24 часа) или откат нужен быстрее 5 минут.
- **В кабинете:** CDN → ресурс → вкладка «Контент» → «Полная» или «Выборочная» (маски с `*`, пути начинаются с `/`, например `/og/*`) (`networks/cdn/instructions/manage-cdn/content-settings`).
- **Через API:** `POST https://msk.cloud.vk.ru/api/cdn/api/v1/projects/{project_id}/resources/{id}/purge`, тело `{"paths": [...]}`, `[]` = очистить всё. Не чаще одного запроса в минуту, иначе 429. Аутентификация — Keystone-токен (`X-Auth-Token`) пользователя OpenStack проекта. Его права шире одного бакета, поэтому в GitHub Secrets в этом PR он **не** добавляется. Автоматический purge — отдельная задача, если понадобится (сначала **ПРОВЕРИТЬ**, есть ли роль только для CDN).

### Apex `mythweld.com`: текущий статус и прежние варианты

Выбор уже сделан: Cloudflare Free, CNAME flattening, DNS only → `cl-541e19d9.service.cdn.msk.vkcs.cloud` (сведения владельца в Issue #16). Следующий список — исторические варианты от 2026-10-28, не открытый выбор и не инструкция менять DNS.

VK CDN документирует подключение домена только через **CNAME** на служебный домен ресурса, A/ALIAS для apex не описаны. CNAME на apex по стандарту DNS невозможен рядом с SOA/NS/MX. Варианты, каждый — после проверки у DNS-провайдера `mythweld.com`, где уже живут `journal`, `legal`, `ota`:

1. Провайдер поддерживает ALIAS/ANAME/CNAME-flattening → apex на служебный домен CDN.
2. Основной адрес — `www.mythweld.com` (CNAME), apex → 301 на `www` средствами DNS-провайдера.
3. Статические IP для A-записей — **ПРОВЕРИТЬ** в поддержке VK Cloud.

NS и записи поддоменов не менять. Для WEB-M0.6B остаются проверки HTTP → HTTPS и `www`, а не повторный выбор apex.

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
   - 4 неизвестных пути (в корне, в `/ru/`, внутри раздела, в `_astro/`) — только для них:
     - `404` + страница 404 сайта (`text/html`, маркеры `data-not-found="en"`, `data-not-found="ru"`, `noindex`) → **PASS**;
     - `403` + та же страница → **WARN** «VK Cloud known limitation: HTTP 403 with custom 404 document» (раздел 4, решение владельца в Issue #14);
     - `200` (fallback), `403`/`404` с чужим телом или не `text/html`, любой другой статус → **FAIL**;
   - `robots.txt`: 200 и `Disallow: /`; `sitemap.xml`: 200 и XML;
   - `_astro/*.css`, `*.avif`, `*.webp`: тип и `immutable`; шрифт, share card, favicon: тип и `static`;
   - WARN (не провал): `403` на неизвестных путях (см. выше); `/talentforge` без слеша → редирект на `/talentforge/`; `http://` → `https://`.
   - Для существующих страниц и файлов исключений нет: `403` (как и любой не-`200`) на маршруте, ассете, `robots.txt` или `sitemap.xml` — **FAIL**.
   - Итог «N PASS, N WARN, N FAIL» и таблица попадают в Summary запуска, WARN дополнительно выводятся как аннотации `::warning`. WARN не делает job красным; job падает только при FAIL.
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

## 12. Открытые проверки и release gates на 2026-10-31

- **Из репозитория:** ручной workflow, бакет `mythweld-web`, environment `vk-cloud-staging`, защита `Disallow: /`, B6/B7. Это не проверка живой инфраструктуры.
- **Исторически, 2026-10-28 (run 40681410586):** website-хост — 143/143 объекта, шесть маршрутов = 200, типы/кэш, ассеты, robots и sitemap — PASS; `/talentforge` → 302. Отсутствующий URL → 403 с нашей 404 — принятый WARN (раздел 4), не исправленный статус 404.
- **Владелец, 2026-10-30 (Issue #16):** CDN и apex уже настроены; HTTPS `/` и `/ru/` = HTTP/2 200, TLS 1.3, сертификат до 2027-01-28; HTTP apex = 200 без редиректа. CNAME поддоменов сохранены, их HTTPS отдельно не проверен.
- **ПРОВЕРИТЬ в отдельной Issue WEB-M0.6B:** фактический origin/Host CDN, шесть маршрутов и метаданные через CDN, служебный TLS, отсутствующие URL, `Set-Cookie`, права ключа бакета; HTTP → HTTPS и `www` (DNS/TLS/редирект), HSTS. Новые результаты записывать с датой/методом отдельно от прежних наблюдений.
- **Владелец:** B6 / подтверждение статусов перед обновлением `RELEASE.checked`; B7 / утверждение Privacy, Terms, Contact и фактов о журналах (раздел 11); бюджет; отдельное release approval. До него `Disallow: /` сохраняется. Robots не является контролем доступа.
- Перед открытием индексации пересмотреть SEO-риск 403 вместо 404; публичные права бакета ради этого не расширять. Снятие robots-защиты требует согласованных изменений тестов и deploy-проверок, см. [release-readiness.md](release-readiness.md).

Полный краткий статус и приоритеты — [current-state.md](current-state.md). Issue #16 не выполняет merge, production deploy или инфраструктурные изменения.
