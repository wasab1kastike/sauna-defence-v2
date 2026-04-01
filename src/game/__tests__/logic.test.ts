import { gameContent } from '../../content/gameContent';
import {
  applyAction,
  createWaveDefinition,
  createDefaultMetaProgress,
  createInitialState,
  createSnapshot,
  stepState
} from '../logic';

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

  it('creates a named starter roster with one sauna defender', () => {
    const state = prepState();

    expect(state.defenders).toHaveLength(5);
    expect(state.defenders.filter((defender) => defender.location === 'sauna')).toHaveLength(1);
    expect(state.defenders.every((defender) => defender.name.length > 0)).toBe(true);
    expect(state.defenders.every((defender) => defender.lore.length > 0)).toBe(true);
  });

  it('opens the meta shop before a fresh run when requested', () => {
    const state = createInitialState(gameContent, createDefaultMetaProgress(), 42);

    expect(state.overlayMode).toBe('none');
    expect(state.phase).toBe('prep');
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

  it('heals the sauna defender and auto-continues to the next non-boss wave', () => {
    let state = prepState();
    const saunaDefender = state.defenders.find((defender) => defender.location === 'sauna');
    expect(saunaDefender).toBeTruthy();
    saunaDefender!.hp = 1;
    state.phase = 'wave';
    state.currentWave = { index: 1, isBoss: false, rewardSisu: 3, pressure: 4, pattern: 'tutorial', bossCategory: null, spawns: [] };
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
    state.currentWave = { index: 4, isBoss: false, rewardSisu: 3, pressure: 11, pattern: 'staggered', bossCategory: null, spawns: [] };
    state.pendingSpawns = [];
    state.enemies = [];

    const next = stepState(state, 16, gameContent);

    expect(next.phase).toBe('prep');
    expect(next.currentWave.index).toBe(5);
    expect(next.currentWave.isBoss).toBe(true);
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
      pressure: 18,
      pattern: 'boss_pressure',
      bossCategory: 'pressure',
      spawns: [{ atMs: 0, enemyId: 'chieftain', laneIndex: 0 }]
    };

    const snapshot = createSnapshot(state, gameContent);
    expect(snapshot.hud.isBossWave).toBe(true);
    expect(snapshot.hud.wavePreview[0].id).toBe('chieftain');
  });

  it('alternates boss identities and spawn shapes across cycles', () => {
    const firstBoss = createWaveDefinition(5, gameContent);
    const secondBoss = createWaveDefinition(10, gameContent);

    expect(firstBoss.bossCategory).toBe('pressure');
    expect(secondBoss.bossCategory).toBe('breach');
    expect(firstBoss.pattern).not.toBe(secondBoss.pattern);
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
    state.inventory.push({
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

  it('keeps inventory closed by default and toggles it open', () => {
    let state = prepState();

    expect(state.inventoryOpen).toBe(false);

    state = applyAction(state, { type: 'toggleInventory' }, gameContent);
    expect(state.inventoryOpen).toBe(true);

    state = applyAction(state, { type: 'toggleInventory' }, gameContent);
    expect(state.inventoryOpen).toBe(false);
  });

  it('auto-assigns loot to the selected defender first when a slot is free', () => {
    let state = prepState();
    const target = state.defenders.find((defender) => defender.location === 'ready');
    expect(target).toBeTruthy();
    state.inventory.push({
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
    expect(state.inventory).toHaveLength(0);
  });

  it('falls back to another defender when the selected one has no valid slot', () => {
    let state = prepState();
    const selected = state.defenders.find((defender) => defender.location === 'ready');
    const backup = state.defenders.find((defender) => defender.location === 'board') ?? state.defenders.find((defender) => defender.id !== selected?.id);
    expect(selected).toBeTruthy();
    expect(backup).toBeTruthy();

    selected!.skills.push('fireball');
    state.inventory.push({
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
    expect(state.inventory).toHaveLength(0);
  });
});
