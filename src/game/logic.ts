import type {
  ActiveAlcoholBuff,
  AlcoholDefinition,
  AlcoholId,
  AlcoholModifier,
  AxialCoord,
  BeerShopOffer,
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
  HudPanelId,
  HudViewModel,
  HudWorldLandmarkEntry,
  InputAction,
  InventoryDrop,
  ItemId,
  LootKind,
  MetaProgress,
  MetaUpgradeId,
  PendingFireball,
  Rarity,
  RecruitOffer,
  RunPreferences,
  RunState,
  SkillId,
  SubclassDraftRequest,
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
  currentBuildRadius as resolveCurrentBuildRadius,
  currentGridRadius as resolveCurrentGridRadius,
  currentSpawnLanes as resolveCurrentSpawnLanes,
  landmarkTileForWave as resolveLandmarkTileForWave
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
  rerollSaunaDefenderIdentityAndClass as rerollSaunaDefenderIdentityAndClassFromModule
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
  'beer_shop_unlock',
  'beer_shop_level',
  'sauna_auto_deploy',
  'sauna_slap_swap'
];
const CENTER: AxialCoord = { q: 0, r: 0 };
const WORLD_LANDMARK_IDS: WorldLandmarkId[] = ['metashop', 'beer_shop'];
const RECRUIT_MARKET_SLOT_COUNT = 4;
const RECRUIT_SLOT_HOTKEYS = ['A', 'S', 'D', 'F'] as const;
const BLINK_STEP_COOLDOWN_MS = 12000;
const BATTLE_HYMN_COOLDOWN_MS = 15000;
const BATTLE_HYMN_BUFF_MS = 3000;
const FIREBALL_COOLDOWN_MS = 12000;
const FIREBALL_DELAY_MS = 1000;
const FIREBALL_RADIUS = 2;
const AUTOPLAY_DELAY_MS = 650;
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
const STEP_MOTION_DURATION_MS = 240;
const PEBBLE_MOTION_DURATION_MS = 520;
const BLINK_MOTION_DURATION_MS = 320;
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
  pickTemplateId: (state: RunState) => pick(state, DEF_IDS),
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

function defeatedBossCountForWave(index: number, content: GameContent): number {
  return Math.max(0, Math.floor((Math.max(1, index) - 1) / content.config.bossEvery));
}

function gridRadiusForWave(index: number, content: GameContent): number {
  return content.config.gridRadius + defeatedBossCountForWave(index, content);
}

function currentGridRadius(state: RunState, content: GameContent): number {
  return resolveCurrentGridRadius(state, content);
}

function currentBuildRadius(state: RunState, content: GameContent): number {
  return resolveCurrentBuildRadius(state, content);
}

function perimeterTiles(radius: number): AxialCoord[] {
  if (radius <= 0) {
    return [{ q: 0, r: 0 }];
  }

  const tiles: AxialCoord[] = [];
  let tile = { q: 0, r: -radius };
  const edges: AxialCoord[] = [
    { q: 1, r: 0 },
    { q: 0, r: 1 },
    { q: -1, r: 1 },
    { q: -1, r: 0 },
    { q: 0, r: -1 },
    { q: 1, r: -1 }
  ];

  tiles.push({ ...tile });
  for (const edge of edges) {
    for (let step = 0; step < radius; step += 1) {
      tile = add(tile, edge);
      if (tiles.length < radius * 6) {
        tiles.push({ ...tile });
      }
    }
  }

  return tiles;
}

function spawnLanesForWave(index: number, content: GameContent): AxialCoord[] {
  const radius = gridRadiusForWave(index, content);
  const perimeter = perimeterTiles(radius);
  const laneCount = Math.min(6 + defeatedBossCountForWave(index, content) * 2, 12);
  const lanes: AxialCoord[] = [];

  for (let laneIndex = 0; laneIndex < laneCount; laneIndex += 1) {
    const sampleIndex = Math.floor((laneIndex * perimeter.length) / laneCount) % perimeter.length;
    lanes.push({ ...perimeter[sampleIndex] });
  }

  return lanes;
}

function currentSpawnLanes(state: RunState, content: GameContent): AxialCoord[] {
  return resolveCurrentSpawnLanes(state, content);
}

function landmarkTileForWave(index: number, landmarkId: WorldLandmarkId, content: GameContent): AxialCoord {
  return resolveLandmarkTileForWave(index, landmarkId, content);
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
      beer_shop_unlock: 0,
      beer_shop_level: 0,
      sauna_auto_deploy: 0,
      sauna_slap_swap: 0
    }
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
  return content.config.baseRosterCap + state.meta.upgrades.roster_capacity;
}

function boardCap(state: RunState, content: GameContent): number {
  return content.config.boardCap + state.meta.upgrades.roster_capacity;
}

function inventoryUnlocked(state: RunState): boolean {
  return state.meta.upgrades.inventory_slots > 0;
}

function inventoryCap(state: RunState, content: GameContent): number {
  if (!inventoryUnlocked(state)) return 0;
  return content.config.baseInventoryCap + Math.max(0, state.meta.upgrades.inventory_slots - 1) * 2;
}

function headerItemCap(content: GameContent): number {
  return content.config.headerItemCap;
}

function headerSkillCap(content: GameContent): number {
  return content.config.headerSkillCap;
}

function itemSlotCap(state: RunState, content: GameContent): number {
  return content.config.baseItemSlots + state.meta.upgrades.item_slots;
}

function beerShopUnlocked(state: RunState): boolean {
  return state.meta.upgrades.beer_shop_unlock > 0;
}

function beerShopTier(state: RunState): number {
  return beerShopUnlocked(state) ? 1 + state.meta.upgrades.beer_shop_level : 0;
}

function beerOfferCountForTier(tier: number): number {
  switch (tier) {
    case 4:
      return 6;
    case 3:
      return 5;
    case 2:
      return 4;
    case 1:
      return 3;
    default:
      return 0;
  }
}

function beerActiveSlotCapForTier(tier: number): number {
  switch (tier) {
    case 4:
      return 3;
    case 3:
    case 2:
      return 2;
    case 1:
      return 1;
    default:
      return 0;
  }
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

function clearActiveHudPanel(state: RunState): void {
  state.activePanel = null;
  state.inventoryOpen = false;
  state.recruitmentOpen = false;
  state.selectedWorldLandmarkId = null;
}

function setActiveHudPanel(state: RunState, panel: HudPanelId | null, landmarkId: WorldLandmarkId | null = null): void {
  state.activePanel = panel;
  state.inventoryOpen = panel === 'loot';
  state.recruitmentOpen = panel === 'recruit';
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

function enemyMaxHp(enemy: EnemyInstance, content: GameContent): number {
  return content.enemyArchetypes[enemy.archetypeId].maxHp;
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
  const attackCooldownMs = Math.max(
    360,
    base.attackCooldownMs + globalBonus.attackCooldownMs + (alcoholBonus.attackCooldownMs ?? 0) + auraBonus.attackCooldownMs
  );
  return {
    maxHp: Math.max(6, base.maxHp + globalBonus.maxHp + (alcoholBonus.maxHp ?? 0) + auraBonus.maxHp),
    damage: Math.max(1, base.damage + globalBonus.damage + (alcoholBonus.damage ?? 0) + auraBonus.damage),
    heal: Math.max(0, base.heal + globalBonus.heal + (alcoholBonus.heal ?? 0) + auraBonus.heal),
    range: Math.max(1, base.range + globalBonus.range + (alcoholBonus.range ?? 0) + auraBonus.range),
    attackCooldownMs: defender.battleHymnBuffExpiresAtMs > state.timeMs
      ? Math.max(360, Math.round((attackCooldownMs * 2) / 3))
      : attackCooldownMs,
    defense: Math.max(0, base.defense + globalBonus.defense + (alcoholBonus.defense ?? 0) + auraBonus.defense),
    regenHpPerSecond: Math.max(0, base.regenHpPerSecond + globalBonus.regenHpPerSecond + (alcoholBonus.regenHpPerSecond ?? 0) + auraBonus.regenHpPerSecond)
  };
}

function normalizeDefender(state: RunState, defender: DefenderInstance, content: GameContent): void {
  defender.battleHymnReadyAtMs ??= 0;
  defender.battleHymnBuffExpiresAtMs ??= 0;
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

function rerollSaunaDefenderIdentityAndClass(
  state: RunState,
  defender: DefenderInstance,
  content: GameContent
): void {
  rerollSaunaDefenderIdentityAndClassFromModule(state, defender, content, saunaDeps);
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
    battleHymnReadyAtMs: 0,
    battleHymnBuffExpiresAtMs: 0,
    fireballReadyAtMs: 0,
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

function spawnIntervalMs(index: number, content: GameContent, modifier = 0): number {
  const cycle = cycleNumber(index, content);
  const slot = slotInCycle(index, content);
  return Math.max(
    content.config.minSpawnIntervalMs,
    920 - cycle * content.config.spawnIntervalStepMs - slot * 32 + modifier
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

  // Non-boss waves ramp quadratically by cycle to make each 5-wave block feel noticeably tougher.
  const cycleBonus = cycle * cycle + cycle;
  return basePressure + cycleBonus;
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

function compositionForPressure(pressure: number, cycle: number, favorBrutes: number): EnemyUnitId[] {
  const result: EnemyUnitId[] = [];
  let remaining = pressure;
  let brutesLeft = Math.max(0, Math.min(1 + cycle, Math.floor((pressure - 4) / 4) + favorBrutes));

  while (remaining > 0) {
    if (remaining >= 4 && brutesLeft > 0) {
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
  const altLane = wrapLane(baseLane + 3, laneCount);
  const supportLane = wrapLane(baseLane + 2, laneCount);
  const flankLane = wrapLane(baseLane + 1, laneCount);
  const interval = spawnIntervalMs(index, content, pattern === 'surge' ? -70 : pattern === 'staggered' ? 35 : 0);
  const cycle = cycleNumber(index, content);
  const enemies =
    pattern === 'surge'
      ? compositionForPressure(pressure + 2, cycle, 0)
      : pattern === 'spearhead'
        ? compositionForPressure(pressure, cycle, 1)
        : compositionForPressure(pressure, cycle, 0);
  const spawns: WaveSpawn[] = [];
  let atMs = 0;

  enemies.forEach((enemyId, spawnIndex) => {
    let laneIndex = baseLane;
    if (pattern === 'split') {
      laneIndex = spawnIndex % 2 === 0 ? baseLane : altLane;
    } else if (pattern === 'staggered') {
      laneIndex = spawnIndex < 2 ? baseLane : spawnIndex % 2 === 0 ? supportLane : altLane;
      atMs += spawnIndex === 2 ? interval * 0.8 : 0;
    } else if (pattern === 'spearhead') {
      laneIndex = spawnIndex === 0 || enemyId === 'brute' ? baseLane : spawnIndex % 2 === 0 ? flankLane : supportLane;
    } else if (pattern === 'surge') {
      const surgeLanes = [baseLane, flankLane, altLane];
      laneIndex = surgeLanes[spawnIndex % surgeLanes.length];
    }

    pushSpawn(spawns, atMs, enemyId, laneIndex, laneCount);
    atMs += interval;
  });

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
  const lanes = [baseLane, wrapLane(baseLane + 2, laneCount), wrapLane(baseLane + 4, laneCount)];
  const spawns: WaveSpawn[] = [];
  let atMs = 0;

  for (let spawnIndex = 0; spawnIndex < 16; spawnIndex += 1) {
    pushSpawn(spawns, atMs, 'thirsty_user', lanes[spawnIndex % lanes.length], laneCount);
    atMs += spawnIndex > 0 && spawnIndex % 4 === 3 ? 360 : 220;
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

function isBuildable(tile: AxialCoord, buildRadius: number, spawnLanes: AxialCoord[]): boolean {
  const dist = hexDistance(tile, CENTER);
  return dist > 0 && dist <= buildRadius &&
    !spawnLanes.some((lane) => sameCoord(lane, tile));
}

function nearestSaunaDeployTile(state: RunState, content: GameContent, preferredTile?: AxialCoord | null): AxialCoord | null {
  const buildRadius = currentBuildRadius(state, content);
  const spawnLanes = currentSpawnLanes(state, content);
  if (preferredTile && isBuildable(preferredTile, buildRadius, spawnLanes) && !occupied(state, preferredTile)) {
    return { ...preferredTile };
  }

  const candidates = createHexGrid(currentGridRadius(state, content))
    .filter((tile) => isBuildable(tile, buildRadius, spawnLanes))
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

function landmarkEnabled(state: RunState, landmarkId: WorldLandmarkId): boolean {
  switch (landmarkId) {
    case 'metashop':
      return metashopEnabled(state);
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
        : 'Metashop opens between runs only.';
    case 'beer_shop':
      return `Bartender live with ${state.activeAlcohols.length}/${beerActiveSlotCapForTier(beerShopTier(state))} active drink slots filled.`;
    default:
      return '';
  }
}

function hudWorldLandmarkEntry(state: RunState, landmarkId: WorldLandmarkId, content: GameContent): HudWorldLandmarkEntry {
  return {
    id: landmarkId,
    label: landmarkId === 'metashop' ? 'Metashop' : 'Beer Shop',
    tile: landmarkTileForWave(state.waveIndex, landmarkId, content),
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

function pendingReadyRecruit(state: RunState): DefenderInstance | null {
  return state.defenders.find((defender) => defender.location === 'ready') ?? null;
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
  if (state.meta.steam < definition.price) return false;
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

function addHitStop(state: RunState, durationMs: number): void {
  state.hitStopMs = Math.max(state.hitStopMs, durationMs);
}

function nearestEnemy(state: RunState, tile: AxialCoord): EnemyInstance | null {
  return [...state.enemies].sort((left, right) => (hexDistance(tile, left.tile) - hexDistance(tile, right.tile)) || (left.hp - right.hp))[0] ?? null;
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
  const buildRadius = currentBuildRadius(state, content);
  const spawnLanes = currentSpawnLanes(state, content);
  const hpRatio = defender.hp / Math.max(1, derivedStats(state, defender, content).maxHp);
  if (hpRatio >= 0.5) return false;

  const canUseBlinkTile = (tile: AxialCoord | null): tile is AxialCoord => {
    if (!tile) return false;
    return isBuildable(tile, buildRadius, spawnLanes) &&
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

  const buildRadius = currentBuildRadius(state, content);
  const spawnLanes = currentSpawnLanes(state, content);
  const from = cloneCoord(defender.tile);
  const destination = createHexGrid(currentGridRadius(state, content))
    .filter((tile) => isBuildable(tile, buildRadius, spawnLanes))
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
  const buildRadius = currentBuildRadius(state, content);
  const spawnLanes = currentSpawnLanes(state, content);

  const threat = saunaThreats(state, content)
    .sort((left, right) => (hexDistance(defender.tile as AxialCoord, left.tile) - hexDistance(defender.tile as AxialCoord, right.tile)) || (left.hp - right.hp))[0];
  if (!threat) return false;

  const currentThreatDistance = hexDistance(defender.tile, threat.tile);
  const currentCenterDistance = hexDistance(defender.tile, CENTER);
  const nextTile = DIRS.map((dir) => add(defender.tile as AxialCoord, dir))
    .filter((tile) => isBuildable(tile, buildRadius, spawnLanes) && !occupied(state, tile))
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

function maybeDrop(state: RunState, enemyId: EnemyUnitId, content: GameContent): void {
  const alcoholBonus = alcoholTotals(state, content);
  const chance =
    isBossLootEnemy(enemyId)
      ? content.config.bossLootChance
      : content.config.baseLootChance + state.meta.upgrades.loot_luck * 0.06 + (alcoholBonus.lootChance ?? 0);
  if (rng(state) > chance) return;
  const rarityRoll = rng(state);
  const rarityBoost = state.meta.upgrades.loot_rarity * 0.08;
  const rarity = rarityRoll > 0.93 - rarityBoost ? 'epic' : rarityRoll > 0.62 - rarityBoost ? 'rare' : 'common';
  const kind = rng(state) < (rarity === 'epic' ? 0.5 : 0.32) ? 'skill' : 'item';
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
      }
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
  pushFx(state, kind, enemy.tile, kind === 'fireball' ? 260 : kind === 'pulse' ? 280 : 220, secondaryTile);
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
    pushFx(state, kind, target.tile, kind === 'pulse' ? 280 : 320, secondaryTile);
  }
  return restored;
}

function preferredEnemiesInRange(
  state: RunState,
  defender: DefenderInstance,
  tile: AxialCoord,
  range: number
): EnemyInstance[] {
  const enemies = state.enemies.filter((enemy) => hexDistance(tile, enemy.tile) <= range);
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

  if (hasSubclass(defender, 'last_ladle') && primaryTarget.hp > 0 && primaryTarget.hp / Math.max(1, enemyMaxHp(primaryTarget, content)) < 0.5) {
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
      pushFx(state, 'pulse', ally.tile, 260, defender.tile);
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
  if (hasSubclass(defender, 'white_heat_gunner') && target.hp / Math.max(1, enemyMaxHp(target, content)) <= 0.4) {
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

  if (defender.skills.includes('fireball') && state.timeMs >= defender.fireballReadyAtMs) {
    scheduleFireball(state, defender, target.tile, hitDamage);
  }
  if (defender.skills.includes('chain_spark')) {
    const chainedTarget = state.enemies
      .filter((enemy) => enemy.instanceId !== target.instanceId)
      .filter((enemy) => hexDistance(enemy.tile, target.tile) <= 2)
      .sort((left, right) => (left.hp - right.hp) || (hexDistance(left.tile, target.tile) - hexDistance(right.tile, target.tile)))[0];
    if (chainedTarget) {
      applyDamageToEnemy(state, chainedTarget, Math.max(1, Math.round(stats.damage * 0.42)), defender.id);
      pushFx(state, 'chain', chainedTarget.tile, 220, target.tile);
    }
  }
  if (defender.skills.includes('steam_shield')) {
    defender.hp = Math.min(stats.maxHp, defender.hp + 3);
    pushFx(state, 'heal', defender.tile, 220);
  }
  triggerBattleHymn(state, defender);
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
  return PEBBLE_PATH_BASE.map((coord) => rotateCoord(coord, laneIndex));
}

function swarmDamageBonus(state: RunState): number {
  return Math.min(5, state.enemies.filter((enemy) => enemy.archetypeId === 'thirsty_user').length);
}

function enemyAttackDamage(state: RunState, enemy: EnemyInstance, content: GameContent): number {
  const archetype = content.enemyArchetypes[enemy.archetypeId];
  if (archetype.behavior === 'swarm') {
    return archetype.damage + swarmDamageBonus(state);
  }
  return archetype.damage;
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
): void {
  const defense = derivedStats(state, target, content).defense;
  target.hp -= Math.max(1, baseDamage - defense);
  target.lastHitByEnemyId = enemy.archetypeId;
  if (target.tile) {
    pushFx(state, enemyImpactFxKind(enemy), target.tile, isBossThreat(enemy) ? 240 : 190, enemy.tile);
  }
  applySubclassRetaliationEffects(state, enemy, target, content);
  maybeSaunaSlapSwap(state, target, content);
  if (isBossThreat(enemy)) {
    addHitStop(state, 32);
  }
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
    .filter((next) => hexDistance(next, CENTER) <= currentGridRadius(state, content))
    .filter((next) => !occupied(state, next))
    .sort((left, right) => (hexDistance(left, CENTER) - hexDistance(right, CENTER)) || (left.r - right.r) || (left.q - right.q))[0];
  if (!tile) return false;
  moveEnemyToTile(state, enemy, tile, 'step', STEP_MOTION_DURATION_MS);
  enemy.moveReadyAtMs = state.timeMs + content.enemyArchetypes[enemy.archetypeId].moveCooldownMs;
  return true;
}

function stepStandardEnemy(state: RunState, enemy: EnemyInstance, content: GameContent): void {
  const archetype = content.enemyArchetypes[enemy.archetypeId];
  if (state.timeMs >= enemy.attackReadyAtMs) {
    const target = enemyTarget(state, enemy, content);
    if (target === 'sauna') {
      applyEnemyDamageToSauna(state, enemy, enemyAttackDamage(state, enemy, content));
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

function stepPebble(state: RunState, enemy: EnemyInstance, content: GameContent): void {
  const archetype = content.enemyArchetypes[enemy.archetypeId];
  if (state.timeMs >= enemy.attackReadyAtMs && hexDistance(enemy.tile, CENTER) <= archetype.range) {
    applyEnemyDamageToSauna(state, enemy, archetype.damage);
    enemy.attackReadyAtMs = state.timeMs + archetype.attackCooldownMs;
    return;
  }
  if (state.timeMs < enemy.moveReadyAtMs) return;
  const path = pebblePathForLane(enemy.spawnLaneIndex ?? 0);
  const nextPathIndex = (enemy.pathIndex ?? 0) + 1;
  const nextTile = path[nextPathIndex] ?? null;
  if (!nextTile) return;
  if (occupied(state, nextTile)) {
    enemy.moveReadyAtMs = state.timeMs + archetype.moveCooldownMs;
    return;
  }
  moveEnemyToTile(state, enemy, nextTile, 'slither', PEBBLE_MOTION_DURATION_MS);
  enemy.pathIndex = nextPathIndex;
  enemy.moveReadyAtMs = state.timeMs + archetype.moveCooldownMs;
}

function stepElectricBather(state: RunState, enemy: EnemyInstance, content: GameContent): void {
  const archetype = content.enemyArchetypes[enemy.archetypeId];
  if (state.timeMs >= (enemy.nextAbilityAtMs ?? Number.POSITIVE_INFINITY)) {
    const targets = boardDefenders(state)
      .filter((defender) => defender.tile && hexDistance(enemy.tile, defender.tile) <= archetype.range)
      .sort((left, right) => (hexDistance(enemy.tile, left.tile as AxialCoord) - hexDistance(enemy.tile, right.tile as AxialCoord)) || (left.hp - right.hp));

    if (targets.length === 0) {
      applyEnemyDamageToSauna(state, enemy, Math.max(3, Math.round(archetype.damage * 0.6)));
    } else {
      const [primary, ...rest] = targets;
      applyEnemyDamageToDefender(state, enemy, primary, archetype.damage + 2, content);
      const chained = rest
        .filter((candidate) => candidate.tile && primary.tile && hexDistance(candidate.tile, primary.tile) <= 2)
        .slice(0, 2);
      for (const chainedTarget of chained) {
        applyEnemyDamageToDefender(state, enemy, chainedTarget, Math.max(2, Math.round(archetype.damage * 0.72)), content);
        if (chainedTarget.tile && primary.tile) {
          pushFx(state, 'chain', chainedTarget.tile, 260, primary.tile);
        }
      }
    }

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
    enemy.nextAbilityAtMs = state.timeMs + ESCALATION_MANAGER_ABILITY_COOLDOWN_MS;
  }

  stepStandardEnemy(state, enemy, content);
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
      hp: archetype.maxHp,
      lastHitByDefenderId: null,
      attackReadyAtMs: state.timeMs + archetype.attackCooldownMs,
      moveReadyAtMs: state.timeMs + archetype.moveCooldownMs,
      nextAbilityAtMs:
        archetype.behavior === 'electric'
          ? state.timeMs + ELECTRIC_BATHER_ABILITY_COOLDOWN_MS
          : archetype.behavior === 'summoner'
            ? state.timeMs + ESCALATION_MANAGER_ABILITY_COOLDOWN_MS
            : Number.POSITIVE_INFINITY,
      pathIndex: archetype.behavior === 'pebble' ? 0 : null,
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

function startWaveState(state: RunState, waveDef: WaveDefinition, message: string): void {
  state.overlayMode = 'none';
  state.phase = 'wave';
  state.waveElapsedMs = 0;
  state.hitStopMs = 0;
  state.fxEvents = [];
  state.pendingFireballs = [];
  state.waveSwapUsed = false;
  state.nextRegenTickAtMs = state.timeMs + 1000;
  state.autoplayReadyAtMs = state.timeMs + AUTOPLAY_DELAY_MS;
  state.currentWave = waveDef;
  state.pendingSpawns = waveDef.spawns.map((spawn) => ({ ...spawn }));
  state.message = message;
}

function awardWave(state: RunState, content: GameContent): void {
  const clearedWave = state.currentWave;
  state.pendingFireballs = [];
  state.waveIndex += 1;
  const upcomingWave = createWaveDefinition(state.waveIndex, content);
  const alcoholBonus = alcoholTotals(state, content);
  state.sisu.current += Math.max(0, clearedWave.rewardSisu + (alcoholBonus.rewardSisu ?? 0));
  if (state.saunaDefenderId) state.steamEarned += content.config.steamPerSaunaWave;
  healSauna(state, content);
  normalizeLivingDefenders(state, content);
  if (clearedWave.isBoss) {
    state.phase = 'prep';
    state.overlayMode = 'modifier_draft';
    state.waveElapsedMs = 0;
    state.currentWave = upcomingWave;
    state.pendingSpawns = [];
    clearActiveHudPanel(state);
    if (!rollGlobalModifierDraftOffersIntoState(state, content)) {
      state.overlayMode = 'none';
      scheduleAutoplay(state);
      state.message = 'Boss down. No modifier synergies were live, so the run keeps rolling.';
      return;
    }
    state.message = 'Boss down. Pick one global modifier before the next wave.';
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

  startWaveState(state, upcomingWave, `Wave ${upcomingWave.index} rolls in without a break.`);
}

function applyGlobalRegenTick(state: RunState, content: GameContent): void {
  for (const defender of livingDefenders(state)) {
    const stats = derivedStats(state, defender, content);
    if (stats.regenHpPerSecond <= 0) continue;
    defender.hp = Math.min(stats.maxHp, defender.hp + stats.regenHpPerSecond);
  }
}

function metaCost(state: RunState, upgradeId: MetaUpgradeId, content: GameContent): number | null {
  const def = content.metaUpgrades[upgradeId];
  const level = state.meta.upgrades[upgradeId];
  if (level >= def.maxLevel) return null;
  return def.baseCost + def.costStep * level;
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
    case 'fireball':
      return 6.2;
    case 'spin2win':
      return 6.0;
    case 'blink_step':
      return 5.6;
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

function maybeStartAutoplayWave(state: RunState): boolean {
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
          ? 'You unlocked the between-run lobby, but the actual metashop still needs one Steam-powered grand opening.'
          : 'No metashop before the first run. Survive one shift first, then decide if the grand opening is worth the Steam.'
      };
    }
    return {
      title: state.phase === 'lost' ? 'Run Over' : 'Before The Run',
      body: state.phase === 'lost'
        ? beerShopUnlocked(state)
          ? 'Cash out Steam, tune the meta shop, grab something reckless from the bartender, then launch the next batch of sauna weirdos.'
          : 'Cash out Steam, tweak the meta shop, then launch the next batch of sauna weirdos.'
        : beerShopUnlocked(state)
          ? 'Use the shop and bartender before the first wave if you want a stronger long-term run.'
          : 'Use the shop before the first wave if you want a stronger long-term run.'
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
  if (state.recruitmentOpen) {
    return {
      title: 'Recruitment Market',
      body: recruitmentStatusText(state, content)
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
    recruitmentOpen: false,
    activePanel: null,
    selectedWorldLandmarkId: null,
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
      if (action.panel === 'recruit' && !canAccessRecruitment(next)) return next;
      if (action.panel === 'metashop' && !metashopVisible(next)) return next;
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
          : 'Fresh loot is visible here. Overflow stash unlocks from the metashop.';
      } else if (action.panel === 'recruit') {
        next.message = recruitmentStatusText(next, content);
      }
      return next;
    }
    case 'closeHudPanel':
    case 'clearWorldLandmark':
      clearActiveHudPanel(next);
      return next;
    case 'selectWorldLandmark': {
      if (!landmarkVisible(next, action.landmarkId)) return next;
      const panel = action.landmarkId === 'metashop' ? 'metashop' : 'beer_shop';
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
        next.message = 'Overflow Stash unlocks from the metashop.';
      }
      return next;
    case 'toggleRecruitment':
      if (!canAccessRecruitment(next)) return next;
      if (next.activePanel === 'recruit') {
        clearActiveHudPanel(next);
        next.selectedInventoryDropId = null;
        return next;
      }
      setActiveHudPanel(next, 'recruit');
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
      const buildRadius = currentBuildRadius(next, content);
      const spawnLanes = currentSpawnLanes(next, content);
      if (!isBuildable(action.tile, buildRadius, spawnLanes) || occupied(next, action.tile)) {
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
      if (next.overlayMode !== 'none' || next.phase !== 'prep') return next;
      const defender = getDefender(next, action.defenderId);
      if (!defender || defender.location !== 'board') return next;
      const currentSaunaDefender = getDefender(next, next.saunaDefenderId);
      if (currentSaunaDefender && currentSaunaDefender.location === 'sauna') {
        next.defenders = next.defenders.filter((entry) => entry.id !== currentSaunaDefender.id);
        delete next.benchRerollCountsByDefenderId[currentSaunaDefender.id];
      }
      defender.location = 'sauna';
      defender.tile = null;
      clearUnitMotion(defender);
      next.saunaDefenderId = defender.id;
      next.selectedMapTarget = 'sauna';
      next.selectedDefenderId = null;
      next.selectedEnemyInstanceId = null;
      next.message = currentSaunaDefender && currentSaunaDefender.location === 'sauna'
        ? `${defender.name} took the sauna seat. ${currentSaunaDefender.name} was sent home.`
        : `${defender.name} went to recover in the sauna.`;
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
      rerollSaunaDefenderIdentityAndClass(next, defender, content);
      next.benchRerollCountsByDefenderId[defender.id] = (next.benchRerollCountsByDefenderId[defender.id] ?? 0) + 1;
      normalizeDefender(next, defender, content);
      next.message = `${previousName} reforged into ${defender.name} ${defender.title} for ${cost} SISU.`;
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
      if (next.activePanel === 'recruit') {
        clearActiveHudPanel(next);
      }
      startWaveState(
        next,
        next.currentWave,
        next.currentWave.isBoss
          ? `Boss wave ${next.currentWave.index} started.`
          : `Wave ${next.currentWave.index} started.`
      );
      return next;
    case 'rerollRecruitOffers':
    case 'rollRecruitOffers': {
      if (!canAccessRecruitment(next)) return next;
      const cost = recruitRollCost();
      if (next.sisu.current < cost) {
        next.message = 'Not enough SISU to reroll the market.';
        return next;
      }
      next.sisu.current -= cost;
      rollRecruitOffersIntoState(next, content, false);
      setActiveHudPanel(next, 'recruit');
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
      next.message = 'Single-slot rerolls are gone. Use Refresh to scout a new batch.';
      return next;
    case 'levelUpRecruitment': {
      if (!canAccessRecruitment(next)) return next;
      const cost = recruitLevelUpCost(next.recruitLevelUpCount);
      if (next.sisu.current < cost) {
        next.message = `Not enough SISU to buy Recruitment Level Up (${cost}).`;
        return next;
      }
      next.sisu.current -= cost;
      next.recruitLevelBonus += 1;
      next.recruitLevelUpCount += 1;
      setActiveHudPanel(next, 'recruit');
      next.message = `Recruitment leveled up. Future rerolls now favor stronger starting levels.`;
      return next;
    }
    case 'recruitOffer': {
      if (!canAccessRecruitment(next)) return next;
      const offerIndex = next.recruitOffers.findIndex((entry) => entry?.offerId === action.offerId);
      if (offerIndex < 0) return next;
      const offer = next.recruitOffers[offerIndex];
      if (!offer) return next;
      const boardIsFull = boardDefenders(next).length >= boardCap(next, content);
      const currentPendingReadyRecruit = pendingReadyRecruit(next);
      if (currentPendingReadyRecruit && !boardIsFull) {
        next.message = `Place or sauna ${currentPendingReadyRecruit.name} first before recruiting another hero.`;
        return next;
      }
      if (next.sisu.current < offer.price) {
        next.message = `Not enough SISU for ${offer.candidate.name}.`;
        return next;
      }
      next.sisu.current -= offer.price;
      if (boardIsFull) {
        const saunaDefender = getDefender(next, next.saunaDefenderId);
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
    case 'buyBeerShopOffer': {
      if (!beerShopUnlocked(next)) return next;
      const offer = next.beerShopOffers.find((entry) => entry.offerId === action.offerId);
      if (!offer) return next;
      const definition = content.alcoholDefinitions[offer.alcoholId];
      if (next.meta.steam < definition.price) {
        next.message = `Not enough Steam for ${definition.name}.`;
        return next;
      }
      const existing = activeAlcoholEntry(next, offer.alcoholId);
      if (!existing && next.activeAlcohols.length >= beerActiveSlotCapForTier(beerShopTier(next))) {
        next.message = 'No free drink slot. Dump an active drink first or stack one you already have.';
        return next;
      }
      next.meta.steam -= definition.price;
      if (existing) {
        existing.stacks += 1;
        next.message = `${definition.name} was poured again. The upside grows, and the downside doubles.`;
      } else {
        next.activeAlcohols.push({ alcoholId: offer.alcoholId, stacks: 1 });
        next.message = `${definition.name} is now active for the next run.`;
      }
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
        next.message = 'Not enough Steam to open the metashop yet.';
        return next;
      }
      next.meta.steam -= content.config.metaShopUnlockCost;
      next.meta.shopUnlocked = true;
      next.message = 'The metashop shutters creak open for future runs.';
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
    clearExpiredMotions(next);
    maybeStartAutoplayWave(next);
    return next;
  }
  if (state.overlayMode !== 'none' || state.phase !== 'wave') return state;
  const next = clone(state);
  ageFx(next, deltaMs);
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
  spawnEnemies(next, content);
  resolvePendingFireballs(next);
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
  const gridRadius = currentGridRadius(state, content);
  const buildRadius = currentBuildRadius(state, content);
  const spawnTiles = currentSpawnLanes(state, content);
  const tiles = createHexGrid(gridRadius);
  const buildableTiles = tiles.filter((tile) => isBuildable(tile, buildRadius, spawnTiles));
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
  const saunaSendLabel = selectedBoardDefender
    ? saunaDefender
      ? `Replace Sauna Hero With ${selectedBoardDefender.name}`
      : `Send ${selectedBoardDefender.name} To Sauna`
    : null;
  const saunaReserve = createSaunaReserveEntry(
    state,
    saunaDefender,
    selectedBoardDefender,
    content,
    hudSelectorDeps
  );
  const activeGlobalModifiers = uniqueGlobalModifierIds(state.activeGlobalModifierIds)
    .map((modifierId) => globalModifierHudEntry(state, content.globalModifierDefinitions[modifierId], content));
  const globalModifierSummary = globalModifierSummaryEntries(state, content);
  const draftGlobalModifiers = state.globalModifierDraftOffers
    .map((modifierId) => globalModifierDraftHudEntry(state, content.globalModifierDefinitions[modifierId], content));
  const worldLandmarks = WORLD_LANDMARK_IDS
    .map((landmarkId) => hudWorldLandmarkEntry(state, landmarkId, content))
    .filter((entry) => entry.visible);
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
    activePanel: state.activePanel,
    isPaused: state.overlayMode === 'paused',
    showIntermission: state.overlayMode === 'intermission',
    introOpen: state.introOpen,
    autoplayEnabled: state.autoplayEnabled,
    canAutoplay: canStartWaveNow(state) && state.activePanel === null && !state.introOpen,
    waveNumber: currentWave.index,
    enemiesRemaining: state.pendingSpawns.length + state.enemies.length,
    isBossWave: currentWave.isBoss,
    bossName: bossDisplayName(currentWave.bossId),
    bossHint: bossHint(currentWave.bossId),
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
          level: null,
          hp: null,
          damage: null,
          empty: true,
          isFree: false,
          canBuy: false,
          hotkeyKey: RECRUIT_SLOT_HOTKEYS[slotIndex] ?? null
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
        level: offer.candidate.level,
        hp: roleStats.maxHp,
        damage: roleStats.damage,
        empty: false,
        isFree: offer.price === 0,
        canBuy: canAccessRecruitment(state) && (!pendingReadyRecruit(state) || boardCount >= boardCap(state, content)) && state.sisu.current >= offer.price,
        hotkeyKey: RECRUIT_SLOT_HOTKEYS[slotIndex] ?? null
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
          ? `Stack Drink (${definition.price} Steam)`
          : `Buy Drink (${definition.price} Steam)`
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
          ? state.timeMs >= selected.blinkReadyAtMs
            ? 'Blink ready'
            : `Blink ${Math.ceil((selected.blinkReadyAtMs - state.timeMs) / 1000)}s`
          : null,
        fireballLabel: selected.skills.includes('fireball')
          ? state.timeMs >= selected.fireballReadyAtMs
            ? 'Fireball ready'
            : `Fireball ${Math.ceil((selected.fireballReadyAtMs - state.timeMs) / 1000)}s`
          : null,
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
        location: selected.location
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
      canSendSelectedBoardHero: selectedBoardDefender !== null && state.overlayMode === 'none' && state.phase === 'prep',
      sendSelectedBoardHeroLabel: saunaSendLabel
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
        maxHp: archetype.maxHp,
        damage: archetype.damage,
        range: archetype.range,
        attackCooldownMs: archetype.attackCooldownMs,
        moveCooldownMs: archetype.moveCooldownMs,
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
        maxed: cost === null
      };
    }),
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
    hud,
    tiles,
    buildableTiles,
    spawnTiles
  };
}
