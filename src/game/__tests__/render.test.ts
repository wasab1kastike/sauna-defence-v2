import {
  DEFAULT_BOARD_CAMERA,
  getTileViewportPosition,
  pickDefenderAtCanvasPoint,
  pickEnemyAtCanvasPoint,
  resolveAnimatedHexPosition,
  resolveBossVisualProfile,
  resolveHordeBossVariantIndex
} from '../render';
import { gameContent } from '../../content/gameContent';
import { createDefaultMetaProgress, createInitialState, createSnapshot, createWaveDefinition } from '../logic';
import type { UnitMotionState, WaveDefinition } from '../types';

describe('render helpers', () => {
  it('interpolates between fromTile and toTile while motion is active', () => {
    const motion: UnitMotionState = {
      fromTile: { q: 0, r: -4 },
      toTile: { q: 0, r: -3 },
      startedAtMs: 100,
      durationMs: 240,
      style: 'step'
    };

    const position = resolveAnimatedHexPosition({ q: 0, r: -3 }, motion, 220);

    expect(position.q).toBeCloseTo(0, 6);
    expect(position.r).toBeGreaterThan(-4);
    expect(position.r).toBeLessThan(-3);
    expect(position.isMoving).toBe(true);
    expect(position.motionStyle).toBe('step');
  });

  it('falls back to the final tile when motion has finished', () => {
    const motion: UnitMotionState = {
      fromTile: { q: 0, r: -2 },
      toTile: { q: 1, r: -1 },
      startedAtMs: 50,
      durationMs: 120,
      style: 'blink'
    };

    const position = resolveAnimatedHexPosition({ q: 1, r: -1 }, motion, 300);

    expect(position.q).toBeCloseTo(1, 6);
    expect(position.r).toBeCloseTo(-1, 6);
    expect(position.isMoving).toBe(false);
    expect(position.progress).toBe(1);
  });

  it('distinguishes unit bosses from end-user horde wave members', () => {
    const pebbleWave: WaveDefinition = {
      index: 5,
      isBoss: true,
      rewardSisu: 7,
      pressure: 18,
      pattern: 'boss_breach',
      bossId: 'pebble',
      bossCategory: 'breach',
      spawns: []
    };
    const hordeWave: WaveDefinition = {
      index: 10,
      isBoss: true,
      rewardSisu: 9,
      pressure: 24,
      pattern: 'boss_pressure',
      bossId: 'end_user_horde',
      bossCategory: 'pressure',
      spawns: []
    };

    expect(resolveBossVisualProfile(pebbleWave, 'pebble').presentation).toBe('boss_unit');
    expect(resolveBossVisualProfile(hordeWave, 'thirsty_user').presentation).toBe('boss_horde_member');
    expect(resolveBossVisualProfile(hordeWave, 'brute').presentation).toBe('normal');
  });

  it('selects horde boss sprite variants deterministically from instance ids', () => {
    expect(resolveHordeBossVariantIndex(0, 3)).toBe(0);
    expect(resolveHordeBossVariantIndex(1, 3)).toBe(1);
    expect(resolveHordeBossVariantIndex(2, 3)).toBe(2);
    expect(resolveHordeBossVariantIndex(3, 3)).toBe(0);
    expect(resolveHordeBossVariantIndex(11, 3)).toBe(2);
    expect(resolveHordeBossVariantIndex(-1, 3)).toBe(2);
    expect(resolveHordeBossVariantIndex(7, 0)).toBe(0);
  });

  it('hit-tests enemies at their rendered position, including bosses', () => {
    const state = createInitialState(gameContent, createDefaultMetaProgress(), 42, false);
    state.currentWave = createWaveDefinition(5, gameContent);
    state.enemies = [{
      instanceId: 44,
      archetypeId: 'pebble',
      tokenStyleId: 0,
      tile: { q: 0, r: -6 },
      hp: gameContent.enemyArchetypes.pebble.maxHp,
      lastHitByDefenderId: null,
      attackReadyAtMs: 999999,
      moveReadyAtMs: 999999,
      nextAbilityAtMs: Number.POSITIVE_INFINITY,
      pathIndex: 0,
      spawnLaneIndex: 0,
      spawnedByEnemyInstanceId: null
    }];

    const snapshot = createSnapshot(state, gameContent);
    const rect = { left: 0, top: 0, width: 900, height: 700 } as DOMRect;
    const point = getTileViewportPosition(snapshot, rect.width, rect.height, state.enemies[0].tile);

    expect(pickEnemyAtCanvasPoint(snapshot, rect, point.x, point.y)).toBe(44);
  });

  it('projects and hit-tests defenders correctly through camera pan and zoom', () => {
    const state = createInitialState(gameContent, createDefaultMetaProgress(), 42, false);
    const defender = state.defenders.find((entry) => entry.location === 'ready')!;
    defender.location = 'board';
    defender.tile = { q: 1, r: -1 };
    defender.homeTile = { q: 1, r: -1 };

    const snapshot = createSnapshot(state, gameContent);
    const rect = { left: 0, top: 0, width: 900, height: 700 } as DOMRect;
    const camera = { ...DEFAULT_BOARD_CAMERA, zoom: 1.35, panX: 52, panY: -34 };
    const point = getTileViewportPosition(snapshot, rect.width, rect.height, defender.tile, camera);

    expect(pickDefenderAtCanvasPoint(snapshot, rect, point.x, point.y, camera)).toBe(defender.id);
  });
});
