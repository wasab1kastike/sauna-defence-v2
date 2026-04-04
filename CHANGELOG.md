# Changelog

All notable changes to this project are documented in this file.

## Unreleased

### Added
- New PR checklist section for behavior-impact + changelog confirmation in `.github/pull_request_template.md`.
- New CI workflow `.github/workflows/changelog-check.yml` that enforces changelog updates for behavior-changing pull requests.
- README now includes a dedicated **Release process** section with version bump, changelog update, GitHub Pages deployment validation, and custom-domain verification instructions.
- New `docs/visual-guidelines.md` that defines color/contrast palette, animation duration + easing standards, UI layer hierarchy, render performance budgets, and measurement workflow.
- New `public/ASSET_POLICY.md` that defines preferred vector-first asset formats, optimization requirements, and naming conventions for `public/` assets.
- New `src/content/patchNotes.ts` data source for the latest player-facing patch notes (`version`, `date`, `new`, `improved`, `fixed`).

### Changed
- Normalized changelog section taxonomy to Keep a Changelog style categories: `Added`, `Changed`, `Fixed`, `Breaking`.
- Updated `.github/pull_request_template.md` with a visual regression checklist (before/after screenshots, HUD readability review, desktop/mobile validation).
- Updated README documentation index to include the new visual and asset governance docs to keep GitHub Pages-facing project docs current.
- Added a polished in-game Patch Notes modal and topbar entry point in `src/app/App.tsx`, including auto-open behavior only when users have not seen the newest version yet.
- Added lightweight visual polish for Patch Notes in `src/index.css`: hero heading, version badge, category icon headings, and improved typography for readability.

### Fixed
- Patch Notes auto-open now waits until blocking overlays (intro, guided tips, draft overlays) are closed, preventing stacked modals on first load.
- Patch Notes modal now supports Escape-to-close and backdrop click-to-close for smoother UX.

### Breaking
- Save key namespace has moved from `sauna-defense-v2-*` to `sauna-defense-v3-*`. Existing `v2` saves are migrated automatically at runtime, but tooling/scripts that read keys directly must switch to the new names.

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
