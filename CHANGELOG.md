# Changelog

## Unreleased

### Added
- New `lint` and `typecheck` npm scripts for CI quality gates.
- Flat ESLint configuration for TypeScript + React source files under `src/`.

### Changed
- GitHub Pages deploy workflow now runs linting and typechecking before tests and emits explicit failure messages for each failing stage.
- README command documentation updated with the new quality commands and CI order.
- Save data storage keys are now versioned with canonical `v3` prefix (`sauna-defense-v3-*`) and runtime migrates legacy `v2` keys on startup.

### Breaking Save Change
- Save key namespace has moved from `sauna-defense-v2-*` to `sauna-defense-v3-*`. Existing `v2` saves are migrated automatically at runtime, but tooling/scripts that read keys directly must switch to the new names.
