import type { DefenderInstance, GameContent, RecruitOffer, RunState } from './types';

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
  const rerollCost = recruitRollCost();
  const nextLevelUpCost = recruitLevelUpCost(state.recruitLevelUpCount);
  const liveOffers = state.recruitOffers.filter((offer): offer is RecruitOffer => offer !== null);
  const cheapestOffer = liveOffers.length > 0 ? Math.min(...liveOffers.map((offer) => offer.price)) : null;

  if (rosterFull && liveOffers.length === 0 && !state.saunaDefenderId) {
    return replacement
      ? `Roster full: reroll normally, then your next recruit will replace ${replacement.name}.`
      : 'Roster full: reroll normally, then select a roster hero or the sauna reserve to replace.';
  }
  if (liveOffers.length > 0) {
    if (state.recruitMarketIsFree) {
      return state.saunaDefenderId
        ? 'Opening batch is free, but buying one now will replace the sauna reserve.'
        : 'Opening batch is free. Pick one recruit for the sauna or refresh into the paid market.';
    }
    if (state.saunaDefenderId) {
      return cheapestOffer !== null && state.sisu.current >= cheapestOffer
        ? 'Sauna reserve is occupied: buying a recruit will replace the current sauna hero.'
        : 'Sauna reserve is occupied, but you still need more SISU to replace it.';
    }
    if (rosterFull) {
      return replacement
        ? cheapestOffer !== null && state.sisu.current >= cheapestOffer
          ? `Roster full: buying a recruit will replace ${replacement.name}.`
          : `Roster full: ${replacement.name} is marked for replacement, but you still need more SISU.`
        : 'Roster full: select who gets replaced before buying a recruit.';
    }
    return cheapestOffer !== null && state.sisu.current >= cheapestOffer
      ? 'Buy one recruit into the sauna reserve, or refresh the whole four-slot market.'
      : 'You can scout the four-slot market, but you need more SISU to afford a recruit.';
  }
  if (state.recruitMarketIsFree) {
    return `Opening batch is free. Refresh costs ${rerollCost} SISU and switches the market back to normal prices.`;
  }
  if (state.saunaDefenderId) {
    return `Refresh costs ${rerollCost} SISU. Recruitment Level Up costs ${nextLevelUpCost} SISU. Buying a recruit now replaces the sauna reserve.`;
  }
  return `Refresh costs ${rerollCost} SISU. Recruitment Level Up costs ${nextLevelUpCost} SISU and improves future recruit levels.`;
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
  defender.location = 'sauna';
  defender.tile = null;
  deps.clearUnitMotion(defender);
  state.saunaDefenderId = defender.id;

  fillDefenderToMax(state, defender, content, deps);
  state.defenders.push(defender);
}
