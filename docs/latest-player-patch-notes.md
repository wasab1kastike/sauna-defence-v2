# Latest Player Patch Notes

Version 0.1.0 (2026-04-04)

## New

- New `src/content/patchNotes.ts` data source for the latest player-facing patch notes (`version`, `date`, `new`, `improved`, `fixed`).

## Improved

- Added a polished in-game Patch Notes modal and topbar entry point in `src/app/App.tsx`, including auto-open behavior only when users have not seen the newest version yet.
- Added lightweight visual polish for Patch Notes in `src/index.css`: hero heading, version badge, category icon headings, and improved typography for readability.
- Vite build now injects `__APP_VERSION__` from `process.env.npm_package_version`, patch notes use `APP_VERSION` instead of hardcoded text, and HUD now shows `App <version>` in an always-visible footer badge.
- Save key namespace has moved from `sauna-defense-v2-*` to `sauna-defense-v3-*`. Existing `v2` saves are migrated automatically at runtime, but tooling/scripts that read keys directly must switch to the new names.

## Fixed

- Patch Notes auto-open now waits until blocking overlays (intro, guided tips, draft overlays) are closed, preventing stacked modals on first load.
- Patch Notes modal now supports Escape-to-close and backdrop click-to-close for smoother UX.
