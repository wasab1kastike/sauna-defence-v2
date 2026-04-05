import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

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
const releaseHeaderRegex = new RegExp(`^##\\s+${version.replaceAll('.', '\\.')}\\s+-\\s+(\\d{4}-\\d{2}-\\d{2})\\s*$`, 'm');
const releaseMatch = changelog.match(releaseHeaderRegex);

if (!releaseMatch || typeof releaseMatch.index !== 'number') {
  throw new Error(`CHANGELOG.md must contain release heading for package version ${version} in format "## ${version} - YYYY-MM-DD".`);
}

const releaseDate = releaseMatch[1];
const sectionStart = releaseMatch.index + releaseMatch[0].length;
const nextSectionOffset = changelog.slice(sectionStart).search(/^##\s+/m);
const sectionEnd = nextSectionOffset === -1 ? changelog.length : sectionStart + nextSectionOffset;
const releaseBody = changelog.slice(sectionStart, sectionEnd);

const playerLines = releaseBody
  .split('\n')
  .map((line) => line.trim())
  .filter((line) => /^-\s+\[player\]\s+/i.test(line));

if (playerLines.length === 0) {
  throw new Error(`Release ${version} must include at least one [player] changelog bullet.`);
}

const generatedJson = JSON.parse(await readFile(generatedJsonPath, 'utf8'));
if (generatedJson.version !== version) {
  throw new Error(`Generated patch notes version mismatch: expected ${version}, got ${generatedJson.version}. Run \`npm run build:patch-notes\`.`);
}

if (generatedJson.date !== releaseDate) {
  throw new Error(`Generated patch notes date mismatch: expected ${releaseDate}, got ${generatedJson.date}. Run \`npm run build:patch-notes\`.`);
}

const playerEntriesCount = [generatedJson.new, generatedJson.improved, generatedJson.fixed]
  .filter(Array.isArray)
  .reduce((total, category) => total + category.length, 0);

if (playerEntriesCount === 0) {
  throw new Error('Generated patch notes JSON must contain at least one player-facing entry. Run `npm run build:patch-notes`.');
}

const generatedMarkdown = await readFile(generatedMarkdownPath, 'utf8');
if (!generatedMarkdown.includes(`Version ${version} (${releaseDate})`)) {
  throw new Error('Generated markdown patch notes is out of sync with version/date. Run `npm run build:patch-notes`.');
}

console.log(`Player patch notes check passed for ${version}. Found ${playerLines.length} [player] changelog bullet(s) and ${playerEntriesCount} generated player-facing item(s).`);
