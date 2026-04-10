# Changelog

All notable changes to this project are documented in this file.

## Merkintakaytanto (pakollinen release- ja Unreleased-kohdissa)

- Kayta joka rivilla tagia heti listamerkin jalkeen:
  - `[player]` = nakyy tai vaikuttaa suoraan pelaajalle.
  - `[internal]` = sisainen kehitys, prosessi, CI/CD, dokumentaatio tai refaktorointi.
- Muoto: `- [player] ...` tai `- [internal] ...`.
- Uusimmassa release-kohdassa on oltava lisaksi erillinen `### Player Notes` -lohko, jossa kaytetaan aina naita aliosioita:
  - `#### Intro`
  - `#### New Features`
  - `#### General Improvements`
  - `#### General Fixes`
- `scripts/generate-player-patch-notes.mjs` lukee pelaajille nakyvat notesit vain `Player Notes` -lohkosta.

## Unreleased

### Added
- [internal] Ei viela merkintoja.

### Changed
- [internal] `scripts/check-player-patch-notes.mjs` validates now that generated JSON/Markdown patch notes match current release version/date, not only that changelog metadata exists.
- [internal] `docs/balance.md` now includes a wave-by-wave spawn recap table for waves 1-30 to keep GitHub Pages-facing balance docs in sync with current logic.
- [player] Balance pass increased enemies per wave by scaling non-boss composition with cycle (higher brute cap + extra spawn picks), making each 5-wave block visibly denser.
- [player] Wave ramp now escalates to explicit spawn-density anchors (wave 6=15, wave 10=30, wave 15=60, wave 20=100), while tutorial waves 1-4 stay unchanged for onboarding.
- [player] Defender selection now uses a scroll-bounded character card so core hero stats stay visible in the first viewport slice while longer loadouts continue below.
- [player] Full item + skill loadouts now use a compact selection-card variant with tighter stat chips and row chrome for faster scanning without hurting readability.

### Fixed
- [internal] CI now catches stale generated patch-notes artifacts before release by validating generated files against `CHANGELOG.md` + `package.json`.

### Breaking
- [internal] Ei viela merkintoja.

## 0.1.1 - 2026-04-09

### Player Notes

#### Intro
Pebble loysi pullokorin ja recruit market oppi pysymaan omassa dockissaan. Taman paivityksen jalkeen uudet bossi- ja UI-muutokset ovat valmiit Pages-deployta varten.

#### New Features
- Pebble boss waves now spawn three beer bottles on the map. Pebble hunts them before the sauna, and each bottle it eats buffs later Pebble encounters in the same run.
- End-User Horde uses its custom horde sprite pack when the branch is deployed to Pages.

#### General Improvements
- Pebble now starts at 320 HP and comes back with +40 HP on each later Pebble encounter in the same run.
- Boss HUD now surfaces Pebble bottle progress with live `Bottles` and `Bottle Stacks` tags during Pebble waves.
- The latest player-facing patch notes now describe the boss and recruit-market changes for version 0.1.1.

#### General Fixes
- Recruitment market actions are now fully dock-native again. Refresh, per-offer reroll, level up, and buys clear any stale legacy recruit popup state instead of reopening the old right-side market panel.
- Pebble bottle targets now render directly on the board, and selected Pebble stats reflect the live boss damage/max HP values instead of stale archetype-only numbers.

### Added
- [player] Pebble boss waves now spawn three beer bottles on the map. Pebble hunts them before the sauna, and each bottle it eats buffs later Pebble encounters in the same run.

### Changed
- [player] Pebble now starts at 320 HP and comes back with +40 HP on each later Pebble encounter in the same run.
- [player] Boss HUD now surfaces Pebble bottle progress with live `Bottles` and `Bottle Stacks` tags during Pebble waves.

### Fixed
- [player] Recruitment market actions are now fully dock-native again. Refresh, per-offer reroll, level up, and buys clear any stale legacy recruit popup state instead of reopening the old right-side market panel.
- [player] Pebble bottle targets now render directly on the board, and selected Pebble stats reflect the live boss damage/max HP values instead of stale archetype-only numbers.

### Breaking
- [internal] Ei vielä merkintöjä.

## 0.1.0 - 2026-04-04

### Player Notes

#### Intro
Sauna paasi patch notesit pienelle remonttikurssille, joten nyt kuulumiset pysyvat laatikoissaan eivatka karkaa loylykauhan mukana.

#### New Features
- Patch notes loytyvat nyt suoraan pelin sisalta, joten tuorein saunajuoru ei jaa piiloon GitHubiin.
- Ruudun kulmasta loytyy pieni build-merkinta, jos haluat tarkistaa milla versiolla kiuasta loylytetaan.
- Savejen taustasiivous auttaa vanhoja runeja seuraamaan mukana ilman kasipelilla tehtavaa taikuutta.

#### General Improvements
- Patch notes puhuvat nyt enemman pelaajaa kuin kehittajaa, joten paivitys on helpompi lukaista yhdella vilkaisulla.
- Patch notes -ikkuna skaalautuu nyt siistimmin eri naytoille, eika teksti lahde omille teilleen kesken saunavuoron.
- Version tiedot pysyvat nyt UI:ssa johdonmukaisemmin, jotta vanha ja uusi buildi eivat vaihda takkia kesken illan.

#### General Fixes
- Patch notes odottaa nyt kiltisti muiden overlayiden vuoroa, joten ruudulle ei kasaannu koko pukuhuone yhdella kertaa.
- Ikkunan voi sulkea Escilla tai taustaa klikkaamalla, koska joka tilanteeseen ei tarvita kolmea lisaklikkausta ja pienta draamaa.
- Pitkat rivit kietaistaan nyt siististi korttien sisaan, joten teksti ei karkaa laatikoista omalle avantouinnilleen.

### Added
- [internal] New PR checklist section for behavior-impact + changelog confirmation in `.github/pull_request_template.md`.
- [internal] New CI workflow `.github/workflows/changelog-check.yml` that enforces changelog updates for behavior-changing pull requests.
- [internal] README now includes a dedicated **Release process** section with version bump, changelog update, GitHub Pages deployment validation, and custom-domain verification instructions.
- [internal] New `docs/visual-guidelines.md` that defines color/contrast palette, animation duration + easing standards, UI layer hierarchy, render performance budgets, and measurement workflow.
- [internal] New `public/ASSET_POLICY.md` that defines preferred vector-first asset formats, optimization requirements, and naming conventions for `public/` assets.
- [player] New `src/content/patchNotes.ts` data source for the latest player-facing patch notes (`version`, `date`, `intro`, `sections`).
- [internal] New centralized version module `src/game/version.ts` exporting `APP_VERSION` (build-time from Vite define) and `SAVE_SCHEMA_VERSION` (`v3`) for consistent version references across runtime and UI.

### Changed
- [internal] Normalized changelog section taxonomy to Keep a Changelog style categories: `Added`, `Changed`, `Fixed`, `Breaking`.
- [internal] Updated `.github/pull_request_template.md` with a visual regression checklist (before/after screenshots, HUD readability review, desktop/mobile validation).
- [internal] Updated README documentation index to include the new visual and asset governance docs to keep GitHub Pages-facing project docs current.
- [player] Added a polished in-game Patch Notes modal and topbar entry point in `src/app/App.tsx`, including auto-open behavior only when users have not seen the newest version yet.
- [player] Patch Notes now use a player-friendly intro + section layout instead of raw technical changelog lists.
- [player] Patch Notes modal layout now uses a dedicated scroll body and stable multi-column card grid for cleaner reading on common desktop and laptop sizes.
- [player] Vite build now injects `__APP_VERSION__` from `process.env.npm_package_version`, patch notes use `APP_VERSION` instead of hardcoded text, and HUD now shows `App <version>` in an always-visible footer badge.
- [internal] Player-facing patch note generation now reads a dedicated `### Player Notes` changelog block instead of raw `[player]` bullets.
- [internal] Save schema version references now use `SAVE_SCHEMA_VERSION` via runtime constants, and runtime migration tests consume `STORAGE_KEY_PREFIX` rather than hardcoded `v3` keys.

### Fixed
- [player] Patch Notes auto-open now waits until blocking overlays (intro, guided tips, draft overlays) are closed, preventing stacked modals on first load.
- [player] Patch Notes modal now supports Escape-to-close and backdrop click-to-close for smoother UX.
- [player] Patch Notes cards now wrap long lines cleanly instead of letting text spill outside the visible box.

### Breaking
- [player] Save key namespace has moved from `sauna-defense-v2-*` to `sauna-defense-v3-*`. Existing `v2` saves are migrated automatically at runtime, but tooling/scripts that read keys directly must switch to the new names.

## Earlier unreleased notes (historical)

### Added
- New `docs/balance.md` baseline balance target document (wave clear time, area-average sauna HP at wave 5/10/15, role-based survival ratios).
- New deterministic balance regression test helper at `src/game/__tests__/balance.spec.ts` with locked baseline metrics across fixed seeds.
- Added `.github/pull_request_template.md` checklist requiring balance-impact PRs to update `docs/balance.md` and regression metrics.
- New `lint` and `typecheck` npm scripts for CI quality gates.
- Flat ESLint configuration for TypeScript + React source files under `src/`.
- New content integrity test that validates ID uniqueness and cross-content references (subclass/template + item/skill modifier links).
- New `docs/content-authoring.md` guide for adding units into the modular content structure.

### Changed
- GitHub Pages deploy workflow now runs linting and typechecking before tests and emits explicit failure messages for each failing stage.
- README command documentation updated with the new quality commands and CI order.
- Save data storage keys are now versioned with canonical `v3` prefix (`sauna-defense-v3-*`) and runtime migrates legacy `v2` keys on startup.
- `src/content/gameContent.ts` now composes content from dedicated modules (`config`, `defenders`, `subclasses`, `enemies`, `waves`, `items`) without gameplay behavior changes.
- Wave data constants (tutorial waves, boss rotation, non-boss pattern order) moved into `src/content/waves.ts` and imported by gameplay logic.
