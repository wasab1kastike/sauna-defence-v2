const PLAYER_NOTES_SECTION_DEFINITIONS = [
  { heading: 'New Features', id: 'new-features', title: 'Uutta' },
  { heading: 'General Improvements', id: 'general-improvements', title: 'Parannuksia' },
  { heading: 'General Fixes', id: 'general-fixes', title: 'Korjauksia' }
];

function collectHeadingBlocks(body, headingRegex) {
  const headings = [];
  let match = headingRegex.exec(body);

  while (match) {
    headings.push({
      heading: match[1].trim(),
      startIndex: match.index,
      headerLength: match[0].length
    });
    match = headingRegex.exec(body);
  }

  return headings.map((heading, index) => {
    const contentStart = heading.startIndex + heading.headerLength;
    const contentEnd = index + 1 < headings.length ? headings[index + 1].startIndex : body.length;

    return {
      heading: heading.heading,
      body: body.slice(contentStart, contentEnd).trim()
    };
  });
}

export function parseReleaseSections(changelogText) {
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

export function parsePlayerNotes(releaseBody) {
  const topLevelSections = collectHeadingBlocks(releaseBody, /^###\s+(.+)\s*$/gm);
  const playerNotesSection = topLevelSections.find((section) => section.heading === 'Player Notes');

  if (!playerNotesSection) {
    throw new Error('Latest release must include a "### Player Notes" section.');
  }

  const playerNoteBlocks = collectHeadingBlocks(playerNotesSection.body, /^####\s+(.+)\s*$/gm);
  const introBlock = playerNoteBlocks.find((section) => section.heading === 'Intro');

  if (!introBlock) {
    throw new Error('Player Notes must include a "#### Intro" section.');
  }

  const intro = introBlock.body
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .join(' ');

  if (!intro) {
    throw new Error('Player Notes intro must contain at least one line of text.');
  }

  const sections = PLAYER_NOTES_SECTION_DEFINITIONS.map((definition) => {
    const sectionBlock = playerNoteBlocks.find((section) => section.heading === definition.heading);

    if (!sectionBlock) {
      throw new Error(`Player Notes must include a "#### ${definition.heading}" section.`);
    }

    const items = sectionBlock.body
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line.startsWith('- '))
      .map((line) => line.slice(2).trim())
      .filter(Boolean);

    return {
      id: definition.id,
      title: definition.title,
      items
    };
  });

  const totalItems = sections.reduce((sum, section) => sum + section.items.length, 0);
  if (totalItems === 0) {
    throw new Error('Player Notes must contain at least one bullet across the visible sections.');
  }

  return { intro, sections };
}

export function toPlayerPatchNotes(version, date, playerNotes) {
  return {
    version,
    date,
    intro: playerNotes.intro,
    sections: playerNotes.sections
  };
}

export function collectPlayerPatchNotesHistory(releases) {
  return releases.flatMap((release) => {
    try {
      return [toPlayerPatchNotes(release.version, release.date, parsePlayerNotes(release.body))];
    } catch {
      return [];
    }
  });
}

export function toPlayerPatchNotesMarkdown(patchNotes) {
  const lines = [
    '# Latest Player Patch Notes',
    '',
    `Version ${patchNotes.version} (${patchNotes.date})`,
    '',
    patchNotes.intro,
    ''
  ];

  for (const section of patchNotes.sections) {
    if (section.items.length === 0) {
      continue;
    }

    lines.push(`## ${section.title}`);
    lines.push('');
    for (const item of section.items) {
      lines.push(`- ${item}`);
    }
    lines.push('');
  }

  return `${lines.join('\n').trim()}\n`;
}
