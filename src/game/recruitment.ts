import type { DefenderInstance, GameContent, RunState } from './types';

export interface RecruitmentDependencies {
  boardCap: (state: RunState, content: GameContent) => number;
  boardDefenders: (state: RunState) => DefenderInstance[];
  canAccessRecruitment: (state: RunState) => boolean;
  clearUnitMotion: (unit: DefenderInstance) => void;
  derivedMaxHp: (state: RunState, defender: DefenderInstance, content: GameContent) => number;
  getFocusedSaunaDefender: (state: RunState) => DefenderInstance | null;
  livingDefenders: (state: RunState) => DefenderInstance[];
  moveDefenderToFirstEmptySaunaSlot: (state: RunState, defender: DefenderInstance, content: GameContent) => boolean;
  rosterCap: (state: RunState, content: GameContent) => number;
  saunaCapacity: (state: RunState, content: GameContent) => number;
  saunaOccupancy: (state: RunState) => number;
}

export function recruitRollCost(): number {
  return 2;
}

export function benchRerollCost(state: RunState, defenderId: string): number {
  return 1 + (state.benchRerollCountsByDefenderId[defenderId] ?? 0);
}

export function recruitLevelUpCost(levelUpCount: number): number {
  return 2 + Math.floor((levelUpCount * (levelUpCount + 3)) / 2);
}

export function saunaRerollCost(state: RunState, deps: RecruitmentDependencies): number | null {
  const saunaDefender = deps.getFocusedSaunaDefender(state);
  return saunaDefender && saunaDefender.location === 'sauna'
    ? benchRerollCost(state, saunaDefender.id)
    : null;
}

export function canRerollSaunaDefender(state: RunState, deps: RecruitmentDependencies): boolean {
  const cost = saunaRerollCost(state, deps);
  return cost !== null && deps.canAccessRecruitment(state) && state.sisu.current >= cost;
}

export function recruitmentStatusText(state: RunState, content: GameContent, deps: RecruitmentDependencies): string {
  if (state.phase === 'lost' || state.overlayMode === 'intermission') {
    return 'Recruitment closes between runs.';
  }
  if (state.introOpen) {
    return 'Finish the briefing before opening the recruitment market.';
  }
  const boardFull = deps.boardDefenders(state).length >= deps.boardCap(state, content);
  const pendingReadyRecruit = state.defenders.find((defender) => defender.location === 'ready') ?? null;
  const rerollCost = recruitRollCost();
  const nextLevelUpCost = recruitLevelUpCost(state.recruitLevelUpCount);
  const visibleOffers = state.recruitOffers.filter((offer): offer is NonNullable<typeof offer> => offer !== null);

  if (pendingReadyRecruit) {
    return `Place or sauna ${pendingReadyRecruit.name} first before recruiting another hero.`;
  }
  if (visibleOffers.length > 0) {
    const cheapest = Math.min(...visibleOffers.map((offer) => offer.price));
    if (boardFull) {
      const saunaHasSpace = deps.saunaOccupancy(state) < deps.saunaCapacity(state, content);
      return state.sisu.current >= cheapest
        ? saunaHasSpace
          ? 'Board full: the next recruit goes straight into an empty sauna slot.'
          : 'Board full: buying a recruit will replace the currently selected sauna hero.'
        : 'Board full: the next recruit will route through the sauna once you have enough SISU.';
    }
    return state.sisu.current >= cheapest
      ? state.recruitMarketIsFree
        ? 'Opening roster is free. Pick one hero, place them, then reroll when you want fresh prices.'
        : 'Pick one recruit, place them on the board, then reroll when you want a fresh batch.'
      : 'You can inspect the market, but you need more SISU to afford any offer.';
  }
  if (boardFull) {
    return deps.saunaOccupancy(state) < deps.saunaCapacity(state, content)
      ? `Board full and sauna has room: the next recruit goes to sauna. Refresh costs ${rerollCost} SISU and Level Up costs ${nextLevelUpCost} SISU.`
      : `Board full and sauna is full: the next recruit replaces the selected sauna hero. Refresh costs ${rerollCost} SISU and Level Up costs ${nextLevelUpCost} SISU.`;
  }
  return `Refresh costs ${rerollCost} SISU. Recruitment Level Up costs ${nextLevelUpCost} SISU and improves future rerolls.`;
}

export function fillDefenderToMax(
  state: RunState,
  defender: DefenderInstance,
  content: GameContent,
  deps: RecruitmentDependencies
): void {
  defender.hp = deps.derivedMaxHp(state, defender, content);
}

export function addRecruitToReserve(
  state: RunState,
  defender: DefenderInstance,
  content: GameContent,
  deps: RecruitmentDependencies
): void {
  const boardIsFull = deps.boardDefenders(state).length >= deps.boardCap(state, content);
  const saunaHasSpace = deps.saunaOccupancy(state) < deps.saunaCapacity(state, content);

  if (boardIsFull && saunaHasSpace) {
    deps.moveDefenderToFirstEmptySaunaSlot(state, defender, content);
  } else {
    defender.location = 'ready';
    defender.tile = null;
    deps.clearUnitMotion(defender);
  }

  fillDefenderToMax(state, defender, content, deps);
  state.defenders.push(defender);
}
