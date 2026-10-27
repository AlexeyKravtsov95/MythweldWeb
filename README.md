# Mythweld Web

Official web portal for [Mythweld](https://mythweld.com/): an independent collection of gaming tools.

## Products

- **TalentForge** — mobile talent-build planner for World of Warcraft: Forever.
- **Forever Journey** — in-game character journal addon.
- **Book Creator** — [journal.mythweld.com](https://journal.mythweld.com/), browser-based printable PDF generator.

## Project status

**WEB-M0.3 — home page.** `/` and `/ru/` render the v3.2 home page (The Forge, Product First) from one component, `src/components/home/HomePage.astro`: hero, the TalentForge and Forever Journey plates with real product media, Book Creator as the related tool, Plan → Play → Remember and the footer. Release states come from `src/config/release.ts`, links from `src/config/site.ts`. Product pages (`/talentforge/`, `/forever-journey/`) are WEB-M0.4 and are not linked yet; open release blockers are listed in `docs/assets-manifest.md`. WEB-M0.2 added the curated media, self-hosted Geologica and JetBrains Mono and the components in `src/components/ui/`.

Component preview (development only, never built or published): `npm run dev`, then <http://localhost:4321/dev/components/en/> and `/dev/components/ru/`.

Design baseline: **Mythweld v3.2 — The Forge (Product First)**. Preserve real product imagery: no fabricated class icons, talent trees, app UI, addon screenshots or product features.

## Stack

- [Astro](https://astro.build/) 7, static output (`dist/`), no backend, no analytics, no cookies.
- TypeScript in `astro/tsconfigs/strictest` mode.
- Vitest for unit tests and smoke checks of the built site; Prettier for formatting.
- Node.js **24 LTS** (pinned in `.nvmrc` and `package.json#engines`); exact dependency versions with a committed `package-lock.json`.

## Routing and localization

| Route  | Locale            | Source                     |
| ------ | ----------------- | -------------------------- |
| `/`    | English (default) | `src/pages/index.astro`    |
| `/ru/` | Russian           | `src/pages/ru/index.astro` |

All user-facing copy lives in typed dictionaries (`src/i18n/dictionaries/en.ts`, `ru.ts`) that must satisfy the `Dictionary` type in `src/i18n/types.ts`; a missing or extra key fails type checking. Routing helpers (`localizePath`, `localeFromPath`) are in `src/i18n/locales.ts`.

## Project structure

```text
.github/workflows/ci.yml  CI: npm ci → format → check → build → test
docs/assets-manifest.md   provenance, kinds and usage rules of every image and font
docs/screenshots/         component screenshots attached to PRs
public/                   static files (robots.txt, favicon, fonts/ with OFL licences)
src/assets/media/         curated original product images (see the manifest)
src/components/           header (with mobile menu), footer, language switcher, logo
src/components/home/      home page: HomePage and its plates and Plan → Play → Remember
src/components/ui/        v3.2 components: ProductPlate, ProductAction, StatusTag,
                          ReleaseStatus, FigureWithCaption, AssetPlaceholder,
                          ClassArtworkGrid, MediaGrid
src/config/               site links and release facts (statuses, store links)
src/i18n/                 locales, routing helpers, typed dictionaries
src/layouts/              BaseLayout: <html lang>, meta, hreflang, skip link, font preload
src/media/                typed media catalog and image lookup
src/pages/                routes: / and /ru/ (+ dev-only /dev/components/{en,ru}/)
src/styles/               tokens.css (v3.2 tokens), fonts.css, global.css
tests/                    i18n, tokens, fonts, media, components, built-site smoke tests
AGENTS.md                 working rules for AI agents (in Russian)
```

## Local development on macOS

1. Install Node.js 24 LTS. With [nvm](https://github.com/nvm-sh/nvm):

   ```bash
   nvm install
   ```

   (`nvm use` picks the version from `.nvmrc`; Homebrew `brew install node@24` also works.)

2. Install dependencies exactly as locked:

   ```bash
   npm ci
   ```

3. Start the dev server at <http://localhost:4321/> (Russian at <http://localhost:4321/ru/>):

   ```bash
   npm run dev
   ```

## Scripts

| Command                | What it does                                                   |
| ---------------------- | -------------------------------------------------------------- |
| `npm run dev`          | Dev server with hot reload                                     |
| `npm run build`        | Production static build into `dist/`                           |
| `npm run preview`      | Serve the built `dist/` locally                                |
| `npm run check`        | `astro check` + `tsc --noEmit` (strict type checking)          |
| `npm test`             | Vitest: i18n, tokens and smoke checks of `dist/` (build first) |
| `npm run format:check` | Prettier check (`npm run format` to fix)                       |
| `npm run verify`       | Everything CI runs: format, check, build, test                 |

## Infrastructure boundaries

This repository will build the **main website only**. Do not modify the working `journal.mythweld.com`, `legal.mythweld.com` or `ota.mythweld.com` services, and do not change DNS or production deployments without a separately reviewed task. The site is not deployed yet; `robots.txt` disallows indexing and no sitemap is published until a reviewed public launch.

This is an independent fan project, not affiliated with Blizzard Entertainment.
