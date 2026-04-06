import type { DefenderInstance, GameContent, RunState } from './types';

export interface RecruitmentDependencies {
  boardCap: (state: RunState, content: GameContent) => number;
  boardDefenders: (state: RunState) => DefenderInstance[];
  canAccessRecruitment: (state: RunState) => boolean;
  clearUnitMotion: (unit: DefenderInstance) => void;
  derivedMaxHp: (state: RunState, defender: DefenderInstance, content: GameContent) => number;
  getDefender: (state: RunState, defenderId: string | null) => DefenderInstance | null;
  livingDefenders: (state: RunState) => DefenderInstance[];
  recruitReplacementTarget: (state: RunState) => DefenderInstance | null;
  rosterCap: (state: RunState, content: GameContent) => number;
}

export function recruitRollCost(): number {
  return 2;
}

export function benchRerollCost(state: RunState, defenderId: string): number {
  return 1 + (state.benchRerollCountsByDefenderId[defenderId] ?? 0);
}

export function recruitOfferRerollCost(state: RunState, offerId: number): number {
  return 1 + (state.recruitRerollCountsByOfferId[offerId] ?? 0);
}

export function recruitLevelUpCost(levelUpCount: number): number {
  return 2 + Math.floor((levelUpCount * (levelUpCount + 3)) / 2);
}

export function saunaRerollCost(state: RunState, deps: RecruitmentDependencies): number | null {
  const saunaDefender = deps.getDefender(state, state.saunaDefenderId);
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
  const replacement = deps.recruitReplacementTarget(state);
  const rosterFull = deps.livingDefenders(state).length >= deps.rosterCap(state, content);
  const boardFull = deps.boardDefenders(state).length >= deps.boardCap(state, content);
  const rerollCost = recruitRollCost();
  const nextLevelUpCost = recruitLevelUpCost(state.recruitLevelUpCount);
  if (rosterFull && state.recruitOffers.length === 0) {
    return replacement
      ? `Roster full: reroll normally, then your next recruit will replace ${replacement.name}.`
      : 'Roster full: reroll normally, then select a roster hero or the sauna reserve to replace.';
  }
  if (state.recruitOffers.length > 0) {
    if (rosterFull) {
      return replacement
        ? state.sisu.current >= Math.min(...state.recruitOffers.map((offer) => offer.price))
          ? `Roster full: buying a recruit will replace ${replacement.name}.`
          : `Roster full: ${replacement.name} is marked for replacement, but you still need more SISU.`
        : 'Roster full: select who gets replaced before buying a recruit.';
    }
    if (boardFull) {
      return state.sisu.current >= Math.min(...state.recruitOffers.map((offer) => offer.price))
        ? state.saunaDefenderId
          ? 'Board full: the sauna is occupied, so new recruits will join the reserve row.'
          : 'Board full: the next recruit will go straight into the sauna reserve.'
        : 'Board full: you need more SISU before this batch can reinforce the reserve line.';
    }
    return state.sisu.current >= Math.min(...state.recruitOffers.map((offer) => offer.price))
      ? 'Pick one candidate. The others leave when you sign a recruit.'
      : 'You can inspect the market, but you need more SISU to afford any offer.';
  }
  if (boardFull && !rosterFull) {
    return state.saunaDefenderId
      ? `Board full: the sauna is occupied, so new recruits will join the reserve row. Reroll costs ${rerollCost} SISU and Level Up costs ${nextLevelUpCost} SISU.`
      : `Board full: the sauna is empty, so the next recruit will go there. Reroll costs ${rerollCost} SISU and Level Up costs ${nextLevelUpCost} SISU.`;
  }
  return `Reroll costs ${rerollCost} SISU. Recruitment Level Up costs ${nextLevelUpCost} SISU and improves future recruit levels.`;
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
  const saunaIsEmpty = !state.saunaDefenderId;

  if (boardIsFull && saunaIsEmpty) {
    defender.location = 'sauna';
    defender.tile = null;
    deps.clearUnitMotion(defender);
    state.saunaDefenderId = defender.id;
  } else {
    defender.location = 'ready';
    defender.tile = null;
    deps.clearUnitMotion(defender);
  }

  fillDefenderToMax(state, defender, content, deps);
  state.defenders.push(defender);
}
