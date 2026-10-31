# Mythweld Web

Основной сайт [Mythweld](https://mythweld.com/) — независимые инструменты для игроков:
**TalentForge** (планировщик талантов World of Warcraft: Forever), **Forever Journey**
(аддон-дневник персонажа) и связанный **Book Creator** (генератор PDF на `journal.mythweld.com`).

## Статус на 2026-10-31

В `main` реализованы главная и обе продуктовые страницы на EN/RU, SEO-метаданные,
`sitemap.xml`, общая 404-страница и ручной деплой в VK Cloud. По наблюдениям владельца
от **2026-10-30**, записанным в [Issue #16](https://github.com/AlexeyKravtsov95/MythweldWeb/issues/16),
`https://mythweld.com/` и `/ru/` отвечают HTTP/2 200 через отдельный VK CDN;
HTTP пока отвечает 200 без редиректа. Повторная сетевая проверка в Issue #16 не выполнялась.

Техническая доступность по URL не закрывает release gates: **B6** (подтверждение
статусов/магазинов) и **B7** (утверждение Privacy, Terms, Contact) остаются открыты.
В репозитории `RELEASE.checked = 2026-10-26`, legal-адреса — `null`, черновики не
опубликованы. `robots.txt` сохраняет `Disallow: /` до отдельного release approval;
это ограничение индексации, а не доступа. Sitemap уже собирается, но не объявлен в robots.

## Быстрый вход для Codex / Sol

1. Прочитать текущую Issue и [AGENTS.md](AGENTS.md).
2. Найти нужные модули в [карте архитектуры](docs/architecture.md).
3. Для задач о запуске свериться с [текущим состоянием](docs/current-state.md) и
   [release gates](docs/release-readiness.md); читать только релевантные исходники.

Локальные skills: [repo-navigator](.agents/skills/repo-navigator/SKILL.md) для поиска
файлов/символов, [session-handoff](.agents/skills/session-handoff/SKILL.md) для передачи
результатов сессии. Они не требуют автоматического чтения всего репозитория.
Следующий инженерный этап **WEB-M0.6B — отдельная Issue**.

## Стек и маршруты

Astro 7, `output: "static"`, TypeScript `astro/tsconfigs/strictest`, Vitest и Prettier.
Без backend, аккаунтов, БД, cookies и аналитики. Node.js **24 LTS** (`.nvmrc`,
`package.json#engines`); точные версии зависимостей в `package-lock.json`.

| EN                  | RU                     | Компонент                                         |
| ------------------- | ---------------------- | ------------------------------------------------- |
| `/`                 | `/ru/`                 | `src/components/home/HomePage.astro`              |
| `/talentforge/`     | `/ru/talentforge/`     | `src/components/product/TalentForgePage.astro`    |
| `/forever-journey/` | `/ru/forever-journey/` | `src/components/product/ForeverJourneyPage.astro` |

Маршруты обёрнуты файлами в `src/pages/`. Все пользовательские тексты — в типизированных
словарях `src/i18n/dictionaries/`, общий тип — `src/i18n/types.ts`.
`404.html` содержит EN/RU; `/dev/components/{en,ru}/` доступен только в dev и не публикуется.

Дизайн: **Mythweld v3.2 — The Forge (Product First)**, токены — `src/styles/tokens.css`.
Происхождение оригинальных изображений и шрифтов — [assets manifest](docs/assets-manifest.md).

## Локальная работа

```bash
nvm install
nvm use
npm ci
npm run dev
```

Dev-сервер: `http://localhost:4321/`, RU — `/ru/`. Перед PR:

```bash
npm run verify
```

| Команда                  | Назначение                                                   |
| ------------------------ | ------------------------------------------------------------ |
| `npm run check`          | `astro check` + `tsc --noEmit`                               |
| `npm run build`          | Статическая сборка в `dist/`                                 |
| `npm test`               | Vitest; сначала нужна сборка, smoke-тесты читают `dist/`     |
| `npm run format:check`   | Проверка Prettier                                            |
| `npm run verify`         | Формат → типы → сборка → тесты, те же проверки в CI          |
| `npm run preview`        | Локальный просмотр `dist/`                                   |
| `npm run deploy:plan`    | План загрузки `dist/` без публикации                         |
| `npm run secrets:check`  | Проверка отслеживаемых файлов и `dist/` на секреты           |
| `npm run smoke -- <url>` | HTTP smoke указанного адреса; это отдельная сетевая проверка |

## Деплой и границы

GitHub Actions (`workflow_dispatch`) → VK Cloud Object Storage `mythweld-web` →
отдельный VK CDN → `mythweld.com`. DNS — Cloudflare Free, apex CNAME flattening,
DNS only (данные владельца в Issue #16). Подробности и исторические шаги настройки —
[runbook](docs/deploy-vk-cloud.md); текущие открытые проверки — [current state](docs/current-state.md).
Имя environment `vk-cloud-staging` в workflow сохранено и не означает, что домен ещё недоступен.

Изменения — по Issue, отдельная `feature/<issue-id>-<кратко>` и PR в `main`.
Merge выполняет владелец. Production deploy и изменения DNS/CDN/S3/secrets требуют
отдельной согласованной задачи. `journal.mythweld.com`, `legal.mythweld.com`,
`ota.mythweld.com` и другие репозитории не трогать.

Независимый фан-проект, не связан с Blizzard Entertainment.
