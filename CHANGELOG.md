# Changelog

## Unreleased

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

### Breaking Save Change
- Save key namespace has moved from `sauna-defense-v2-*` to `sauna-defense-v3-*`. Existing `v2` saves are migrated automatically at runtime, but tooling/scripts that read keys directly must switch to the new names.
