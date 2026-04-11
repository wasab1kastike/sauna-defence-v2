import type {
  ActiveBoilingOrbit,
  ActiveAlcoholBuff,
  AlcoholDefinition,
  AlcoholId,
  AlcoholModifier,
  AxialCoord,
  BeerShopOffer,
  BoardExpansionDirection,
  BossId,
  CombatFxEvent,
  CombatFxKind,
  DefenderInstance,
  DefenderSubclassId,
  DefenderSubclassDefinition,
  DefenderTemplateId,
  EnemyBehavior,
  EnemyInstance,
  EnemyUnitId,
  GameContent,
  GameSnapshot,
  GlobalModifierId,
  GlobalModifierDefinition,
  GlobalModifierEffectStat,
  HudNameMasteryEntry,
  HudPanelId,
  HudViewModel,
  HudWorldLandmarkEntry,
  InputAction,
  InventoryDrop,
  ItemId,
  LootKind,
  MetaProgress,
  MetaUpgradeId,
  NameMasteryId,
  PendingEmberStormStrike,
  PendingFireball,
  PendingSaunaQuake,
  PebbleBottleTarget,
  RecruitDestination,
  Rarity,
  RecruitOffer,
  RunPreferences,
  RunState,
  SurnameMasteryId,
  SkillId,
  SpeechBubbleInstance,
  SpeechSpeakerRef,
  SubclassDraftRequest,
  TitleMasteryId,
  UnitMotionState,
  UnitStats,
  WaveDefinition,
  WavePattern,
  WavePreviewEntry,
  WaveSpawn,
  WorldLandmarkId
} from './types';
import { bossRotation, nonBossPatterns, tutorialWaves, type BossRotationEntry } from '../content/waves';
import {
  add as addCoord,
  cloneCoord as cloneAxialCoord,
  coordKey as coordKeyFromGeometry,
  createHexGrid as createHexGridFromGeometry,
  hexDistance as hexDistanceFromGeometry,
  rotateCoord as rotateCoordFromGeometry
} from './geometry';
import {
  boardExpansionDirectionLabel,
  boardExpansionDirections as allBoardExpansionDirections,
  buildBoardFootprint as resolveBoardFootprint,
  createLandmarkTilesForState as resolveCreateLandmarkTilesForState,
  currentSpawnLanes as resolveCurrentSpawnLanes,
  isBuildableTile as resolveIsBuildableTile,
  isTileInBoard as resolveIsTileInBoard,
  landmarkTileForState as resolveLandmarkTileForState
} from './boardGeometry';
import {
  createSaunaReserveEntry
} from './hudSelectors';
import {
  addRecruitToReserve as addRecruitToReserveFromModule,
  benchRerollCost as benchRerollCostFromModule,
  canRerollSaunaDefender as canRerollSaunaDefenderFromModule,
  fillDefenderToMax as fillDefenderToMaxFromModule,
  recruitLevelUpCost as recruitLevelUpCostFromModule,
  recruitRollCost as recruitRollCostFromModule,
  recruitmentStatusText as recruitmentStatusTextFromModule,
  saunaRerollCost as saunaRerollCostFromModule
} from './recruitment';
import {
  autoFillSaunaFromBench as autoFillSaunaFromBenchFromModule,
  rerollSaunaDefenderIdentityAndStats as rerollSaunaDefenderIdentityAndStatsFromModule
} from './sauna';

const DIRS: AxialCoord[] = [
  { q: 1, r: 0 },
  { q: 1, r: -1 },
  { q: 0, r: -1 },
  { q: -1, r: 0 },
  { q: -1, r: 1 },
  { q: 0, r: 1 }
];
const DEF_IDS: DefenderTemplateId[] = ['guardian', 'hurler', 'mender'];
const MAX_DEFENDER_LEVEL = 20;
const SUBCLASS_MILESTONE_LEVELS = [5, 10, 15, 20] as const;
const ENEMY_IDS: EnemyUnitId[] = [
  'raider',
  'brute',
  'chieftain',
  'pebble',
  'thirsty_user',
  'electric_bather',
  'escalation_manager'
];
const META_IDS: MetaUpgradeId[] = [
  'roster_capacity',
  'inventory_slots',
  'loot_luck',
  'loot_rarity',
  'loot_auto_assign',
  'loot_auto_upgrade',
  'item_slots',
  'hall_of_fame_unlock',
  'beer_shop_unlock',
  'beer_shop_level',
  'sauna_auto_deploy',
  'sauna_slap_swap'
];
const REPEATABLE_META_UPGRADE_IDS: MetaUpgradeId[] = [
  'roster_capacity',
  'inventory_slots',
  'loot_luck',
  'loot_rarity',
  'item_slots',
  'beer_shop_level'
];
const TITLE_MASTERY_IDS: TitleMasteryId[] = [
  'laudekuningas',
  'loylylordi',
  'vihtavelho',
  'kiuaskuiskaaja',
  'hoyryruhtinas'
];
const SURNAME_MASTERY_IDS: SurnameMasteryId[] = [
  'kivinen',
  'saarinen',
  'askala',
  'lehtinen',
  'ekberg'
];
const META_SHOP_LABEL = 'Sauna Kiosk';
const HALL_OF_FAME_LABEL = 'Sauna Hall of Fame';
const CENTER: AxialCoord = { q: 0, r: 0 };
const WORLD_LANDMARK_IDS: WorldLandmarkId[] = ['metashop', 'hall_of_fame', 'beer_shop'];
const RECRUIT_MARKET_SLOT_COUNT = 4;
const RECRUIT_SLOT_HOTKEYS = ['A', 'S', 'D', 'F'] as const;
const BLINK_STEP_COOLDOWN_MS = 12000;
const THUNDER_RUN_COOLDOWN_MS = 8000;
const BATTLE_HYMN_COOLDOWN_MS = 15000;
const BATTLE_HYMN_BUFF_MS = 3000;
const BOILING_ORBIT_COOLDOWN_MS = 9000;
const BOILING_ORBIT_DURATION_MS = 4000;
const BOILING_ORBIT_TICK_MS = 600;
const FIREBALL_COOLDOWN_MS = 12000;
const FIREBALL_DELAY_MS = 1000;
const FIREBALL_RADIUS = 2;
const SAUNA_QUAKE_COOLDOWN_MS = 10000;
const SAUNA_QUAKE_DELAY_MS = 700;
const EMBER_STORM_COOLDOWN_MS = 14000;
const EMBER_STORM_STRIKE_DELAY_MS = 260;
const EMBER_STORM_STRIKE_STEP_MS = 260;
const AUTOPLAY_DELAY_MS = 650;
const SPEECH_BUBBLE_DURATION_MS = 2400;
const SPEECH_BUBBLE_LIMIT = 3;
const SPEECH_SAME_SPEAKER_THROTTLE_MS = 1800;
const DEFENDER_KILL_SPEECH_PROC = 0.25;
const ALLY_DEATH_SPEECH_PROC = 0.55;
const BOSS_SPEECH_COOLDOWN_MS = 4500;
const EMPTY_STATS: UnitStats = {
  maxHp: 0,
  damage: 0,
  heal: 0,
  range: 0,
  attackCooldownMs: 0,
  defense: 0,
  regenHpPerSecond: 0
};
const GLOBAL_MODIFIER_STAT_ORDER: GlobalModifierEffectStat[] = [
  'maxHp',
  'damage',
  'heal',
  'range',
  'attackCooldownMs',
  'defense',
  'regenHpPerSecond'
];
const RARITY_ORDER: Rarity[] = ['common', 'rare', 'epic', 'legendary'];
const RARITY_WEIGHT_BY_WAVE: Record<number, Record<Rarity, number>> = {
  1: { common: 6, rare: 4, epic: 0, legendary: 0 },
  2: { common: 4, rare: 4, epic: 2, legendary: 0 },
  3: { common: 3, rare: 4, epic: 3, legendary: 1 }
};
const ELECTRIC_BATHER_ABILITY_COOLDOWN_MS = 5200;
const ESCALATION_MANAGER_ABILITY_COOLDOWN_MS = 6000;
const END_USER_HORDE_START_MOMENTUM = 3;
const END_USER_HORDE_MAX_MOMENTUM = 12;
const END_USER_HORDE_TIER_ONE_MIN = 4;
const END_USER_HORDE_TIER_TWO_MIN = 8;
const END_USER_HORDE_TIER_ONE_MOVE_BONUS_MS = 140;
const END_USER_HORDE_TIER_TWO_MOVE_BONUS_MS = 220;
const END_USER_HORDE_TIER_TWO_SWARM_CAP = 7;
const END_USER_HORDE_BASE_SWARM_CAP = 5;
const END_USER_HORDE_SURGE_COOLDOWN_MS = 4200;
const END_USER_HORDE_SURGE_MOVE_READY_MS = 120;
const STEP_MOTION_DURATION_MS = 240;
const PEBBLE_MOTION_DURATION_MS = 520;
const PEBBLE_DEVOUR_STACK_CAP = 6;
const PEBBLE_DEVOUR_DAMAGE_PER_STACK = 2;
const PEBBLE_DEVOUR_HEAL_RATIO = 0.35;
const PEBBLE_BOTTLE_TARGET_COUNT = 3;
const PEBBLE_BOTTLE_DAMAGE_PER_STACK = 2;
const PEBBLE_FIRST_ENCOUNTER_DAMAGE_PENALTY = 4;
const PEBBLE_BASE_MAX_HP = 260;
const PEBBLE_MAX_HP_STEP = 60;
const PEBBLE_BOTTLE_HUNT_MOVE_COOLDOWN_MS = 1600;
const PEBBLE_BOTTLE_HUNT_MOVE_COOLDOWN_STEP = 140;
const PEBBLE_PATH_MOVE_COOLDOWN_MS = 2080;
const PEBBLE_PATH_MOVE_COOLDOWN_STEP = 160;
const ENEMY_BOSS_STAT_SCALING_MULTIPLIER = 0.7;
const ENEMY_NORMAL_STAT_SCALING_MULTIPLIER = 0.6;
const LIVE_SAUNA_RETREAT_SISU_COST = 3;
const LIVE_SAUNA_RETREAT_COOLDOWN_MS = 12000;
const BLINK_MOTION_DURATION_MS = 320;
const THUNDER_RUN_MOTION_DURATION_MS = 260;
const SPAWN_SETTLE_DURATION_MS = 260;
const PEBBLE_PATH_BASE: AxialCoord[] = [
  { q: 0, r: -6 },
  { q: 1, r: -5 },
  { q: 2, r: -5 },
  { q: 3, r: -4 },
  { q: 3, r: -3 },
  { q: 2, r: -2 },
  { q: 1, r: -2 },
  { q: 1, r: -1 },
  { q: 0, r: -1 }
];

function subclassMilestoneIds(
  content: GameContent,
  templateId: DefenderTemplateId,
  unlockLevel: number
): DefenderSubclassId[] {
  return Object.values(content.defenderSubclasses)
    .filter((definition) => definition.templateId === templateId && definition.unlockLevel === unlockLevel)
    .map((definition) => definition.id);
}
const DEATH_LINES: Record<EnemyUnitId, string[]> = {
  raider: [
    'got splashed with cold water at exactly the wrong moment',
    'slipped on a stolen birch whisk and vanished under the steam',
    'lost an argument with a bucket of goblin bathwater'
  ],
  brute: [
    'was flattened like a sauna bench under a stone-handed shove',
    'ate a boulder-sized ladle swing and never found the towel back',
    'got folded into the floorboards by a rock-solid body check'
  ],
  chieftain: [
    'was launched into the hot rafters by a steam hog headbutt',
    'took a royal steam blast straight to the dignity',
    'was trampled into legend under a hog-sized heat tantrum'
  ],
  pebble: [
    'was swallowed by a beer worm the size of a bench wagon',
    'got flattened under Pebble on the way to the sauna beers',
    'learned too late that Pebble does not believe in personal space'
  ],
  thirsty_user: [
    'was buried under a flood of thirsty support tickets with legs',
    'tried to explain the outage and got overrun by end-user panic',
    'was trampled by a crowd demanding one more sauna beer'
  ],
  electric_bather: [
    'got chain-shocked across three wet floorboards at once',
    'took an overloaded sauna slap straight through the eyebrows',
    'was flash-fried by a deeply unsafe bathing routine'
  ],
  escalation_manager: [
    'was talked over, ticketed, and escalated into oblivion',
    'got buried under urgent follow-up requests from management',
    'met a terrible fate in a meeting that somehow had adds'
  ]
};

const recruitmentDeps = {
  boardCap,
  boardDefenders,
  canAccessRecruitment,
  clearUnitMotion: (unit: DefenderInstance) => clearUnitMotion(unit),
  derivedMaxHp: (state: RunState, defender: DefenderInstance, content: GameContent) => derivedStats(state, defender, content).maxHp,
  getDefender,
  livingDefenders,
  rosterCap
};

const saunaDeps = {
  boardCap,
  boardDefenders,
  clearUnitMotion: (unit: DefenderInstance) => clearUnitMotion(unit),
  derivedMaxHp: (state: RunState, defender: DefenderInstance, content: GameContent) => derivedStats(state, defender, content).maxHp,
  generateLore,
  generateName,
  randomInt,
  rollBaseStatsForTemplate
};

const hudSelectorDeps = {
  canRerollSaunaDefender: (state: RunState) => canRerollSaunaDefender(state),
  derivedStats: (state: RunState, defender: DefenderInstance, content: GameContent) => derivedStats(state, defender, content),
  saunaRerollCost: (state: RunState) => saunaRerollCost(state),
  subclassSummary
};

export function coordKey(coord: AxialCoord): string {
  return coordKeyFromGeometry(coord);
}

export function sameCoord(left: AxialCoord, right: AxialCoord): boolean {
  return left.q === right.q && left.r === right.r;
}

function add(left: AxialCoord, right: AxialCoord): AxialCoord {
  return addCoord(left, right);
}

function cloneCoord(coord: AxialCoord): AxialCoord {
  return cloneAxialCoord(coord);
}

function assignUnitMotion(
  unit: { motion?: UnitMotionState | null },
  fromTile: AxialCoord,
  toTile: AxialCoord,
  startedAtMs: number,
  durationMs: number,
  style: UnitMotionState['style']
): void {
  unit.motion = {
    fromTile: cloneCoord(fromTile),
    toTile: cloneCoord(toTile),
    startedAtMs,
    durationMs: Math.max(1, durationMs),
    style
  };
}

function clearUnitMotion(unit: { motion?: UnitMotionState | null }): void {
  unit.motion = null;
}

function moveDefenderToTile(
  state: RunState,
  defender: DefenderInstance,
  toTile: AxialCoord,
  style: UnitMotionState['style'],
  durationMs: number,
  fromTile: AxialCoord | null = defender.tile
): void {
  defender.tile = cloneCoord(toTile);
  if (fromTile) {
    assignUnitMotion(defender, fromTile, toTile, state.timeMs, durationMs, style);
  } else {
    clearUnitMotion(defender);
  }
}

function moveEnemyToTile(
  state: RunState,
  enemy: EnemyInstance,
  toTile: AxialCoord,
  style: UnitMotionState['style'],
  durationMs: number,
  fromTile: AxialCoord | null = enemy.tile
): void {
  enemy.tile = cloneCoord(toTile);
  if (fromTile) {
    assignUnitMotion(enemy, fromTile, toTile, state.timeMs, durationMs, style);
  } else {
    clearUnitMotion(enemy);
  }
}

function spawnApproachTile(tile: AxialCoord): AxialCoord {
  const outward = DIRS
    .slice()
    .sort((left, right) => hexDistance(add(tile, right), CENTER) - hexDistance(add(tile, left), CENTER))[0];
  return add(tile, outward);
}

function clearExpiredMotions(state: RunState): void {
  const clearIfExpired = (unit: { motion?: UnitMotionState | null }) => {
    if (!unit.motion) return;
    if (state.timeMs >= unit.motion.startedAtMs + unit.motion.durationMs) {
      unit.motion = null;
    }
  };

  for (const defender of state.defenders) clearIfExpired(defender);
  for (const enemy of state.enemies) clearIfExpired(enemy);
}

function rotateCoord(coord: AxialCoord, times: number): AxialCoord {
  return rotateCoordFromGeometry(coord, times);
}

function bossWaveOrdinal(index: number, content: GameContent): number {
  return Math.max(0, Math.floor(index / content.config.bossEvery) - 1);
}

function bossRotationEntryForWave(index: number, content: GameContent): BossRotationEntry {
  return bossRotation[bossWaveOrdinal(index, content) % bossRotation.length];
}

function bossDisplayName(bossId: BossId | null): string | null {
  return bossRotation.find((entry) => entry.bossId === bossId)?.name ?? null;
}

function bossHint(bossId: BossId | null): string | null {
  return bossRotation.find((entry) => entry.bossId === bossId)?.hint ?? null;
}

function isPebbleBossWave(wave: WaveDefinition): boolean {
  return wave.isBoss && wave.bossId === 'pebble';
}

function isEndUserHordeBossWave(wave: WaveDefinition): boolean {
  return wave.isBoss && wave.bossId === 'end_user_horde';
}

function endUserHordeTierForMomentum(momentum: number): number {
  if (momentum >= END_USER_HORDE_TIER_TWO_MIN) return 2;
  if (momentum >= END_USER_HORDE_TIER_ONE_MIN) return 1;
  return 0;
}

function endUserHordeTierLabel(tier: number): string {
  switch (tier) {
    case 2:
      return 'Stampeding';
    case 1:
      return 'Pressuring';
    case 0:
    default:
      return 'Building';
  }
}

function setEndUserHordeMomentum(state: RunState, momentum: number): void {
  const clamped = Math.max(0, Math.min(END_USER_HORDE_MAX_MOMENTUM, momentum));
  state.endUserHordeMomentum = clamped;
  state.endUserHordeTier = endUserHordeTierForMomentum(clamped);
}

function resetEndUserHordeState(state: RunState): void {
  state.endUserHordeMomentum = 0;
  state.endUserHordeTier = 0;
  state.endUserHordeNextSurgeAtMs = 0;
}

function isWaveBossEnemy(currentWave: WaveDefinition, enemy: EnemyInstance): boolean {
  if (!currentWave.isBoss || !currentWave.bossId) return false;
  switch (currentWave.bossId) {
    case 'pebble':
      return enemy.archetypeId === 'pebble';
    case 'electric_bather':
      return enemy.archetypeId === 'electric_bather';
    case 'escalation_manager':
      return enemy.archetypeId === 'escalation_manager';
    case 'end_user_horde':
      return enemy.archetypeId === 'thirsty_user';
    default:
      return false;
  }
}

function selectedEnemyBossLabel(currentWave: WaveDefinition, enemy: EnemyInstance): string | null {
  if (!isWaveBossEnemy(currentWave, enemy)) return null;
  if (currentWave.bossId === 'end_user_horde') return 'Boss Wave';
  return 'Boss';
}

function enemyBehaviorLabel(enemyId: EnemyUnitId, behavior: EnemyBehavior): string {
  switch (behavior) {
    case 'pebble':
      return 'Tunnels past heroes';
    case 'swarm':
      return 'Swarm scaling';
    case 'electric':
      return 'Chains shocks';
    case 'summoner':
      return 'Summons users';
    case 'standard':
    default:
      return enemyId === 'chieftain' ? 'Elite lane crusher' : 'Rushes the nearest hero';
  }
}

function isBossLootEnemy(enemyId: EnemyUnitId): boolean {
  return enemyId === 'chieftain' || enemyId === 'pebble' || enemyId === 'electric_bather' || enemyId === 'escalation_manager';
}

function isBossThreat(enemy: EnemyInstance): boolean {
  return enemy.archetypeId === 'chieftain' || enemy.archetypeId === 'pebble' || enemy.archetypeId === 'electric_bather' || enemy.archetypeId === 'escalation_manager';
}

export function hexDistance(left: AxialCoord, right: AxialCoord): number {
  return hexDistanceFromGeometry(left, right);
}

export function createHexGrid(radius: number): AxialCoord[] {
  return createHexGridFromGeometry(radius);
}

function currentBoardFootprint(state: RunState, content: GameContent) {
  return resolveBoardFootprint(state, content);
}

function spawnLanesForWave(index: number, content: GameContent): AxialCoord[] {
  void index;
  return content.config.spawnLanes.map((lane) => ({ ...lane }));
}

function currentSpawnLanes(state: RunState, content: GameContent): AxialCoord[] {
  return resolveCurrentSpawnLanes(state, content);
}

function isBuildableTile(state: RunState, tile: AxialCoord, content: GameContent): boolean {
  return resolveIsBuildableTile(state, tile, content);
}

function isTileInBoard(state: RunState, tile: AxialCoord, content: GameContent): boolean {
  return resolveIsTileInBoard(state, tile, content);
}

function landmarkTileForState(state: RunState, landmarkId: WorldLandmarkId, content: GameContent): AxialCoord {
  return resolveLandmarkTileForState(state, landmarkId, content);
}

function createLandmarkTilesForState(state: RunState, content: GameContent): Record<WorldLandmarkId, AxialCoord> {
  return resolveCreateLandmarkTilesForState(state, content);
}

function createDefaultTitleMasteryLevels(): Record<TitleMasteryId, number> {
  return {
    laudekuningas: 0,
    loylylordi: 0,
    vihtavelho: 0,
    kiuaskuiskaaja: 0,
    hoyryruhtinas: 0
  };
}

function createDefaultSurnameMasteryLevels(): Record<SurnameMasteryId, number> {
  return {
    kivinen: 0,
    saarinen: 0,
    askala: 0,
    lehtinen: 0,
    ekberg: 0
  };
}

export function createDefaultMetaProgress(): MetaProgress {
  return {
    steam: 0,
    completedRuns: 0,
    shopUnlocked: false,
    upgrades: {
      roster_capacity: 0,
      inventory_slots: 0,
      loot_luck: 0,
      loot_rarity: 0,
      loot_auto_assign: 0,
      loot_auto_upgrade: 0,
      item_slots: 0,
      hall_of_fame_unlock: 0,
      beer_shop_unlock: 0,
      beer_shop_level: 0,
      sauna_auto_deploy: 0,
      sauna_slap_swap: 0
    },
    activeHallOfFameTitleId: null,
    activeHallOfFameNameId: null,
    hallOfFameTitleLevels: createDefaultTitleMasteryLevels(),
    hallOfFameNameLevels: createDefaultSurnameMasteryLevels()
  };
}

export function createDefaultRunPreferences(): RunPreferences {
  return {
    autoAssignEnabled: false,
    autoUpgradeEnabled: false,
    autoplayEnabled: false
  };
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function rng(state: RunState): number {
  state.seed = (state.seed * 1664525 + 1013904223) >>> 0;
  return state.seed / 0x100000000;
}

function randomInt(state: RunState, min: number, max: number): number {
  return Math.floor(rng(state) * (max - min + 1)) + min;
}

function pick<T>(state: RunState, values: T[]): T {
  return values[randomInt(state, 0, values.length - 1)];
}

function chooseNextExpansionDirection(state: RunState): BoardExpansionDirection {
  const allDirections = allBoardExpansionDirections();
  const usedDirections = new Set(state.boardExpansionDirections);
  const availableDirections = usedDirections.size < allDirections.length
    ? allDirections.filter((direction) => !usedDirections.has(direction))
    : allDirections;
  return pick(state, availableDirections);
}

function formatSpeechLine(text: string, replacements: Record<string, string> = {}): string {
  return text.replace(/\{(\w+)\}/g, (_match, key: string) => replacements[key] ?? '');
}

function sameSpeechSpeaker(left: SpeechSpeakerRef, right: SpeechSpeakerRef): boolean {
  if (left.kind !== right.kind) return false;
  switch (left.kind) {
    case 'defender':
      return left.defenderId === (right as SpeechSpeakerRef & { kind: 'defender' }).defenderId;
    case 'enemy':
      return left.enemyInstanceId === (right as SpeechSpeakerRef & { kind: 'enemy' }).enemyInstanceId;
    case 'landmark':
      return left.landmarkId === (right as SpeechSpeakerRef & { kind: 'landmark' }).landmarkId;
    default:
      return false;
  }
}

function canTriggerSpeechForSpeaker(
  state: RunState,
  speaker: SpeechSpeakerRef,
  minAgeMs = SPEECH_SAME_SPEAKER_THROTTLE_MS
): boolean {
  const active = state.speechBubbles.find((bubble) => sameSpeechSpeaker(bubble.speaker, speaker));
  return !active || active.ageMs >= minAgeMs;
}

function pushSpeechBubble(
  state: RunState,
  speaker: SpeechSpeakerRef,
  text: string,
  durationMs = SPEECH_BUBBLE_DURATION_MS
): void {
  const trimmed = text.trim();
  if (!trimmed) return;
  const bubble: SpeechBubbleInstance = {
    id: state.nextSpeechBubbleId++,
    speaker,
    text: trimmed,
    ageMs: 0,
    durationMs
  };
  const existingIndex = state.speechBubbles.findIndex((entry) => sameSpeechSpeaker(entry.speaker, speaker));
  if (existingIndex >= 0) {
    state.speechBubbles[existingIndex] = bubble;
  } else {
    state.speechBubbles.push(bubble);
  }
  while (state.speechBubbles.length > SPEECH_BUBBLE_LIMIT) {
    let oldestIndex = 0;
    for (let index = 1; index < state.speechBubbles.length; index += 1) {
      if (state.speechBubbles[index].ageMs >= state.speechBubbles[oldestIndex].ageMs) {
        oldestIndex = index;
      }
    }
    state.speechBubbles.splice(oldestIndex, 1);
  }
}

function tickSpeechBubbles(state: RunState, deltaMs: number): void {
  state.speechBubbles = state.speechBubbles
    .map((bubble) => ({ ...bubble, ageMs: bubble.ageMs + deltaMs }))
    .filter((bubble) => bubble.ageMs < bubble.durationMs);
}

function pickLivingVisibleDefenderSpeaker(state: RunState, excludeDefenderId?: string): SpeechSpeakerRef | null {
  const pickFrom = (location: 'board' | 'sauna'): SpeechSpeakerRef | null => {
    const candidates = state.defenders.filter(
      (defender) =>
        defender.id !== excludeDefenderId
        && defender.location === location
        && defender.hp > 0
        && (location !== 'board' || defender.tile)
    );
    if (candidates.length === 0) return null;
    return { kind: 'defender', defenderId: pick(state, candidates).id };
  };

  return pickFrom('board') ?? pickFrom('sauna');
}

function pickBossSpeaker(state: RunState): SpeechSpeakerRef | null {
  if (!state.currentWave.isBoss || !state.currentWave.bossId) return null;
  if (state.currentWave.bossId === 'end_user_horde') {
    const speaker = hordeEnemies(state).find((enemy) => enemy.hp > 0) ?? null;
    return speaker ? { kind: 'enemy', enemyInstanceId: speaker.instanceId } : null;
  }
  const bossEnemy = state.enemies.find(
    (enemy) => enemy.archetypeId === state.currentWave.bossId && enemy.hp > 0
  ) ?? null;
  return bossEnemy ? { kind: 'enemy', enemyInstanceId: bossEnemy.instanceId } : null;
}

function triggerBossIntroSpeech(state: RunState, content: GameContent): void {
  if (!state.currentWave.isBoss || !state.currentWave.bossId) return;
  if (state.bossIntroSpokenWaveIndex === state.currentWave.index) return;
  const speaker = pickBossSpeaker(state);
  if (!speaker) return;
  pushSpeechBubble(state, speaker, pick(state, content.speech.bosses[state.currentWave.bossId].intro));
  state.bossIntroSpokenWaveIndex = state.currentWave.index;
  state.bossSpeechReadyAtMs = state.timeMs + BOSS_SPEECH_COOLDOWN_MS;
}

function maybeTriggerBossProcSpeech(state: RunState, content: GameContent): void {
  if (!state.currentWave.isBoss || !state.currentWave.bossId) return;
  if (state.timeMs < state.bossSpeechReadyAtMs) return;
  const speaker = pickBossSpeaker(state);
  if (!speaker || !canTriggerSpeechForSpeaker(state, speaker)) return;
  pushSpeechBubble(state, speaker, pick(state, content.speech.bosses[state.currentWave.bossId].proc));
  state.bossSpeechReadyAtMs = state.timeMs + BOSS_SPEECH_COOLDOWN_MS;
}

function maybeTriggerDefenderKillSpeech(
  state: RunState,
  killer: DefenderInstance,
  content: GameContent,
  victimName?: string
): void {
  if (killer.location === 'dead' || killer.hp <= 0) return;
  const speaker: SpeechSpeakerRef = { kind: 'defender', defenderId: killer.id };
  if (!canTriggerSpeechForSpeaker(state, speaker)) return;
  if (rng(state) > DEFENDER_KILL_SPEECH_PROC) return;
  pushSpeechBubble(
    state,
    speaker,
    formatSpeechLine(pick(state, content.speech.defender.kill), { victimName: victimName ?? '' })
  );
}

function maybeTriggerAllyDeathSpeech(state: RunState, fallen: DefenderInstance, content: GameContent): void {
  if (rng(state) > ALLY_DEATH_SPEECH_PROC) return;
  const speaker = pickLivingVisibleDefenderSpeaker(state, fallen.id);
  if (!speaker || !canTriggerSpeechForSpeaker(state, speaker)) return;
  pushSpeechBubble(
    state,
    speaker,
    formatSpeechLine(pick(state, content.speech.defender.allyDeath), { victimName: fallen.name })
  );
}

function maybeTriggerBeerShopSpeech(
  state: RunState,
  content: GameContent,
  definition: AlcoholDefinition
): void {
  const defenderSpeaker = pickLivingVisibleDefenderSpeaker(state);
  const bartenderSpeaker: SpeechSpeakerRef = { kind: 'landmark', landmarkId: 'beer_shop' };
  const useBartender = landmarkVisible(state, 'beer_shop') && (!defenderSpeaker || rng(state) < 0.5);
  const speaker = useBartender ? bartenderSpeaker : defenderSpeaker;
  if (!speaker || !canTriggerSpeechForSpeaker(state, speaker)) return;
  const line = useBartender
    ? pick(state, content.speech.beerShop.bartender)
    : pick(state, content.speech.beerShop.defenderReaction);
  pushSpeechBubble(state, speaker, formatSpeechLine(line, { drinkName: definition.name }));
}

function rarityRank(rarity: Rarity): number {
  return RARITY_ORDER.indexOf(rarity);
}

function weightedPick<T>(state: RunState, values: T[], weight: (value: T) => number): T | null {
  const total = values.reduce((sum, value) => sum + Math.max(0, weight(value)), 0);
  if (total <= 0) return null;
  let threshold = rng(state) * total;
  for (const value of values) {
    threshold -= Math.max(0, weight(value));
    if (threshold <= 0) return value;
  }
  return values[values.length - 1] ?? null;
}

function rosterCap(state: RunState, content: GameContent): number {
  return content.config.baseRosterCap + rosterCapacityBonus(state.meta.upgrades.roster_capacity);
}

function boardCap(state: RunState, content: GameContent): number {
  return content.config.boardCap + rosterCapacityBonus(state.meta.upgrades.roster_capacity);
}

function inventoryUnlocked(state: RunState): boolean {
  return state.meta.upgrades.inventory_slots > 0;
}

function inventoryCap(state: RunState, content: GameContent): number {
  if (!inventoryUnlocked(state)) return 0;
  return content.config.baseInventoryCap + inventoryCapacityBonus(state.meta.upgrades.inventory_slots);
}

function headerItemCap(content: GameContent): number {
  return content.config.headerItemCap;
}

function headerSkillCap(content: GameContent): number {
  return content.config.headerSkillCap;
}

function itemSlotCap(state: RunState, content: GameContent): number {
  return content.config.baseItemSlots + itemSlotBonus(state.meta.upgrades.item_slots);
}

function beerShopUnlocked(state: RunState): boolean {
  return state.meta.upgrades.beer_shop_unlock > 0;
}

function hallOfFameUnlocked(state: RunState): boolean {
  return state.meta.upgrades.hall_of_fame_unlock > 0;
}

function beerShopTier(state: RunState): number {
  return beerShopUnlocked(state) ? 1 + state.meta.upgrades.beer_shop_level : 0;
}

function beerOfferCountForTier(tier: number): number {
  return tier <= 0 ? 0 : beerShopOfferCountForLevel(Math.max(0, tier - 1));
}

function beerActiveSlotCapForTier(tier: number): number {
  return tier <= 0 ? 0 : beerActiveSlotCapForLevel(Math.max(0, tier - 1));
}

function skillSlotCap(): number {
  return 1;
}

function emptyStats(): UnitStats {
  return { ...EMPTY_STATS };
}

function saunaOccupancy(state: RunState): number {
  return state.saunaDefenderId ? 1 : 0;
}

function hasSaunaAutoDeploy(state: RunState): boolean {
  return state.meta.upgrades.sauna_auto_deploy > 0;
}

function hasSaunaSlapSwap(state: RunState): boolean {
  return state.meta.upgrades.sauna_slap_swap > 0;
}

function hasLootAutoAssign(state: RunState): boolean {
  return state.meta.upgrades.loot_auto_assign > 0;
}

function hasLootAutoUpgrade(state: RunState): boolean {
  return state.meta.upgrades.loot_auto_upgrade > 0;
}

function isRepeatableMetaUpgrade(upgradeId: MetaUpgradeId): boolean {
  return REPEATABLE_META_UPGRADE_IDS.includes(upgradeId);
}

function metaSoftcapLevel(upgradeId: MetaUpgradeId, content: GameContent): number {
  return content.metaUpgrades[upgradeId].maxLevel;
}

function rosterCapacityBonus(level: number): number {
  const softcap = 5;
  return Math.min(level, softcap) + Math.floor(Math.max(0, level - softcap) / 2);
}

function inventoryCapacityBonus(level: number): number {
  if (level <= 0) return 0;
  return Math.min(Math.max(0, level - 1), 3) * 2 + Math.max(0, level - 4);
}

function lootLuckBonus(level: number): number {
  return Math.min(level, 5) * 0.06 + Math.max(0, level - 5) * 0.03;
}

function lootRarityScore(level: number): number {
  return Math.min(level, 5) + Math.floor(Math.max(0, level - 5) / 2);
}

function lootRarityWeights(level: number): Record<Rarity, number> {
  const score = lootRarityScore(level);
  return {
    common: Math.max(16, 70 - score * 7),
    rare: Math.max(18, 22 + score * 4),
    epic: Math.max(4, score >= 1 ? 4 + score * 2 : 3),
    legendary: Math.max(0, score >= 4 ? (score - 3) * 2 : 0)
  };
}

function itemSlotBonus(level: number): number {
  return Math.min(level, 3) + Math.floor(Math.max(0, level - 3) / 2);
}

function beerShopOfferCountForLevel(level: number): number {
  return 3 + Math.min(level, 3) + Math.floor(Math.max(0, level - 3) / 2);
}

function beerActiveSlotCapForLevel(level: number): number {
  if (level <= 0) return 1;
  if (level <= 2) return 2;
  return 3 + Math.floor(Math.max(0, level - 3) / 3);
}

function isTitleMasteryId(masteryId: NameMasteryId): masteryId is TitleMasteryId {
  return TITLE_MASTERY_IDS.includes(masteryId as TitleMasteryId);
}

function nameMasteryLevel(state: RunState, masteryId: NameMasteryId): number {
  return isTitleMasteryId(masteryId)
    ? state.meta.hallOfFameTitleLevels[masteryId]
    : state.meta.hallOfFameNameLevels[masteryId];
}

function activeNameMasteryId(state: RunState, masteryId: NameMasteryId): NameMasteryId | null {
  return isTitleMasteryId(masteryId) ? state.meta.activeHallOfFameTitleId : state.meta.activeHallOfFameNameId;
}

function defenderTitlePrefix(defender: DefenderInstance): string {
  return defender.title.split(' ')[0] ?? defender.title;
}

function defenderSurname(defender: DefenderInstance): string {
  return defender.title.split(' ').slice(1).join(' ');
}

function addNamedStatBonus(target: Partial<UnitStats>, stat: GlobalModifierEffectStat, amount: number): Partial<UnitStats> {
  target[stat] = (target[stat] ?? 0) + amount;
  return target;
}

function nameMasteryTotals(state: RunState, defender: DefenderInstance, content: GameContent): Partial<UnitStats> {
  const bonus: Partial<UnitStats> = {};
  const titleMasteryId = state.meta.activeHallOfFameTitleId;
  if (titleMasteryId) {
    const titleDef = content.nameMasteries[titleMasteryId];
    const titleLevel = state.meta.hallOfFameTitleLevels[titleMasteryId];
    if (titleLevel > 0 && defenderTitlePrefix(defender) === titleDef.matchValue) {
      addNamedStatBonus(bonus, titleDef.effectStat, titleDef.amountPerRank * titleLevel);
    }
  }
  const nameMasteryId = state.meta.activeHallOfFameNameId;
  if (nameMasteryId) {
    const surnameDef = content.nameMasteries[nameMasteryId];
    const surnameLevel = state.meta.hallOfFameNameLevels[nameMasteryId];
    if (surnameLevel > 0 && defenderSurname(defender) === surnameDef.matchValue) {
      addNamedStatBonus(bonus, surnameDef.effectStat, surnameDef.amountPerRank * surnameLevel);
    }
  }
  return bonus;
}

function clearActiveHudPanel(state: RunState): void {
  state.activePanel = null;
  state.inventoryOpen = false;
  state.selectedWorldLandmarkId = null;
}

function clearLegacyRecruitPanelState(state: RunState): void {
  if (state.activePanel === 'recruit') {
    clearActiveHudPanel(state);
  }
}

function setActiveHudPanel(state: RunState, panel: HudPanelId | null, landmarkId: WorldLandmarkId | null = null): void {
  state.activePanel = panel;
  state.inventoryOpen = panel === 'loot';
  state.selectedWorldLandmarkId = landmarkId;
}

function clearBoardSelection(state: RunState): void {
  state.selectedMapTarget = null;
  state.selectedDefenderId = null;
  state.selectedEnemyInstanceId = null;
}

function boardDefenders(state: RunState): DefenderInstance[] {
  return state.defenders.filter((defender) => defender.location === 'board' && defender.tile);
}

function livingDefenders(state: RunState): DefenderInstance[] {
  return state.defenders.filter((defender) => defender.location !== 'dead');
}

function hasSubclass(defender: DefenderInstance, subclassId: DefenderSubclassId): boolean {
  return defender.subclassIds.includes(subclassId);
}

function pebbleEncounterTierFromCount(encounterCount: number): number {
  return Math.max(0, Math.max(1, encounterCount) - 1);
}

function pebbleEncounterTierFromMaxHp(maxHp: number): number {
  return Math.max(0, Math.round((maxHp - PEBBLE_BASE_MAX_HP) / PEBBLE_MAX_HP_STEP));
}

function pebbleEncounterTier(state: RunState): number {
  return pebbleEncounterTierFromCount(state.pebbleEncounterCount);
}

function pebbleEncounterTierForEnemy(state: RunState, enemy: EnemyInstance): number {
  if (enemy.archetypeId !== 'pebble') return 0;
  return enemy.pebbleEncounterMaxHp != null
    ? pebbleEncounterTierFromMaxHp(enemy.pebbleEncounterMaxHp)
    : pebbleEncounterTier(state);
}

function pebbleEncounterMaxHp(state: RunState): number {
  return PEBBLE_BASE_MAX_HP + pebbleEncounterTier(state) * PEBBLE_MAX_HP_STEP;
}

function pebbleBottleHuntMoveCooldownMs(state: RunState, enemy: EnemyInstance): number {
  return PEBBLE_BOTTLE_HUNT_MOVE_COOLDOWN_MS
    + pebbleEncounterTierForEnemy(state, enemy) * PEBBLE_BOTTLE_HUNT_MOVE_COOLDOWN_STEP;
}

function pebblePathMoveCooldownMs(state: RunState, enemy: EnemyInstance): number {
  return PEBBLE_PATH_MOVE_COOLDOWN_MS
    + pebbleEncounterTierForEnemy(state, enemy) * PEBBLE_PATH_MOVE_COOLDOWN_STEP;
}

function pebbleEffectiveMoveCooldownMs(state: RunState, enemy: EnemyInstance): number {
  return nearestPebbleBottleTarget(state, enemy)
    ? pebbleBottleHuntMoveCooldownMs(state, enemy)
    : pebblePathMoveCooldownMs(state, enemy);
}

function enemyMaxHp(state: RunState, enemy: EnemyInstance, content: GameContent): number {
  if (enemy.waveScaledMaxHp != null) {
    return enemy.waveScaledMaxHp;
  }
  const archetype = content.enemyArchetypes[enemy.archetypeId];
  const baseMaxHp = enemy.archetypeId === 'pebble'
    ? enemy.pebbleEncounterMaxHp ?? pebbleEncounterMaxHp(state)
    : archetype.maxHp;
  return scaledEnemyMaxHp(baseMaxHp, state.currentWave.index, archetype.threat, content, state.currentWave.isBoss);
}

function syncEnemyWaveScaling(state: RunState, enemy: EnemyInstance, content: GameContent): void {
  const archetype = content.enemyArchetypes[enemy.archetypeId];
  const baseMaxHp = enemy.archetypeId === 'pebble'
    ? enemy.pebbleEncounterMaxHp ?? pebbleEncounterMaxHp(state)
    : archetype.maxHp;
  const scaledMaxHp = scaledEnemyMaxHp(baseMaxHp, state.currentWave.index, archetype.threat, content, state.currentWave.isBoss);
  const previousScaledMaxHp = enemy.waveScaledMaxHp;

  if (previousScaledMaxHp == null) {
    if (enemy.hp === baseMaxHp && scaledMaxHp > baseMaxHp) {
      enemy.hp = scaledMaxHp;
    }
  } else if (previousScaledMaxHp !== scaledMaxHp) {
    const hpRatio = enemy.hp / Math.max(1, previousScaledMaxHp);
    enemy.hp = Math.max(1, Math.min(scaledMaxHp, Math.round(scaledMaxHp * hpRatio)));
  }

  enemy.waveScaledMaxHp = scaledMaxHp;
}

function syncEnemyWaveScalingForState(state: RunState, content: GameContent): void {
  for (const enemy of state.enemies) {
    syncEnemyWaveScaling(state, enemy, content);
  }
}

function boardAlliesWithin(
  state: RunState,
  origin: AxialCoord,
  range: number,
  excludeId: string | null = null
): DefenderInstance[] {
  return boardDefenders(state)
    .filter((ally) => ally.id !== excludeId && ally.tile && hexDistance(origin, ally.tile) <= range)
    .sort((left, right) => (left.hp - right.hp) || (hexDistance(origin, left.tile as AxialCoord) - hexDistance(origin, right.tile as AxialCoord)));
}

function nearestInjuredAllyWithin(
  state: RunState,
  healer: DefenderInstance,
  origin: AxialCoord,
  range: number,
  content: GameContent,
  excludeId: string | null = null
): DefenderInstance | null {
  return boardAlliesWithin(state, origin, range, excludeId)
    .filter((ally) => ally.hp < derivedStats(state, ally, content).maxHp)
    .sort((left, right) => {
      const leftMissing = derivedStats(state, left, content).maxHp - left.hp;
      const rightMissing = derivedStats(state, right, content).maxHp - right.hp;
      return (rightMissing - leftMissing) || (left.hp - right.hp) || (left.id === healer.id ? -1 : 0);
    })[0] ?? null;
}

function getDefender(state: RunState, defenderId: string | null): DefenderInstance | null {
  return defenderId ? state.defenders.find((defender) => defender.id === defenderId) ?? null : null;
}

function getEnemy(state: RunState, enemyInstanceId: number | null): EnemyInstance | null {
  return enemyInstanceId != null
    ? state.enemies.find((enemy) => enemy.instanceId === enemyInstanceId) ?? null
    : null;
}

function xpForLevel(level: number): number {
  let total = 0;
  for (let nextLevel = 2; nextLevel <= level; nextLevel += 1) {
    const base = nextLevel <= 5 ? nextLevel + 1 : 4 + nextLevel * 2;
    total += Math.ceil(base * 1.35);
  }
  return total;
}

function levelFromXp(xp: number): number {
  let level = 1;
  while (level < MAX_DEFENDER_LEVEL && xp >= xpForLevel(level + 1)) {
    level += 1;
  }
  return level;
}

function xpForEnemy(enemyId: EnemyUnitId): number {
  switch (enemyId) {
    case 'brute':
      return 2;
    case 'chieftain':
    case 'pebble':
    case 'electric_bather':
    case 'escalation_manager':
      return 3;
    default:
      return 1;
  }
}

function addModifiers(left: UnitStats, modifier: Partial<UnitStats>) {
  left.maxHp += modifier.maxHp ?? 0;
  left.damage += modifier.damage ?? 0;
  left.heal += modifier.heal ?? 0;
  left.range += modifier.range ?? 0;
  left.attackCooldownMs += modifier.attackCooldownMs ?? 0;
  left.defense += modifier.defense ?? 0;
  left.regenHpPerSecond += modifier.regenHpPerSecond ?? 0;
  return left;
}

function addAlcoholModifier(left: AlcoholModifier, modifier: Partial<AlcoholModifier>) {
  left.maxHp = (left.maxHp ?? 0) + (modifier.maxHp ?? 0);
  left.damage = (left.damage ?? 0) + (modifier.damage ?? 0);
  left.heal = (left.heal ?? 0) + (modifier.heal ?? 0);
  left.range = (left.range ?? 0) + (modifier.range ?? 0);
  left.attackCooldownMs = (left.attackCooldownMs ?? 0) + (modifier.attackCooldownMs ?? 0);
  left.defense = (left.defense ?? 0) + (modifier.defense ?? 0);
  left.regenHpPerSecond = (left.regenHpPerSecond ?? 0) + (modifier.regenHpPerSecond ?? 0);
  left.lootChance = (left.lootChance ?? 0) + (modifier.lootChance ?? 0);
  left.rewardSisu = (left.rewardSisu ?? 0) + (modifier.rewardSisu ?? 0);
  return left;
}

function scaledPositiveAlcoholModifier(definition: AlcoholDefinition, stacks: number): AlcoholModifier {
  return {
    maxHp: (definition.positive.maxHp ?? 0) * stacks,
    damage: (definition.positive.damage ?? 0) * stacks,
    heal: (definition.positive.heal ?? 0) * stacks,
    range: (definition.positive.range ?? 0) * stacks,
    attackCooldownMs: (definition.positive.attackCooldownMs ?? 0) * stacks,
    defense: (definition.positive.defense ?? 0) * stacks,
    regenHpPerSecond: (definition.positive.regenHpPerSecond ?? 0) * stacks,
    lootChance: (definition.positive.lootChance ?? 0) * stacks,
    rewardSisu: (definition.positive.rewardSisu ?? 0) * stacks
  };
}

function scaledNegativeAlcoholModifier(definition: AlcoholDefinition, stacks: number): AlcoholModifier {
  const scale = Math.pow(2, Math.max(0, stacks - 1));
  return {
    maxHp: (definition.negative.maxHp ?? 0) * scale,
    damage: (definition.negative.damage ?? 0) * scale,
    heal: (definition.negative.heal ?? 0) * scale,
    range: (definition.negative.range ?? 0) * scale,
    attackCooldownMs: (definition.negative.attackCooldownMs ?? 0) * scale,
    defense: (definition.negative.defense ?? 0) * scale,
    regenHpPerSecond: (definition.negative.regenHpPerSecond ?? 0) * scale,
    lootChance: (definition.negative.lootChance ?? 0) * scale,
    rewardSisu: (definition.negative.rewardSisu ?? 0) * scale
  };
}

function activeAlcoholEntry(state: RunState, alcoholId: AlcoholId): ActiveAlcoholBuff | null {
  return state.activeAlcohols.find((entry) => entry.alcoholId === alcoholId) ?? null;
}

function alcoholTotals(state: RunState, content: GameContent): AlcoholModifier {
  return state.activeAlcohols.reduce<AlcoholModifier>((totals, active) => {
    const definition = content.alcoholDefinitions[active.alcoholId];
    addAlcoholModifier(totals, scaledPositiveAlcoholModifier(definition, active.stacks));
    const negative = scaledNegativeAlcoholModifier(definition, active.stacks);
    addAlcoholModifier(totals, {
      maxHp: -(negative.maxHp ?? 0),
      damage: -(negative.damage ?? 0),
      heal: -(negative.heal ?? 0),
      range: -(negative.range ?? 0),
      attackCooldownMs: negative.attackCooldownMs ?? 0,
      defense: -(negative.defense ?? 0),
      regenHpPerSecond: -(negative.regenHpPerSecond ?? 0),
      lootChance: -(negative.lootChance ?? 0),
      rewardSisu: -(negative.rewardSisu ?? 0)
    });
    return totals;
  }, {});
}

function subclassModifiers(defender: DefenderInstance, content: GameContent) {
  return defender.subclassIds.reduce((totals, subclassId) => {
    return addModifiers(totals, content.defenderSubclasses[subclassId].modifiers);
  }, emptyStats());
}

function levelModifiers(defender: DefenderInstance) {
  const bonusLevel = Math.max(0, defender.level - 1);
  return {
    maxHp: bonusLevel * 2,
    damage: Math.floor(defender.level / 2),
    heal: defender.templateId === 'mender' ? Math.floor(defender.level / 2) : 0,
    range: 0,
    attackCooldownMs: 0,
    defense: 0,
    regenHpPerSecond: 0
  };
}

function baseStatsWithLoadout(defender: DefenderInstance, content: GameContent): UnitStats {
  const subclassBonus = subclassModifiers(defender, content);
  const levelBonus = levelModifiers(defender);
  const itemBonus = defender.items.reduce(
    (totals, itemId) => {
      const item = content.itemDefinitions[itemId];
      totals.maxHp += item.modifiers.maxHp ?? 0;
      totals.damage += item.modifiers.damage ?? 0;
      totals.heal += item.modifiers.heal ?? 0;
      totals.range += item.modifiers.range ?? 0;
      totals.attackCooldownMs += item.modifiers.attackCooldownMs ?? 0;
      totals.defense += item.modifiers.defense ?? 0;
      totals.regenHpPerSecond += item.modifiers.regenHpPerSecond ?? 0;
      return totals;
    },
    emptyStats()
  );

  return {
    maxHp: Math.max(6, defender.stats.maxHp + (subclassBonus.maxHp ?? 0) + levelBonus.maxHp + itemBonus.maxHp),
    damage: Math.max(1, defender.stats.damage + (subclassBonus.damage ?? 0) + levelBonus.damage + itemBonus.damage),
    heal: Math.max(0, defender.stats.heal + (subclassBonus.heal ?? 0) + levelBonus.heal + itemBonus.heal),
    range: Math.max(1, defender.stats.range + (subclassBonus.range ?? 0) + levelBonus.range + itemBonus.range),
    attackCooldownMs: Math.max(
      360,
      defender.stats.attackCooldownMs +
        (subclassBonus.attackCooldownMs ?? 0) +
        levelBonus.attackCooldownMs +
        itemBonus.attackCooldownMs
    ),
    defense: Math.max(0, defender.stats.defense + (subclassBonus.defense ?? 0) + levelBonus.defense + itemBonus.defense),
    regenHpPerSecond: Math.max(0, defender.stats.regenHpPerSecond + (subclassBonus.regenHpPerSecond ?? 0) + levelBonus.regenHpPerSecond + itemBonus.regenHpPerSecond)
  };
}

function countScopeDefenders(state: RunState, definition: GlobalModifierDefinition): DefenderInstance[] {
  switch (definition.countScope) {
    case 'board':
      return boardDefenders(state);
    case 'dead':
      return state.defenders.filter((defender) => defender.location === 'dead');
    case 'living':
    default:
      return livingDefenders(state);
  }
}

function globalModifierStacks(state: RunState, definition: GlobalModifierDefinition): number {
  const defenders = countScopeDefenders(state, definition);
  const source = definition.source;
  switch (source.kind) {
    case 'first_name':
      return defenders.filter((defender) => defender.name === source.name).length;
    case 'template':
      return defenders.filter((defender) => defender.templateId === source.templateId).length;
    case 'subclass':
      return defenders.filter((defender) => defender.subclassIds.includes(source.subclassId)).length;
    case 'skill':
      return defenders.filter((defender) => defender.skills.includes(source.skillId)).length;
    case 'item':
      return defenders.reduce(
        (count, defender) => count + defender.items.filter((itemId) => itemId === source.itemId).length,
        0
      );
    case 'title':
      return defenders.filter((defender) => defender.title === source.title || defender.title.split(' ')[0] === source.title).length;
    case 'roster':
      return defenders.length;
    default:
      return 0;
  }
}

function applyModifierAmount(stats: UnitStats, stat: GlobalModifierEffectStat, amount: number): UnitStats {
  stats[stat] += amount;
  return stats;
}

function countGlobalModifierPicks(state: RunState, modifierId: GlobalModifierId): number {
  return state.activeGlobalModifierIds.reduce((count, activeId) => count + (activeId === modifierId ? 1 : 0), 0);
}

function uniqueGlobalModifierIds(modifierIds: GlobalModifierId[]): GlobalModifierId[] {
  const seen = new Set<GlobalModifierId>();
  const unique: GlobalModifierId[] = [];
  for (const modifierId of modifierIds) {
    if (seen.has(modifierId)) continue;
    seen.add(modifierId);
    unique.push(modifierId);
  }
  return unique;
}

function globalModifierTotals(state: RunState, content: GameContent): UnitStats {
  return state.activeGlobalModifierIds.reduce((totals, modifierId) => {
    const definition = content.globalModifierDefinitions[modifierId];
    const stacks = globalModifierStacks(state, definition);
    return applyModifierAmount(totals, definition.effectStat, definition.amountPerStack * stacks);
  }, emptyStats());
}

function subclassAuras(state: RunState, defender: DefenderInstance): UnitStats {
  if (defender.location === 'dead' || !defender.tile) return emptyStats();
  return boardDefenders(state).reduce((totals, ally) => {
    if (ally.id === defender.id || !ally.tile || hexDistance(ally.tile, defender.tile as AxialCoord) > 1) {
      return totals;
    }
    if (hasSubclass(ally, 'iron_bastion')) {
      addModifiers(totals, { defense: 1, maxHp: 2 });
    }
    if (hasSubclass(ally, 'afterglow_warden')) {
      addModifiers(totals, { defense: 1, regenHpPerSecond: 1 });
    }
    return totals;
  }, emptyStats());
}

function derivedStats(
  state: RunState,
  defender: DefenderInstance,
  content: GameContent,
  includeGlobal = defender.location !== 'dead'
): UnitStats {
  const base = baseStatsWithLoadout(defender, content);
  if (!includeGlobal) return base;

  const globalBonus = globalModifierTotals(state, content);
  const alcoholBonus = alcoholTotals(state, content);
  const auraBonus = subclassAuras(state, defender);
  const masteryBonus = nameMasteryTotals(state, defender, content);
  const attackCooldownMs = Math.max(
    360,
    base.attackCooldownMs
      + globalBonus.attackCooldownMs
      + (alcoholBonus.attackCooldownMs ?? 0)
      + auraBonus.attackCooldownMs
      + (masteryBonus.attackCooldownMs ?? 0)
  );
  return {
    maxHp: Math.max(6, base.maxHp + globalBonus.maxHp + (alcoholBonus.maxHp ?? 0) + auraBonus.maxHp + (masteryBonus.maxHp ?? 0)),
    damage: Math.max(1, base.damage + globalBonus.damage + (alcoholBonus.damage ?? 0) + auraBonus.damage + (masteryBonus.damage ?? 0)),
    heal: Math.max(0, base.heal + globalBonus.heal + (alcoholBonus.heal ?? 0) + auraBonus.heal + (masteryBonus.heal ?? 0)),
    range: Math.max(1, base.range + globalBonus.range + (alcoholBonus.range ?? 0) + auraBonus.range + (masteryBonus.range ?? 0)),
    attackCooldownMs: defender.battleHymnBuffExpiresAtMs > state.timeMs
      ? Math.max(360, Math.round((attackCooldownMs * 2) / 3))
      : attackCooldownMs,
    defense: Math.max(0, base.defense + globalBonus.defense + (alcoholBonus.defense ?? 0) + auraBonus.defense + (masteryBonus.defense ?? 0)),
    regenHpPerSecond: Math.max(
      0,
      base.regenHpPerSecond
        + globalBonus.regenHpPerSecond
        + (alcoholBonus.regenHpPerSecond ?? 0)
        + auraBonus.regenHpPerSecond
        + (masteryBonus.regenHpPerSecond ?? 0)
    )
  };
}

function normalizeDefender(state: RunState, defender: DefenderInstance, content: GameContent): void {
  defender.blinkReadyAtMs ??= 0;
  defender.thunderRunReadyAtMs ??= 0;
  defender.battleHymnReadyAtMs ??= 0;
  defender.battleHymnBuffExpiresAtMs ??= 0;
  defender.fireballReadyAtMs ??= 0;
  defender.boilingOrbitReadyAtMs ??= 0;
  defender.saunaQuakeReadyAtMs ??= 0;
  defender.emberStormReadyAtMs ??= 0;
  defender.hp = Math.min(defender.hp, derivedStats(state, defender, content).maxHp);
}

function normalizeLivingDefenders(state: RunState, content: GameContent): void {
  for (const defender of state.defenders) {
    if (defender.location === 'dead') continue;
    normalizeDefender(state, defender, content);
  }
}

function generateName(state: RunState, content: GameContent): { name: string; title: string } {
  return {
    name: pick(state, content.namePools.first),
    title: `${pick(state, content.namePools.title)} ${pick(state, content.namePools.last)}`
  };
}

function generateLore(state: RunState, templateId: DefenderTemplateId, content: GameContent): string {
  return `${pick(state, content.namePools.loreHooks[templateId])}. ${pick(state, content.namePools.loreQuirks)}`;
}

function rollStat(state: RunState, base: number, spread: number, min: number): number {
  return Math.max(min, base + Math.round((rng(state) * 2 - 1) * spread));
}

function rollBaseStatsForTemplate(state: RunState, templateId: DefenderTemplateId, content: GameContent): UnitStats {
  const template = content.defenderTemplates[templateId];
  return {
    maxHp: rollStat(state, template.stats.maxHp, 9, 8),
    damage: rollStat(state, template.stats.damage, 3, 1),
    heal: rollStat(state, template.stats.heal, 2, 0),
    range: rollStat(state, template.stats.range, 1, 1),
    attackCooldownMs: rollStat(state, template.stats.attackCooldownMs, 200, 360),
    defense: template.stats.defense,
    regenHpPerSecond: template.stats.regenHpPerSecond
  };
}

function rerollDefenderIdentityAndStats(
  state: RunState,
  defender: DefenderInstance,
  content: GameContent,
  hpMode: 'fill' | 'clamp'
): void {
  const identity = generateName(state, content);
  defender.name = identity.name;
  defender.title = identity.title;
  defender.lore = generateLore(state, defender.templateId, content);
  defender.stats = rollBaseStatsForTemplate(state, defender.templateId, content);
  if (hpMode === 'fill') {
    defender.hp = defender.stats.maxHp;
    return;
  }
  defender.hp = Math.min(defender.hp, derivedStats(state, defender, content).maxHp);
}

function rerollSaunaDefenderIdentityAndStats(
  state: RunState,
  defender: DefenderInstance,
  content: GameContent
): void {
  rerollSaunaDefenderIdentityAndStatsFromModule(state, defender, content, saunaDeps);
}

function newDefender(state: RunState, templateId: DefenderTemplateId, content: GameContent): DefenderInstance {
  const identity = generateName(state, content);
  const stats = rollBaseStatsForTemplate(state, templateId, content);
  return {
    id: `${templateId}-${Math.round(rng(state) * 1e9).toString(16)}`,
    templateId,
    subclassIds: [],
    name: identity.name,
    title: identity.title,
    lore: generateLore(state, templateId, content),
    tokenStyleId: randomInt(state, 0, 9),
    stats,
    hp: stats.maxHp,
    level: 1,
    xp: 0,
    location: 'ready',
    tile: null,
    homeTile: null,
    motion: null,
    attackReadyAtMs: 0,
    blinkReadyAtMs: 0,
    thunderRunReadyAtMs: 0,
    battleHymnReadyAtMs: 0,
    battleHymnBuffExpiresAtMs: 0,
    fireballReadyAtMs: 0,
    boilingOrbitReadyAtMs: 0,
    saunaQuakeReadyAtMs: 0,
    emberStormReadyAtMs: 0,
    items: [],
    skills: [],
    kills: 0,
    lastHitByEnemyId: null
  };
}

function buildRoster(state: RunState, content: GameContent): DefenderInstance[] {
  void state;
  void content;
  return [];
}

function wrapLane(index: number, laneCount: number): number {
  return ((index % laneCount) + laneCount) % laneCount;
}

function cycleNumber(index: number, content: GameContent): number {
  return Math.floor((index - 1) / content.config.bossEvery);
}

function slotInCycle(index: number, content: GameContent): number {
  return ((index - 1) % content.config.bossEvery) + 1;
}

function enemyHpMultiplier(index: number, content: GameContent, isBossWave: boolean): number {
  const cycle = cycleNumber(index, content);
  const slot = slotInCycle(index, content);
  const lateCurve = Math.max(0, cycle - 4);
  return 1
    + cycle * 0.22
    + Math.max(0, cycle - 2) * 0.15
    + Math.max(0, slot - 1) * 0.05
    + lateCurve * lateCurve * 0.04
    + (isBossWave ? 0.24 + cycle * 0.04 : 0);
}

function enemyMaxHpFlatBonus(index: number, threat: number, content: GameContent, isBossWave: boolean): number {
  const cycle = cycleNumber(index, content);
  void content;
  return cycle * threat * (isBossWave ? 3 : 2);
}

function enemyStatScalingMultiplier(isBossWave: boolean): number {
  return isBossWave ? ENEMY_BOSS_STAT_SCALING_MULTIPLIER : ENEMY_NORMAL_STAT_SCALING_MULTIPLIER;
}

function scaledEnemyMaxHp(
  baseMaxHp: number,
  index: number,
  threat: number,
  content: GameContent,
  isBossWave: boolean
): number {
  return Math.max(
    1,
    Math.round(
      baseMaxHp
      + (
        baseMaxHp * (enemyHpMultiplier(index, content, isBossWave) - 1)
        + enemyMaxHpFlatBonus(index, threat, content, isBossWave)
      ) * enemyStatScalingMultiplier(isBossWave)
    )
  );
}

function enemyDamageBonus(index: number, content: GameContent, isBossWave: boolean): number {
  const cycle = cycleNumber(index, content);
  const slot = slotInCycle(index, content);
  return cycle
    + Math.floor(cycle / 2)
    + Math.floor(Math.max(0, cycle - 4) / 2)
    + Math.floor(Math.max(0, slot - 1) / 2)
    + (isBossWave ? 1 + Math.floor(cycle / 3) : 0);
}

function scaledEnemyDamage(baseDamage: number, index: number, content: GameContent, isBossWave: boolean): number {
  void content;
  return Math.max(1, baseDamage + Math.round(enemyDamageBonus(index, content, isBossWave) * enemyStatScalingMultiplier(isBossWave)));
}

function spawnIntervalMs(index: number, content: GameContent, modifier = 0): number {
  const cycle = cycleNumber(index, content);
  const slot = slotInCycle(index, content);
  const perCycleCompression = cycle * 18;
  const slotStep = 44 + cycle * 3;
  const minInterval = Math.max(180, Math.floor(content.config.minSpawnIntervalMs * 0.5));
  return Math.max(
    minInterval,
    660 - cycle * Math.max(24, Math.floor(content.config.spawnIntervalStepMs * 0.7)) - perCycleCompression - slot * slotStep + modifier
  );
}

function wavePressure(index: number, content: GameContent, isBoss: boolean): number {
  if (index === 1) return 4;
  if (index === 2) return 6;
  if (index === 3) return 9;
  if (index === 4) return 11;

  const cycle = cycleNumber(index, content);
  const slot = slotInCycle(index, content);
  const basePressure =
    content.config.cyclePressureBase +
    cycle * content.config.cyclePressureStep +
    Math.max(0, slot - 1) * content.config.wavePressureStep;

  if (isBoss) {
    // Bosses keep their own curve so each boss wave still feels like a distinct spike.
    const bossCycleSpike = Math.max(1, Math.floor(cycle * 1.5));
    return basePressure + 7 + cycle * 2 + bossCycleSpike;
  }

  // Tutorial onboarding is locked at waves 1-4 above. From wave 6 onward,
  // each 5-wave cycle adds a visibly stronger pressure bump.
  const cycleRamp = cycle * (cycle + 2);
  const milestoneBonus = cycle > 0 ? 1 + Math.floor(cycle / 2) : 0;
  return basePressure + cycleRamp + milestoneBonus;
}

function rewardSisuForWave(index: number, pressure: number, isBoss: boolean, content: GameContent): number {
  if (isBoss) {
    return 5 + cycleNumber(index, content);
  }
  return Math.max(2, 2 + Math.floor(index / 5) + (pressure >= 14 ? 1 : 0));
}

function pushSpawn(spawns: WaveSpawn[], atMs: number, enemyId: EnemyUnitId, laneIndex: number, laneCount: number): number {
  spawns.push({
    atMs: Math.max(0, Math.round(atMs)),
    enemyId,
    laneIndex: wrapLane(laneIndex, laneCount)
  });
  return atMs;
}

type WaveSpawnBand = 'legacy' | 'wide' | 'dense' | 'overdrive';

function waveSpawnBand(index: number): WaveSpawnBand {
  if (index >= 21) return 'overdrive';
  if (index >= 16) return 'dense';
  if (index >= 10) return 'wide';
  return 'legacy';
}

function targetSpawnCountForWave(index: number): number {
  if (index <= 4) return 0;
  if (index <= 10) return Math.round(15 + (index - 6) * (15 / 4));
  if (index <= 15) return 30 + (index - 10) * 6;
  if (index <= 20) return 60 + (index - 15) * 8;
  if (index <= 25) return 100 + (index - 20) * 8;
  return 140 + (index - 25) * 10;
}

function lateWaveIntervalModifier(index: number, pattern: Exclude<WavePattern, 'tutorial' | 'boss_pressure' | 'boss_breach'>): number {
  const band = waveSpawnBand(index);
  if (band === 'legacy') {
    if (pattern === 'surge') return -70;
    if (pattern === 'staggered') return 35;
    return 0;
  }
  if (band === 'wide') {
    if (pattern === 'surge') return -180;
    if (pattern === 'staggered') return -110;
    return -140;
  }
  if (band === 'dense') {
    if (pattern === 'surge') return -230;
    if (pattern === 'staggered') return -170;
    return -195;
  }
  if (pattern === 'surge') return -280;
  if (pattern === 'staggered') return -210;
  return -240;
}

function burstSizeForWave(
  index: number,
  pattern: Exclude<WavePattern, 'tutorial' | 'boss_pressure' | 'boss_breach'>,
  remaining: number,
  beatIndex: number,
  cycle: number,
  laneCount: number
): number {
  const band = waveSpawnBand(index);
  if (band === 'wide') return Math.min(remaining, laneCount);
  if (band === 'dense') {
    const extra = pattern === 'surge' || beatIndex % 3 === 2 ? 2 : 0;
    return Math.min(remaining, laneCount + extra);
  }
  if (band === 'overdrive') {
    const extra = beatIndex % 2 === 0 ? laneCount : 3;
    return Math.min(remaining, laneCount + extra);
  }
  if (pattern === 'split') return Math.min(remaining, 2 + ((beatIndex + cycle) % 3 === 2 ? 1 : 0));
  if (pattern === 'staggered') {
    if (beatIndex < 2) return 1;
    return Math.min(remaining, 2 + ((beatIndex + cycle) % 2));
  }
  if (pattern === 'spearhead') return Math.min(remaining, remaining >= 3 ? 3 : 2);
  return Math.min(remaining, 3);
}

function laneSlotsForBeat(
  pattern: Exclude<WavePattern, 'tutorial' | 'boss_pressure' | 'boss_breach'>,
  index: number,
  beatIndex: number,
  baseLane: number,
  laneCount: number
): number[] {
  if (waveSpawnBand(index) !== 'legacy') {
    const offsets = (() => {
      if (pattern === 'split') return beatIndex % 2 === 0 ? [0, 3, 1, 4, 2, 5] : [3, 0, 4, 1, 5, 2];
      if (pattern === 'staggered') return beatIndex % 2 === 0 ? [0, 2, 4, 1, 3, 5] : [3, 5, 1, 4, 0, 2];
      if (pattern === 'spearhead') return [0, 1, 5, 2, 4, 3];
      return [0, 1, 2, 3, 4, 5];
    })();
    const rotated = offsets.map((_, slotIndex) => offsets[(slotIndex + beatIndex) % offsets.length]);
    return rotated.map((offset) => wrapLane(baseLane + offset, laneCount));
  }

  const altLane = wrapLane(baseLane + 3, laneCount);
  const supportLane = wrapLane(baseLane + 2, laneCount);
  const flankLane = wrapLane(baseLane + 1, laneCount);

  if (pattern === 'split') {
    return beatIndex % 2 === 0
      ? [baseLane, altLane, supportLane]
      : [supportLane, flankLane, altLane];
  }
  if (pattern === 'staggered') {
    if (beatIndex === 0) return [baseLane];
    if (beatIndex === 1) return [altLane];
    return beatIndex % 2 === 0
      ? [supportLane, baseLane, altLane]
      : [altLane, supportLane, flankLane];
  }
  if (pattern === 'spearhead') {
    return [baseLane, flankLane, supportLane];
  }
  return [baseLane, flankLane, altLane];
}

function upscaleEnemyListToTarget(base: EnemyUnitId[], targetCount: number, cycle: number): EnemyUnitId[] {
  if (targetCount <= 0) return [...base];
  const result = [...base];
  if (result.length > targetCount) {
    return result.slice(0, targetCount);
  }

  while (result.length < targetCount) {
    const spawnIndex = result.length;
    const addBrute = cycle >= 2 && spawnIndex % 3 === 0;
    result.push(addBrute ? 'brute' : 'raider');
  }

  return result;
}

function compositionForPressure(pressure: number, cycle: number, favorBrutes: number): EnemyUnitId[] {
  const result: EnemyUnitId[] = [];
  let remaining = pressure;
  const bruteCap = 1 + cycle + Math.floor(cycle / 2);
  let brutesLeft = Math.max(0, Math.min(bruteCap, Math.floor((pressure - 4) / 3) + favorBrutes + Math.floor(cycle / 2)));

  while (remaining > 0) {
    const bruteThreshold = Math.max(3, 5 - Math.floor(cycle / 2));
    if (remaining >= bruteThreshold && brutesLeft > 0) {
      result.push('brute');
      remaining -= 4;
      brutesLeft -= 1;
      continue;
    }

    result.push('raider');
    remaining -= 2;
  }

  if (result.length < 3) {
    result.push('raider');
  }

  const extraPicks = Math.max(0, Math.floor(cycle / 2));
  for (let i = 0; i < extraPicks; i += 1) {
    const shouldSpawnBrute = brutesLeft > 0 && cycle >= 2 && i % 2 === 0;
    result.push(shouldSpawnBrute ? 'brute' : 'raider');
    if (shouldSpawnBrute) {
      brutesLeft -= 1;
    }
  }

  return result;
}

function buildPatternSpawns(
  pattern: Exclude<WavePattern, 'tutorial' | 'boss_pressure' | 'boss_breach'>,
  index: number,
  content: GameContent,
  pressure: number
): WaveSpawn[] {
  const laneCount = spawnLanesForWave(index, content).length;
  const baseLane = wrapLane(index + cycleNumber(index, content), laneCount);
  const cycle = cycleNumber(index, content);
  const interval = spawnIntervalMs(index, content, lateWaveIntervalModifier(index, pattern));
  const baseEnemies =
    pattern === 'surge'
      ? compositionForPressure(pressure + 2, cycle, 0)
      : pattern === 'spearhead'
        ? compositionForPressure(pressure, cycle, 1)
        : compositionForPressure(pressure, cycle, 0);
  const targetCount = targetSpawnCountForWave(index);
  const enemies = upscaleEnemyListToTarget(baseEnemies, targetCount, cycle);
  const spawns: WaveSpawn[] = [];
  let atMs = 0;
  let enemyIndex = 0;
  let beatIndex = 0;

  while (enemyIndex < enemies.length) {
    const remaining = enemies.length - enemyIndex;
    const burstSize = burstSizeForWave(index, pattern, remaining, beatIndex, cycle, laneCount);
    const laneSlots = laneSlotsForBeat(pattern, index, beatIndex, baseLane, laneCount);

    for (let localIndex = 0; localIndex < burstSize; localIndex += 1) {
      const enemyId = enemies[enemyIndex + localIndex];
      let laneIndex = laneSlots[localIndex % laneSlots.length];
      if (waveSpawnBand(index) === 'legacy' && pattern === 'spearhead' && enemyId === 'brute') {
        laneIndex = baseLane;
      }
      pushSpawn(spawns, atMs, enemyId, laneIndex, laneCount);
    }

    enemyIndex += burstSize;
    beatIndex += 1;
    atMs += interval;
  }

  return spawns;
}

function bossBaseLane(index: number, content: GameContent): number {
  return wrapLane(index + bossWaveOrdinal(index, content) * 2, spawnLanesForWave(index, content).length);
}

function buildPebbleSpawns(index: number, content: GameContent): WaveSpawn[] {
  const laneCount = spawnLanesForWave(index, content).length;
  return [{ atMs: 0, enemyId: 'pebble', laneIndex: bossBaseLane(index, content) % laneCount }];
}

function buildEndUserHordeSpawns(index: number, content: GameContent): WaveSpawn[] {
  const laneCount = spawnLanesForWave(index, content).length;
  const baseLane = bossBaseLane(index, content);
  const band = waveSpawnBand(index);
  const lanes = band === 'legacy'
    ? [baseLane, wrapLane(baseLane + 2, laneCount), wrapLane(baseLane + 4, laneCount)]
    : [0, 1, 2, 3, 4, 5].map((offset) => wrapLane(baseLane + offset, laneCount));
  const spawns: WaveSpawn[] = [];
  let atMs = 0;

  for (let spawnIndex = 0; spawnIndex < 16; spawnIndex += 1) {
    pushSpawn(spawns, atMs, 'thirsty_user', lanes[spawnIndex % lanes.length], laneCount);
    if (band === 'legacy') {
      atMs += spawnIndex > 0 && spawnIndex % 4 === 3 ? 280 : 180;
      continue;
    }
    atMs += spawnIndex % lanes.length === lanes.length - 1 ? 120 : 0;
  }

  return spawns;
}

function buildElectricBatherSpawns(index: number, content: GameContent): WaveSpawn[] {
  const laneCount = spawnLanesForWave(index, content).length;
  return [{ atMs: 0, enemyId: 'electric_bather', laneIndex: bossBaseLane(index, content) % laneCount }];
}

function buildEscalationManagerSpawns(index: number, content: GameContent): WaveSpawn[] {
  const laneCount = spawnLanesForWave(index, content).length;
  return [{ atMs: 0, enemyId: 'escalation_manager', laneIndex: bossBaseLane(index, content) % laneCount }];
}

function buildBossSpawns(index: number, content: GameContent, bossId: BossId): WaveSpawn[] {
  const baseSpawns = (() => {
    switch (bossId) {
      case 'pebble':
        return buildPebbleSpawns(index, content);
      case 'end_user_horde':
        return buildEndUserHordeSpawns(index, content);
      case 'electric_bather':
        return buildElectricBatherSpawns(index, content);
      case 'escalation_manager':
        return buildEscalationManagerSpawns(index, content);
      default:
        return [];
    }
  })();

  const targetCount = targetSpawnCountForWave(index);
  if (baseSpawns.length >= targetCount || targetCount <= 0) {
    return baseSpawns;
  }

  const laneCount = spawnLanesForWave(index, content).length;
  const baseLane = bossBaseLane(index, content);
  const band = waveSpawnBand(index);
  const lanes = band === 'legacy'
    ? [
        baseLane,
        wrapLane(baseLane + 1, laneCount),
        wrapLane(baseLane + 2, laneCount),
        wrapLane(baseLane + 4, laneCount)
      ]
    : [0, 1, 2, 3, 4, 5].map((offset) => wrapLane(baseLane + offset, laneCount));
  const spawns = [...baseSpawns];
  let atMs = baseSpawns.length > 0 ? Math.max(...baseSpawns.map((spawn) => spawn.atMs)) + (band === 'legacy' ? 220 : 120) : 0;
  const cycle = cycleNumber(index, content);

  while (spawns.length < targetCount) {
    const remaining = targetCount - spawns.length;
    const volleySize = band === 'wide'
      ? Math.min(remaining, laneCount)
      : band === 'dense'
        ? Math.min(remaining, laneCount + 2)
        : band === 'overdrive'
          ? Math.min(remaining, laneCount + (spawns.length % 2 === 0 ? laneCount : 3))
          : 1;

    for (let localIndex = 0; localIndex < volleySize; localIndex += 1) {
      const addIndex = spawns.length - baseSpawns.length;
      const enemyId: EnemyUnitId = cycle >= 2 && addIndex % 5 === 4 ? 'brute' : 'thirsty_user';
      pushSpawn(spawns, atMs, enemyId, lanes[localIndex % lanes.length], laneCount);
    }

    if (band === 'legacy') {
      atMs += Math.max(180, 170 - cycle * 6);
      continue;
    }

    if (band === 'wide') {
      atMs += 150;
      continue;
    }
    if (band === 'dense') {
      atMs += 120;
      continue;
    }
    atMs += 90;
  }

  return spawns;
}

export function createWaveDefinition(index: number, content: GameContent): WaveDefinition {
  const isBoss = index % content.config.bossEvery === 0;
  const tutorialWave = tutorialWaves.find((wave) => wave.index === index);
  if (tutorialWave) {
    return {
      index,
      isBoss: false,
      rewardSisu: tutorialWave.rewardSisu,
      pressure: tutorialWave.pressure,
      pattern: tutorialWave.pattern,
      bossId: null,
      bossCategory: null,
      spawns: tutorialWave.spawns
    };
  }

  const pressure = wavePressure(index, content, isBoss);
  if (isBoss) {
    const rotation = bossRotationEntryForWave(index, content);
    return {
      index,
      isBoss: true,
      rewardSisu: rewardSisuForWave(index, pressure, true, content),
      pressure,
      pattern: rotation.bossCategory === 'pressure' ? 'boss_pressure' : 'boss_breach',
      bossId: rotation.bossId,
      bossCategory: rotation.bossCategory,
      spawns: buildBossSpawns(index, content, rotation.bossId)
    };
  }
  const pattern = nonBossPatterns[(index - 5) % nonBossPatterns.length];
  return {
    index,
    isBoss: false,
    rewardSisu: rewardSisuForWave(index, pressure, false, content),
    pressure,
    pattern,
    bossId: null,
    bossCategory: null,
    spawns: buildPatternSpawns(pattern, index, content, pressure)
  };
}

function waveCounts(waveDef: WaveDefinition, content: GameContent): WavePreviewEntry[] {
  const counts = new Map<EnemyUnitId, number>(ENEMY_IDS.map((enemyId) => [enemyId, 0]));
  for (const spawn of waveDef.spawns) counts.set(spawn.enemyId, (counts.get(spawn.enemyId) ?? 0) + 1);
  return ENEMY_IDS.filter((enemyId) => (counts.get(enemyId) ?? 0) > 0).map((enemyId) => ({
    id: enemyId,
    name: content.enemyArchetypes[enemyId].name,
    count: counts.get(enemyId) ?? 0
  }));
}

function occupied(state: RunState, tile: AxialCoord): boolean {
  return boardDefenders(state).some((defender) => defender.tile && sameCoord(defender.tile, tile)) ||
    state.enemies.some((enemy) => sameCoord(enemy.tile, tile));
}

function boardDefenderAtTile(state: RunState, tile: AxialCoord): DefenderInstance | null {
  return boardDefenders(state).find((defender) => defender.tile && sameCoord(defender.tile, tile)) ?? null;
}

function otherEnemyOccupiesTile(state: RunState, tile: AxialCoord, enemyInstanceId: number): boolean {
  return state.enemies.some((enemy) => enemy.instanceId !== enemyInstanceId && sameCoord(enemy.tile, tile));
}

function nearestSaunaDeployTile(state: RunState, content: GameContent, preferredTile?: AxialCoord | null): AxialCoord | null {
  const buildableTiles = currentBoardFootprint(state, content).buildableTiles;
  if (preferredTile && isBuildableTile(state, preferredTile, content) && !occupied(state, preferredTile)) {
    return { ...preferredTile };
  }

  const candidates = buildableTiles
    .filter((tile) => !occupied(state, tile))
    .sort((left, right) =>
      (hexDistance(left, CENTER) - hexDistance(right, CENTER)) ||
      (left.r - right.r) ||
      (left.q - right.q)
    );

  return candidates[0] ? { ...candidates[0] } : null;
}

function deploySaunaOccupant(state: RunState, content: GameContent, preferredTile?: AxialCoord | null): DefenderInstance | null {
  const saunaDefender = getDefender(state, state.saunaDefenderId);
  if (!saunaDefender || saunaDefender.location !== 'sauna') return null;
  const tile = nearestSaunaDeployTile(state, content, preferredTile);
  if (!tile) return null;

  saunaDefender.location = 'board';
  moveDefenderToTile(state, saunaDefender, tile, 'blink', BLINK_MOTION_DURATION_MS, CENTER);
  saunaDefender.attackReadyAtMs = state.timeMs + derivedStats(state, saunaDefender, content).attackCooldownMs;
  state.saunaDefenderId = null;
  autoFillSaunaFromBench(state, content);
  pushFx(state, 'blink', tile, 280, CENTER);
  return saunaDefender;
}

function autoFillSaunaFromBench(state: RunState, content: GameContent): DefenderInstance | null {
  return autoFillSaunaFromBenchFromModule(state, content, saunaDeps);
}

function maybeSaunaSlapSwap(state: RunState, defender: DefenderInstance, content: GameContent): boolean {
  void content;
  if (!hasSaunaSlapSwap(state) || state.waveSwapUsed || !defender.tile || defender.location !== 'board' || defender.hp <= 0) {
    return false;
  }
  const maxHp = derivedStats(state, defender, content).maxHp;
  if (defender.hp / maxHp > 0.35) return false;
  const saunaDefender = getDefender(state, state.saunaDefenderId);
  if (!saunaDefender || saunaDefender.location !== 'sauna') return false;

  const swapTile = { ...defender.tile };
  saunaDefender.location = 'board';
  moveDefenderToTile(state, saunaDefender, swapTile, 'blink', BLINK_MOTION_DURATION_MS, CENTER);
  saunaDefender.attackReadyAtMs = state.timeMs + derivedStats(state, saunaDefender, content).attackCooldownMs;

  defender.location = 'sauna';
  defender.tile = null;
  clearUnitMotion(defender);
  state.saunaDefenderId = defender.id;
  state.waveSwapUsed = true;
  state.message = `${saunaDefender.name} storms out of the sauna while ${defender.name} limps inside.`;
  pushFx(state, 'blink', swapTile, 320, CENTER);
  pushFx(state, 'heal', CENTER, 280, swapTile);
  return true;
}

function canUseSisu(state: RunState, content: GameContent): boolean {
  return state.phase === 'wave' && state.sisu.current >= content.config.sisuAbilityCost && state.timeMs >= state.sisu.cooldownUntilMs;
}

function recruitPriceFloor(): number {
  return 3;
}

function recruitRollCost(): number {
  return recruitRollCostFromModule();
}

function benchRerollCost(state: RunState, defenderId: string): number {
  return benchRerollCostFromModule(state, defenderId);
}

function recruitLevelUpCost(levelUpCount: number): number {
  return recruitLevelUpCostFromModule(levelUpCount);
}

function saunaRerollCost(state: RunState): number | null {
  return saunaRerollCostFromModule(state, recruitmentDeps);
}

function canAccessRecruitment(state: RunState): boolean {
  return !state.introOpen && state.phase !== 'lost' && state.overlayMode !== 'intermission' && state.overlayMode !== 'modifier_draft' && state.overlayMode !== 'subclass_draft';
}

function metashopVisible(state: RunState): boolean {
  return state.meta.shopUnlocked || state.meta.completedRuns > 0 || state.overlayMode === 'intermission';
}

function metashopEnabled(state: RunState): boolean {
  return state.overlayMode === 'intermission';
}

function hallOfFameEnabled(state: RunState): boolean {
  return state.overlayMode === 'intermission' && hallOfFameUnlocked(state);
}

function landmarkEnabled(state: RunState, landmarkId: WorldLandmarkId): boolean {
  switch (landmarkId) {
    case 'metashop':
      return metashopEnabled(state);
    case 'hall_of_fame':
      return hallOfFameEnabled(state);
    case 'beer_shop':
      return beerShopUnlocked(state);
    default:
      return false;
  }
}

function landmarkLocked(state: RunState, landmarkId: WorldLandmarkId): boolean {
  switch (landmarkId) {
    case 'metashop':
      return !state.meta.shopUnlocked;
    case 'hall_of_fame':
      return !hallOfFameUnlocked(state);
    case 'beer_shop':
      return !beerShopUnlocked(state);
    default:
      return true;
  }
}

function landmarkVisible(state: RunState, landmarkId: WorldLandmarkId): boolean {
  switch (landmarkId) {
    case 'metashop':
      return metashopVisible(state);
    case 'hall_of_fame':
      return hallOfFameUnlocked(state);
    case 'beer_shop':
      return beerShopUnlocked(state);
    default:
      return false;
  }
}

function landmarkBadgeText(state: RunState, landmarkId: WorldLandmarkId, content: GameContent): string {
  switch (landmarkId) {
    case 'metashop':
      return state.meta.shopUnlocked
        ? metashopEnabled(state) ? 'Open Now' : 'Between Runs'
        : `${content.config.metaShopUnlockCost} Steam`;
    case 'hall_of_fame':
      return hallOfFameEnabled(state) ? 'Open Now' : 'Between Runs';
    case 'beer_shop':
      return `Level ${beerShopTier(state)}`;
    default:
      return '';
  }
}

function landmarkStatusText(state: RunState, landmarkId: WorldLandmarkId, content: GameContent): string {
  switch (landmarkId) {
    case 'metashop':
      if (!state.meta.shopUnlocked) {
        return `Grand opening still costs ${content.config.metaShopUnlockCost} Steam.`;
      }
      return metashopEnabled(state)
        ? 'Browse permanent upgrades between runs.'
        : `${META_SHOP_LABEL} opens between runs only.`;
    case 'hall_of_fame':
      return hallOfFameEnabled(state)
        ? 'Browse title and name buffs between runs.'
        : `${HALL_OF_FAME_LABEL} opens between runs only.`;
    case 'beer_shop':
      return `Bartender live with ${state.activeAlcohols.length}/${beerActiveSlotCapForTier(beerShopTier(state))} active drink slots filled.`;
    default:
      return '';
  }
}

function hudWorldLandmarkEntry(state: RunState, landmarkId: WorldLandmarkId, content: GameContent): HudWorldLandmarkEntry {
  return {
    id: landmarkId,
    label: landmarkId === 'metashop'
      ? META_SHOP_LABEL
      : landmarkId === 'hall_of_fame'
        ? HALL_OF_FAME_LABEL
        : 'Beer Shop',
    tile: landmarkTileForState(state, landmarkId, content),
    visible: landmarkVisible(state, landmarkId),
    enabled: landmarkEnabled(state, landmarkId),
    locked: landmarkLocked(state, landmarkId),
    selected: state.selectedWorldLandmarkId === landmarkId,
    badgeText: landmarkBadgeText(state, landmarkId, content),
    statusText: landmarkStatusText(state, landmarkId, content)
  };
}

function canRollRecruitOffers(state: RunState): boolean {
  return (
    canAccessRecruitment(state) &&
    state.sisu.current >= recruitRollCost()
  );
}

function hasSelectedSaunaReplacement(state: RunState): boolean {
  return state.selectedMapTarget === 'sauna';
}

function pendingReadyRecruit(state: RunState): DefenderInstance | null {
  return state.defenders.find((defender) => defender.location === 'ready') ?? null;
}

function canHireRecruitToSauna(state: RunState, offer: RecruitOffer, content: GameContent): boolean {
  if (!canAccessRecruitment(state) || state.sisu.current < offer.price) return false;
  const pending = pendingReadyRecruit(state);
  if (pending && boardDefenders(state).length < boardCap(state, content)) return false;
  const saunaDefender = getDefender(state, state.saunaDefenderId);
  if (saunaDefender && saunaDefender.location === 'sauna') {
    return hasSelectedSaunaReplacement(state);
  }
  return livingDefenders(state).length < rosterCap(state, content);
}

function hireRecruitToSaunaLabel(state: RunState, offer: RecruitOffer, content: GameContent): string {
  const saunaDefender = getDefender(state, state.saunaDefenderId);
  if (saunaDefender && saunaDefender.location === 'sauna') {
    return hasSelectedSaunaReplacement(state) ? `Hire To Sauna (${offer.price})` : 'Select Sauna To Replace';
  }
  if (livingDefenders(state).length >= rosterCap(state, content)) {
    return 'Roster Full';
  }
  return `Hire To Sauna (${offer.price})`;
}

function canLiveRetreatDefenderToSauna(state: RunState, defender: DefenderInstance): boolean {
  const saunaDefender = getDefender(state, state.saunaDefenderId);
  return (
    defender.location === 'board' &&
    state.phase === 'wave' &&
    state.overlayMode === 'none' &&
    (!saunaDefender || saunaDefender.location !== 'sauna') &&
    state.sisu.current >= LIVE_SAUNA_RETREAT_SISU_COST &&
    state.timeMs >= state.saunaRetreatReadyAtMs
  );
}

function canCommandDefenderToSauna(state: RunState, defender: DefenderInstance): boolean {
  if (defender.location !== 'board' || state.overlayMode !== 'none') return false;
  if (state.phase === 'prep') return true;
  return canLiveRetreatDefenderToSauna(state, defender);
}

function saunaCommandLabel(state: RunState, defender: DefenderInstance): string | null {
  if (defender.location !== 'board') return null;
  const saunaDefender = getDefender(state, state.saunaDefenderId);
  if (state.phase === 'prep' && state.overlayMode === 'none') {
    return saunaDefender && saunaDefender.location === 'sauna'
      ? `Swap ${defender.name} Into Sauna`
      : `Send ${defender.name} To Sauna`;
  }
  if (state.phase !== 'wave' || state.overlayMode !== 'none') return null;
  if (saunaDefender && saunaDefender.location === 'sauna') return 'Sauna occupied';
  if (state.sisu.current < LIVE_SAUNA_RETREAT_SISU_COST) return `Need ${LIVE_SAUNA_RETREAT_SISU_COST} SISU`;
  if (state.timeMs < state.saunaRetreatReadyAtMs) {
    return `Retreat ${Math.ceil((state.saunaRetreatReadyAtMs - state.timeMs) / 1000)}s`;
  }
  return `Live Retreat (${LIVE_SAUNA_RETREAT_SISU_COST} SISU)`;
}

function canRerollSaunaDefender(state: RunState): boolean {
  return canRerollSaunaDefenderFromModule(state, recruitmentDeps);
}

function recruitmentStatusText(state: RunState, content: GameContent): string {
  return recruitmentStatusTextFromModule(state, content, recruitmentDeps);
}

function recruitScore(defender: DefenderInstance, content: GameContent): number {
  const template = content.defenderTemplates[defender.templateId];
  const hpRatio = defender.stats.maxHp / template.stats.maxHp;
  const damageRatio = defender.stats.damage / Math.max(1, template.stats.damage);
  const healRatio = template.stats.heal > 0 ? defender.stats.heal / Math.max(1, template.stats.heal) : 1;
  const rangeRatio = defender.stats.range / Math.max(1, template.stats.range);
  const speedRatio = template.stats.attackCooldownMs / Math.max(360, defender.stats.attackCooldownMs);
  return hpRatio * 0.34 + damageRatio * 0.3 + healRatio * 0.16 + rangeRatio * 0.08 + speedRatio * 0.12;
}

function recruitQuality(score: number): RecruitOffer['quality'] {
  if (score >= 1.12) return 'elite';
  if (score >= 0.96) return 'solid';
  return 'rough';
}

function recruitStartingLevel(state: RunState): number {
  const bonus = state.recruitLevelBonus;
  let level = 1;
  if (rng(state) < Math.min(0.9, bonus * 0.24)) {
    level = 2;
  }
  if (level >= 2 && rng(state) < Math.min(0.72, Math.max(0, bonus - 1) * 0.18)) {
    level = 3;
  }
  if (level >= 3 && rng(state) < Math.min(0.5, Math.max(0, bonus - 3) * 0.12)) {
    level = 4;
  }
  if (level >= 4 && rng(state) < Math.min(0.35, Math.max(0, bonus - 6) * 0.08)) {
    level = 5;
  }
  return level;
}

function recruitLevelOdds(bonus: number): Array<{ level: number; chance: number }> {
  const toLv2 = Math.min(0.9, bonus * 0.24);
  const toLv3 = Math.min(0.72, Math.max(0, bonus - 1) * 0.18);
  const toLv4 = Math.min(0.5, Math.max(0, bonus - 3) * 0.12);
  const toLv5 = Math.min(0.35, Math.max(0, bonus - 6) * 0.08);

  const level5 = toLv2 * toLv3 * toLv4 * toLv5;
  const level4 = toLv2 * toLv3 * toLv4 * (1 - toLv5);
  const level3 = toLv2 * toLv3 * (1 - toLv4);
  const level2 = toLv2 * (1 - toLv3);
  const level1 = 1 - toLv2;

  return [
    { level: 1, chance: level1 },
    { level: 2, chance: level2 },
    { level: 3, chance: level3 },
    { level: 4, chance: level4 },
    { level: 5, chance: level5 }
  ];
}

function setDefenderStartingLevel(defender: DefenderInstance, level: number): void {
  defender.level = level;
  defender.xp = xpForLevel(level);
}

function recruitOfferPrice(defender: DefenderInstance, content: GameContent): number {
  const score = recruitScore(defender, content);
  const qualityTax = score >= 1.12 ? 2 : score >= 0.96 ? 1 : 0;
  const statTax = Math.max(0, Math.round((score - 0.82) * 6));
  const levelTax = Math.max(0, defender.level - 1) * 2;
  return Math.max(recruitPriceFloor(), recruitPriceFloor() + qualityTax + statTax + levelTax);
}

function availableGlobalModifierDefinitions(
  state: RunState,
  content: GameContent,
  includeFallback: boolean
): GlobalModifierDefinition[] {
  return Object.values(content.globalModifierDefinitions)
    .filter((definition) => (includeFallback ? definition.isFallback === true : !definition.isFallback))
    .filter((definition) => globalModifierStacks(state, definition) > 0);
}

function modifierDraftTierForWave(index: number): number {
  if (index >= 20) return 3;
  if (index >= 10) return 2;
  return 1;
}

function allowedModifierRaritiesForWave(index: number): Rarity[] {
  const tier = modifierDraftTierForWave(index);
  return tier === 1
    ? ['common', 'rare']
    : tier === 2
      ? ['common', 'rare', 'epic']
      : ['common', 'rare', 'epic', 'legendary'];
}

function guaranteedModifierRarityFloor(index: number): Rarity {
  return modifierDraftTierForWave(index) >= 3 ? 'epic' : 'rare';
}

function modifierDraftWeight(definition: GlobalModifierDefinition, waveIndex: number): number {
  const tierWeights = RARITY_WEIGHT_BY_WAVE[modifierDraftTierForWave(waveIndex)];
  return tierWeights[definition.rarity];
}

function pickWeightedModifier(
  state: RunState,
  definitions: GlobalModifierDefinition[],
  waveIndex: number
): GlobalModifierDefinition | null {
  return weightedPick(state, definitions, (definition) => modifierDraftWeight(definition, waveIndex));
}

function rollGlobalModifierDraftOffersIntoState(state: RunState, content: GameContent): boolean {
  const allowedRarities = new Set<Rarity>(allowedModifierRaritiesForWave(state.currentWave.index));
  const primaryPool = availableGlobalModifierDefinitions(state, content, false)
    .filter((definition) => allowedRarities.has(definition.rarity));
  const fallbackPool = availableGlobalModifierDefinitions(state, content, true)
    .filter((definition) => allowedRarities.has(definition.rarity));
  const picked: GlobalModifierDefinition[] = [];
  const pickedIds = new Set<GlobalModifierId>();
  const waveIndex = state.currentWave.index;
  const guaranteedFloor = guaranteedModifierRarityFloor(waveIndex);
  const uniquePool = [...primaryPool, ...fallbackPool];
  const pushPick = (candidate: GlobalModifierDefinition | null) => {
    if (!candidate || pickedIds.has(candidate.id)) return false;
    picked.push(candidate);
    pickedIds.add(candidate.id);
    return true;
  };
  const takeUniqueFromPool = (pool: GlobalModifierDefinition[]) => {
    const remaining = pool.filter((definition) => !pickedIds.has(definition.id));
    while (remaining.length > 0 && picked.length < 3) {
      const candidate = pickWeightedModifier(state, remaining, waveIndex);
      if (!candidate) break;
      pushPick(candidate);
      const nextIndex = remaining.findIndex((definition) => definition.id === candidate.id);
      if (nextIndex >= 0) remaining.splice(nextIndex, 1);
    }
  };

  const guaranteedPool = uniquePool.filter((definition) => rarityRank(definition.rarity) >= rarityRank(guaranteedFloor));
  pushPick(pickWeightedModifier(state, guaranteedPool, waveIndex));
  takeUniqueFromPool(primaryPool);
  if (picked.length < 3) takeUniqueFromPool(fallbackPool);

  const repeatPool = [...primaryPool, ...fallbackPool];
  while (repeatPool.length > 0 && picked.length < 3) {
    const candidate = pickWeightedModifier(state, repeatPool, waveIndex);
    if (!candidate) break;
    picked.push(candidate);
  }

  state.globalModifierDraftOffers = picked.map((definition) => definition.id);
  return state.globalModifierDraftOffers.length > 0;
}

function fillDefenderToMax(state: RunState, defender: DefenderInstance, content: GameContent): void {
  fillDefenderToMaxFromModule(state, defender, content, recruitmentDeps);
}

function addRecruitToReserve(state: RunState, defender: DefenderInstance, content: GameContent): void {
  addRecruitToReserveFromModule(state, defender, content, recruitmentDeps);
}

function moveRecruitToSauna(state: RunState, defender: DefenderInstance): void {
  defender.location = 'sauna';
  defender.tile = null;
  defender.homeTile = null;
  clearUnitMotion(defender);
  state.saunaDefenderId = defender.id;
}

function performLiveRetreatToSauna(state: RunState, defender: DefenderInstance): void {
  defender.location = 'sauna';
  defender.tile = null;
  clearUnitMotion(defender);
  state.saunaDefenderId = defender.id;
  state.sisu.current -= LIVE_SAUNA_RETREAT_SISU_COST;
  state.saunaRetreatReadyAtMs = state.timeMs + LIVE_SAUNA_RETREAT_COOLDOWN_MS;
}

function createRecruitOffer(state: RunState, content: GameContent): RecruitOffer {
  const templateId = pick(state, DEF_IDS);
  const candidate = newDefender(state, templateId, content);
  setDefenderStartingLevel(candidate, recruitStartingLevel(state));
  const score = recruitScore(candidate, content);
  const quality = recruitQuality(score);
  const price = state.recruitMarketIsFree ? 0 : recruitOfferPrice(candidate, content);
  return {
    offerId: state.nextRecruitOfferId++,
    price,
    quality,
    candidate
  };
}

function rollRecruitOffersIntoState(state: RunState, content: GameContent, isFree = false): void {
  state.recruitMarketIsFree = isFree;
  state.recruitOffers = Array.from({ length: RECRUIT_MARKET_SLOT_COUNT }, () => createRecruitOffer(state, content));
}

function createBeerShopOffer(state: RunState, alcoholId: AlcoholId): BeerShopOffer {
  return {
    offerId: state.nextBeerOfferId++,
    alcoholId
  };
}

function rollBeerShopOffersIntoState(state: RunState, content: GameContent): void {
  if (!beerShopUnlocked(state)) {
    state.beerShopOffers = [];
    return;
  }
  const count = beerOfferCountForTier(beerShopTier(state));
  const pool = Object.keys(content.alcoholDefinitions) as AlcoholId[];
  const offers: BeerShopOffer[] = [];
  const remaining = [...pool];
  while (offers.length < count && remaining.length > 0) {
    const index = randomInt(state, 0, remaining.length - 1);
    const alcoholId = remaining.splice(index, 1)[0];
    offers.push(createBeerShopOffer(state, alcoholId));
  }
  state.beerShopOffers = offers;
}

function canBuyBeerOffer(state: RunState, offer: BeerShopOffer, content: GameContent): boolean {
  if (!beerShopUnlocked(state)) return false;
  const definition = content.alcoholDefinitions[offer.alcoholId];
  if (state.sisu.current < definition.price) return false;
  const active = activeAlcoholEntry(state, offer.alcoholId);
  if (active) return true;
  return state.activeAlcohols.length < beerActiveSlotCapForTier(beerShopTier(state));
}

function replaceDefenderWithRecruit(
  state: RunState,
  outgoing: DefenderInstance,
  incoming: DefenderInstance,
  content: GameContent
): void {
  incoming.location = outgoing.location;
  incoming.tile = outgoing.tile ? { ...outgoing.tile } : null;
  incoming.motion = outgoing.motion ? { ...outgoing.motion, fromTile: cloneCoord(outgoing.motion.fromTile), toTile: cloneCoord(outgoing.motion.toTile) } : null;
  incoming.attackReadyAtMs =
    incoming.location === 'board'
      ? state.timeMs + derivedStats(state, incoming, content).attackCooldownMs
      : 0;

  if (outgoing.location === 'sauna') {
    state.saunaDefenderId = incoming.id;
  } else if (state.saunaDefenderId === outgoing.id) {
    state.saunaDefenderId = null;
  }

  state.defenders = state.defenders.filter((defender) => defender.id !== outgoing.id);
  state.defenders.push(incoming);
  delete state.benchRerollCountsByDefenderId[outgoing.id];
  fillDefenderToMax(state, incoming, content);

  if (state.selectedDefenderId === outgoing.id || state.selectedMapTarget === 'sauna') {
    state.selectedDefenderId = null;
    state.selectedMapTarget = null;
  }
}

function pushFx(
  state: RunState,
  kind: CombatFxKind,
  tile: AxialCoord,
  durationMs: number,
  secondaryTile?: AxialCoord | null
): void {
  const fx: CombatFxEvent = {
    id: state.nextFxEventId++,
    kind,
    tile: { ...tile },
    secondaryTile: secondaryTile ? { ...secondaryTile } : null,
    ageMs: 0,
    durationMs
  };
  state.fxEvents.push(fx);
}

function ageFx(state: RunState, deltaMs: number): void {
  state.fxEvents = state.fxEvents
    .map((event) => ({ ...event, ageMs: event.ageMs + deltaMs }))
    .filter((event) => event.ageMs < event.durationMs);
}

function enemyFxDurationMs(kind: CombatFxKind): number {
  switch (kind) {
    case 'fireball':
      return 260;
    case 'pulse':
      return 280;
    case 'lava_whip':
      return 280;
    case 'thunder_run':
      return 360;
    case 'sauna_quake':
      return 420;
    case 'afterburn_hook':
      return 260;
    case 'ember_storm':
      return 320;
    default:
      return 220;
  }
}

function healFxDurationMs(kind: CombatFxKind): number {
  return kind === 'pulse' ? 280 : 320;
}

function scheduleFireball(
  state: RunState,
  defender: DefenderInstance,
  targetTile: AxialCoord,
  damageSnapshot: number
): void {
  const pending: PendingFireball = {
    ownerDefenderId: defender.id,
    targetTile: cloneCoord(targetTile),
    explodeAtMs: state.timeMs + FIREBALL_DELAY_MS,
    damageSnapshot: Math.max(1, Math.round(damageSnapshot))
  };
  state.pendingFireballs.push(pending);
  defender.fireballReadyAtMs = state.timeMs + FIREBALL_COOLDOWN_MS;
}

function resolvePendingFireballs(state: RunState): void {
  const remaining: PendingFireball[] = [];
  for (const pending of state.pendingFireballs) {
    if (state.timeMs < pending.explodeAtMs) {
      remaining.push(pending);
      continue;
    }
    for (const enemy of state.enemies) {
      if (hexDistance(enemy.tile, pending.targetTile) <= FIREBALL_RADIUS) {
        applyDamageToEnemy(state, enemy, pending.damageSnapshot, pending.ownerDefenderId);
      }
    }
    pushFx(state, 'fireball', pending.targetTile, 360);
    addHitStop(state, 48);
  }
  state.pendingFireballs = remaining;
}

function scheduleSaunaQuake(
  state: RunState,
  defender: DefenderInstance,
  targetTile: AxialCoord,
  damageSnapshot: number
): void {
  state.pendingSaunaQuakes.push({
    ownerDefenderId: defender.id,
    targetTile: cloneCoord(targetTile),
    explodeAtMs: state.timeMs + SAUNA_QUAKE_DELAY_MS,
    damageSnapshot: Math.max(1, Math.round(damageSnapshot * 0.75))
  });
  defender.saunaQuakeReadyAtMs = state.timeMs + SAUNA_QUAKE_COOLDOWN_MS;
}

function resolvePendingSaunaQuakes(state: RunState): void {
  const remaining: PendingSaunaQuake[] = [];
  for (const pending of state.pendingSaunaQuakes) {
    if (state.timeMs < pending.explodeAtMs) {
      remaining.push(pending);
      continue;
    }
    for (const enemy of state.enemies) {
      if (hexDistance(enemy.tile, pending.targetTile) <= 1) {
        applyDamageToEnemy(state, enemy, pending.damageSnapshot, pending.ownerDefenderId);
      }
    }
    pushFx(state, 'sauna_quake', pending.targetTile, 420);
    addHitStop(state, 52);
  }
  state.pendingSaunaQuakes = remaining;
}

function emberStormTargetTiles(state: RunState, targetTile: AxialCoord, content: GameContent): AxialCoord[] {
  const candidates = [
    cloneCoord(targetTile),
    ...DIRS.map((dir) => add(targetTile, dir)).filter((tile) => isTileInBoard(state, tile, content))
  ];
  const unique = new Map(candidates.map((tile) => [coordKey(tile), tile]));
  const ordered = [...unique.values()];
  const splashTiles = ordered.slice(1);
  for (let index = splashTiles.length - 1; index > 0; index -= 1) {
    const swapIndex = randomInt(state, 0, index);
    [splashTiles[index], splashTiles[swapIndex]] = [splashTiles[swapIndex], splashTiles[index]];
  }
  return [ordered[0], ...splashTiles.slice(0, 2)];
}

function scheduleEmberStorm(
  state: RunState,
  defender: DefenderInstance,
  targetTile: AxialCoord,
  damageSnapshot: number,
  content: GameContent
): void {
  const strikeTiles = emberStormTargetTiles(state, targetTile, content);
  strikeTiles.forEach((tile, volleyIndex) => {
    const strike: PendingEmberStormStrike = {
      ownerDefenderId: defender.id,
      targetTile: cloneCoord(tile),
      strikeAtMs: state.timeMs + EMBER_STORM_STRIKE_DELAY_MS + EMBER_STORM_STRIKE_STEP_MS * volleyIndex,
      damageSnapshot: Math.max(1, Math.round(damageSnapshot * 0.55)),
      volleyIndex
    };
    state.pendingEmberStormStrikes.push(strike);
  });
  defender.emberStormReadyAtMs = state.timeMs + EMBER_STORM_COOLDOWN_MS;
}

function resolvePendingEmberStormStrikes(state: RunState): void {
  const remaining: PendingEmberStormStrike[] = [];
  for (const pending of state.pendingEmberStormStrikes) {
    if (state.timeMs < pending.strikeAtMs) {
      remaining.push(pending);
      continue;
    }
    for (const enemy of state.enemies) {
      if (sameCoord(enemy.tile, pending.targetTile)) {
        applyDamageToEnemy(state, enemy, pending.damageSnapshot, pending.ownerDefenderId);
      }
    }
    pushFx(state, 'ember_storm', pending.targetTile, 320);
    addHitStop(state, 24);
  }
  state.pendingEmberStormStrikes = remaining;
}

function activateBoilingOrbit(
  state: RunState,
  defender: DefenderInstance,
  damageSnapshot: number
): void {
  state.activeBoilingOrbits = state.activeBoilingOrbits.filter((orbit) => orbit.ownerDefenderId !== defender.id);
  state.activeBoilingOrbits.push({
    ownerDefenderId: defender.id,
    expiresAtMs: state.timeMs + BOILING_ORBIT_DURATION_MS,
    nextTickAtMs: state.timeMs + BOILING_ORBIT_TICK_MS,
    damageSnapshot: Math.max(1, Math.round(damageSnapshot * 0.4))
  });
  defender.boilingOrbitReadyAtMs = state.timeMs + BOILING_ORBIT_COOLDOWN_MS;
  if (defender.tile) {
    pushFx(state, 'boiling_orbit', defender.tile, 340);
  }
}

function resolveBoilingOrbits(state: RunState): void {
  const remaining: ActiveBoilingOrbit[] = [];
  for (const orbit of state.activeBoilingOrbits) {
    const owner = getDefender(state, orbit.ownerDefenderId);
    if (!owner || owner.location !== 'board' || !owner.tile) continue;

    while (state.timeMs >= orbit.nextTickAtMs && orbit.nextTickAtMs < orbit.expiresAtMs) {
      const target = state.enemies
        .filter((enemy) => enemy.hp > 0 && hexDistance(enemy.tile, owner.tile as AxialCoord) <= 1)
        .sort((left, right) =>
          (left.hp - right.hp) ||
          (hexDistance(left.tile, owner.tile as AxialCoord) - hexDistance(right.tile, owner.tile as AxialCoord)))[0] ?? null;
      if (target) {
        applyDamageToEnemy(state, target, orbit.damageSnapshot, owner.id);
        pushFx(state, 'boiling_orbit', owner.tile, 220, target.tile);
        addHitStop(state, 12);
      }
      orbit.nextTickAtMs += BOILING_ORBIT_TICK_MS;
    }

    if (state.timeMs < orbit.expiresAtMs) {
      remaining.push(orbit);
    }
  }
  state.activeBoilingOrbits = remaining;
}

function addHitStop(state: RunState, durationMs: number): void {
  state.hitStopMs = Math.max(state.hitStopMs, durationMs);
}

function nearestEnemy(state: RunState, tile: AxialCoord): EnemyInstance | null {
  return [...state.enemies]
    .filter((enemy) => enemy.hp > 0)
    .sort((left, right) => (hexDistance(tile, left.tile) - hexDistance(tile, right.tile)) || (left.hp - right.hp))[0] ?? null;
}

function saunaThreats(state: RunState, content: GameContent): EnemyInstance[] {
  return state.enemies
    .filter((enemy) => enemyTarget(state, enemy, content) === 'sauna')
    .sort((left, right) => (hexDistance(left.tile, CENTER) - hexDistance(right.tile, CENTER)) || (left.hp - right.hp));
}

function alliesToHeal(state: RunState, defender: DefenderInstance, stats: UnitStats, content: GameContent): DefenderInstance[] {
  if (!defender.tile) return [];
  return boardDefenders(state)
    .filter((ally) => ally.id !== defender.id && ally.tile)
    .filter((ally) => ally.hp < derivedStats(state, ally, content).maxHp && hexDistance(defender.tile as AxialCoord, ally.tile as AxialCoord) <= stats.range)
    .sort((left, right) => {
      const leftMissing = derivedStats(state, left, content).maxHp - left.hp;
      const rightMissing = derivedStats(state, right, content).maxHp - right.hp;
      return (rightMissing - leftMissing) || (left.hp - right.hp);
    });
}

function tryBlink(state: RunState, defender: DefenderInstance, content: GameContent): boolean {
  if (!defender.tile || !defender.skills.includes('blink_step') || state.timeMs < defender.blinkReadyAtMs) return false;
  const from = { ...defender.tile };
  const hpRatio = defender.hp / Math.max(1, derivedStats(state, defender, content).maxHp);
  if (hpRatio >= 0.5) return false;

  const canUseBlinkTile = (tile: AxialCoord | null): tile is AxialCoord => {
    if (!tile) return false;
    return isBuildableTile(state, tile, content) &&
      !occupied(state, tile) &&
      !sameCoord(tile, defender.tile as AxialCoord);
  };

  let retreatTile = canUseBlinkTile(defender.homeTile) ? cloneCoord(defender.homeTile) : null;
  if (!retreatTile) {
    const healer = boardDefenders(state)
      .filter((ally) => ally.id !== defender.id && ally.tile)
      .filter((ally) => ally.hp > 0 && derivedStats(state, ally, content).heal > 0)
      .sort((left, right) =>
        (hexDistance(defender.tile as AxialCoord, left.tile as AxialCoord) - hexDistance(defender.tile as AxialCoord, right.tile as AxialCoord)) ||
        (hexDistance(left.tile as AxialCoord, CENTER) - hexDistance(right.tile as AxialCoord, CENTER)) ||
        left.id.localeCompare(right.id)
      )[0] ?? null;
    if (healer?.tile) {
      retreatTile = DIRS
        .map((dir) => add(healer.tile as AxialCoord, dir))
        .filter((tile) => canUseBlinkTile(tile))
        .sort((left, right) =>
          (hexDistance(defender.tile as AxialCoord, left) - hexDistance(defender.tile as AxialCoord, right)) ||
          (hexDistance(left, CENTER) - hexDistance(right, CENTER)) ||
          (left.r - right.r) ||
          (left.q - right.q)
        )[0] ?? null;
    }
  }
  if (!retreatTile) return false;

  moveDefenderToTile(state, defender, retreatTile, 'blink', BLINK_MOTION_DURATION_MS, from);
  defender.blinkReadyAtMs = state.timeMs + BLINK_STEP_COOLDOWN_MS;
  pushFx(state, 'blink', defender.tile, 420, from);
  return true;
}

function tryBlinkTowardEnemy(state: RunState, defender: DefenderInstance, stats: UnitStats, content: GameContent): boolean {
  if (!defender.tile || !defender.skills.includes('blink_step') || state.timeMs < defender.blinkReadyAtMs) return false;
  const targetEnemy = nearestEnemy(state, defender.tile);
  if (!targetEnemy) return false;

  const from = cloneCoord(defender.tile);
  const destination = currentBoardFootprint(state, content).buildableTiles
    .filter((tile) => !occupied(state, tile))
    .filter((tile) => !sameCoord(tile, defender.tile as AxialCoord))
    .filter((tile) => hexDistance(tile, targetEnemy.tile) <= stats.range)
    .sort((left, right) =>
      (hexDistance(left, targetEnemy.tile) - hexDistance(right, targetEnemy.tile)) ||
      (hexDistance(left, CENTER) - hexDistance(right, CENTER)) ||
      (left.r - right.r) ||
      (left.q - right.q)
    )[0];
  if (!destination) return false;

  moveDefenderToTile(state, defender, destination, 'blink', BLINK_MOTION_DURATION_MS, from);
  defender.blinkReadyAtMs = state.timeMs + BLINK_STEP_COOLDOWN_MS;
  pushFx(state, 'blink', destination, 320, from);
  return true;
}

function moveDefenderTowardSaunaThreat(
  state: RunState,
  defender: DefenderInstance,
  stats: UnitStats,
  content: GameContent,
  cooldownMultiplier: number
): boolean {
  if (!defender.tile) return false;

  const threat = saunaThreats(state, content)
    .sort((left, right) => (hexDistance(defender.tile as AxialCoord, left.tile) - hexDistance(defender.tile as AxialCoord, right.tile)) || (left.hp - right.hp))[0];
  if (!threat) return false;

  const currentThreatDistance = hexDistance(defender.tile, threat.tile);
  const currentCenterDistance = hexDistance(defender.tile, CENTER);
  const nextTile = DIRS.map((dir) => add(defender.tile as AxialCoord, dir))
    .filter((tile) => isBuildableTile(state, tile, content) && !occupied(state, tile))
    .sort((left, right) =>
      (hexDistance(left, threat.tile) - hexDistance(right, threat.tile)) ||
      (hexDistance(left, CENTER) - hexDistance(right, CENTER)) ||
      (left.r - right.r) ||
      (left.q - right.q)
    )[0];

  if (!nextTile) return false;

  const closesThreatGap = hexDistance(nextTile, threat.tile) < currentThreatDistance;
  const closesCenterGap = hexDistance(nextTile, CENTER) < currentCenterDistance;
  if (!closesThreatGap && !closesCenterGap) return false;

  moveDefenderToTile(state, defender, nextTile, 'step', STEP_MOTION_DURATION_MS);
  defender.attackReadyAtMs = state.timeMs + Math.max(260, (stats.attackCooldownMs / cooldownMultiplier) * 0.45);
  return true;
}

function allLootDrops(state: RunState): InventoryDrop[] {
  return [...state.headerItems, ...state.headerSkills, ...state.inventory];
}

function setRecentLootFromState(state: RunState): void {
  const drops = allLootDrops(state);
  state.recentDropId = drops.length > 0 ? drops[drops.length - 1].instanceId : null;
}

function removeLootDrop(state: RunState, dropId: number): InventoryDrop | null {
  const groups = [state.headerItems, state.headerSkills, state.inventory];
  for (const group of groups) {
    const index = group.findIndex((entry) => entry.instanceId === dropId);
    if (index >= 0) {
      const [removed] = group.splice(index, 1);
      if (state.selectedInventoryDropId === dropId) {
        state.selectedInventoryDropId = allLootDrops(state)[0]?.instanceId ?? null;
      }
      if (state.recentDropId === dropId) {
        setRecentLootFromState(state);
      }
      return removed;
    }
  }
  return null;
}

function storeLootDrop(state: RunState, drop: InventoryDrop, content: GameContent): 'header' | 'stash' | 'discarded' {
  if (drop.kind === 'item' && state.headerItems.length < headerItemCap(content)) {
    state.headerItems.push(drop);
    return 'header';
  }
  if (drop.kind === 'skill' && state.headerSkills.length < headerSkillCap(content)) {
    state.headerSkills.push(drop);
    return 'header';
  }
  if (inventoryUnlocked(state) && state.inventory.length < inventoryCap(state, content)) {
    state.inventory.push(drop);
    return 'stash';
  }
  return 'discarded';
}

function skillDropChanceForRarity(rarity: Rarity): number {
  switch (rarity) {
    case 'legendary':
      return 0.58;
    case 'epic':
      return 0.52;
    case 'rare':
      return 0.4;
    case 'common':
    default:
      return 0.32;
  }
}

function maybeDrop(state: RunState, enemyId: EnemyUnitId, content: GameContent): void {
  const alcoholBonus = alcoholTotals(state, content);
  const chance =
    isBossLootEnemy(enemyId)
      ? content.config.bossLootChance
      : content.config.baseLootChance + lootLuckBonus(state.meta.upgrades.loot_luck) + (alcoholBonus.lootChance ?? 0);
  if (rng(state) > chance) return;
  const rarity = weightedPick(
    state,
    RARITY_ORDER,
    (entry) => lootRarityWeights(state.meta.upgrades.loot_rarity)[entry]
  ) ?? 'common';
  const kind = rng(state) < skillDropChanceForRarity(rarity) ? 'skill' : 'item';
  const chosen =
    kind === 'item'
      ? pick(
          state,
          Object.values(content.itemDefinitions).filter((entry) => entry.rarity === rarity).length > 0
            ? Object.values(content.itemDefinitions).filter((entry) => entry.rarity === rarity)
            : Object.values(content.itemDefinitions)
        )
      : pick(
          state,
          Object.values(content.skillDefinitions).filter((entry) => entry.rarity === rarity).length > 0
            ? Object.values(content.skillDefinitions).filter((entry) => entry.rarity === rarity)
            : Object.values(content.skillDefinitions)
        );
  const drop: InventoryDrop = {
    instanceId: state.nextLootInstanceId++,
    kind,
    definitionId: chosen.id,
    rarity,
    name: chosen.name,
    effectText: chosen.effectText,
    flavorText: chosen.flavorText,
    artPath: chosen.artPath,
    waveFound: state.waveIndex,
    sourceEnemyId: enemyId
  };
  const storage = storeLootDrop(state, drop, content);
  if (storage === 'discarded') {
    state.message = `${drop.name} dropped, but there was no room. Buy the Overflow Stash in the shop to keep extra loot.`;
    return;
  }
  state.recentDropId = drop.instanceId;
  state.selectedInventoryDropId = drop.instanceId;
  state.message =
    storage === 'header'
      ? `${drop.name} dropped into the header loot bar.`
      : `${drop.name} was sent to your Overflow Stash.`;
  maybeAutoHandleLootDrop(state, drop, content);
}

function grantXp(state: RunState, defender: DefenderInstance, amount: number, content: GameContent): string | null {
  const beforeLevel = defender.level;
  const previousMaxHp = derivedStats(state, defender, content).maxHp;
  defender.xp += amount;
  defender.level = levelFromXp(defender.xp);
  if (defender.level > beforeLevel) {
    const nextMaxHp = derivedStats(state, defender, content).maxHp;
    defender.hp = Math.min(nextMaxHp, defender.hp + Math.max(0, nextMaxHp - previousMaxHp));
    queueSubclassDraftsForLevelUps(state, defender, beforeLevel, content);
    const pendingUnlock = state.subclassDraftQueue.find((entry) => entry.defenderId === defender.id && entry.unlockLevel <= defender.level);
    if (pendingUnlock) {
      return `${defender.name} hit level ${defender.level} and can choose a new subclass branch.`;
    }
    return `${defender.name} hit level ${defender.level}.`;
  }
  return null;
}

function grantCombatXp(state: RunState, defender: DefenderInstance, amount: number, content: GameContent): void {
  const levelMessage = grantXp(state, defender, amount, content);
  if (levelMessage) {
    state.message = levelMessage;
  }
}

function createDeathLogText(state: RunState, defender: DefenderInstance, content: GameContent): { enemyName: string; text: string } {
  const enemyId = defender.lastHitByEnemyId;
  const enemyName = enemyId ? content.enemyArchetypes[enemyId].name : 'Mysterious Steam';
  const lines = enemyId ? DEATH_LINES[enemyId] : ['was claimed by the sauna in a suspiciously dramatic accident'];
  const line = pick(state, lines);
  return {
    enemyName,
    text: `Wave ${state.currentWave.index} Â· ${defender.name} ${defender.title} fell when ${enemyName} ${line}.`
  };
}

function resolveEnemyDeaths(state: RunState, content: GameContent): void {
  const living: EnemyInstance[] = [];
  for (const enemy of state.enemies) {
    if (enemy.hp > 0) {
      living.push(enemy);
      continue;
    }
    if (state.selectedEnemyInstanceId === enemy.instanceId) {
      state.selectedEnemyInstanceId = null;
      if (state.selectedMapTarget === 'enemy') {
        state.selectedMapTarget = null;
      }
    }
    if (enemy.lastHitByDefenderId) {
      const killer = getDefender(state, enemy.lastHitByDefenderId);
      if (killer && killer.location !== 'dead') {
        killer.kills += 1;
        if (killer.skills.includes('blink_step')) {
          killer.blinkReadyAtMs = state.timeMs;
        }
        if (killer.skills.includes('battle_hymn')) {
          killer.battleHymnReadyAtMs = Math.max(state.timeMs, killer.battleHymnReadyAtMs - 1000);
        }
        const levelMessage = grantXp(state, killer, xpForEnemy(enemy.archetypeId), content);
        if (levelMessage) {
          state.message = levelMessage;
        }
        maybeTriggerDefenderKillSpeech(state, killer, content, content.enemyArchetypes[enemy.archetypeId].name);
      }
    }
    if (isEndUserHordeBossWave(state.currentWave) && enemy.archetypeId === 'thirsty_user') {
      setEndUserHordeMomentum(state, state.endUserHordeMomentum - 3);
    }
    maybeDrop(state, enemy.archetypeId, content);
  }
  state.enemies = living;
}

function resolveDefenderDeaths(state: RunState, content: GameContent): void {
  for (const defender of state.defenders) {
    if (defender.location !== 'dead' && defender.hp <= 0) {
      const wasBoard = defender.location === 'board';
      const fallenTile = defender.tile ? { ...defender.tile } : null;
      const deathLog = createDeathLogText(state, defender, content);
      defender.location = 'dead';
      defender.tile = null;
      clearUnitMotion(defender);
      if (state.saunaDefenderId === defender.id) state.saunaDefenderId = null;
      if (state.selectedDefenderId === defender.id) {
        state.selectedDefenderId = null;
        if (state.selectedMapTarget === 'defender') {
          state.selectedMapTarget = null;
        }
      }
      state.deathLog.unshift({
        id: state.nextDeathLogEntryId++,
        wave: state.currentWave.index,
        heroName: defender.name,
        heroTitle: defender.title,
        enemyName: deathLog.enemyName,
        text: deathLog.text
      });
      maybeTriggerAllyDeathSpeech(state, defender, content);
      if (wasBoard && hasSaunaAutoDeploy(state)) {
        const deployed = deploySaunaOccupant(state, content, fallenTile);
        if (deployed) {
          state.message = `${deployed.name} rushes out of the sauna to hold the line.`;
          continue;
        }
      }
      state.message = deathLog.text;
    }
  }
}

function managerMinionsAlive(state: RunState, managerInstanceId: number): boolean {
  return state.enemies.some(
    (enemy) => (enemy.spawnedByEnemyInstanceId ?? null) === managerInstanceId && enemy.archetypeId === 'thirsty_user'
  );
}

function applyDamageToEnemy(
  state: RunState,
  enemy: EnemyInstance,
  baseDamage: number,
  attackerId: string
): number {
  let finalDamage = baseDamage;
  if (enemy.archetypeId === 'escalation_manager' && managerMinionsAlive(state, enemy.instanceId)) {
    finalDamage = Math.max(1, Math.round(baseDamage * 0.3));
  }
  enemy.hp -= finalDamage;
  enemy.lastHitByDefenderId = attackerId;
  return finalDamage;
}

function applyEnemyHitWithFx(
  state: RunState,
  defender: DefenderInstance,
  enemy: EnemyInstance,
  baseDamage: number,
  kind: CombatFxKind = 'hit',
  secondaryTile: AxialCoord | null = defender.tile
): { damage: number; killed: boolean } {
  const finalDamage = applyDamageToEnemy(state, enemy, Math.max(1, Math.round(baseDamage)), defender.id);
  pushFx(state, kind, enemy.tile, enemyFxDurationMs(kind), secondaryTile);
  return { damage: finalDamage, killed: enemy.hp <= 0 };
}

function applyHealToDefender(
  state: RunState,
  healer: DefenderInstance,
  target: DefenderInstance,
  amount: number,
  content: GameContent,
  kind: CombatFxKind = 'heal',
  secondaryTile: AxialCoord | null = healer.tile
): number {
  const healAmount = Math.max(0, Math.round(amount));
  if (healAmount <= 0) return 0;
  const maxHp = derivedStats(state, target, content).maxHp;
  const restored = Math.min(healAmount, Math.max(0, maxHp - target.hp));
  if (restored <= 0) return 0;
  target.hp = Math.min(maxHp, target.hp + restored);
  if (target.tile) {
    pushFx(state, kind, target.tile, healFxDurationMs(kind), secondaryTile);
  }
  return restored;
}

function preferredEnemiesInRange(
  state: RunState,
  defender: DefenderInstance,
  tile: AxialCoord,
  range: number
): EnemyInstance[] {
  const enemies = state.enemies.filter((enemy) => enemy.hp > 0 && hexDistance(tile, enemy.tile) <= range);
  if (hasSubclass(defender, 'bucket_sniper')) {
    return enemies.sort((left, right) => {
      const leftDistance = hexDistance(tile, left.tile);
      const rightDistance = hexDistance(tile, right.tile);
      return (rightDistance - leftDistance) || (left.hp - right.hp);
    });
  }
  return enemies.sort((left, right) => (hexDistance(tile, left.tile) - hexDistance(tile, right.tile)) || (left.hp - right.hp));
}

function pickExtraEnemyTargets(
  state: RunState,
  defender: DefenderInstance,
  originTile: AxialCoord,
  range: number,
  count: number,
  primaryTarget: EnemyInstance
): EnemyInstance[] {
  const picks = preferredEnemiesInRange(state, defender, originTile, range)
    .filter((enemy) => enemy.instanceId !== primaryTarget.instanceId)
    .slice(0, count);
  while (picks.length < count && primaryTarget.hp > 0) {
    picks.push(primaryTarget);
  }
  return picks;
}

function findChainedTargets(state: RunState, sourceTarget: EnemyInstance, count: number): EnemyInstance[] {
  return state.enemies
    .filter((enemy) => enemy.instanceId !== sourceTarget.instanceId && hexDistance(enemy.tile, sourceTarget.tile) <= 2)
    .sort((left, right) => (left.hp - right.hp) || (hexDistance(left.tile, sourceTarget.tile) - hexDistance(right.tile, sourceTarget.tile)))
    .slice(0, count);
}

function findLavaWhipTargets(
  state: RunState,
  attackerTile: AxialCoord,
  primaryTarget: EnemyInstance
): EnemyInstance[] {
  const primaryDistance = hexDistance(attackerTile, primaryTarget.tile);
  return state.enemies
    .filter((enemy) => enemy.instanceId !== primaryTarget.instanceId)
    .filter((enemy) => hexDistance(enemy.tile, primaryTarget.tile) <= 1)
    .filter((enemy) => hexDistance(attackerTile, enemy.tile) >= primaryDistance)
    .sort((left, right) =>
      (hexDistance(attackerTile, right.tile) - hexDistance(attackerTile, left.tile)) ||
      (left.hp - right.hp))
    .slice(0, 2);
}

function thunderRunDestination(
  state: RunState,
  defender: DefenderInstance,
  target: EnemyInstance,
  content: GameContent
): AxialCoord | null {
  if (!defender.tile) return null;
  return DIRS
    .map((dir) => add(target.tile, dir))
    .filter((tile) => isBuildableTile(state, tile, content))
    .filter((tile) => !occupied(state, tile))
    .filter((tile) => !sameCoord(tile, defender.tile as AxialCoord))
    .sort((left, right) =>
      (hexDistance(left, defender.tile as AxialCoord) - hexDistance(right, defender.tile as AxialCoord)) ||
      (hexDistance(left, CENTER) - hexDistance(right, CENTER)) ||
      (left.r - right.r) ||
      (left.q - right.q))[0] ?? null;
}

function tryThunderRun(
  state: RunState,
  defender: DefenderInstance,
  primaryTarget: EnemyInstance,
  primaryDamage: number,
  content: GameContent
): boolean {
  if (!defender.tile || !defender.skills.includes('thunder_run') || state.timeMs < defender.thunderRunReadyAtMs) return false;
  if (hexDistance(defender.tile, primaryTarget.tile) <= 1) return false;
  const from = cloneCoord(defender.tile);
  const destination = thunderRunDestination(state, defender, primaryTarget, content);
  if (!destination) return false;

  moveDefenderToTile(state, defender, destination, 'blink', THUNDER_RUN_MOTION_DURATION_MS, from);
  defender.thunderRunReadyAtMs = state.timeMs + THUNDER_RUN_COOLDOWN_MS;
  pushFx(state, 'thunder_run', destination, 380, from);
  for (const enemy of state.enemies.filter((entry) => hexDistance(entry.tile, destination) <= 1)) {
    applyEnemyHitWithFx(state, defender, enemy, primaryDamage * 0.55, 'thunder_run', from);
  }
  addHitStop(state, 38);
  return true;
}

function triggerEquippedAttackSkills(
  state: RunState,
  defender: DefenderInstance,
  primaryTarget: EnemyInstance,
  primaryDamage: number,
  stats: UnitStats,
  content: GameContent
): void {
  if (!defender.tile) return;

  if (defender.skills.includes('lava_whip')) {
    for (const extraTarget of findLavaWhipTargets(state, defender.tile, primaryTarget)) {
      applyEnemyHitWithFx(state, defender, extraTarget, primaryDamage * 0.6, 'lava_whip', primaryTarget.tile);
    }
  }

  if (defender.skills.includes('fireball') && state.timeMs >= defender.fireballReadyAtMs) {
    scheduleFireball(state, defender, primaryTarget.tile, primaryDamage);
  }

  if (defender.skills.includes('sauna_quake') && state.timeMs >= defender.saunaQuakeReadyAtMs) {
    scheduleSaunaQuake(state, defender, primaryTarget.tile, primaryDamage);
  }

  if (defender.skills.includes('ember_storm') && state.timeMs >= defender.emberStormReadyAtMs) {
    scheduleEmberStorm(state, defender, primaryTarget.tile, primaryDamage, content);
  }

  if (defender.skills.includes('chain_spark')) {
    const chainedTarget = findChainedTargets(state, primaryTarget, 1)[0] ?? null;
    if (chainedTarget) {
      applyDamageToEnemy(state, chainedTarget, Math.max(1, Math.round(stats.damage * 0.42)), defender.id);
      pushFx(state, 'chain', chainedTarget.tile, 220, primaryTarget.tile);
    }
  }

  if (defender.skills.includes('steam_shield')) {
    defender.hp = Math.min(stats.maxHp, defender.hp + 3);
    pushFx(state, 'steam_shield', defender.tile, 260);
  }

  if (defender.skills.includes('boiling_orbit') && state.timeMs >= defender.boilingOrbitReadyAtMs) {
    activateBoilingOrbit(state, defender, primaryDamage);
  }

  tryThunderRun(state, defender, primaryTarget, primaryDamage, content);

  if (defender.skills.includes('afterburn_hook') && primaryTarget.hp <= 0) {
    const retarget = preferredEnemiesInRange(state, defender, defender.tile, stats.range + 1)[0] ?? nearestEnemy(state, defender.tile);
    if (retarget) {
      applyEnemyHitWithFx(state, defender, retarget, primaryDamage * 0.7, 'afterburn_hook', primaryTarget.tile);
      addHitStop(state, 26);
    }
  }

  triggerBattleHymn(state, defender);
}

function subclassHealBonusAmount(
  state: RunState,
  healer: DefenderInstance,
  target: DefenderInstance,
  content: GameContent
): number {
  if (!hasSubclass(healer, 'cedar_surgeon')) return 0;
  return target.hp / Math.max(1, derivedStats(state, target, content).maxHp) < 0.5 ? 3 : 0;
}

function applySubclassHealEffects(
  state: RunState,
  healer: DefenderInstance,
  primaryTarget: DefenderInstance,
  stats: UnitStats,
  healTargets: DefenderInstance[],
  content: GameContent
): void {
  const baseHeal = Math.max(1, Math.round(stats.heal));
  const calmWhisperHeal = Math.max(1, Math.round(baseHeal * 0.8));

  if (hasSubclass(healer, 'calm_whisper')) {
    const extraTarget = healTargets[1];
    if (extraTarget) {
      applyHealToDefender(state, healer, extraTarget, calmWhisperHeal + subclassHealBonusAmount(state, healer, extraTarget, content), content, 'pulse', healer.tile);
    }
  }

  if (hasSubclass(healer, 'steampriest') && primaryTarget.tile) {
    const pulseHeal = Math.max(1, Math.round(baseHeal * 0.5));
    for (const ally of boardAlliesWithin(state, primaryTarget.tile, 1, primaryTarget.id)) {
      applyHealToDefender(state, healer, ally, pulseHeal + subclassHealBonusAmount(state, healer, ally, content), content, 'pulse', primaryTarget.tile);
    }
  }

  if (hasSubclass(healer, 'pulse_keeper')) {
    applyHealToDefender(state, healer, primaryTarget, 2, content, 'pulse', healer.tile);
    applyHealToDefender(state, healer, healer, 2, content, 'pulse', healer.tile);
  }

  if (hasSubclass(healer, 'rescue_ritualist') && healer.tile) {
    for (const ally of boardAlliesWithin(state, healer.tile, 1)) {
      applyHealToDefender(state, healer, ally, 2, content, 'pulse', healer.tile);
    }
  }

  if (hasSubclass(healer, 'saint_of_steam')) {
    const benedictionHeal = Math.max(1, Math.round(baseHeal * 0.6));
    for (const ally of healTargets.slice(1)) {
      applyHealToDefender(state, healer, ally, benedictionHeal + subclassHealBonusAmount(state, healer, ally, content), content, 'pulse', healer.tile);
    }
  }

  if (hasSubclass(healer, 'afterglow_warden') && healer.tile) {
    for (const ally of boardDefenders(state)) {
      applyHealToDefender(state, healer, ally, 1, content, 'pulse', healer.tile);
    }
  }
}

function applySubclassAttackEffects(
  state: RunState,
  defender: DefenderInstance,
  primaryTarget: EnemyInstance,
  primaryDamage: number,
  stats: UnitStats,
  content: GameContent
): void {
  const splashTargets = (radius: number) =>
    state.enemies.filter((enemy) => enemy.instanceId !== primaryTarget.instanceId && hexDistance(enemy.tile, primaryTarget.tile) <= radius);

  if (hasSubclass(defender, 'emberguard')) {
    for (const enemy of splashTargets(1)) {
      applyEnemyHitWithFx(state, defender, enemy, primaryDamage * 0.45, 'hit', primaryTarget.tile);
    }
  }

  if (hasSubclass(defender, 'avalanche_oath')) {
    for (const enemy of splashTargets(1)) {
      applyEnemyHitWithFx(state, defender, enemy, primaryDamage * 0.6, 'hit', primaryTarget.tile);
    }
  }

  if (hasSubclass(defender, 'coalflinger')) {
    pushFx(state, 'fireball', primaryTarget.tile, 220, defender.tile);
    for (const enemy of splashTargets(1)) {
      applyEnemyHitWithFx(state, defender, enemy, primaryDamage * 0.35, 'hit', primaryTarget.tile);
    }
  }

  if (hasSubclass(defender, 'ash_scope')) {
    for (const chained of findChainedTargets(state, primaryTarget, 1)) {
      applyEnemyHitWithFx(state, defender, chained, primaryDamage * 0.5, 'chain', primaryTarget.tile);
    }
  }

  if (hasSubclass(defender, 'spark_juggler') && defender.tile) {
    for (const extraTarget of pickExtraEnemyTargets(state, defender, defender.tile, stats.range, 2, primaryTarget)) {
      if (extraTarget.hp <= 0) continue;
      applyEnemyHitWithFx(state, defender, extraTarget, primaryDamage, 'volley', defender.tile);
    }
  }

  if (hasSubclass(defender, 'volley_tender') && defender.tile) {
    const fallbackTarget = primaryTarget.hp > 0
      ? primaryTarget
      : preferredEnemiesInRange(state, defender, defender.tile, stats.range)[0] ?? null;
    if (fallbackTarget) {
      applyEnemyHitWithFx(state, defender, fallbackTarget, primaryDamage * 0.7, 'volley', defender.tile);
    }
  }

  if (hasSubclass(defender, 'shock_pitcher')) {
    for (const chained of findChainedTargets(state, primaryTarget, 2)) {
      applyEnemyHitWithFx(state, defender, chained, primaryDamage * 0.45, 'chain', primaryTarget.tile);
    }
  }

  if (hasSubclass(defender, 'meteor_bucket')) {
    pushFx(state, 'fireball', primaryTarget.tile, 260, defender.tile);
    for (const enemy of splashTargets(1)) {
      applyEnemyHitWithFx(state, defender, enemy, primaryDamage * 0.6, 'hit', primaryTarget.tile);
    }
  }

  if (hasSubclass(defender, 'last_ladle') && primaryTarget.hp > 0 && primaryTarget.hp / Math.max(1, enemyMaxHp(state, primaryTarget, content)) < 0.5) {
    applyEnemyHitWithFx(state, defender, primaryTarget, primaryDamage * 0.7, 'volley', defender.tile);
  }

  if (hasSubclass(defender, 'white_heat_gunner') && defender.tile && primaryTarget.hp <= 0) {
    const retarget = preferredEnemiesInRange(state, defender, defender.tile, stats.range)[0] ?? null;
    if (retarget) {
      applyEnemyHitWithFx(state, defender, retarget, primaryDamage * 0.6, 'volley', defender.tile);
    }
  }

  if (hasSubclass(defender, 'steam_bulwark') && defender.tile) {
    applyHealToDefender(state, defender, defender, 3, content, 'pulse', defender.tile);
    const nearbyAlly = nearestInjuredAllyWithin(state, defender, defender.tile, 1, content, defender.id);
    if (nearbyAlly) {
      applyHealToDefender(state, defender, nearbyAlly, 2, content, 'pulse', defender.tile);
    }
  }

  if (hasSubclass(defender, 'towel_oracle') && defender.tile) {
    const supportTarget = nearestInjuredAllyWithin(state, defender, defender.tile, stats.range, content, defender.id);
    if (supportTarget) {
      applyHealToDefender(state, defender, supportTarget, 2, content, 'pulse', defender.tile);
    }
  }
}

function applySubclassRetaliationEffects(
  state: RunState,
  enemy: EnemyInstance,
  target: DefenderInstance,
  _content: GameContent
): void {
  void _content;
  if (!target.tile) return;
  if (hasSubclass(target, 'stonewall') && hexDistance(enemy.tile, target.tile) <= 1) {
    applyEnemyHitWithFx(state, target, enemy, 2, 'pulse', target.tile);
  }
  if (hasSubclass(target, 'revenge_coals')) {
    applyEnemyHitWithFx(state, target, enemy, 3, 'pulse', target.tile);
    for (const nearby of state.enemies.filter((entry) => entry.instanceId !== enemy.instanceId && hexDistance(entry.tile, enemy.tile) <= 1)) {
      applyEnemyHitWithFx(state, target, nearby, 1, 'pulse', enemy.tile);
    }
  }
}

function triggerBattleHymn(state: RunState, defender: DefenderInstance): void {
  if (!defender.tile || !defender.skills.includes('battle_hymn') || state.timeMs < defender.battleHymnReadyAtMs) return;
  const recipients = [defender, ...boardAlliesWithin(state, defender.tile, 1, defender.id)];
  for (const ally of recipients) {
    ally.battleHymnBuffExpiresAtMs = state.timeMs + BATTLE_HYMN_BUFF_MS;
    if (ally.tile) {
      pushFx(state, 'battle_hymn', ally.tile, 320, defender.tile);
    }
  }
  defender.battleHymnReadyAtMs = state.timeMs + BATTLE_HYMN_COOLDOWN_MS;
}

function performDefenderBasicAttack(
  state: RunState,
  defender: DefenderInstance,
  stats: UnitStats,
  damageMultiplier: number,
  content: GameContent
): boolean {
  if (!defender.tile) return false;
  const target = preferredEnemiesInRange(state, defender, defender.tile, stats.range)[0] ?? null;
  if (!target) return false;

  const benchOakSpin = hasSubclass(defender, 'bench_oak')
    ? state.enemies.filter((enemy) => hexDistance(enemy.tile, defender.tile as AxialCoord) <= 1)
    : [];

  let hitDamage = Math.round(stats.damage * damageMultiplier);
  if (hasSubclass(defender, 'bucket_sniper') && hexDistance(defender.tile, target.tile) === stats.range) {
    hitDamage += 2;
  }
  if (hasSubclass(defender, 'white_heat_gunner') && target.hp / Math.max(1, enemyMaxHp(state, target, content)) <= 0.4) {
    hitDamage += 4;
  }
  if (defender.skills.includes('afterburn_hook') && target.hp / Math.max(1, enemyMaxHp(state, target, content)) <= 0.4) {
    hitDamage += 4;
  }
  if (hasSubclass(defender, 'spark_juggler')) {
    hitDamage = Math.max(1, Math.round(hitDamage * 0.55));
  }

  if (defender.skills.includes('spin2win')) {
    const spinTargets = state.enemies.filter((enemy) => hexDistance(enemy.tile, defender.tile as AxialCoord) <= 1);
    for (const enemy of spinTargets) {
      applyEnemyHitWithFx(state, defender, enemy, hitDamage, 'hit', defender.tile);
    }
    pushFx(state, 'spin', defender.tile, 320);
    addHitStop(state, 34);
  } else if (benchOakSpin.length >= 2) {
    for (const enemy of benchOakSpin) {
      applyEnemyHitWithFx(state, defender, enemy, hitDamage, 'hit', defender.tile);
    }
    pushFx(state, 'spin', defender.tile, 320);
  } else {
    applyEnemyHitWithFx(state, defender, target, hitDamage, hasSubclass(defender, 'spark_juggler') ? 'volley' : 'hit', defender.tile);
  }

  grantCombatXp(state, defender, 1, content);
  applySubclassAttackEffects(state, defender, target, hitDamage, stats, content);
  triggerEquippedAttackSkills(state, defender, target, hitDamage, stats, content);
  return true;
}

function defenderAttack(state: RunState, defender: DefenderInstance, content: GameContent): void {
  if (!defender.tile || defender.location !== 'board' || state.timeMs < defender.attackReadyAtMs) return;
  const stats = derivedStats(state, defender, content);
  const dmgMult = state.timeMs < state.sisu.activeUntilMs ? content.config.sisuDamageMultiplier : 1;
  const cdMult = state.timeMs < state.sisu.activeUntilMs ? content.config.sisuAttackMultiplier : 1;
  const lowHp = defender.skills.includes('blink_step') && defender.hp / Math.max(1, stats.maxHp) < 0.5;
  if (lowHp && tryBlink(state, defender, content)) {
    defender.attackReadyAtMs = state.timeMs + stats.attackCooldownMs / cdMult;
    return;
  }

  const inRangeTarget = preferredEnemiesInRange(state, defender, defender.tile, stats.range)[0] ?? null;
  if (!lowHp && !inRangeTarget && tryBlinkTowardEnemy(state, defender, stats, content)) {
    performDefenderBasicAttack(state, defender, derivedStats(state, defender, content), dmgMult, content);
    defender.attackReadyAtMs = state.timeMs + derivedStats(state, defender, content).attackCooldownMs / cdMult;
    return;
  }

  const healTargets = stats.heal > 0 ? alliesToHeal(state, defender, stats, content) : [];
  const ally = healTargets[0] ?? null;
  if (ally) {
    const calmWhisperMultiplier = hasSubclass(defender, 'calm_whisper') ? 0.8 : 1;
    applyHealToDefender(
      state,
      defender,
      ally,
      Math.round(stats.heal * dmgMult * calmWhisperMultiplier) + subclassHealBonusAmount(state, defender, ally, content),
      content,
      'heal',
      defender.tile
    );
    applySubclassHealEffects(state, defender, ally, stats, healTargets, content);
    grantCombatXp(state, defender, 1, content);
    defender.attackReadyAtMs = state.timeMs + stats.attackCooldownMs / cdMult;
    return;
  }

  const target = inRangeTarget ?? preferredEnemiesInRange(state, defender, defender.tile, stats.range)[0] ?? null;

  if (!target) {
    moveDefenderTowardSaunaThreat(state, defender, stats, content, cdMult);
    return;
  }
  performDefenderBasicAttack(state, defender, stats, dmgMult, content);
  defender.attackReadyAtMs = state.timeMs + derivedStats(state, defender, content).attackCooldownMs / cdMult;
}

function pebblePathForLane(laneIndex: number): AxialCoord[] {
  return PEBBLE_PATH_BASE.map((coord) => rotateCoord(coord, ((laneIndex % 6) + 6) % 6));
}

function activePebbleBottleTargets(state: RunState): PebbleBottleTarget[] {
  return state.pebbleBottleTargets.filter((target) => !target.consumed);
}

function pebbleBottleDamageBonus(state: RunState): number {
  return state.pebbleBottleStacks * PEBBLE_BOTTLE_DAMAGE_PER_STACK;
}

function pebbleSpawnLaneIndex(wave: WaveDefinition, content: GameContent): number {
  if (isPebbleBossWave(wave)) {
    return wave.spawns.find((spawn) => spawn.enemyId === 'pebble')?.laneIndex ?? bossBaseLane(wave.index, content);
  }
  return 0;
}

function pebblePathForCurrentWave(state: RunState, content: GameContent): AxialCoord[] {
  return pebblePathForLane(pebbleSpawnLaneIndex(state.currentWave, content));
}

function pebblePathIndexAtTile(tile: AxialCoord, path: AxialCoord[]): number {
  return path.findIndex((pathTile) => sameCoord(pathTile, tile));
}

function syncPebblePathProgress(enemy: EnemyInstance, path: AxialCoord[]): number | null {
  const currentIndex = path.findIndex((tile) => sameCoord(tile, enemy.tile));
  if (currentIndex >= 0) {
    enemy.pathIndex = Math.max(enemy.pathIndex ?? 0, currentIndex);
    return enemy.pathIndex;
  }
  return null;
}

function resolvePebblePathReentryIndex(enemy: EnemyInstance, path: AxialCoord[]): number {
  const onPathIndex = syncPebblePathProgress(enemy, path);
  if (onPathIndex != null) {
    return onPathIndex;
  }

  const previousProgress = Math.max(0, enemy.pathIndex ?? 0);
  const entries = path.map((tile, index) => ({ tile, index }));
  const forwardEntries = entries.filter(({ index }) => index >= previousProgress);
  const candidates = forwardEntries.length > 0 ? forwardEntries : entries;

  return candidates
    .sort((left, right) =>
      (hexDistance(enemy.tile, left.tile) - hexDistance(enemy.tile, right.tile))
      || (hexDistance(left.tile, CENTER) - hexDistance(right.tile, CENTER))
      || (right.index - left.index))[0]?.index ?? Math.max(0, path.length - 1);
}

function candidatePebbleBottleTiles(state: RunState, content: GameContent): AxialCoord[] {
  const buildableTiles = currentBoardFootprint(state, content).buildableTiles;
  const spawnKeys = new Set(currentSpawnLanes(state, content).map(coordKey));
  const landmarkKeys = new Set(WORLD_LANDMARK_IDS.map((landmarkId) => coordKey(landmarkTileForState(state, landmarkId, content))));
  const pathKeys = new Set(pebblePathForCurrentWave(state, content).map(coordKey));
  const candidateBuckets = [
    buildableTiles.filter((tile) => {
      const distance = hexDistance(tile, CENTER);
      return distance >= 2 && distance <= content.config.buildRadius;
    }),
    buildableTiles.filter((tile) => hexDistance(tile, CENTER) >= 1)
  ];
  const candidates: AxialCoord[] = [];
  const seen = new Set<string>();

  for (const bucket of candidateBuckets) {
    const eligible = bucket
      .filter((tile) => !spawnKeys.has(coordKey(tile)))
      .filter((tile) => !landmarkKeys.has(coordKey(tile)))
      .filter((tile) => !pathKeys.has(coordKey(tile)))
      .filter((tile) => !occupied(state, tile));

    for (let index = eligible.length - 1; index > 0; index -= 1) {
      const swapIndex = randomInt(state, 0, index);
      [eligible[index], eligible[swapIndex]] = [eligible[swapIndex], eligible[index]];
    }

    for (const tile of eligible) {
      const key = coordKey(tile);
      if (seen.has(key)) continue;
      seen.add(key);
      candidates.push(tile);
    }
  }

  return candidates;
}

function spawnPebbleBottleTargets(state: RunState, content: GameContent): void {
  const candidates = candidatePebbleBottleTiles(state, content);
  for (let index = candidates.length - 1; index > 0; index -= 1) {
    const swapIndex = randomInt(state, 0, index);
    [candidates[index], candidates[swapIndex]] = [candidates[swapIndex], candidates[index]];
  }
  state.pebbleBottleTargets = candidates.slice(0, PEBBLE_BOTTLE_TARGET_COUNT).map((tile) => ({
    id: state.nextPebbleBottleTargetId++,
    tile: { ...tile },
    consumed: false
  }));
}

function clearPebbleEncounterTargets(state: RunState): void {
  state.pebbleBottleTargets = [];
}

function nearestPebbleBottleTarget(state: RunState, enemy: EnemyInstance): PebbleBottleTarget | null {
  return activePebbleBottleTargets(state)
    .sort((left, right) =>
      (hexDistance(enemy.tile, left.tile) - hexDistance(enemy.tile, right.tile))
      || (hexDistance(left.tile, CENTER) - hexDistance(right.tile, CENTER))
      || (left.tile.r - right.tile.r)
      || (left.tile.q - right.tile.q))[0] ?? null;
}

function consumePebbleBottleAtCurrentTile(state: RunState, enemy: EnemyInstance, content: GameContent): void {
  const bottle = state.pebbleBottleTargets.find((target) => !target.consumed && sameCoord(target.tile, enemy.tile));
  if (!bottle) return;
  bottle.consumed = true;
  state.pebbleBottleStacks += 1;
  maybeTriggerBossProcSpeech(state, content);
}

function movePebbleTowardTile(
  state: RunState,
  enemy: EnemyInstance,
  targetTile: AxialCoord,
  content: GameContent
): boolean {
  const bottleHuntMoveCooldownMs = pebbleBottleHuntMoveCooldownMs(state, enemy);
  const nextTile = DIRS
    .map((dir) => add(enemy.tile, dir))
    .filter((candidate) => isTileInBoard(state, candidate, content))
    .sort((left, right) =>
      (hexDistance(left, targetTile) - hexDistance(right, targetTile))
      || (hexDistance(left, CENTER) - hexDistance(right, CENTER))
      || (left.r - right.r)
      || (left.q - right.q))[0] ?? null;

  if (!nextTile) {
    enemy.moveReadyAtMs = state.timeMs + bottleHuntMoveCooldownMs;
    return false;
  }

  if (boardDefenderAtTile(state, nextTile)) {
    stepPebbleGrind(state, enemy, nextTile, content);
    return true;
  }

  if (otherEnemyOccupiesTile(state, nextTile, enemy.instanceId)) {
    enemy.moveReadyAtMs = state.timeMs + bottleHuntMoveCooldownMs;
    return false;
  }

  moveEnemyToTile(state, enemy, nextTile, 'slither', PEBBLE_MOTION_DURATION_MS);
  syncPebblePathProgress(enemy, pebblePathForCurrentWave(state, content));
  consumePebbleBottleAtCurrentTile(state, enemy, content);
  enemy.moveReadyAtMs = state.timeMs + bottleHuntMoveCooldownMs;
  return true;
}

function hordeEnemies(state: RunState): EnemyInstance[] {
  return state.enemies.filter((enemy) => enemy.archetypeId === 'thirsty_user');
}

function swarmDamageBonus(state: RunState): number {
  const cap = isEndUserHordeBossWave(state.currentWave) && state.endUserHordeTier >= 2
    ? END_USER_HORDE_TIER_TWO_SWARM_CAP
    : END_USER_HORDE_BASE_SWARM_CAP;
  return Math.min(cap, hordeEnemies(state).length);
}

function hordeMoveCooldownMs(state: RunState, baseCooldownMs: number): number {
  if (!isEndUserHordeBossWave(state.currentWave)) return baseCooldownMs;
  if (state.endUserHordeTier >= 2) {
    return Math.max(120, baseCooldownMs - END_USER_HORDE_TIER_TWO_MOVE_BONUS_MS);
  }
  if (state.endUserHordeTier >= 1) {
    return Math.max(120, baseCooldownMs - END_USER_HORDE_TIER_ONE_MOVE_BONUS_MS);
  }
  return baseCooldownMs;
}

function enemyMoveCooldownMsForEnemy(state: RunState, enemy: EnemyInstance, content: GameContent): number {
  const baseCooldownMs = content.enemyArchetypes[enemy.archetypeId].moveCooldownMs;
  return enemy.archetypeId === 'thirsty_user' ? hordeMoveCooldownMs(state, baseCooldownMs) : baseCooldownMs;
}

function enemyMoveCooldownMsForSpawn(state: RunState, enemyId: EnemyUnitId, content: GameContent): number {
  if (enemyId === 'pebble') {
    return pebbleBottleHuntMoveCooldownMs(state, {
      archetypeId: 'pebble',
      pebbleEncounterMaxHp: pebbleEncounterMaxHp(state)
    } as EnemyInstance);
  }
  const baseCooldownMs = content.enemyArchetypes[enemyId].moveCooldownMs;
  return enemyId === 'thirsty_user' ? hordeMoveCooldownMs(state, baseCooldownMs) : baseCooldownMs;
}

function pebbleDevourStacks(enemy: EnemyInstance): number {
  return enemy.archetypeId === 'pebble' ? Math.min(PEBBLE_DEVOUR_STACK_CAP, enemy.pebbleDevourStacks ?? 0) : 0;
}

function pebbleDamageBonus(enemy: EnemyInstance): number {
  return pebbleDevourStacks(enemy) * PEBBLE_DEVOUR_DAMAGE_PER_STACK;
}

function enemyAttackDamage(state: RunState, enemy: EnemyInstance, content: GameContent): number {
  const archetype = content.enemyArchetypes[enemy.archetypeId];
  const scaledDamage = scaledEnemyDamage(archetype.damage, state.currentWave.index, content, state.currentWave.isBoss);
  if (archetype.behavior === 'swarm') {
    return scaledDamage + swarmDamageBonus(state);
  }
  if (archetype.behavior === 'pebble') {
    const firstEncounterPenalty = pebbleEncounterTierForEnemy(state, enemy) === 0
      ? PEBBLE_FIRST_ENCOUNTER_DAMAGE_PENALTY
      : 0;
    return Math.max(1, scaledDamage - 2 - firstEncounterPenalty) + pebbleBottleDamageBonus(state) + pebbleDamageBonus(enemy);
  }
  return scaledDamage;
}

function enemyImpactFxKind(enemy: EnemyInstance): CombatFxKind {
  return isBossThreat(enemy) ? 'boss_hit' : 'defender_hit';
}

function enemySaunaFxKind(enemy: EnemyInstance): CombatFxKind {
  return isBossThreat(enemy) ? 'boss_hit' : 'sauna_hit';
}

function applyEnemyDamageToSauna(state: RunState, enemy: EnemyInstance, damage: number): void {
  state.saunaHp = Math.max(0, state.saunaHp - damage);
  pushFx(state, enemySaunaFxKind(enemy), CENTER, isBossThreat(enemy) ? 260 : 210, enemy.tile);
  if (isBossThreat(enemy)) {
    addHitStop(state, 36);
  }
}

function applyEnemyDamageToDefender(
  state: RunState,
  enemy: EnemyInstance,
  target: DefenderInstance,
  baseDamage: number,
  content: GameContent
): number {
  const defense = derivedStats(state, target, content).defense;
  const finalDamage = Math.max(1, baseDamage - defense);
  const actualDamage = Math.min(target.hp, finalDamage);
  target.hp -= finalDamage;
  target.lastHitByEnemyId = enemy.archetypeId;
  if (target.tile) {
    pushFx(state, enemyImpactFxKind(enemy), target.tile, isBossThreat(enemy) ? 240 : 190, enemy.tile);
  }
  applySubclassRetaliationEffects(state, enemy, target, content);
  maybeSaunaSlapSwap(state, target, content);
  if (isBossThreat(enemy)) {
    addHitStop(state, 32);
  }
  return actualDamage;
}

function enemyTarget(state: RunState, enemy: EnemyInstance, content: GameContent): DefenderInstance | 'sauna' | null {
  const archetype = content.enemyArchetypes[enemy.archetypeId];
  const defenders = boardDefenders(state)
    .filter((defender) => defender.tile && hexDistance(enemy.tile, defender.tile as AxialCoord) <= archetype.range)
    .sort((left, right) => (left.hp - right.hp) || (hexDistance(enemy.tile, left.tile as AxialCoord) - hexDistance(enemy.tile, right.tile as AxialCoord)));
  if (defenders[0]) return defenders[0];
  return hexDistance(enemy.tile, CENTER) <= archetype.range ? 'sauna' : null;
}

function moveEnemyTowardCenter(state: RunState, enemy: EnemyInstance, content: GameContent): boolean {
  const tile = DIRS.map((dir) => add(enemy.tile, dir))
    .filter((next) => isTileInBoard(state, next, content))
    .filter((next) => !occupied(state, next))
    .sort((left, right) => (hexDistance(left, CENTER) - hexDistance(right, CENTER)) || (left.r - right.r) || (left.q - right.q))[0];
  if (!tile) return false;
  moveEnemyToTile(state, enemy, tile, 'step', STEP_MOTION_DURATION_MS);
  enemy.moveReadyAtMs = state.timeMs + enemyMoveCooldownMsForEnemy(state, enemy, content);
  return true;
}

function stepStandardEnemy(state: RunState, enemy: EnemyInstance, content: GameContent): void {
  const archetype = content.enemyArchetypes[enemy.archetypeId];
  if (state.timeMs >= enemy.attackReadyAtMs) {
    const target = enemyTarget(state, enemy, content);
    if (target === 'sauna') {
      applyEnemyDamageToSauna(state, enemy, enemyAttackDamage(state, enemy, content));
      if (enemy.archetypeId === 'thirsty_user' && isEndUserHordeBossWave(state.currentWave)) {
        setEndUserHordeMomentum(state, state.endUserHordeMomentum + 2);
      }
      enemy.attackReadyAtMs = state.timeMs + archetype.attackCooldownMs;
      return;
    }
    if (target) {
      applyEnemyDamageToDefender(state, enemy, target, enemyAttackDamage(state, enemy, content), content);
      enemy.attackReadyAtMs = state.timeMs + archetype.attackCooldownMs;
      return;
    }
  }
  if (state.timeMs < enemy.moveReadyAtMs) return;
  moveEnemyTowardCenter(state, enemy, content);
}

function stepSwarmUser(state: RunState, enemy: EnemyInstance, content: GameContent): void {
  stepStandardEnemy(state, enemy, content);
}

function stepPebbleGrind(state: RunState, enemy: EnemyInstance, blockedTile: AxialCoord, content: GameContent): void {
  const damage = enemyAttackDamage(state, enemy, content);
  const impacted = boardDefenders(state)
    .filter((defender) => defender.tile && sameCoord(defender.tile, blockedTile))
    .sort((left, right) => left.hp - right.hp);

  if (impacted.length === 0) {
    enemy.moveReadyAtMs = state.timeMs + pebblePathMoveCooldownMs(state, enemy);
    return;
  }

  let totalDamage = 0;
  for (const defender of impacted) {
    totalDamage += applyEnemyDamageToDefender(state, enemy, defender, damage, content);
  }

  if (totalDamage > 0) {
    enemy.pebbleDevourStacks = Math.min(PEBBLE_DEVOUR_STACK_CAP, pebbleDevourStacks(enemy) + 1);
    const restored = Math.max(1, Math.round(totalDamage * PEBBLE_DEVOUR_HEAL_RATIO));
    enemy.hp = Math.min(enemyMaxHp(state, enemy, content), enemy.hp + restored);
  }

  enemy.moveReadyAtMs = state.timeMs + pebblePathMoveCooldownMs(state, enemy);
}

function stepPebble(state: RunState, enemy: EnemyInstance, content: GameContent): void {
  const archetype = content.enemyArchetypes[enemy.archetypeId];
  const bottleTarget = nearestPebbleBottleTarget(state, enemy);

  if (bottleTarget && sameCoord(bottleTarget.tile, enemy.tile)) {
    consumePebbleBottleAtCurrentTile(state, enemy, content);
    enemy.moveReadyAtMs = state.timeMs + pebbleBottleHuntMoveCooldownMs(state, enemy);
    return;
  }

  if (!bottleTarget && state.timeMs >= enemy.attackReadyAtMs && hexDistance(enemy.tile, CENTER) <= archetype.range) {
    applyEnemyDamageToSauna(state, enemy, enemyAttackDamage(state, enemy, content));
    enemy.attackReadyAtMs = state.timeMs + archetype.attackCooldownMs;
    return;
  }
  if (state.timeMs < enemy.moveReadyAtMs) return;

  if (bottleTarget) {
    movePebbleTowardTile(state, enemy, bottleTarget.tile, content);
    return;
  }

  const path = pebblePathForCurrentWave(state, content);
  const onScriptedPath = pebblePathIndexAtTile(enemy.tile, path) >= 0;
  if (!onScriptedPath) {
    const reentryIndex = resolvePebblePathReentryIndex(enemy, path);
    const reentryTile = path[reentryIndex] ?? null;
    if (!reentryTile) return;
    movePebbleTowardTile(state, enemy, reentryTile, content);
    return;
  }

  const currentPathIndex = syncPebblePathProgress(enemy, path) ?? 0;
  const nextPathIndex = currentPathIndex + 1;
  const nextTile = path[nextPathIndex] ?? null;

  if (!nextTile) return;

  if (boardDefenderAtTile(state, nextTile)) {
    stepPebbleGrind(state, enemy, nextTile, content);
    return;
  }

  if (otherEnemyOccupiesTile(state, nextTile, enemy.instanceId)) {
    enemy.moveReadyAtMs = state.timeMs + pebblePathMoveCooldownMs(state, enemy);
    return;
  }

  moveEnemyToTile(state, enemy, nextTile, 'slither', PEBBLE_MOTION_DURATION_MS);
  enemy.moveReadyAtMs = state.timeMs + pebblePathMoveCooldownMs(state, enemy);
  enemy.pathIndex = nextPathIndex;
  consumePebbleBottleAtCurrentTile(state, enemy, content);
}

function stepElectricBather(state: RunState, enemy: EnemyInstance, content: GameContent): void {
  const archetype = content.enemyArchetypes[enemy.archetypeId];
  const scaledDamage = enemyAttackDamage(state, enemy, content);
  if (state.timeMs >= (enemy.nextAbilityAtMs ?? Number.POSITIVE_INFINITY)) {
    const targets = boardDefenders(state)
      .filter((defender) => defender.tile && hexDistance(enemy.tile, defender.tile) <= archetype.range)
      .sort((left, right) => (hexDistance(enemy.tile, left.tile as AxialCoord) - hexDistance(enemy.tile, right.tile as AxialCoord)) || (left.hp - right.hp));

    if (targets.length === 0) {
      applyEnemyDamageToSauna(state, enemy, Math.max(3, Math.round(scaledDamage * 0.6)));
    } else {
      const [primary, ...rest] = targets;
      applyEnemyDamageToDefender(state, enemy, primary, scaledDamage + 2, content);
      const chained = rest
        .filter((candidate) => candidate.tile && primary.tile && hexDistance(candidate.tile, primary.tile) <= 2)
        .slice(0, 2);
      for (const chainedTarget of chained) {
        applyEnemyDamageToDefender(state, enemy, chainedTarget, Math.max(2, Math.round(scaledDamage * 0.72)), content);
        if (chainedTarget.tile && primary.tile) {
          pushFx(state, 'chain', chainedTarget.tile, 260, primary.tile);
        }
      }
    }

    maybeTriggerBossProcSpeech(state, content);
    enemy.nextAbilityAtMs = state.timeMs + ELECTRIC_BATHER_ABILITY_COOLDOWN_MS;
    enemy.attackReadyAtMs = Math.max(enemy.attackReadyAtMs, state.timeMs + 720);
    return;
  }

  stepStandardEnemy(state, enemy, content);
}

function summonEscalationTickets(state: RunState, enemy: EnemyInstance, content: GameContent): void {
  const laneCount = currentSpawnLanes(state, content).length;
  const preferredLanes = [
    enemy.spawnLaneIndex ?? 0,
    wrapLane((enemy.spawnLaneIndex ?? 0) + 1, laneCount),
    wrapLane((enemy.spawnLaneIndex ?? 0) - 1, laneCount)
  ];

  for (let index = 0; index < 3; index += 1) {
    const laneIndex = preferredLanes[randomInt(state, 0, preferredLanes.length - 1)];
    state.pendingSpawns.push({
      atMs: state.waveElapsedMs + 220 + index * 160,
      enemyId: 'thirsty_user',
      laneIndex,
      spawnedByEnemyInstanceId: enemy.instanceId
    });
  }

  state.pendingSpawns.sort((left, right) => left.atMs - right.atMs);
}

function stepEscalationManager(state: RunState, enemy: EnemyInstance, content: GameContent): void {
  if (state.timeMs >= (enemy.nextAbilityAtMs ?? Number.POSITIVE_INFINITY)) {
    summonEscalationTickets(state, enemy, content);
    maybeTriggerBossProcSpeech(state, content);
    enemy.nextAbilityAtMs = state.timeMs + ESCALATION_MANAGER_ABILITY_COOLDOWN_MS;
  }

  stepStandardEnemy(state, enemy, content);
}

function queueEndUserHordeSurgeSpawns(state: RunState, content: GameContent): void {
  const spawnLanes = currentSpawnLanes(state, content);
  const laneCount = spawnLanes.length;
  const baseLane = bossBaseLane(state.currentWave.index, content);
  const preferredLanes = [1, -1, 2, -2, 3, -3]
    .map((delta) => wrapLane(baseLane + delta, laneCount))
    .filter((laneIndex, index, values) => values.indexOf(laneIndex) === index);
  const freeLanes = preferredLanes.filter((laneIndex) => !occupied(state, spawnLanes[laneIndex]));
  const lanes = (freeLanes.length >= 3 ? freeLanes : preferredLanes).slice(0, 3);

  lanes.forEach((laneIndex, index) => {
    state.pendingSpawns.push({
      atMs: state.waveElapsedMs + END_USER_HORDE_SURGE_MOVE_READY_MS + index * 120,
      enemyId: 'thirsty_user',
      laneIndex
    });
  });

  state.pendingSpawns.sort((left, right) => left.atMs - right.atMs);
}

function maybeTriggerEndUserHordeSurge(state: RunState, content: GameContent): void {
  if (!isEndUserHordeBossWave(state.currentWave) || state.endUserHordeTier < 2 || state.timeMs < state.endUserHordeNextSurgeAtMs) {
    return;
  }

  queueEndUserHordeSurgeSpawns(state, content);
  for (const enemy of hordeEnemies(state)) {
    enemy.moveReadyAtMs = Math.min(enemy.moveReadyAtMs, state.timeMs + END_USER_HORDE_SURGE_MOVE_READY_MS);
  }
  setEndUserHordeMomentum(state, state.endUserHordeMomentum - 4);
  state.endUserHordeNextSurgeAtMs = state.timeMs + END_USER_HORDE_SURGE_COOLDOWN_MS;
  maybeTriggerBossProcSpeech(state, content);
}

function enemyStep(state: RunState, enemy: EnemyInstance, content: GameContent): void {
  const behavior = content.enemyArchetypes[enemy.archetypeId].behavior;
  switch (behavior) {
    case 'pebble':
      stepPebble(state, enemy, content);
      return;
    case 'swarm':
      stepSwarmUser(state, enemy, content);
      return;
    case 'electric':
      stepElectricBather(state, enemy, content);
      return;
    case 'summoner':
      stepEscalationManager(state, enemy, content);
      return;
    case 'standard':
    default:
      stepStandardEnemy(state, enemy, content);
  }
}

function spawnEnemies(state: RunState, content: GameContent): void {
  const spawnLanes = currentSpawnLanes(state, content);
  const waiting: WaveSpawn[] = [];
  for (const spawn of state.pendingSpawns) {
    if (spawn.atMs > state.waveElapsedMs) {
      waiting.push(spawn);
      continue;
    }
    const lane = spawnLanes[spawn.laneIndex % spawnLanes.length];
    if (occupied(state, lane)) {
      waiting.push(spawn);
      continue;
    }
    const archetype = content.enemyArchetypes[spawn.enemyId];
    const pebbleEncounterHp = archetype.behavior === 'pebble' ? pebbleEncounterMaxHp(state) : undefined;
    const spawnMaxHp = scaledEnemyMaxHp(
      pebbleEncounterHp ?? archetype.maxHp,
      state.currentWave.index,
      archetype.threat,
      content,
      state.currentWave.isBoss
    );
    state.enemies.push({
      instanceId: state.nextEnemyInstanceId++,
      archetypeId: spawn.enemyId,
      tokenStyleId: randomInt(state, 0, 4),
      tile: { ...lane },
      motion: {
        fromTile: spawnApproachTile(lane),
          toTile: { ...lane },
          startedAtMs: state.timeMs,
          durationMs: SPAWN_SETTLE_DURATION_MS,
          style: spawn.enemyId === 'pebble' ? 'slither' : 'step'
      },
      hp: spawnMaxHp,
      waveScaledMaxHp: spawnMaxHp,
      lastHitByDefenderId: null,
      attackReadyAtMs: state.timeMs + archetype.attackCooldownMs,
      moveReadyAtMs: state.timeMs + enemyMoveCooldownMsForSpawn(state, spawn.enemyId, content),
      nextAbilityAtMs:
        archetype.behavior === 'electric'
          ? state.timeMs + ELECTRIC_BATHER_ABILITY_COOLDOWN_MS
          : archetype.behavior === 'summoner'
            ? state.timeMs + ESCALATION_MANAGER_ABILITY_COOLDOWN_MS
            : Number.POSITIVE_INFINITY,
      pathIndex: archetype.behavior === 'pebble' ? 0 : null,
      pebbleDevourStacks: archetype.behavior === 'pebble' ? 0 : undefined,
      pebbleEncounterMaxHp: pebbleEncounterHp,
      spawnLaneIndex: spawn.laneIndex,
      spawnedByEnemyInstanceId: spawn.spawnedByEnemyInstanceId ?? null
    });
  }
  state.pendingSpawns = waiting;
}

function healSauna(state: RunState, content: GameContent): void {
  const saunaDefender = getDefender(state, state.saunaDefenderId);
  if (!saunaDefender || saunaDefender.location !== 'sauna') return;
  saunaDefender.hp = Math.min(derivedStats(state, saunaDefender, content).maxHp, saunaDefender.hp + content.config.saunaHealPerPrep);
}

function startWaveState(state: RunState, waveDef: WaveDefinition, content: GameContent, message: string): void {
  state.overlayMode = 'none';
  state.phase = 'wave';
  state.waveElapsedMs = 0;
  state.hitStopMs = 0;
  state.fxEvents = [];
  state.pendingFireballs = [];
  state.pendingSaunaQuakes = [];
  state.pendingEmberStormStrikes = [];
  state.activeBoilingOrbits = [];
  state.speechBubbles = [];
  state.waveSwapUsed = false;
  state.nextRegenTickAtMs = state.timeMs + 1000;
  state.autoplayReadyAtMs = state.timeMs + AUTOPLAY_DELAY_MS;
  state.bossSpeechReadyAtMs = 0;
  state.bossIntroSpokenWaveIndex = null;
  state.currentWave = waveDef;
  state.pendingSpawns = waveDef.spawns.map((spawn) => ({ ...spawn }));
  clearPebbleEncounterTargets(state);
  if (isPebbleBossWave(waveDef)) {
    state.pebbleEncounterCount += 1;
    spawnPebbleBottleTargets(state, content);
  }
  if (isEndUserHordeBossWave(waveDef)) {
    setEndUserHordeMomentum(state, END_USER_HORDE_START_MOMENTUM);
    state.endUserHordeNextSurgeAtMs = state.timeMs + END_USER_HORDE_SURGE_COOLDOWN_MS;
  } else {
    resetEndUserHordeState(state);
  }
  state.message = message;
}

function awardWave(state: RunState, content: GameContent): void {
  const clearedWave = state.currentWave;
  state.pendingFireballs = [];
  state.pendingSaunaQuakes = [];
  state.pendingEmberStormStrikes = [];
  state.activeBoilingOrbits = [];
  clearPebbleEncounterTargets(state);
  resetEndUserHordeState(state);
  state.waveIndex += 1;
  const upcomingWave = createWaveDefinition(state.waveIndex, content);
  const alcoholBonus = alcoholTotals(state, content);
  state.sisu.current += Math.max(0, clearedWave.rewardSisu + (alcoholBonus.rewardSisu ?? 0));
  if (state.saunaDefenderId) state.steamEarned += content.config.steamPerSaunaWave;
  if (clearedWave.isBoss) state.steamEarned += content.config.steamPerBossWave;
  healSauna(state, content);
  normalizeLivingDefenders(state, content);
  if (clearedWave.isBoss) {
    const expansionDirection = chooseNextExpansionDirection(state);
    state.boardExpansionDirections.push(expansionDirection);
    state.phase = 'prep';
    state.overlayMode = 'modifier_draft';
    state.waveElapsedMs = 0;
    state.currentWave = upcomingWave;
    state.pendingSpawns = [];
    clearActiveHudPanel(state);
    if (!rollGlobalModifierDraftOffersIntoState(state, content)) {
      state.overlayMode = 'none';
      scheduleAutoplay(state);
      state.message = `Boss down. +${content.config.steamPerBossWave} Steam. The sauna grounds expand to the ${boardExpansionDirectionLabel(expansionDirection)}. No modifier synergies were live, so the run keeps rolling.`;
      return;
    }
    state.message = `Boss down. +${content.config.steamPerBossWave} Steam. The sauna grounds expand to the ${boardExpansionDirectionLabel(expansionDirection)}. Pick one global modifier before the next wave.`;
    return;
  }
  if (upcomingWave.isBoss) {
    state.phase = 'prep';
    state.waveElapsedMs = 0;
    state.currentWave = upcomingWave;
    state.pendingSpawns = [];
    scheduleAutoplay(state);
    state.message = `${bossDisplayName(upcomingWave.bossId) ?? `Boss wave ${upcomingWave.index}`} is coming. Reposition before it hits.`;
    return;
  }

  startWaveState(state, upcomingWave, content, `Wave ${upcomingWave.index} rolls in without a break.`);
}

function applyGlobalRegenTick(state: RunState, content: GameContent): void {
  for (const defender of livingDefenders(state)) {
    const stats = derivedStats(state, defender, content);
    if (stats.regenHpPerSecond <= 0) continue;
    defender.hp = Math.min(stats.maxHp, defender.hp + stats.regenHpPerSecond);
  }
  if (isEndUserHordeBossWave(state.currentWave)) {
    setEndUserHordeMomentum(state, state.endUserHordeMomentum + hordeEnemies(state).length);
  }
}

function scaledSoftcapCost(level: number, baseCost: number, costStep: number, maxLevel: number, repeatable: boolean): number | null {
  if (level >= maxLevel && !repeatable) return null;
  const baseLevelCost = baseCost + costStep * level;
  if (!repeatable || level < maxLevel) {
    return baseLevelCost;
  }
  const postCapLevel = level - maxLevel + 1;
  const surchargeStep = Math.max(4, costStep || Math.ceil(baseCost * 0.8));
  return baseLevelCost + Math.floor((postCapLevel * (postCapLevel + 1) * surchargeStep) / 2);
}

function metaCost(state: RunState, upgradeId: MetaUpgradeId, content: GameContent): number | null {
  const def = content.metaUpgrades[upgradeId];
  return scaledSoftcapCost(
    state.meta.upgrades[upgradeId],
    def.baseCost,
    def.costStep,
    def.maxLevel,
    isRepeatableMetaUpgrade(upgradeId)
  );
}

function nameMasteryCost(state: RunState, masteryId: NameMasteryId, content: GameContent): number {
  const def = content.nameMasteries[masteryId];
  return scaledSoftcapCost(nameMasteryLevel(state, masteryId), def.baseCost, def.costStep, def.maxLevel, true) ?? def.baseCost;
}

function metaUpgradeSoftcapReached(state: RunState, upgradeId: MetaUpgradeId, content: GameContent): boolean {
  return isRepeatableMetaUpgrade(upgradeId) && state.meta.upgrades[upgradeId] > metaSoftcapLevel(upgradeId, content);
}

function nameMasterySoftcapReached(state: RunState, masteryId: NameMasteryId, content: GameContent): boolean {
  return nameMasteryLevel(state, masteryId) > content.nameMasteries[masteryId].maxLevel;
}

function masteryStatLabel(stat: GlobalModifierEffectStat): string {
  switch (stat) {
    case 'maxHp':
      return 'Max HP';
    case 'damage':
      return 'Damage';
    case 'heal':
      return 'Heal';
    case 'range':
      return 'Range';
    case 'attackCooldownMs':
      return 'ms attack cooldown';
    case 'defense':
      return 'Defense';
    case 'regenHpPerSecond':
      return 'HP regen/s';
    default:
      return 'stat';
  }
}

function formatMasteryAmount(amount: number, stat: GlobalModifierEffectStat): string {
  const prefix = amount > 0 ? '+' : '';
  return `${prefix}${amount} ${masteryStatLabel(stat)}`;
}

function nameMasteryEffectText(state: RunState, masteryId: NameMasteryId, content: GameContent): string {
  const def = content.nameMasteries[masteryId];
  const level = nameMasteryLevel(state, masteryId);
  const total = def.amountPerRank * level;
  return `Matching heroes gain ${formatMasteryAmount(total, def.effectStat)} total (${formatMasteryAmount(def.amountPerRank, def.effectStat)} per rank).`;
}

function nextNameMasteryEffectText(masteryId: NameMasteryId, content: GameContent): string {
  const def = content.nameMasteries[masteryId];
  return `Next: ${formatMasteryAmount(def.amountPerRank, def.effectStat)}`;
}

function nextMetaUpgradeEffectText(state: RunState, upgradeId: MetaUpgradeId): string | null {
  const currentLevel = state.meta.upgrades[upgradeId];
  const nextLevel = currentLevel + 1;
  switch (upgradeId) {
    case 'roster_capacity': {
      const current = rosterCapacityBonus(currentLevel);
      const next = rosterCapacityBonus(nextLevel);
      return next > current
        ? `Next: +${next - current} board cap and +${next - current} roster cap`
        : 'Next: build-up level toward the next +1 board and roster cap';
    }
    case 'inventory_slots': {
      const current = inventoryCapacityBonus(currentLevel);
      const next = inventoryCapacityBonus(nextLevel);
      if (currentLevel <= 0) return 'Next: unlock Overflow Stash';
      return `Next: +${Math.max(0, next - current)} stash capacity`;
    }
    case 'loot_luck': {
      const current = lootLuckBonus(currentLevel);
      const next = lootLuckBonus(nextLevel);
      return `Next: +${Math.round((next - current) * 100)}% loot chance`;
    }
    case 'loot_rarity': {
      const current = lootRarityScore(currentLevel);
      const next = lootRarityScore(nextLevel);
      return next > current
        ? `Next: better rarity weights (score ${next})`
        : 'Next: build-up level toward the next rarity score';
    }
    case 'item_slots': {
      const current = itemSlotBonus(currentLevel);
      const next = itemSlotBonus(nextLevel);
      return next > current
        ? `Next: +${next - current} item slot per hero`
        : 'Next: build-up level toward the next item slot';
    }
    case 'beer_shop_level': {
      const currentOffers = beerShopOfferCountForLevel(currentLevel);
      const nextOffers = beerShopOfferCountForLevel(nextLevel);
      const currentSlots = beerActiveSlotCapForLevel(currentLevel);
      const nextSlots = beerActiveSlotCapForLevel(nextLevel);
      const parts: string[] = [];
      if (nextOffers > currentOffers) parts.push(`+${nextOffers - currentOffers} offer`);
      if (nextSlots > currentSlots) parts.push(`+${nextSlots - currentSlots} active slot`);
      return parts.length > 0 ? `Next: ${parts.join(', ')}` : 'Next: build-up level toward the next beer stock boost';
    }
    default:
      return null;
  }
}

function hudNameMasteryEntry(state: RunState, masteryId: NameMasteryId, content: GameContent): HudNameMasteryEntry {
  const definition = content.nameMasteries[masteryId];
  const level = nameMasteryLevel(state, masteryId);
  const cost = nameMasteryCost(state, masteryId, content);
  return {
    id: masteryId,
    category: definition.category,
    name: definition.name,
    description: definition.description,
    level,
    cost,
    affordable: state.meta.steam >= cost,
    active: activeNameMasteryId(state, masteryId) === masteryId,
    canActivate: level > 0,
    softcapReached: nameMasterySoftcapReached(state, masteryId, content),
    effectText: nameMasteryEffectText(state, masteryId, content),
    nextEffectText: nextNameMasteryEffectText(masteryId, content)
  };
}

function getInventoryDrop(state: RunState, dropId: number | null): InventoryDrop | null {
  return dropId === null ? null : allLootDrops(state).find((drop) => drop.instanceId === dropId) ?? null;
}

function sellPriceForRarity(rarity: Rarity): number {
  switch (rarity) {
    case 'legendary':
      return 6;
    case 'epic':
      return 4;
    case 'rare':
      return 2;
    case 'common':
    default:
      return 1;
  }
}

function canEquipDrop(defender: DefenderInstance, drop: InventoryDrop, state: RunState, content: GameContent): boolean {
  if (defender.location === 'dead') return false;
  if (drop.kind === 'item') {
    return defender.items.length < itemSlotCap(state, content);
  }
  return defender.skills.length < skillSlotCap();
}

function findAutoAssignTarget(state: RunState, drop: InventoryDrop, content: GameContent): DefenderInstance | null {
  const selected = getDefender(state, state.selectedDefenderId);
  if (selected && canEquipDrop(selected, drop, state, content)) {
    return selected;
  }

  return livingDefenders(state).find((defender) => canEquipDrop(defender, drop, state, content)) ?? null;
}

function itemAutoScore(itemId: ItemId, content: GameContent): number {
  const modifiers = content.itemDefinitions[itemId].modifiers;
  return (
    (modifiers.maxHp ?? 0) * 0.4 +
    (modifiers.damage ?? 0) * 1.35 +
    (modifiers.heal ?? 0) * 1.15 +
    (modifiers.range ?? 0) * 0.95 +
    (modifiers.defense ?? 0) * 0.9 +
    (modifiers.regenHpPerSecond ?? 0) * 1.4 -
    (modifiers.attackCooldownMs ?? 0) * 0.012
  );
}

function skillAutoScore(skillId: SkillId): number {
  switch (skillId) {
    case 'ember_storm':
      return 7.4;
    case 'sauna_quake':
      return 6.8;
    case 'thunder_run':
      return 6.5;
    case 'fireball':
      return 6.2;
    case 'spin2win':
      return 6.0;
    case 'boiling_orbit':
      return 5.9;
    case 'lava_whip':
      return 5.8;
    case 'blink_step':
      return 5.6;
    case 'afterburn_hook':
      return 5.5;
    case 'chain_spark':
      return 5.4;
    case 'battle_hymn':
      return 5.2;
    case 'steam_shield':
      return 4.8;
    default:
      return 0;
  }
}

function cooldownLabel(name: string, readyAtMs: number, timeMs: number): string {
  return timeMs >= readyAtMs
    ? `${name} ready`
    : `${name} ${Math.ceil((readyAtMs - timeMs) / 1000)}s`;
}

function dropAutoScore(drop: InventoryDrop, content: GameContent): number {
  return drop.kind === 'item'
    ? itemAutoScore(drop.definitionId as ItemId, content)
    : skillAutoScore(drop.definitionId as SkillId);
}

function equippedLootScore(kind: LootKind, definitionId: ItemId | SkillId, content: GameContent): number {
  return kind === 'item'
    ? itemAutoScore(definitionId as ItemId, content)
    : skillAutoScore(definitionId as SkillId);
}

function orderedLivingDefenders(state: RunState): DefenderInstance[] {
  const selected = getDefender(state, state.selectedDefenderId);
  const living = livingDefenders(state);
  if (!selected || selected.location === 'dead') {
    return living;
  }
  return [selected, ...living.filter((defender) => defender.id !== selected.id)];
}

function createInventoryDropFromDefinition(
  state: RunState,
  content: GameContent,
  kind: LootKind,
  definitionId: ItemId | SkillId,
  sourceEnemyId: EnemyUnitId,
  waveFound = state.waveIndex
): InventoryDrop {
  const definition = kind === 'item'
    ? content.itemDefinitions[definitionId as ItemId]
    : content.skillDefinitions[definitionId as SkillId];
  return {
    instanceId: state.nextLootInstanceId++,
    kind,
    definitionId,
    rarity: definition.rarity,
    name: definition.name,
    effectText: definition.effectText,
    flavorText: definition.flavorText,
    artPath: definition.artPath,
    waveFound,
    sourceEnemyId
  };
}

function describeReturnedDropStorage(storage: 'header' | 'stash' | 'discarded'): string {
  switch (storage) {
    case 'header':
      return ' The replaced loot was returned to the header.';
    case 'stash':
      return ' The replaced loot was moved into the stash.';
    case 'discarded':
      return ' The replaced loot had no room and was lost.';
    default:
      return '';
  }
}

function swapDropOnDefender(
  state: RunState,
  drop: InventoryDrop,
  defender: DefenderInstance,
  replacedDefinitionId: ItemId | SkillId,
  content: GameContent
): { returnedDrop: InventoryDrop; storage: 'header' | 'stash' | 'discarded' } | null {
  const previousMax = derivedStats(state, defender, content).maxHp;
  if (drop.kind === 'item') {
    const index = defender.items.indexOf(replacedDefinitionId as ItemId);
    if (index < 0) return null;
    defender.items.splice(index, 1, drop.definitionId as ItemId);
  } else {
    const index = defender.skills.indexOf(replacedDefinitionId as SkillId);
    if (index < 0) return null;
    defender.skills.splice(index, 1, drop.definitionId as SkillId);
  }

  removeLootDrop(state, drop.instanceId);
  const returnedDrop = createInventoryDropFromDefinition(
    state,
    content,
    drop.kind,
    replacedDefinitionId,
    drop.sourceEnemyId,
    drop.waveFound
  );
  const storage = storeLootDrop(state, returnedDrop, content);
  if (storage !== 'discarded') {
    state.recentDropId = returnedDrop.instanceId;
    state.selectedInventoryDropId = returnedDrop.instanceId;
  } else if (state.recentDropId === returnedDrop.instanceId) {
    setRecentLootFromState(state);
  }
  defender.hp += Math.max(0, derivedStats(state, defender, content).maxHp - previousMax);
  normalizeDefender(state, defender, content);
  return { returnedDrop, storage };
}

function findAutoUpgradeTarget(
  state: RunState,
  drop: InventoryDrop,
  content: GameContent
): { defender: DefenderInstance; replacedDefinitionId: ItemId | SkillId; scoreDelta: number } | null {
  const incomingScore = dropAutoScore(drop, content);
  let best: { defender: DefenderInstance; replacedDefinitionId: ItemId | SkillId; scoreDelta: number } | null = null;

  for (const defender of orderedLivingDefenders(state)) {
    const equipped = drop.kind === 'item' ? defender.items : defender.skills;
    for (const definitionId of equipped) {
      const scoreDelta = incomingScore - equippedLootScore(drop.kind, definitionId, content);
      if (scoreDelta <= 0) {
        continue;
      }
      if (!best || scoreDelta > best.scoreDelta) {
        best = { defender, replacedDefinitionId: definitionId, scoreDelta };
      }
    }
  }

  return best;
}

function maybeAutoHandleLootDrop(state: RunState, drop: InventoryDrop, content: GameContent): void {
  if (!state.autoAssignEnabled || !hasLootAutoAssign(state)) {
    return;
  }

  const liveDrop = getInventoryDrop(state, drop.instanceId);
  if (!liveDrop) {
    return;
  }

  const freeSlotTarget = findAutoAssignTarget(state, liveDrop, content);
  if (freeSlotTarget) {
    equipDropOnDefender(state, liveDrop, freeSlotTarget, content);
    state.message = `${liveDrop.name} auto-assigned to ${freeSlotTarget.name}.`;
    return;
  }

  if (!state.autoUpgradeEnabled || !hasLootAutoUpgrade(state)) {
    return;
  }

  const upgradeTarget = findAutoUpgradeTarget(state, liveDrop, content);
  if (!upgradeTarget) {
    return;
  }

  const result = swapDropOnDefender(
    state,
    liveDrop,
    upgradeTarget.defender,
    upgradeTarget.replacedDefinitionId,
    content
  );
  if (!result) {
    return;
  }

  const replacedName = liveDrop.kind === 'item'
    ? content.itemDefinitions[upgradeTarget.replacedDefinitionId as ItemId].name
    : content.skillDefinitions[upgradeTarget.replacedDefinitionId as SkillId].name;
  state.message =
    `${liveDrop.name} auto-upgraded ${upgradeTarget.defender.name}, replacing ${replacedName}.` +
    describeReturnedDropStorage(result.storage);
}

function canStartWaveNow(state: RunState): boolean {
  return state.overlayMode === 'none' && state.phase === 'prep' && boardDefenders(state).length > 0;
}

function scheduleAutoplay(state: RunState, delayMs = AUTOPLAY_DELAY_MS): void {
  state.autoplayReadyAtMs = state.timeMs + delayMs;
}

function maybeStartAutoplayWave(state: RunState, content: GameContent): boolean {
  if (
    !state.autoplayEnabled ||
    state.phase !== 'prep' ||
    state.overlayMode !== 'none' ||
    state.activePanel !== null ||
    state.introOpen ||
    boardDefenders(state).length === 0 ||
    state.timeMs < state.autoplayReadyAtMs
  ) {
    return false;
  }

  startWaveState(
    state,
    state.currentWave,
    content,
    state.currentWave.isBoss
      ? `Boss wave ${state.currentWave.index} started.`
      : `Wave ${state.currentWave.index} started.`
  );
  return true;
}

function equipDropOnDefender(
  state: RunState,
  drop: InventoryDrop,
  defender: DefenderInstance,
  content: GameContent
): boolean {
  if (!getInventoryDrop(state, drop.instanceId) || !canEquipDrop(defender, drop, state, content)) return false;

  const prevMax = derivedStats(state, defender, content).maxHp;
  if (drop.kind === 'item') {
    defender.items.push(drop.definitionId as ItemId);
  } else {
    defender.skills.push(drop.definitionId as SkillId);
  }

  removeLootDrop(state, drop.instanceId);
  defender.hp += Math.max(0, derivedStats(state, defender, content).maxHp - prevMax);
  normalizeDefender(state, defender, content);
  return true;
}

function destroyEquippedItem(
  state: RunState,
  defender: DefenderInstance,
  itemId: ItemId,
  content: GameContent
): boolean {
  const index = defender.items.indexOf(itemId);
  if (index < 0) return false;
  defender.items.splice(index, 1);
  normalizeDefender(state, defender, content);
  return true;
}

function destroyEquippedSkill(defender: DefenderInstance, skillId: SkillId): boolean {
  const index = defender.skills.indexOf(skillId);
  if (index < 0) return false;
  defender.skills.splice(index, 1);
  return true;
}

function awardMeta(state: RunState): void {
  if (state.metaAwarded) return;
  state.meta.steam += state.steamEarned;
  state.meta.completedRuns += 1;
  state.metaAwarded = true;
}

function pressureLabel(pressure: number): string {
  if (pressure >= 24) return 'Overheated';
  if (pressure >= 18) return 'Severe';
  if (pressure >= 13) return 'High';
  if (pressure >= 8) return 'Medium';
  return 'Low';
}

function patternLabel(waveDef: WaveDefinition): string {
  if (waveDef.isBoss && waveDef.bossId) {
    return bossDisplayName(waveDef.bossId) ?? 'Boss encounter';
  }
  switch (waveDef.pattern) {
    case 'tutorial':
      return 'Warm-up lanes';
    case 'split':
      return 'Split pressure';
    case 'staggered':
      return 'Delayed rush';
    case 'spearhead':
      return 'Heavy spearhead';
    case 'surge':
      return 'Three-lane surge';
    case 'boss_pressure':
      return 'Pressure boss';
    case 'boss_breach':
      return 'Breach boss';
    default:
      return 'Unknown';
  }
}

function pressureSignals(state: RunState, content: GameContent): string[] {
  const signals: string[] = [];
  const living = livingDefenders(state);
  const board = boardDefenders(state);
  const injured = living.filter((defender) => defender.hp / derivedStats(state, defender, content).maxHp <= 0.45).length;
  const nextBossSoon = !state.currentWave.isBoss && slotInCycle(state.currentWave.index, content) === content.config.bossEvery - 1;
  const saunaThreatened =
    state.saunaHp / content.config.saunaHp <= content.config.lowSaunaHintRatio ||
    state.enemies.some((enemy) => hexDistance(enemy.tile, CENTER) <= 1) ||
    state.currentWave.bossCategory === 'breach';

  if (nextBossSoon || (state.phase === 'prep' && state.currentWave.isBoss)) {
    signals.push(state.currentWave.isBoss ? 'Boss prep window' : 'Boss in 1 wave');
  }
  if (saunaThreatened) {
    signals.push('Sauna under pressure');
  }
  if (state.sisu.current <= content.config.lowSisuThreshold) {
    signals.push('SISU low');
  }
  if (living.length <= 3 || board.length <= 2 || injured >= 2) {
    signals.push('Roster fragile');
  }

  return signals;
}

function globalModifierScopeLabel(definition: GlobalModifierDefinition, content: GameContent): string {
  const prefix =
    definition.countScope === 'board'
      ? 'board'
      : definition.countScope === 'dead'
        ? 'dead'
        : 'living';

  switch (definition.source.kind) {
    case 'first_name':
      return `${prefix} heroes named ${definition.source.name}`;
    case 'template':
      return `${prefix} ${content.defenderTemplates[definition.source.templateId].name}`;
    case 'subclass':
      return `${prefix} ${content.defenderSubclasses[definition.source.subclassId].name}`;
    case 'skill':
      return `${prefix} ${content.skillDefinitions[definition.source.skillId].name}`;
    case 'item':
      return `${prefix} ${content.itemDefinitions[definition.source.itemId].name}`;
    case 'title':
      return `${prefix} ${definition.source.title}`;
    case 'roster':
      return `${prefix} hero`;
    default:
      return `${prefix} source`;
  }
}

function globalModifierSourceLabel(definition: GlobalModifierDefinition, content: GameContent): string {
  switch (definition.source.kind) {
    case 'first_name':
      return `First name: ${definition.source.name}`;
    case 'template':
      return `Main class: ${content.defenderTemplates[definition.source.templateId].name}`;
    case 'subclass':
      return `Subclass: ${content.defenderSubclasses[definition.source.subclassId].name}`;
    case 'skill':
      return `Skill: ${content.skillDefinitions[definition.source.skillId].name}`;
    case 'item':
      return `Item: ${content.itemDefinitions[definition.source.itemId].name}`;
    case 'title':
      return `Title: ${definition.source.title}`;
    case 'roster':
      return 'Roster-wide';
    default:
      return 'Unknown source';
  }
}

function globalModifierStatLabel(stat: GlobalModifierEffectStat): string {
  switch (stat) {
    case 'maxHp':
      return 'max HP';
    case 'damage':
      return 'damage';
    case 'heal':
      return 'healing';
    case 'range':
      return 'range';
    case 'attackCooldownMs':
      return 'attack cooldown';
    case 'defense':
      return 'defense';
    case 'regenHpPerSecond':
      return 'HP regen/s';
    default:
      return stat;
  }
}

function formatModifierAmount(amount: number, stat: GlobalModifierEffectStat): string {
  const sign = amount >= 0 ? '+' : '';
  const value = `${sign}${amount}`;
  return stat === 'attackCooldownMs' ? `${value} ms` : value;
}

function formatAlcoholModifier(modifier: AlcoholModifier, polarity: 'positive' | 'negative'): string {
  const parts: string[] = [];
  const signed = (value: number, invertForPositive = false) => {
    if (polarity === 'positive') {
      const positiveValue = invertForPositive ? -value : value;
      return `${positiveValue >= 0 ? '+' : ''}${positiveValue}`;
    }
    const negativeValue = invertForPositive ? value : -value;
    return `${negativeValue >= 0 ? '+' : ''}${negativeValue}`;
  };

  if (modifier.maxHp) parts.push(`${signed(modifier.maxHp)} HP`);
  if (modifier.damage) parts.push(`${signed(modifier.damage)} damage`);
  if (modifier.heal) parts.push(`${signed(modifier.heal)} healing`);
  if (modifier.range) parts.push(`${signed(modifier.range)} range`);
  if (modifier.attackCooldownMs) parts.push(`${signed(modifier.attackCooldownMs, true)} ms cooldown`);
  if (modifier.defense) parts.push(`${signed(modifier.defense)} defense`);
  if (modifier.regenHpPerSecond) parts.push(`${signed(modifier.regenHpPerSecond)} regen/s`);
  if (modifier.lootChance) parts.push(`${signed(Math.round(modifier.lootChance * 100))}% loot chance`);
  if (modifier.rewardSisu) parts.push(`${signed(modifier.rewardSisu)} wave SISU`);
  return parts.join(', ');
}

function globalModifierHudEntry(state: RunState, definition: GlobalModifierDefinition, content: GameContent) {
  const pickCount = countGlobalModifierPicks(state, definition.id);
  const stackCount = globalModifierStacks(state, definition);
  const total = definition.amountPerStack * stackCount * pickCount;
  return {
    id: definition.id,
    name: definition.name,
    rarity: definition.rarity,
    sourceLabel: globalModifierSourceLabel(definition, content),
    description: definition.description,
    formulaText: `${formatModifierAmount(definition.amountPerStack, definition.effectStat)} ${globalModifierStatLabel(definition.effectStat)} per ${globalModifierScopeLabel(definition, content)}`,
    pickCount,
    stackCount,
    effectText: `${formatModifierAmount(definition.amountPerStack, definition.effectStat)} ${globalModifierStatLabel(definition.effectStat)}`,
    resolvedEffectText: `${pickCount} pick${pickCount === 1 ? '' : 's'} x ${stackCount} live stack${stackCount === 1 ? '' : 's'} -> ${formatModifierAmount(total, definition.effectStat)} ${globalModifierStatLabel(definition.effectStat)}`
  };
}

function globalModifierDraftHudEntry(state: RunState, definition: GlobalModifierDefinition, content: GameContent) {
  const ownedCount = countGlobalModifierPicks(state, definition.id);
  const stackCount = globalModifierStacks(state, definition);
  const incrementalTotal = definition.amountPerStack * stackCount;
  const projectedTotal = incrementalTotal * (ownedCount + 1);
  return {
    id: definition.id,
    name: definition.name,
    rarity: definition.rarity,
    sourceLabel: globalModifierSourceLabel(definition, content),
    description: definition.description,
    formulaText: `${formatModifierAmount(definition.amountPerStack, definition.effectStat)} ${globalModifierStatLabel(definition.effectStat)} per ${globalModifierScopeLabel(definition, content)}`,
    ownedCount,
    stackCount,
    incrementText: `${formatModifierAmount(incrementalTotal, definition.effectStat)} ${globalModifierStatLabel(definition.effectStat)} right now`,
    projectedEffectText: `Would become ${formatModifierAmount(projectedTotal, definition.effectStat)} ${globalModifierStatLabel(definition.effectStat)} total`
  };
}

function globalModifierSummaryEntries(state: RunState, content: GameContent) {
  const totals = globalModifierTotals(state, content);
  return GLOBAL_MODIFIER_STAT_ORDER
    .filter((stat) => totals[stat] !== 0)
    .map((stat) => ({
      stat,
      label: `${formatModifierAmount(totals[stat], stat)} ${globalModifierStatLabel(stat)}`,
      total: totals[stat]
    }));
}

function unlockedSubclassDefinitions(defender: DefenderInstance, content: GameContent): DefenderSubclassDefinition[] {
  return defender.subclassIds.map((subclassId) => content.defenderSubclasses[subclassId]);
}

function selectedSubclassEntries(defender: DefenderInstance, content: GameContent) {
  return unlockedSubclassDefinitions(defender, content).map((definition) => ({
    id: definition.id,
    name: definition.name,
    unlockLevel: definition.unlockLevel,
    effectText: definition.effectText,
    statText: definition.statText
  }));
}

function nextSubclassMilestoneLevel(defender: DefenderInstance, content: GameContent): number | null {
  const unlockedLevels = new Set(unlockedSubclassDefinitions(defender, content).map((definition) => definition.unlockLevel));
  return SUBCLASS_MILESTONE_LEVELS.find((level) => defender.level >= level ? !unlockedLevels.has(level) : true) ?? null;
}

function xpToNextSubclassMilestone(defender: DefenderInstance, content: GameContent): number | null {
  const next = nextSubclassMilestoneLevel(defender, content);
  if (next === null) return null;
  return Math.max(0, xpForLevel(next) - defender.xp);
}

function subclassSummary(defender: DefenderInstance, content: GameContent): string {
  const unlocked = unlockedSubclassDefinitions(defender, content);
  if (unlocked.length === 0) {
    const next = nextSubclassMilestoneLevel(defender, content);
    return next ? `First branch at level ${next}` : 'No branch unlocked';
  }
  return unlocked.map((definition) => definition.name).join(' Â· ');
}

function subclassDescription(defender: DefenderInstance, content: GameContent): string {
  const unlocked = unlockedSubclassDefinitions(defender, content);
  const next = nextSubclassMilestoneLevel(defender, content);
  const xpToNext = xpToNextSubclassMilestone(defender, content);
  if (unlocked.length === 0) {
    return next
      ? `No branch chosen yet. Reach level ${next} to branch, ${xpToNext} XP away.`
      : 'This hero already unlocked every subclass milestone.';
  }
  return next
    ? `Next branch unlocks at level ${next}, ${xpToNext} XP away.`
    : 'Every subclass milestone is already unlocked.';
}

function queuedSubclassDraftExists(state: RunState, defenderId: string, unlockLevel: number): boolean {
  return (
    state.subclassDraftQueue.some((entry) => entry.defenderId === defenderId && entry.unlockLevel === unlockLevel) ||
    (state.subclassDraftDefenderId === defenderId && state.subclassDraftUnlockLevel === unlockLevel)
  );
}

function queueSubclassDraftsForLevelUps(
  state: RunState,
  defender: DefenderInstance,
  beforeLevel: number,
  content: GameContent
): void {
  const unlockedLevels = new Set(unlockedSubclassDefinitions(defender, content).map((definition) => definition.unlockLevel));
  for (const unlockLevel of SUBCLASS_MILESTONE_LEVELS) {
    if (beforeLevel < unlockLevel && defender.level >= unlockLevel && !unlockedLevels.has(unlockLevel) && !queuedSubclassDraftExists(state, defender.id, unlockLevel)) {
      state.subclassDraftQueue.push({ defenderId: defender.id, unlockLevel });
    }
  }
}

function activateNextSubclassDraft(state: RunState, content: GameContent): boolean {
  if (state.overlayMode !== 'none' || state.phase === 'lost' || state.introOpen) return false;
  while (state.subclassDraftQueue.length > 0) {
    const nextDraft = state.subclassDraftQueue.shift() as SubclassDraftRequest;
    const defender = getDefender(state, nextDraft.defenderId);
    if (!defender || defender.location === 'dead') continue;
    const options = subclassMilestoneIds(content, defender.templateId, nextDraft.unlockLevel)
      .filter((subclassId) => !defender.subclassIds.includes(subclassId));
    if (options.length === 0) continue;
    state.overlayMode = 'subclass_draft';
    state.subclassDraftDefenderId = defender.id;
    state.subclassDraftUnlockLevel = nextDraft.unlockLevel;
    state.subclassDraftOfferIds = options;
    clearActiveHudPanel(state);
    state.message = `${defender.name} reached level ${nextDraft.unlockLevel}. Pick a subclass branch.`;
    return true;
  }
  state.subclassDraftDefenderId = null;
  state.subclassDraftUnlockLevel = null;
  state.subclassDraftOfferIds = [];
  return false;
}

function actionCopy(state: RunState, content: GameContent): { title: string; body: string } {
  const selectedLoot = getInventoryDrop(state, state.selectedInventoryDropId);
  const selectedDefender = getDefender(state, state.selectedDefenderId);
  const selectedEnemy = getEnemy(state, state.selectedEnemyInstanceId);
  const boardCount = boardDefenders(state).length;
  const readyRecruit = pendingReadyRecruit(state);
  const liveOffers = state.recruitOffers.filter((offer): offer is RecruitOffer => offer !== null);

  if (state.overlayMode === 'intermission') {
    if (!state.meta.shopUnlocked) {
      return {
        title: state.phase === 'lost' ? 'Shop Locked' : 'Run Lobby',
        body: state.phase === 'lost'
          ? `You unlocked the between-run lobby, but the actual ${META_SHOP_LABEL} still needs one Steam-powered grand opening.`
          : `No ${META_SHOP_LABEL} before the first run. Survive one shift first, then decide if the grand opening is worth the Steam.`
      };
    }
    return {
      title: state.phase === 'lost' ? 'Run Over' : 'Before The Run',
      body: state.phase === 'lost'
        ? beerShopUnlocked(state)
          ? hallOfFameUnlocked(state)
            ? 'Cash out Steam, tune the kiosk, visit the Hall of Fame, grab something reckless from the bartender, then launch the next batch of sauna weirdos.'
            : 'Cash out Steam, tune the kiosk, grab something reckless from the bartender, then launch the next batch of sauna weirdos.'
          : hallOfFameUnlocked(state)
            ? 'Cash out Steam, tweak the kiosk, visit the Hall of Fame, then launch the next batch of sauna weirdos.'
            : 'Cash out Steam, tweak the kiosk, then launch the next batch of sauna weirdos.'
        : beerShopUnlocked(state)
          ? hallOfFameUnlocked(state)
            ? 'Use the kiosk, Hall of Fame, and bartender before the first wave if you want a stronger long-term run.'
            : 'Use the kiosk and bartender before the first wave if you want a stronger long-term run.'
          : hallOfFameUnlocked(state)
            ? 'Use the kiosk and Hall of Fame before the first wave if you want a stronger long-term run.'
            : 'Use the kiosk before the first wave if you want a stronger long-term run.'
    };
  }
  if (state.overlayMode === 'paused') {
    return {
      title: 'Run Paused',
      body: 'Combat is frozen. Check loot, place reinforcements, then resume when the plan feels solid.'
    };
  }
  if (state.overlayMode === 'modifier_draft') {
    return {
      title: 'Boss Reward',
      body: 'Pick one global modifier. Its stacks update live from your current roster, loadout and casualties.'
    };
  }
  if (state.overlayMode === 'subclass_draft') {
    return {
      title: 'Subclass Branch Ready',
      body: 'A hero hit a milestone. Pick one branch before the run continues.'
    };
  }
  if (selectedLoot && selectedDefender) {
    return {
      title: 'Equip Opportunity',
      body: `${selectedLoot.name} is ready for ${selectedDefender.name}. Equip manually or use auto assign to place it fast.`
    };
  }
  if (selectedLoot) {
    return {
      title: 'Loot Waiting',
      body: `${selectedLoot.name}: ${selectedLoot.flavorText}`
    };
  }
  if (state.selectedMapTarget === 'sauna') {
    return {
      title: 'Sauna Reserve',
      body: state.saunaDefenderId
        ? 'The sauna is holding one reserve hero. Check their condition and the auto-deploy tools here.'
        : 'The sauna is empty. Send a board hero there during prep if you want a reserve.'
    };
  }
  if (state.selectedMapTarget === 'enemy' && selectedEnemy) {
    return {
      title: isWaveBossEnemy(state.currentWave, selectedEnemy) ? 'Boss Profile' : 'Target Profile',
      body: isWaveBossEnemy(state.currentWave, selectedEnemy)
        ? `${content.enemyArchetypes[selectedEnemy.archetypeId].name} is the active boss threat. Check the behavior tags, then plan around its gimmick before it steamrolls the sauna.`
        : `${content.enemyArchetypes[selectedEnemy.archetypeId].name} is selected. Read its stats and lore, then decide which lane needs help first.`
    };
  }
  if (liveOffers.length > 0) {
    return {
      title: 'Recruit Market Live',
      body: readyRecruit
        ? `${readyRecruit.name} is waiting to be placed. Drop them on a green hex or send a board hero to sauna before buying another recruit.`
        : boardCount >= boardCap(state, content)
          ? state.saunaDefenderId
            ? 'Board full: the next recruit replaces the current sauna hero.'
            : 'Board full: the next recruit goes to the empty sauna.'
          : state.recruitMarketIsFree
            ? 'The opening four recruits are free. Pick one and place them before refreshing the roster.'
            : 'Four recruits are waiting in the market. Pick one, place them, then refresh when you want a new batch.'
    };
  }
  if (selectedDefender && selectedDefender.location !== 'board') {
    return {
      title: 'Place Defender',
      body: `Drop ${selectedDefender.name} onto a bright green build hex. You can still place recruits while the wave is live.`
    };
  }
  if (state.phase === 'prep') {
    if (boardCount === 0 && readyRecruit) {
      return {
        title: 'Place Your First Hero',
        body: 'Pick one recruit from the bottom market, then click any green build hex on the board. Path tiles stay dark and cannot hold defenders.'
      };
    }
    return {
      title: state.currentWave.isBoss ? `${bossDisplayName(state.currentWave.bossId) ?? 'Boss'} Prep` : 'Prep Window',
      body: state.currentWave.isBoss
        ? bossHint(state.currentWave.bossId) ?? 'This is the clean break before a boss. Set the board, spend SISU carefully, then start when ready.'
        : liveOffers.length > 0
          ? 'Set the board, reroll recruits if needed, and start when your lanes make sense.'
          : 'Set the board, sort loot, and start when your lanes make sense.'
    };
  }
  return {
    title: state.currentWave.isBoss ? (bossDisplayName(state.currentWave.bossId) ?? 'Boss Pressure') : 'Hold The Line',
    body: state.currentWave.isBoss
      ? bossHint(state.currentWave.bossId) ?? 'Keep the center alive, use pause if you need to assign loot, and watch for direct sauna breaches.'
      : liveOffers.length > 0
        ? 'Non-boss waves keep chaining. You can still recruit and place new heroes while the fight is live.'
        : 'Non-boss waves keep chaining, so stabilize attrition before the next spike arrives.'
  };
}

export function createInitialState(
  content: GameContent,
  meta: MetaProgress = createDefaultMetaProgress(),
  seed = 123456789,
  showIntermission = false,
  introOpen = false,
  activeAlcohols: ActiveAlcoholBuff[] = [],
  preferences: RunPreferences = createDefaultRunPreferences()
): RunState {
  const state: RunState = {
    phase: 'prep',
    overlayMode: showIntermission ? 'intermission' : 'none',
    inventoryOpen: false,
    activePanel: null,
    selectedWorldLandmarkId: null,
    landmarkTiles: {
      metashop: { q: 0, r: 0 },
      beer_shop: { q: 0, r: 0 }
    },
    introOpen,
    timeMs: 0,
    waveIndex: 1,
    waveElapsedMs: 0,
    currentWave: createWaveDefinition(1, content),
    seed,
    selectedMapTarget: null,
    selectedDefenderId: null,
    selectedEnemyInstanceId: null,
    hoveredTile: null,
    defenders: [],
    enemies: [],
    fxEvents: [],
    pendingFireballs: [],
    pendingSaunaQuakes: [],
    pendingEmberStormStrikes: [],
    activeBoilingOrbits: [],
    hitStopMs: 0,
    saunaDefenderId: null,
    pendingSpawns: [],
    nextEnemyInstanceId: 1,
    nextLootInstanceId: 1,
    nextRecruitOfferId: 1,
    nextBeerOfferId: 1,
    nextFxEventId: 1,
    nextDeathLogEntryId: 1,
    headerItems: [],
    headerSkills: [],
    inventory: [],
    selectedInventoryDropId: null,
    recentDropId: null,
    recruitOffers: [],
    recruitMarketIsFree: false,
    benchRerollCountsByDefenderId: {},
    recruitLevelBonus: 0,
    recruitLevelUpCount: 0,
    beerShopOffers: [],
    activeAlcohols: clone(activeAlcohols),
    subclassDraftQueue: [],
    subclassDraftDefenderId: null,
    subclassDraftUnlockLevel: null,
    subclassDraftOfferIds: [],
    activeGlobalModifierIds: [],
    globalModifierDraftOffers: [],
    deathLog: [],
    sisu: { current: content.config.startingSisu, activeUntilMs: 0, cooldownUntilMs: 0 },
    steamEarned: 0,
    gambleCount: 0,
    saunaHp: content.config.saunaHp,
    waveSwapUsed: false,
    nextRegenTickAtMs: 1000,
    saunaRetreatReadyAtMs: 0,
    pebbleBottleTargets: [],
    pebbleBottleStacks: 0,
    pebbleEncounterCount: 0,
    nextPebbleBottleTargetId: 1,
    endUserHordeMomentum: 0,
    endUserHordeTier: 0,
    endUserHordeNextSurgeAtMs: 0,
    boardExpansionDirections: [],
    speechBubbles: [],
    nextSpeechBubbleId: 1,
    bossSpeechReadyAtMs: 0,
    bossIntroSpokenWaveIndex: null,
    autoAssignEnabled: preferences.autoAssignEnabled,
    autoUpgradeEnabled: preferences.autoUpgradeEnabled,
    autoplayEnabled: preferences.autoplayEnabled,
    autoplayReadyAtMs: AUTOPLAY_DELAY_MS,
    meta: clone(meta),
    message: showIntermission
      ? 'Spend Steam, browse upgrades, then begin the next sauna shift.'
      : 'Pick a free recruit, place them on the board, then start the wave.',
    metaAwarded: false
  };
  state.defenders = buildRoster(state, content);
  state.saunaDefenderId = state.defenders.find((defender) => defender.location === 'sauna')?.id ?? null;
  state.landmarkTiles = createLandmarkTilesForState(state, content);
  if (!showIntermission) {
    rollRecruitOffersIntoState(state, content, true);
  }
  if (beerShopUnlocked(state)) {
    rollBeerShopOffersIntoState(state, content);
  }
  return state;
}

export function applyAction(state: RunState, action: InputAction, content: GameContent): RunState {
  if (action.type === 'restartRun') {
    return createInitialState(
      content,
      state.meta,
      (Date.now() >>> 0) || 1,
      false,
      false,
      [],
      {
        autoAssignEnabled: state.autoAssignEnabled,
        autoUpgradeEnabled: state.autoUpgradeEnabled,
        autoplayEnabled: state.autoplayEnabled
      }
    );
  }
  if (action.type === 'startNextRun') {
    return state.overlayMode === 'intermission'
      ? createInitialState(
        content,
        state.meta,
        (Date.now() >>> 0) || 1,
        false,
        false,
        state.activeAlcohols,
        {
          autoAssignEnabled: state.autoAssignEnabled,
          autoUpgradeEnabled: state.autoUpgradeEnabled,
          autoplayEnabled: state.autoplayEnabled
        }
      )
      : state;
  }
  const next = clone(state);

  if (
    next.introOpen &&
    action.type !== 'closeIntro' &&
    action.type !== 'openIntro'
  ) {
    return next;
  }
  if (next.overlayMode === 'modifier_draft' && action.type !== 'draftGlobalModifier') {
    return next;
  }
  if (next.overlayMode === 'subclass_draft' && action.type !== 'draftSubclassChoice') {
    return next;
  }

  switch (action.type) {
    case 'openIntro':
      next.introOpen = true;
      next.message = 'Quick sauna briefing opened.';
      return next;
    case 'closeIntro':
      next.introOpen = false;
      next.message = 'Sauna briefing closed.';
      return next;
    case 'draftGlobalModifier': {
      if (next.overlayMode !== 'modifier_draft') return next;
      if (!next.globalModifierDraftOffers.includes(action.modifierId)) return next;
      next.activeGlobalModifierIds.push(action.modifierId);
      next.globalModifierDraftOffers = [];
      next.overlayMode = 'none';
      next.phase = 'prep';
      clearActiveHudPanel(next);
      normalizeLivingDefenders(next, content);
      next.message = `${content.globalModifierDefinitions[action.modifierId].name} locked in for this run.`;
      activateNextSubclassDraft(next, content);
      if (next.overlayMode === 'none') {
        scheduleAutoplay(next);
      }
      return next;
    }
    case 'draftSubclassChoice': {
      if (next.overlayMode !== 'subclass_draft') return next;
      if (!next.subclassDraftOfferIds.includes(action.subclassId)) return next;
      const defender = getDefender(next, next.subclassDraftDefenderId);
      if (!defender || defender.location === 'dead') {
        next.overlayMode = 'none';
        next.subclassDraftDefenderId = null;
        next.subclassDraftUnlockLevel = null;
        next.subclassDraftOfferIds = [];
        activateNextSubclassDraft(next, content);
        if (next.overlayMode === 'none') {
          scheduleAutoplay(next);
        }
        return next;
      }
      const previousMaxHp = derivedStats(next, defender, content).maxHp;
      if (!defender.subclassIds.includes(action.subclassId)) {
        defender.subclassIds.push(action.subclassId);
      }
      const nextMaxHp = derivedStats(next, defender, content).maxHp;
      defender.hp = Math.min(nextMaxHp, defender.hp + Math.max(0, nextMaxHp - previousMaxHp));
      next.overlayMode = 'none';
      next.subclassDraftDefenderId = null;
      next.subclassDraftUnlockLevel = null;
      next.subclassDraftOfferIds = [];
      clearActiveHudPanel(next);
      const subclass = content.defenderSubclasses[action.subclassId];
      next.message = `${defender.name} locked in ${subclass.name}.`;
      activateNextSubclassDraft(next, content);
      if (next.overlayMode === 'none') {
        scheduleAutoplay(next);
      }
      return next;
    }
    case 'openHudPanel': {
      if (next.overlayMode === 'modifier_draft' || next.overlayMode === 'subclass_draft') return next;
      if (action.panel === 'recruit') {
        next.message = recruitmentStatusText(next, content);
        return next;
      }
      if (action.panel === 'metashop' && !metashopVisible(next)) return next;
      if (action.panel === 'hall_of_fame' && !hallOfFameUnlocked(next)) return next;
      if (action.panel === 'beer_shop' && !beerShopUnlocked(next)) return next;
      if (next.activePanel === action.panel) {
        clearActiveHudPanel(next);
        return next;
      }
      setActiveHudPanel(next, action.panel);
      if (action.panel === 'loot') {
        if (!inventoryUnlocked(next)) {
          next.inventoryOpen = false;
        }
        next.message = inventoryUnlocked(next)
          ? 'Loot and stash opened.'
          : `Fresh loot is visible here. Overflow stash unlocks from the ${META_SHOP_LABEL}.`;
      }
      return next;
    }
    case 'closeHudPanel':
    case 'clearWorldLandmark':
      clearActiveHudPanel(next);
      return next;
    case 'selectWorldLandmark': {
      if (!landmarkVisible(next, action.landmarkId)) return next;
      const panel = action.landmarkId === 'metashop'
        ? 'metashop'
        : action.landmarkId === 'hall_of_fame'
          ? 'hall_of_fame'
          : 'beer_shop';
      if (next.activePanel === panel && next.selectedWorldLandmarkId === action.landmarkId) {
        clearActiveHudPanel(next);
        return next;
      }
      setActiveHudPanel(next, panel, action.landmarkId);
      next.message = landmarkStatusText(next, action.landmarkId, content);
      return next;
    }
    case 'selectSauna':
      next.selectedEnemyInstanceId = null;
      next.selectedDefenderId = null;
      next.selectedMapTarget = 'sauna';
      next.message = next.saunaDefenderId ? 'Sauna selected. One hero is warming up inside.' : 'Sauna selected. It is empty right now.';
      return next;
    case 'selectDefender': {
      const defender = getDefender(next, action.defenderId);
      if (!defender || defender.location === 'dead') return next;
      next.selectedMapTarget = 'defender';
      next.selectedDefenderId = defender.id;
      next.selectedEnemyInstanceId = null;
      next.message = `${defender.name} ${defender.title} selected.`;
      return next;
    }
    case 'selectEnemy': {
      const enemy = getEnemy(next, action.enemyInstanceId);
      if (!enemy || enemy.hp <= 0) return next;
      next.selectedMapTarget = 'enemy';
      next.selectedDefenderId = null;
      next.selectedEnemyInstanceId = enemy.instanceId;
      next.message = isWaveBossEnemy(next.currentWave, enemy)
        ? `${content.enemyArchetypes[enemy.archetypeId].name} boss selected.`
        : `${content.enemyArchetypes[enemy.archetypeId].name} selected.`;
      return next;
    }
    case 'closeSaunaPopup':
    case 'clearSelection':
      clearBoardSelection(next);
      return next;
    case 'selectInventoryDrop': {
      const drop = getInventoryDrop(next, action.dropId);
      if (!drop) return next;
      setActiveHudPanel(next, 'loot');
      next.selectedInventoryDropId = drop.instanceId;
      next.message = `${drop.name} ready to equip.`;
      return next;
    }
    case 'clearSelectedInventoryDrop':
      next.selectedInventoryDropId = null;
      return next;
    case 'toggleInventory':
      if (next.activePanel === 'loot') {
        if (inventoryUnlocked(next) && !next.inventoryOpen) {
          next.inventoryOpen = true;
          next.message = 'Loot and stash opened.';
          return next;
        }
        clearActiveHudPanel(next);
        next.selectedInventoryDropId = null;
        return next;
      }
      setActiveHudPanel(next, 'loot');
      if (!inventoryUnlocked(next)) {
        next.inventoryOpen = false;
        next.message = `Overflow Stash unlocks from the ${META_SHOP_LABEL}.`;
      }
      return next;
    case 'toggleRecruitment':
      if (!canAccessRecruitment(next)) return next;
      clearLegacyRecruitPanelState(next);
      next.message = recruitmentStatusText(next, content);
      return next;
    case 'hoverTile':
      next.hoveredTile = action.tile ? { ...action.tile } : null;
      return next;
    case 'togglePause':
      if (next.overlayMode === 'intermission' || next.phase !== 'wave') return next;
      next.overlayMode = next.overlayMode === 'paused' ? 'none' : 'paused';
      next.message = next.overlayMode === 'paused'
        ? 'Run paused. Think about loot, then jump back in.'
        : `Wave ${next.currentWave.index} resumed.`;
      return next;
    case 'placeSelectedDefender': {
      if (next.overlayMode === 'intermission') return next;
      const defender = getDefender(next, next.selectedDefenderId);
      if (!defender || (defender.location !== 'ready' && defender.location !== 'sauna')) return next;
      if (!isBuildableTile(next, action.tile, content) || occupied(next, action.tile)) {
        next.message = 'That hex is not available.';
        return next;
      }
      if (boardDefenders(next).length >= boardCap(next, content)) {
        next.message = 'Board cap reached.';
        return next;
      }
      const cameFromSauna = defender.location === 'sauna';
      defender.location = 'board';
      if (cameFromSauna) {
        moveDefenderToTile(next, defender, action.tile, 'blink', BLINK_MOTION_DURATION_MS, CENTER);
      } else {
        defender.tile = { ...action.tile };
        clearUnitMotion(defender);
      }
      defender.homeTile = { ...action.tile };
      defender.attackReadyAtMs = next.timeMs + derivedStats(next, defender, content).attackCooldownMs;
      if (next.saunaDefenderId === defender.id) next.saunaDefenderId = null;
      clearBoardSelection(next);
      next.message = cameFromSauna
        ? `${defender.name} stepped out of the sauna and onto the board.`
        : `${defender.name} entered the fight.`;
      return next;
    }
    case 'recallDefenderToSauna': {
      if (next.overlayMode !== 'none') return next;
      const defender = getDefender(next, action.defenderId);
      if (!defender || defender.location !== 'board') return next;
      if (next.phase === 'prep') {
        const currentSaunaDefender = getDefender(next, next.saunaDefenderId);
        if (currentSaunaDefender && currentSaunaDefender.location === 'sauna') {
          currentSaunaDefender.location = 'ready';
          currentSaunaDefender.tile = null;
          clearUnitMotion(currentSaunaDefender);
        }
        defender.location = 'sauna';
        defender.tile = null;
        clearUnitMotion(defender);
        next.saunaDefenderId = defender.id;
        next.message = currentSaunaDefender && currentSaunaDefender.location === 'ready'
          ? `${defender.name} took the sauna seat and ${currentSaunaDefender.name} moved back to the reserve row.`
          : `${defender.name} went to recover in the sauna.`;
        return next;
      }
      if (next.phase !== 'wave') return next;
      if (!canLiveRetreatDefenderToSauna(next, defender)) {
        next.message = `${defender.name} cannot retreat to the sauna right now.`;
        return next;
      }
      performLiveRetreatToSauna(next, defender);
      next.message = `${defender.name} retreated to the sauna for ${LIVE_SAUNA_RETREAT_SISU_COST} SISU.`;
      return next;
    }
    case 'rerollSaunaDefender': {
      if (!canAccessRecruitment(next)) return next;
      const defender = getDefender(next, next.saunaDefenderId);
      if (!defender || defender.location !== 'sauna') return next;
      const cost = saunaRerollCost(next);
      if (cost === null || next.sisu.current < cost) {
        next.message = `Not enough SISU to reroll ${defender.name}.`;
        return next;
      }
      const previousName = defender.name;
      next.sisu.current -= cost;
      rerollSaunaDefenderIdentityAndStats(next, defender, content);
      next.benchRerollCountsByDefenderId[defender.id] = (next.benchRerollCountsByDefenderId[defender.id] ?? 0) + 1;
      normalizeDefender(next, defender, content);
      next.message = `${previousName} rerolled into ${defender.name} ${defender.title} for ${cost} SISU.`;
      return next;
    }
    case 'activateSisu':
      if (next.overlayMode !== 'none') return next;
      if (!canUseSisu(next, content)) return next;
      next.sisu.current -= content.config.sisuAbilityCost;
      next.sisu.activeUntilMs = next.timeMs + content.config.sisuDurationMs;
      next.sisu.cooldownUntilMs = next.sisu.activeUntilMs + content.config.sisuCooldownMs;
      next.message = 'SISU activated.';
      return next;
    case 'startWave':
      if (!canStartWaveNow(next)) {
        next.message = 'Place at least one defender first.';
        return next;
      }
      startWaveState(
        next,
        next.currentWave,
        content,
        next.currentWave.isBoss
          ? `Boss wave ${next.currentWave.index} started.`
          : `Wave ${next.currentWave.index} started.`
      );
      return next;
    case 'rerollRecruitOffers':
    case 'rollRecruitOffers': {
      if (!canAccessRecruitment(next)) return next;
      clearLegacyRecruitPanelState(next);
      const cost = recruitRollCost();
      if (next.sisu.current < cost) {
        next.message = 'Not enough SISU to reroll the market.';
        return next;
      }
      next.sisu.current -= cost;
      rollRecruitOffersIntoState(next, content, false);
      const visibleOffers = next.recruitOffers.filter((offer): offer is RecruitOffer => offer !== null);
      next.message =
        visibleOffers.length > 0
          ? `The market rerolled. Four new recruits are up for sale, starting at ${Math.min(...visibleOffers.map((offer) => offer.price))} SISU.`
          : 'No recruits showed up.';
      return next;
    }
    case 'rerollBenchDefender': {
      if (!canAccessRecruitment(next)) return next;
      const defender = getDefender(next, action.defenderId);
      if (!defender || defender.location !== 'ready') return next;
      const cost = benchRerollCost(next, defender.id);
      if (next.sisu.current < cost) {
        next.message = `Not enough SISU to reroll ${defender.name}.`;
        return next;
      }
      const previousName = defender.name;
      next.sisu.current -= cost;
      rerollDefenderIdentityAndStats(next, defender, content, 'clamp');
      next.benchRerollCountsByDefenderId[defender.id] = (next.benchRerollCountsByDefenderId[defender.id] ?? 0) + 1;
      normalizeDefender(next, defender, content);
      next.message = `${previousName} rerolled into ${defender.name} ${defender.title} for ${cost} SISU.`;
      return next;
    }
    case 'rerollRecruitOffer':
      clearLegacyRecruitPanelState(next);
      next.message = 'Single-slot rerolls are gone. Use Refresh to scout a new batch.';
      return next;
    case 'levelUpRecruitment': {
      if (!canAccessRecruitment(next)) return next;
      clearLegacyRecruitPanelState(next);
      const cost = recruitLevelUpCost(next.recruitLevelUpCount);
      if (next.sisu.current < cost) {
        next.message = `Not enough SISU to buy Recruitment Level Up (${cost}).`;
        return next;
      }
      next.sisu.current -= cost;
      next.recruitLevelBonus += 1;
      next.recruitLevelUpCount += 1;
      next.message = `Recruitment leveled up. Future rerolls now favor stronger starting levels.`;
      return next;
    }
    case 'recruitOffer': {
      if (!canAccessRecruitment(next)) return next;
      clearLegacyRecruitPanelState(next);
      const destination: RecruitDestination = action.destination ?? 'reserve';
      const offerIndex = next.recruitOffers.findIndex((entry) => entry?.offerId === action.offerId);
      if (offerIndex < 0) return next;
      const offer = next.recruitOffers[offerIndex];
      if (!offer) return next;
      const boardIsFull = boardDefenders(next).length >= boardCap(next, content);
      const currentPendingReadyRecruit = pendingReadyRecruit(next);
      const saunaDefender = getDefender(next, next.saunaDefenderId);
      if (destination === 'sauna') {
        if (saunaDefender && saunaDefender.location === 'sauna' && !hasSelectedSaunaReplacement(next)) {
          next.message = 'Select the sauna first if you want to replace the current sauna reserve.';
          return next;
        }
        if (!saunaDefender && livingDefenders(next).length >= rosterCap(next, content)) {
          next.message = 'Roster is full. Free space or select a replacement before hiring straight to the sauna.';
          return next;
        }
      } else if (currentPendingReadyRecruit && !boardIsFull) {
        next.message = `Place or sauna ${currentPendingReadyRecruit.name} first before recruiting another hero.`;
        return next;
      }
      if (next.sisu.current < offer.price) {
        next.message = `Not enough SISU for ${offer.candidate.name}.`;
        return next;
      }
      next.sisu.current -= offer.price;
      if (destination === 'sauna') {
        if (saunaDefender && saunaDefender.location === 'sauna') {
          replaceDefenderWithRecruit(next, saunaDefender, offer.candidate, content);
          next.selectedMapTarget = 'sauna';
          next.selectedDefenderId = null;
          next.selectedEnemyInstanceId = null;
          next.message = `${offer.candidate.name} ${offer.candidate.title} replaced ${saunaDefender.name} in the sauna for ${offer.price} SISU.`;
        } else {
          fillDefenderToMax(next, offer.candidate, content);
          next.defenders.push(offer.candidate);
          moveRecruitToSauna(next, offer.candidate);
          next.selectedMapTarget = 'sauna';
          next.selectedDefenderId = null;
          next.selectedEnemyInstanceId = null;
          next.message = `${offer.candidate.name} ${offer.candidate.title} took the sauna reserve for ${offer.price} SISU.`;
        }
      } else if (boardIsFull) {
        if (saunaDefender && saunaDefender.location === 'sauna') {
          replaceDefenderWithRecruit(next, saunaDefender, offer.candidate, content);
          next.selectedMapTarget = 'sauna';
          next.selectedDefenderId = null;
          next.selectedEnemyInstanceId = null;
          next.message = `${offer.candidate.name} ${offer.candidate.title} replaced ${saunaDefender.name} in the sauna for ${offer.price} SISU.`;
        } else {
          addRecruitToReserve(next, offer.candidate, content);
          next.message = `${offer.candidate.name} ${offer.candidate.title} took the empty sauna slot for ${offer.price} SISU.`;
        }
      } else {
        addRecruitToReserve(next, offer.candidate, content);
        next.selectedMapTarget = 'defender';
        next.selectedDefenderId = offer.candidate.id;
        next.selectedEnemyInstanceId = null;
        next.message = offer.price === 0
          ? `${offer.candidate.name} ${offer.candidate.title} joined for free. Click a build hex to place them.`
          : `${offer.candidate.name} ${offer.candidate.title} is ready to place for ${offer.price} SISU.`;
      }
      next.recruitOffers[offerIndex] = null;
      return next;
    }
    case 'clearRecruitOffers':
      if (!canAccessRecruitment(next)) return next;
      clearLegacyRecruitPanelState(next);
      next.recruitOffers = Array.from({ length: RECRUIT_MARKET_SLOT_COUNT }, () => null);
      next.recruitMarketIsFree = false;
      clearActiveHudPanel(next);
      next.message = 'Recruit offers dismissed.';
      return next;
    case 'equipInventoryDrop': {
      const defender = getDefender(next, action.defenderId);
      const drop = getInventoryDrop(next, action.dropId);
      if (!drop || !defender || defender.location === 'dead') return next;
      if (drop.kind === 'item') {
        if (defender.items.length >= itemSlotCap(next, content)) {
          next.message = `${defender.name} has no free item slot.`;
          return next;
        }
      } else {
        if (defender.skills.length >= skillSlotCap()) {
          next.message = `${defender.name} already knows a skill.`;
          return next;
        }
      }
      equipDropOnDefender(next, drop, defender, content);
      next.message = `${drop.name} equipped on ${defender.name}.`;
      return next;
    }
    case 'autoAssignInventoryDrop': {
      const drop = getInventoryDrop(next, action.dropId);
      if (!drop) return next;
      const target = findAutoAssignTarget(next, drop, content);
      if (!target) {
        next.message = `No free ${drop.kind} slot for ${drop.name}.`;
        return next;
      }
      equipDropOnDefender(next, drop, target, content);
      next.message = `${drop.name} auto-assigned to ${target.name}.`;
      return next;
    }
    case 'toggleAutoAssign':
      if (!hasLootAutoAssign(next)) return next;
      next.autoAssignEnabled = !next.autoAssignEnabled;
      next.message = next.autoAssignEnabled ? 'Loot auto assign enabled.' : 'Loot auto assign disabled.';
      return next;
    case 'toggleAutoUpgrade':
      if (!hasLootAutoUpgrade(next)) return next;
      next.autoUpgradeEnabled = !next.autoUpgradeEnabled;
      next.message = next.autoUpgradeEnabled ? 'Loot auto upgrade enabled.' : 'Loot auto upgrade disabled.';
      return next;
    case 'sellInventoryDrop': {
      const drop = getInventoryDrop(next, action.dropId);
      if (!drop) return next;
      const sold = removeLootDrop(next, action.dropId);
      if (!sold) return next;
      const price = sellPriceForRarity(sold.rarity);
      next.steamEarned += price;
      next.message = `Sold ${sold.name} for ${price} Steam.`;
      return next;
    }
    case 'destroyEquippedItem': {
      const defender = getDefender(next, action.defenderId);
      if (!defender || defender.location === 'dead') return next;
      if (!destroyEquippedItem(next, defender, action.itemId, content)) return next;
      next.message = `${content.itemDefinitions[action.itemId].name} was destroyed.`;
      return next;
    }
    case 'destroyEquippedSkill': {
      const defender = getDefender(next, action.defenderId);
      if (!defender || defender.location === 'dead') return next;
      if (!destroyEquippedSkill(defender, action.skillId)) return next;
      next.message = `${content.skillDefinitions[action.skillId].name} was forgotten in the steam.`;
      return next;
    }
    case 'dismissRecentDrop':
      next.recentDropId = null;
      return next;
    case 'buyMetaUpgrade': {
      if (next.overlayMode !== 'intermission') return next;
      if (!next.meta.shopUnlocked) return next;
      if (next.phase === 'lost') {
        awardMeta(next);
      }
      if (action.upgradeId === 'beer_shop_level' && !beerShopUnlocked(next)) {
        next.message = 'Open the Beer Shop first.';
        return next;
      }
      const cost = metaCost(next, action.upgradeId, content);
      if (cost === null || next.meta.steam < cost) return next;
      next.meta.steam -= cost;
      next.meta.upgrades[action.upgradeId] += 1;
      if (action.upgradeId === 'beer_shop_unlock') {
        rollBeerShopOffersIntoState(next, content);
      }
      if (action.upgradeId === 'beer_shop_level') {
        rollBeerShopOffersIntoState(next, content);
      }
      next.message = `${content.metaUpgrades[action.upgradeId].name} purchased.`;
      return next;
    }
    case 'setActiveNameMastery': {
      if (next.overlayMode !== 'intermission' || !hallOfFameUnlocked(next)) return next;
      const definition = content.nameMasteries[action.masteryId];
      if (!definition || nameMasteryLevel(next, action.masteryId) <= 0) return next;
      if (definition.category === 'title') {
        next.meta.activeHallOfFameTitleId = action.masteryId as TitleMasteryId;
      } else {
        next.meta.activeHallOfFameNameId = action.masteryId as SurnameMasteryId;
      }
      next.message = `${definition.name} mastery is now active.`;
      return next;
    }
    case 'buyNameMasteryRank': {
      if (next.overlayMode !== 'intermission' || !hallOfFameUnlocked(next)) return next;
      if (next.phase === 'lost') {
        awardMeta(next);
      }
      const definition = content.nameMasteries[action.masteryId];
      if (!definition) return next;
      const cost = nameMasteryCost(next, action.masteryId, content);
      if (next.meta.steam < cost) {
        next.message = `Not enough Steam for ${definition.name} mastery.`;
        return next;
      }
      next.meta.steam -= cost;
      if (definition.category === 'title') {
        const masteryId = action.masteryId as TitleMasteryId;
        next.meta.hallOfFameTitleLevels[masteryId] += 1;
        next.meta.activeHallOfFameTitleId ??= masteryId;
      } else {
        const masteryId = action.masteryId as SurnameMasteryId;
        next.meta.hallOfFameNameLevels[masteryId] += 1;
        next.meta.activeHallOfFameNameId ??= masteryId;
      }
      next.message = `${definition.name} mastery advanced to rank ${nameMasteryLevel(next, action.masteryId)}.`;
      return next;
    }
    case 'buyBeerShopOffer': {
      if (!beerShopUnlocked(next)) return next;
      const offer = next.beerShopOffers.find((entry) => entry.offerId === action.offerId);
      if (!offer) return next;
      const definition = content.alcoholDefinitions[offer.alcoholId];
      if (next.sisu.current < definition.price) {
        next.message = `Not enough SISU for ${definition.name}.`;
        return next;
      }
      const existing = activeAlcoholEntry(next, offer.alcoholId);
      if (!existing && next.activeAlcohols.length >= beerActiveSlotCapForTier(beerShopTier(next))) {
        next.message = 'No free drink slot. Dump an active drink first or stack one you already have.';
        return next;
      }
      next.sisu.current -= definition.price;
      if (existing) {
        existing.stacks += 1;
        next.message = `${definition.name} was poured again. The upside grows, and the downside doubles.`;
      } else {
        next.activeAlcohols.push({ alcoholId: offer.alcoholId, stacks: 1 });
        next.message = `${definition.name} is now active for the next run.`;
      }
      maybeTriggerBeerShopSpeech(next, content, definition);
      return next;
    }
    case 'removeActiveAlcohol': {
      if (!beerShopUnlocked(next)) return next;
      const index = next.activeAlcohols.findIndex((entry) => entry.alcoholId === action.alcoholId);
      if (index < 0) return next;
      const [removed] = next.activeAlcohols.splice(index, 1);
      next.message = `${content.alcoholDefinitions[removed.alcoholId].name} was dumped out with no refund.`;
      return next;
    }
    case 'unlockMetaShop': {
      if (next.overlayMode !== 'intermission' || next.meta.shopUnlocked) return next;
      if (next.meta.steam < content.config.metaShopUnlockCost) {
        next.message = `Not enough Steam to open the ${META_SHOP_LABEL} yet.`;
        return next;
      }
      next.meta.steam -= content.config.metaShopUnlockCost;
      next.meta.shopUnlocked = true;
      next.message = `The ${META_SHOP_LABEL} shutters creak open for future runs.`;
      return next;
    }
    case 'toggleAutoplay':
      next.autoplayEnabled = !next.autoplayEnabled;
      if (next.autoplayEnabled) {
        scheduleAutoplay(next);
      }
      next.message = next.autoplayEnabled ? 'Autoplay enabled.' : 'Autoplay disabled.';
      return next;
    default:
      return next;
  }
}

export function stepState(state: RunState, deltaMs: number, content: GameContent): RunState {
  if (deltaMs <= 0) return state;
  if (state.introOpen) return state;
  if (state.phase === 'prep' && state.overlayMode === 'none') {
    const next = clone(state);
    next.timeMs += deltaMs;
    next.waveElapsedMs += deltaMs;
    tickSpeechBubbles(next, deltaMs);
    clearExpiredMotions(next);
    maybeStartAutoplayWave(next, content);
    return next;
  }
  if (state.overlayMode !== 'none' || state.phase !== 'wave') {
    if (state.speechBubbles.length === 0) return state;
    const next = clone(state);
    tickSpeechBubbles(next, deltaMs);
    return next;
  }
  const next = clone(state);
  ageFx(next, deltaMs);
  tickSpeechBubbles(next, deltaMs);
  if (next.hitStopMs > 0) {
    next.hitStopMs = Math.max(0, next.hitStopMs - deltaMs);
    return next;
  }
  next.timeMs += deltaMs;
  next.waveElapsedMs += deltaMs;
  clearExpiredMotions(next);
  while (next.timeMs >= next.nextRegenTickAtMs) {
    applyGlobalRegenTick(next, content);
    next.nextRegenTickAtMs += 1000;
  }
  syncEnemyWaveScalingForState(next, content);
  spawnEnemies(next, content);
  triggerBossIntroSpeech(next, content);
  maybeTriggerEndUserHordeSurge(next, content);
  resolvePendingFireballs(next);
  resolvePendingSaunaQuakes(next);
  resolvePendingEmberStormStrikes(next);
  resolveBoilingOrbits(next);
  for (const defender of boardDefenders(next)) defenderAttack(next, defender, content);
  for (const enemy of next.enemies) enemyStep(next, enemy, content);
  resolveEnemyDeaths(next, content);
  resolveDefenderDeaths(next, content);
  normalizeLivingDefenders(next, content);
  if (next.saunaHp <= 0) {
    next.saunaHp = 0;
    next.phase = 'lost';
    next.overlayMode = 'intermission';
    setActiveHudPanel(next, 'metashop', 'metashop');
    next.activeAlcohols = [];
    next.pendingFireballs = [];
    next.pendingSaunaQuakes = [];
    next.pendingEmberStormStrikes = [];
    next.activeBoilingOrbits = [];
    clearPebbleEncounterTargets(next);
    awardMeta(next);
    rollBeerShopOffersIntoState(next, content);
    next.message = 'The sauna went cold. Spend Steam, regroup, and prep the next shift.';
    return next;
  }
  if (next.pendingSpawns.length === 0 && next.enemies.length === 0) {
    awardWave(next, content);
  }
  if (next.overlayMode === 'none') {
    activateNextSubclassDraft(next, content);
  }
  return next;
}

export function createSnapshot(state: RunState, content: GameContent): GameSnapshot {
  const footprint = currentBoardFootprint(state, content);
  const gridRadius = footprint.boundingRadius;
  const buildRadius = footprint.buildRadius;
  const spawnTiles = footprint.spawnTiles;
  const tiles = footprint.tiles;
  const buildableTiles = footprint.buildableTiles;
  const selected = getDefender(state, state.selectedDefenderId);
  const selectedEnemy = getEnemy(state, state.selectedEnemyInstanceId);
  const selectedLoot = getInventoryDrop(state, state.selectedInventoryDropId);
  const currentWave = state.currentWave;
  const activeMs = Math.max(0, state.sisu.activeUntilMs - state.timeMs);
  const cdMs = Math.max(0, state.sisu.cooldownUntilMs - state.timeMs);
  const saunaDefender = getDefender(state, state.saunaDefenderId);
  const action = actionCopy(state, content);
  const boardCount = boardDefenders(state).length;
  const freeRecruitSlots = state.recruitOffers.filter((offer) => offer !== null).length;
  const beerTier = beerShopTier(state);
  const selectedBoardDefender = selected && selected.location === 'board' ? selected : null;
  const selectedBoardSaunaCommandLabel = selectedBoardDefender ? saunaCommandLabel(state, selectedBoardDefender) : null;
  const saunaReserve = createSaunaReserveEntry(
    state,
    saunaDefender,
    selectedBoardDefender,
    content,
    hudSelectorDeps
  );
  saunaReserve.canSendSelectedBoardHero = selectedBoardDefender ? canCommandDefenderToSauna(state, selectedBoardDefender) : false;
  saunaReserve.sendSelectedBoardHeroLabel = selectedBoardSaunaCommandLabel;
  const activeGlobalModifiers = uniqueGlobalModifierIds(state.activeGlobalModifierIds)
    .map((modifierId) => globalModifierHudEntry(state, content.globalModifierDefinitions[modifierId], content));
  const globalModifierSummary = globalModifierSummaryEntries(state, content);
  const draftGlobalModifiers = state.globalModifierDraftOffers
    .map((modifierId) => globalModifierDraftHudEntry(state, content.globalModifierDefinitions[modifierId], content));
  const activePanel = state.activePanel === 'recruit' ? null : state.activePanel;
  const worldLandmarks = WORLD_LANDMARK_IDS
    .map((landmarkId) => hudWorldLandmarkEntry(state, landmarkId, content))
    .filter((entry) => entry.visible);
  const showPebbleBossStatus = state.phase === 'wave' && isPebbleBossWave(currentWave);
  const showEndUserHordeBossStatus = state.phase === 'wave' && isEndUserHordeBossWave(currentWave);
  const hud: HudViewModel = {
    phaseLabel:
      state.overlayMode === 'intermission'
        ? 'Intermission'
        : state.overlayMode === 'paused'
          ? 'Paused'
          : state.overlayMode === 'subclass_draft'
            ? 'Subclass Draft'
          : state.overlayMode === 'modifier_draft'
            ? 'Boss Reward'
          : state.phase === 'prep'
            ? 'Preparation'
            : state.phase === 'wave'
              ? 'Wave Live'
              : 'Run Over',
    statusText: state.message,
    overlayMode: state.overlayMode,
    activePanel,
    isPaused: state.overlayMode === 'paused',
    showIntermission: state.overlayMode === 'intermission',
    introOpen: state.introOpen,
    autoplayEnabled: state.autoplayEnabled,
    canAutoplay: canStartWaveNow(state) && activePanel === null && !state.introOpen,
    waveNumber: currentWave.index,
    enemiesRemaining: state.pendingSpawns.length + state.enemies.length,
    isBossWave: currentWave.isBoss,
    bossName: bossDisplayName(currentWave.bossId),
    bossHint: bossHint(currentWave.bossId),
    bossMomentumLabel: showEndUserHordeBossStatus ? `${state.endUserHordeMomentum}/${END_USER_HORDE_MAX_MOMENTUM}` : null,
    bossMomentumTierLabel: showEndUserHordeBossStatus ? endUserHordeTierLabel(state.endUserHordeTier) : null,
    pebbleBottleStacksLabel: showPebbleBossStatus ? `${state.pebbleBottleStacks}` : null,
    pebbleBottlesRemainingLabel: showPebbleBossStatus ? `${activePebbleBottleTargets(state).length}/${PEBBLE_BOTTLE_TARGET_COUNT}` : null,
    nextWaveThreat: `${pressureLabel(currentWave.pressure)} pressure`,
    nextWavePattern: patternLabel(currentWave),
    pressureSignals: pressureSignals(state, content),
    boardCount,
    boardCap: boardCap(state, content),
    placedBoardLabel: `${boardCount}/${boardCap(state, content)} heroes placed`,
    rosterCount: livingDefenders(state).length,
    rosterCap: rosterCap(state, content),
    inventoryUnlocked: inventoryUnlocked(state),
    inventoryCount: state.inventory.length,
    inventoryCap: inventoryCap(state, content),
    inventoryOpen: inventoryUnlocked(state) ? state.inventoryOpen : false,
    hasRecentLoot: state.recentDropId !== null,
    autoAssignUnlocked: hasLootAutoAssign(state),
    autoAssignEnabled: state.autoAssignEnabled && hasLootAutoAssign(state),
    autoUpgradeUnlocked: hasLootAutoUpgrade(state),
    autoUpgradeEnabled: state.autoUpgradeEnabled && hasLootAutoUpgrade(state),
    saunaOccupantName: saunaDefender?.name ?? null,
    saunaOccupancyLabel: `${saunaOccupancy(state)}/${content.config.saunaCap}`,
    saunaSelected: state.selectedMapTarget === 'sauna',
    saunaHp: state.saunaHp,
    maxSaunaHp: content.config.saunaHp,
    sisu: state.sisu.current,
    canUseSisu: state.overlayMode === 'none' && canUseSisu(state, content),
    sisuLabel: activeMs > 0 ? `SISU active ${Math.ceil(activeMs / 1000)} s` : cdMs > 0 ? `SISU cooldown ${Math.ceil(cdMs / 1000)} s` : `SISU ready (${content.config.sisuAbilityCost})`,
    canPause: state.phase === 'wave',
    recruitmentStatusText: recruitmentStatusText(state, content),
    recruitRollCost: recruitRollCost(),
    recruitLevelBonus: state.recruitLevelBonus,
    recruitLevelUpCost: recruitLevelUpCost(state.recruitLevelUpCount),
    recruitLevelOdds: recruitLevelOdds(state.recruitLevelBonus),
    canRollRecruitOffers: canRollRecruitOffers(state),
    canLevelUpRecruitment: canAccessRecruitment(state) && state.sisu.current >= recruitLevelUpCost(state.recruitLevelUpCount),
    hasRecruitOffers: state.recruitOffers.some((offer) => offer !== null),
    recruitOffers: state.recruitOffers.map((offer, slotIndex) => {
      if (!offer) {
        return {
          slotIndex,
          id: null,
          price: null,
          quality: null,
          name: null,
          title: null,
          roleName: null,
          subclassName: null,
          roleSummary: null,
          lore: null,
          level: null,
          hp: null,
          damage: null,
          heal: null,
          range: null,
          empty: true,
          isFree: false,
          canBuy: false,
          hotkeyKey: RECRUIT_SLOT_HOTKEYS[slotIndex] ?? null,
          canHireToSauna: false,
          hireToSaunaLabel: 'Hire To Sauna'
        };
      }
      const roleStats = derivedStats(state, offer.candidate, content, false);
      return {
        slotIndex,
        id: offer.offerId,
        price: offer.price,
        quality: offer.quality,
        name: offer.candidate.name,
        title: offer.candidate.title,
        roleName: content.defenderTemplates[offer.candidate.templateId].name,
        subclassName: subclassSummary(offer.candidate, content),
        roleSummary: content.defenderTemplates[offer.candidate.templateId].role,
        lore: offer.candidate.lore,
        level: offer.candidate.level,
        hp: roleStats.maxHp,
        damage: roleStats.damage,
        heal: roleStats.heal,
        range: roleStats.range,
        empty: false,
        isFree: offer.price === 0,
        canBuy: canAccessRecruitment(state) && (!pendingReadyRecruit(state) || boardCount >= boardCap(state, content)) && state.sisu.current >= offer.price,
        hotkeyKey: RECRUIT_SLOT_HOTKEYS[slotIndex] ?? null,
        canHireToSauna: canHireRecruitToSauna(state, offer, content),
        hireToSaunaLabel: hireRecruitToSaunaLabel(state, offer, content)
      };
    }),
    steamEarned: state.steamEarned,
    bankedSteam: state.meta.steam,
    metaShopUnlockCost: content.config.metaShopUnlockCost,
    canUnlockMetaShop: state.meta.steam >= content.config.metaShopUnlockCost && !state.meta.shopUnlocked,
    metaShopUnlocked: state.meta.shopUnlocked,
    beerShopUnlocked: beerShopUnlocked(state),
    beerShopLevel: beerTier,
    beerOfferCount: beerOfferCountForTier(beerTier),
    beerActiveSlotCount: state.activeAlcohols.length,
    beerActiveSlotCap: beerActiveSlotCapForTier(beerTier),
    beerShopOffers: state.beerShopOffers.map((offer) => {
      const definition = content.alcoholDefinitions[offer.alcoholId];
      return {
        id: offer.offerId,
        alcoholId: offer.alcoholId,
        name: definition.name,
        flavorText: definition.flavorText,
        price: definition.price,
        artPath: definition.artPath,
        positiveEffectText: formatAlcoholModifier(definition.positive, 'positive'),
        negativeEffectText: formatAlcoholModifier(definition.negative, 'negative'),
        canBuy: canBuyBeerOffer(state, offer, content),
        purchaseLabel: activeAlcoholEntry(state, offer.alcoholId)
          ? `Stack Drink (${definition.price} SISU)`
          : `Buy Drink (${definition.price} SISU)`
      };
    }),
    activeAlcohols: state.activeAlcohols.map((active) => {
      const definition = content.alcoholDefinitions[active.alcoholId];
      return {
        alcoholId: active.alcoholId,
        name: definition.name,
        flavorText: definition.flavorText,
        artPath: definition.artPath,
        stacks: active.stacks,
        positiveEffectText: formatAlcoholModifier(scaledPositiveAlcoholModifier(definition, active.stacks), 'positive'),
        negativeEffectText: formatAlcoholModifier(scaledNegativeAlcoholModifier(definition, active.stacks), 'negative')
      };
    }),
    actionTitle: action.title,
    actionBody: action.body,
    freeRecruitSlots,
    saunaReserve,
    deathLogEntries: state.deathLog.slice(0, 5).map((entry) => ({
      id: entry.id,
      wave: entry.wave,
      heroName: entry.heroName,
      enemyName: entry.enemyName,
      text: entry.text
    })),
    headerItemEntries: state.headerItems.map((drop) => ({
      id: drop.instanceId,
      kind: drop.kind,
      name: drop.name,
      rarity: drop.rarity,
      sellPrice: sellPriceForRarity(drop.rarity),
      effectText: drop.effectText,
      flavorText: drop.flavorText,
      artPath: drop.artPath,
      waveFound: drop.waveFound,
      isRecent: drop.instanceId === state.recentDropId,
      selected: drop.instanceId === state.selectedInventoryDropId
    })),
    headerSkillEntries: state.headerSkills.map((drop) => ({
      id: drop.instanceId,
      kind: drop.kind,
      name: drop.name,
      rarity: drop.rarity,
      sellPrice: sellPriceForRarity(drop.rarity),
      effectText: drop.effectText,
      flavorText: drop.flavorText,
      artPath: drop.artPath,
      waveFound: drop.waveFound,
      isRecent: drop.instanceId === state.recentDropId,
      selected: drop.instanceId === state.selectedInventoryDropId
    })),
    inventoryEntries: state.inventory.map((drop) => ({
      id: drop.instanceId,
      kind: drop.kind,
      name: drop.name,
      rarity: drop.rarity,
      sellPrice: sellPriceForRarity(drop.rarity),
      effectText: drop.effectText,
      flavorText: drop.flavorText,
      artPath: drop.artPath,
      waveFound: drop.waveFound,
      isRecent: drop.instanceId === state.recentDropId,
      selected: drop.instanceId === state.selectedInventoryDropId
    })),
      selectedInventoryEntry: selectedLoot ? {
        id: selectedLoot.instanceId,
        kind: selectedLoot.kind,
        name: selectedLoot.name,
        rarity: selectedLoot.rarity,
        sellPrice: sellPriceForRarity(selectedLoot.rarity),
        effectText: selectedLoot.effectText,
        flavorText: selectedLoot.flavorText,
        artPath: selectedLoot.artPath,
      waveFound: selectedLoot.waveFound,
      isRecent: selectedLoot.instanceId === state.recentDropId,
      selected: true
    } : null,
    canAutoAssignSelectedLoot: selectedLoot ? findAutoAssignTarget(state, selectedLoot, content) !== null : false,
    selectedDefender: selected ? (() => {
      const stats = derivedStats(state, selected, content);
      const activeOrbit = state.activeBoilingOrbits.find((orbit) => orbit.ownerDefenderId === selected.id) ?? null;
      return {
        id: selected.id,
        name: selected.name,
        title: selected.title,
        lore: selected.lore,
        templateName: content.defenderTemplates[selected.templateId].name,
        subclassName: subclassSummary(selected, content),
        subclassDescription: subclassDescription(selected, content),
        nextSubclassUnlockLevel: nextSubclassMilestoneLevel(selected, content),
        xpToNextBranch: xpToNextSubclassMilestone(selected, content),
        level: selected.level,
        xp: selected.xp,
        nextLevelXp: selected.level >= MAX_DEFENDER_LEVEL ? null : xpForLevel(selected.level + 1),
        kills: selected.kills,
        hp: selected.hp,
        maxHp: stats.maxHp,
        damage: stats.damage,
        heal: stats.heal,
        range: stats.range,
        attackCooldownMs: stats.attackCooldownMs,
        blinkLabel: selected.skills.includes('blink_step')
          ? cooldownLabel('Blink', selected.blinkReadyAtMs, state.timeMs)
          : null,
        fireballLabel: selected.skills.includes('fireball')
          ? cooldownLabel('Fireball', selected.fireballReadyAtMs, state.timeMs)
          : null,
        skillStatusLabels: [
          selected.skills.includes('thunder_run') ? cooldownLabel('Thunder Run', selected.thunderRunReadyAtMs, state.timeMs) : null,
          selected.skills.includes('boiling_orbit')
            ? activeOrbit
              ? `Boiling Orbit ${Math.max(1, Math.ceil((activeOrbit.expiresAtMs - state.timeMs) / 1000))}s`
              : cooldownLabel('Boiling Orbit', selected.boilingOrbitReadyAtMs, state.timeMs)
            : null,
          selected.skills.includes('sauna_quake') ? cooldownLabel('Sauna Quake', selected.saunaQuakeReadyAtMs, state.timeMs) : null,
          selected.skills.includes('ember_storm') ? cooldownLabel('Ember Storm', selected.emberStormReadyAtMs, state.timeMs) : null
        ].filter((label): label is string => label !== null),
        defense: stats.defense,
        regenHpPerSecond: stats.regenHpPerSecond,
        itemSlotCount: itemSlotCap(state, content),
        skillSlotCount: skillSlotCap(),
        subclasses: selectedSubclassEntries(selected, content),
        items: selected.items.map((itemId) => ({
          id: itemId,
          name: content.itemDefinitions[itemId].name
        })),
        skills: selected.skills.map((skillId) => ({
          id: skillId,
          name: content.skillDefinitions[skillId].name
        })),
        location: selected.location,
        canSaunaCommand: canCommandDefenderToSauna(state, selected),
        saunaCommandLabel: saunaCommandLabel(state, selected)
      };
    })() : null,
    selectedSauna: state.selectedMapTarget === 'sauna' ? {
      occupancyLabel: `${saunaOccupancy(state)}/${content.config.saunaCap}`,
      occupantId: saunaDefender?.id ?? null,
      occupantName: saunaDefender?.name ?? null,
      occupantTitle: saunaDefender?.title ?? null,
      occupantRole: saunaDefender ? content.defenderTemplates[saunaDefender.templateId].name : null,
      occupantSubclassName: saunaDefender ? subclassSummary(saunaDefender, content) : null,
      occupantLore: saunaDefender?.lore ?? null,
      occupantHp: saunaDefender?.hp ?? null,
      occupantMaxHp: saunaDefender ? derivedStats(state, saunaDefender, content).maxHp : null,
      autoDeployUnlocked: hasSaunaAutoDeploy(state),
      slapSwapUnlocked: hasSaunaSlapSwap(state),
      canReroll: canRerollSaunaDefender(state),
      rerollCost: saunaRerollCost(state),
      canSendSelectedBoardHero: selectedBoardDefender ? canCommandDefenderToSauna(state, selectedBoardDefender) : false,
      sendSelectedBoardHeroLabel: selectedBoardSaunaCommandLabel
    } : null,
    selectedEnemy: state.selectedMapTarget === 'enemy' && selectedEnemy ? (() => {
      const archetype = content.enemyArchetypes[selectedEnemy.archetypeId];
      const isBoss = isWaveBossEnemy(state.currentWave, selectedEnemy);
      return {
        instanceId: selectedEnemy.instanceId,
        name: archetype.name,
        description: archetype.description,
        lore: archetype.lore,
        isBoss,
        hp: selectedEnemy.hp,
        maxHp: enemyMaxHp(state, selectedEnemy, content),
        damage: enemyAttackDamage(state, selectedEnemy, content),
        range: archetype.range,
        attackCooldownMs: archetype.attackCooldownMs,
        moveCooldownMs: selectedEnemy.archetypeId === 'pebble'
          ? pebbleEffectiveMoveCooldownMs(state, selectedEnemy)
          : archetype.moveCooldownMs,
        threat: archetype.threat,
        behaviorLabel: enemyBehaviorLabel(archetype.id, archetype.behavior),
        bossLabel: selectedEnemyBossLabel(state.currentWave, selectedEnemy)
      };
    })() : null,
    globalModifiers: activeGlobalModifiers,
    globalModifierSummary,
    globalModifierDraftOffers: draftGlobalModifiers,
    showGlobalModifierDraft: state.overlayMode === 'modifier_draft',
    subclassDraftHeroName: getDefender(state, state.subclassDraftDefenderId)?.name ?? null,
    subclassDraftHeroTitle: getDefender(state, state.subclassDraftDefenderId)?.title ?? null,
    subclassDraftHeroLevel: getDefender(state, state.subclassDraftDefenderId)?.level ?? null,
    subclassDraftOffers: state.subclassDraftOfferIds.map((subclassId) => {
      const definition = content.defenderSubclasses[subclassId];
      return {
        id: definition.id,
        name: definition.name,
        description: definition.description,
        unlockLevel: definition.unlockLevel,
        effectText: definition.effectText,
        statText: definition.statText
      };
    }),
    showSubclassDraft: state.overlayMode === 'subclass_draft',
    wavePreview: waveCounts(currentWave, content),
    metaUpgrades: META_IDS.map((upgradeId) => {
      const cost = metaCost(state, upgradeId, content);
      const blocked = upgradeId === 'beer_shop_level' && !beerShopUnlocked(state);
      return {
        id: upgradeId,
        name: content.metaUpgrades[upgradeId].name,
        description: content.metaUpgrades[upgradeId].description,
        level: state.meta.upgrades[upgradeId],
        cost,
        affordable: !blocked && cost !== null && state.meta.steam >= cost,
        maxed: cost === null,
        repeatable: isRepeatableMetaUpgrade(upgradeId),
        softcapReached: metaUpgradeSoftcapReached(state, upgradeId, content),
        nextEffectText: nextMetaUpgradeEffectText(state, upgradeId)
      };
    }),
    titleMasteries: TITLE_MASTERY_IDS.map((masteryId) => hudNameMasteryEntry(state, masteryId, content)),
    nameMasteries: SURNAME_MASTERY_IDS.map((masteryId) => hudNameMasteryEntry(state, masteryId, content)),
    worldLandmarks
  };
  return {
    state,
    config: {
      ...content.config,
      gridRadius,
      buildRadius,
      spawnLanes: spawnTiles
    },
    defenderTemplates: content.defenderTemplates,
    enemyArchetypes: content.enemyArchetypes,
    itemDefinitions: content.itemDefinitions,
    skillDefinitions: content.skillDefinitions,
    alcoholDefinitions: content.alcoholDefinitions,
    globalModifierDefinitions: content.globalModifierDefinitions,
    metaUpgrades: content.metaUpgrades,
    nameMasteries: content.nameMasteries,
    hud,
    tiles,
    buildableTiles,
    spawnTiles
  };
}
