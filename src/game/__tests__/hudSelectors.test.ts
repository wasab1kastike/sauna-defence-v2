import { gameContent } from '../../content/gameContent';
import { createDefaultMetaProgress, createInitialState } from '../logic';
import {
  createRosterEntries,
  createSaunaReserveEntry
} from '../hudSelectors';
import type { DefenderInstance, RunState, UnitStats } from '../types';

const selectorDeps = {
  canRerollSaunaDefender: () => true,
  derivedStats: (state: RunState, defender: DefenderInstance, content: typeof gameContent): UnitStats => {
    void state;
    void content;
    return defender.stats;
  },
  sacrificeSteamReward: (defender: DefenderInstance | null) => defender ? Math.floor(defender.kills / 100) : 0,
  saunaRerollCost: () => 3,
  subclassSummary: () => 'Branch Ready'
};

describe('hud selectors', () => {
  it('sorts roster entries by board, sauna, then reserve and builds sauna dock labels', () => {
    const state = createInitialState(gameContent, createDefaultMetaProgress(), 42, false);
    const offers = state.recruitOffers.filter((offer): offer is NonNullable<typeof offer> => offer !== null);
    state.defenders = offers.slice(0, 3).map((offer) => offer.candidate);
    const [boardHero, saunaHero, reserveHero] = state.defenders;
    boardHero.location = 'board';
    boardHero.tile = { q: 0, r: -1 };
    saunaHero.location = 'sauna';
    reserveHero.location = 'ready';
    state.saunaDefenderIds = [saunaHero.id];
    state.selectedSaunaSlotIndex = 0;
    state.selectedDefenderId = boardHero.id;
    state.selectedMapTarget = 'sauna';

    const rosterEntries = createRosterEntries(state, state.defenders, gameContent, selectorDeps);
    const saunaReserve = createSaunaReserveEntry(state, saunaHero, 0, boardHero, gameContent, selectorDeps);

    expect(rosterEntries.map((entry) => entry.location)).toEqual(['board', 'sauna', 'ready']);
    expect(saunaReserve.canReroll).toBe(true);
    expect(saunaReserve.rerollCost).toBe(3);
    expect(saunaReserve.canSacrifice).toBe(true);
    expect(saunaReserve.sendSelectedBoardHeroLabel).toBe(`Replace Slot 1 With ${boardHero.name}`);
  });
});
