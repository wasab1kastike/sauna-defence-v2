import generatedPatchNotes from './generated/latest-player-patch-notes.json';

export type PatchNotesEntry = {
  version: string;
  date: string;
  new: string[];
  improved: string[];
  fixed: string[];
};

export const latestPatchNotes: PatchNotesEntry = generatedPatchNotes;
