import { gameContent } from '../../content/gameContent';
import {
  applyAction,
  createWaveDefinition,
  createDefaultMetaProgress,
  createInitialState,
  createSnapshot,
  stepState
} from '../logic';
import { getTileViewportPosition, pickDefenderAtCanvasPoint } from '../render';

function prepState() {
  return createInitialState(gameContent, createDefaultMetaProgress(), 42, false);
}

describe('Sauna Defense V2 logic', () => {
  it('builds a steeper early pacing curve and keeps the first boss on wave five', () => {
    const waves = [1, 2, 3, 4, 5].map((index) => createWaveDefinition(index, gameContent));

    expect(waves[0].isBoss).toBe(false);
    expect(waves[3].isBoss).toBe(false);
    expect(waves[4].isBoss).toBe(true);
    expect(waves[1].pressure).toBeGreaterThan(waves[0].pressure);
    expect(waves[2].pressure).toBeGreaterThan(waves[1].pressure);
    expect(waves[3].pressure).toBeGreaterThan(waves[2].pressure);
    expect(waves[4].pressure).toBeGreaterThan(waves[3].pressure);
  });

  it('rotates unique bosses in a fixed order across boss waves', () => {
    const waves = [5, 10, 15, 20, 25].map((index) => createWaveDefinition(index, gameContent));

    expect(waves.map((wave) => wave.bossId)).toEqual([
      'pebble',
      'end_user_horde',
      'electric_bather',
      'escalation_manager',
      'pebble'
    ]);
    expect(waves.map((wave) => wave.bossCategory)).toEqual([
      'breach',
      'pressure',
      'pressure',
      'pressure',
      'breach'
    ]);
  });

  it('makes Pebble ignore defenders and continue along its scripted path', () => {
    let state = prepState();
    const defender = state.defenders.find((entry) => entry.location === 'ready');
    expect(defender).toBeTruthy();
    defender!.location = 'board';
    defender!.tile = { q: 1, r: -6 };
    defender!.homeTile = { q: 1, r: -6 };
    defender!.hp = 20;
    defender!.attackReadyAtMs = 999999;
    state.phase = 'wave';
    state.pendingSpawns = [];
    state.enemies = [{
      instanceId: 1,
      archetypeId: 'pebble',
      tokenStyleId: 0,
      tile: { q: 0, r: -6 },
      hp: gameContent.enemyArchetypes.pebble.maxHp,
      lastHitByDefenderId: null,
      attackReadyAtMs: 0,
      moveReadyAtMs: 0,
      nextAbilityAtMs: Number.POSITIVE_INFINITY,
      pathIndex: 0,
      spawnLaneIndex: 0,
      spawnedByEnemyInstanceId: null
    }];

    state = stepState(state, 16, gameContent);

    expect(state.defenders.find((entry) => entry.id === defender!.id)?.hp).toBe(20);
    expect(state.enemies[0]?.tile).toEqual({ q: 1, r: -5 });
    expect(state.enemies[0]?.pathIndex).toBe(1);
    expect(state.enemies[0]?.motion?.style).toBe('slither');
    expect(state.enemies[0]?.motion?.fromTile).toEqual({ q: 0, r: -6 });
    expect(state.enemies[0]?.motion?.toTile).toEqual({ q: 1, r: -5 });
  });

  it('creates step motion metadata when a standard enemy advances', () => {
    let state = prepState();
    state.phase = 'wave';
    state.pendingSpawns = [];
    state.enemies = [{
      instanceId: 1,
      archetypeId: 'raider',
      tokenStyleId: 0,
      tile: { q: 0, r: -4 },
      hp: gameContent.enemyArchetypes.raider.maxHp,
      lastHitByDefenderId: null,
      attackReadyAtMs: 999999,
      moveReadyAtMs: 0,
      nextAbilityAtMs: Number.POSITIVE_INFINITY,
      pathIndex: null,
      spawnLaneIndex: 0,
      spawnedByEnemyInstanceId: null
    }];

    state = stepState(state, 16, gameContent);

    expect(state.enemies[0]?.tile).toEqual({ q: 0, r: -3 });
    expect(state.enemies[0]?.motion?.style).toBe('step');
    expect(state.enemies[0]?.motion?.fromTile).toEqual({ q: 0, r: -4 });
    expect(state.enemies[0]?.motion?.toTile).toEqual({ q: 0, r: -3 });
  });

  it('creates blink motion metadata when a defender retreats home with Blink Step', () => {
    let state = prepState();
    const defender = state.defenders.find((entry) => entry.location === 'ready')!;
    defender.location = 'board';
    defender.tile = { q: 0, r: -2 };
    defender.homeTile = { q: 0, r: -1 };
    defender.skills = ['blink_step'];
    defender.hp = Math.max(1, Math.floor(defender.hp * 0.4));
    defender.attackReadyAtMs = 0;
    state.phase = 'wave';
    state.pendingSpawns = [];
    state.enemies = [{
      instanceId: 1,
      archetypeId: 'raider',
      tokenStyleId: 0,
      tile: { q: 5, r: -5 },
      hp: gameContent.enemyArchetypes.raider.maxHp,
      lastHitByDefenderId: null,
      attackReadyAtMs: 999999,
      moveReadyAtMs: 999999
    }];

    state = stepState(state, 16, gameContent);

    expect(state.defenders.find((entry) => entry.id === defender.id)?.tile).toEqual({ q: 0, r: -1 });
    expect(state.defenders.find((entry) => entry.id === defender.id)?.motion?.style).toBe('blink');
    expect(state.defenders.find((entry) => entry.id === defender.id)?.motion?.fromTile).toEqual({ q: 0, r: -2 });
    expect(state.defenders.find((entry) => entry.id === defender.id)?.motion?.toTile).toEqual({ q: 0, r: -1 });
  });

  it('ramps thirsty user damage based on how many are still alive', () => {
    const buildState = (userCount: number) => {
      const state = prepState();
      const defender = state.defenders.find((entry) => entry.location === 'ready')!;
      defender.location = 'board';
      defender.tile = { q: 0, r: -1 };
      defender.homeTile = { q: 0, r: -1 };
      defender.hp = 20;
      defender.stats.defense = 0;
      defender.attackReadyAtMs = 999999;
      state.phase = 'wave';
      state.pendingSpawns = [];
      const fillerTiles = [
        { q: 5, r: -5 },
        { q: 5, r: -4 },
        { q: 4, r: -4 },
        { q: -5, r: 5 }
      ];
      state.enemies = Array.from({ length: userCount }, (_, index) => ({
        instanceId: index + 1,
        archetypeId: 'thirsty_user' as const,
        tokenStyleId: 0,
        tile: index === 0 ? { q: 0, r: 0 } : fillerTiles[index - 1] ?? fillerTiles[0],
        hp: gameContent.enemyArchetypes.thirsty_user.maxHp,
        lastHitByDefenderId: null,
        attackReadyAtMs: index === 0 ? 0 : 999999,
        moveReadyAtMs: 999999,
        nextAbilityAtMs: Number.POSITIVE_INFINITY,
        pathIndex: null,
        spawnLaneIndex: index,
        spawnedByEnemyInstanceId: null
      }));
      return state;
    };

    const heavy = stepState(buildState(3), 16, gameContent);
    const light = stepState(buildState(2), 16, gameContent);

    expect(heavy.defenders.find((entry) => entry.location === 'board')?.hp).toBe(16);
    expect(light.defenders.find((entry) => entry.location === 'board')?.hp).toBe(17);
  });

  it('lets the electric boss chain shock multiple defenders', () => {
    let state = prepState();
    const defenders = state.defenders.filter((entry) => entry.location === 'ready').slice(0, 3);
    defenders.forEach((defender, index) => {
      defender.location = 'board';
      defender.tile = [{ q: 0, r: -1 }, { q: 1, r: -1 }, { q: -1, r: 0 }][index];
      defender.homeTile = defender.tile;
      defender.hp = 20;
      defender.stats.defense = 0;
      defender.attackReadyAtMs = 999999;
    });
    state.phase = 'wave';
    state.pendingSpawns = [];
    state.enemies = [{
      instanceId: 1,
      archetypeId: 'electric_bather',
      tokenStyleId: 0,
      tile: { q: 0, r: 0 },
      hp: gameContent.enemyArchetypes.electric_bather.maxHp,
      lastHitByDefenderId: null,
      attackReadyAtMs: 999999,
      moveReadyAtMs: 999999,
      nextAbilityAtMs: 0,
      pathIndex: null,
      spawnLaneIndex: 0,
      spawnedByEnemyInstanceId: null
    }];

    state = stepState(state, 16, gameContent);

    expect(defenders.every((defender) => (state.defenders.find((entry) => entry.id === defender.id)?.hp ?? 20) < 20)).toBe(true);
    expect(state.fxEvents.some((event) => event.kind === 'chain')).toBe(true);
  });

  it('makes the electric boss overload the sauna when no defender is in range', () => {
    let state = prepState();
    state.phase = 'wave';
    state.pendingSpawns = [];
    const saunaHpBefore = state.saunaHp;
    state.enemies = [{
      instanceId: 1,
      archetypeId: 'electric_bather',
      tokenStyleId: 0,
      tile: { q: 0, r: 1 },
      hp: gameContent.enemyArchetypes.electric_bather.maxHp,
      lastHitByDefenderId: null,
      attackReadyAtMs: 999999,
      moveReadyAtMs: 999999,
      nextAbilityAtMs: 0,
      pathIndex: null,
      spawnLaneIndex: 0,
      spawnedByEnemyInstanceId: null
    }];

    state = stepState(state, 16, gameContent);

    expect(state.saunaHp).toBeLessThan(saunaHpBefore);
    expect(state.fxEvents.some((event) => event.kind === 'boss_hit')).toBe(true);
  });

  it('makes the escalation manager open new tickets mid-wave', () => {
    let state = prepState();
    state.phase = 'wave';
    state.pendingSpawns = [];
    state.enemies = [{
      instanceId: 1,
      archetypeId: 'escalation_manager',
      tokenStyleId: 0,
      tile: { q: 3, r: -3 },
      hp: gameContent.enemyArchetypes.escalation_manager.maxHp,
      lastHitByDefenderId: null,
      attackReadyAtMs: 999999,
      moveReadyAtMs: 999999,
      nextAbilityAtMs: 0,
      pathIndex: null,
      spawnLaneIndex: 0,
      spawnedByEnemyInstanceId: null
    }];

    state = stepState(state, 16, gameContent);

    expect(state.pendingSpawns).toHaveLength(3);
    expect(state.pendingSpawns.every((spawn) => spawn.enemyId === 'thirsty_user')).toBe(true);
    expect(state.pendingSpawns.every((spawn) => spawn.spawnedByEnemyInstanceId === 1)).toBe(true);
  });

  it('drops the escalation manager damage reduction when its minions are gone', () => {
    const buildState = (withMinion: boolean) => {
      const state = prepState();
      const defender = state.defenders.find((entry) => entry.location === 'ready')!;
      defender.location = 'board';
      defender.tile = { q: 0, r: -1 };
      defender.homeTile = { q: 0, r: -1 };
      defender.stats.damage = 10;
      defender.attackReadyAtMs = 0;
      state.phase = 'wave';
      state.pendingSpawns = [];
      state.enemies = [{
        instanceId: 1,
        archetypeId: 'escalation_manager',
        tokenStyleId: 0,
        tile: { q: 0, r: 0 },
        hp: gameContent.enemyArchetypes.escalation_manager.maxHp,
        lastHitByDefenderId: null,
        attackReadyAtMs: 999999,
        moveReadyAtMs: 999999,
        nextAbilityAtMs: 999999,
        pathIndex: null,
        spawnLaneIndex: 0,
        spawnedByEnemyInstanceId: null
      }];
      if (withMinion) {
        state.enemies.push({
          instanceId: 2,
          archetypeId: 'thirsty_user',
          tokenStyleId: 0,
          tile: { q: 5, r: -5 },
          hp: gameContent.enemyArchetypes.thirsty_user.maxHp,
          lastHitByDefenderId: null,
          attackReadyAtMs: 999999,
          moveReadyAtMs: 999999,
          nextAbilityAtMs: Number.POSITIVE_INFINITY,
          pathIndex: null,
          spawnLaneIndex: 0,
          spawnedByEnemyInstanceId: 1
        });
      }
      return state;
    };

    const reduced = stepState(buildState(true), 16, gameContent);
    const normal = stepState(buildState(false), 16, gameContent);

    expect(reduced.enemies.find((enemy) => enemy.instanceId === 1)?.hp).toBe(gameContent.enemyArchetypes.escalation_manager.maxHp - 3);
    expect(normal.enemies.find((enemy) => enemy.instanceId === 1)?.hp).toBe(gameContent.enemyArchetypes.escalation_manager.maxHp - 10);
  });

  it('grants combat XP for normal damage hits', () => {
    let state = prepState();
    const defender = state.defenders.find((entry) => entry.location === 'ready')!;
    defender.location = 'board';
    defender.tile = { q: 0, r: -1 };
    defender.homeTile = { q: 0, r: -1 };
    defender.attackReadyAtMs = 0;
    state.phase = 'wave';
    state.pendingSpawns = [];
    state.enemies = [{
      instanceId: 1,
      archetypeId: 'raider',
      tokenStyleId: 0,
      tile: { q: 0, r: 0 },
      hp: gameContent.enemyArchetypes.raider.maxHp,
      lastHitByDefenderId: null,
      attackReadyAtMs: 999999,
      moveReadyAtMs: 999999
    }];

    state = stepState(state, 16, gameContent);

    expect(state.defenders.find((entry) => entry.id === defender.id)?.xp).toBe(1);
  });

  it('tracks defender kills on the unit that landed the finishing blow', () => {
    let state = prepState();
    const defender = state.defenders.find((entry) => entry.location === 'ready')!;
    defender.location = 'board';
    defender.tile = { q: 0, r: -1 };
    defender.homeTile = { q: 0, r: -1 };
    defender.stats.damage = 99;
    defender.attackReadyAtMs = 0;
    state.phase = 'wave';
    state.pendingSpawns = [];
    state.enemies = [{
      instanceId: 1,
      archetypeId: 'raider',
      tokenStyleId: 0,
      tile: { q: 0, r: 0 },
      hp: 8,
      lastHitByDefenderId: null,
      attackReadyAtMs: 999999,
      moveReadyAtMs: 999999
    }];

    state = stepState(state, 16, gameContent);

    expect(state.defenders.find((entry) => entry.id === defender.id)?.kills).toBe(1);
  });

  it('still grants combat XP for healing actions', () => {
    let state = prepState();
    const readyDefenders = state.defenders.filter((entry) => entry.location === 'ready');
    const mender = readyDefenders.find((entry) => entry.templateId === 'mender')!;
    const ally = readyDefenders.find((entry) => entry.id !== mender.id)!;
    mender.location = 'board';
    mender.tile = { q: 0, r: -1 };
    mender.homeTile = { q: 0, r: -1 };
    mender.attackReadyAtMs = 0;
    ally.location = 'board';
    ally.tile = { q: 1, r: -1 };
    ally.homeTile = { q: 1, r: -1 };
    ally.hp = Math.max(1, ally.hp - 4);
    ally.attackReadyAtMs = 999999;
    state.phase = 'wave';
    state.pendingSpawns = [];
    state.enemies = [];

    state = stepState(state, 16, gameContent);

    expect(state.defenders.find((entry) => entry.id === mender.id)?.xp).toBe(1);
  });

  it('surfaces the boss name and hint in the HUD for boss waves', () => {
    const state = prepState();
    state.currentWave = createWaveDefinition(5, gameContent);

    const snapshot = createSnapshot(state, gameContent);

    expect(snapshot.hud.bossName).toBe('Pebble');
    expect(snapshot.hud.nextWavePattern).toBe('Pebble');
    expect(snapshot.hud.bossHint).toContain('Ignores heroes');
  });

  it('lets the player pick a board defender directly from the canvas', () => {
    const state = prepState();
    const defender = state.defenders.find((entry) => entry.location === 'ready')!;
    defender.location = 'board';
    defender.tile = { q: 0, r: -1 };
    defender.homeTile = { q: 0, r: -1 };

    const snapshot = createSnapshot(state, gameContent);
    const rect = { left: 0, top: 0, width: 900, height: 700 } as DOMRect;
    const point = getTileViewportPosition(snapshot, rect.width, rect.height, defender.tile!);

    expect(pickDefenderAtCanvasPoint(snapshot, rect, point.x, point.y)).toBe(defender.id);
  });

  it('selects an enemy and clears previous defender or sauna selection', () => {
    let state = prepState();
    const defender = state.defenders.find((entry) => entry.location !== 'dead')!;
    state.selectedDefenderId = defender.id;
    state.selectedMapTarget = 'defender';
    state.enemies = [{
      instanceId: 11,
      archetypeId: 'raider',
      tokenStyleId: 0,
      tile: { q: 0, r: -2 },
      hp: gameContent.enemyArchetypes.raider.maxHp,
      lastHitByDefenderId: null,
      attackReadyAtMs: 999999,
      moveReadyAtMs: 999999
    }];

    state = applyAction(state, { type: 'selectEnemy', enemyInstanceId: 11 }, gameContent);

    expect(state.selectedMapTarget).toBe('enemy');
    expect(state.selectedEnemyInstanceId).toBe(11);
    expect(state.selectedDefenderId).toBeNull();

    state = applyAction(state, { type: 'selectSauna' }, gameContent);
    expect(state.selectedMapTarget).toBe('sauna');
    expect(state.selectedEnemyInstanceId).toBeNull();
  });

  it('clears enemy selection through clearSelection', () => {
    let state = prepState();
    state.selectedMapTarget = 'enemy';
    state.selectedEnemyInstanceId = 7;

    state = applyAction(state, { type: 'clearSelection' }, gameContent);

    expect(state.selectedMapTarget).toBeNull();
    expect(state.selectedEnemyInstanceId).toBeNull();
    expect(state.selectedDefenderId).toBeNull();
  });

  it('surfaces selected enemy stats, description and lore in the HUD snapshot', () => {
    const state = prepState();
    state.selectedMapTarget = 'enemy';
    state.selectedEnemyInstanceId = 2;
    state.enemies = [{
      instanceId: 2,
      archetypeId: 'brute',
      tokenStyleId: 0,
      tile: { q: 1, r: -2 },
      hp: 17,
      lastHitByDefenderId: null,
      attackReadyAtMs: 999999,
      moveReadyAtMs: 999999
    }];

    const snapshot = createSnapshot(state, gameContent);

    expect(snapshot.hud.selectedEnemy?.instanceId).toBe(2);
    expect(snapshot.hud.selectedEnemy?.name).toBe(gameContent.enemyArchetypes.brute.name);
    expect(snapshot.hud.selectedEnemy?.description).toBe(gameContent.enemyArchetypes.brute.description);
    expect(snapshot.hud.selectedEnemy?.lore).toBe(gameContent.enemyArchetypes.brute.lore);
    expect(snapshot.hud.selectedEnemy?.hp).toBe(17);
    expect(snapshot.hud.selectedEnemy?.maxHp).toBe(gameContent.enemyArchetypes.brute.maxHp);
    expect(snapshot.hud.selectedEnemy?.behaviorLabel).toBe('Rushes the nearest hero');
  });

  it('clears selected enemy data when that enemy dies', () => {
    let state = prepState();
    const defender = state.defenders.find((entry) => entry.location === 'ready')!;
    defender.location = 'board';
    defender.tile = { q: 0, r: -1 };
    defender.homeTile = { q: 0, r: -1 };
    defender.stats.damage = 99;
    defender.attackReadyAtMs = 0;
    state.phase = 'wave';
    state.pendingSpawns = [];
    state.selectedMapTarget = 'enemy';
    state.selectedEnemyInstanceId = 1;
    state.enemies = [{
      instanceId: 1,
      archetypeId: 'raider',
      tokenStyleId: 0,
      tile: { q: 0, r: 0 },
      hp: 8,
      lastHitByDefenderId: null,
      attackReadyAtMs: 999999,
      moveReadyAtMs: 999999
    }];

    state = stepState(state, 16, gameContent);

    expect(state.selectedEnemyInstanceId).toBeNull();
    expect(state.selectedMapTarget).toBeNull();
    expect(createSnapshot(state, gameContent).hud.selectedEnemy).toBeNull();
  });

  it('flags boss enemies correctly in selected-enemy HUD data', () => {
    const state = prepState();
    state.currentWave = createWaveDefinition(15, gameContent);
    state.selectedMapTarget = 'enemy';
    state.selectedEnemyInstanceId = 4;
    state.enemies = [{
      instanceId: 4,
      archetypeId: 'electric_bather',
      tokenStyleId: 0,
      tile: { q: 2, r: -2 },
      hp: gameContent.enemyArchetypes.electric_bather.maxHp,
      lastHitByDefenderId: null,
      attackReadyAtMs: 999999,
      moveReadyAtMs: 999999,
      nextAbilityAtMs: 0
    }];

    const snapshot = createSnapshot(state, gameContent);

    expect(snapshot.hud.selectedEnemy?.isBoss).toBe(true);
    expect(snapshot.hud.selectedEnemy?.bossLabel).toBe('Boss');
    expect(snapshot.hud.actionTitle).toBe('Boss Profile');
  });

  it('surfaces defender kill counts in roster and selected-hero HUD data', () => {
    const state = prepState();
    const defender = state.defenders.find((entry) => entry.location === 'ready')!;
    defender.kills = 7;
    state.selectedDefenderId = defender.id;

    const snapshot = createSnapshot(state, gameContent);

    expect(snapshot.hud.rosterEntries.find((entry) => entry.id === defender.id)?.kills).toBe(7);
    expect(snapshot.hud.selectedDefender?.kills).toBe(7);
  });

  it('autoplay starts the next wave after the boss reward draft resolves', () => {
    let state = prepState();
    const defender = state.defenders.find((entry) => entry.location === 'ready')!;
    defender.location = 'board';
    defender.tile = { q: 0, r: -1 };
    defender.homeTile = { q: 0, r: -1 };
    state.currentWave = createWaveDefinition(6, gameContent);
    state.phase = 'prep';
    state.overlayMode = 'modifier_draft';
    state.globalModifierDraftOffers = ['shared_grit'];
    state.autoplayEnabled = true;

    state = applyAction(state, { type: 'draftGlobalModifier', modifierId: 'shared_grit' }, gameContent);
    expect(state.phase).toBe('prep');
    expect(state.overlayMode).toBe('none');

    state = stepState(state, 640, gameContent);
    expect(state.phase).toBe('prep');

    state = stepState(state, 20, gameContent);
    expect(state.phase).toBe('wave');
    expect(state.currentWave.index).toBe(6);
  });

  it('creates a named starter roster with one sauna defender', () => {
    const state = prepState();

    expect(state.defenders).toHaveLength(gameContent.config.baseRosterCap);
    expect(state.defenders.filter((defender) => defender.location === 'sauna')).toHaveLength(1);
    expect(state.defenders.every((defender) => defender.name.length > 0)).toBe(true);
    expect(state.defenders.every((defender) => defender.lore.length > 0)).toBe(true);
    expect(state.defenders.every((defender) => defender.level === 1)).toBe(true);
    expect(state.defenders.every((defender) => defender.subclassIds.length === 0)).toBe(true);
  });

  it('expands the starter roster when More Weirdos is owned', () => {
    const meta = createDefaultMetaProgress();
    meta.upgrades.roster_capacity = 1;

    const state = createInitialState(gameContent, meta, 42);

    expect(state.defenders).toHaveLength(gameContent.config.baseRosterCap);
    expect(state.defenders.filter((defender) => defender.location === 'sauna')).toHaveLength(1);
    const snapshot = createSnapshot(state, gameContent);
    expect(snapshot.hud.rosterCap).toBe(gameContent.config.baseRosterCap + 1);
    expect(snapshot.hud.boardCap).toBe(gameContent.config.boardCap + 1);
  });

  it('opens the meta shop before a fresh run when requested', () => {
    const state = createInitialState(gameContent, createDefaultMetaProgress(), 42);

    expect(state.overlayMode).toBe('none');
    expect(state.phase).toBe('prep');
  });

  it('does not open intermission on boot even if previous runs exist in meta', () => {
    const meta = createDefaultMetaProgress();
    meta.completedRuns = 3;
    meta.shopUnlocked = true;
    meta.steam = 11;

    const state = createInitialState(gameContent, meta, 42);

    expect(state.overlayMode).toBe('none');
    expect(state.phase).toBe('prep');
  });

  it('shows intro when requested and lets the player close it', () => {
    let state = createInitialState(gameContent, createDefaultMetaProgress(), 42, false, true);

    expect(state.introOpen).toBe(true);

    state = applyAction(state, { type: 'closeIntro' }, gameContent);
    expect(state.introOpen).toBe(false);

    state = applyAction(state, { type: 'openIntro' }, gameContent);
    expect(state.introOpen).toBe(true);
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

  it('lets More Weirdos increase the number of defenders that fit on the board', () => {
    const meta = createDefaultMetaProgress();
    meta.upgrades.roster_capacity = 1;
    let state = createInitialState(gameContent, meta, 42);
    const deployable = state.defenders.filter((defender) => defender.location === 'ready' || defender.location === 'sauna');

    for (let index = 0; index < 5; index += 1) {
      state = applyAction(state, { type: 'selectDefender', defenderId: deployable[index].id }, gameContent);
      state = applyAction(
        state,
        { type: 'placeSelectedDefender', tile: { q: index - 2, r: -2 } },
        gameContent
      );
    }

    expect(state.defenders.filter((defender) => defender.location === 'board')).toHaveLength(5);
    expect(state.message).not.toContain('Board cap');
  });

  it('moves a bench reserve into the sauna when the board becomes full and the sauna is empty', () => {
    let state = prepState();
    const ready = state.defenders.filter((defender) => defender.location === 'ready');
    const saunaDefender = state.defenders.find((defender) => defender.location === 'sauna');
    expect(ready).toHaveLength(4);
    expect(saunaDefender).toBeTruthy();

    state = applyAction(state, { type: 'selectDefender', defenderId: ready[0].id }, gameContent);
    state = applyAction(state, { type: 'placeSelectedDefender', tile: { q: -1, r: -2 } }, gameContent);
    state = applyAction(state, { type: 'selectDefender', defenderId: ready[1].id }, gameContent);
    state = applyAction(state, { type: 'placeSelectedDefender', tile: { q: 0, r: -2 } }, gameContent);
    state = applyAction(state, { type: 'selectDefender', defenderId: ready[2].id }, gameContent);
    state = applyAction(state, { type: 'placeSelectedDefender', tile: { q: 1, r: -2 } }, gameContent);
    state = applyAction(state, { type: 'selectDefender', defenderId: saunaDefender!.id }, gameContent);
    state = applyAction(state, { type: 'placeSelectedDefender', tile: { q: 0, r: -1 } }, gameContent);

    const movedReserve = state.defenders.find((defender) => defender.location === 'sauna');
    expect(state.defenders.filter((defender) => defender.location === 'board')).toHaveLength(4);
    expect(movedReserve).toBeTruthy();
    expect(movedReserve?.id).toBe(ready[3].id);
    expect(state.saunaDefenderId).toBe(ready[3].id);
  });

  it('heals the sauna defender and auto-continues to the next non-boss wave', () => {
    let state = prepState();
    const saunaDefender = state.defenders.find((defender) => defender.location === 'sauna');
    expect(saunaDefender).toBeTruthy();
    saunaDefender!.hp = 1;
    state.phase = 'wave';
    state.currentWave = { index: 1, isBoss: false, rewardSisu: 3, pressure: 4, pattern: 'tutorial', bossId: null, bossCategory: null, spawns: [] };
    state.pendingSpawns = [];
    state.enemies = [];

    const next = stepState(state, 16, gameContent);
    const healed = next.defenders.find((defender) => defender.id === saunaDefender!.id);

    expect(next.phase).toBe('wave');
    expect(next.currentWave.index).toBe(2);
    expect(next.pendingSpawns.length).toBeGreaterThan(0);
    expect(healed?.hp).toBeGreaterThan(1);
    expect(next.steamEarned).toBe(1);
  });

  it('selects the sauna separately and exposes its popup data', () => {
    let state = prepState();
    state = applyAction(state, { type: 'selectSauna' }, gameContent);

    const snapshot = createSnapshot(state, gameContent);

    expect(snapshot.hud.saunaSelected).toBe(true);
    expect(snapshot.hud.selectedSauna?.occupancyLabel).toBe('1/1');
    expect(snapshot.hud.selectedSauna?.occupantName).toBeTruthy();
  });

  it('allows placing a ready defender during an active wave', () => {
    let state = prepState();
    const ready = state.defenders.find((defender) => defender.location === 'ready');
    expect(ready).toBeTruthy();
    state.phase = 'wave';

    state = applyAction(state, { type: 'selectDefender', defenderId: ready!.id }, gameContent);
    state = applyAction(state, { type: 'placeSelectedDefender', tile: { q: 0, r: -2 } }, gameContent);

    const placed = state.defenders.find((defender) => defender.id === ready!.id);
    expect(placed?.location).toBe('board');
    expect(placed?.tile).toEqual({ q: 0, r: -2 });
  });

  it('makes Spin 2 Win hit every enemy within one tile for full damage', () => {
    let state = prepState();
    const spinner = state.defenders.find((defender) => defender.location === 'ready');
    expect(spinner).toBeTruthy();

    state = applyAction(state, { type: 'selectDefender', defenderId: spinner!.id }, gameContent);
    state = applyAction(state, { type: 'placeSelectedDefender', tile: { q: 0, r: -1 } }, gameContent);

    const boardSpinner = state.defenders.find((defender) => defender.id === spinner!.id)!;
    boardSpinner.skills.push('spin2win');
    boardSpinner.stats.damage = 6;
    boardSpinner.attackReadyAtMs = 0;
    state.phase = 'wave';
    state.pendingSpawns = [];
    state.enemies = [
      {
        instanceId: 1,
        archetypeId: 'raider',
        tokenStyleId: 0,
        tile: { q: 0, r: 0 },
        hp: 5,
        lastHitByDefenderId: null,
        attackReadyAtMs: 999999,
        moveReadyAtMs: 999999
      },
      {
        instanceId: 2,
        archetypeId: 'raider',
        tokenStyleId: 0,
        tile: { q: 1, r: -1 },
        hp: 5,
        lastHitByDefenderId: null,
        attackReadyAtMs: 999999,
        moveReadyAtMs: 999999
      },
      {
        instanceId: 3,
        archetypeId: 'raider',
        tokenStyleId: 0,
        tile: { q: -1, r: 0 },
        hp: 5,
        lastHitByDefenderId: null,
        attackReadyAtMs: 999999,
        moveReadyAtMs: 999999
      },
      {
        instanceId: 4,
        archetypeId: 'raider',
        tokenStyleId: 0,
        tile: { q: 3, r: -1 },
        hp: 9,
        lastHitByDefenderId: null,
        attackReadyAtMs: 999999,
        moveReadyAtMs: 999999
      }
    ];

    state = stepState(state, 16, gameContent);

    expect(state.enemies).toHaveLength(1);
    expect(state.enemies[0].instanceId).toBe(4);
    expect(state.defenders.find((defender) => defender.id === spinner!.id)?.kills).toBe(3);
  });

  it('makes Blink Step retreat to the hero home tile under half health', () => {
    let state = prepState();
    const blinker = state.defenders.find((defender) => defender.location === 'ready');
    expect(blinker).toBeTruthy();

    state = applyAction(state, { type: 'selectDefender', defenderId: blinker!.id }, gameContent);
    state = applyAction(state, { type: 'placeSelectedDefender', tile: { q: 0, r: -2 } }, gameContent);

    const boardBlinker = state.defenders.find((defender) => defender.id === blinker!.id)!;
    boardBlinker.skills.push('blink_step');
    boardBlinker.tile = { q: 1, r: -1 };
    boardBlinker.hp = Math.floor(boardBlinker.hp * 0.5);
    boardBlinker.attackReadyAtMs = 0;
    state.phase = 'wave';
    state.pendingSpawns = [];
    state.enemies = [
      {
        instanceId: 1,
        archetypeId: 'raider',
        tokenStyleId: 0,
        tile: { q: 4, r: -2 },
        hp: 9,
        lastHitByDefenderId: null,
        attackReadyAtMs: 999999,
        moveReadyAtMs: 999999
      }
    ];

    state = stepState(state, 16, gameContent);

    const updated = state.defenders.find((defender) => defender.id === blinker!.id)!;
    expect(updated.tile).toEqual({ q: 0, r: -2 });
    expect(updated.homeTile).toEqual({ q: 0, r: -2 });
    expect(updated.blinkReadyAtMs).toBeGreaterThan(state.timeMs);
  });

  it('does not retreat Blink Step to an occupied home tile', () => {
    let state = prepState();
    const blinker = state.defenders.find((defender) => defender.location === 'ready');
    expect(blinker).toBeTruthy();

    state = applyAction(state, { type: 'selectDefender', defenderId: blinker!.id }, gameContent);
    state = applyAction(state, { type: 'placeSelectedDefender', tile: { q: 0, r: -2 } }, gameContent);

    const blocker = state.defenders.filter((defender) => defender.location === 'ready')[0];
    expect(blocker).toBeTruthy();
    blocker!.location = 'board';
    blocker!.tile = { q: 0, r: -2 };
    blocker!.homeTile = { q: 0, r: -2 };
    blocker!.attackReadyAtMs = 999999;

    const boardBlinker = state.defenders.find((defender) => defender.id === blinker!.id)!;
    boardBlinker.skills.push('blink_step');
    boardBlinker.tile = { q: 1, r: -1 };
    boardBlinker.hp = Math.floor(boardBlinker.hp * 0.5);
    boardBlinker.attackReadyAtMs = 0;
    state.phase = 'wave';
    state.pendingSpawns = [];
    state.enemies = [
      {
        instanceId: 1,
        archetypeId: 'raider',
        tokenStyleId: 0,
        tile: { q: 3, r: -1 },
        hp: 9,
        lastHitByDefenderId: null,
        attackReadyAtMs: 999999,
        moveReadyAtMs: 999999
      }
    ];

    state = stepState(state, 16, gameContent);

    const updated = state.defenders.find((defender) => defender.id === blinker!.id)!;
    expect(updated.tile).not.toEqual({ q: 0, r: -2 });
    expect(updated.blinkReadyAtMs).toBe(0);
  });

  it('resets Blink Step cooldown on kill', () => {
    let state = prepState();
    const blinker = state.defenders.find((defender) => defender.location === 'ready');
    expect(blinker).toBeTruthy();

    state = applyAction(state, { type: 'selectDefender', defenderId: blinker!.id }, gameContent);
    state = applyAction(state, { type: 'placeSelectedDefender', tile: { q: 0, r: -1 } }, gameContent);

    const boardBlinker = state.defenders.find((defender) => defender.id === blinker!.id)!;
    boardBlinker.skills.push('blink_step');
    boardBlinker.stats.damage = 6;
    boardBlinker.attackReadyAtMs = 0;
    boardBlinker.blinkReadyAtMs = 999999;
    state.phase = 'wave';
    state.pendingSpawns = [];
    state.enemies = [
      {
        instanceId: 1,
        archetypeId: 'raider',
        tokenStyleId: 0,
        tile: { q: 0, r: 0 },
        hp: 1,
        lastHitByDefenderId: null,
        attackReadyAtMs: 999999,
        moveReadyAtMs: 999999
      }
    ];

    state = stepState(state, 16, gameContent);

    const updated = state.defenders.find((defender) => defender.id === blinker!.id)!;
    expect(updated.kills).toBe(1);
    expect(updated.blinkReadyAtMs).toBe(state.timeMs);
  });

  it('freezes combat timers while paused', () => {
    let state = prepState();
    state.phase = 'wave';
    state.overlayMode = 'paused';
    state.pendingSpawns = [{ atMs: 0, enemyId: 'raider', laneIndex: 0 }];

    const next = stepState(state, 500, gameContent);

    expect(next).toEqual(state);
  });

  it('stops for prep when the next wave is a boss wave', () => {
    let state = prepState();
    state.phase = 'wave';
    state.waveIndex = 4;
    state.currentWave = { index: 4, isBoss: false, rewardSisu: 3, pressure: 11, pattern: 'staggered', bossId: null, bossCategory: null, spawns: [] };
    state.pendingSpawns = [];
    state.enemies = [];

    const next = stepState(state, 16, gameContent);

    expect(next.phase).toBe('prep');
    expect(next.currentWave.index).toBe(5);
    expect(next.currentWave.isBoss).toBe(true);
  });

  it('rerolls three visible recruit offers for a fixed 2 SISU with prices and lore', () => {
    let state = prepState();
    state.defenders = state.defenders.filter((defender) => defender.location !== 'dead').slice(0, 4);
    state.saunaDefenderId = state.defenders.find((defender) => defender.location === 'sauna')?.id ?? null;
    state.sisu.current = 20;

    const before = state.sisu.current;
    state = applyAction(state, { type: 'rerollRecruitOffers' }, gameContent);

    expect(state.recruitOffers).toHaveLength(3);
    expect(state.sisu.current).toBe(before - 2);
    expect(state.recruitOffers.every((offer) => offer.price >= 3)).toBe(true);
    expect(state.recruitOffers.every((offer) => offer.candidate.lore.length > 0)).toBe(true);
  });

  it('rerolls a bench hero identity and base stats without touching progression or loadout', () => {
    let state = prepState();
    const defender = state.defenders.find((entry) => entry.location === 'ready');
    expect(defender).toBeTruthy();

    defender!.name = 'Before';
    defender!.title = 'Old Title';
    defender!.lore = 'Old lore';
    defender!.stats = {
      maxHp: 99,
      damage: 99,
      heal: 99,
      range: 9,
      attackCooldownMs: 999,
      defense: 4,
      regenHpPerSecond: 4
    };
    defender!.hp = 77;
    defender!.level = 7;
    defender!.xp = 70;
    defender!.subclassIds = ['stonewall'];
    defender!.items = ['iron_whisk'];
    defender!.skills = ['steam_shield'];
    defender!.kills = 3;
    state.sisu.current = 10;

    state = applyAction(state, { type: 'rerollBenchDefender', defenderId: defender!.id }, gameContent);

    const updated = state.defenders.find((entry) => entry.id === defender!.id)!;
    expect(updated.name).not.toBe('Before');
    expect(updated.title).not.toBe('Old Title');
    expect(updated.lore).not.toBe('Old lore');
    expect(updated.stats.maxHp).not.toBe(99);
    expect(updated.level).toBe(7);
    expect(updated.xp).toBe(70);
    expect(updated.subclassIds).toEqual(['stonewall']);
    expect(updated.items).toEqual(['iron_whisk']);
    expect(updated.skills).toEqual(['steam_shield']);
    expect(updated.kills).toBe(3);
    expect(state.benchRerollCountsByDefenderId[defender!.id]).toBe(1);
    expect(updated.hp).toBeLessThanOrEqual(createSnapshot(state, gameContent).hud.rosterEntries.find((entry) => entry.id === defender!.id)!.maxHp);
  });

  it('does not reroll a non-bench hero', () => {
    let state = prepState();
    const defender = state.defenders.find((entry) => entry.location === 'sauna');
    expect(defender).toBeTruthy();
    const before = JSON.parse(JSON.stringify(state));

    state = applyAction(state, { type: 'rerollBenchDefender', defenderId: defender!.id }, gameContent);

    expect(state).toEqual(before);
  });

  it('rerolls one recruit offer in place and tracks per-offer reroll cost', () => {
    let state = prepState();
    state.sisu.current = 20;
    state = applyAction(state, { type: 'rerollRecruitOffers' }, gameContent);
    const offer = state.recruitOffers[0];

    offer.candidate.name = 'Before';
    offer.candidate.title = 'Old Title';
    offer.candidate.lore = 'Old lore';
    offer.candidate.stats = {
      maxHp: 99,
      damage: 99,
      heal: 99,
      range: 9,
      attackCooldownMs: 999,
      defense: 4,
      regenHpPerSecond: 4
    };
    offer.price = 17;
    offer.quality = 'elite';

    state = applyAction(state, { type: 'rerollRecruitOffer', offerId: offer.offerId }, gameContent);

    const updated = state.recruitOffers.find((entry) => entry.offerId === offer.offerId)!;
    expect(updated.offerId).toBe(offer.offerId);
    expect(updated.candidate.templateId).toBe(offer.candidate.templateId);
    expect(updated.candidate.level).toBe(offer.candidate.level);
    expect(updated.candidate.name).not.toBe('Before');
    expect(updated.candidate.title).not.toBe('Old Title');
    expect(updated.candidate.lore).not.toBe('Old lore');
    expect(updated.price).not.toBe(17);
    expect(state.recruitRerollCountsByOfferId[offer.offerId]).toBe(1);
    expect(createSnapshot(state, gameContent).hud.recruitOffers.find((entry) => entry.id === offer.offerId)?.rerollCost).toBe(2);
  });

  it('resets per-offer reroll counters when the whole market rerolls', () => {
    let state = prepState();
    state.sisu.current = 20;
    state = applyAction(state, { type: 'rerollRecruitOffers' }, gameContent);
    const offerId = state.recruitOffers[0].offerId;

    state = applyAction(state, { type: 'rerollRecruitOffer', offerId }, gameContent);
    state = applyAction(state, { type: 'rerollRecruitOffers' }, gameContent);

    expect(state.recruitOffers).toHaveLength(3);
    expect(Object.values(state.recruitRerollCountsByOfferId).every((count) => count === 0)).toBe(true);
    expect(state.recruitOffers.every((offer) => offer.offerId !== offerId)).toBe(true);
  });

  it('recruits one chosen offer and clears the rest', () => {
    let state = prepState();
    state.defenders = state.defenders.filter((defender) => defender.location !== 'dead').slice(0, 4);
    state.saunaDefenderId = state.defenders.find((defender) => defender.location === 'sauna')?.id ?? null;
    state.sisu.current = 30;

    state = applyAction(state, { type: 'rerollRecruitOffers' }, gameContent);
    const offer = state.recruitOffers[1];
    const rosterBefore = state.defenders.length;

    state = applyAction(state, { type: 'recruitOffer', offerId: offer.offerId }, gameContent);

    expect(state.defenders).toHaveLength(rosterBefore + 1);
    expect(state.defenders.some((defender) => defender.id === offer.candidate.id)).toBe(true);
    expect(state.recruitOffers).toHaveLength(0);
  });

  it('still rerolls recruit offers when the roster is full', () => {
    let state = prepState();
    state.sisu.current = 30;

    state = applyAction(state, { type: 'rerollRecruitOffers' }, gameContent);

    expect(state.recruitOffers).toHaveLength(3);
  });

  it('lets a new recruit join the bench even when the board is full if the roster still has space', () => {
    let state = prepState();
    state.meta.upgrades.roster_capacity = 1;
    state.sisu.current = 30;
    state.saunaDefenderId = null;

    const living = state.defenders.filter((defender) => defender.location !== 'dead');
    const boardTiles = [
      { q: 0, r: -1 },
      { q: 1, r: -1 },
      { q: -1, r: 0 },
      { q: 1, r: 0 },
      { q: 0, r: 1 }
    ];
    living.forEach((defender, index) => {
      defender.location = 'board';
      defender.tile = boardTiles[index] ?? boardTiles[0];
    });

    state = applyAction(state, { type: 'rerollRecruitOffers' }, gameContent);
    const offer = state.recruitOffers[0];

    state = applyAction(state, { type: 'recruitOffer', offerId: offer.offerId }, gameContent);

    const recruit = state.defenders.find((defender) => defender.id === offer.candidate.id);
    expect(recruit?.location).toBe('ready');
    expect(state.saunaDefenderId).toBeNull();
  });

  it('uses the scaling recruitment level up costs and keeps current offers unchanged', () => {
    let state = prepState();
    state.sisu.current = 40;
    const costs: number[] = [];

    state = applyAction(state, { type: 'rerollRecruitOffers' }, gameContent);
    const beforeOfferIds = state.recruitOffers.map((offer) => offer.offerId);
    const beforeOfferLevels = state.recruitOffers.map((offer) => offer.candidate.level);

    for (let index = 0; index < 4; index += 1) {
      const snapshot = createSnapshot(state, gameContent);
      costs.push(snapshot.hud.recruitLevelUpCost);
      state = applyAction(state, { type: 'levelUpRecruitment' }, gameContent);
    }

    expect(costs).toEqual([2, 4, 7, 11]);
    expect(state.recruitLevelBonus).toBe(4);
    expect(state.recruitOffers.map((offer) => offer.offerId)).toEqual(beforeOfferIds);
    expect(state.recruitOffers.map((offer) => offer.candidate.level)).toEqual(beforeOfferLevels);
  });

  it('rolls higher starting levels after recruitment level ups', () => {
    let baseState = prepState();
    baseState.sisu.current = 20;
    baseState.seed = 12345;

    let leveledState = prepState();
    leveledState.sisu.current = 20;
    leveledState.seed = 12345;
    leveledState.recruitLevelBonus = 6;
    leveledState.recruitLevelUpCount = 3;

    baseState = applyAction(baseState, { type: 'rerollRecruitOffers' }, gameContent);
    leveledState = applyAction(leveledState, { type: 'rerollRecruitOffers' }, gameContent);

    const baseBestLevel = Math.max(...baseState.recruitOffers.map((offer) => offer.candidate.level));
    const leveledBestLevel = Math.max(...leveledState.recruitOffers.map((offer) => offer.candidate.level));

    expect(leveledBestLevel).toBeGreaterThan(baseBestLevel);
  });

  it('prices equal recruit rolls the same regardless of the current wave', () => {
    let first = prepState();
    first.sisu.current = 20;
    first.seed = 2026;

    let second = prepState();
    second.sisu.current = 20;
    second.seed = 2026;
    second.waveIndex = 9;
    second.currentWave = createWaveDefinition(9, gameContent);

    first = applyAction(first, { type: 'rerollRecruitOffers' }, gameContent);
    second = applyAction(second, { type: 'rerollRecruitOffers' }, gameContent);

    expect(first.recruitOffers.map((offer) => offer.price)).toEqual(second.recruitOffers.map((offer) => offer.price));
    expect(first.recruitOffers.map((offer) => offer.candidate.level)).toEqual(second.recruitOffers.map((offer) => offer.candidate.level));
    expect(first.recruitOffers.map((offer) => offer.candidate.stats)).toEqual(second.recruitOffers.map((offer) => offer.candidate.stats));
  });

  it('marks every fifth wave as a boss wave', () => {
    const state = prepState();
    state.waveIndex = 5;
    state.currentWave = {
      index: 5,
      isBoss: true,
      rewardSisu: 7,
      pressure: 18,
      pattern: 'boss_breach',
      bossId: 'pebble',
      bossCategory: 'breach',
      spawns: [{ atMs: 0, enemyId: 'pebble', laneIndex: 0 }]
    };

    const snapshot = createSnapshot(state, gameContent);
    expect(snapshot.hud.isBossWave).toBe(true);
    expect(snapshot.hud.wavePreview[0].id).toBe('pebble');
  });

  it('uses different boss identities and spawn shapes across cycles', () => {
    const firstBoss = createWaveDefinition(5, gameContent);
    const secondBoss = createWaveDefinition(10, gameContent);

    expect(firstBoss.bossId).toBe('pebble');
    expect(secondBoss.bossId).toBe('end_user_horde');
    expect(firstBoss.pattern).toBe('boss_breach');
    expect(secondBoss.pattern).toBe('boss_pressure');
    expect(firstBoss.spawns.map((spawn) => spawn.laneIndex)).not.toEqual(secondBoss.spawns.map((spawn) => spawn.laneIndex));
  });

  it('surfaces pressure warnings when the run is getting unstable', () => {
    const state = prepState();
    state.phase = 'wave';
    state.waveIndex = 4;
    state.currentWave = createWaveDefinition(4, gameContent);
    state.sisu.current = 2;
    state.saunaHp = 18;
    const board = state.defenders.filter((defender) => defender.location !== 'dead').slice(0, 2);
    for (const defender of state.defenders) {
      if (board.some((entry) => entry.id === defender.id)) {
        defender.location = 'board';
      } else if (defender.location !== 'sauna') {
        defender.location = 'ready';
        defender.tile = null;
      }
      defender.hp = Math.min(defender.hp, Math.max(4, Math.floor(defender.hp * 0.4)));
    }

    const snapshot = createSnapshot(state, gameContent);

    expect(snapshot.hud.pressureSignals).toContain('Boss in 1 wave');
    expect(snapshot.hud.pressureSignals).toContain('SISU low');
    expect(snapshot.hud.pressureSignals).toContain('Sauna under pressure');
    expect(snapshot.hud.pressureSignals).toContain('Roster fragile');
  });

  it('lets the player buy a meta upgrade after losing', () => {
    let state = prepState();
    state.phase = 'lost';
    state.overlayMode = 'intermission';
    state.steamEarned = 8;
    state.meta.steam = 8;
    state.meta.shopUnlocked = true;

    const beforePurchase = state.meta.steam + state.steamEarned;
    state = applyAction(state, { type: 'buyMetaUpgrade', upgradeId: 'inventory_slots' }, gameContent);

    expect(state.meta.steam).toBeLessThan(beforePurchase);
    expect(state.meta.upgrades.inventory_slots).toBe(1);
  });

  it('applies More Weirdos to the next run after buying it in the metashop', () => {
    let state = prepState();
    state.phase = 'lost';
    state.overlayMode = 'intermission';
    state.steamEarned = 8;
    state.meta.steam = 8;
    state.meta.shopUnlocked = true;

    state = applyAction(state, { type: 'buyMetaUpgrade', upgradeId: 'roster_capacity' }, gameContent);
    state = applyAction(state, { type: 'startNextRun' }, gameContent);

    expect(state.meta.upgrades.roster_capacity).toBe(1);
    expect(state.defenders).toHaveLength(gameContent.config.baseRosterCap);
    expect(state.defenders.filter((defender) => defender.location === 'sauna')).toHaveLength(1);
    const snapshot = createSnapshot(state, gameContent);
    expect(snapshot.hud.rosterCap).toBe(gameContent.config.baseRosterCap + 1);
    expect(snapshot.hud.boardCap).toBe(gameContent.config.boardCap + 1);
  });

  it('auto deploys the sauna defender when a board defender dies', () => {
    let state = prepState();
    const boardDefender = state.defenders.find((defender) => defender.location === 'ready');
    const saunaDefender = state.defenders.find((defender) => defender.location === 'sauna');
    expect(boardDefender).toBeTruthy();
    expect(saunaDefender).toBeTruthy();

    boardDefender!.location = 'board';
    boardDefender!.tile = { q: 0, r: -1 };
    boardDefender!.hp = 4;
    boardDefender!.attackReadyAtMs = 999999;
    state.meta.upgrades.sauna_auto_deploy = 1;
    state.phase = 'wave';
    state.enemies = [{
      instanceId: 1,
      archetypeId: 'brute',
      tokenStyleId: 0,
      tile: { q: 0, r: -2 },
      hp: 22,
      lastHitByDefenderId: null,
      attackReadyAtMs: 0,
      moveReadyAtMs: 999999
    }];
    state.pendingSpawns = [];

    state = stepState(state, 16, gameContent);

    const boardAfter = state.defenders.find((defender) => defender.id === boardDefender!.id);
    const saunaAfter = state.defenders.find((defender) => defender.id === saunaDefender!.id);
    expect(boardAfter?.location).toBe('dead');
    expect(saunaAfter?.location).toBe('board');
    expect(saunaAfter?.tile).toEqual({ q: 0, r: -1 });
    expect(state.saunaDefenderId).toBeNull();
    expect(state.deathLog).toHaveLength(1);
    expect(state.deathLog[0].wave).toBe(state.currentWave.index);
    expect(state.deathLog[0].enemyName).toBe('Stone Brute');
  });

  it('uses lapystavaihto once per wave when a board defender drops low', () => {
    let state = prepState();
    const boardDefender = state.defenders.find((defender) => defender.location === 'ready');
    const saunaDefender = state.defenders.find((defender) => defender.location === 'sauna');
    expect(boardDefender).toBeTruthy();
    expect(saunaDefender).toBeTruthy();

    boardDefender!.location = 'board';
    boardDefender!.tile = { q: 0, r: -1 };
    boardDefender!.hp = 11;
    boardDefender!.attackReadyAtMs = 999999;
    state.meta.upgrades.sauna_slap_swap = 1;
    state.phase = 'wave';
    state.enemies = [{
      instanceId: 1,
      archetypeId: 'brute',
      tokenStyleId: 0,
      tile: { q: 0, r: -2 },
      hp: 22,
      lastHitByDefenderId: null,
      attackReadyAtMs: 0,
      moveReadyAtMs: 999999
    }];
    state.pendingSpawns = [];

    state = stepState(state, 16, gameContent);

    const boardAfter = state.defenders.find((defender) => defender.id === boardDefender!.id);
    const saunaAfter = state.defenders.find((defender) => defender.id === saunaDefender!.id);
    expect(boardAfter?.location).toBe('sauna');
    expect(saunaAfter?.location).toBe('board');
    expect(saunaAfter?.tile).toEqual({ q: 0, r: -1 });
    expect(state.saunaDefenderId).toBe(boardDefender!.id);
    expect(state.waveSwapUsed).toBe(true);
  });

  it('shows intermission after a run and requires a one-time shop unlock', () => {
    let state = prepState();
    state.phase = 'wave';
    state.steamEarned = 8;
    state.saunaHp = 1;
    state.enemies = [{
      instanceId: 1,
      archetypeId: 'raider',
      tokenStyleId: 0,
      tile: { q: 0, r: 1 },
      hp: 12,
      lastHitByDefenderId: null,
      attackReadyAtMs: 0,
      moveReadyAtMs: 999999
    }];
    state.pendingSpawns = [];

    state = stepState(state, 16, gameContent);

    expect(state.overlayMode).toBe('intermission');
    expect(state.meta.completedRuns).toBe(1);
    expect(state.meta.shopUnlocked).toBe(false);

    const beforeUnlockSteam = state.meta.steam;
    state = applyAction(state, { type: 'unlockMetaShop' }, gameContent);

    expect(state.meta.shopUnlocked).toBe(true);
    expect(state.meta.steam).toBe(beforeUnlockSteam - gameContent.config.metaShopUnlockCost);
  });

  it('tracks selected loot details with art and flavor text', () => {
    let state = prepState();
    state.headerItems.push({
      instanceId: 1,
      kind: 'item',
      definitionId: 'ladle',
      rarity: 'common',
      name: 'Lucky Ladle',
      effectText: '+5 HP, -40 ms attack speed.',
      flavorText: 'Still warm from a soup no one admits making.',
      artPath: 'loot/lucky-ladle.svg',
      waveFound: 1,
      sourceEnemyId: 'raider'
    });

    state = applyAction(state, { type: 'selectInventoryDrop', dropId: 1 }, gameContent);
    const snapshot = createSnapshot(state, gameContent);

    expect(snapshot.hud.selectedInventoryEntry?.artPath).toBe('loot/lucky-ladle.svg');
    expect(snapshot.hud.selectedInventoryEntry?.flavorText).toContain('soup');
  });

  it('keeps the overflow stash locked until the metashop upgrade opens it', () => {
    let state = prepState();

    expect(state.inventoryOpen).toBe(false);

    state = applyAction(state, { type: 'toggleInventory' }, gameContent);
    expect(state.inventoryOpen).toBe(false);

    state.meta.upgrades.inventory_slots = 1;
    state = applyAction(state, { type: 'toggleInventory' }, gameContent);
    expect(state.inventoryOpen).toBe(true);
  });

  it('keeps recruitment closed by default and toggles it open', () => {
    let state = prepState();

    expect(state.recruitmentOpen).toBe(false);

    state = applyAction(state, { type: 'toggleRecruitment' }, gameContent);
    expect(state.recruitmentOpen).toBe(true);

    state = applyAction(state, { type: 'toggleRecruitment' }, gameContent);
    expect(state.recruitmentOpen).toBe(false);
  });

  it('opens recruitment during a live wave and while paused', () => {
    let state = prepState();
    state.phase = 'wave';

    state = applyAction(state, { type: 'toggleRecruitment' }, gameContent);
    expect(state.recruitmentOpen).toBe(true);

    state.overlayMode = 'paused';
    state = applyAction(state, { type: 'toggleRecruitment' }, gameContent);
    expect(state.recruitmentOpen).toBe(false);

    state = applyAction(state, { type: 'toggleRecruitment' }, gameContent);
    expect(state.recruitmentOpen).toBe(true);
  });

  it('closes recruitment when opening inventory and closes inventory when opening recruitment', () => {
    let state = prepState();
    state.meta.upgrades.inventory_slots = 1;

    state = applyAction(state, { type: 'toggleRecruitment' }, gameContent);
    expect(state.recruitmentOpen).toBe(true);

    state = applyAction(state, { type: 'toggleInventory' }, gameContent);
    expect(state.inventoryOpen).toBe(true);
    expect(state.recruitmentOpen).toBe(false);

    state = applyAction(state, { type: 'toggleRecruitment' }, gameContent);
    expect(state.recruitmentOpen).toBe(true);
    expect(state.inventoryOpen).toBe(false);
  });

  it('rolls and buys recruit offers during a live wave', () => {
    let state = prepState();
    state.defenders = state.defenders.filter((defender) => defender.location !== 'dead').slice(0, 4);
    state.saunaDefenderId = state.defenders.find((defender) => defender.location === 'sauna')?.id ?? null;
    state.phase = 'wave';
    state.sisu.current = 20;

    state = applyAction(state, { type: 'rerollRecruitOffers' }, gameContent);
    expect(state.recruitOffers).toHaveLength(3);

    const offer = state.recruitOffers[0];
    state = applyAction(state, { type: 'recruitOffer', offerId: offer.offerId }, gameContent);

    expect(state.defenders.some((defender) => defender.id === offer.candidate.id)).toBe(true);
    expect(state.recruitOffers).toHaveLength(0);
  });

  it('requires a replacement target when buying with a full roster', () => {
    let state = prepState();
    state.sisu.current = 30;

    state = applyAction(state, { type: 'rerollRecruitOffers' }, gameContent);
    const offer = state.recruitOffers[0];

    state = applyAction(state, { type: 'recruitOffer', offerId: offer.offerId }, gameContent);

    expect(state.recruitOffers).toHaveLength(3);
    expect(state.message).toContain('replace');
  });

  it('replaces the selected ready hero when recruiting with a full roster', () => {
    let state = prepState();
    state.sisu.current = 30;
    const outgoing = state.defenders.find((defender) => defender.location === 'ready');
    expect(outgoing).toBeTruthy();

    state = applyAction(state, { type: 'rerollRecruitOffers' }, gameContent);
    const offer = state.recruitOffers[0];
    const rosterBefore = state.defenders.length;

    state = applyAction(state, { type: 'selectDefender', defenderId: outgoing!.id }, gameContent);
    state = applyAction(state, { type: 'recruitOffer', offerId: offer.offerId }, gameContent);

    expect(state.defenders).toHaveLength(rosterBefore);
    expect(state.defenders.some((defender) => defender.id === outgoing!.id)).toBe(false);
    expect(state.defenders.some((defender) => defender.id === offer.candidate.id)).toBe(true);
    const replacement = state.defenders.find((defender) => defender.id === offer.candidate.id);
    expect(replacement?.location).toBe('ready');
  });

  it('can replace the sauna reserve when the sauna is selected', () => {
    let state = prepState();
    state.sisu.current = 30;
    const saunaDefender = state.defenders.find((defender) => defender.location === 'sauna');
    expect(saunaDefender).toBeTruthy();

    state = applyAction(state, { type: 'rerollRecruitOffers' }, gameContent);
    const offer = state.recruitOffers[0];

    state = applyAction(state, { type: 'selectSauna' }, gameContent);
    state = applyAction(state, { type: 'recruitOffer', offerId: offer.offerId }, gameContent);

    expect(state.defenders.some((defender) => defender.id === saunaDefender!.id)).toBe(false);
    expect(state.saunaDefenderId).toBe(offer.candidate.id);
    const replacement = state.defenders.find((defender) => defender.id === offer.candidate.id);
    expect(replacement?.location).toBe('sauna');
  });

  it('shows recruitment availability in the hud during a live wave', () => {
    const state = prepState();
    state.phase = 'wave';

    const snapshot = createSnapshot(state, gameContent);

    expect(snapshot.hud.canOpenRecruitment).toBe(true);
    expect(snapshot.hud.recruitmentStatusText.length).toBeGreaterThan(0);
    expect(snapshot.hud.recruitLevelUpCost).toBe(2);
    expect(snapshot.hud.recruitLevelOdds).toEqual([
      { level: 1, chance: 1 },
      { level: 2, chance: 0 },
      { level: 3, chance: 0 },
      { level: 4, chance: 0 },
      { level: 5, chance: 0 }
    ]);
  });

  it('uses the base battlefield size before any boss has been defeated', () => {
    const snapshot = createSnapshot(prepState(), gameContent);

    expect(snapshot.config.gridRadius).toBe(6);
    expect(snapshot.tiles.length).toBe(127);
    expect(snapshot.config.buildRadius).toBe(5);
    expect(snapshot.spawnTiles).toHaveLength(6);
    expect(snapshot.spawnTiles.every((tile) => Math.max(Math.abs(tile.q), Math.abs(tile.r), Math.abs(-tile.q - tile.r)) === 6)).toBe(true);
  });

  it('auto-assigns loot to the selected defender first when a slot is free', () => {
    let state = prepState();
    const target = state.defenders.find((defender) => defender.location === 'ready');
    expect(target).toBeTruthy();
    state.headerItems.push({
      instanceId: 2,
      kind: 'item',
      definitionId: 'ladle',
      rarity: 'common',
      name: 'Lucky Ladle',
      effectText: '+5 HP, -40 ms attack speed.',
      flavorText: 'Still warm from a soup no one admits making.',
      artPath: 'loot/lucky-ladle.svg',
      waveFound: 1,
      sourceEnemyId: 'raider'
    });

    state = applyAction(state, { type: 'selectDefender', defenderId: target!.id }, gameContent);
    state = applyAction(state, { type: 'autoAssignInventoryDrop', dropId: 2 }, gameContent);

    const updated = state.defenders.find((defender) => defender.id === target!.id);
    expect(updated?.items).toContain('ladle');
    expect(state.headerItems).toHaveLength(0);
  });

  it('falls back to another defender when the selected one has no valid slot', () => {
    let state = prepState();
    const selected = state.defenders.find((defender) => defender.location === 'ready');
    const backup = state.defenders.find((defender) => defender.location === 'board') ?? state.defenders.find((defender) => defender.id !== selected?.id);
    expect(selected).toBeTruthy();
    expect(backup).toBeTruthy();

    selected!.skills.push('fireball');
    state.headerSkills.push({
      instanceId: 3,
      kind: 'skill',
      definitionId: 'blink_step',
      rarity: 'rare',
      name: 'Blink Step',
      effectText: 'If no target is in range, blink one hex closer to danger.',
      flavorText: 'A deeply unwise technique for entering rooms dramatically.',
      artPath: 'loot/blink-step.svg',
      waveFound: 1,
      sourceEnemyId: 'raider'
    });

    state = applyAction(state, { type: 'selectDefender', defenderId: selected!.id }, gameContent);
    state = applyAction(state, { type: 'autoAssignInventoryDrop', dropId: 3 }, gameContent);

    const selectedAfter = state.defenders.find((defender) => defender.id === selected!.id);
    const backupAfter = state.defenders.find((defender) => defender.id === backup!.id);
    expect(selectedAfter?.skills).toEqual(['fireball']);
    expect(backupAfter?.skills).toContain('blink_step');
    expect(state.headerSkills).toHaveLength(0);
  });

  it('sells header loot for Steam based on rarity', () => {
    let state = prepState();
    state.headerItems.push({
      instanceId: 77,
      kind: 'item',
      definitionId: 'iron_whisk',
      rarity: 'rare',
      name: gameContent.itemDefinitions.iron_whisk.name,
      effectText: gameContent.itemDefinitions.iron_whisk.effectText,
      flavorText: gameContent.itemDefinitions.iron_whisk.flavorText,
      artPath: gameContent.itemDefinitions.iron_whisk.artPath,
      waveFound: 2,
      sourceEnemyId: 'brute'
    });

    state = applyAction(state, { type: 'sellInventoryDrop', dropId: 77 }, gameContent);

    expect(state.headerItems).toHaveLength(0);
    expect(state.steamEarned).toBe(2);
    expect(state.message).toContain('Sold');
  });

  it('sells stash loot for Steam based on rarity', () => {
    let state = prepState();
    state.meta.upgrades.inventory_slots = 1;
    state.inventory.push({
      instanceId: 78,
      kind: 'skill',
      definitionId: 'battle_hymn',
      rarity: 'epic',
      name: gameContent.skillDefinitions.battle_hymn.name,
      effectText: gameContent.skillDefinitions.battle_hymn.effectText,
      flavorText: gameContent.skillDefinitions.battle_hymn.flavorText,
      artPath: gameContent.skillDefinitions.battle_hymn.artPath,
      waveFound: 3,
      sourceEnemyId: 'chieftain'
    });

    state = applyAction(state, { type: 'sellInventoryDrop', dropId: 78 }, gameContent);

    expect(state.inventory).toHaveLength(0);
    expect(state.steamEarned).toBe(4);
  });

  it('destroys equipped items without granting Steam', () => {
    let state = prepState();
    const defender = state.defenders.find((entry) => entry.location !== 'dead');
    expect(defender).toBeTruthy();
    defender!.items.push('ladle');

    state = applyAction(
      state,
      { type: 'destroyEquippedItem', defenderId: defender!.id, itemId: 'ladle' },
      gameContent
    );

    expect(state.defenders.find((entry) => entry.id === defender!.id)?.items).not.toContain('ladle');
    expect(state.steamEarned).toBe(0);
  });

  it('destroys equipped skills without granting Steam', () => {
    let state = prepState();
    const defender = state.defenders.find((entry) => entry.location !== 'dead');
    expect(defender).toBeTruthy();
    defender!.skills.push('fireball');

    state = applyAction(
      state,
      { type: 'destroyEquippedSkill', defenderId: defender!.id, skillId: 'fireball' },
      gameContent
    );

    expect(state.defenders.find((entry) => entry.id === defender!.id)?.skills).not.toContain('fireball');
    expect(state.steamEarned).toBe(0);
  });

  it('routes fresh boss loot into the header rows before using the stash', () => {
    let state = prepState();
    const attacker = state.defenders.find((defender) => defender.location === 'ready');
    expect(attacker).toBeTruthy();
    attacker!.location = 'board';
    attacker!.tile = { q: 0, r: -1 };
    attacker!.stats.damage = 99;
    attacker!.attackReadyAtMs = 0;
    state.phase = 'wave';
    state.pendingSpawns = [{ atMs: 999999, enemyId: 'raider', laneIndex: 0 }];
    state.enemies = [{
      instanceId: 1,
      archetypeId: 'chieftain',
      tokenStyleId: 0,
      tile: { q: 0, r: -2 },
      hp: 1,
      lastHitByDefenderId: null,
      attackReadyAtMs: 999999,
      moveReadyAtMs: 999999
    }];

    state = stepState(state, 16, gameContent);

    expect(state.headerItems.length + state.headerSkills.length).toBe(1);
    expect(state.inventory).toHaveLength(0);
  });

  it('sends overflow loot to the stash only after the stash upgrade is unlocked', () => {
    let state = prepState();
    const attacker = state.defenders.find((defender) => defender.location === 'ready');
    expect(attacker).toBeTruthy();
    attacker!.location = 'board';
    attacker!.tile = { q: 0, r: -1 };
    attacker!.stats.damage = 99;
    attacker!.attackReadyAtMs = 0;
    state.phase = 'wave';
    state.meta.upgrades.inventory_slots = 1;
    state.headerItems = Array.from({ length: gameContent.config.headerItemCap }, (_, index) => ({
      instanceId: 100 + index,
      kind: 'item',
      definitionId: 'ladle',
      rarity: 'common',
      name: 'Lucky Ladle',
      effectText: '+5 HP, -40 ms attack speed.',
      flavorText: 'Still warm from a soup no one admits making.',
      artPath: 'loot/lucky-ladle.svg',
      waveFound: 1,
      sourceEnemyId: 'raider'
    }));
    state.headerSkills = Array.from({ length: gameContent.config.headerSkillCap }, (_, index) => ({
      instanceId: 200 + index,
      kind: 'skill',
      definitionId: 'fireball',
      rarity: 'rare',
      name: 'Fireball',
      effectText: 'Every 12s your next basic attack marks a tile. After 1s, a fireball explodes there for full damage in radius 2.',
      flavorText: 'Throws a rude little sun at anyone standing too close.',
      artPath: 'loot/fireball.svg',
      waveFound: 1,
      sourceEnemyId: 'raider'
    }));
    state.pendingSpawns = [{ atMs: 999999, enemyId: 'raider', laneIndex: 0 }];
    state.enemies = [{
      instanceId: 1,
      archetypeId: 'chieftain',
      tokenStyleId: 0,
      tile: { q: 0, r: -2 },
      hp: 1,
      lastHitByDefenderId: null,
      attackReadyAtMs: 999999,
      moveReadyAtMs: 999999
    }];

    state = stepState(state, 16, gameContent);

    expect(state.inventory).toHaveLength(1);
    expect(state.message).toContain('Overflow Stash');
  });

  it('drops extra loot on the floor when header rows are full and the stash is still locked', () => {
    let state = prepState();
    const attacker = state.defenders.find((defender) => defender.location === 'ready');
    expect(attacker).toBeTruthy();
    attacker!.location = 'board';
    attacker!.tile = { q: 0, r: -1 };
    attacker!.stats.damage = 99;
    attacker!.attackReadyAtMs = 0;
    state.phase = 'wave';
    state.headerItems = Array.from({ length: gameContent.config.headerItemCap }, (_, index) => ({
      instanceId: 300 + index,
      kind: 'item',
      definitionId: 'ladle',
      rarity: 'common',
      name: 'Lucky Ladle',
      effectText: '+5 HP, -40 ms attack speed.',
      flavorText: 'Still warm from a soup no one admits making.',
      artPath: 'loot/lucky-ladle.svg',
      waveFound: 1,
      sourceEnemyId: 'raider'
    }));
    state.headerSkills = Array.from({ length: gameContent.config.headerSkillCap }, (_, index) => ({
      instanceId: 400 + index,
      kind: 'skill',
      definitionId: 'fireball',
      rarity: 'rare',
      name: 'Fireball',
      effectText: 'Every 12s your next basic attack marks a tile. After 1s, a fireball explodes there for full damage in radius 2.',
      flavorText: 'Throws a rude little sun at anyone standing too close.',
      artPath: 'loot/fireball.svg',
      waveFound: 1,
      sourceEnemyId: 'raider'
    }));
    state.pendingSpawns = [{ atMs: 999999, enemyId: 'raider', laneIndex: 0 }];
    state.enemies = [{
      instanceId: 1,
      archetypeId: 'chieftain',
      tokenStyleId: 0,
      tile: { q: 0, r: -2 },
      hp: 1,
      lastHitByDefenderId: null,
      attackReadyAtMs: 999999,
      moveReadyAtMs: 999999
    }];

    state = stepState(state, 16, gameContent);

    expect(state.inventory).toHaveLength(0);
    expect(state.headerItems).toHaveLength(gameContent.config.headerItemCap);
    expect(state.headerSkills).toHaveLength(gameContent.config.headerSkillCap);
    expect(state.message).toContain('no room');
  });

  it('queues a telegraphed fireball before the delayed explosion lands', () => {
    let state = prepState();
    const attacker = state.defenders.find((defender) => defender.location === 'ready');
    expect(attacker).toBeTruthy();
    attacker!.location = 'board';
    attacker!.tile = { q: 0, r: -1 };
    attacker!.skills.push('fireball');
    attacker!.stats.attackCooldownMs = 999999;
    attacker!.attackReadyAtMs = 0;
    state.phase = 'wave';
    state.enemies = [
      {
        instanceId: 1,
        archetypeId: 'raider',
        tokenStyleId: 0,
        tile: { q: 0, r: -2 },
        hp: 12,
        lastHitByDefenderId: null,
        attackReadyAtMs: 999999,
        moveReadyAtMs: 999999
      },
      {
        instanceId: 2,
        archetypeId: 'raider',
        tokenStyleId: 0,
        tile: { q: 1, r: -2 },
        hp: 12,
        lastHitByDefenderId: null,
        attackReadyAtMs: 999999,
        moveReadyAtMs: 999999
      }
    ];
    state.pendingSpawns = [];

    state = stepState(state, 16, gameContent);

    expect(state.fxEvents.some((event) => event.kind === 'hit')).toBe(true);
    expect(state.fxEvents.some((event) => event.kind === 'fireball')).toBe(false);
    expect(state.pendingFireballs).toHaveLength(1);
    expect(state.pendingFireballs[0]?.targetTile).toEqual({ q: 0, r: -2 });
    expect(state.hitStopMs).toBe(0);

    state = stepState(state, 1000, gameContent);

    expect(state.pendingFireballs).toHaveLength(0);
    expect(state.fxEvents.some((event) => event.kind === 'fireball')).toBe(true);
    expect(state.hitStopMs).toBeGreaterThan(0);
  });

  it('uses a fixed fireball area instead of tracking the original target', () => {
    let state = prepState();
    const attacker = state.defenders.find((defender) => defender.location === 'ready');
    expect(attacker).toBeTruthy();
    attacker!.location = 'board';
    attacker!.tile = { q: 0, r: -1 };
    attacker!.skills.push('fireball');
    attacker!.stats.damage = 11;
    attacker!.stats.attackCooldownMs = 999999;
    attacker!.attackReadyAtMs = 0;
    state.phase = 'wave';
    state.pendingSpawns = [];
    state.enemies = [
      {
        instanceId: 1,
        archetypeId: 'raider',
        tokenStyleId: 0,
        tile: { q: 0, r: -2 },
        hp: 30,
        lastHitByDefenderId: null,
        attackReadyAtMs: 999999,
        moveReadyAtMs: 999999
      },
      {
        instanceId: 2,
        archetypeId: 'raider',
        tokenStyleId: 0,
        tile: { q: 2, r: -2 },
        hp: 30,
        lastHitByDefenderId: null,
        attackReadyAtMs: 999999,
        moveReadyAtMs: 999999
      }
    ];

    state = stepState(state, 16, gameContent);

    state.enemies.find((enemy) => enemy.instanceId === 1)!.tile = { q: 4, r: -2 };
    state.enemies.push({
      instanceId: 3,
      archetypeId: 'raider',
      tokenStyleId: 0,
      tile: { q: 1, r: -2 },
      hp: 30,
      lastHitByDefenderId: null,
      attackReadyAtMs: 999999,
      moveReadyAtMs: 999999
    });

    state = stepState(state, 1000, gameContent);

    expect(state.enemies.find((enemy) => enemy.instanceId === 1)?.hp).toBe(19);
    expect(state.enemies.find((enemy) => enemy.instanceId === 2)?.hp).toBe(19);
    expect(state.enemies.find((enemy) => enemy.instanceId === 3)?.hp).toBe(19);
  });

  it('shows the fireball cooldown label on the selected defender HUD', () => {
    let state = prepState();
    const attacker = state.defenders.find((defender) => defender.location === 'ready');
    expect(attacker).toBeTruthy();
    attacker!.location = 'board';
    attacker!.tile = { q: 0, r: -1 };
    attacker!.skills.push('fireball');
    attacker!.attackReadyAtMs = 0;
    state.selectedDefenderId = attacker!.id;
    state.phase = 'wave';
    state.pendingSpawns = [];
    state.enemies = [{
      instanceId: 1,
      archetypeId: 'raider',
      tokenStyleId: 0,
      tile: { q: 0, r: -2 },
      hp: 20,
      lastHitByDefenderId: null,
      attackReadyAtMs: 999999,
      moveReadyAtMs: 999999
    }];

    let snapshot = createSnapshot(state, gameContent);
    expect(snapshot.hud.selectedDefender?.fireballLabel).toBe('Fireball ready');

    state = stepState(state, 16, gameContent);
    snapshot = createSnapshot(state, gameContent);
    expect(snapshot.hud.selectedDefender?.fireballLabel).toBe('Fireball 12s');

    state.timeMs = state.defenders.find((defender) => defender.id === attacker!.id)?.fireballReadyAtMs ?? state.timeMs;
    snapshot = createSnapshot(state, gameContent);
    expect(snapshot.hud.selectedDefender?.fireballLabel).toBe('Fireball ready');
  });

  it('grants xp and levels up a hero from combat kills', () => {
    let state = prepState();
    const attacker = state.defenders.find((defender) => defender.location === 'ready');
    expect(attacker).toBeTruthy();
    attacker!.location = 'board';
    attacker!.tile = { q: 0, r: -1 };
    attacker!.stats.damage = 99;
    attacker!.attackReadyAtMs = 0;
    state.phase = 'wave';
    state.enemies = [
      {
        instanceId: 1,
        archetypeId: 'chieftain',
        tokenStyleId: 0,
        tile: { q: 0, r: -2 },
        hp: 1,
        lastHitByDefenderId: null,
        attackReadyAtMs: 999999,
        moveReadyAtMs: 999999
      }
    ];
    state.pendingSpawns = [];

    state = stepState(state, 16, gameContent);

    const attackerAfter = state.defenders.find((defender) => defender.id === attacker!.id);
    expect(attackerAfter?.kills).toBe(1);
    expect(attackerAfter?.xp).toBeGreaterThan(0);
    expect(attackerAfter?.xp).toBe(4);
    expect(attackerAfter?.level).toBe(1);
  });

  it('opens a subclass draft when a hero reaches level five', () => {
    let state = prepState();
    const attacker = state.defenders.find((defender) => defender.location === 'ready');
    expect(attacker).toBeTruthy();
    attacker!.location = 'board';
    attacker!.tile = { q: 0, r: -1 };
    attacker!.attackReadyAtMs = 0;
    attacker!.xp = 25;
    attacker!.level = 4;
    attacker!.stats.damage = 99;
    state.phase = 'wave';
    state.pendingSpawns = [];
    state.enemies = [{
      instanceId: 1,
      archetypeId: 'brute',
      tokenStyleId: 0,
      tile: { q: 0, r: -2 },
      hp: 1,
      lastHitByDefenderId: null,
      attackReadyAtMs: 999999,
      moveReadyAtMs: 999999
    }];

    state = stepState(state, 16, gameContent);

    expect(state.overlayMode).toBe('subclass_draft');
    expect(state.subclassDraftDefenderId).toBe(attacker!.id);
    expect(state.subclassDraftOfferIds).toHaveLength(2);
    const draftSnapshot = createSnapshot(state, gameContent);
    expect(draftSnapshot.hud.subclassDraftOffers[0]?.effectText).toBeTruthy();
    expect(draftSnapshot.hud.subclassDraftOffers[0]?.statText).toBeTruthy();

    const choice = state.subclassDraftOfferIds[0];
    state = applyAction(state, { type: 'draftSubclassChoice', subclassId: choice }, gameContent);
    const updated = state.defenders.find((defender) => defender.id === attacker!.id);

    expect(state.overlayMode).toBe('none');
    expect(updated?.subclassIds).toContain(choice);
  });

  it('opens the next subclass milestone at level ten after the previous branch is chosen', () => {
    let state = prepState();
    const attacker = state.defenders.find((defender) => defender.location === 'ready');
    expect(attacker).toBeTruthy();
    attacker!.location = 'board';
    attacker!.tile = { q: 0, r: -1 };
    attacker!.attackReadyAtMs = 0;
    attacker!.xp = 162;
    attacker!.level = 9;
    attacker!.subclassIds = ['stonewall'];
    attacker!.stats.damage = 99;
    state.phase = 'wave';
    state.pendingSpawns = [];
    state.enemies = [{
      instanceId: 1,
      archetypeId: 'brute',
      tokenStyleId: 0,
      tile: { q: 0, r: -2 },
      hp: 1,
      lastHitByDefenderId: null,
      attackReadyAtMs: 999999,
      moveReadyAtMs: 999999
    }];

    state = stepState(state, 16, gameContent);

    expect(state.overlayMode).toBe('subclass_draft');
    expect(state.subclassDraftOfferIds.every((subclassId) => gameContent.defenderSubclasses[subclassId].unlockLevel === 10)).toBe(true);
  });

  it('fires three bolts with spark juggler and can split them across enemies', () => {
    let state = prepState();
    const hurler = state.defenders.find((defender) => defender.templateId === 'hurler');
    expect(hurler).toBeTruthy();
    hurler!.location = 'board';
    hurler!.tile = { q: 0, r: -1 };
    hurler!.attackReadyAtMs = 0;
    hurler!.stats.damage = 10;
    hurler!.subclassIds = ['spark_juggler'];
    state.phase = 'wave';
    state.pendingSpawns = [{ atMs: 999999, enemyId: 'raider', laneIndex: 0 }];
    state.enemies = [
      { instanceId: 1, archetypeId: 'raider', tokenStyleId: 0, tile: { q: 0, r: -2 }, hp: 12, lastHitByDefenderId: null, attackReadyAtMs: 999999, moveReadyAtMs: 999999 },
      { instanceId: 2, archetypeId: 'raider', tokenStyleId: 0, tile: { q: 1, r: -2 }, hp: 12, lastHitByDefenderId: null, attackReadyAtMs: 999999, moveReadyAtMs: 999999 },
      { instanceId: 3, archetypeId: 'raider', tokenStyleId: 0, tile: { q: -1, r: -1 }, hp: 12, lastHitByDefenderId: null, attackReadyAtMs: 999999, moveReadyAtMs: 999999 }
    ];

    state = stepState(state, 16, gameContent);

    expect(state.enemies.every((enemy) => enemy.hp < 12)).toBe(true);
    expect(state.fxEvents.filter((event) => event.kind === 'volley')).toHaveLength(3);
  });

  it('applies ranged splash subclasses without recursive explosions', () => {
    let coalState = prepState();
    const coalHurler = coalState.defenders.find((defender) => defender.templateId === 'hurler');
    expect(coalHurler).toBeTruthy();
    coalHurler!.location = 'board';
    coalHurler!.tile = { q: 0, r: -1 };
    coalHurler!.attackReadyAtMs = 0;
    coalHurler!.stats.damage = 10;
    coalHurler!.subclassIds = ['coalflinger'];
    coalState.phase = 'wave';
    coalState.pendingSpawns = [{ atMs: 999999, enemyId: 'raider', laneIndex: 0 }];
    coalState.enemies = [
      { instanceId: 1, archetypeId: 'raider', tokenStyleId: 0, tile: { q: 0, r: -2 }, hp: 20, lastHitByDefenderId: null, attackReadyAtMs: 999999, moveReadyAtMs: 999999 },
      { instanceId: 2, archetypeId: 'raider', tokenStyleId: 0, tile: { q: 1, r: -2 }, hp: 20, lastHitByDefenderId: null, attackReadyAtMs: 999999, moveReadyAtMs: 999999 },
      { instanceId: 3, archetypeId: 'raider', tokenStyleId: 0, tile: { q: 3, r: -2 }, hp: 20, lastHitByDefenderId: null, attackReadyAtMs: 999999, moveReadyAtMs: 999999 }
    ];

    coalState = stepState(coalState, 16, gameContent);

    expect(coalState.enemies.find((enemy) => enemy.instanceId === 1)?.hp).toBeLessThan(20);
    expect(coalState.enemies.find((enemy) => enemy.instanceId === 2)?.hp).toBeLessThan(20);
    expect(coalState.enemies.find((enemy) => enemy.instanceId === 3)?.hp).toBe(20);
    expect(coalState.fxEvents.some((event) => event.kind === 'fireball')).toBe(true);

    let meteorState = prepState();
    const meteorHurler = meteorState.defenders.find((defender) => defender.templateId === 'hurler');
    expect(meteorHurler).toBeTruthy();
    meteorHurler!.location = 'board';
    meteorHurler!.tile = { q: 0, r: -1 };
    meteorHurler!.attackReadyAtMs = 0;
    meteorHurler!.stats.damage = 10;
    meteorHurler!.subclassIds = ['meteor_bucket'];
    meteorState.phase = 'wave';
    meteorState.pendingSpawns = [{ atMs: 999999, enemyId: 'raider', laneIndex: 0 }];
    meteorState.enemies = [
      { instanceId: 1, archetypeId: 'raider', tokenStyleId: 0, tile: { q: 0, r: -2 }, hp: 20, lastHitByDefenderId: null, attackReadyAtMs: 999999, moveReadyAtMs: 999999 },
      { instanceId: 2, archetypeId: 'raider', tokenStyleId: 0, tile: { q: 1, r: -2 }, hp: 20, lastHitByDefenderId: null, attackReadyAtMs: 999999, moveReadyAtMs: 999999 }
    ];

    meteorState = stepState(meteorState, 16, gameContent);

    expect(meteorState.enemies.every((enemy) => enemy.hp < 20)).toBe(true);
    expect(meteorState.fxEvents.filter((event) => event.kind === 'fireball').length).toBe(1);
  });

  it('double taps low-health targets with last ladle', () => {
    let state = prepState();
    const guardian = state.defenders.find((defender) => defender.templateId === 'guardian');
    expect(guardian).toBeTruthy();
    guardian!.location = 'board';
    guardian!.tile = { q: 0, r: -1 };
    guardian!.attackReadyAtMs = 0;
    guardian!.stats.damage = 10;
    guardian!.subclassIds = ['last_ladle'];
    state.phase = 'wave';
    state.pendingSpawns = [{ atMs: 999999, enemyId: 'raider', laneIndex: 0 }];
    state.enemies = [
      { instanceId: 1, archetypeId: 'chieftain', tokenStyleId: 0, tile: { q: 0, r: 0 }, hp: 20, lastHitByDefenderId: null, attackReadyAtMs: 999999, moveReadyAtMs: 999999 }
    ];

    state = stepState(state, 16, gameContent);

    expect(state.enemies).toHaveLength(0);
    expect(state.fxEvents.some((event) => event.kind === 'volley')).toBe(true);
  });

  it('retaliates with stonewall and revenge coals when hit', () => {
    let stonewallState = prepState();
    const stonewall = stonewallState.defenders.find((defender) => defender.templateId === 'guardian');
    expect(stonewall).toBeTruthy();
    stonewall!.location = 'board';
    stonewall!.tile = { q: 0, r: -1 };
    stonewall!.hp = 20;
    stonewall!.attackReadyAtMs = 999999;
    stonewall!.subclassIds = ['stonewall'];
    stonewallState.phase = 'wave';
    stonewallState.pendingSpawns = [{ atMs: 999999, enemyId: 'raider', laneIndex: 0 }];
    stonewallState.enemies = [
      { instanceId: 1, archetypeId: 'raider', tokenStyleId: 0, tile: { q: 0, r: 0 }, hp: 12, lastHitByDefenderId: null, attackReadyAtMs: 0, moveReadyAtMs: 999999 }
    ];

    stonewallState = stepState(stonewallState, 16, gameContent);

    expect(stonewallState.enemies[0]?.hp).toBe(10);

    let revengeState = prepState();
    const revenge = revengeState.defenders.find((defender) => defender.templateId === 'guardian');
    expect(revenge).toBeTruthy();
    revenge!.location = 'board';
    revenge!.tile = { q: 0, r: -1 };
    revenge!.hp = 20;
    revenge!.attackReadyAtMs = 999999;
    revenge!.subclassIds = ['revenge_coals'];
    revengeState.phase = 'wave';
    revengeState.pendingSpawns = [{ atMs: 999999, enemyId: 'raider', laneIndex: 0 }];
    revengeState.enemies = [
      { instanceId: 1, archetypeId: 'raider', tokenStyleId: 0, tile: { q: 0, r: 0 }, hp: 12, lastHitByDefenderId: null, attackReadyAtMs: 0, moveReadyAtMs: 999999 },
      { instanceId: 2, archetypeId: 'raider', tokenStyleId: 0, tile: { q: 1, r: 0 }, hp: 12, lastHitByDefenderId: null, attackReadyAtMs: 999999, moveReadyAtMs: 999999 }
    ];

    revengeState = stepState(revengeState, 16, gameContent);

    expect(revengeState.enemies.find((enemy) => enemy.instanceId === 1)?.hp).toBe(9);
    expect(revengeState.enemies.find((enemy) => enemy.instanceId === 2)?.hp).toBe(11);
  });

  it('applies and removes nearby subclass auras correctly', () => {
    const state = prepState();
    const guardian = state.defenders.find((defender) => defender.templateId === 'guardian');
    const hurler = state.defenders.find((defender) => defender.templateId === 'hurler');
    const mender = state.defenders.find((defender) => defender.templateId === 'mender');
    expect(guardian).toBeTruthy();
    expect(hurler).toBeTruthy();
    expect(mender).toBeTruthy();

    guardian!.location = 'board';
    guardian!.tile = { q: 0, r: -1 };
    guardian!.subclassIds = ['iron_bastion'];
    guardian!.attackReadyAtMs = 999999;
    hurler!.location = 'board';
    hurler!.tile = { q: 1, r: -1 };
    hurler!.attackReadyAtMs = 999999;
    mender!.location = 'board';
    mender!.tile = { q: 1, r: -2 };
    mender!.subclassIds = ['afterglow_warden'];
    mender!.attackReadyAtMs = 999999;
    state.selectedDefenderId = hurler!.id;

    let snapshot = createSnapshot(state, gameContent);
    const maxHpWithAura = snapshot.hud.selectedDefender?.maxHp ?? 0;
    expect(snapshot.hud.selectedDefender?.defense).toBe(2);
    expect(snapshot.hud.selectedDefender?.regenHpPerSecond).toBe(1);

    mender!.location = 'ready';
    mender!.tile = null;
    snapshot = createSnapshot(state, gameContent);
    expect(snapshot.hud.selectedDefender?.maxHp).toBe(maxHpWithAura);
    expect(snapshot.hud.selectedDefender?.defense).toBe(1);
    expect(snapshot.hud.selectedDefender?.regenHpPerSecond).toBe(0);
  });

  it('applies support-focused subclass heals and exposes subclass effect text in snapshot HUD', () => {
    let state = prepState();
    const mender = state.defenders.find((defender) => defender.templateId === 'mender');
    const guardian = state.defenders.find((defender) => defender.templateId === 'guardian');
    const hurler = state.defenders.find((defender) => defender.templateId === 'hurler');
    expect(mender).toBeTruthy();
    expect(guardian).toBeTruthy();
    expect(hurler).toBeTruthy();

    mender!.location = 'board';
    mender!.tile = { q: 0, r: -1 };
    mender!.attackReadyAtMs = 0;
    mender!.subclassIds = ['steampriest', 'calm_whisper', 'rescue_ritualist', 'saint_of_steam'];
    guardian!.location = 'board';
    guardian!.tile = { q: 0, r: -2 };
    guardian!.hp = Math.max(1, guardian!.hp - 4);
    guardian!.attackReadyAtMs = 999999;
    hurler!.location = 'board';
    hurler!.tile = { q: 1, r: -2 };
    hurler!.hp = Math.max(1, hurler!.hp - 3);
    hurler!.attackReadyAtMs = 999999;
    state.phase = 'wave';
    state.pendingSpawns = [{ atMs: 999999, enemyId: 'raider', laneIndex: 0 }];
    state.enemies = [
      { instanceId: 1, archetypeId: 'raider', tokenStyleId: 0, tile: { q: 5, r: -5 }, hp: 12, lastHitByDefenderId: null, attackReadyAtMs: 999999, moveReadyAtMs: 999999 }
    ];
    state.selectedDefenderId = mender!.id;

    state = stepState(state, 16, gameContent);

    expect(state.defenders.find((defender) => defender.id === guardian!.id)?.hp).toBeGreaterThan(guardian!.hp);
    expect(state.defenders.find((defender) => defender.id === hurler!.id)?.hp).toBeGreaterThan(hurler!.hp);
    expect(state.fxEvents.some((event) => event.kind === 'pulse')).toBe(true);

    const snapshot = createSnapshot(state, gameContent);
    expect(snapshot.hud.selectedDefender?.subclasses).toHaveLength(4);
    expect(snapshot.hud.selectedDefender?.subclasses[0]?.effectText).toBeTruthy();
    expect(snapshot.hud.subclassDraftOffers).toEqual([]);
  });

  it('keeps primary-only skill procs when subclass projectiles add extra hits', () => {
    let state = prepState();
    const hurler = state.defenders.find((defender) => defender.templateId === 'hurler');
    expect(hurler).toBeTruthy();
    hurler!.location = 'board';
    hurler!.tile = { q: 0, r: -1 };
    hurler!.attackReadyAtMs = 0;
    hurler!.stats.damage = 10;
    hurler!.subclassIds = ['spark_juggler'];
    hurler!.skills.push('fireball');
    state.phase = 'wave';
    state.pendingSpawns = [{ atMs: 999999, enemyId: 'raider', laneIndex: 0 }];
    state.enemies = [
      { instanceId: 1, archetypeId: 'raider', tokenStyleId: 0, tile: { q: 0, r: -2 }, hp: 18, lastHitByDefenderId: null, attackReadyAtMs: 999999, moveReadyAtMs: 999999 },
      { instanceId: 2, archetypeId: 'raider', tokenStyleId: 0, tile: { q: 1, r: -2 }, hp: 18, lastHitByDefenderId: null, attackReadyAtMs: 999999, moveReadyAtMs: 999999 },
      { instanceId: 3, archetypeId: 'raider', tokenStyleId: 0, tile: { q: -1, r: -1 }, hp: 18, lastHitByDefenderId: null, attackReadyAtMs: 999999, moveReadyAtMs: 999999 }
    ];

    state = stepState(state, 16, gameContent);

    expect(state.pendingFireballs).toHaveLength(1);
    expect(state.fxEvents.filter((event) => event.kind === 'fireball')).toHaveLength(0);
    expect(state.fxEvents.filter((event) => event.kind === 'volley')).toHaveLength(3);
  });

  it('grants xp from successful healing actions even without a kill', () => {
    let state = prepState();
    const readyDefenders = state.defenders.filter((defender) => defender.location === 'ready');
    const attacker = readyDefenders.find((defender) => defender.templateId === 'mender');
    const ally = readyDefenders.find((defender) => defender.id !== attacker?.id);
    expect(attacker).toBeTruthy();
    expect(ally).toBeTruthy();
    attacker!.location = 'board';
    attacker!.tile = { q: 0, r: -1 };
    attacker!.attackReadyAtMs = 0;
    ally!.location = 'board';
    ally!.tile = { q: 1, r: -1 };
    ally!.hp = Math.max(1, ally!.hp - 4);
    ally!.attackReadyAtMs = 999999;
    state.phase = 'wave';
    state.pendingSpawns = [];
    state.enemies = [];

    state = stepState(state, 16, gameContent);

    const attackerAfter = state.defenders.find((defender) => defender.id === attacker!.id);
    expect(attackerAfter?.xp).toBeGreaterThan(0);
    expect(state.defenders.find((defender) => defender.id === ally!.id)?.hp).toBeGreaterThan(ally!.hp);
  });

  it('targets a defender before the sauna when a defender is in range', () => {
    let state = prepState();
    const defender = state.defenders.find((entry) => entry.location === 'ready');
    expect(defender).toBeTruthy();
    defender!.location = 'board';
    defender!.tile = { q: 0, r: -1 };
    defender!.hp = 20;
    defender!.attackReadyAtMs = 999999;
    state.phase = 'wave';
    state.enemies = [
      {
        instanceId: 1,
        archetypeId: 'raider',
        tokenStyleId: 0,
        tile: { q: 0, r: 0 },
        hp: 12,
        lastHitByDefenderId: null,
        attackReadyAtMs: 0,
        moveReadyAtMs: 999999
      }
    ];
    state.pendingSpawns = [];
    const saunaHpBefore = state.saunaHp;

    state = stepState(state, 16, gameContent);

    const defenderAfter = state.defenders.find((entry) => entry.id === defender!.id);
    expect(defenderAfter?.hp).toBeLessThan(20);
    expect(state.saunaHp).toBe(saunaHpBefore);
    expect(state.fxEvents.some((event) => event.kind === 'defender_hit')).toBe(true);
  });

  it('damages the sauna only when no defender target is in range', () => {
    let state = prepState();
    state.phase = 'wave';
    state.enemies = [
      {
        instanceId: 1,
        archetypeId: 'raider',
        tokenStyleId: 0,
        tile: { q: 0, r: 1 },
        hp: 12,
        lastHitByDefenderId: null,
        attackReadyAtMs: 0,
        moveReadyAtMs: 999999
      }
    ];
    state.pendingSpawns = [];
    const saunaHpBefore = state.saunaHp;

    state = stepState(state, 16, gameContent);

    expect(state.saunaHp).toBeLessThan(saunaHpBefore);
    expect(state.fxEvents.some((event) => event.kind === 'sauna_hit')).toBe(true);
  });

  it('moves an idle defender closer to the sauna when a breach enemy is hitting it', () => {
    let state = prepState();
    const defender = state.defenders.find((entry) => entry.location === 'ready');
    expect(defender).toBeTruthy();
    defender!.location = 'board';
    defender!.tile = { q: 0, r: -4 };
    defender!.attackReadyAtMs = 0;
    state.phase = 'wave';
    state.enemies = [
      {
        instanceId: 1,
        archetypeId: 'raider',
        tokenStyleId: 0,
        tile: { q: 0, r: 1 },
        hp: 12,
        lastHitByDefenderId: null,
        attackReadyAtMs: 0,
        moveReadyAtMs: 999999
      }
    ];
    state.pendingSpawns = [];
    const saunaHpBefore = state.saunaHp;

    state = stepState(state, 16, gameContent);

    const defenderAfter = state.defenders.find((entry) => entry.id === defender!.id);
    expect(defenderAfter?.tile).toEqual({ q: 0, r: -3 });
    expect(defenderAfter?.attackReadyAtMs).toBeGreaterThan(state.timeMs);
    expect(state.saunaHp).toBeLessThan(saunaHpBefore);
  });

  it('opens a three-card global modifier draft after a boss wave is cleared', () => {
    let state = prepState();
    state.phase = 'wave';
    state.waveIndex = 5;
    state.currentWave = {
      index: 5,
      isBoss: true,
      rewardSisu: 7,
      pressure: 18,
      pattern: 'boss_breach',
      bossId: 'pebble',
      bossCategory: 'breach',
      spawns: []
    };
    state.pendingSpawns = [];
    state.enemies = [];

    state = stepState(state, 16, gameContent);

    expect(state.phase).toBe('prep');
    expect(state.overlayMode).toBe('modifier_draft');
    expect(state.currentWave.index).toBe(6);
    expect(state.globalModifierDraftOffers).toHaveLength(3);

    const snapshot = createSnapshot(state, gameContent);
    expect(snapshot.hud.showGlobalModifierDraft).toBe(true);
    expect(snapshot.hud.globalModifierDraftOffers).toHaveLength(3);
    expect(snapshot.hud.globalModifierDraftOffers.every((entry) => entry.stackCount > 0)).toBe(true);
    expect(new Set(snapshot.hud.globalModifierDraftOffers.map((entry) => entry.id)).size).toBe(3);
    expect(snapshot.config.gridRadius).toBe(7);
    expect(snapshot.config.buildRadius).toBe(6);
    expect(snapshot.tiles).toHaveLength(169);
    expect(snapshot.spawnTiles).toHaveLength(8);
    expect(snapshot.spawnTiles.every((tile) => Math.max(Math.abs(tile.q), Math.abs(tile.r), Math.abs(-tile.q - tile.r)) === 7)).toBe(true);
    expect(snapshot.buildableTiles.some((tile) => Math.max(Math.abs(tile.q), Math.abs(tile.r), Math.abs(-tile.q - tile.r)) === 6)).toBe(true);
  });

  it('moves world landmarks outward on the expanded map after the first boss', () => {
    let state = prepState();
    state.phase = 'wave';
    state.waveIndex = 5;
    state.currentWave = {
      index: 5,
      isBoss: true,
      rewardSisu: 7,
      pressure: 18,
      pattern: 'boss_breach',
      bossId: 'pebble',
      bossCategory: 'breach',
      spawns: []
    };
    state.pendingSpawns = [];
    state.enemies = [];
    state.meta.completedRuns = 1;
    state.meta.upgrades.beer_shop_unlock = 1;

    state = stepState(state, 16, gameContent);
    const snapshot = createSnapshot(state, gameContent);
    const metashop = snapshot.hud.worldLandmarks.find((entry) => entry.id === 'metashop');
    const beerShop = snapshot.hud.worldLandmarks.find((entry) => entry.id === 'beer_shop');

    expect(metashop?.tile).toEqual({ q: 4, r: -7 });
    expect(beerShop?.tile).toEqual({ q: -4, r: 7 });
  });

  it('stores the picked global modifier and closes the boss reward overlay', () => {
    let state = prepState();
    state.phase = 'wave';
    state.waveIndex = 5;
    state.currentWave = {
      index: 5,
      isBoss: true,
      rewardSisu: 7,
      pressure: 18,
      pattern: 'boss_breach',
      bossId: 'pebble',
      bossCategory: 'breach',
      spawns: []
    };
    state.pendingSpawns = [];
    state.enemies = [];

    state = stepState(state, 16, gameContent);
    const picked = state.globalModifierDraftOffers[0];
    state = applyAction(state, { type: 'draftGlobalModifier', modifierId: picked }, gameContent);

    expect(state.overlayMode).toBe('none');
    expect(state.phase).toBe('prep');
    expect(state.activeGlobalModifierIds).toContain(picked);
    expect(state.globalModifierDraftOffers).toHaveLength(0);
  });

  it('lets the same global modifier be drafted twice and aggregates the total effect in the HUD', () => {
    let state = prepState();
    state.overlayMode = 'modifier_draft';
    state.globalModifierDraftOffers = ['shared_grit'];

    state = applyAction(state, { type: 'draftGlobalModifier', modifierId: 'shared_grit' }, gameContent);
    state.overlayMode = 'modifier_draft';
    state.globalModifierDraftOffers = ['shared_grit'];
    state = applyAction(state, { type: 'draftGlobalModifier', modifierId: 'shared_grit' }, gameContent);

    const snapshot = createSnapshot(state, gameContent);
    const sharedGrit = snapshot.hud.globalModifiers.find((entry) => entry.id === 'shared_grit');
    const summary = snapshot.hud.globalModifierSummary.find((entry) => entry.stat === 'damage');
    const hurlerCount = state.defenders.filter((defender) => defender.location !== 'dead' && defender.templateId === 'hurler').length;

    expect(state.activeGlobalModifierIds).toEqual(['shared_grit', 'shared_grit']);
    expect(sharedGrit?.pickCount).toBe(2);
    expect(sharedGrit?.stackCount).toBe(hurlerCount);
    expect(sharedGrit?.resolvedEffectText).toContain(`+${hurlerCount * 2} damage`);
    expect(summary?.total).toBe(hurlerCount * 2);
  });

  it('still offers boss reward cards after every modifier has already been seen once', () => {
    let state = prepState();
    state.phase = 'wave';
    state.waveIndex = 5;
    state.currentWave = {
      index: 5,
      isBoss: true,
      rewardSisu: 7,
      pressure: 18,
      pattern: 'boss_breach',
      bossId: 'pebble',
      bossCategory: 'breach',
      spawns: []
    };
    state.pendingSpawns = [];
    state.enemies = [];
    state.activeGlobalModifierIds = Object.keys(gameContent.globalModifierDefinitions) as Array<keyof typeof gameContent.globalModifierDefinitions>;

    state = stepState(state, 16, gameContent);

    expect(state.overlayMode).toBe('modifier_draft');
    expect(state.globalModifierDraftOffers).toHaveLength(3);
  });

  it('skips the boss reward draft instead of softlocking when no modifier synergies are live', () => {
    let state = prepState();
    state.phase = 'wave';
    state.waveIndex = 5;
    state.currentWave = {
      index: 5,
      isBoss: true,
      rewardSisu: 7,
      pressure: 18,
      pattern: 'boss_breach',
      bossId: 'pebble',
      bossCategory: 'breach',
      spawns: []
    };
    state.pendingSpawns = [];
    state.enemies = [];
    state.defenders = [];
    state.saunaDefenderId = null;

    state = stepState(state, 16, gameContent);

    expect(state.phase).toBe('prep');
    expect(state.overlayMode).toBe('none');
    expect(state.globalModifierDraftOffers).toEqual([]);
    expect(state.message).toContain('No modifier synergies were live');
  });

  it('updates global modifier stacks when items are equipped and defenders die', () => {
    let state = prepState();
    const defender = state.defenders.find((entry) => entry.location === 'ready');
    const hurler = state.defenders.find((entry) => entry.templateId === 'hurler');
    expect(defender).toBeTruthy();
    expect(hurler).toBeTruthy();

    state.activeGlobalModifierIds = ['whisk_discipline', 'fallen_saints'];
    state.headerItems.push({
      instanceId: 99,
      kind: 'item',
      definitionId: 'iron_whisk',
      rarity: 'rare',
      name: gameContent.itemDefinitions.iron_whisk.name,
      effectText: gameContent.itemDefinitions.iron_whisk.effectText,
      flavorText: gameContent.itemDefinitions.iron_whisk.flavorText,
      artPath: gameContent.itemDefinitions.iron_whisk.artPath,
      waveFound: 1,
      sourceEnemyId: 'raider'
    });

    let snapshot = createSnapshot(state, gameContent);
    expect(snapshot.hud.globalModifiers.find((entry) => entry.id === 'whisk_discipline')?.stackCount).toBe(0);
    expect(snapshot.hud.globalModifiers.find((entry) => entry.id === 'fallen_saints')?.stackCount).toBe(0);

    state = applyAction(state, { type: 'equipInventoryDrop', dropId: 99, defenderId: defender!.id }, gameContent);
    snapshot = createSnapshot(state, gameContent);
    expect(snapshot.hud.globalModifiers.find((entry) => entry.id === 'whisk_discipline')?.stackCount).toBe(1);

    const hurlerAfterEquip = state.defenders.find((entry) => entry.id === hurler!.id);
    hurlerAfterEquip!.location = 'dead';
    hurlerAfterEquip!.tile = null;
    hurlerAfterEquip!.hp = 0;
    snapshot = createSnapshot(state, gameContent);
    expect(snapshot.hud.globalModifiers.find((entry) => entry.id === 'fallen_saints')?.stackCount).toBe(1);
  });

  it('supports global modifiers tied to the newer milestone subclass branches', () => {
    const state = prepState();
    const mender = state.defenders.find((entry) => entry.templateId === 'mender');
    expect(mender).toBeTruthy();
    mender!.subclassIds = ['afterglow_warden'];
    state.activeGlobalModifierIds = ['afterglow_watch'];

    const snapshot = createSnapshot(state, gameContent);

    expect(snapshot.hud.globalModifiers.find((entry) => entry.id === 'afterglow_watch')?.stackCount).toBe(1);
    expect(snapshot.hud.globalModifiers.find((entry) => entry.id === 'afterglow_watch')?.description).toContain('Afterglow Wardens');
  });

  it('counts first-name modifiers and exposes rarity plus source labels in the HUD', () => {
    const state = prepState();
    state.defenders.forEach((entry, index) => {
      entry.name = `Hero ${index}`;
    });
    const defender = state.defenders.find((entry) => entry.location !== 'dead');
    expect(defender).toBeTruthy();
    defender!.name = 'Mikko';
    state.activeGlobalModifierIds = ['bastion_engine'];

    const snapshot = createSnapshot(state, gameContent);
    const modifier = snapshot.hud.globalModifiers.find((entry) => entry.id === 'bastion_engine');

    expect(modifier?.stackCount).toBe(1);
    expect(modifier?.rarity).toBe('legendary');
    expect(modifier?.sourceLabel).toContain('First name: Mikko');
  });

  it('gates early boss drafts to common and rare modifiers while guaranteeing a rare pick', () => {
    let state = prepState();
    state.defenders[0].title = 'Vihtavelho Test';
    state.defenders[1].title = 'Kiuaskuiskaaja Test';
    state.phase = 'wave';
    state.waveIndex = 5;
    state.currentWave = {
      index: 5,
      isBoss: true,
      rewardSisu: 7,
      pressure: 18,
      pattern: 'boss_breach',
      bossId: 'pebble',
      bossCategory: 'breach',
      spawns: []
    };
    state.pendingSpawns = [];
    state.enemies = [];

    state = stepState(state, 16, gameContent);
    const snapshot = createSnapshot(state, gameContent);
    const rarities = snapshot.hud.globalModifierDraftOffers.map((entry) => entry.rarity);

    expect(rarities.every((rarity) => rarity === 'common' || rarity === 'rare')).toBe(true);
    expect(rarities.some((rarity) => rarity === 'rare')).toBe(true);
  });

  it('allows epic modifiers in mid-game boss drafts and guarantees epic-or-better late', () => {
    let midState = prepState();
    midState.defenders[0].name = 'Arto';
    midState.defenders[1].title = 'Loylylordi Test';
    midState.phase = 'wave';
    midState.waveIndex = 15;
    midState.currentWave = {
      index: 15,
      isBoss: true,
      rewardSisu: 7,
      pressure: 30,
      pattern: 'boss_pressure',
      bossId: 'electric_bather',
      bossCategory: 'pressure',
      spawns: []
    };
    midState.pendingSpawns = [];
    midState.enemies = [];
    midState = stepState(midState, 16, gameContent);

    const midRarities = createSnapshot(midState, gameContent).hud.globalModifierDraftOffers.map((entry) => entry.rarity);
    expect(midRarities.every((rarity) => rarity !== 'legendary')).toBe(true);
    expect(midRarities.some((rarity) => rarity === 'rare' || rarity === 'epic')).toBe(true);

    let lateState = prepState();
    lateState.defenders[0].name = 'Mikko';
    lateState.defenders[1].name = 'Henri';
    lateState.defenders[2].title = 'Loylylordi Test';
    lateState.phase = 'wave';
    lateState.waveIndex = 20;
    lateState.currentWave = {
      index: 20,
      isBoss: true,
      rewardSisu: 7,
      pressure: 34,
      pattern: 'boss_pressure',
      bossId: 'escalation_manager',
      bossCategory: 'pressure',
      spawns: []
    };
    lateState.pendingSpawns = [];
    lateState.enemies = [];
    lateState = stepState(lateState, 16, gameContent);

    const lateRarities = createSnapshot(lateState, gameContent).hud.globalModifierDraftOffers.map((entry) => entry.rarity);
    expect(lateRarities.some((rarity) => rarity === 'epic' || rarity === 'legendary')).toBe(true);
  });

  it('reduces incoming defender damage by defense but never below one', () => {
    let state = prepState();
    const defender = state.defenders.find((entry) => entry.location === 'ready');
    expect(defender).toBeTruthy();
    defender!.location = 'board';
    defender!.tile = { q: 0, r: -1 };
    defender!.hp = 20;
    defender!.stats.defense = 10;
    defender!.attackReadyAtMs = 999999;
    state.phase = 'wave';
    state.pendingSpawns = [];
    state.enemies = [{
      instanceId: 1,
      archetypeId: 'raider',
      tokenStyleId: 0,
      tile: { q: 0, r: 0 },
      hp: 12,
      lastHitByDefenderId: null,
      attackReadyAtMs: 0,
      moveReadyAtMs: 999999
    }];

    state = stepState(state, 16, gameContent);

    const defenderAfter = state.defenders.find((entry) => entry.id === defender!.id);
    expect(defenderAfter?.hp).toBe(19);
  });

  it('applies global regeneration once per second during a wave', () => {
    let state = prepState();
    const mender = state.defenders.find((entry) => entry.templateId === 'mender');
    const target = state.defenders.find((entry) => entry.id !== mender?.id);
    expect(mender).toBeTruthy();
    expect(target).toBeTruthy();

    state.activeGlobalModifierIds = ['triage_circle'];
    target!.hp = Math.max(1, target!.hp - 5);
    state.phase = 'wave';
    state.pendingSpawns = [];
    state.enemies = [{
      instanceId: 1,
      archetypeId: 'raider',
      tokenStyleId: 0,
      tile: { q: 5, r: -5 },
      hp: 12,
      lastHitByDefenderId: null,
      attackReadyAtMs: 999999,
      moveReadyAtMs: 999999
    }];
    state.nextRegenTickAtMs = 1000;
    const startingHp = target!.hp;

    state = stepState(state, 999, gameContent);
    expect(state.defenders.find((entry) => entry.id === target!.id)?.hp).toBe(startingHp);

    state = stepState(state, 1, gameContent);
    const regenStacks = createSnapshot(state, gameContent).hud.globalModifiers.find((entry) => entry.id === 'triage_circle')?.stackCount ?? 0;
    expect(state.defenders.find((entry) => entry.id === target!.id)?.hp).toBe(startingHp + regenStacks);
  });

  it('clears active global modifiers when starting the next run', () => {
    let state = prepState();
    state.overlayMode = 'intermission';
    state.activeGlobalModifierIds = ['shared_grit', 'triage_circle'];

    state = applyAction(state, { type: 'startNextRun' }, gameContent);

    expect(state.activeGlobalModifierIds).toEqual([]);
    expect(state.globalModifierDraftOffers).toEqual([]);
  });

  it('does not show dead defenders in roster entries and keeps only five death log items in the hud', () => {
    const state = prepState();
    for (let index = 0; index < 6; index += 1) {
      state.deathLog.push({
        id: index + 1,
        wave: index + 1,
        heroName: `Hero ${index + 1}`,
        heroTitle: 'Test',
        enemyName: 'Goblin Raider',
        text: `Wave ${index + 1} · Hero ${index + 1} fell in a very silly way.`
      });
    }
    const defender = state.defenders.find((entry) => entry.location === 'ready');
    expect(defender).toBeTruthy();
    defender!.location = 'dead';

    const snapshot = createSnapshot(state, gameContent);

    expect(snapshot.hud.rosterEntries.some((entry) => entry.id === defender!.id)).toBe(false);
    expect(snapshot.hud.deathLogEntries).toHaveLength(5);
    expect(snapshot.hud.deathLogEntries[0].wave).toBe(1);
    expect(snapshot.hud.deathLogEntries[4].wave).toBe(5);
  });

  it('unlocks the Beer Shop from the metashop and generates tier-one offers', () => {
    let state = prepState();
    state.overlayMode = 'intermission';
    state.phase = 'lost';
    state.meta.shopUnlocked = true;
    state.meta.steam = 20;

    state = applyAction(state, { type: 'buyMetaUpgrade', upgradeId: 'beer_shop_unlock' }, gameContent);
    const snapshot = createSnapshot(state, gameContent);

    expect(state.meta.upgrades.beer_shop_unlock).toBe(1);
    expect(state.beerShopOffers).toHaveLength(3);
    expect(snapshot.hud.beerShopUnlocked).toBe(true);
    expect(snapshot.hud.beerActiveSlotCap).toBe(1);
  });

  it('lets the player buy and stack the same beer', () => {
    let state = prepState();
    state.overlayMode = 'intermission';
    state.phase = 'lost';
    state.meta.shopUnlocked = true;
    state.meta.steam = 30;
    state.meta.upgrades.beer_shop_unlock = 1;
    state = createInitialState(gameContent, state.meta, 42, true, false);

    const offer = state.beerShopOffers[0];
    expect(offer).toBeTruthy();

    state = applyAction(state, { type: 'buyBeerShopOffer', offerId: offer.offerId }, gameContent);
    state = applyAction(state, { type: 'buyBeerShopOffer', offerId: offer.offerId }, gameContent);
    const active = state.activeAlcohols.find((entry) => entry.alcoholId === offer.alcoholId);

    expect(state.activeAlcohols).toHaveLength(1);
    expect(active?.stacks).toBe(2);
  });

  it('lets the player buy beer with the beer shop unlock even if the metashop is still locked', () => {
    const meta = createDefaultMetaProgress();
    meta.shopUnlocked = false;
    meta.steam = 30;
    meta.upgrades.beer_shop_unlock = 1;

    let state = createInitialState(gameContent, meta, 42, false, false);
    const snapshot = createSnapshot(state, gameContent);
    const offer = state.beerShopOffers[0];

    expect(offer).toBeTruthy();
    expect(snapshot.hud.beerShopOffers[0]?.canBuy).toBe(true);

    state = applyAction(state, { type: 'buyBeerShopOffer', offerId: offer.offerId }, gameContent);

    expect(state.activeAlcohols).toHaveLength(1);
    expect(state.activeAlcohols[0]?.alcoholId).toBe(offer.alcoholId);
  });

  it('blocks a different beer when active drink slots are full but still allows stacking the current one', () => {
    let state = prepState();
    state.overlayMode = 'intermission';
    state.phase = 'lost';
    state.meta.shopUnlocked = true;
    state.meta.steam = 40;
    state.meta.upgrades.beer_shop_unlock = 1;
    state = createInitialState(gameContent, state.meta, 123, true, false);

    expect(state.beerShopOffers.length).toBeGreaterThanOrEqual(2);
    const first = state.beerShopOffers[0];
    const second = state.beerShopOffers.find((offer) => offer.alcoholId !== first.alcoholId)!;

    state = applyAction(state, { type: 'buyBeerShopOffer', offerId: first.offerId }, gameContent);
    state = applyAction(state, { type: 'buyBeerShopOffer', offerId: second.offerId }, gameContent);

    expect(state.activeAlcohols).toHaveLength(1);
    expect(state.activeAlcohols[0].alcoholId).toBe(first.alcoholId);
    expect(state.message).toContain('No free drink slot');

    state = applyAction(state, { type: 'buyBeerShopOffer', offerId: first.offerId }, gameContent);
    expect(state.activeAlcohols[0].stacks).toBe(2);
  });

  it('clears active beers on loss, then carries newly bought intermission beers into the next run', () => {
    let state = prepState();
    state.phase = 'wave';
    state.overlayMode = 'none';
    state.meta.shopUnlocked = true;
    state.meta.upgrades.beer_shop_unlock = 1;
    state.meta.steam = 20;
    state.saunaHp = 1;
    state.pendingSpawns = [];
    state.enemies = [{
      instanceId: 1,
      archetypeId: 'raider',
      tokenStyleId: 0,
      tile: { q: 0, r: 0 },
      hp: 12,
      lastHitByDefenderId: null,
      attackReadyAtMs: 0,
      moveReadyAtMs: 999999
    }];
    state.activeAlcohols = [{ alcoholId: 'light_lager', stacks: 2 }];

    state = stepState(state, 16, gameContent);

    expect(state.overlayMode).toBe('intermission');
    expect(state.activeAlcohols).toHaveLength(0);
    expect(state.beerShopOffers.length).toBe(3);

    const offer = state.beerShopOffers[0];
    state = applyAction(state, { type: 'buyBeerShopOffer', offerId: offer.offerId }, gameContent);
    state = applyAction(state, { type: 'startNextRun' }, gameContent);

    expect(state.overlayMode).toBe('none');
    expect(state.phase).toBe('prep');
    expect(state.activeAlcohols).toEqual([{ alcoholId: offer.alcoholId, stacks: 1 }]);
  });

  it('shows the metashop landmark only once between-run progression becomes relevant', () => {
    let state = prepState();
    let snapshot = createSnapshot(state, gameContent);
    expect(snapshot.hud.worldLandmarks.some((entry) => entry.id === 'metashop')).toBe(false);

    state.meta.completedRuns = 1;
    snapshot = createSnapshot(state, gameContent);
    const lockedShop = snapshot.hud.worldLandmarks.find((entry) => entry.id === 'metashop');
    expect(lockedShop?.visible).toBe(true);
    expect(lockedShop?.locked).toBe(true);
    expect(lockedShop?.enabled).toBe(false);

    state.overlayMode = 'intermission';
    state.phase = 'lost';
    snapshot = createSnapshot(state, gameContent);
    expect(snapshot.hud.worldLandmarks.find((entry) => entry.id === 'metashop')?.enabled).toBe(true);

    state.meta.shopUnlocked = true;
    snapshot = createSnapshot(state, gameContent);
    expect(snapshot.hud.worldLandmarks.find((entry) => entry.id === 'metashop')?.locked).toBe(false);
  });

  it('keeps beer shop landmark and purchases available in prep, wave, and intermission', () => {
    const meta = createDefaultMetaProgress();
    meta.shopUnlocked = true;
    meta.steam = 30;
    meta.upgrades.beer_shop_unlock = 1;

    let state = createInitialState(gameContent, meta, 42, false, false);
    let snapshot = createSnapshot(state, gameContent);
    const prepLandmark = snapshot.hud.worldLandmarks.find((entry) => entry.id === 'beer_shop');
    expect(prepLandmark?.visible).toBe(true);
    expect(prepLandmark?.enabled).toBe(true);
    expect(state.beerShopOffers.length).toBeGreaterThan(0);

    const prepOffer = state.beerShopOffers[0];
    state = applyAction(state, { type: 'buyBeerShopOffer', offerId: prepOffer.offerId }, gameContent);
    expect(state.activeAlcohols).toHaveLength(1);

    state.phase = 'wave';
    state.overlayMode = 'none';
    state.meta.steam = 30;
    const waveOffer = state.beerShopOffers.find((offer) => offer.alcoholId !== prepOffer.alcoholId) ?? state.beerShopOffers[0];
    state = applyAction(state, { type: 'buyBeerShopOffer', offerId: waveOffer.offerId }, gameContent);
    expect(state.activeAlcohols.length).toBeGreaterThan(0);

    state.overlayMode = 'intermission';
    state.phase = 'lost';
    snapshot = createSnapshot(state, gameContent);
    expect(snapshot.hud.worldLandmarks.find((entry) => entry.id === 'beer_shop')?.enabled).toBe(true);
  });

  it('keeps only one non-blocking hud panel open at a time', () => {
    let state = prepState();

    state = applyAction(state, { type: 'openHudPanel', panel: 'modifiers' }, gameContent);
    expect(state.activePanel).toBe('modifiers');

    state = applyAction(state, { type: 'openHudPanel', panel: 'loot' }, gameContent);
    expect(state.activePanel).toBe('loot');
    expect(state.inventoryOpen).toBe(false);

    state.meta.upgrades.inventory_slots = 1;
    state = applyAction(state, { type: 'openHudPanel', panel: 'loot' }, gameContent);
    expect(state.activePanel).toBeNull();

    state = applyAction(state, { type: 'toggleRecruitment' }, gameContent);
    expect(state.activePanel).toBe('recruit');
    expect(state.recruitmentOpen).toBe(true);

    state = applyAction(state, { type: 'selectWorldLandmark', landmarkId: 'metashop' }, gameContent);
    expect(state.activePanel).toBe('recruit');

    state.meta.completedRuns = 1;
    state = applyAction(state, { type: 'selectWorldLandmark', landmarkId: 'metashop' }, gameContent);
    expect(state.activePanel).toBe('metashop');
    expect(state.selectedWorldLandmarkId).toBe('metashop');
  });
});
