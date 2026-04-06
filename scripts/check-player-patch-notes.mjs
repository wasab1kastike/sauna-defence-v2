import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parsePlayerNotes, parseReleaseSections } from './player-patch-notes-lib.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..');

const changelogPath = path.join(repoRoot, 'CHANGELOG.md');
const packageJsonPath = path.join(repoRoot, 'package.json');
const generatedJsonPath = path.join(repoRoot, 'src/content/generated/latest-player-patch-notes.json');
const generatedMarkdownPath = path.join(repoRoot, 'docs/latest-player-patch-notes.md');

const packageJson = JSON.parse(await readFile(packageJsonPath, 'utf8'));
const version = packageJson.version;

if (typeof version !== 'string' || !/^\d+\.\d+\.\d+$/.test(version)) {
  throw new Error('package.json version must be a semver string in format x.y.z.');
}

const changelog = await readFile(changelogPath, 'utf8');
const releases = parseReleaseSections(changelog);
const latestRelease = releases.find((entry) => entry.version === version);

if (!latestRelease) {
  throw new Error(`CHANGELOG.md must contain release heading for package version ${version} in format "## ${version} - YYYY-MM-DD".`);
}

const releaseDate = latestRelease.date;
const playerNotes = parsePlayerNotes(latestRelease.body);

const generatedJson = JSON.parse(await readFile(generatedJsonPath, 'utf8'));
if (generatedJson.version !== version) {
  throw new Error(`Generated patch notes version mismatch: expected ${version}, got ${generatedJson.version}. Run \`npm run build:patch-notes\`.`);
}

if (generatedJson.date !== releaseDate) {
  throw new Error(`Generated patch notes date mismatch: expected ${releaseDate}, got ${generatedJson.date}. Run \`npm run build:patch-notes\`.`);
}

if (typeof generatedJson.intro !== 'string' || generatedJson.intro.trim().length === 0) {
  throw new Error('Generated patch notes JSON must include a non-empty intro. Run `npm run build:patch-notes`.');
}

if (!Array.isArray(generatedJson.sections)) {
  throw new Error('Generated patch notes JSON must include a sections array. Run `npm run build:patch-notes`.');
}

const playerEntriesCount = generatedJson.sections
  .filter((section) => Array.isArray(section.items))
  .reduce((total, section) => total + section.items.length, 0);

if (playerEntriesCount === 0) {
  throw new Error('Generated patch notes JSON must contain at least one player-facing entry. Run `npm run build:patch-notes`.');
}

if (generatedJson.intro !== playerNotes.intro) {
  throw new Error('Generated patch notes intro is out of sync with CHANGELOG.md. Run `npm run build:patch-notes`.');
}

const expectedSections = playerNotes.sections.map((section) => section.id);
const generatedSections = generatedJson.sections.map((section) => section.id);
if (JSON.stringify(generatedSections) !== JSON.stringify(expectedSections)) {
  throw new Error('Generated patch notes section order is out of sync with CHANGELOG.md. Run `npm run build:patch-notes`.');
}

const generatedMarkdown = await readFile(generatedMarkdownPath, 'utf8');
if (!generatedMarkdown.includes(`Version ${version} (${releaseDate})`)) {
  throw new Error('Generated markdown patch notes is out of sync with version/date. Run `npm run build:patch-notes`.');
}
if (!generatedMarkdown.includes(playerNotes.intro)) {
  throw new Error('Generated markdown patch notes is missing the Player Notes intro. Run `npm run build:patch-notes`.');
}

console.log(`Player patch notes check passed for ${version}. Found ${playerEntriesCount} generated player-facing item(s) across ${generatedJson.sections.length} Player Notes section(s).`);
