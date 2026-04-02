import type {
  AxialCoord,
  BossCategory,
  CombatFxEvent,
  CombatFxKind,
  DefenderInstance,
  DefenderSubclassId,
  DefenderSubclassDefinition,
  DefenderLocation,
  DefenderTemplateId,
  EnemyInstance,
  EnemyUnitId,
  GameContent,
  GameSnapshot,
  GlobalModifierDefinition,
  GlobalModifierEffectStat,
  HudViewModel,
  InputAction,
  InventoryDrop,
  ItemId,
  MetaProgress,
  MetaUpgradeId,
  Rarity,
  RecruitOffer,
  RunState,
  SkillId,
  SubclassDraftRequest,
  UnitStats,
  WaveDefinition,
  WavePattern,
  WavePreviewEntry,
  WaveSpawn
} from './types';

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
const ENEMY_IDS: EnemyUnitId[] = ['raider', 'brute', 'chieftain'];
const META_IDS: MetaUpgradeId[] = [
  'roster_capacity',
  'inventory_slots',
  'loot_luck',
  'loot_rarity',
  'item_slots',
  'sauna_auto_deploy',
  'sauna_slap_swap'
];
const NON_BOSS_PATTERNS: Array<Exclude<WavePattern, 'tutorial' | 'boss_pressure' | 'boss_breach'>> = [
  'split',
  'staggered',
  'spearhead',
  'surge'
];
const CENTER: AxialCoord = { q: 0, r: 0 };
const EMPTY_STATS: UnitStats = {
  maxHp: 0,
  damage: 0,
  heal: 0,
  range: 0,
  attackCooldownMs: 0,
  defense: 0,
  regenHpPerSecond: 0
};

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
  ]
};

export function coordKey(coord: AxialCoord): string {
  return `${coord.q},${coord.r}`;
}

export function sameCoord(left: AxialCoord, right: AxialCoord): boolean {
  return left.q === right.q && left.r === right.r;
}

function add(left: AxialCoord, right: AxialCoord): AxialCoord {
  return { q: left.q + right.q, r: left.r + right.r };
}

export function hexDistance(left: AxialCoord, right: AxialCoord): number {
  const dq = left.q - right.q;
  const dr = left.r - right.r;
  const ds = -left.q - left.r - (-right.q - right.r);
  return (Math.abs(dq) + Math.abs(dr) + Math.abs(ds)) / 2;
}

export function createHexGrid(radius: number): AxialCoord[] {
  const tiles: AxialCoord[] = [];
  for (let q = -radius; q <= radius; q += 1) {
    const rMin = Math.max(-radius, -q - radius);
    const rMax = Math.min(radius, -q + radius);
    for (let r = rMin; r <= rMax; r += 1) {
      tiles.push({ q, r });
    }
  }
  return tiles.sort((left, right) => (left.r - right.r) || (left.q - right.q));
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
      item_slots: 0,
      sauna_auto_deploy: 0,
      sauna_slap_swap: 0
    }
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

function rosterCap(state: RunState, content: GameContent): number {
  return content.config.baseRosterCap + state.meta.upgrades.roster_capacity;
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

function boardDefenders(state: RunState): DefenderInstance[] {
  return state.defenders.filter((defender) => defender.location === 'board' && defender.tile);
}

function livingDefenders(state: RunState): DefenderInstance[] {
  return state.defenders.filter((defender) => defender.location !== 'dead');
}

function getDefender(state: RunState, defenderId: string | null): DefenderInstance | null {
  return defenderId ? state.defenders.find((defender) => defender.id === defenderId) ?? null : null;
}

function xpForLevel(level: number): number {
  let total = 0;
  for (let nextLevel = 2; nextLevel <= level; nextLevel += 1) {
    total += nextLevel <= 5 ? nextLevel + 1 : 4 + nextLevel * 2;
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
      return 4;
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

function globalModifierTotals(state: RunState, content: GameContent): UnitStats {
  return state.activeGlobalModifierIds.reduce((totals, modifierId) => {
    const definition = content.globalModifierDefinitions[modifierId];
    const stacks = globalModifierStacks(state, definition);
    return applyModifierAmount(totals, definition.effectStat, definition.amountPerStack * stacks);
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
  return {
    maxHp: Math.max(6, base.maxHp + globalBonus.maxHp),
    damage: Math.max(1, base.damage + globalBonus.damage),
    heal: Math.max(0, base.heal + globalBonus.heal),
    range: Math.max(1, base.range + globalBonus.range),
    attackCooldownMs: Math.max(360, base.attackCooldownMs + globalBonus.attackCooldownMs),
    defense: Math.max(0, base.defense + globalBonus.defense),
    regenHpPerSecond: Math.max(0, base.regenHpPerSecond + globalBonus.regenHpPerSecond)
  };
}

function normalizeDefender(state: RunState, defender: DefenderInstance, content: GameContent): void {
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

function newDefender(state: RunState, templateId: DefenderTemplateId, content: GameContent): DefenderInstance {
  const template = content.defenderTemplates[templateId];
  const name = generateName(state, content);
  const stats: UnitStats = {
    maxHp: rollStat(state, template.stats.maxHp, 9, 8),
    damage: rollStat(state, template.stats.damage, 3, 1),
    heal: rollStat(state, template.stats.heal, 2, 0),
    range: rollStat(state, template.stats.range, 1, 1),
    attackCooldownMs: rollStat(state, template.stats.attackCooldownMs, 200, 360),
    defense: template.stats.defense,
    regenHpPerSecond: template.stats.regenHpPerSecond
  };
  return {
    id: `${templateId}-${Math.round(rng(state) * 1e9).toString(16)}`,
    templateId,
    subclassIds: [],
    name: name.name,
    title: name.title,
    lore: generateLore(state, templateId, content),
    tokenStyleId: randomInt(state, 0, 9),
    stats,
    hp: stats.maxHp,
    level: 1,
    xp: 0,
    location: 'ready',
    tile: null,
    attackReadyAtMs: 0,
    items: [],
    skills: [],
    kills: 0,
    lastHitByEnemyId: null
  };
}

function buildRoster(state: RunState, content: GameContent): DefenderInstance[] {
  const defenders: DefenderInstance[] = [];
  const totalDefenders = rosterCap(state, content);
  const saunaIndex = Math.min(4, Math.max(0, totalDefenders - 1));
  for (let index = 0; index < totalDefenders; index += 1) {
    const defender = newDefender(state, DEF_IDS[index % DEF_IDS.length], content);
    defender.location = index === saunaIndex ? 'sauna' : 'ready';
    defenders.push(defender);
  }
  return defenders;
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
  return isBoss ? basePressure + 7 + cycle * 2 : basePressure;
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
  const laneCount = content.config.spawnLanes.length;
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

function buildBossSpawns(index: number, content: GameContent, pressure: number, bossCategory: BossCategory): WaveSpawn[] {
  const laneCount = content.config.spawnLanes.length;
  const baseLane = wrapLane(index + cycleNumber(index, content) * 2, laneCount);
  const sideA = wrapLane(baseLane + 2, laneCount);
  const sideB = wrapLane(baseLane + 4, laneCount);
  const interval = spawnIntervalMs(index, content, bossCategory === 'breach' ? -110 : -40);
  const cycle = cycleNumber(index, content);
  const supportWave = compositionForPressure(Math.max(8, pressure - 8), cycle + 1, bossCategory === 'pressure' ? 1 : 0);
  const spawns: WaveSpawn[] = [];

  if (bossCategory === 'pressure') {
    pushSpawn(spawns, 0, 'chieftain', baseLane, laneCount);
    supportWave.forEach((enemyId, spawnIndex) => {
      const laneIndex = spawnIndex % 2 === 0 ? sideA : sideB;
      pushSpawn(spawns, 650 + spawnIndex * interval, enemyId, laneIndex, laneCount);
    });
    pushSpawn(spawns, 900 + supportWave.length * interval, 'brute', baseLane, laneCount);
  } else {
    pushSpawn(spawns, 0, 'brute', baseLane, laneCount);
    pushSpawn(spawns, interval * 0.7, 'raider', baseLane, laneCount);
    pushSpawn(spawns, interval * 1.4, 'chieftain', baseLane, laneCount);
    supportWave.forEach((enemyId, spawnIndex) => {
      const laneIndex = spawnIndex % 2 === 0 ? wrapLane(baseLane + 1, laneCount) : baseLane;
      pushSpawn(spawns, 1100 + spawnIndex * interval * 0.9, enemyId, laneIndex, laneCount);
    });
    pushSpawn(spawns, 1250 + supportWave.length * interval, 'brute', wrapLane(baseLane - 1, laneCount), laneCount);
  }

  return spawns.sort((left, right) => left.atMs - right.atMs);
}

export function createWaveDefinition(index: number, content: GameContent): WaveDefinition {
  const isBoss = index % content.config.bossEvery === 0;
  if (index === 1) {
    return { index, isBoss: false, rewardSisu: 3, pressure: 4, pattern: 'tutorial', bossCategory: null, spawns: [
      { atMs: 0, enemyId: 'raider', laneIndex: 0 },
      { atMs: 1100, enemyId: 'raider', laneIndex: 2 },
      { atMs: 2300, enemyId: 'raider', laneIndex: 4 }
    ] };
  }
  if (index === 2) {
    return { index, isBoss: false, rewardSisu: 3, pressure: 6, pattern: 'tutorial', bossCategory: null, spawns: [
      { atMs: 0, enemyId: 'raider', laneIndex: 0 },
      { atMs: 800, enemyId: 'raider', laneIndex: 3 },
      { atMs: 1700, enemyId: 'brute', laneIndex: 1 },
      { atMs: 3100, enemyId: 'raider', laneIndex: 5 }
    ] };
  }
  if (index === 3) {
    return { index, isBoss: false, rewardSisu: 3, pressure: 9, pattern: 'split', bossCategory: null, spawns: [
      { atMs: 0, enemyId: 'brute', laneIndex: 0 },
      { atMs: 900, enemyId: 'raider', laneIndex: 2 },
      { atMs: 1600, enemyId: 'raider', laneIndex: 4 },
      { atMs: 2900, enemyId: 'brute', laneIndex: 1 }
    ] };
  }
  if (index === 4) {
    return { index, isBoss: false, rewardSisu: 3, pressure: 11, pattern: 'staggered', bossCategory: null, spawns: [
      { atMs: 0, enemyId: 'raider', laneIndex: 0 },
      { atMs: 700, enemyId: 'raider', laneIndex: 2 },
      { atMs: 1400, enemyId: 'brute', laneIndex: 4 },
      { atMs: 2300, enemyId: 'raider', laneIndex: 1 },
      { atMs: 3200, enemyId: 'brute', laneIndex: 5 }
    ] };
  }

  const pressure = wavePressure(index, content, isBoss);
  if (isBoss) {
    const bossCategory: BossCategory = cycleNumber(index, content) % 2 === 0 ? 'pressure' : 'breach';
    return {
      index,
      isBoss: true,
      rewardSisu: rewardSisuForWave(index, pressure, true, content),
      pressure,
      pattern: bossCategory === 'pressure' ? 'boss_pressure' : 'boss_breach',
      bossCategory,
      spawns: buildBossSpawns(index, content, pressure, bossCategory)
    };
  }
  const pattern = NON_BOSS_PATTERNS[(index - 5) % NON_BOSS_PATTERNS.length];
  return {
    index,
    isBoss: false,
    rewardSisu: rewardSisuForWave(index, pressure, false, content),
    pressure,
    pattern,
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

function isBuildable(tile: AxialCoord, content: GameContent): boolean {
  const dist = hexDistance(tile, CENTER);
  return dist > 0 && dist <= content.config.buildRadius &&
    !content.config.spawnLanes.some((lane) => sameCoord(lane, tile));
}

function nearestSaunaDeployTile(state: RunState, content: GameContent, preferredTile?: AxialCoord | null): AxialCoord | null {
  if (preferredTile && isBuildable(preferredTile, content) && !occupied(state, preferredTile)) {
    return { ...preferredTile };
  }

  const candidates = createHexGrid(content.config.gridRadius)
    .filter((tile) => isBuildable(tile, content))
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
  saunaDefender.tile = tile;
  saunaDefender.attackReadyAtMs = state.timeMs + derivedStats(state, saunaDefender, content).attackCooldownMs;
  state.saunaDefenderId = null;
  autoFillSaunaFromBench(state, content);
  pushFx(state, 'blink', tile, 280, CENTER);
  return saunaDefender;
}

function autoFillSaunaFromBench(state: RunState, content: GameContent): DefenderInstance | null {
  if (state.saunaDefenderId || boardDefenders(state).length < content.config.boardCap) {
    return null;
  }
  const reserve = state.defenders.find((defender) => defender.location === 'ready') ?? null;
  if (!reserve) {
    return null;
  }
  reserve.location = 'sauna';
  reserve.tile = null;
  state.saunaDefenderId = reserve.id;
  return reserve;
}

function maybeSaunaSlapSwap(state: RunState, defender: DefenderInstance, content: GameContent): boolean {
  if (!hasSaunaSlapSwap(state) || state.waveSwapUsed || !defender.tile || defender.location !== 'board' || defender.hp <= 0) {
    return false;
  }
  const maxHp = derivedStats(state, defender, content).maxHp;
  if (defender.hp / maxHp > 0.35) return false;
  const saunaDefender = getDefender(state, state.saunaDefenderId);
  if (!saunaDefender || saunaDefender.location !== 'sauna') return false;

  const swapTile = { ...defender.tile };
  saunaDefender.location = 'board';
  saunaDefender.tile = swapTile;
  saunaDefender.attackReadyAtMs = state.timeMs + derivedStats(state, saunaDefender, content).attackCooldownMs;

  defender.location = 'sauna';
  defender.tile = null;
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

function recruitCost(state: RunState, content: GameContent): number {
  const cycleTax = cycleNumber(state.waveIndex, content) * content.config.recruitWaveStep;
  const waveTax = Math.floor(Math.max(0, state.waveIndex - 1) / 4) * content.config.recruitWaveStep;
  return content.config.recruitBaseCost + state.gambleCount * content.config.recruitCostStep + cycleTax + waveTax;
}

function recruitRollCost(state: RunState, content: GameContent): number {
  return Math.max(1, Math.floor(recruitCost(state, content) * 0.34));
}

function canAccessRecruitment(state: RunState): boolean {
  return !state.introOpen && state.phase !== 'lost' && state.overlayMode !== 'intermission' && state.overlayMode !== 'modifier_draft' && state.overlayMode !== 'subclass_draft';
}

function canRollRecruitOffers(state: RunState, content: GameContent): boolean {
  return (
    canAccessRecruitment(state) &&
    state.sisu.current >= recruitRollCost(state, content)
  );
}

function recruitReplacementTarget(state: RunState): DefenderInstance | null {
  if (state.selectedMapTarget === 'sauna') {
    const saunaDefender = getDefender(state, state.saunaDefenderId);
    return saunaDefender && saunaDefender.location === 'sauna' ? saunaDefender : null;
  }
  const selected = getDefender(state, state.selectedDefenderId);
  return selected && selected.location !== 'dead' ? selected : null;
}

function canBuyAnyRecruitOffer(state: RunState, content: GameContent): boolean {
  const rosterFull = livingDefenders(state).length >= rosterCap(state, content);
  return (
    canAccessRecruitment(state) &&
    (!rosterFull || recruitReplacementTarget(state) !== null) &&
    state.recruitOffers.some((offer) => state.sisu.current >= offer.price)
  );
}

function recruitmentStatusText(state: RunState, content: GameContent): string {
  if (state.phase === 'lost' || state.overlayMode === 'intermission') {
    return 'Recruitment closes between runs.';
  }
  if (state.introOpen) {
    return 'Finish the briefing before scouting recruits.';
  }
  const replacement = recruitReplacementTarget(state);
  const rosterFull = livingDefenders(state).length >= rosterCap(state, content);
  if (rosterFull && state.recruitOffers.length === 0) {
    return replacement
      ? `Roster is full. Scout normally, then your next recruit will replace ${replacement.name}.`
      : 'Roster is full. You can still scout offers, but pick a hero from the roster or click the sauna to mark who gets replaced.';
  }
  if (state.recruitOffers.length > 0) {
    if (rosterFull) {
      return replacement
        ? state.sisu.current >= Math.min(...state.recruitOffers.map((offer) => offer.price))
          ? `Roster is full. Buying a recruit will replace ${replacement.name}.`
          : `Roster is full and ${replacement.name} is marked for replacement, but you still need more SISU.`
        : 'Roster is full. Select the hero you want to sacrifice before buying a recruit.';
    }
    return state.sisu.current >= Math.min(...state.recruitOffers.map((offer) => offer.price))
      ? 'Pick one candidate. The others leave when you sign a recruit.'
      : 'You can inspect the market, but you need more SISU to afford any offer.';
  }
  const scoutCost = recruitRollCost(state, content);
  return state.sisu.current >= scoutCost
    ? 'Scout three candidates and compare their prices, stats and personalities.'
    : `Need ${scoutCost} SISU to scout a new batch of recruits.`;
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

function roleRecruitTax(templateId: DefenderTemplateId): number {
  switch (templateId) {
    case 'guardian':
      return 1;
    case 'mender':
      return 1;
    default:
      return 0;
  }
}

function pickUniqueDefinitions(
  state: RunState,
  definitions: GlobalModifierDefinition[],
  count: number
): GlobalModifierDefinition[] {
  const pool = [...definitions];
  const picked: GlobalModifierDefinition[] = [];
  while (pool.length > 0 && picked.length < count) {
    const index = randomInt(state, 0, pool.length - 1);
    picked.push(pool.splice(index, 1)[0]);
  }
  return picked;
}

function availableGlobalModifierDefinitions(
  state: RunState,
  content: GameContent,
  includeFallback: boolean
): GlobalModifierDefinition[] {
  return Object.values(content.globalModifierDefinitions)
    .filter((definition) => (includeFallback ? definition.isFallback === true : !definition.isFallback))
    .filter((definition) => !state.activeGlobalModifierIds.includes(definition.id))
    .filter((definition) => globalModifierStacks(state, definition) > 0);
}

function rollGlobalModifierDraftOffersIntoState(state: RunState, content: GameContent): void {
  const picked = pickUniqueDefinitions(state, availableGlobalModifierDefinitions(state, content, false), 3);
  if (picked.length < 3) {
    picked.push(...pickUniqueDefinitions(state, availableGlobalModifierDefinitions(state, content, true), 3 - picked.length));
  }
  state.globalModifierDraftOffers = picked.map((definition) => definition.id);
}

function fillDefenderToMax(state: RunState, defender: DefenderInstance, content: GameContent): void {
  defender.hp = derivedStats(state, defender, content).maxHp;
}

function createRecruitOffer(state: RunState, content: GameContent): RecruitOffer {
  const templateId = pick(state, DEF_IDS);
  const candidate = newDefender(state, templateId, content);
  const score = recruitScore(candidate, content);
  const quality = recruitQuality(score);
  const baseCost = recruitCost(state, content);
  const price = Math.max(
    3,
    Math.round(
      baseCost +
      roleRecruitTax(templateId) +
      (quality === 'rough' ? -1 : quality === 'elite' ? 2 : 0) +
      Math.max(0, Math.round((score - 1) * 6))
    )
  );
  return {
    offerId: state.nextRecruitOfferId++,
    price,
    quality,
    candidate
  };
}

function rollRecruitOffersIntoState(state: RunState, content: GameContent): void {
  state.recruitOffers = Array.from({ length: 3 }, () => createRecruitOffer(state, content));
}

function replaceDefenderWithRecruit(
  state: RunState,
  outgoing: DefenderInstance,
  incoming: DefenderInstance,
  content: GameContent
): void {
  incoming.location = outgoing.location;
  incoming.tile = outgoing.tile ? { ...outgoing.tile } : null;
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
  fillDefenderToMax(state, incoming, content);

  if (state.selectedDefenderId === outgoing.id || state.selectedMapTarget === 'sauna') {
    state.selectedDefenderId = null;
    state.selectedMapTarget = null;
  }

  autoFillSaunaFromBench(state, content);
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

function addHitStop(state: RunState, durationMs: number): void {
  state.hitStopMs = Math.max(state.hitStopMs, durationMs);
}

function enemiesInRange(state: RunState, tile: AxialCoord, range: number): EnemyInstance[] {
  return state.enemies
    .filter((enemy) => hexDistance(tile, enemy.tile) <= range)
    .sort((left, right) => (hexDistance(tile, left.tile) - hexDistance(tile, right.tile)) || (left.hp - right.hp));
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
  if (!defender.tile || !defender.skills.includes('blink_step')) return false;
  const from = { ...defender.tile };
  const enemy = nearestEnemy(state, defender.tile);
  if (!enemy) return false;
  const tile = DIRS.map((dir) => add(defender.tile as AxialCoord, dir))
    .filter((next) => isBuildable(next, content) && !occupied(state, next))
    .sort((left, right) => hexDistance(left, enemy.tile) - hexDistance(right, enemy.tile))[0];
  if (!tile) return false;
  defender.tile = tile;
  pushFx(state, 'blink', tile, 240, from);
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
    .filter((tile) => isBuildable(tile, content) && !occupied(state, tile))
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

  defender.tile = nextTile;
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
  const chance = enemyId === 'chieftain' ? content.config.bossLootChance : content.config.baseLootChance + state.meta.upgrades.loot_luck * 0.06;
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
    text: `Wave ${state.currentWave.index} · ${defender.name} ${defender.title} fell when ${enemyName} ${line}.`
  };
}

function resolveEnemyDeaths(state: RunState, content: GameContent): void {
  const living: EnemyInstance[] = [];
  for (const enemy of state.enemies) {
    if (enemy.hp > 0) {
      living.push(enemy);
      continue;
    }
    if (enemy.lastHitByDefenderId) {
      const killer = getDefender(state, enemy.lastHitByDefenderId);
      if (killer && killer.location !== 'dead') {
        killer.kills += 1;
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
      if (state.saunaDefenderId === defender.id) state.saunaDefenderId = null;
      if (state.selectedDefenderId === defender.id) state.selectedDefenderId = null;
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

function defenderAttack(state: RunState, defender: DefenderInstance, content: GameContent): void {
  if (!defender.tile || defender.location !== 'board' || state.timeMs < defender.attackReadyAtMs) return;
  const stats = derivedStats(state, defender, content);
  const dmgMult = state.timeMs < state.sisu.activeUntilMs ? content.config.sisuDamageMultiplier : 1;
  const cdMult = state.timeMs < state.sisu.activeUntilMs ? content.config.sisuAttackMultiplier : 1;
  const ally = stats.heal > 0 ? alliesToHeal(state, defender, stats, content)[0] : null;
  if (ally) {
    ally.hp = Math.min(derivedStats(state, ally, content).maxHp, ally.hp + Math.round(stats.heal * dmgMult));
    if (ally.tile) {
      pushFx(state, 'heal', ally.tile, 320, defender.tile);
    }
    grantCombatXp(state, defender, 1, content);
    defender.attackReadyAtMs = state.timeMs + stats.attackCooldownMs / cdMult;
    return;
  }
  let target = enemiesInRange(state, defender.tile, stats.range)[0] ?? null;
  if (!target && tryBlink(state, defender, content)) target = enemiesInRange(state, defender.tile, stats.range)[0] ?? null;
  if (!target) {
    moveDefenderTowardSaunaThreat(state, defender, stats, content, cdMult);
    return;
  }
  target.hp -= Math.round(stats.damage * dmgMult);
  target.lastHitByDefenderId = defender.id;
  pushFx(state, 'hit', target.tile, 180, defender.tile);
  grantCombatXp(state, defender, 1, content);
  if (defender.skills.includes('fireball')) {
    pushFx(state, 'fireball', target.tile, 260, defender.tile);
    for (const enemy of state.enemies) {
      if (enemy.instanceId !== target.instanceId && hexDistance(enemy.tile, target.tile) <= 1) {
        enemy.hp -= Math.max(1, Math.round(stats.damage * 0.35));
        enemy.lastHitByDefenderId = defender.id;
      }
    }
    addHitStop(state, 36);
  }
  if (defender.skills.includes('spin2win')) {
    pushFx(state, 'spin', defender.tile, 220);
    for (const enemy of state.enemies) {
      if (enemy.instanceId !== target.instanceId && hexDistance(enemy.tile, defender.tile) <= 1) {
        enemy.hp -= Math.max(1, Math.round(stats.damage * 0.5));
        enemy.lastHitByDefenderId = defender.id;
      }
    }
    addHitStop(state, 28);
  }
  if (defender.skills.includes('chain_spark')) {
    const chainedTarget = state.enemies
      .filter((enemy) => enemy.instanceId !== target.instanceId)
      .filter((enemy) => hexDistance(enemy.tile, target.tile) <= 2)
      .sort((left, right) => (left.hp - right.hp) || (hexDistance(left.tile, target.tile) - hexDistance(right.tile, target.tile)))[0];
    if (chainedTarget) {
      chainedTarget.hp -= Math.max(1, Math.round(stats.damage * 0.42));
      chainedTarget.lastHitByDefenderId = defender.id;
      pushFx(state, 'chain', chainedTarget.tile, 220, target.tile);
    }
  }
  if (defender.skills.includes('steam_shield')) {
    defender.hp = Math.min(stats.maxHp, defender.hp + 3);
    pushFx(state, 'heal', defender.tile, 220);
  }
  if (defender.skills.includes('battle_hymn')) {
    const allyPulse = alliesToHeal(state, defender, { ...stats, range: 1 }, content)[0];
    if (allyPulse?.tile) {
      allyPulse.hp = Math.min(derivedStats(state, allyPulse, content).maxHp, allyPulse.hp + 2);
      pushFx(state, 'heal', allyPulse.tile, 240, defender.tile);
    }
  }
  defender.attackReadyAtMs = state.timeMs + stats.attackCooldownMs / cdMult;
}

function enemyTarget(state: RunState, enemy: EnemyInstance, content: GameContent): DefenderInstance | 'sauna' | null {
  const archetype = content.enemyArchetypes[enemy.archetypeId];
  const defenders = boardDefenders(state)
    .filter((defender) => defender.tile && hexDistance(enemy.tile, defender.tile as AxialCoord) <= archetype.range)
    .sort((left, right) => (left.hp - right.hp) || (hexDistance(enemy.tile, left.tile as AxialCoord) - hexDistance(enemy.tile, right.tile as AxialCoord)));
  if (defenders[0]) return defenders[0];
  return hexDistance(enemy.tile, CENTER) <= archetype.range ? 'sauna' : null;
}

function enemyStep(state: RunState, enemy: EnemyInstance, content: GameContent): void {
  const archetype = content.enemyArchetypes[enemy.archetypeId];
  if (state.timeMs >= enemy.attackReadyAtMs) {
    const target = enemyTarget(state, enemy, content);
    if (target === 'sauna') {
      state.saunaHp = Math.max(0, state.saunaHp - archetype.damage);
      pushFx(state, enemy.archetypeId === 'chieftain' ? 'boss_hit' : 'sauna_hit', CENTER, enemy.archetypeId === 'chieftain' ? 260 : 210, enemy.tile);
      if (enemy.archetypeId === 'chieftain') {
        addHitStop(state, 42);
      }
      enemy.attackReadyAtMs = state.timeMs + archetype.attackCooldownMs;
      return;
    }
    if (target) {
      const defense = derivedStats(state, target, content).defense;
      target.hp -= Math.max(1, archetype.damage - defense);
      target.lastHitByEnemyId = enemy.archetypeId;
      if (target.tile) {
        pushFx(state, enemy.archetypeId === 'chieftain' ? 'boss_hit' : 'defender_hit', target.tile, enemy.archetypeId === 'chieftain' ? 240 : 190, enemy.tile);
      }
      maybeSaunaSlapSwap(state, target, content);
      if (enemy.archetypeId === 'chieftain') {
        addHitStop(state, 36);
      }
      enemy.attackReadyAtMs = state.timeMs + archetype.attackCooldownMs;
      return;
    }
  }
  if (state.timeMs < enemy.moveReadyAtMs) return;
  const tile = DIRS.map((dir) => add(enemy.tile, dir))
    .filter((next) => hexDistance(next, CENTER) <= content.config.gridRadius)
    .filter((next) => !occupied(state, next))
    .sort((left, right) => (hexDistance(left, CENTER) - hexDistance(right, CENTER)) || (left.r - right.r) || (left.q - right.q))[0];
  if (!tile) return;
  enemy.tile = tile;
  enemy.moveReadyAtMs = state.timeMs + archetype.moveCooldownMs;
}

function spawnEnemies(state: RunState, content: GameContent): void {
  const waiting: WaveSpawn[] = [];
  for (const spawn of state.pendingSpawns) {
    if (spawn.atMs > state.waveElapsedMs) {
      waiting.push(spawn);
      continue;
    }
    const lane = content.config.spawnLanes[spawn.laneIndex % content.config.spawnLanes.length];
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
      hp: archetype.maxHp,
      lastHitByDefenderId: null,
      attackReadyAtMs: state.timeMs + archetype.attackCooldownMs,
      moveReadyAtMs: state.timeMs + archetype.moveCooldownMs
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
  state.waveSwapUsed = false;
  state.nextRegenTickAtMs = state.timeMs + 1000;
  state.currentWave = waveDef;
  state.pendingSpawns = waveDef.spawns.map((spawn) => ({ ...spawn }));
  state.message = message;
}

function awardWave(state: RunState, content: GameContent): void {
  const clearedWave = state.currentWave;
  state.waveIndex += 1;
  const upcomingWave = createWaveDefinition(state.waveIndex, content);
  state.sisu.current += clearedWave.rewardSisu;
  if (state.saunaDefenderId) state.steamEarned += content.config.steamPerSaunaWave;
  healSauna(state, content);
  normalizeLivingDefenders(state, content);
  if (clearedWave.isBoss) {
    state.phase = 'prep';
    state.overlayMode = 'modifier_draft';
    state.waveElapsedMs = 0;
    state.currentWave = upcomingWave;
    state.pendingSpawns = [];
    state.inventoryOpen = false;
    state.recruitmentOpen = false;
    rollGlobalModifierDraftOffersIntoState(state, content);
    state.message = 'Boss down. Pick one global modifier before the next wave.';
    return;
  }
  if (upcomingWave.isBoss) {
    state.phase = 'prep';
    state.waveElapsedMs = 0;
    state.currentWave = upcomingWave;
    state.pendingSpawns = [];
    state.message = `Boss wave ${upcomingWave.index} is coming. Reposition before it hits.`;
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

function globalModifierHudEntry(state: RunState, definition: GlobalModifierDefinition, content: GameContent) {
  const stackCount = globalModifierStacks(state, definition);
  const total = definition.amountPerStack * stackCount;
  return {
    id: definition.id,
    name: definition.name,
    description: definition.description,
    formulaText: `${formatModifierAmount(definition.amountPerStack, definition.effectStat)} ${globalModifierStatLabel(definition.effectStat)} per ${globalModifierScopeLabel(definition, content)}`,
    stackCount,
    effectText: `${formatModifierAmount(definition.amountPerStack, definition.effectStat)} ${globalModifierStatLabel(definition.effectStat)}`,
    resolvedEffectText: `${stackCount} stack${stackCount === 1 ? '' : 's'} -> ${formatModifierAmount(total, definition.effectStat)} ${globalModifierStatLabel(definition.effectStat)}`
  };
}

function unlockedSubclassDefinitions(defender: DefenderInstance, content: GameContent): DefenderSubclassDefinition[] {
  return defender.subclassIds.map((subclassId) => content.defenderSubclasses[subclassId]);
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
  return unlocked.map((definition) => definition.name).join(' · ');
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
  const active = unlocked.map((definition) => definition.name).join(', ');
  return next
    ? `Active branches: ${active}. Next branch unlocks at level ${next}, ${xpToNext} XP away.`
    : `Active branches: ${active}. Every subclass milestone is already unlocked.`;
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
    state.inventoryOpen = false;
    state.recruitmentOpen = false;
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
  const boardCount = boardDefenders(state).length;
  const readyCount = state.defenders.filter((defender) => defender.location === 'ready').length;
  const freeSlots = Math.max(0, rosterCap(state, content) - livingDefenders(state).length);
  const replacement = recruitReplacementTarget(state);

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
        ? 'Cash out Steam, tweak the meta shop, then launch the next batch of sauna weirdos.'
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
        ? 'The sauna is holding one reserve hero. Check their condition and the auto-upgrade status here.'
        : 'The sauna is empty. Send a board hero there during prep if you want a reserve.'
    };
  }
  if (state.recruitOffers.length > 0) {
    return {
      title: 'Recruit Market Live',
      body:
        freeSlots > 0
          ? 'Three candidates are on the towel rack. Compare prices, stats and vibes, then sign one before the market cools off.'
          : replacement
            ? `Three candidates are ready. Buying one will replace ${replacement.name} immediately.`
            : 'Three candidates are ready, but your roster is full. Select the hero you want to replace before buying.'
    };
  }
  if (selectedDefender && selectedDefender.location !== 'board') {
    return {
      title: 'Place Defender',
      body: `Drop ${selectedDefender.name} onto a bright green build hex. You can place heroes from the bench even while the wave is live.`
    };
  }
  if (state.phase === 'prep') {
    if (boardCount === 0 && readyCount > 0) {
      return {
        title: 'Place Your First Hero',
        body: 'Select a hero from the roster, then click any green build hex on the board. Path tiles stay dark and cannot hold defenders.'
      };
    }
    return {
      title: state.currentWave.isBoss ? 'Boss Prep' : 'Prep Window',
      body: state.currentWave.isBoss
        ? 'This is the clean break before a boss. Set the board, spend SISU carefully, then start when ready.'
        : freeSlots > 0
          ? 'Set the board, scout recruit offers if needed, and start when your lanes make sense.'
          : 'Set the board, sort loot, and start when your lanes make sense.'
    };
  }
  return {
    title: state.currentWave.isBoss ? 'Boss Pressure' : 'Hold The Line',
    body: state.currentWave.isBoss
      ? 'Keep the center alive, use pause if you need to assign loot, and watch for direct sauna breaches.'
      : freeSlots > 0
        ? 'Non-boss waves keep chaining. You can still recruit and place bench heroes while the fight is live.'
        : 'Non-boss waves keep chaining, so stabilize attrition before the next spike arrives.'
  };
}

export function createInitialState(
  content: GameContent,
  meta: MetaProgress = createDefaultMetaProgress(),
  seed = 123456789,
  showIntermission = false,
  introOpen = false
): RunState {
  const state: RunState = {
    phase: 'prep',
    overlayMode: showIntermission ? 'intermission' : 'none',
    inventoryOpen: false,
    recruitmentOpen: false,
    introOpen,
    timeMs: 0,
    waveIndex: 1,
    waveElapsedMs: 0,
    currentWave: createWaveDefinition(1, content),
    seed,
    selectedMapTarget: null,
    selectedDefenderId: null,
    hoveredTile: null,
    defenders: [],
    enemies: [],
    fxEvents: [],
    hitStopMs: 0,
    saunaDefenderId: null,
    pendingSpawns: [],
    nextEnemyInstanceId: 1,
    nextLootInstanceId: 1,
    nextRecruitOfferId: 1,
    nextFxEventId: 1,
    nextDeathLogEntryId: 1,
    headerItems: [],
    headerSkills: [],
    inventory: [],
    selectedInventoryDropId: null,
    recentDropId: null,
    recruitOffers: [],
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
    meta: clone(meta),
    message: showIntermission
      ? 'Spend Steam, browse upgrades, then begin the next sauna shift.'
      : 'Place defenders, keep one weird hero in the sauna, then start the wave.',
    metaAwarded: false
  };
  state.defenders = buildRoster(state, content);
  state.saunaDefenderId = state.defenders.find((defender) => defender.location === 'sauna')?.id ?? null;
  return state;
}

export function applyAction(state: RunState, action: InputAction, content: GameContent): RunState {
  if (action.type === 'restartRun') {
    return createInitialState(
      content,
      state.meta,
      (Date.now() >>> 0) || 1,
      false
    );
  }
  if (action.type === 'startNextRun') {
    return state.overlayMode === 'intermission'
      ? createInitialState(content, state.meta, (Date.now() >>> 0) || 1, false)
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
      if (!next.activeGlobalModifierIds.includes(action.modifierId)) {
        next.activeGlobalModifierIds.push(action.modifierId);
      }
      next.globalModifierDraftOffers = [];
      next.overlayMode = 'none';
      next.phase = 'prep';
      next.inventoryOpen = false;
      next.recruitmentOpen = false;
      normalizeLivingDefenders(next, content);
      next.message = `${content.globalModifierDefinitions[action.modifierId].name} locked in for this run.`;
      activateNextSubclassDraft(next, content);
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
      const subclass = content.defenderSubclasses[action.subclassId];
      next.message = `${defender.name} locked in ${subclass.name}.`;
      activateNextSubclassDraft(next, content);
      return next;
    }
    case 'selectSauna':
      next.selectedDefenderId = null;
      next.selectedMapTarget = 'sauna';
      next.message = next.saunaDefenderId ? 'Sauna selected. One hero is warming up inside.' : 'Sauna selected. It is empty right now.';
      return next;
    case 'selectDefender': {
      const defender = getDefender(next, action.defenderId);
      if (!defender || defender.location === 'dead') return next;
      next.selectedMapTarget = 'defender';
      next.selectedDefenderId = defender.id;
      next.message = `${defender.name} ${defender.title} selected.`;
      return next;
    }
    case 'closeSaunaPopup':
    case 'clearSelection':
      next.selectedMapTarget = null;
      next.selectedDefenderId = null;
      return next;
    case 'selectInventoryDrop': {
      const drop = getInventoryDrop(next, action.dropId);
      if (!drop) return next;
      next.inventoryOpen = next.inventory.some((entry) => entry.instanceId === drop.instanceId) && inventoryUnlocked(next);
      next.selectedInventoryDropId = drop.instanceId;
      next.message = `${drop.name} ready to equip.`;
      return next;
    }
    case 'clearSelectedInventoryDrop':
      next.selectedInventoryDropId = null;
      return next;
    case 'toggleInventory':
      if (next.overlayMode === 'intermission') return next;
      if (!inventoryUnlocked(next)) {
        next.inventoryOpen = false;
        next.message = 'Overflow Stash unlocks from the metashop.';
        return next;
      }
      next.inventoryOpen = !next.inventoryOpen;
      if (next.inventoryOpen) {
        next.recruitmentOpen = false;
      }
      if (!next.inventoryOpen) {
        next.selectedInventoryDropId = null;
      }
      return next;
    case 'toggleRecruitment':
      if (!canAccessRecruitment(next)) return next;
      next.recruitmentOpen = !next.recruitmentOpen;
      if (next.recruitmentOpen) {
        next.inventoryOpen = false;
        next.selectedInventoryDropId = null;
      }
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
      if (!isBuildable(action.tile, content) || occupied(next, action.tile)) {
        next.message = 'That hex is not available.';
        return next;
      }
      if (boardDefenders(next).length >= content.config.boardCap) {
        next.message = 'Board cap reached.';
        return next;
      }
      defender.location = 'board';
      defender.tile = { ...action.tile };
      defender.attackReadyAtMs = next.timeMs + derivedStats(next, defender, content).attackCooldownMs;
      if (next.saunaDefenderId === defender.id) next.saunaDefenderId = null;
      next.selectedMapTarget = null;
      next.selectedDefenderId = null;
      const movedToSauna = autoFillSaunaFromBench(next, content);
      next.message = movedToSauna
        ? `${defender.name} entered the fight. ${movedToSauna.name} moved into the empty sauna reserve.`
        : `${defender.name} entered the fight.`;
      return next;
    }
    case 'recallDefenderToSauna': {
      if (next.overlayMode !== 'none' || next.phase !== 'prep' || next.saunaDefenderId) return next;
      const defender = getDefender(next, action.defenderId);
      if (!defender || defender.location !== 'board') return next;
      defender.location = 'sauna';
      defender.tile = null;
      next.saunaDefenderId = defender.id;
      next.message = `${defender.name} went to recover in the sauna.`;
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
      if (next.overlayMode !== 'none' || next.phase !== 'prep' || boardDefenders(next).length === 0) {
        next.message = 'Place at least one defender first.';
        return next;
      }
      next.recruitmentOpen = false;
      startWaveState(
        next,
        next.currentWave,
        next.currentWave.isBoss
          ? `Boss wave ${next.currentWave.index} started.`
          : `Wave ${next.currentWave.index} started.`
      );
      return next;
    case 'rollRecruitOffers': {
      if (!canAccessRecruitment(next)) return next;
      const cost = recruitRollCost(next, content);
      if (next.sisu.current < cost) {
        next.message = 'Not enough SISU to scout new recruits.';
        return next;
      }
      next.sisu.current -= cost;
      rollRecruitOffersIntoState(next, content);
      next.recruitmentOpen = true;
      next.message =
        next.recruitOffers.length > 0
          ? `Three new recruits walked in for inspection. Prices start at ${Math.min(...next.recruitOffers.map((offer) => offer.price))} SISU.`
          : 'No recruits showed up.';
      return next;
    }
    case 'recruitOffer': {
      if (!canAccessRecruitment(next)) return next;
      const offer = next.recruitOffers.find((entry) => entry.offerId === action.offerId);
      if (!offer) return next;
      const rosterFull = livingDefenders(next).length >= rosterCap(next, content);
      const replacement = rosterFull ? recruitReplacementTarget(next) : null;
      if (rosterFull && !replacement) {
        next.message = 'Roster is full. Select a hero from the roster, or click the sauna, to choose who gets replaced.';
        return next;
      }
      if (next.sisu.current < offer.price) {
        next.message = `Not enough SISU for ${offer.candidate.name}.`;
        return next;
      }
      next.sisu.current -= offer.price;
      next.gambleCount += 1;
      if (replacement) {
        replaceDefenderWithRecruit(next, replacement, offer.candidate, content);
      } else {
        fillDefenderToMax(next, offer.candidate, content);
        next.defenders.push(offer.candidate);
        autoFillSaunaFromBench(next, content);
      }
      next.recruitOffers = [];
      next.recruitmentOpen = false;
      next.message = replacement
        ? `${offer.candidate.name} ${offer.candidate.title} replaced ${replacement.name} for ${offer.price} SISU.`
        : `${offer.candidate.name} ${offer.candidate.title} joined your reserve bench for ${offer.price} SISU.`;
      return next;
    }
    case 'clearRecruitOffers':
      if (!canAccessRecruitment(next)) return next;
      next.recruitOffers = [];
      next.recruitmentOpen = false;
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
      const cost = metaCost(next, action.upgradeId, content);
      if (cost === null || next.meta.steam < cost) return next;
      next.meta.steam -= cost;
      next.meta.upgrades[action.upgradeId] += 1;
      next.message = `${content.metaUpgrades[action.upgradeId].name} purchased.`;
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
    default:
      return next;
  }
}

export function stepState(state: RunState, deltaMs: number, content: GameContent): RunState {
  if (deltaMs <= 0) return state;
  if (state.introOpen) return state;
  if (state.overlayMode !== 'none' || state.phase !== 'wave') return state;
  const next = clone(state);
  ageFx(next, deltaMs);
  if (next.hitStopMs > 0) {
    next.hitStopMs = Math.max(0, next.hitStopMs - deltaMs);
    return next;
  }
  next.timeMs += deltaMs;
  next.waveElapsedMs += deltaMs;
  while (next.timeMs >= next.nextRegenTickAtMs) {
    applyGlobalRegenTick(next, content);
    next.nextRegenTickAtMs += 1000;
  }
  spawnEnemies(next, content);
  for (const defender of boardDefenders(next)) defenderAttack(next, defender, content);
  for (const enemy of next.enemies) enemyStep(next, enemy, content);
  resolveEnemyDeaths(next, content);
  resolveDefenderDeaths(next, content);
  normalizeLivingDefenders(next, content);
  if (next.saunaHp <= 0) {
    next.saunaHp = 0;
    next.phase = 'lost';
    next.overlayMode = 'intermission';
    awardMeta(next);
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
  const tiles = createHexGrid(content.config.gridRadius);
  const buildableTiles = tiles.filter((tile) => isBuildable(tile, content));
  const selected = getDefender(state, state.selectedDefenderId);
  const selectedLoot = getInventoryDrop(state, state.selectedInventoryDropId);
  const currentWave = state.currentWave;
  const activeMs = Math.max(0, state.sisu.activeUntilMs - state.timeMs);
  const cdMs = Math.max(0, state.sisu.cooldownUntilMs - state.timeMs);
  const saunaDefender = getDefender(state, state.saunaDefenderId);
  const action = actionCopy(state, content);
  const boardCount = boardDefenders(state).length;
  const readyBenchCount = state.defenders.filter((defender) => defender.location === 'ready').length;
  const freeRecruitSlots = Math.max(0, rosterCap(state, content) - livingDefenders(state).length);
  const activeGlobalModifiers = state.activeGlobalModifierIds
    .map((modifierId) => globalModifierHudEntry(state, content.globalModifierDefinitions[modifierId], content));
  const draftGlobalModifiers = state.globalModifierDraftOffers
    .map((modifierId) => globalModifierHudEntry(state, content.globalModifierDefinitions[modifierId], content));
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
    isPaused: state.overlayMode === 'paused',
    showIntermission: state.overlayMode === 'intermission',
    introOpen: state.introOpen,
    waveNumber: currentWave.index,
    enemiesRemaining: state.pendingSpawns.length + state.enemies.length,
    isBossWave: currentWave.isBoss,
    nextWaveThreat: `${pressureLabel(currentWave.pressure)} pressure`,
    nextWavePattern: patternLabel(currentWave),
    pressureSignals: pressureSignals(state, content),
    boardCount,
    boardCap: content.config.boardCap,
    placedBoardLabel: `${boardCount}/${content.config.boardCap} heroes placed`,
    rosterCount: livingDefenders(state).length,
    rosterCap: rosterCap(state, content),
    inventoryUnlocked: inventoryUnlocked(state),
    inventoryCount: state.inventory.length,
    inventoryCap: inventoryCap(state, content),
    inventoryOpen: inventoryUnlocked(state) ? state.inventoryOpen : false,
    recruitmentOpen: state.recruitmentOpen,
    hasRecentLoot: state.recentDropId !== null,
    saunaOccupantName: saunaDefender?.name ?? null,
    saunaOccupancyLabel: `${saunaOccupancy(state)}/${content.config.saunaCap}`,
    saunaSelected: state.selectedMapTarget === 'sauna',
    saunaHp: state.saunaHp,
    maxSaunaHp: content.config.saunaHp,
    sisu: state.sisu.current,
    canUseSisu: state.overlayMode === 'none' && canUseSisu(state, content),
    sisuLabel: activeMs > 0 ? `SISU active ${Math.ceil(activeMs / 1000)} s` : cdMs > 0 ? `SISU cooldown ${Math.ceil(cdMs / 1000)} s` : `SISU ready (${content.config.sisuAbilityCost})`,
    canPause: state.phase === 'wave',
    canOpenRecruitment: canAccessRecruitment(state),
    recruitmentStatusText: recruitmentStatusText(state, content),
    recruitCost: recruitCost(state, content),
    canRecruit: canBuyAnyRecruitOffer(state, content),
    recruitRollCost: recruitRollCost(state, content),
    canRollRecruitOffers: canRollRecruitOffers(state, content),
    hasRecruitOffers: state.recruitOffers.length > 0,
    recruitOffers: state.recruitOffers.map((offer) => {
      const roleStats = derivedStats(state, offer.candidate, content, false);
      return {
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
        range: roleStats.range
      };
    }),
    steamEarned: state.steamEarned,
    bankedSteam: state.meta.steam,
    metaShopUnlockCost: content.config.metaShopUnlockCost,
    canUnlockMetaShop: state.meta.steam >= content.config.metaShopUnlockCost && !state.meta.shopUnlocked,
    metaShopUnlocked: state.meta.shopUnlocked,
    actionTitle: action.title,
    actionBody: action.body,
    readyBenchCount,
    freeRecruitSlots,
    rosterEntries: state.defenders.filter((defender) => defender.location !== 'dead').sort((left, right) => {
      const order: Record<DefenderLocation, number> = { board: 0, sauna: 1, ready: 2, dead: 3 };
      return (order[left.location] - order[right.location]) || left.name.localeCompare(right.name);
    }).map((defender) => {
      const stats = derivedStats(state, defender, content);
      return {
        id: defender.id,
        name: defender.name,
        title: defender.title,
        templateName: content.defenderTemplates[defender.templateId].name,
        subclassName: subclassSummary(defender, content),
        roleSummary: content.defenderTemplates[defender.templateId].role,
        locationLabel:
          defender.location === 'board'
            ? 'On Board'
            : defender.location === 'sauna'
              ? 'In Sauna'
              : defender.location === 'ready'
                ? 'On Bench'
                : 'Fallen',
        summary: `Lvl ${defender.level} ${subclassSummary(defender, content)} · ${stats.damage} ATK · ${stats.defense} DEF`,
        level: defender.level,
        hp: defender.hp,
        maxHp: stats.maxHp,
        damage: stats.damage,
        heal: stats.heal,
        range: stats.range,
        defense: stats.defense,
        regenHpPerSecond: stats.regenHpPerSecond,
        location: defender.location,
        selected: state.selectedDefenderId === defender.id
      };
    }),
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
        hp: selected.hp,
        maxHp: stats.maxHp,
        damage: stats.damage,
        heal: stats.heal,
        range: stats.range,
        attackCooldownMs: stats.attackCooldownMs,
          defense: stats.defense,
          regenHpPerSecond: stats.regenHpPerSecond,
          itemSlotCount: itemSlotCap(state, content),
          skillSlotCount: skillSlotCap(),
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
      occupantName: saunaDefender?.name ?? null,
      occupantTitle: saunaDefender?.title ?? null,
      occupantRole: saunaDefender ? content.defenderTemplates[saunaDefender.templateId].name : null,
      occupantLore: saunaDefender?.lore ?? null,
      occupantHp: saunaDefender?.hp ?? null,
      occupantMaxHp: saunaDefender ? derivedStats(state, saunaDefender, content).maxHp : null,
      autoDeployUnlocked: hasSaunaAutoDeploy(state),
      slapSwapUnlocked: hasSaunaSlapSwap(state)
    } : null,
    globalModifiers: activeGlobalModifiers,
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
        unlockLevel: definition.unlockLevel
      };
    }),
    showSubclassDraft: state.overlayMode === 'subclass_draft',
    wavePreview: waveCounts(currentWave, content),
    metaUpgrades: META_IDS.map((upgradeId) => {
      const cost = metaCost(state, upgradeId, content);
      return {
        id: upgradeId,
        name: content.metaUpgrades[upgradeId].name,
        description: content.metaUpgrades[upgradeId].description,
        level: state.meta.upgrades[upgradeId],
        cost,
        affordable: cost !== null && state.meta.steam >= cost,
        maxed: cost === null
      };
    })
  };
  return {
    state,
    config: content.config,
    defenderTemplates: content.defenderTemplates,
    enemyArchetypes: content.enemyArchetypes,
    itemDefinitions: content.itemDefinitions,
    skillDefinitions: content.skillDefinitions,
    globalModifierDefinitions: content.globalModifierDefinitions,
    metaUpgrades: content.metaUpgrades,
    hud,
    tiles,
    buildableTiles,
    spawnTiles: content.config.spawnLanes.map((lane) => ({ ...lane }))
  };
}
