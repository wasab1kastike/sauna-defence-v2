import type { GameSnapshot } from '../game/types';

export const BEER_BUFF_TRACK_PATH = 'audio/beer-buff-theme.mp3';

function activeAlcoholStackTotal(snapshot: GameSnapshot | null): number {
  if (!snapshot) {
    return 0;
  }
  return snapshot.hud.activeAlcohols.reduce((total, drink) => total + drink.stacks, 0);
}

export function didBeerBuffActivate(previousSnapshot: GameSnapshot | null, nextSnapshot: GameSnapshot | null): boolean {
  if (!previousSnapshot || !nextSnapshot) {
    return false;
  }
  return activeAlcoholStackTotal(nextSnapshot) > activeAlcoholStackTotal(previousSnapshot);
}
