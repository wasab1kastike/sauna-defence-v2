export interface AxialCoord {
  q: number;
  r: number;
}

export type Team = 'player' | 'enemy';
export type Phase = 'prep' | 'wave' | 'lost';
export type OverlayMode = 'none' | 'paused' | 'intermission' | 'modifier_draft' | 'subclass_draft';
export type DefenderTemplateId = 'guardian' | 'hurler' | 'mender';
export type DefenderSubclassId =
  | 'stonewall'
  | 'emberguard'
  | 'iron_bastion'
  | 'revenge_coals'
  | 'bench_oak'
  | 'steam_bulwark'
  | 'avalanche_oath'
  | 'last_ladle'
  | 'coalflinger'
  | 'bucket_sniper'
  | 'spark_juggler'
  | 'ash_scope'
  | 'volley_tender'
  | 'shock_pitcher'
  | 'meteor_bucket'
  | 'white_heat_gunner'
  | 'steampriest'
  | 'towel_oracle'
  | 'cedar_surgeon'
  | 'calm_whisper'
  | 'pulse_keeper'
  | 'rescue_ritualist'
  | 'saint_of_steam'
  | 'afterglow_warden';
export type BossId = 'pebble' | 'end_user_horde' | 'electric_bather' | 'escalation_manager';
export type EnemyUnitId =
  | 'raider'
  | 'brute'
  | 'chieftain'
  | 'pebble'
  | 'thirsty_user'
  | 'electric_bather'
  | 'escalation_manager';
export type ItemId =
  | 'ladle'
  | 'coal_heart'
  | 'towel_wrap'
  | 'bucket_boots'
  | 'birch_charm'
  | 'cedar_ring'
  | 'ember_amulet'
  | 'iron_whisk'
  | 'sauna_salt';
export type SkillId =
  | 'fireball'
  | 'spin2win'
  | 'blink_step'
  | 'chain_spark'
  | 'steam_shield'
  | 'battle_hymn';
export type LootKind = 'item' | 'skill';
export type Rarity = 'common' | 'rare' | 'epic';
export type AlcoholId =
  | 'light_lager'
  | 'sauna_stout'
  | 'medic_mule'
  | 'sniper_cider'
  | 'boiler_ipa'
  | 'birch_porter'
  | 'lucky_pils'
  | 'overproof_koskenkorva';
export type DefenderLocation = 'ready' | 'board' | 'sauna' | 'dead';
export type WavePattern = 'tutorial' | 'split' | 'staggered' | 'spearhead' | 'surge' | 'boss_pressure' | 'boss_breach';
export type BossCategory = 'pressure' | 'breach';
export type EnemyBehavior = 'standard' | 'pebble' | 'swarm' | 'electric' | 'summoner';
export type CombatFxKind = 'hit' | 'defender_hit' | 'sauna_hit' | 'heal' | 'fireball' | 'spin' | 'blink' | 'boss_hit' | 'chain';
export type MapTarget = 'defender' | 'sauna';
export type HudPanelId = 'modifiers' | 'loot' | 'recruit' | 'beer_shop' | 'metashop';
export type WorldLandmarkId = 'metashop' | 'beer_shop';
export type GlobalModifierCountScope = 'board' | 'living' | 'dead';
export type GlobalModifierEffectStat = 'maxHp' | 'damage' | 'heal' | 'range' | 'attackCooldownMs' | 'defense' | 'regenHpPerSecond';
export type GlobalModifierId =
  | 'iron_brotherhood'
  | 'triage_circle'
  | 'fallen_saints'
  | 'stone_oath'
  | 'bastion_engine'
  | 'coal_echoes'
  | 'scope_lattice'
  | 'oracle_draft'
  | 'afterglow_watch'
  | 'cinder_cadence'
  | 'battle_psalm'
  | 'shield_mist'
  | 'cedar_swear'
  | 'whisk_discipline'
  | 'salt_sight'
  | 'loylylordi_lineage'
  | 'vihtavelho_vow'
  | 'saunklonkku_requiem'
  | 'shared_grit'
  | 'steady_hands'
  | 'campfire_doctrine';
export type MetaUpgradeId =
  | 'roster_capacity'
  | 'inventory_slots'
  | 'loot_luck'
  | 'loot_rarity'
  | 'loot_auto_assign'
  | 'loot_auto_upgrade'
  | 'item_slots'
  | 'beer_shop_unlock'
  | 'beer_shop_level'
  | 'sauna_auto_deploy'
  | 'sauna_slap_swap';

export interface UnitStats {
  maxHp: number;
  damage: number;
  heal: number;
  range: number;
  attackCooldownMs: number;
  defense: number;
  regenHpPerSecond: number;
}

export interface StatModifier {
  maxHp?: number;
  damage?: number;
  heal?: number;
  range?: number;
  attackCooldownMs?: number;
  defense?: number;
  regenHpPerSecond?: number;
}

export interface AlcoholModifier extends StatModifier {
  lootChance?: number;
  rewardSisu?: number;
}

export type GlobalModifierSource =
  | { kind: 'template'; templateId: DefenderTemplateId }
  | { kind: 'subclass'; subclassId: DefenderSubclassId }
  | { kind: 'skill'; skillId: SkillId }
  | { kind: 'item'; itemId: ItemId }
  | { kind: 'title'; title: string }
  | { kind: 'roster' };

export interface DefenderTemplate {
  id: DefenderTemplateId;
  name: string;
  role: string;
  fill: string;
  outline: string;
  label: string;
  stats: UnitStats;
}

export interface DefenderSubclassDefinition {
  id: DefenderSubclassId;
  templateId: DefenderTemplateId;
  unlockLevel: number;
  name: string;
  description: string;
  modifiers: StatModifier;
}

export interface SubclassDraftRequest {
  defenderId: string;
  unlockLevel: number;
}

export interface EnemyArchetype {
  id: EnemyUnitId;
  name: string;
  behavior: EnemyBehavior;
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

export interface AlcoholDefinition {
  id: AlcoholId;
  name: string;
  flavorText: string;
  price: number;
  artPath: string;
  positive: AlcoholModifier;
  negative: AlcoholModifier;
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

export interface BeerShopOffer {
  offerId: number;
  alcoholId: AlcoholId;
}

export interface ActiveAlcoholBuff {
  alcoholId: AlcoholId;
  stacks: number;
}

export interface DeathLogEntry {
  id: number;
  wave: number;
  heroName: string;
  heroTitle: string;
  enemyName: string;
  text: string;
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
  subclassIds: DefenderSubclassId[];
  name: string;
  title: string;
  lore: string;
  tokenStyleId: number;
  stats: UnitStats;
  hp: number;
  level: number;
  xp: number;
  location: DefenderLocation;
  tile: AxialCoord | null;
  homeTile: AxialCoord | null;
  attackReadyAtMs: number;
  blinkReadyAtMs: number;
  items: ItemId[];
  skills: SkillId[];
  kills: number;
  lastHitByEnemyId: EnemyUnitId | null;
}

export interface EnemyInstance {
  instanceId: number;
  archetypeId: EnemyUnitId;
  tokenStyleId: number;
  tile: AxialCoord;
  hp: number;
  lastHitByDefenderId: string | null;
  attackReadyAtMs: number;
  moveReadyAtMs: number;
  nextAbilityAtMs?: number;
  pathIndex?: number | null;
  spawnLaneIndex?: number;
  spawnedByEnemyInstanceId?: number | null;
}

export interface WaveSpawn {
  atMs: number;
  enemyId: EnemyUnitId;
  laneIndex: number;
  spawnedByEnemyInstanceId?: number | null;
}

export interface WaveDefinition {
  index: number;
  isBoss: boolean;
  rewardSisu: number;
  pressure: number;
  pattern: WavePattern;
  bossId: BossId | null;
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

export interface GlobalModifierDefinition {
  id: GlobalModifierId;
  name: string;
  description: string;
  countScope: GlobalModifierCountScope;
  source: GlobalModifierSource;
  effectStat: GlobalModifierEffectStat;
  amountPerStack: number;
  isFallback?: boolean;
}

export interface MetaProgress {
  steam: number;
  completedRuns: number;
  shopUnlocked: boolean;
  upgrades: Record<MetaUpgradeId, number>;
}

export interface RunPreferences {
  autoAssignEnabled: boolean;
  autoUpgradeEnabled: boolean;
  autoplayEnabled: boolean;
}

export interface GameConfig {
  gridRadius: number;
  buildRadius: number;
  headerItemCap: number;
  headerSkillCap: number;
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
  defenderSubclasses: Record<DefenderSubclassId, DefenderSubclassDefinition>;
  enemyArchetypes: Record<EnemyUnitId, EnemyArchetype>;
  itemDefinitions: Record<ItemId, ItemDefinition>;
  skillDefinitions: Record<SkillId, SkillDefinition>;
  alcoholDefinitions: Record<AlcoholId, AlcoholDefinition>;
  globalModifierDefinitions: Record<GlobalModifierId, GlobalModifierDefinition>;
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
  recruitmentOpen: boolean;
  activePanel: HudPanelId | null;
  selectedWorldLandmarkId: WorldLandmarkId | null;
  introOpen: boolean;
  timeMs: number;
  waveIndex: number;
  waveElapsedMs: number;
  currentWave: WaveDefinition;
  seed: number;
  selectedMapTarget: MapTarget | null;
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
  nextBeerOfferId: number;
  nextFxEventId: number;
  nextDeathLogEntryId: number;
  headerItems: InventoryDrop[];
  headerSkills: InventoryDrop[];
  inventory: InventoryDrop[];
  selectedInventoryDropId: number | null;
  recentDropId: number | null;
  recruitOffers: RecruitOffer[];
  recruitLevelBonus: number;
  recruitLevelUpCount: number;
  beerShopOffers: BeerShopOffer[];
  activeAlcohols: ActiveAlcoholBuff[];
  subclassDraftQueue: SubclassDraftRequest[];
  subclassDraftDefenderId: string | null;
  subclassDraftUnlockLevel: number | null;
  subclassDraftOfferIds: DefenderSubclassId[];
  activeGlobalModifierIds: GlobalModifierId[];
  globalModifierDraftOffers: GlobalModifierId[];
  deathLog: DeathLogEntry[];
  sisu: SisuState;
  steamEarned: number;
  gambleCount: number;
  saunaHp: number;
  waveSwapUsed: boolean;
  nextRegenTickAtMs: number;
  autoAssignEnabled: boolean;
  autoUpgradeEnabled: boolean;
  autoplayEnabled: boolean;
  autoplayReadyAtMs: number;
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
  subclassName: string;
  roleSummary: string;
  locationLabel: string;
  summary: string;
  level: number;
  hp: number;
  maxHp: number;
  damage: number;
  heal: number;
  range: number;
  defense: number;
  regenHpPerSecond: number;
  location: DefenderLocation;
  selected: boolean;
}

export interface HudInventoryEntry {
  id: number;
  kind: LootKind;
  name: string;
  rarity: Rarity;
  sellPrice: number;
  effectText: string;
  flavorText: string;
  artPath: string;
  waveFound: number;
  isRecent: boolean;
  selected: boolean;
}

export interface HudEquippedItemEntry {
  id: ItemId;
  name: string;
}

export interface HudEquippedSkillEntry {
  id: SkillId;
  name: string;
}

export interface HudSelectedDefender {
  id: string;
  name: string;
  title: string;
  lore: string;
  templateName: string;
  subclassName: string;
  subclassDescription: string;
  nextSubclassUnlockLevel: number | null;
  xpToNextBranch: number | null;
  level: number;
  xp: number;
  nextLevelXp: number | null;
  hp: number;
  maxHp: number;
  damage: number;
  heal: number;
  range: number;
  attackCooldownMs: number;
  blinkLabel: string | null;
  defense: number;
  regenHpPerSecond: number;
  itemSlotCount: number;
  skillSlotCount: number;
  items: HudEquippedItemEntry[];
  skills: HudEquippedSkillEntry[];
  location: DefenderLocation;
}

export interface HudSelectedSauna {
  occupancyLabel: string;
  occupantName: string | null;
  occupantTitle: string | null;
  occupantRole: string | null;
  occupantLore: string | null;
  occupantHp: number | null;
  occupantMaxHp: number | null;
  autoDeployUnlocked: boolean;
  slapSwapUnlocked: boolean;
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

export interface HudBeerShopOfferEntry {
  id: number;
  alcoholId: AlcoholId;
  name: string;
  flavorText: string;
  price: number;
  artPath: string;
  positiveEffectText: string;
  negativeEffectText: string;
  canBuy: boolean;
  purchaseLabel: string;
}

export interface HudActiveAlcoholEntry {
  alcoholId: AlcoholId;
  name: string;
  flavorText: string;
  artPath: string;
  stacks: number;
  positiveEffectText: string;
  negativeEffectText: string;
}

export interface HudDeathLogEntry {
  id: number;
  wave: number;
  heroName: string;
  enemyName: string;
  text: string;
}

export interface HudRecruitOfferEntry {
  id: number;
  price: number;
  quality: 'rough' | 'solid' | 'elite';
  name: string;
  title: string;
  roleName: string;
  subclassName: string;
  roleSummary: string;
  lore: string;
  level: number;
  hp: number;
  damage: number;
  heal: number;
  range: number;
}

export interface HudRecruitLevelOddsEntry {
  level: number;
  chance: number;
}

export interface HudSubclassDraftEntry {
  id: DefenderSubclassId;
  name: string;
  description: string;
  unlockLevel: number;
}

export interface HudGlobalModifierEntry {
  id: GlobalModifierId;
  name: string;
  description: string;
  formulaText: string;
  stackCount: number;
  effectText: string;
  resolvedEffectText: string;
}

export interface HudWorldLandmarkEntry {
  id: WorldLandmarkId;
  label: string;
  tile: AxialCoord;
  visible: boolean;
  enabled: boolean;
  locked: boolean;
  selected: boolean;
  badgeText: string;
  statusText: string;
}

export interface HudViewModel {
  phaseLabel: string;
  statusText: string;
  overlayMode: OverlayMode;
  activePanel: HudPanelId | null;
  isPaused: boolean;
  showIntermission: boolean;
  introOpen: boolean;
  autoplayEnabled: boolean;
  canAutoplay: boolean;
  waveNumber: number;
  enemiesRemaining: number;
  isBossWave: boolean;
  bossName: string | null;
  bossHint: string | null;
  nextWaveThreat: string;
  nextWavePattern: string;
  pressureSignals: string[];
  boardCount: number;
  boardCap: number;
  placedBoardLabel: string;
  rosterCount: number;
  rosterCap: number;
  inventoryUnlocked: boolean;
  inventoryCount: number;
  inventoryCap: number;
  inventoryOpen: boolean;
  recruitmentOpen: boolean;
  hasRecentLoot: boolean;
  autoAssignUnlocked: boolean;
  autoAssignEnabled: boolean;
  autoUpgradeUnlocked: boolean;
  autoUpgradeEnabled: boolean;
  saunaOccupantName: string | null;
  saunaOccupancyLabel: string;
  saunaSelected: boolean;
  saunaHp: number;
  maxSaunaHp: number;
  sisu: number;
  canUseSisu: boolean;
  sisuLabel: string;
  canPause: boolean;
  canOpenRecruitment: boolean;
  recruitmentStatusText: string;
  recruitCost: number;
  canRecruit: boolean;
  recruitRollCost: number;
  recruitLevelBonus: number;
  recruitLevelUpCost: number;
  recruitLevelOdds: HudRecruitLevelOddsEntry[];
  canRollRecruitOffers: boolean;
  canLevelUpRecruitment: boolean;
  hasRecruitOffers: boolean;
  boardFullButBenchAvailable: boolean;
  rosterFullNeedsReplacement: boolean;
  recruitOffers: HudRecruitOfferEntry[];
  steamEarned: number;
  bankedSteam: number;
  metaShopUnlockCost: number;
  canUnlockMetaShop: boolean;
  metaShopUnlocked: boolean;
  beerShopUnlocked: boolean;
  beerShopLevel: number;
  beerOfferCount: number;
  beerActiveSlotCount: number;
  beerActiveSlotCap: number;
  beerShopOffers: HudBeerShopOfferEntry[];
  activeAlcohols: HudActiveAlcoholEntry[];
  actionTitle: string;
  actionBody: string;
  readyBenchCount: number;
  freeRecruitSlots: number;
  rosterEntries: HudRosterEntry[];
  deathLogEntries: HudDeathLogEntry[];
  headerItemEntries: HudInventoryEntry[];
  headerSkillEntries: HudInventoryEntry[];
  inventoryEntries: HudInventoryEntry[];
  selectedInventoryEntry: HudInventoryEntry | null;
  canAutoAssignSelectedLoot: boolean;
  selectedDefender: HudSelectedDefender | null;
  selectedSauna: HudSelectedSauna | null;
  globalModifiers: HudGlobalModifierEntry[];
  globalModifierDraftOffers: HudGlobalModifierEntry[];
  showGlobalModifierDraft: boolean;
  subclassDraftHeroName: string | null;
  subclassDraftHeroTitle: string | null;
  subclassDraftHeroLevel: number | null;
  subclassDraftOffers: HudSubclassDraftEntry[];
  showSubclassDraft: boolean;
  wavePreview: WavePreviewEntry[];
  metaUpgrades: HudMetaUpgradeEntry[];
  worldLandmarks: HudWorldLandmarkEntry[];
}

export interface GameSnapshot {
  state: RunState;
  config: GameConfig;
  defenderTemplates: GameContent['defenderTemplates'];
  enemyArchetypes: GameContent['enemyArchetypes'];
  itemDefinitions: GameContent['itemDefinitions'];
  skillDefinitions: GameContent['skillDefinitions'];
  alcoholDefinitions: GameContent['alcoholDefinitions'];
  globalModifierDefinitions: GameContent['globalModifierDefinitions'];
  metaUpgrades: GameContent['metaUpgrades'];
  hud: HudViewModel;
  tiles: AxialCoord[];
  buildableTiles: AxialCoord[];
  spawnTiles: AxialCoord[];
}

export type InputAction =
  | { type: 'selectDefender'; defenderId: string }
  | { type: 'selectSauna' }
  | { type: 'clearSelection' }
  | { type: 'closeSaunaPopup' }
  | { type: 'openHudPanel'; panel: HudPanelId }
  | { type: 'closeHudPanel' }
  | { type: 'selectWorldLandmark'; landmarkId: WorldLandmarkId }
  | { type: 'clearWorldLandmark' }
  | { type: 'selectInventoryDrop'; dropId: number }
  | { type: 'clearSelectedInventoryDrop' }
  | { type: 'openIntro' }
  | { type: 'closeIntro' }
  | { type: 'toggleInventory' }
  | { type: 'toggleRecruitment' }
  | { type: 'placeSelectedDefender'; tile: AxialCoord }
  | { type: 'hoverTile'; tile: AxialCoord | null }
  | { type: 'startWave' }
  | { type: 'togglePause' }
  | { type: 'activateSisu' }
  | { type: 'draftGlobalModifier'; modifierId: GlobalModifierId }
  | { type: 'draftSubclassChoice'; subclassId: DefenderSubclassId }
  | { type: 'recallDefenderToSauna'; defenderId: string }
  | { type: 'rerollRecruitOffers' }
  | { type: 'levelUpRecruitment' }
  | { type: 'rollRecruitOffers' }
  | { type: 'recruitOffer'; offerId: number }
  | { type: 'clearRecruitOffers' }
  | { type: 'equipInventoryDrop'; dropId: number; defenderId: string }
  | { type: 'autoAssignInventoryDrop'; dropId: number }
  | { type: 'toggleAutoAssign' }
  | { type: 'toggleAutoUpgrade' }
  | { type: 'sellInventoryDrop'; dropId: number }
  | { type: 'destroyEquippedItem'; defenderId: string; itemId: ItemId }
  | { type: 'destroyEquippedSkill'; defenderId: string; skillId: SkillId }
  | { type: 'dismissRecentDrop' }
  | { type: 'buyMetaUpgrade'; upgradeId: MetaUpgradeId }
  | { type: 'buyBeerShopOffer'; offerId: number }
  | { type: 'removeActiveAlcohol'; alcoholId: AlcoholId }
  | { type: 'unlockMetaShop' }
  | { type: 'toggleAutoplay' }
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
