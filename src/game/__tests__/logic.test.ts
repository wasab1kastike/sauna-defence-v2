import { gameContent } from '../../content/gameContent';
import { applyAction, createInitialState, stepState } from '../logic';
import type { RunState } from '../types';

function makeWaveState(): RunState {
  const state = createInitialState(gameContent);
  state.phase = 'wave';
  state.pendingSpawns = [];
  state.waveElapsedMs = 0;
  return state;
}

describe('Sauna Defense logic', () => {
  it('places a selected unit on a buildable tile and spends steam', () => {
    let state = createInitialState(gameContent);
    state = applyAction(state, { type: 'selectUnitType', unitId: 'guardian' }, gameContent);
    state = applyAction(state, { type: 'placeSelectedUnit', tile: { q: 0, r: -2 } }, gameContent);

    expect(state.units).toHaveLength(1);
    expect(state.units[0].archetypeId).toBe('guardian');
    expect(state.units[0].tile).toEqual({ q: 0, r: -2 });
    expect(state.steam).toBe(gameContent.config.startingSteam - 6);
  });

  it('transitions back to prep and grants resources when a wave is cleared', () => {
    const state = makeWaveState();
    const next = stepState(state, 16, gameContent);

    expect(next.phase).toBe('prep');
    expect(next.waveIndex).toBe(1);
    expect(next.steam).toBe(
      gameContent.config.startingSteam +
        gameContent.config.waves[0].rewardSteam +
        gameContent.config.betweenWaveSteam
    );
  });

  it('sisu increases player damage output', () => {
    let state = createInitialState(gameContent);
    state = applyAction(state, { type: 'selectUnitType', unitId: 'hurler' }, gameContent);
    state = applyAction(state, { type: 'placeSelectedUnit', tile: { q: 0, r: -2 } }, gameContent);
    state.phase = 'wave';
    state.pendingSpawns = [];
    state.units.push({
      instanceId: 999,
      archetypeId: 'raider',
      team: 'enemy',
      tile: { q: 0, r: -4 },
      hp: gameContent.archetypes.raider.maxHp,
      attackReadyAtMs: 99999,
      moveReadyAtMs: 99999
    });

    const normal = stepState(state, 1000, gameContent);
    const normalEnemy = normal.units.find((unit) => unit.instanceId === 999);
    expect(normalEnemy?.hp).toBe(5);

    let sisuState = createInitialState(gameContent);
    sisuState = applyAction(sisuState, { type: 'selectUnitType', unitId: 'hurler' }, gameContent);
    sisuState = applyAction(
      sisuState,
      { type: 'placeSelectedUnit', tile: { q: 0, r: -2 } },
      gameContent
    );
    sisuState.phase = 'wave';
    sisuState.pendingSpawns = [];
    sisuState.units.push({
      instanceId: 999,
      archetypeId: 'raider',
      team: 'enemy',
      tile: { q: 0, r: -4 },
      hp: gameContent.archetypes.raider.maxHp,
      attackReadyAtMs: 99999,
      moveReadyAtMs: 99999
    });
    sisuState = applyAction(sisuState, { type: 'activateSisu' }, gameContent);

    const buffed = stepState(sisuState, 1000, gameContent);
    const buffedEnemy = buffed.units.find((unit) => unit.instanceId === 999);
    expect(buffedEnemy?.hp).toBe(3);
  });

  it('ends the run when the sauna takes lethal damage', () => {
    const state = makeWaveState();
    state.saunaHp = 4;
    state.units.push({
      instanceId: 1,
      archetypeId: 'raider',
      team: 'enemy',
      tile: { q: 0, r: -1 },
      hp: 10,
      attackReadyAtMs: 0,
      moveReadyAtMs: 99999
    });

    const next = stepState(state, 50, gameContent);

    expect(next.phase).toBe('lost');
    expect(next.saunaHp).toBe(0);
  });
});
