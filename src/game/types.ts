export interface AxialCoord {
  q: number;
  r: number;
}

export type Team = 'player' | 'enemy';
export type Phase = 'prep' | 'wave' | 'won' | 'lost';
export type PlayerUnitId = 'guardian' | 'hurler' | 'mender';
export type EnemyUnitId = 'raider' | 'brute' | 'chieftain';
export type UnitId = PlayerUnitId | EnemyUnitId;

export interface UnitArchetype {
  id: UnitId;
  team: Team;
  name: string;
  cost?: number;
  maxHp: number;
  damage: number;
  heal: number;
  range: number;
  attackCooldownMs: number;
  moveCooldownMs: number;
  fill: string;
  outline: string;
  label: string;
}

export interface WaveSpawn {
  atMs: number;
  enemyId: EnemyUnitId;
  laneIndex: number;
}

export interface WaveDefinition {
  id: number;
  rewardSteam: number;
  spawns: WaveSpawn[];
}

export interface GameConfig {
  gridRadius: number;
  buildRadius: number;
  saunaHp: number;
  startingSteam: number;
  sisuDurationMs: number;
  sisuCooldownMs: number;
  sisuAttackMultiplier: number;
  sisuDamageMultiplier: number;
  betweenWaveSteam: number;
  spawnLanes: AxialCoord[];
  waves: WaveDefinition[];
}

export interface RuntimeUnit {
  instanceId: number;
  archetypeId: UnitId;
  team: Team;
  tile: AxialCoord;
  hp: number;
  attackReadyAtMs: number;
  moveReadyAtMs: number;
}

export interface SisuState {
  activeUntilMs: number;
  cooldownUntilMs: number;
}

export interface RunState {
  phase: Phase;
  timeMs: number;
  waveIndex: number;
  waveElapsedMs: number;
  steam: number;
  saunaHp: number;
  selectedUnitId: PlayerUnitId | null;
  hoveredTile: AxialCoord | null;
  units: RuntimeUnit[];
  pendingSpawns: WaveSpawn[];
  nextInstanceId: number;
  sisu: SisuState;
  message: string;
}

export interface WavePreviewEntry {
  id: EnemyUnitId;
  name: string;
  count: number;
}

export interface HudUnitButton {
  id: PlayerUnitId;
  name: string;
  cost: number;
  selected: boolean;
}

export interface HudViewModel {
  phaseLabel: string;
  statusText: string;
  waveNumber: number;
  waveTotal: number;
  steam: number;
  saunaHp: number;
  maxSaunaHp: number;
  enemiesRemaining: number;
  canStartWave: boolean;
  canUseSisu: boolean;
  sisuLabel: string;
  unitButtons: HudUnitButton[];
  wavePreview: WavePreviewEntry[];
}

export interface GameSnapshot {
  state: RunState;
  config: GameConfig;
  archetypes: GameContent['archetypes'];
  hud: HudViewModel;
  tiles: AxialCoord[];
  buildableTiles: AxialCoord[];
  spawnTiles: AxialCoord[];
}

export type InputAction =
  | { type: 'selectUnitType'; unitId: PlayerUnitId }
  | { type: 'clearSelection' }
  | { type: 'placeSelectedUnit'; tile: AxialCoord }
  | { type: 'hoverTile'; tile: AxialCoord | null }
  | { type: 'startWave' }
  | { type: 'activateSisu' }
  | { type: 'restartRun' };

export interface GameContent {
  config: GameConfig;
  archetypes: Record<UnitId, UnitArchetype>;
}

export interface GameRuntimeConfig {
  canvas: HTMLCanvasElement;
  content: GameContent;
}

export interface GameRuntime {
  start(): void;
  stop(): void;
  resize(): void;
  dispatch(action: InputAction): void;
  subscribe(listener: (snapshot: GameSnapshot) => void): () => void;
  getSnapshot(): GameSnapshot;
}
