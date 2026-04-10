import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  parsePlayerNotes,
  parseReleaseSections,
  toPlayerPatchNotes,
  toPlayerPatchNotesMarkdown
} from './player-patch-notes-lib.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..');

const changelogPath = path.join(repoRoot, 'CHANGELOG.md');
const jsonOutputPath = path.join(repoRoot, 'src/content/generated/latest-player-patch-notes.json');
const markdownOutputPath = path.join(repoRoot, 'docs/latest-player-patch-notes.md');

const changelog = await readFile(changelogPath, 'utf8');
const releases = parseReleaseSections(changelog);
const latestRelease = releases[0];
const playerNotes = parsePlayerNotes(latestRelease.body);
const patchNotes = toPlayerPatchNotes(latestRelease.version, latestRelease.date, playerNotes);

await mkdir(path.dirname(jsonOutputPath), { recursive: true });
await writeFile(jsonOutputPath, `${JSON.stringify(patchNotes, null, 2)}\n`, 'utf8');
await writeFile(markdownOutputPath, toPlayerPatchNotesMarkdown(patchNotes), 'utf8');

console.log(`Generated player patch notes from release ${latestRelease.version} -> ${path.relative(repoRoot, jsonOutputPath)} and ${path.relative(repoRoot, markdownOutputPath)}`);
