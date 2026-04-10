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
export type DefenderSubclassSignatureId =
  | 'retaliate_adjacent'
  | 'melee_splash'
  | 'defense_aura'
  | 'retaliate_burst'
  | 'adjacent_spin'
  | 'attack_guard_pulse'
  | 'heavy_impact_splash'
  | 'finisher_double_tap'
  | 'ranged_splash'
  | 'max_range_focus'
  | 'triple_bolt'
  | 'single_chain'
  | 'double_shot'
  | 'double_chain'
  | 'fireblast_throw'
  | 'execute_and_retarget'
  | 'heal_pulse_target'
  | 'support_on_attack'
  | 'emergency_bonus_heal'
  | 'double_heal'
  | 'rescue_pair_heal'
  | 'self_centered_heal_wave'
  | 'full_range_benediction'
  | 'aftercare_aura';
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
export type Rarity = 'common' | 'rare' | 'epic' | 'legendary';
export type RecruitDestination = 'reserve' | 'sauna';
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
export type CombatFxKind =
  | 'hit'
  | 'defender_hit'
  | 'sauna_hit'
  | 'heal'
  | 'fireball'
  | 'spin'
  | 'blink'
  | 'boss_hit'
  | 'chain'
  | 'volley'
  | 'pulse';
export type MapTarget = 'defender' | 'sauna' | 'enemy';
export type HudPanelId = 'modifiers' | 'loot' | 'recruit' | 'beer_shop' | 'metashop';
export type WorldLandmarkId = 'metashop' | 'beer_shop';
export type BoardExpansionDirection = 'north' | 'northeast' | 'southeast' | 'south' | 'southwest' | 'northwest';
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
  | { kind: 'first_name'; name: string }
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
  signatureId: DefenderSubclassSignatureId;
  effectText: string;
  statText: string;
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
  description: string;
  lore: string;
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

export type SpeechSpeakerKind = 'defender' | 'enemy' | 'landmark';

export type SpeechSpeakerRef =
  | { kind: 'defender'; defenderId: string }
  | { kind: 'enemy'; enemyInstanceId: number }
  | { kind: 'landmark'; landmarkId: WorldLandmarkId };

export interface SpeechBubbleInstance {
  id: number;
  speaker: SpeechSpeakerRef;
  text: string;
  ageMs: number;
  durationMs: number;
}

export interface SpeechLineSet {
  intro: string[];
  proc: string[];
}

export interface SpeechContent {
  defender: {
    allyDeath: string[];
    kill: string[];
  };
  beerShop: {
    bartender: string[];
    defenderReaction: string[];
  };
  bosses: Record<BossId, SpeechLineSet>;
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

export interface BoardCamera {
  zoom: number;
  offsetX: number;
  offsetY: number;
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

export interface PendingFireball {
  ownerDefenderId: string;
  targetTile: AxialCoord;
  explodeAtMs: number;
  damageSnapshot: number;
}

export type UnitMotionStyle = 'step' | 'slither' | 'blink';

export interface UnitMotionState {
  fromTile: AxialCoord;
  toTile: AxialCoord;
  startedAtMs: number;
  durationMs: number;
  style: UnitMotionStyle;
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
  motion?: UnitMotionState | null;
  attackReadyAtMs: number;
  blinkReadyAtMs: number;
  battleHymnReadyAtMs: number;
  battleHymnBuffExpiresAtMs: number;
  fireballReadyAtMs: number;
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
  motion?: UnitMotionState | null;
  hp: number;
  lastHitByDefenderId: string | null;
  attackReadyAtMs: number;
  moveReadyAtMs: number;
  nextAbilityAtMs?: number;
  pathIndex?: number | null;
  pebbleDevourStacks?: number;
  pebbleEncounterMaxHp?: number;
  spawnLaneIndex?: number;
  spawnedByEnemyInstanceId?: number | null;
}

export interface PebbleBottleTarget {
  id: number;
  tile: AxialCoord;
  consumed: boolean;
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
  rarity: Rarity;
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
  steamPerBossWave: number;
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
  speech: SpeechContent;
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
  activePanel: HudPanelId | null;
  selectedWorldLandmarkId: WorldLandmarkId | null;
  landmarkTiles: Record<WorldLandmarkId, AxialCoord>;
  introOpen: boolean;
  timeMs: number;
  waveIndex: number;
  waveElapsedMs: number;
  currentWave: WaveDefinition;
  seed: number;
  selectedMapTarget: MapTarget | null;
  selectedDefenderId: string | null;
  selectedEnemyInstanceId: number | null;
  hoveredTile: AxialCoord | null;
  defenders: DefenderInstance[];
  enemies: EnemyInstance[];
  fxEvents: CombatFxEvent[];
  pendingFireballs: PendingFireball[];
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
  recruitOffers: Array<RecruitOffer | null>;
  recruitMarketIsFree: boolean;
  benchRerollCountsByDefenderId: Record<string, number>;
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
  saunaRetreatReadyAtMs: number;
  pebbleBottleTargets: PebbleBottleTarget[];
  pebbleBottleStacks: number;
  pebbleEncounterCount: number;
  nextPebbleBottleTargetId: number;
  endUserHordeMomentum: number;
  endUserHordeTier: number;
  endUserHordeNextSurgeAtMs: number;
  boardExpansionDirections: BoardExpansionDirection[];
  speechBubbles: SpeechBubbleInstance[];
  nextSpeechBubbleId: number;
  bossSpeechReadyAtMs: number;
  bossIntroSpokenWaveIndex: number | null;
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
  kills: number;
  location: DefenderLocation;
  selected: boolean;
}

export interface HudSaunaDockEntry {
  occupantId: string | null;
  occupantName: string | null;
  occupantTitle: string | null;
  occupantTemplateName: string | null;
  occupantSubclassName: string | null;
  occupantLore: string | null;
  occupantHp: number | null;
  occupantMaxHp: number | null;
  selected: boolean;
  canReroll: boolean;
  rerollCost: number | null;
  canSendSelectedBoardHero: boolean;
  sendSelectedBoardHeroLabel: string | null;
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
  kills: number;
  hp: number;
  maxHp: number;
  damage: number;
  heal: number;
  range: number;
  attackCooldownMs: number;
  blinkLabel: string | null;
  fireballLabel: string | null;
  defense: number;
  regenHpPerSecond: number;
  itemSlotCount: number;
  skillSlotCount: number;
  subclasses: HudSelectedSubclassEntry[];
  items: HudEquippedItemEntry[];
  skills: HudEquippedSkillEntry[];
  location: DefenderLocation;
  canSaunaCommand: boolean;
  saunaCommandLabel: string | null;
}

export interface HudSelectedSubclassEntry {
  id: DefenderSubclassId;
  name: string;
  unlockLevel: number;
  effectText: string;
  statText: string;
}

export interface HudSelectedSauna {
  occupancyLabel: string;
  occupantId: string | null;
  occupantName: string | null;
  occupantTitle: string | null;
  occupantRole: string | null;
  occupantSubclassName: string | null;
  occupantLore: string | null;
  occupantHp: number | null;
  occupantMaxHp: number | null;
  autoDeployUnlocked: boolean;
  slapSwapUnlocked: boolean;
  canReroll: boolean;
  rerollCost: number | null;
  canSendSelectedBoardHero: boolean;
  sendSelectedBoardHeroLabel: string | null;
}

export interface HudSelectedEnemy {
  instanceId: number;
  name: string;
  description: string;
  lore: string;
  isBoss: boolean;
  hp: number;
  maxHp: number;
  damage: number;
  range: number;
  attackCooldownMs: number;
  moveCooldownMs: number;
  threat: number;
  behaviorLabel: string;
  bossLabel: string | null;
}

export interface HudMetaUpgradeEntry {
  id: MetaUpgradeId;
  name: string;
  description: string;
  level: number;
  cost: number | null;
  affordable: boolean;
  maxed: boolean;
  repeatable: boolean;
  softcapReached: boolean;
  nextEffectText: string | null;
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
  slotIndex: number;
  id: number | null;
  price: number | null;
  quality: 'rough' | 'solid' | 'elite' | null;
  name: string | null;
  title: string | null;
  roleName: string | null;
  subclassName: string | null;
  roleSummary: string | null;
  lore: string | null;
  level: number | null;
  hp: number | null;
  damage: number | null;
  heal: number | null;
  range: number | null;
  empty: boolean;
  isFree: boolean;
  canBuy: boolean;
  hotkeyKey: string | null;
  canHireToSauna: boolean;
  hireToSaunaLabel: string;
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
  effectText: string;
  statText: string;
}

export interface HudGlobalModifierEntry {
  id: GlobalModifierId;
  name: string;
  rarity: Rarity;
  sourceLabel: string;
  description: string;
  formulaText: string;
  pickCount: number;
  stackCount: number;
  effectText: string;
  resolvedEffectText: string;
}

export interface HudGlobalModifierDraftEntry {
  id: GlobalModifierId;
  name: string;
  rarity: Rarity;
  sourceLabel: string;
  description: string;
  formulaText: string;
  ownedCount: number;
  stackCount: number;
  incrementText: string;
  projectedEffectText: string;
}

export interface HudGlobalModifierSummaryEntry {
  stat: GlobalModifierEffectStat;
  label: string;
  total: number;
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
  bossMomentumLabel: string | null;
  bossMomentumTierLabel: string | null;
  pebbleBottleStacksLabel: string | null;
  pebbleBottlesRemainingLabel: string | null;
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
  recruitmentStatusText: string;
  recruitRollCost: number;
  recruitLevelBonus: number;
  recruitLevelUpCost: number;
  recruitLevelOdds: HudRecruitLevelOddsEntry[];
  canRollRecruitOffers: boolean;
  canLevelUpRecruitment: boolean;
  hasRecruitOffers: boolean;
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
  freeRecruitSlots: number;
  saunaReserve: HudSaunaDockEntry;
  deathLogEntries: HudDeathLogEntry[];
  headerItemEntries: HudInventoryEntry[];
  headerSkillEntries: HudInventoryEntry[];
  inventoryEntries: HudInventoryEntry[];
  selectedInventoryEntry: HudInventoryEntry | null;
  canAutoAssignSelectedLoot: boolean;
  selectedDefender: HudSelectedDefender | null;
  selectedSauna: HudSelectedSauna | null;
  selectedEnemy: HudSelectedEnemy | null;
  globalModifiers: HudGlobalModifierEntry[];
  globalModifierSummary: HudGlobalModifierSummaryEntry[];
  globalModifierDraftOffers: HudGlobalModifierDraftEntry[];
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
  | { type: 'selectEnemy'; enemyInstanceId: number }
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
  | { type: 'rerollSaunaDefender' }
  | { type: 'rerollBenchDefender'; defenderId: string }
  | { type: 'rerollRecruitOffers' }
  | { type: 'rerollRecruitOffer'; offerId: number }
  | { type: 'levelUpRecruitment' }
  | { type: 'rollRecruitOffers' }
  | { type: 'recruitOffer'; offerId: number; destination?: RecruitDestination }
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
  setBoardCamera(camera: BoardCamera): void;
  dispatch(action: InputAction): void;
  subscribe(listener: (snapshot: GameSnapshot) => void): () => void;
  getSnapshot(): GameSnapshot;
}
