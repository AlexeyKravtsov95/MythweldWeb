# Карта архитектуры MythweldWeb

Карта проверена по `main` на **2026-10-31** в [Issue #16](https://github.com/AlexeyKravtsov95/MythweldWeb/issues/16).
Начинать с текущей Issue и [AGENTS.md](../AGENTS.md); эта карта помогает выбрать файлы,
а не требует прочитать их все. Статус инфраструктуры и release gates — в [current-state.md](current-state.md).

## Сборка и поток данных

[astro.config.mjs](../astro.config.mjs): статический Astro 7, `trailingSlash: "always"`,
EN без префикса, RU с `/ru/`. [tsconfig.json](../tsconfig.json) — `strictest`.
Команды и точные зависимости — [package.json](../package.json), Node 24 — [.nvmrc](../.nvmrc).

```text
src/pages/ (маршрут + locale)
  → components/home/ или components/product/ (общая страница для EN/RU)
    → layouts/BaseLayout.astro → SiteHeader / SiteFooter / LanguageSwitcher
    → i18n/ (тексты) + config/ (факты/ссылки) + media/ (оригинальные ассеты)
    → components/ui/ + styles/ (представление)
  → dist/ (HTML, sitemap, robots, шрифты, оптимизированные изображения)
```

## Где искать изменение

| Задача                                       | Пути / символы                                                                                                                                                                                                                      |
| -------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Главная EN/RU                                | [src/pages/index.astro](../src/pages/index.astro), [src/pages/ru/index.astro](../src/pages/ru/index.astro) → [HomePage](../src/components/home/HomePage.astro); блоки в `src/components/home/`                                      |
| TalentForge EN/RU                            | `src/pages/{ru/,}talentforge/index.astro` → [TalentForgePage](../src/components/product/TalentForgePage.astro)                                                                                                                      |
| Forever Journey EN/RU                        | `src/pages/{ru/,}forever-journey/index.astro` → [ForeverJourneyPage](../src/components/product/ForeverJourneyPage.astro)                                                                                                            |
| Общая разметка, SEO, меню, подвал            | [BaseLayout](../src/layouts/BaseLayout.astro), `src/components/{SiteHeader,SiteFooter,LanguageSwitcher}.astro`                                                                                                                      |
| Тексты и локализация                         | [Dictionary](../src/i18n/types.ts), `src/i18n/dictionaries/{en,ru}.ts`; [locales.ts](../src/i18n/locales.ts): `LOCALES`, `localizePath`, `localeFromPath`; [index.ts](../src/i18n/index.ts): `getDictionary`                        |
| Статусы, магазины, дата проверки             | [RELEASE](../src/config/release.ts); B6, только после подтверждения владельца                                                                                                                                                       |
| Существующие внешние ссылки и share-карточки | [SITE](../src/config/site.ts)                                                                                                                                                                                                       |
| Privacy, Terms, Contact                      | [LEGAL](../src/config/legal.ts); B7, пока `null`; неутверждённые черновики — `docs/legal-drafts/`                                                                                                                                   |
| Список основных страниц и sitemap            | [PUBLIC_PATHS](../src/config/pages.ts) → [sitemap.xml.ts](../src/pages/sitemap.xml.ts); три нейтральных пути × две локали = шесть URL                                                                                               |
| 404 и dev-preview                            | [404.astro](../src/pages/404.astro) → `dist/404.html` с EN/RU и `noindex`; [dev/components/[locale].astro](../src/pages/dev/components/[locale].astro) не создаёт production-маршрутов                                              |
| Повторяемые элементы                         | `src/components/ui/`: `ProductPlate`, `ProductAction`, `ReleaseStatus`, `StatusTag`, `FigureWithCaption`, `MediaGrid`, `ClassArtworkGrid`, `AssetPlaceholder`                                                                       |
| Медиа                                        | [catalog.ts](../src/media/catalog.ts): `MEDIA`, `CLASS_ARTWORK`, `ADDON_SCREENSHOTS`, `pickMedia`; [images.ts](../src/media/images.ts): `imageFor`; оригиналы в `src/assets/media/`, происхождение в [manifest](assets-manifest.md) |
| Дизайн                                       | [tokens.css](../src/styles/tokens.css), `src/styles/{global,fonts}.css`, `src/styles/breakpoints.ts`; статические шрифты/лицензии, favicon и OG в `public/`                                                                         |

## Контур публикации

```text
GitHub Actions: .github/workflows/deploy-vk-cloud.yml (только вручную)
  → npm ci → verify → secret scan → план → артефакт dist/
  → scripts/deploy/deploy.ts → S3 bucket mythweld-web (VK Cloud)
  → отдельный VK CDN: cl-541e19d9.service.cdn.msk.vkcs.cloud
  → mythweld.com (Cloudflare Free: apex CNAME flattening, DNS only)
```

Workflow и скрипты проверены в репозитории; сведения о действующем CDN/DNS —
от владельца в Issue #16, не результат инспекции кабинетов. Целевой origin — website-хост
`mythweld-web.hb-website.ru-msk.vkcloud-storage.ru`: он раскрывает каталоги в `index.html`
и отдаёт ErrorDocument. Фактические origin/Host, кэш и заголовки CDN ещё требуют проверки.

| Узел                                  | Где смотреть                                                                                                                                                        |
| ------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Проверки PR/push в main               | [.github/workflows/ci.yml](../.github/workflows/ci.yml)                                                                                                             |
| Ручная публикация/откат               | [.github/workflows/deploy-vk-cloud.yml](../.github/workflows/deploy-vk-cloud.yml); environment всё ещё называется `vk-cloud-staging`, это не изоляция от production |
| Метаданные, порядок, запреты загрузки | [objects.ts](../scripts/deploy/objects.ts): `CACHE`, `planUpload`, `isForbidden`; проверяет `Disallow: /`                                                           |
| Загрузка, dry-run, устаревшие объекты | [deploy.ts](../scripts/deploy/deploy.ts); локальный `npm run deploy:plan` не публикует                                                                              |
| HTTP smoke                            | [smoke.ts](../scripts/deploy/smoke.ts): `smoke`, `classifyMissing`, `report`; 403 + фирменная 404 = WARN, остальные ошибки = FAIL                                   |
| Секреты и конфигурация бакета         | [check-secrets.ts](../scripts/check-secrets.ts), `deploy/vk-cloud/{website,bucket-policy}.json`; значения ключей не читать/не выводить                              |

Процедуры, права, purge и rollback — [runbook](deploy-vk-cloud.md), разделы 3–11.
Изменение инфраструктуры или production deploy допускается только отдельной согласованной задачей.

## Точки изменения для будущих Issue

**Новая страница:** маршрут в `src/pages/` для каждой локали → общий компонент и
`BaseLayout` с нейтральным `path` → сначала тип `Dictionary`, затем EN/RU →
`PUBLIC_PATHS` для основной страницы (обновляет sitemap) → нужные ссылки навигации →
проверки ожидаемых маршрутов/SEO в `tests/`. Не добавлять URL до существования страницы.

**Release facts:** подтверждение владельца → `src/config/release.ts` (включая `checked`)
и только реально опубликованные URL; локализованные названия статусов — в словарях.
Legal отдельно: утверждённые EN/RU документы и контакт → `src/config/legal.ts`.
Снятие `Disallow: /` — отдельное release approval; связанные проверки и защита перечислены
в [release-readiness.md](release-readiness.md). В Issue #16 эти файлы не меняются.

**Деплой:** согласованная Issue → проверки и план → ручной workflow владельца для
проверенного коммита из `main` → smoke и запись результатов. Merge выполняет владелец.

## Проверки и выборочное чтение

- `tests/{i18n,tokens,fonts,media,components}.test.ts` — контракты локализации, дизайна, ассетов и UI.
- `tests/{build,home,product-pages,release}.test.ts` — собранные страницы, маршруты, SEO, B4/B7 и robots.
- `tests/{deploy,secrets}.test.ts` — план/запреты загрузки, workflow, эмуляция HTTP и сканер секретов; не доказательство состояния production.

`npm run verify`: формат → `astro check` + `tsc` → сборка → Vitest.
Smoke-тестам нужен `dist/`, поэтому отдельно `npm test` запускается после сборки.
Поиск: `rg --files src tests scripts` → `rg -n 'символ' <нужный каталог>` → чтение диапазона.
Полный аудит, другие репозитории и автоматическая загрузка всей документации не нужны.
