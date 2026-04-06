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
  benchRerollCost: (_state: RunState, _defenderId: string) => 2,
  canRerollSaunaDefender: () => true,
  derivedStats: (_state: RunState, defender: DefenderInstance, _content: typeof gameContent): UnitStats => defender.stats,
  saunaRerollCost: () => 3,
  subclassSummary: () => 'Branch Ready'
};

describe('hud selectors', () => {
  it('assigns A, S and D to the first three ready reserve defenders', () => {
    const state = createInitialState(gameContent, createDefaultMetaProgress(), 42, false);

    const shortcutMap = createReserveShortcutKeyMap(state.defenders);
    const reserveEntries = createReadyReserveEntries(state, state.defenders, gameContent, shortcutMap, selectorDeps);

    expect(reserveEntries[0].shortcutKey).toBe('A');
    expect(reserveEntries[1].shortcutKey).toBe('S');
    expect(reserveEntries[2].shortcutKey).toBe('D');
  });

  it('sorts roster entries by board, sauna, then reserve and builds sauna dock labels', () => {
    const state = createInitialState(gameContent, createDefaultMetaProgress(), 42, false);
    const [boardHero, saunaHero, reserveHero] = state.defenders;
    boardHero.location = 'board';
    boardHero.tile = { q: 0, r: -1 };
    saunaHero.location = 'sauna';
    reserveHero.location = 'ready';
    state.selectedDefenderId = boardHero.id;
    state.selectedMapTarget = 'sauna';

    const readyReserveDefenders = state.defenders.filter((defender) => defender.location === 'ready');
    const shortcutMap = createReserveShortcutKeyMap(readyReserveDefenders);
    const rosterEntries = createRosterEntries(state, state.defenders, gameContent, shortcutMap, selectorDeps);
    const saunaReserve = createSaunaReserveEntry(state, saunaHero, boardHero, gameContent, selectorDeps);

    expect(rosterEntries.map((entry) => entry.location)).toEqual(['board', 'sauna', 'ready']);
    expect(saunaReserve.canReroll).toBe(true);
    expect(saunaReserve.rerollCost).toBe(3);
    expect(saunaReserve.sendSelectedBoardHeroLabel).toBe(`Swap ${boardHero.name} Into Sauna`);
  });
});
