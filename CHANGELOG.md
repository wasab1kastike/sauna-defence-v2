# Changelog

All notable changes to this project are documented in this file.

## Merkintäkäytäntö (pakollinen release- ja Unreleased-kohdissa)

- Käytä joka rivillä tagia heti listamerkin jälkeen:
  - `[player]` = näkyy tai vaikuttaa suoraan pelaajalle (UI, pelituntuma, tasapaino, korjaukset, patch notes).
  - `[internal]` = sisäinen kehitys, prosessi, CI/CD, dokumentaatio tai refaktorointi.
- Muoto: `- [player] ...` tai `- [internal] ...`.
- `scripts/generate-player-patch-notes.mjs` lukee uusimman release-kohdan (`## x.y.z - YYYY-MM-DD`) ja käyttää vain `[player]`-rivejä.

## Unreleased

### Added
- [internal] Ei vielä merkintöjä.

### Changed
- [internal] Ei vielä merkintöjä.

### Fixed
- [internal] Ei vielä merkintöjä.

### Breaking
- [internal] Ei vielä merkintöjä.

## 0.1.0 - 2026-04-04

### Added
- [internal] New PR checklist section for behavior-impact + changelog confirmation in `.github/pull_request_template.md`.
- [internal] New CI workflow `.github/workflows/changelog-check.yml` that enforces changelog updates for behavior-changing pull requests.
- [internal] README now includes a dedicated **Release process** section with version bump, changelog update, GitHub Pages deployment validation, and custom-domain verification instructions.
- [internal] New `docs/visual-guidelines.md` that defines color/contrast palette, animation duration + easing standards, UI layer hierarchy, render performance budgets, and measurement workflow.
- [internal] New `public/ASSET_POLICY.md` that defines preferred vector-first asset formats, optimization requirements, and naming conventions for `public/` assets.
- [player] New `src/content/patchNotes.ts` data source for the latest player-facing patch notes (`version`, `date`, `new`, `improved`, `fixed`).
- [internal] New centralized version module `src/game/version.ts` exporting `APP_VERSION` (build-time from Vite define) and `SAVE_SCHEMA_VERSION` (`v3`) for consistent version references across runtime and UI.

### Changed
- [internal] Normalized changelog section taxonomy to Keep a Changelog style categories: `Added`, `Changed`, `Fixed`, `Breaking`.
- [internal] Updated `.github/pull_request_template.md` with a visual regression checklist (before/after screenshots, HUD readability review, desktop/mobile validation).
- [internal] Updated README documentation index to include the new visual and asset governance docs to keep GitHub Pages-facing project docs current.
- [player] Added a polished in-game Patch Notes modal and topbar entry point in `src/app/App.tsx`, including auto-open behavior only when users have not seen the newest version yet.
- [player] Added lightweight visual polish for Patch Notes in `src/index.css`: hero heading, version badge, category icon headings, and improved typography for readability.
- [player] Vite build now injects `__APP_VERSION__` from `process.env.npm_package_version`, patch notes use `APP_VERSION` instead of hardcoded text, and HUD now shows `App <version>` in an always-visible footer badge.
- [internal] Save schema version references now use `SAVE_SCHEMA_VERSION` via runtime constants, and runtime migration tests consume `STORAGE_KEY_PREFIX` rather than hardcoded `v3` keys.

### Fixed
- [player] Patch Notes auto-open now waits until blocking overlays (intro, guided tips, draft overlays) are closed, preventing stacked modals on first load.
- [player] Patch Notes modal now supports Escape-to-close and backdrop click-to-close for smoother UX.

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
