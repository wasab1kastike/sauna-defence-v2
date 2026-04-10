import generatedPatchNotes from './generated/latest-player-patch-notes.json';

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

export const latestPatchNotes: PatchNotesEntry = generatedPatchNotes;
