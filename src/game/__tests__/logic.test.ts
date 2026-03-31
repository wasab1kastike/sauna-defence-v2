import { gameContent } from '../../content/gameContent';
import {
  applyAction,
  createDefaultMetaProgress,
  createInitialState,
  createSnapshot,
  stepState
} from '../logic';

function prepState() {
  return createInitialState(gameContent, createDefaultMetaProgress(), 42);
}

describe('Sauna Defense V2 logic', () => {
  it('creates a named starter roster with one sauna defender', () => {
    const state = prepState();

    expect(state.defenders).toHaveLength(5);
    expect(state.defenders.filter((defender) => defender.location === 'sauna')).toHaveLength(1);
    expect(state.defenders.every((defender) => defender.name.length > 0)).toBe(true);
  });

  it('enforces board cap of four defenders', () => {
    let state = prepState();
    const ready = state.defenders.filter((defender) => defender.location === 'ready');

    for (let index = 0; index < 4; index += 1) {
      state = applyAction(state, { type: 'selectDefender', defenderId: ready[index].id }, gameContent);
      state = applyAction(
        state,
        { type: 'placeSelectedDefender', tile: { q: index - 1, r: -2 } },
        gameContent
      );
    }

    const saunaDefender = state.defenders.find((defender) => defender.location === 'sauna');
    expect(saunaDefender).toBeTruthy();
    state = applyAction(state, { type: 'selectDefender', defenderId: saunaDefender!.id }, gameContent);
    state = applyAction(state, { type: 'placeSelectedDefender', tile: { q: 1, r: 1 } }, gameContent);

    expect(state.defenders.filter((defender) => defender.location === 'board')).toHaveLength(4);
    expect(state.message).toContain('Board cap');
  });

  it('heals the sauna defender when a wave resolves', () => {
    let state = prepState();
    const saunaDefender = state.defenders.find((defender) => defender.location === 'sauna');
    expect(saunaDefender).toBeTruthy();
    saunaDefender!.hp = 1;
    state.phase = 'wave';
    state.currentWave = { index: 1, isBoss: false, rewardSisu: 3, spawns: [] };
    state.pendingSpawns = [];
    state.enemies = [];

    const next = stepState(state, 16, gameContent);
    const healed = next.defenders.find((defender) => defender.id === saunaDefender!.id);

    expect(next.phase).toBe('prep');
    expect(healed?.hp).toBeGreaterThan(1);
    expect(next.steamEarned).toBe(1);
  });

  it('recruit gamble consumes more SISU each time', () => {
    let state = prepState();
    state.defenders = state.defenders.filter((defender) => defender.location !== 'dead').slice(0, 4);
    state.saunaDefenderId = state.defenders.find((defender) => defender.location === 'sauna')?.id ?? null;
    state.sisu.current = 20;

    const firstCost = createSnapshot(state, gameContent).hud.recruitCost;
    state = applyAction(state, { type: 'gambleRecruit' }, gameContent);
    const secondCost = createSnapshot(state, gameContent).hud.recruitCost;

    expect(state.sisu.current).toBe(20 - firstCost);
    expect(secondCost).toBeGreaterThan(firstCost);
  });

  it('marks every fifth wave as a boss wave', () => {
    const state = prepState();
    state.waveIndex = 5;
    state.currentWave = {
      index: 5,
      isBoss: true,
      rewardSisu: 7,
      spawns: [{ atMs: 0, enemyId: 'chieftain', laneIndex: 0 }]
    };

    const snapshot = createSnapshot(state, gameContent);
    expect(snapshot.hud.isBossWave).toBe(true);
    expect(snapshot.hud.wavePreview[0].id).toBe('chieftain');
  });

  it('lets the player buy a meta upgrade after losing', () => {
    let state = prepState();
    state.phase = 'lost';
    state.steamEarned = 8;
    state.meta.steam = 0;

    state = applyAction(state, { type: 'buyMetaUpgrade', upgradeId: 'inventory_slots' }, gameContent);

    expect(state.meta.steam).toBeLessThan(8);
    expect(state.meta.upgrades.inventory_slots).toBe(1);
  });
});
