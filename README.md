# Mythweld Web

Official web portal for [Mythweld](https://mythweld.com/): an independent collection of gaming tools.

## Products

- **TalentForge** — mobile talent-build planner for World of Warcraft: Forever.
- **Forever Journey** — in-game character journal addon.
- **Book Creator** — [journal.mythweld.com](https://journal.mythweld.com/), browser-based printable PDF generator.

## Project status

**Bootstrap only.** Implementation is tracked in GitHub Issues and developed in reviewed pull requests.

Design baseline: **Mythweld v3.2 — The Forge (Product First)**. Preserve real product imagery: no fabricated class icons, talent trees, app UI, addon screenshots or product features.

Planned approach: **Astro + TypeScript**, statically generated pages, EN default with RU localization, privacy-conscious deployment. No backend or analytics in initial milestone.

## Infrastructure boundaries

This repository will build the **main website only**. Do not modify the working `journal.mythweld.com`, `legal.mythweld.com` or `ota.mythweld.com` services, and do not change DNS or production deployments without a separately reviewed task.

## Development

Scaffolding and local commands will be added in **WEB-M0.1**.

This is an independent fan project, not affiliated with Blizzard Entertainment.
