import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..');

const changelogPath = path.join(repoRoot, 'CHANGELOG.md');
const jsonOutputPath = path.join(repoRoot, 'src/content/generated/latest-player-patch-notes.json');
const markdownOutputPath = path.join(repoRoot, 'docs/latest-player-patch-notes.md');

function parseReleaseSections(changelogText) {
  const releaseRegex = /^##\s+(\d+\.\d+\.\d+)\s+-\s+(\d{4}-\d{2}-\d{2})\s*$/gm;
  const releases = [];

  let match = releaseRegex.exec(changelogText);
  while (match) {
    releases.push({
      version: match[1],
      date: match[2],
      startIndex: match.index,
      headerLength: match[0].length
    });
    match = releaseRegex.exec(changelogText);
  }

  if (releases.length === 0) {
    throw new Error('CHANGELOG.md does not contain any release headings in format "## x.y.z - YYYY-MM-DD".');
  }

  return releases.map((release, index) => {
    const contentStart = release.startIndex + release.headerLength;
    const contentEnd = index + 1 < releases.length ? releases[index + 1].startIndex : changelogText.length;

    return {
      version: release.version,
      date: release.date,
      body: changelogText.slice(contentStart, contentEnd).trim()
    };
  });
}

function collectTaggedEntries(sectionBody) {
  const categoryRegex = /^###\s+(Added|Changed|Fixed|Breaking)\s*$/gm;
  const categories = [];

  let match = categoryRegex.exec(sectionBody);
  while (match) {
    categories.push({
      category: match[1],
      startIndex: match.index,
      headerLength: match[0].length
    });
    match = categoryRegex.exec(sectionBody);
  }

  const entries = [];

  for (let i = 0; i < categories.length; i += 1) {
    const current = categories[i];
    const nextStart = i + 1 < categories.length ? categories[i + 1].startIndex : sectionBody.length;
    const categoryBody = sectionBody.slice(current.startIndex + current.headerLength, nextStart);
    const lines = categoryBody
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line.startsWith('- '));

    for (const line of lines) {
      const tagged = line.match(/^-\s+\[(player|internal)\]\s+(.+)$/i);
      if (!tagged) {
        continue;
      }

      entries.push({
        category: current.category,
        audience: tagged[1].toLowerCase(),
        text: tagged[2].trim()
      });
    }
  }

  return entries;
}

function toPatchNotes(version, date, playerEntries) {
  const newItems = playerEntries
    .filter((entry) => entry.category === 'Added')
    .map((entry) => entry.text);
  const improvedItems = playerEntries
    .filter((entry) => entry.category === 'Changed' || entry.category === 'Breaking')
    .map((entry) => entry.text);
  const fixedItems = playerEntries
    .filter((entry) => entry.category === 'Fixed')
    .map((entry) => entry.text);

  return {
    version,
    date,
    new: newItems,
    improved: improvedItems,
    fixed: fixedItems
  };
}

function toMarkdown(patchNotes) {
  const sections = [
    ['New', patchNotes.new],
    ['Improved', patchNotes.improved],
    ['Fixed', patchNotes.fixed]
  ];

  const lines = [
    '# Latest Player Patch Notes',
    '',
    `Version ${patchNotes.version} (${patchNotes.date})`,
    ''
  ];

  for (const [title, items] of sections) {
    if (items.length === 0) {
      continue;
    }

    lines.push(`## ${title}`);
    lines.push('');
    for (const item of items) {
      lines.push(`- ${item}`);
    }
    lines.push('');
  }

  return `${lines.join('\n').trim()}\n`;
}

const changelog = await readFile(changelogPath, 'utf8');
const releases = parseReleaseSections(changelog);
const latestRelease = releases[0];
const taggedEntries = collectTaggedEntries(latestRelease.body);
const playerEntries = taggedEntries.filter((entry) => entry.audience === 'player');

if (playerEntries.length === 0) {
  throw new Error(`Latest release ${latestRelease.version} has no [player] entries.`);
}

const patchNotes = toPatchNotes(latestRelease.version, latestRelease.date, playerEntries);

await mkdir(path.dirname(jsonOutputPath), { recursive: true });
await writeFile(jsonOutputPath, `${JSON.stringify(patchNotes, null, 2)}\n`, 'utf8');
await writeFile(markdownOutputPath, toMarkdown(patchNotes), 'utf8');

console.log(`Generated player patch notes from release ${latestRelease.version} -> ${path.relative(repoRoot, jsonOutputPath)} and ${path.relative(repoRoot, markdownOutputPath)}`);
