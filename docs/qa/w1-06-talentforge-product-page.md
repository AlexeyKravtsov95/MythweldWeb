# W1.06 — TalentForge Product Page & Conversion — QA-отчёт

Проверка **2026-11-25**, Issue [#38](https://github.com/AlexeyKravtsov95/MythweldWeb/issues/38).
Ветка `feature/w1-06-talentforge-product-growth`, база `origin/main` = `358265b` (PR #37).
Сайт собран локально (`npm run build`), проверен через `astro preview` в реальном Chrome.

| Решение                | Статус                                                               |
| ---------------------- | -------------------------------------------------------------------- |
| Локальные проверки     | `npm run verify` — 711/714 PASS (3 падения предсуществующие, см. §5) |
| Secrets                | `npm run secrets:check` — 272 + 157 файлов, 0 находок                |
| Браузерная матрица     | PASS: EN/RU × 320/390/768/1440, overflow 0, битых изображений нет    |
| Indexing / Legal gates | Не менялись: `robots.txt` закрыт, `PUBLIC_PATHS`, `LEGAL` как в main |
| Production deploy      | **Не выполнялся** (за пределами задачи)                              |

## 1. Что изменено

### Первый экран (hero)

- В `.intro` добавлены: факт-строка «Free / All nine classes / Works offline»
  («Бесплатно / Все девять классов / Работает офлайн») и основная кнопка установки
  **Install on Google Play** (`ProductAction`, ссылка из `RELEASE.talentforge.googlePlay`,
  при `null` — честный disabled-стейт с причиной).
- Кнопка находится **до** большого скриншота в DOM; на мобильных (одноколоночный hero
  ≤900 px) она видна в первом экране — до скриншота. Проверено измерением прямоугольников:
  EN/RU 320 и 390 — кнопка (273–335 × 48 px) заканчивается выше верха `.hero-shot`.
- Lead теперь называет приложение бесплатным планировщиком талантов WoW: Forever и
  упоминает офлайн-планирование.

### Статусы магазинов (`ReleaseStatus.astro`)

- Убраны отдельные строки платформ Android/iOS — статус платформы показывается в строке
  соответствующего магазина. Панель: **Google Play — Available** (кнопка-ссылка),
  **App Store — Awaiting Apple review** (кнопка disabled, «link pending»), данные талантов v1.60.1.
- Дублирование «платформа + магазин» устранено; правило «ссылка ≠ доступность» сохранено:
  строка магазина всегда показывает состояние платформы из конфига, а не факт наличия URL.

### Возможности (секция «What it does» / «Что умеет»)

Актуализированы по фактически выпущенной версии **1.1.0 (6)** в Google Play
(доставка подтверждена журналом `docs/release/m7-android-1.1.0/production-delivery.md`
и релиз-черновиками `play-production-6`/`android-store-6`, 2026-11-16–18):

- добавлены карточки «Your build library» и «Search, sort and favorites» (1.1.0:
  `feat(library): build sorting and class grouping`, `fix(library): favorites…`, release notes
  «Added build search, favorites, and filters / Added sorting and grouping for saved builds»);
  карточка поиска/сортировки помечена «not shown in the screenshots on this page»;
- «Import and share builds» переименована в «Import and export build codes»;
- добавлена карточка «Talent data updates»: обновление данных без переустановки — только
  в **OTA-enabled сборках** (без обещания для каждой сборки), сохранённый билд открывается
  на своей версии данных. Устаревшее утверждение «OTA отключён во всех сборках» удалено
  со страницы и из `docs/assets-manifest.md`.

### Контент для TalentForge 1.2 (W1.04, PR #162)

- `RELEASE.talentforge.upcoming.buildMigration = { version: "1.2", released: false }` —
  механизм флага в существующем release-конфиге, выключен по умолчанию.
- Тексты EN/RU («Keep your builds across game updates» / «Сохраняйте билды при обновлении
  игры») и разметка секции готовы; секция и её скриншоты **не рендерятся**, пока владелец
  не включит флаг после публичного выпуска 1.2.
- Настоящие скриншоты функции добавлены в реестр: `docs/screenshots/w1-04-build-migration/`
  TalentForge, commit `29d0429…` (merge PR #162), группа `tf-build-migration`, EN+RU,
  780×1688, платформа `compose` (общий интерфейс Compose, снят `BuildMigrationUiTest`).
  В `dist/` не попадают, пока флаг выключен.

### FAQ

Секция «04 FAQ» из 7 вопросов EN/RU: что такое TalentForge; Forever или Retail; нужен ли
интернет; где хранятся билды; можно ли поделиться билдом; поддержка русского; нужен ли
аккаунт. Ответы соответствуют выпущенной функциональности (офлайн-планирование, хранение
только на устройстве, коды билдов, язык телефона).

### SEO

- Title: `TalentForge — WoW Forever talent calculator & planner · Mythweld` (EN),
  `TalentForge — калькулятор талантов WoW Forever · Mythweld` (RU); ≤70 символов, уникальны.
- Description естественно содержит целевые формулировки (talent calculator/planner/builds;
  калькулятор/планировщик талантов, билды) — без keyword stuffing и скрытого текста.
- Canonical, hreflang EN/RU + x-default, OG/Twitter, sitemap — без изменений
  (инфраструктура `BaseLayout`/`PUBLIC_PATHS`), проверены тестами.
- Новых страниц/класс-страниц не создавалось (отложено на W2).

## 2. Источники release-фактов

| Факт                             | Источник в `AlexeyKravtsov95/TalentForge`                                                                                              |
| -------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| Google Play production доступен  | подтверждён ранее (PR #36/#37 MythweldWeb), `RELEASE.checked = 2026-11-10`, ссылка в конфиге                                           |
| 1.1.0 (6) в production           | `docs/release/m7-android-1.1.0/production-delivery.md`, релизы `play-production-6`/`android-store-6`, PR #148/#157                     |
| Поиск/сортировка/избранное       | PR #145, #147; release notes 1.1.0                                                                                                     |
| OTA-enabled сборки               | `docs/ota/android-production-enablement.md` (M5.OTA.PROD.3: код 2 в Google Play с OTA ON; production-путь 1.1.0 требует OTA-preflight) |
| W1.04 (перенос билда) не выпущен | PR #162 merged 2026-11-25, публичного релиза 1.2 нет → флаг `released: false`                                                          |
| iOS не выпущена                  | статус `awaiting_review` не менялся; App Store `null`, кнопка disabled                                                                 |

App Store, RuStore и Huawei AppGallery не добавлялись: публичный статус и URL не
подтверждены владельцем.

## 3. Проверки

- `npm run verify`: формат → `astro check` + `tsc` (0 ошибок) → build (13 страниц) → Vitest.
- `npm run secrets:check`: 0 находок (репозиторий и `dist/`).
- Браузер (Chrome, `astro preview`): EN/RU × 320/390/768/1440 —
  `scrollWidth = clientWidth` (горизонтального overflow нет), все изображения декодируются,
  консоль без ошибок (единственный issue — подсказка DevTools о явных размерах lazy-картинок,
  предсуществующий паттерн), цели нажатия в main ≥ 44×44, H1 один, уровни заголовков без
  пропусков (проверено тестами).
- Битых ссылок нет: внешние — только `SITE.links` + подтверждённый Google Play (тест
  `links only to existing pages and approved external resources`), внутренние — проверены
  против `dist/`.
- Регрессий других продуктовых страниц нет: тесты `/`, `/forever-journey/`, `/book-creator/`,
  `/community/`, privacy — PASS.

## 4. Before / After

| Ракурс           | Before                                         | After                                        |
| ---------------- | ---------------------------------------------- | -------------------------------------------- |
| EN, desktop 1440 | [before-en-1440.png](w1-06/before-en-1440.png) | [after-en-1440.png](w1-06/after-en-1440.png) |
| RU, desktop 1440 | [before-ru-1440.png](w1-06/before-ru-1440.png) | [after-ru-1440.png](w1-06/after-ru-1440.png) |
| EN, mobile 390   | [before-en-390.png](w1-06/before-en-390.png)   | [after-en-390.png](w1-06/after-en-390.png)   |
| RU, mobile 390   | [before-ru-390.png](w1-06/before-ru-390.png)   | [after-ru-390.png](w1-06/after-ru-390.png)   |

Снимки: реальный Chrome, viewport 1440×900 / 390×844 (DPR 1), верх страницы.
До: на мобильных кнопки установки не было в первом экране (панель релиза — после
скриншота). После: факты + кнопка в первом экране, до скриншота.

## 5. Ограничения и нерешённое

- **Предсуществующие локальные падения на Windows** (не связаны с задачей, на CI ubuntu
  зелёные; предсуществование подтверждено `git stash -u` + повторный прогон на чистом дереве):
  `tests/build.test.ts` («contains only the expected pages»), `tests/media.test.ts`
  («are exactly the catalogued files»), `tests/release.test.ts` («exports no internal drafts…») —
  все три из-за `\` вместо `/` в путях `readdirSync` на Windows.
- Блок 1.2 появится только после включения флага владельцем (`released: true`) и,
  при желании, обновления `RELEASE.checked`.
- Индексация по-прежнему закрыта (`Disallow: /`), production deploy не выполнялся,
  merge — за владельцем.
- Full GitHub CI будет запущен пушем ветки; его результат — в PR.
