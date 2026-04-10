/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck
import { gameContent } from '../../content/gameContent';
import {
  applyAction,
  createDefaultMetaProgress,
  createInitialState,
  createSnapshot,
  createWaveDefinition,
  stepState
} from '../logic';
import { resolveSpeechBubbleAnchor } from '../render';

function prepState(seed = 42, meta = createDefaultMetaProgress()) {
  const state = createInitialState(gameContent, meta, seed, false);
  const buildDefender = (templateId, index, location) => {
    const source = createInitialState(gameContent, createDefaultMetaProgress(), 42 + index, false)
      .recruitOffers.find((offer) => offer !== null).candidate;
    const template = gameContent.defenderTemplates[templateId];
    return {
      ...source,
      id: `${templateId}-speech-${index}`,
      templateId,
      name: `${template.name} ${index}`,
      title: `Speaker ${index}`,
      lore: `${template.name} speech defender`,
      stats: { ...template.stats },
      hp: template.stats.maxHp,
      location,
      tile: null,
      homeTile: null,
      motion: null,
      level: 1,
      xp: 0,
      items: [],
      skills: [],
      kills: 0,
      lastHitByEnemyId: null
    };
  };

  state.defenders = [
    buildDefender('guardian', 1, 'ready'),
    buildDefender('hurler', 2, 'ready'),
    buildDefender('mender', 3, 'ready'),
    buildDefender('guardian', 4, 'ready'),
    buildDefender('hurler', 5, 'sauna')
  ];
  state.saunaDefenderId = state.defenders.find((defender) => defender.location === 'sauna')?.id ?? null;
  return state;
}

function createBeerMeta() {
  const meta = createDefaultMetaProgress();
  meta.shopUnlocked = true;
  meta.completedRuns = 1;
  meta.steam = 200;
  meta.upgrades.beer_shop_unlock = 1;
  meta.upgrades.beer_shop_level = 2;
  return meta;
}

function findSeed(run, predicate, maxSeed = 4000) {
  for (let seed = 1; seed <= maxSeed; seed += 1) {
    const result = run(seed);
    if (predicate(result)) return result;
  }
  throw new Error('No deterministic seed found for speech test');
}

describe('speech bubbles', () => {
  it('creates ally-death speech for another living visible defender', () => {
    const result = findSeed(
      (seed) => {
        let state = prepState(seed);
        const fallen = state.defenders[0];
        const witness = state.defenders[1];
        state.phase = 'wave';
        state.overlayMode = 'none';
        state.pendingSpawns = [];
        fallen.location = 'board';
        fallen.tile = { q: 0, r: -1 };
        fallen.homeTile = { q: 0, r: -1 };
        fallen.hp = 1;
        fallen.attackReadyAtMs = 999999;
        witness.location = 'board';
        witness.tile = { q: 2, r: -1 };
        witness.homeTile = { q: 2, r: -1 };
        witness.attackReadyAtMs = 999999;
        state.enemies = [{
          instanceId: 1,
          archetypeId: 'brute',
          tokenStyleId: 0,
          tile: { q: 0, r: 0 },
          hp: gameContent.enemyArchetypes.brute.maxHp,
          lastHitByDefenderId: null,
          attackReadyAtMs: 0,
          moveReadyAtMs: 999999,
          nextAbilityAtMs: Number.POSITIVE_INFINITY,
          pathIndex: null,
          spawnLaneIndex: 0,
          spawnedByEnemyInstanceId: null
        }];
        state = stepState(state, 16, gameContent);
        return { state, fallenId: fallen.id };
      },
      ({ state, fallenId }) =>
        state.defenders.find((entry) => entry.id === fallenId)?.location === 'dead'
        && state.speechBubbles[0]?.speaker?.kind === 'defender'
        && state.speechBubbles[0].speaker.defenderId !== fallenId
    );

    expect(result.state.speechBubbles).toHaveLength(1);
  });

  it('creates a speech bubble after a beer shop purchase and anchors it to a visible speaker', () => {
    const meta = createBeerMeta();
    let state = prepState(42, meta);
    const boardDefender = state.defenders[0];
    boardDefender.location = 'board';
    boardDefender.tile = { q: 1, r: -1 };
    boardDefender.homeTile = { q: 1, r: -1 };
    const offer = state.beerShopOffers[0];

    state = applyAction(state, { type: 'buyBeerShopOffer', offerId: offer.offerId }, gameContent);

    expect(state.speechBubbles).toHaveLength(1);
    expect(['defender', 'landmark']).toContain(state.speechBubbles[0].speaker.kind);
    expect(resolveSpeechBubbleAnchor(createSnapshot(state, gameContent), state.speechBubbles[0], 900, 700)).not.toBeNull();
  });

  it('replaces an older bubble when the same speaker talks again', () => {
    const meta = createBeerMeta();
    const result = findSeed(
      (seed) => {
        let state = prepState(seed, meta);
        const offer = state.beerShopOffers[0];
        state = applyAction(state, { type: 'buyBeerShopOffer', offerId: offer.offerId }, gameContent);
        state = stepState(state, 1900, gameContent);
        const firstId = state.speechBubbles[0]?.id ?? null;
        state = applyAction(state, { type: 'buyBeerShopOffer', offerId: offer.offerId }, gameContent);
        return { state, firstId };
      },
      ({ state, firstId }) =>
        state.speechBubbles.length === 1
        && state.speechBubbles[0].speaker.kind === 'landmark'
        && state.speechBubbles[0].id !== firstId
    );

    expect(result.state.speechBubbles).toHaveLength(1);
    expect(result.state.speechBubbles[0].speaker).toEqual({ kind: 'landmark', landmarkId: 'beer_shop' });
  });

  it('caps active speech bubbles at three when a fourth speaker is added', () => {
    let state = prepState(42);
    state.phase = 'wave';
    state.overlayMode = 'none';
    state.currentWave = createWaveDefinition(5, gameContent);
    state.pendingSpawns = [];
    state.speechBubbles = [
      { id: 1, speaker: { kind: 'defender', defenderId: state.defenders[0].id }, text: 'one', ageMs: 100, durationMs: 2400 },
      { id: 2, speaker: { kind: 'landmark', landmarkId: 'beer_shop' }, text: 'two', ageMs: 300, durationMs: 2400 },
      { id: 3, speaker: { kind: 'defender', defenderId: state.defenders[1].id }, text: 'three', ageMs: 150, durationMs: 2400 }
    ];
    state.nextSpeechBubbleId = 4;
    state.enemies = [{
      instanceId: 77,
      archetypeId: 'pebble',
      tokenStyleId: 0,
      tile: { q: 0, r: -6 },
      hp: gameContent.enemyArchetypes.pebble.maxHp,
      lastHitByDefenderId: null,
      attackReadyAtMs: 999999,
      moveReadyAtMs: 999999,
      nextAbilityAtMs: Number.POSITIVE_INFINITY,
      pathIndex: 0,
      pebbleEncounterMaxHp: gameContent.enemyArchetypes.pebble.maxHp,
      spawnLaneIndex: 0,
      spawnedByEnemyInstanceId: null
    }];

    state = stepState(state, 16, gameContent);

    expect(state.speechBubbles).toHaveLength(3);
    expect(state.speechBubbles.some((bubble) => bubble.speaker.kind === 'enemy' && bubble.speaker.enemyInstanceId === 77)).toBe(true);
    expect(state.speechBubbles.some((bubble) => bubble.id === 2)).toBe(false);
  });

  it('creates a boss intro bubble when a boss wave is active', () => {
    let state = prepState(42);
    state.phase = 'wave';
    state.overlayMode = 'none';
    state.currentWave = createWaveDefinition(5, gameContent);
    state.pendingSpawns = [];
    state.enemies = [{
      instanceId: 12,
      archetypeId: 'pebble',
      tokenStyleId: 0,
      tile: { q: 0, r: -6 },
      hp: gameContent.enemyArchetypes.pebble.maxHp,
      lastHitByDefenderId: null,
      attackReadyAtMs: 999999,
      moveReadyAtMs: 999999,
      nextAbilityAtMs: Number.POSITIVE_INFINITY,
      pathIndex: 0,
      pebbleEncounterMaxHp: gameContent.enemyArchetypes.pebble.maxHp,
      spawnLaneIndex: 0,
      spawnedByEnemyInstanceId: null
    }];

    state = stepState(state, 16, gameContent);

    expect(state.speechBubbles[0]?.speaker).toEqual({ kind: 'enemy', enemyInstanceId: 12 });
    expect(['Pebble', 'Pebbles', 'Yum Yum']).toContain(state.speechBubbles[0]?.text);
  });

  it('limits Pebble speech lines to the short approved callouts', () => {
    const allowed = ['Pebble', 'Pebbles', 'Yum Yum'];

    expect(gameContent.speech.bosses.pebble.intro).toEqual(allowed);
    expect(gameContent.speech.bosses.pebble.proc).toEqual(allowed);
  });

  it('creates a boss proc bubble when an electric boss ability fires', () => {
    let state = prepState(42);
    const target = state.defenders[0];
    target.location = 'board';
    target.tile = { q: 0, r: -1 };
    target.homeTile = { q: 0, r: -1 };
    target.attackReadyAtMs = 999999;
    state.phase = 'wave';
    state.overlayMode = 'none';
    state.currentWave = createWaveDefinition(15, gameContent);
    state.pendingSpawns = [];
    state.bossIntroSpokenWaveIndex = state.currentWave.index;
    state.bossSpeechReadyAtMs = 0;
    state.enemies = [{
      instanceId: 31,
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

    expect(state.speechBubbles.some((bubble) => bubble.speaker.kind === 'enemy' && bubble.speaker.enemyInstanceId === 31)).toBe(true);
  });

  it('ages and removes expired speech bubbles during prep', () => {
    let state = prepState(42);
    state.speechBubbles = [
      { id: 1, speaker: { kind: 'landmark', landmarkId: 'beer_shop' }, text: 'old', ageMs: 2300, durationMs: 2400 }
    ];
    state.nextSpeechBubbleId = 2;

    state = stepState(state, 120, gameContent);

    expect(state.speechBubbles).toEqual([]);
  });

  it('resolves anchors for defender, landmark and end-user horde speakers', () => {
    const meta = createBeerMeta();
    const state = prepState(42, meta);
    const defender = state.defenders[0];
    defender.location = 'board';
    defender.tile = { q: 1, r: -1 };
    defender.homeTile = { q: 1, r: -1 };
    state.currentWave = createWaveDefinition(10, gameContent);
    state.enemies = [{
      instanceId: 55,
      archetypeId: 'thirsty_user',
      tokenStyleId: 0,
      tile: { q: 3, r: -3 },
      hp: gameContent.enemyArchetypes.thirsty_user.maxHp,
      lastHitByDefenderId: null,
      attackReadyAtMs: 999999,
      moveReadyAtMs: 999999,
      nextAbilityAtMs: Number.POSITIVE_INFINITY,
      pathIndex: null,
      spawnLaneIndex: 0,
      spawnedByEnemyInstanceId: null
    }];
    const snapshot = createSnapshot(state, gameContent);

    expect(resolveSpeechBubbleAnchor(snapshot, { id: 1, speaker: { kind: 'defender', defenderId: defender.id }, text: 'hi', ageMs: 0, durationMs: 2400 }, 900, 700)?.tone).toBe('defender');
    expect(resolveSpeechBubbleAnchor(snapshot, { id: 2, speaker: { kind: 'landmark', landmarkId: 'beer_shop' }, text: 'hi', ageMs: 0, durationMs: 2400 }, 900, 700)?.tone).toBe('landmark');
    expect(resolveSpeechBubbleAnchor(snapshot, { id: 3, speaker: { kind: 'enemy', enemyInstanceId: 55 }, text: 'hi', ageMs: 0, durationMs: 2400 }, 900, 700)?.tone).toBe('boss');
    expect(resolveSpeechBubbleAnchor(snapshot, { id: 4, speaker: { kind: 'enemy', enemyInstanceId: 999 }, text: 'hi', ageMs: 0, durationMs: 2400 }, 900, 700)).toBeNull();
  });
});
