import {
  canRenderEndUserHordeSprites,
  collectPebbleBottleTiles,
  collectFireballTelegraphTiles,
  getTileViewportPosition,
  pickEnemyAtCanvasPoint,
  resolveEnemyRenderRadius,
  resolveEndUserHordeSpriteIndexes,
  resolveAnimatedHexPosition,
  resolveBossVisualProfile
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

  it('exposes deterministic horde sprite picks and reports fallback when custom sprites are unavailable', () => {
    expect(resolveEndUserHordeSpriteIndexes(7)).toEqual([1, 3, 5]);
    expect(canRenderEndUserHordeSprites(7)).toBe(false);
  });

  it('exposes Pebble bottle tiles for rendering only during Pebble boss waves', () => {
    const state = createInitialState(gameContent, createDefaultMetaProgress(), 42, false);
    state.currentWave = createWaveDefinition(5, gameContent);
    state.pebbleBottleTargets = [
      { id: 1, tile: { q: 2, r: -3 }, consumed: false },
      { id: 2, tile: { q: -2, r: 3 }, consumed: true }
    ];

    const snapshot = createSnapshot(state, gameContent);
    expect(collectPebbleBottleTiles(snapshot)).toEqual([{ q: 2, r: -3 }]);

    state.currentWave = createWaveDefinition(10, gameContent);
    expect(collectPebbleBottleTiles(createSnapshot(state, gameContent))).toEqual([]);
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

  it('renders the first Pebble encounter smaller and later encounters larger', () => {
    const buildSnapshot = (encounterMaxHp: number, encounterCount: number) => {
      const state = createInitialState(gameContent, createDefaultMetaProgress(), 42, false);
      state.currentWave = createWaveDefinition(5, gameContent);
      state.pebbleEncounterCount = encounterCount;
      state.enemies = [{
        instanceId: 44,
        archetypeId: 'pebble',
        tokenStyleId: 0,
        tile: { q: 0, r: -6 },
        hp: encounterMaxHp,
        lastHitByDefenderId: null,
        attackReadyAtMs: 999999,
        moveReadyAtMs: 999999,
        nextAbilityAtMs: Number.POSITIVE_INFINITY,
        pathIndex: 0,
        pebbleEncounterMaxHp: encounterMaxHp,
        spawnLaneIndex: 0,
        spawnedByEnemyInstanceId: null
      }];
      return createSnapshot(state, gameContent);
    };

    const firstSnapshot = buildSnapshot(220, 1);
    const laterSnapshot = buildSnapshot(380, 3);
    const firstRadius = resolveEnemyRenderRadius(firstSnapshot, firstSnapshot.state.enemies[0], 900, 700);
    const laterRadius = resolveEnemyRenderRadius(laterSnapshot, laterSnapshot.state.enemies[0], 900, 700);

    expect(firstRadius).toBeGreaterThan(0);
    expect(laterRadius).toBeGreaterThan(firstRadius);
    expect(laterRadius / firstRadius).toBeCloseTo(1.125, 5);
  });

  it('exposes the full radius-2 fireball telegraph area for rendering', () => {
    const state = createInitialState(gameContent, createDefaultMetaProgress(), 42, false);
    state.pendingFireballs = [{
      ownerDefenderId: 'guardian-1',
      targetTile: { q: 0, r: -2 },
      explodeAtMs: 1000,
      damageSnapshot: 9
    }];

    const snapshot = createSnapshot(state, gameContent);
    const telegraphKeys = new Set(collectFireballTelegraphTiles(snapshot).map((tile) => `${tile.q},${tile.r}`));

    expect(telegraphKeys.has('0,-2')).toBe(true);
    expect(telegraphKeys.has('2,-2')).toBe(true);
    expect(telegraphKeys.has('-1,-1')).toBe(true);
    expect(telegraphKeys.has('3,-2')).toBe(false);
  });
});
