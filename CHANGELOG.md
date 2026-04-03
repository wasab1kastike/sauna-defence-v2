# Changelog

## Unreleased

### Added
- New `lint` and `typecheck` npm scripts for CI quality gates.
- Flat ESLint configuration for TypeScript + React source files under `src/`.

### Changed
- GitHub Pages deploy workflow now runs linting and typechecking before tests and emits explicit failure messages for each failing stage.
- README command documentation updated with the new quality commands and CI order.
