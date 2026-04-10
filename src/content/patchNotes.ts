import generatedPatchNotesHistory from './generated/player-patch-notes-history.json';

export type PatchNotesSection = {
  id: string;
  title: string;
  items: string[];
};

export type PatchNotesEntry = {
  version: string;
  date: string;
  intro: string;
  sections: PatchNotesSection[];
};

export const allPatchNotes: PatchNotesEntry[] = generatedPatchNotesHistory;
export const latestPatchNotes: PatchNotesEntry = allPatchNotes[0];
