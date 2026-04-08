import { gameContent } from '../../content/gameContent';
import { createDefaultMetaProgress, createInitialState } from '../logic';
import {
  createReadyReserveEntries,
  createReserveShortcutKeyMap,
  createRosterEntries,
  createSaunaReserveEntry
} from '../hudSelectors';
import type { DefenderInstance, RunState, UnitStats } from '../types';

const selectorDeps = {
  benchRerollCost: (state: RunState, defenderId: string) => {
    void state;
    void defenderId;
    return 2;
  },
  canRerollSaunaDefender: () => true,
  derivedStats: (state: RunState, defender: DefenderInstance, content: typeof gameContent): UnitStats => {
    void state;
    void content;
    return defender.stats;
  },
  saunaRerollCost: () => 3,
  subclassSummary: () => 'Branch Ready'
};

describe('hud selectors', () => {
  it('assigns A, S and D to the first three ready reserve defenders', () => {
    const state = createInitialState(gameContent, createDefaultMetaProgress(), 42, false);
    const offers = state.recruitOffers.filter((offer): offer is NonNullable<typeof offer> => offer !== null);
    state.defenders = offers.slice(0, 3).map((offer) => offer.candidate);
    state.defenders.forEach((defender) => {
      defender.location = 'ready';
      defender.tile = null;
    });

    const shortcutMap = createReserveShortcutKeyMap(state.defenders);
    const reserveEntries = createReadyReserveEntries(state, state.defenders, gameContent, shortcutMap, selectorDeps);

    expect(reserveEntries[0].shortcutKey).toBe('A');
    expect(reserveEntries[1].shortcutKey).toBe('S');
    expect(reserveEntries[2].shortcutKey).toBe('D');
  });

  it('sorts roster entries by board, sauna, then reserve and builds sauna dock labels', () => {
    const state = createInitialState(gameContent, createDefaultMetaProgress(), 42, false);
    const offers = state.recruitOffers.filter((offer): offer is NonNullable<typeof offer> => offer !== null);
    state.defenders = offers.slice(0, 3).map((offer) => offer.candidate);
    const [boardHero, saunaHero, reserveHero] = state.defenders;
    boardHero.location = 'board';
    boardHero.tile = { q: 0, r: -1 };
    saunaHero.location = 'sauna';
    reserveHero.location = 'ready';
    state.saunaDefenderId = saunaHero.id;
    state.selectedDefenderId = boardHero.id;
    state.selectedMapTarget = 'sauna';

    const readyReserveDefenders = state.defenders.filter((defender) => defender.location === 'ready');
    const shortcutMap = createReserveShortcutKeyMap(readyReserveDefenders);
    const rosterEntries = createRosterEntries(state, state.defenders, gameContent, shortcutMap, selectorDeps);
    const saunaReserve = createSaunaReserveEntry(state, saunaHero, boardHero, gameContent, selectorDeps);

    expect(rosterEntries.map((entry) => entry.location)).toEqual(['board', 'sauna', 'ready']);
    expect(saunaReserve.canReroll).toBe(true);
    expect(saunaReserve.rerollCost).toBe(3);
    expect(saunaReserve.sendSelectedBoardHeroLabel).toBe(`Replace Sauna Hero With ${boardHero.name}`);
  });
});
