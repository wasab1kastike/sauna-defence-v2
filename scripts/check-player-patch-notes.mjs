import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { collectPlayerPatchNotesHistory, parsePlayerNotes, parseReleaseSections } from './player-patch-notes-lib.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..');

const changelogPath = path.join(repoRoot, 'CHANGELOG.md');
const packageJsonPath = path.join(repoRoot, 'package.json');
const generatedJsonPath = path.join(repoRoot, 'src/content/generated/player-patch-notes-history.json');
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
const expectedHistory = collectPlayerPatchNotesHistory(releases);

const generatedHistory = JSON.parse(await readFile(generatedJsonPath, 'utf8'));
if (!Array.isArray(generatedHistory) || generatedHistory.length === 0) {
  throw new Error('Generated patch notes JSON must be a non-empty history array. Run `npm run build:patch-notes`.');
}

const latestGenerated = generatedHistory[0];
if (latestGenerated.version !== version) {
  throw new Error(`Generated patch notes version mismatch: expected ${version}, got ${latestGenerated.version}. Run \`npm run build:patch-notes\`.`);
}

if (latestGenerated.date !== releaseDate) {
  throw new Error(`Generated patch notes date mismatch: expected ${releaseDate}, got ${latestGenerated.date}. Run \`npm run build:patch-notes\`.`);
}

if (typeof latestGenerated.intro !== 'string' || latestGenerated.intro.trim().length === 0) {
  throw new Error('Generated patch notes JSON must include a non-empty intro. Run `npm run build:patch-notes`.');
}

if (!Array.isArray(latestGenerated.sections)) {
  throw new Error('Generated patch notes JSON must include sections for the latest entry. Run `npm run build:patch-notes`.');
}

const playerEntriesCount = latestGenerated.sections
  .filter((section) => Array.isArray(section.items))
  .reduce((total, section) => total + section.items.length, 0);

if (playerEntriesCount === 0) {
  throw new Error('Generated patch notes JSON must contain at least one player-facing entry. Run `npm run build:patch-notes`.');
}

if (latestGenerated.intro !== playerNotes.intro) {
  throw new Error('Generated patch notes intro is out of sync with CHANGELOG.md. Run `npm run build:patch-notes`.');
}

const expectedSections = playerNotes.sections.map((section) => section.id);
const generatedSections = latestGenerated.sections.map((section) => section.id);
if (JSON.stringify(generatedSections) !== JSON.stringify(expectedSections)) {
  throw new Error('Generated patch notes section order is out of sync with CHANGELOG.md. Run `npm run build:patch-notes`.');
}

const expectedVersions = expectedHistory.map((entry) => entry.version);
const generatedVersions = generatedHistory.map((entry) => entry.version);
if (JSON.stringify(generatedVersions) !== JSON.stringify(expectedVersions)) {
  throw new Error('Generated patch notes history is out of sync with CHANGELOG.md. Run `npm run build:patch-notes`.');
}

const generatedMarkdown = await readFile(generatedMarkdownPath, 'utf8');
if (!generatedMarkdown.includes(`Version ${version} (${releaseDate})`)) {
  throw new Error('Generated markdown patch notes is out of sync with version/date. Run `npm run build:patch-notes`.');
}
if (!generatedMarkdown.includes(playerNotes.intro)) {
  throw new Error('Generated markdown patch notes is missing the Player Notes intro. Run `npm run build:patch-notes`.');
}

console.log(`Player patch notes check passed for ${version}. Found ${playerEntriesCount} generated player-facing item(s) across ${latestGenerated.sections.length} latest Player Notes section(s) and ${generatedHistory.length} historical release(s).`);
