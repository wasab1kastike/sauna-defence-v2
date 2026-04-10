import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  collectPlayerPatchNotesHistory,
  parseReleaseSections,
  toPlayerPatchNotesMarkdown
} from './player-patch-notes-lib.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..');

const changelogPath = path.join(repoRoot, 'CHANGELOG.md');
const jsonOutputPath = path.join(repoRoot, 'src/content/generated/player-patch-notes-history.json');
const markdownOutputPath = path.join(repoRoot, 'docs/latest-player-patch-notes.md');

const changelog = await readFile(changelogPath, 'utf8');
const releases = parseReleaseSections(changelog);
const patchNotesHistory = collectPlayerPatchNotesHistory(releases);
const latestPatchNotes = patchNotesHistory[0];

if (!latestPatchNotes) {
  throw new Error('No valid player-facing release notes found in CHANGELOG.md.');
}

await mkdir(path.dirname(jsonOutputPath), { recursive: true });
await writeFile(jsonOutputPath, `${JSON.stringify(patchNotesHistory, null, 2)}\n`, 'utf8');
await writeFile(markdownOutputPath, toPlayerPatchNotesMarkdown(latestPatchNotes), 'utf8');

console.log(`Generated ${patchNotesHistory.length} player patch note release(s); latest is ${latestPatchNotes.version} -> ${path.relative(repoRoot, jsonOutputPath)} and ${path.relative(repoRoot, markdownOutputPath)}`);
