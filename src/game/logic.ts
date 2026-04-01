import type {
  AxialCoord,
  BossCategory,
  DefenderInstance,
  DefenderLocation,
  DefenderTemplateId,
  EnemyInstance,
  EnemyUnitId,
  GameContent,
  GameSnapshot,
  HudViewModel,
  InputAction,
  InventoryDrop,
  ItemId,
  MetaProgress,
  MetaUpgradeId,
  RunState,
  SkillId,
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
const ENEMY_IDS: EnemyUnitId[] = ['raider', 'brute', 'chieftain'];
const META_IDS: MetaUpgradeId[] = [
  'roster_capacity',
  'inventory_slots',
  'loot_luck',
  'loot_rarity',
  'item_slots'
];
const NON_BOSS_PATTERNS: Array<Exclude<WavePattern, 'tutorial' | 'boss_pressure' | 'boss_breach'>> = [
  'split',
  'staggered',
  'spearhead',
  'surge'
];
const CENTER: AxialCoord = { q: 0, r: 0 };

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
      item_slots: 0
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

function inventoryCap(state: RunState, content: GameContent): number {
  return content.config.baseInventoryCap + state.meta.upgrades.inventory_slots;
}

function itemSlotCap(state: RunState, content: GameContent): number {
  return content.config.baseItemSlots + state.meta.upgrades.item_slots;
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

function statsWithItems(defender: DefenderInstance, content: GameContent): UnitStats {
  const bonus = defender.items.reduce(
    (totals, itemId) => {
      const item = content.itemDefinitions[itemId];
      totals.maxHp += item.modifiers.maxHp ?? 0;
      totals.damage += item.modifiers.damage ?? 0;
      totals.heal += item.modifiers.heal ?? 0;
      totals.range += item.modifiers.range ?? 0;
      totals.attackCooldownMs += item.modifiers.attackCooldownMs ?? 0;
      return totals;
    },
    { maxHp: 0, damage: 0, heal: 0, range: 0, attackCooldownMs: 0 }
  );

  return {
    maxHp: Math.max(6, defender.stats.maxHp + bonus.maxHp),
    damage: Math.max(1, defender.stats.damage + bonus.damage),
    heal: Math.max(0, defender.stats.heal + bonus.heal),
    range: Math.max(1, defender.stats.range + bonus.range),
    attackCooldownMs: Math.max(360, defender.stats.attackCooldownMs + bonus.attackCooldownMs)
  };
}

function normalizeDefender(defender: DefenderInstance, content: GameContent): void {
  defender.hp = Math.min(defender.hp, statsWithItems(defender, content).maxHp);
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
    attackCooldownMs: rollStat(state, template.stats.attackCooldownMs, 200, 360)
  };
  return {
    id: `${templateId}-${Math.round(rng(state) * 1e9).toString(16)}`,
    templateId,
    name: name.name,
    title: name.title,
    lore: generateLore(state, templateId, content),
    tokenStyleId: randomInt(state, 0, 9),
    stats,
    hp: stats.maxHp,
    location: 'ready',
    tile: null,
    attackReadyAtMs: 0,
    items: [],
    skills: [],
    kills: 0
  };
}

function buildRoster(state: RunState, content: GameContent): DefenderInstance[] {
  const defenders: DefenderInstance[] = [];
  for (let index = 0; index < 5; index += 1) {
    const defender = newDefender(state, DEF_IDS[index % DEF_IDS.length], content);
    defender.location = index === 4 ? 'sauna' : 'ready';
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

function canUseSisu(state: RunState, content: GameContent): boolean {
  return state.phase === 'wave' && state.sisu.current >= content.config.sisuAbilityCost && state.timeMs >= state.sisu.cooldownUntilMs;
}

function recruitCost(state: RunState, content: GameContent): number {
  const cycleTax = cycleNumber(state.waveIndex, content) * content.config.recruitWaveStep;
  const waveTax = Math.floor(Math.max(0, state.waveIndex - 1) / 4) * content.config.recruitWaveStep;
  return content.config.recruitBaseCost + state.gambleCount * content.config.recruitCostStep + cycleTax + waveTax;
}

function enemiesInRange(state: RunState, tile: AxialCoord, range: number): EnemyInstance[] {
  return state.enemies
    .filter((enemy) => hexDistance(tile, enemy.tile) <= range)
    .sort((left, right) => (hexDistance(tile, left.tile) - hexDistance(tile, right.tile)) || (left.hp - right.hp));
}

function nearestEnemy(state: RunState, tile: AxialCoord): EnemyInstance | null {
  return [...state.enemies].sort((left, right) => (hexDistance(tile, left.tile) - hexDistance(tile, right.tile)) || (left.hp - right.hp))[0] ?? null;
}

function alliesToHeal(state: RunState, defender: DefenderInstance, stats: UnitStats, content: GameContent): DefenderInstance[] {
  if (!defender.tile) return [];
  return boardDefenders(state)
    .filter((ally) => ally.id !== defender.id && ally.tile)
    .filter((ally) => ally.hp < statsWithItems(ally, content).maxHp && hexDistance(defender.tile as AxialCoord, ally.tile as AxialCoord) <= stats.range)
    .sort((left, right) => {
      const leftMissing = statsWithItems(left, content).maxHp - left.hp;
      const rightMissing = statsWithItems(right, content).maxHp - right.hp;
      return (rightMissing - leftMissing) || (left.hp - right.hp);
    });
}

function tryBlink(state: RunState, defender: DefenderInstance, content: GameContent): boolean {
  if (!defender.tile || !defender.skills.includes('blink_step')) return false;
  const enemy = nearestEnemy(state, defender.tile);
  if (!enemy) return false;
  const tile = DIRS.map((dir) => add(defender.tile as AxialCoord, dir))
    .filter((next) => isBuildable(next, content) && !occupied(state, next))
    .sort((left, right) => hexDistance(left, enemy.tile) - hexDistance(right, enemy.tile))[0];
  if (!tile) return false;
  defender.tile = tile;
  return true;
}

function maybeDrop(state: RunState, enemyId: EnemyUnitId, content: GameContent): void {
  if (state.inventory.length >= inventoryCap(state, content)) return;
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
  state.inventory.push(drop);
  state.recentDropId = drop.instanceId;
  state.selectedInventoryDropId = drop.instanceId;
  state.message = `${drop.name} looted. Pause if you want to think before equipping it.`;
}

function resolveEnemyDeaths(state: RunState, content: GameContent): void {
  const living: EnemyInstance[] = [];
  for (const enemy of state.enemies) {
    if (enemy.hp > 0) {
      living.push(enemy);
      continue;
    }
    maybeDrop(state, enemy.archetypeId, content);
  }
  state.enemies = living;
}

function resolveDefenderDeaths(state: RunState): void {
  for (const defender of state.defenders) {
    if (defender.location !== 'dead' && defender.hp <= 0) {
      defender.location = 'dead';
      defender.tile = null;
      if (state.saunaDefenderId === defender.id) state.saunaDefenderId = null;
      if (state.selectedDefenderId === defender.id) state.selectedDefenderId = null;
    }
  }
}

function defenderAttack(state: RunState, defender: DefenderInstance, content: GameContent): void {
  if (!defender.tile || defender.location !== 'board' || state.timeMs < defender.attackReadyAtMs) return;
  const stats = statsWithItems(defender, content);
  const dmgMult = state.timeMs < state.sisu.activeUntilMs ? content.config.sisuDamageMultiplier : 1;
  const cdMult = state.timeMs < state.sisu.activeUntilMs ? content.config.sisuAttackMultiplier : 1;
  const ally = stats.heal > 0 ? alliesToHeal(state, defender, stats, content)[0] : null;
  if (ally) {
    ally.hp = Math.min(statsWithItems(ally, content).maxHp, ally.hp + Math.round(stats.heal * dmgMult));
    defender.attackReadyAtMs = state.timeMs + stats.attackCooldownMs / cdMult;
    return;
  }
  let target = enemiesInRange(state, defender.tile, stats.range)[0] ?? null;
  if (!target && tryBlink(state, defender, content)) target = enemiesInRange(state, defender.tile, stats.range)[0] ?? null;
  if (!target) return;
  target.hp -= Math.round(stats.damage * dmgMult);
  if (defender.skills.includes('fireball')) {
    for (const enemy of state.enemies) if (enemy.instanceId !== target.instanceId && hexDistance(enemy.tile, target.tile) <= 1) enemy.hp -= Math.max(1, Math.round(stats.damage * 0.35));
  }
  if (defender.skills.includes('spin2win')) {
    for (const enemy of state.enemies) if (enemy.instanceId !== target.instanceId && hexDistance(enemy.tile, defender.tile) <= 1) enemy.hp -= Math.max(1, Math.round(stats.damage * 0.5));
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
      enemy.attackReadyAtMs = state.timeMs + archetype.attackCooldownMs;
      return;
    }
    if (target) {
      target.hp -= archetype.damage;
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
      attackReadyAtMs: state.timeMs + archetype.attackCooldownMs,
      moveReadyAtMs: state.timeMs + archetype.moveCooldownMs
    });
  }
  state.pendingSpawns = waiting;
}

function healSauna(state: RunState, content: GameContent): void {
  const saunaDefender = getDefender(state, state.saunaDefenderId);
  if (!saunaDefender || saunaDefender.location !== 'sauna') return;
  saunaDefender.hp = Math.min(statsWithItems(saunaDefender, content).maxHp, saunaDefender.hp + content.config.saunaHealPerPrep);
}

function startWaveState(state: RunState, waveDef: WaveDefinition, message: string): void {
  state.overlayMode = 'none';
  state.phase = 'wave';
  state.waveElapsedMs = 0;
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

function metaCost(state: RunState, upgradeId: MetaUpgradeId, content: GameContent): number | null {
  const def = content.metaUpgrades[upgradeId];
  const level = state.meta.upgrades[upgradeId];
  if (level >= def.maxLevel) return null;
  return def.baseCost + def.costStep * level;
}

function getInventoryDrop(state: RunState, dropId: number | null): InventoryDrop | null {
  return dropId === null ? null : state.inventory.find((drop) => drop.instanceId === dropId) ?? null;
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
  const injured = living.filter((defender) => defender.hp / statsWithItems(defender, content).maxHp <= 0.45).length;
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

function actionCopy(state: RunState): { title: string; body: string } {
  const selectedLoot = getInventoryDrop(state, state.selectedInventoryDropId);
  const selectedDefender = getDefender(state, state.selectedDefenderId);

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
  if (selectedLoot && selectedDefender) {
    return {
      title: 'Equip Opportunity',
      body: `${selectedLoot.name} is ready for ${selectedDefender.name}. ${selectedLoot.effectText}`
    };
  }
  if (selectedLoot) {
    return {
      title: 'Loot Waiting',
      body: `${selectedLoot.name}: ${selectedLoot.flavorText}`
    };
  }
  if (selectedDefender && selectedDefender.location !== 'board') {
    return {
      title: 'Place Defender',
      body: `Drop ${selectedDefender.name} onto a free build hex to reinforce the sauna line.`
    };
  }
  if (state.phase === 'prep') {
    return {
      title: state.currentWave.isBoss ? 'Boss Prep' : 'Prep Window',
      body: state.currentWave.isBoss
        ? 'This is the clean break before a boss. Set the board, spend SISU carefully, then start when ready.'
        : 'Set the board, decide whether to gamble a recruit, and start when your lanes make sense.'
    };
  }
  return {
    title: state.currentWave.isBoss ? 'Boss Pressure' : 'Hold The Line',
    body: state.currentWave.isBoss
      ? 'Keep the center alive, use pause if you need to assign loot, and watch for direct sauna breaches.'
      : 'Non-boss waves will keep chaining, so stabilize attrition before the next spike arrives.'
  };
}

export function createInitialState(
  content: GameContent,
  meta: MetaProgress = createDefaultMetaProgress(),
  seed = 123456789,
  showIntermission = meta.completedRuns > 0
): RunState {
  const state: RunState = {
    phase: 'prep',
    overlayMode: showIntermission ? 'intermission' : 'none',
    timeMs: 0,
    waveIndex: 1,
    waveElapsedMs: 0,
    currentWave: createWaveDefinition(1, content),
    seed,
    selectedDefenderId: null,
    hoveredTile: null,
    defenders: [],
    enemies: [],
    saunaDefenderId: null,
    pendingSpawns: [],
    nextEnemyInstanceId: 1,
    nextLootInstanceId: 1,
    inventory: [],
    selectedInventoryDropId: null,
    recentDropId: null,
    sisu: { current: content.config.startingSisu, activeUntilMs: 0, cooldownUntilMs: 0 },
    steamEarned: 0,
    gambleCount: 0,
    saunaHp: content.config.saunaHp,
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
      state.meta.completedRuns > 0
    );
  }
  if (action.type === 'startNextRun') {
    return state.overlayMode === 'intermission'
      ? createInitialState(content, state.meta, (Date.now() >>> 0) || 1, false)
      : state;
  }
  const next = clone(state);

  switch (action.type) {
    case 'selectDefender': {
      const defender = getDefender(next, action.defenderId);
      if (!defender || defender.location === 'dead') return next;
      next.selectedDefenderId = defender.id;
      next.message = `${defender.name} ${defender.title} selected.`;
      return next;
    }
    case 'clearSelection':
      next.selectedDefenderId = null;
      return next;
    case 'selectInventoryDrop': {
      const drop = getInventoryDrop(next, action.dropId);
      if (!drop) return next;
      next.selectedInventoryDropId = drop.instanceId;
      next.message = `${drop.name} ready to equip.`;
      return next;
    }
    case 'clearSelectedInventoryDrop':
      next.selectedInventoryDropId = null;
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
      defender.attackReadyAtMs = next.timeMs + statsWithItems(defender, content).attackCooldownMs;
      if (next.saunaDefenderId === defender.id) next.saunaDefenderId = null;
      next.selectedDefenderId = null;
      next.message = `${defender.name} entered the fight.`;
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
      startWaveState(
        next,
        next.currentWave,
        next.currentWave.isBoss
          ? `Boss wave ${next.currentWave.index} started.`
          : `Wave ${next.currentWave.index} started.`
      );
      return next;
    case 'gambleRecruit': {
      if (next.overlayMode !== 'none' || next.phase !== 'prep') return next;
      const cost = recruitCost(next, content);
      if (next.sisu.current < cost) {
        next.message = 'Not enough SISU for a recruit gamble.';
        return next;
      }
      if (livingDefenders(next).length >= rosterCap(next, content)) {
        next.message = 'Roster cap reached.';
        return next;
      }
      next.sisu.current -= cost;
      next.gambleCount += 1;
      const recruit = newDefender(next, pick(next, DEF_IDS), content);
      next.defenders.push(recruit);
      next.message = `${recruit.name} ${recruit.title} joined for ${cost} SISU.`;
      return next;
    }
    case 'equipInventoryDrop': {
      const dropIndex = next.inventory.findIndex((drop) => drop.instanceId === action.dropId);
      const defender = getDefender(next, action.defenderId);
      if (dropIndex < 0 || !defender || defender.location === 'dead') return next;
      const drop = next.inventory[dropIndex];
      const prevMax = statsWithItems(defender, content).maxHp;
      if (drop.kind === 'item') {
        if (defender.items.length >= itemSlotCap(next, content)) {
          next.message = `${defender.name} has no free item slot.`;
          return next;
        }
        defender.items.push(drop.definitionId as ItemId);
      } else {
        if (defender.skills.length >= 1) {
          next.message = `${defender.name} already knows a skill.`;
          return next;
        }
        defender.skills.push(drop.definitionId as SkillId);
      }
      next.inventory.splice(dropIndex, 1);
      next.recentDropId = next.inventory.length > 0 ? next.inventory[next.inventory.length - 1].instanceId : null;
      next.selectedInventoryDropId =
        next.selectedInventoryDropId === drop.instanceId
          ? next.inventory[0]?.instanceId ?? null
          : next.selectedInventoryDropId;
      defender.hp += Math.max(0, statsWithItems(defender, content).maxHp - prevMax);
      normalizeDefender(defender, content);
      next.message = `${drop.name} equipped on ${defender.name}.`;
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
  if (state.overlayMode !== 'none' || state.phase !== 'wave') return state;
  const next = clone(state);
  next.timeMs += deltaMs;
  next.waveElapsedMs += deltaMs;
  spawnEnemies(next, content);
  for (const defender of boardDefenders(next)) defenderAttack(next, defender, content);
  for (const enemy of next.enemies) enemyStep(next, enemy, content);
  resolveEnemyDeaths(next, content);
  resolveDefenderDeaths(next);
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
  const action = actionCopy(state);
  const hud: HudViewModel = {
    phaseLabel:
      state.overlayMode === 'intermission'
        ? 'Intermission'
        : state.overlayMode === 'paused'
          ? 'Paused'
          : state.phase === 'prep'
            ? 'Valmistelu'
            : state.phase === 'wave'
              ? 'Aalto kaynnissa'
              : 'Run ohi',
    statusText: state.message,
    overlayMode: state.overlayMode,
    isPaused: state.overlayMode === 'paused',
    showIntermission: state.overlayMode === 'intermission',
    waveNumber: currentWave.index,
    enemiesRemaining: state.pendingSpawns.length + state.enemies.length,
    isBossWave: currentWave.isBoss,
    nextWaveThreat: `${pressureLabel(currentWave.pressure)} pressure`,
    nextWavePattern: patternLabel(currentWave),
    pressureSignals: pressureSignals(state, content),
    boardCount: boardDefenders(state).length,
    boardCap: content.config.boardCap,
    rosterCount: livingDefenders(state).length,
    rosterCap: rosterCap(state, content),
    inventoryCount: state.inventory.length,
    inventoryCap: inventoryCap(state, content),
    saunaOccupantName: saunaDefender?.name ?? null,
    saunaHp: state.saunaHp,
    maxSaunaHp: content.config.saunaHp,
    sisu: state.sisu.current,
    canUseSisu: state.overlayMode === 'none' && canUseSisu(state, content),
    sisuLabel: activeMs > 0 ? `SISU active ${Math.ceil(activeMs / 1000)} s` : cdMs > 0 ? `SISU cooldown ${Math.ceil(cdMs / 1000)} s` : `SISU ready (${content.config.sisuAbilityCost})`,
    canPause: state.phase === 'wave',
    recruitCost: recruitCost(state, content),
    canRecruit: state.overlayMode === 'none' && state.phase === 'prep' && state.sisu.current >= recruitCost(state, content) && livingDefenders(state).length < rosterCap(state, content),
    steamEarned: state.steamEarned,
    bankedSteam: state.meta.steam,
    metaShopUnlockCost: content.config.metaShopUnlockCost,
    canUnlockMetaShop: state.meta.steam >= content.config.metaShopUnlockCost && !state.meta.shopUnlocked,
    metaShopUnlocked: state.meta.shopUnlocked,
    actionTitle: action.title,
    actionBody: action.body,
    rosterEntries: [...state.defenders].sort((left, right) => {
      const order: Record<DefenderLocation, number> = { board: 0, sauna: 1, ready: 2, dead: 3 };
      return (order[left.location] - order[right.location]) || left.name.localeCompare(right.name);
    }).map((defender) => ({
      id: defender.id,
      name: defender.name,
      title: defender.title,
      templateName: content.defenderTemplates[defender.templateId].name,
      summary: `${defender.location === 'board' ? 'Laudalla' : defender.location === 'sauna' ? 'Saunassa' : defender.location === 'ready' ? 'Valmiina' : 'Kaatunut'} · ${statsWithItems(defender, content).damage} ATK`,
      hp: defender.hp,
      maxHp: statsWithItems(defender, content).maxHp,
      location: defender.location,
      selected: state.selectedDefenderId === defender.id
    })),
    inventoryEntries: state.inventory.map((drop) => ({
      id: drop.instanceId,
      kind: drop.kind,
      name: drop.name,
      rarity: drop.rarity,
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
      effectText: selectedLoot.effectText,
      flavorText: selectedLoot.flavorText,
      artPath: selectedLoot.artPath,
      waveFound: selectedLoot.waveFound,
      isRecent: selectedLoot.instanceId === state.recentDropId,
      selected: true
    } : null,
    selectedDefender: selected ? {
      id: selected.id,
      name: selected.name,
      title: selected.title,
      lore: selected.lore,
      templateName: content.defenderTemplates[selected.templateId].name,
      hp: selected.hp,
      maxHp: statsWithItems(selected, content).maxHp,
      damage: statsWithItems(selected, content).damage,
      heal: statsWithItems(selected, content).heal,
      range: statsWithItems(selected, content).range,
      attackCooldownMs: statsWithItems(selected, content).attackCooldownMs,
      itemSlotCount: itemSlotCap(state, content),
      skillSlotCount: 1,
      itemNames: selected.items.map((itemId) => content.itemDefinitions[itemId].name),
      skillNames: selected.skills.map((skillId) => content.skillDefinitions[skillId].name),
      location: selected.location
    } : null,
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
    metaUpgrades: content.metaUpgrades,
    hud,
    tiles,
    buildableTiles,
    spawnTiles: content.config.spawnLanes.map((lane) => ({ ...lane }))
  };
}
