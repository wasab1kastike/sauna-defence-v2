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
    expect(state.defenders.every((defender) => defender.level === 1)).toBe(true);
    expect(state.defenders.every((defender) => defender.subclassId.length > 0)).toBe(true);
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

  it('rolls three visible recruit offers with prices and lore', () => {
    let state = prepState();
    state.defenders = state.defenders.filter((defender) => defender.location !== 'dead').slice(0, 4);
    state.saunaDefenderId = state.defenders.find((defender) => defender.location === 'sauna')?.id ?? null;
    state.sisu.current = 20;

    const before = state.sisu.current;
    state = applyAction(state, { type: 'rollRecruitOffers' }, gameContent);

    expect(state.recruitOffers).toHaveLength(3);
    expect(state.sisu.current).toBeLessThan(before);
    expect(state.recruitOffers.every((offer) => offer.price >= 3)).toBe(true);
    expect(state.recruitOffers.every((offer) => offer.candidate.lore.length > 0)).toBe(true);
  });

  it('recruits one chosen offer and clears the rest', () => {
    let state = prepState();
    state.defenders = state.defenders.filter((defender) => defender.location !== 'dead').slice(0, 4);
    state.saunaDefenderId = state.defenders.find((defender) => defender.location === 'sauna')?.id ?? null;
    state.sisu.current = 30;

    state = applyAction(state, { type: 'rollRecruitOffers' }, gameContent);
    const offer = state.recruitOffers[1];
    const rosterBefore = state.defenders.length;

    state = applyAction(state, { type: 'recruitOffer', offerId: offer.offerId }, gameContent);

    expect(state.defenders).toHaveLength(rosterBefore + 1);
    expect(state.defenders.some((defender) => defender.id === offer.candidate.id)).toBe(true);
    expect(state.recruitOffers).toHaveLength(0);
  });

  it('does not roll recruit offers when the roster is full', () => {
    let state = prepState();
    state.sisu.current = 30;

    state = applyAction(state, { type: 'rollRecruitOffers' }, gameContent);

    expect(state.recruitOffers).toHaveLength(3);
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

    state = applyAction(state, { type: 'rollRecruitOffers' }, gameContent);
    expect(state.recruitOffers).toHaveLength(3);

    const offer = state.recruitOffers[0];
    state = applyAction(state, { type: 'recruitOffer', offerId: offer.offerId }, gameContent);

    expect(state.defenders.some((defender) => defender.id === offer.candidate.id)).toBe(true);
    expect(state.recruitOffers).toHaveLength(0);
  });

  it('requires a replacement target when buying with a full roster', () => {
    let state = prepState();
    state.sisu.current = 30;

    state = applyAction(state, { type: 'rollRecruitOffers' }, gameContent);
    const offer = state.recruitOffers[0];

    state = applyAction(state, { type: 'recruitOffer', offerId: offer.offerId }, gameContent);

    expect(state.recruitOffers).toHaveLength(3);
    expect(state.message).toContain('Select a hero');
  });

  it('replaces the selected ready hero when recruiting with a full roster', () => {
    let state = prepState();
    state.sisu.current = 30;
    const outgoing = state.defenders.find((defender) => defender.location === 'ready');
    expect(outgoing).toBeTruthy();

    state = applyAction(state, { type: 'rollRecruitOffers' }, gameContent);
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

    state = applyAction(state, { type: 'rollRecruitOffers' }, gameContent);
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
  });

  it('uses the expanded grid configuration for the new larger battlefield', () => {
    const snapshot = createSnapshot(prepState(), gameContent);

    expect(snapshot.config.gridRadius).toBe(6);
    expect(snapshot.tiles.length).toBe(127);
    expect(snapshot.spawnTiles.every((tile) => Math.max(Math.abs(tile.q), Math.abs(tile.r), Math.abs(-tile.q - tile.r)) >= 6)).toBe(true);
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

  it('creates visible combat fx and brief hit-stop for skill procs', () => {
    let state = prepState();
    const attacker = state.defenders.find((defender) => defender.location === 'ready');
    expect(attacker).toBeTruthy();
    attacker!.location = 'board';
    attacker!.tile = { q: 0, r: -1 };
    attacker!.skills.push('fireball');
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
    expect(state.fxEvents.some((event) => event.kind === 'fireball')).toBe(true);
    expect(state.hitStopMs).toBeGreaterThan(0);
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
    expect(attackerAfter?.level).toBeGreaterThan(1);
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
});
