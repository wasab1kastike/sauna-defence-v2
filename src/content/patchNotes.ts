import { APP_VERSION } from '../game/version';

export type PatchNotesEntry = {
  version: string;
  date: string;
  new: string[];
  improved: string[];
  fixed: string[];
};

export const latestPatchNotes: PatchNotesEntry = {
  version: APP_VERSION,
  date: '2026-04-04',
  new: [
    'Patch Notes -näkymä löytyy nyt suoraan topbarista, joten näet uudet jutut ilman valikoissa seikkailua.',
    'Patch Notes avautuu automaattisesti kerran, kun peliin tulee sinulle uusi versio.'
  ],
  improved: [
    'Päivitysten kieli on tehty selkeäksi ja pelaajaystävälliseksi, jotta muutokset on helppo hahmottaa yhdellä vilkaisulla.',
    'Patch Notes -ikkuna on viimeistelty kevyellä hero-otsikolla, version badge -merkinnällä ja kategoriakohtaisilla ikoneilla.'
  ],
  fixed: [
    'Patch Notes ei enää jää helposti huomaamatta, koska uusi versio nostetaan automaattisesti esiin ensimmäisellä käynnistyksellä.',
    'Päivitysten lukutila tallentuu localStorageen, joten samaa versiota ei tarvitse kuitata jokaisella pelikerralla.'
  ]
};
