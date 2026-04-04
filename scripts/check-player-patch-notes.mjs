import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..');

const changelogPath = path.join(repoRoot, 'CHANGELOG.md');
const packageJsonPath = path.join(repoRoot, 'package.json');

const packageJson = JSON.parse(await readFile(packageJsonPath, 'utf8'));
const version = packageJson.version;

if (typeof version !== 'string' || !/^\d+\.\d+\.\d+$/.test(version)) {
  throw new Error('package.json version must be a semver string in format x.y.z.');
}

const changelog = await readFile(changelogPath, 'utf8');
const releaseHeaderRegex = new RegExp(`^##\\s+${version.replaceAll('.', '\\.')}\\s+-\\s+(\\d{4}-\\d{2}-\\d{2})\\s*$`, 'm');
const releaseMatch = changelog.match(releaseHeaderRegex);

if (!releaseMatch) {
  throw new Error(`CHANGELOG.md must contain release heading for package version ${version} in format "## ${version} - YYYY-MM-DD".`);
}

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

console.log(`Player patch notes check passed for ${version}. Found ${playerLines.length} [player] bullet(s).`);
