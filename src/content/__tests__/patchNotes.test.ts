import { allPatchNotes, latestPatchNotes } from '../patchNotes';

describe('player patch notes content', () => {
  it('uses intro and ordered player-facing sections for the latest release', () => {
    expect(latestPatchNotes.version).toMatch(/^\d+\.\d+\.\d+$/);
    expect(latestPatchNotes.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(latestPatchNotes.intro.trim().length).toBeGreaterThan(0);
    expect(latestPatchNotes.sections.map((section) => section.id)).toEqual([
      'new-features',
      'general-improvements',
      'general-fixes'
    ]);

    const totalItems = latestPatchNotes.sections.reduce((sum, section) => sum + section.items.length, 0);
    expect(totalItems).toBeGreaterThan(0);

    for (const section of latestPatchNotes.sections) {
      expect(section.title.trim().length).toBeGreaterThan(0);
      expect(Array.isArray(section.items)).toBe(true);
    }
  });

  it('exposes patch note history newest first', () => {
    expect(allPatchNotes.length).toBeGreaterThan(1);
    expect(allPatchNotes[0]).toEqual(latestPatchNotes);
    expect(allPatchNotes.map((entry) => entry.version)).toEqual(['0.1.2', '0.1.1', '0.1.0']);
  });
});
