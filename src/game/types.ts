export interface AxialCoord {
  q: number;
  r: number;
}

export type Team = 'player' | 'enemy';
export type Phase = 'prep' | 'wave' | 'lost';
export type OverlayMode = 'none' | 'paused' | 'intermission';
export type DefenderTemplateId = 'guardian' | 'hurler' | 'mender';
export type EnemyUnitId = 'raider' | 'brute' | 'chieftain';
export type ItemId = 'ladle' | 'coal_heart' | 'towel_wrap' | 'bucket_boots' | 'birch_charm';
export type SkillId = 'fireball' | 'spin2win' | 'blink_step';
export type LootKind = 'item' | 'skill';
export type Rarity = 'common' | 'rare' | 'epic';
export type DefenderLocation = 'ready' | 'board' | 'sauna' | 'dead';
export type WavePattern = 'tutorial' | 'split' | 'staggered' | 'spearhead' | 'surge' | 'boss_pressure' | 'boss_breach';
export type BossCategory = 'pressure' | 'breach';
export type CombatFxKind = 'hit' | 'heal' | 'fireball' | 'spin' | 'blink' | 'boss_hit';
export type MetaUpgradeId =
  | 'roster_capacity'
  | 'inventory_slots'
  | 'loot_luck'
  | 'loot_rarity'
  | 'item_slots';

export interface UnitStats {
  maxHp: number;
  damage: number;
  heal: number;
  range: number;
  attackCooldownMs: number;
}

export interface StatModifier {
  maxHp?: number;
  damage?: number;
  heal?: number;
  range?: number;
  attackCooldownMs?: number;
}

export interface DefenderTemplate {
  id: DefenderTemplateId;
  name: string;
  role: string;
  fill: string;
  outline: string;
  label: string;
  stats: UnitStats;
}

export interface EnemyArchetype {
  id: EnemyUnitId;
  name: string;
  maxHp: number;
  damage: number;
  range: number;
  attackCooldownMs: number;
  moveCooldownMs: number;
  fill: string;
  outline: string;
  label: string;
  threat: number;
}

export interface ItemDefinition {
  id: ItemId;
  kind: 'item';
  name: string;
  rarity: Rarity;
  effectText: string;
  flavorText: string;
  artPath: string;
  modifiers: StatModifier;
}

export interface SkillDefinition {
  id: SkillId;
  kind: 'skill';
  name: string;
  rarity: Rarity;
  effectText: string;
  flavorText: string;
  artPath: string;
}

export interface InventoryDrop {
  instanceId: number;
  kind: LootKind;
  definitionId: ItemId | SkillId;
  rarity: Rarity;
  name: string;
  effectText: string;
  flavorText: string;
  artPath: string;
  waveFound: number;
  sourceEnemyId: EnemyUnitId;
}

export interface RecruitOffer {
  offerId: number;
  price: number;
  quality: 'rough' | 'solid' | 'elite';
  candidate: DefenderInstance;
}

export interface CombatFxEvent {
  id: number;
  kind: CombatFxKind;
  tile: AxialCoord;
  secondaryTile?: AxialCoord | null;
  ageMs: number;
  durationMs: number;
}

export interface DefenderInstance {
  id: string;
  templateId: DefenderTemplateId;
  name: string;
  title: string;
  lore: string;
  tokenStyleId: number;
  stats: UnitStats;
  hp: number;
  location: DefenderLocation;
  tile: AxialCoord | null;
  attackReadyAtMs: number;
  items: ItemId[];
  skills: SkillId[];
  kills: number;
}

export interface EnemyInstance {
  instanceId: number;
  archetypeId: EnemyUnitId;
  tokenStyleId: number;
  tile: AxialCoord;
  hp: number;
  attackReadyAtMs: number;
  moveReadyAtMs: number;
}

export interface WaveSpawn {
  atMs: number;
  enemyId: EnemyUnitId;
  laneIndex: number;
}

export interface WaveDefinition {
  index: number;
  isBoss: boolean;
  rewardSisu: number;
  pressure: number;
  pattern: WavePattern;
  bossCategory: BossCategory | null;
  spawns: WaveSpawn[];
}

export interface MetaUpgradeDefinition {
  id: MetaUpgradeId;
  name: string;
  description: string;
  baseCost: number;
  costStep: number;
  maxLevel: number;
}

export interface MetaProgress {
  steam: number;
  completedRuns: number;
  shopUnlocked: boolean;
  upgrades: Record<MetaUpgradeId, number>;
}

export interface GameConfig {
  gridRadius: number;
  buildRadius: number;
  saunaHp: number;
  startingSisu: number;
  sisuAbilityCost: number;
  sisuDurationMs: number;
  sisuCooldownMs: number;
  sisuAttackMultiplier: number;
  sisuDamageMultiplier: number;
  boardCap: number;
  saunaCap: number;
  baseRosterCap: number;
  baseInventoryCap: number;
  baseItemSlots: number;
  recruitBaseCost: number;
  recruitCostStep: number;
  steamPerSaunaWave: number;
  saunaHealPerPrep: number;
  baseLootChance: number;
  bossLootChance: number;
  bossEvery: number;
  cyclePressureBase: number;
  cyclePressureStep: number;
  wavePressureStep: number;
  minSpawnIntervalMs: number;
  spawnIntervalStepMs: number;
  recruitWaveStep: number;
  lowSisuThreshold: number;
  lowSaunaHintRatio: number;
  metaShopUnlockCost: number;
  spawnLanes: AxialCoord[];
}

export interface NamePools {
  first: string[];
  last: string[];
  title: string[];
  loreHooks: Record<DefenderTemplateId, string[]>;
  loreQuirks: string[];
}

export interface GameContent {
  config: GameConfig;
  defenderTemplates: Record<DefenderTemplateId, DefenderTemplate>;
  enemyArchetypes: Record<EnemyUnitId, EnemyArchetype>;
  itemDefinitions: Record<ItemId, ItemDefinition>;
  skillDefinitions: Record<SkillId, SkillDefinition>;
  metaUpgrades: Record<MetaUpgradeId, MetaUpgradeDefinition>;
  namePools: NamePools;
}

export interface SisuState {
  current: number;
  activeUntilMs: number;
  cooldownUntilMs: number;
}

export interface RunState {
  phase: Phase;
  overlayMode: OverlayMode;
  inventoryOpen: boolean;
  timeMs: number;
  waveIndex: number;
  waveElapsedMs: number;
  currentWave: WaveDefinition;
  seed: number;
  selectedDefenderId: string | null;
  hoveredTile: AxialCoord | null;
  defenders: DefenderInstance[];
  enemies: EnemyInstance[];
  fxEvents: CombatFxEvent[];
  hitStopMs: number;
  saunaDefenderId: string | null;
  pendingSpawns: WaveSpawn[];
  nextEnemyInstanceId: number;
  nextLootInstanceId: number;
  nextRecruitOfferId: number;
  nextFxEventId: number;
  inventory: InventoryDrop[];
  selectedInventoryDropId: number | null;
  recentDropId: number | null;
  recruitOffers: RecruitOffer[];
  sisu: SisuState;
  steamEarned: number;
  gambleCount: number;
  saunaHp: number;
  meta: MetaProgress;
  message: string;
  metaAwarded: boolean;
}

export interface WavePreviewEntry {
  id: EnemyUnitId;
  name: string;
  count: number;
}

export interface HudRosterEntry {
  id: string;
  name: string;
  title: string;
  templateName: string;
  summary: string;
  hp: number;
  maxHp: number;
  location: DefenderLocation;
  selected: boolean;
}

export interface HudInventoryEntry {
  id: number;
  kind: LootKind;
  name: string;
  rarity: Rarity;
  effectText: string;
  flavorText: string;
  artPath: string;
  waveFound: number;
  isRecent: boolean;
  selected: boolean;
}

export interface HudSelectedDefender {
  id: string;
  name: string;
  title: string;
  lore: string;
  templateName: string;
  hp: number;
  maxHp: number;
  damage: number;
  heal: number;
  range: number;
  attackCooldownMs: number;
  itemSlotCount: number;
  skillSlotCount: number;
  itemNames: string[];
  skillNames: string[];
  location: DefenderLocation;
}

export interface HudMetaUpgradeEntry {
  id: MetaUpgradeId;
  name: string;
  description: string;
  level: number;
  cost: number | null;
  affordable: boolean;
  maxed: boolean;
}

export interface HudRecruitOfferEntry {
  id: number;
  price: number;
  quality: 'rough' | 'solid' | 'elite';
  name: string;
  title: string;
  roleName: string;
  roleSummary: string;
  lore: string;
  hp: number;
  damage: number;
  heal: number;
  range: number;
}

export interface HudViewModel {
  phaseLabel: string;
  statusText: string;
  overlayMode: OverlayMode;
  isPaused: boolean;
  showIntermission: boolean;
  waveNumber: number;
  enemiesRemaining: number;
  isBossWave: boolean;
  nextWaveThreat: string;
  nextWavePattern: string;
  pressureSignals: string[];
  boardCount: number;
  boardCap: number;
  rosterCount: number;
  rosterCap: number;
  inventoryCount: number;
  inventoryCap: number;
  inventoryOpen: boolean;
  hasRecentLoot: boolean;
  saunaOccupantName: string | null;
  saunaHp: number;
  maxSaunaHp: number;
  sisu: number;
  canUseSisu: boolean;
  sisuLabel: string;
  canPause: boolean;
  recruitCost: number;
  canRecruit: boolean;
  recruitRollCost: number;
  canRollRecruitOffers: boolean;
  hasRecruitOffers: boolean;
  recruitOffers: HudRecruitOfferEntry[];
  steamEarned: number;
  bankedSteam: number;
  metaShopUnlockCost: number;
  canUnlockMetaShop: boolean;
  metaShopUnlocked: boolean;
  actionTitle: string;
  actionBody: string;
  rosterEntries: HudRosterEntry[];
  inventoryEntries: HudInventoryEntry[];
  selectedInventoryEntry: HudInventoryEntry | null;
  canAutoAssignSelectedLoot: boolean;
  selectedDefender: HudSelectedDefender | null;
  wavePreview: WavePreviewEntry[];
  metaUpgrades: HudMetaUpgradeEntry[];
}

export interface GameSnapshot {
  state: RunState;
  config: GameConfig;
  defenderTemplates: GameContent['defenderTemplates'];
  enemyArchetypes: GameContent['enemyArchetypes'];
  itemDefinitions: GameContent['itemDefinitions'];
  skillDefinitions: GameContent['skillDefinitions'];
  metaUpgrades: GameContent['metaUpgrades'];
  hud: HudViewModel;
  tiles: AxialCoord[];
  buildableTiles: AxialCoord[];
  spawnTiles: AxialCoord[];
}

export type InputAction =
  | { type: 'selectDefender'; defenderId: string }
  | { type: 'clearSelection' }
  | { type: 'selectInventoryDrop'; dropId: number }
  | { type: 'clearSelectedInventoryDrop' }
  | { type: 'toggleInventory' }
  | { type: 'placeSelectedDefender'; tile: AxialCoord }
  | { type: 'hoverTile'; tile: AxialCoord | null }
  | { type: 'startWave' }
  | { type: 'togglePause' }
  | { type: 'activateSisu' }
  | { type: 'recallDefenderToSauna'; defenderId: string }
  | { type: 'rollRecruitOffers' }
  | { type: 'recruitOffer'; offerId: number }
  | { type: 'clearRecruitOffers' }
  | { type: 'equipInventoryDrop'; dropId: number; defenderId: string }
  | { type: 'autoAssignInventoryDrop'; dropId: number }
  | { type: 'dismissRecentDrop' }
  | { type: 'buyMetaUpgrade'; upgradeId: MetaUpgradeId }
  | { type: 'unlockMetaShop' }
  | { type: 'startNextRun' }
  | { type: 'restartRun' };

export interface GameRuntimeConfig {
  canvas: HTMLCanvasElement;
  content: GameContent;
  storage?: Storage | null;
}

export interface GameRuntime {
  start(): void;
  stop(): void;
  resize(): void;
  dispatch(action: InputAction): void;
  subscribe(listener: (snapshot: GameSnapshot) => void): () => void;
  getSnapshot(): GameSnapshot;
}
