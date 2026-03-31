import type {
  AxialCoord,
  EnemyUnitId,
  GameContent,
  GameSnapshot,
  HudViewModel,
  InputAction,
  PlayerUnitId,
  RunState,
  RuntimeUnit,
  UnitArchetype,
  UnitId,
  WaveDefinition
} from './types';

const HEX_DIRECTIONS: AxialCoord[] = [
  { q: 1, r: 0 },
  { q: 1, r: -1 },
  { q: 0, r: -1 },
  { q: -1, r: 0 },
  { q: -1, r: 1 },
  { q: 0, r: 1 }
];

const PLAYER_UNIT_IDS: PlayerUnitId[] = ['guardian', 'hurler', 'mender'];
const ENEMY_UNIT_IDS: EnemyUnitId[] = ['raider', 'brute', 'chieftain'];
const CENTER: AxialCoord = { q: 0, r: 0 };

export function coordKey(coord: AxialCoord): string {
  return `${coord.q},${coord.r}`;
}

export function sameCoord(left: AxialCoord, right: AxialCoord): boolean {
  return left.q === right.q && left.r === right.r;
}

function addCoord(left: AxialCoord, right: AxialCoord): AxialCoord {
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
  return tiles.sort((left, right) => {
    if (left.r !== right.r) {
      return left.r - right.r;
    }
    return left.q - right.q;
  });
}

function getNeighbors(tile: AxialCoord): AxialCoord[] {
  return HEX_DIRECTIONS.map((direction) => addCoord(tile, direction));
}

function cloneCoord(tile: AxialCoord): AxialCoord {
  return { q: tile.q, r: tile.r };
}

function cloneUnit(unit: RuntimeUnit): RuntimeUnit {
  return {
    ...unit,
    tile: cloneCoord(unit.tile)
  };
}

function cloneState(state: RunState): RunState {
  return {
    ...state,
    hoveredTile: state.hoveredTile ? cloneCoord(state.hoveredTile) : null,
    units: state.units.map(cloneUnit),
    pendingSpawns: state.pendingSpawns.map((spawn) => ({ ...spawn }))
  };
}

function getArchetype(content: GameContent, unitId: UnitId): UnitArchetype {
  return content.archetypes[unitId];
}

function createWaveQueue(wave: WaveDefinition) {
  return wave.spawns.map((spawn) => ({ ...spawn })).sort((left, right) => left.atMs - right.atMs);
}

function isInsideGrid(tile: AxialCoord, radius: number): boolean {
  return hexDistance(CENTER, tile) <= radius;
}

function isBuildableTile(tile: AxialCoord, content: GameContent): boolean {
  const distance = hexDistance(tile, CENTER);
  if (distance <= 0 || distance > content.config.buildRadius) {
    return false;
  }
  return !content.config.spawnLanes.some((lane) => sameCoord(lane, tile));
}

function isOccupied(state: RunState, tile: AxialCoord): boolean {
  return state.units.some((unit) => sameCoord(unit.tile, tile));
}

function getWaveCounts(wave: WaveDefinition, content: GameContent) {
  const counts = new Map<EnemyUnitId, number>();
  for (const enemyId of ENEMY_UNIT_IDS) {
    counts.set(enemyId, 0);
  }
  for (const spawn of wave.spawns) {
    counts.set(spawn.enemyId, (counts.get(spawn.enemyId) ?? 0) + 1);
  }
  return ENEMY_UNIT_IDS.filter((id) => (counts.get(id) ?? 0) > 0).map((id) => ({
    id,
    name: getArchetype(content, id).name,
    count: counts.get(id) ?? 0
  }));
}

function getCurrentWave(state: RunState, content: GameContent): WaveDefinition {
  return content.config.waves[Math.min(state.waveIndex, content.config.waves.length - 1)];
}

function isSisuActive(state: RunState): boolean {
  return state.timeMs < state.sisu.activeUntilMs;
}

function chooseEnemyStep(state: RunState, unit: RuntimeUnit, content: GameContent): AxialCoord | null {
  const candidates = getNeighbors(unit.tile)
    .filter((tile) => isInsideGrid(tile, content.config.gridRadius))
    .filter((tile) => !state.units.some((other) => other.instanceId !== unit.instanceId && sameCoord(other.tile, tile)))
    .sort((left, right) => {
      const leftDistance = hexDistance(left, CENTER);
      const rightDistance = hexDistance(right, CENTER);
      if (leftDistance !== rightDistance) {
        return leftDistance - rightDistance;
      }
      if (left.r !== right.r) {
        return left.r - right.r;
      }
      return left.q - right.q;
    });

  return candidates[0] ?? null;
}

function findNearestEnemy(state: RunState, unit: RuntimeUnit, content: GameContent): RuntimeUnit | null {
  const archetype = getArchetype(content, unit.archetypeId);
  const enemies = state.units
    .filter((candidate) => candidate.team === 'enemy')
    .filter((candidate) => hexDistance(unit.tile, candidate.tile) <= archetype.range)
    .sort((left, right) => {
      const distanceDelta = hexDistance(unit.tile, left.tile) - hexDistance(unit.tile, right.tile);
      if (distanceDelta !== 0) {
        return distanceDelta;
      }
      return left.hp - right.hp;
    });

  return enemies[0] ?? null;
}

function findBestAllyToHeal(state: RunState, unit: RuntimeUnit, content: GameContent): RuntimeUnit | null {
  const archetype = getArchetype(content, unit.archetypeId);
  const allies = state.units
    .filter((candidate) => candidate.team === 'player' && candidate.instanceId !== unit.instanceId)
    .filter((candidate) => {
      const allyArchetype = getArchetype(content, candidate.archetypeId);
      return candidate.hp < allyArchetype.maxHp && hexDistance(unit.tile, candidate.tile) <= archetype.range;
    })
    .sort((left, right) => {
      const leftMissing = getArchetype(content, left.archetypeId).maxHp - left.hp;
      const rightMissing = getArchetype(content, right.archetypeId).maxHp - right.hp;
      if (leftMissing !== rightMissing) {
        return rightMissing - leftMissing;
      }
      return hexDistance(unit.tile, left.tile) - hexDistance(unit.tile, right.tile);
    });

  return allies[0] ?? null;
}

function removeDeadUnits(state: RunState): void {
  state.units = state.units.filter((unit) => unit.hp > 0);
}

function advancePlayerUnit(state: RunState, unit: RuntimeUnit, content: GameContent): void {
  const archetype = getArchetype(content, unit.archetypeId);
  if (state.timeMs < unit.attackReadyAtMs) {
    return;
  }

  const cooldownDivisor = isSisuActive(state) ? content.config.sisuAttackMultiplier : 1;
  const powerMultiplier = isSisuActive(state) ? content.config.sisuDamageMultiplier : 1;
  const allyToHeal = archetype.heal > 0 ? findBestAllyToHeal(state, unit, content) : null;

  if (allyToHeal && archetype.heal > 0) {
    const allyArchetype = getArchetype(content, allyToHeal.archetypeId);
    allyToHeal.hp = Math.min(
      allyArchetype.maxHp,
      allyToHeal.hp + Math.round(archetype.heal * powerMultiplier)
    );
    unit.attackReadyAtMs = state.timeMs + archetype.attackCooldownMs / cooldownDivisor;
    return;
  }

  const enemy = findNearestEnemy(state, unit, content);
  if (!enemy) {
    return;
  }

  enemy.hp -= Math.round(archetype.damage * powerMultiplier);
  unit.attackReadyAtMs = state.timeMs + archetype.attackCooldownMs / cooldownDivisor;
}

function findEnemyAttackTarget(
  state: RunState,
  unit: RuntimeUnit,
  content: GameContent
): RuntimeUnit | 'sauna' | null {
  const archetype = getArchetype(content, unit.archetypeId);
  const reachableAllies = state.units
    .filter((candidate) => candidate.team === 'player')
    .filter((candidate) => hexDistance(unit.tile, candidate.tile) <= archetype.range)
    .sort((left, right) => {
      if (left.hp !== right.hp) {
        return left.hp - right.hp;
      }
      return hexDistance(unit.tile, left.tile) - hexDistance(unit.tile, right.tile);
    });

  if (reachableAllies[0]) {
    return reachableAllies[0];
  }

  if (hexDistance(unit.tile, CENTER) <= archetype.range) {
    return 'sauna';
  }

  return null;
}

function advanceEnemyUnit(state: RunState, unit: RuntimeUnit, content: GameContent): void {
  const archetype = getArchetype(content, unit.archetypeId);

  if (state.timeMs >= unit.attackReadyAtMs) {
    const target = findEnemyAttackTarget(state, unit, content);
    if (target === 'sauna') {
      state.saunaHp = Math.max(0, state.saunaHp - archetype.damage);
      unit.attackReadyAtMs = state.timeMs + archetype.attackCooldownMs;
      return;
    }
    if (target) {
      target.hp -= archetype.damage;
      unit.attackReadyAtMs = state.timeMs + archetype.attackCooldownMs;
      return;
    }
  }

  if (state.timeMs < unit.moveReadyAtMs) {
    return;
  }

  const nextTile = chooseEnemyStep(state, unit, content);
  if (!nextTile || sameCoord(nextTile, unit.tile)) {
    return;
  }

  unit.tile = nextTile;
  unit.moveReadyAtMs = state.timeMs + archetype.moveCooldownMs;
}

function spawnDueEnemies(state: RunState, content: GameContent): void {
  const remaining: RunState['pendingSpawns'] = [];

  for (const spawn of state.pendingSpawns) {
    if (spawn.atMs > state.waveElapsedMs) {
      remaining.push(spawn);
      continue;
    }

    const lane = content.config.spawnLanes[spawn.laneIndex % content.config.spawnLanes.length];
    if (isOccupied(state, lane)) {
      remaining.push(spawn);
      continue;
    }

    const archetype = getArchetype(content, spawn.enemyId);
    state.units.push({
      instanceId: state.nextInstanceId,
      archetypeId: spawn.enemyId,
      team: 'enemy',
      tile: cloneCoord(lane),
      hp: archetype.maxHp,
      attackReadyAtMs: state.timeMs + archetype.attackCooldownMs,
      moveReadyAtMs: state.timeMs + archetype.moveCooldownMs
    });
    state.nextInstanceId += 1;
  }

  state.pendingSpawns = remaining;
}

function handleWaveResolved(state: RunState, content: GameContent): void {
  if (state.phase !== 'wave') {
    return;
  }

  const hasEnemies =
    state.pendingSpawns.length > 0 || state.units.some((unit) => unit.team === 'enemy');
  if (hasEnemies) {
    return;
  }

  const clearedWave = getCurrentWave(state, content);
  if (state.waveIndex >= content.config.waves.length - 1) {
    state.phase = 'won';
    state.message = 'Loylyt kestivat. Viimeinen aalto hajosi kiville.';
    return;
  }

  state.phase = 'prep';
  state.waveIndex += 1;
  state.waveElapsedMs = 0;
  state.selectedUnitId = null;
  state.steam += clearedWave.rewardSteam + content.config.betweenWaveSteam;
  state.message = `Aalto ${clearedWave.id} torjuttiin. Keratkaa uusi puolustus.`;
}

function createUnit(
  state: RunState,
  unitId: PlayerUnitId,
  tile: AxialCoord,
  content: GameContent
): RuntimeUnit {
  const archetype = getArchetype(content, unitId);
  return {
    instanceId: state.nextInstanceId,
    archetypeId: unitId,
    team: 'player',
    tile: cloneCoord(tile),
    hp: archetype.maxHp,
    attackReadyAtMs: state.timeMs + archetype.attackCooldownMs,
    moveReadyAtMs: 0
  };
}

export function createInitialState(content: GameContent): RunState {
  return {
    phase: 'prep',
    timeMs: 0,
    waveIndex: 0,
    waveElapsedMs: 0,
    steam: content.config.startingSteam,
    saunaHp: content.config.saunaHp,
    selectedUnitId: null,
    hoveredTile: null,
    units: [],
    pendingSpawns: [],
    nextInstanceId: 1,
    sisu: {
      activeUntilMs: 0,
      cooldownUntilMs: 0
    },
    message: 'Valitse puolustajat ja kaynnista ensimmainen aalto.'
  };
}

export function applyAction(state: RunState, action: InputAction, content: GameContent): RunState {
  if (action.type === 'restartRun') {
    return createInitialState(content);
  }

  const next = cloneState(state);

  switch (action.type) {
    case 'selectUnitType':
      next.selectedUnitId = action.unitId;
      next.message = `Valmis sijoittamaan ${getArchetype(content, action.unitId).name.toLowerCase()}.`;
      return next;

    case 'clearSelection':
      next.selectedUnitId = null;
      next.message = next.phase === 'prep' ? 'Valitse uusi yksikko tai kaynnista aalto.' : next.message;
      return next;

    case 'hoverTile':
      next.hoveredTile = action.tile ? cloneCoord(action.tile) : null;
      return next;

    case 'activateSisu':
      if (next.phase !== 'wave' || next.timeMs < next.sisu.cooldownUntilMs) {
        return next;
      }
      next.sisu.activeUntilMs = next.timeMs + content.config.sisuDurationMs;
      next.sisu.cooldownUntilMs = next.sisu.activeUntilMs + content.config.sisuCooldownMs;
      next.message = 'SISU roihahti. Puolustajat iskevat nopeammin.';
      return next;

    case 'startWave':
      if (next.phase !== 'prep') {
        return next;
      }
      next.phase = 'wave';
      next.waveElapsedMs = 0;
      next.pendingSpawns = createWaveQueue(getCurrentWave(next, content));
      next.hoveredTile = null;
      next.message = `Aalto ${getCurrentWave(next, content).id} etenee kohti saunaa.`;
      return next;

    case 'placeSelectedUnit': {
      if (next.phase !== 'prep' || !next.selectedUnitId) {
        return next;
      }
      if (!isBuildableTile(action.tile, content) || isOccupied(next, action.tile)) {
        next.message = 'Tahan heksaan ei voi sijoittaa puolustajaa.';
        return next;
      }
      const archetype = getArchetype(content, next.selectedUnitId);
      const cost = archetype.cost ?? 0;
      if (next.steam < cost) {
        next.message = 'Steam ei riita taman yksikon rekrytointiin.';
        return next;
      }
      next.units.push(createUnit(next, next.selectedUnitId, action.tile, content));
      next.nextInstanceId += 1;
      next.steam -= cost;
      next.message = `${archetype.name} sijoitettiin puolustukseen.`;
      return next;
    }

    default:
      return next;
  }
}

export function stepState(state: RunState, deltaMs: number, content: GameContent): RunState {
  if (deltaMs <= 0) {
    return state;
  }

  const next = cloneState(state);
  next.timeMs += deltaMs;

  if (next.phase !== 'wave') {
    return next;
  }

  next.waveElapsedMs += deltaMs;
  spawnDueEnemies(next, content);

  for (const unit of next.units) {
    if (unit.hp <= 0) {
      continue;
    }
    if (unit.team === 'player') {
      advancePlayerUnit(next, unit, content);
    } else {
      advanceEnemyUnit(next, unit, content);
    }
  }

  removeDeadUnits(next);

  if (next.saunaHp <= 0) {
    next.phase = 'lost';
    next.saunaHp = 0;
    next.message = 'Sauna sammui. Aloita uusi sessio ja tiivista puolustus.';
    return next;
  }

  handleWaveResolved(next, content);
  return next;
}

export function createSnapshot(state: RunState, content: GameContent): GameSnapshot {
  const tiles = createHexGrid(content.config.gridRadius);
  const buildableTiles = tiles.filter((tile) => isBuildableTile(tile, content));
  const currentWave = getCurrentWave(state, content);
  const sisuActiveMs = Math.max(0, state.sisu.activeUntilMs - state.timeMs);
  const sisuCooldownMs = Math.max(0, state.sisu.cooldownUntilMs - state.timeMs);
  const sisuLabel =
    sisuActiveMs > 0
      ? `SISU aktiivinen ${Math.ceil(sisuActiveMs / 1000)} s`
      : sisuCooldownMs > 0
        ? `SISU palautuu ${Math.ceil(sisuCooldownMs / 1000)} s`
        : 'SISU valmiina';

  const hud: HudViewModel = {
    phaseLabel:
      state.phase === 'prep'
        ? 'Valmistelu'
        : state.phase === 'wave'
          ? 'Aalto kaynnissa'
          : state.phase === 'won'
            ? 'Voitto'
            : 'Tappio',
    statusText: state.message,
    waveNumber: Math.min(state.waveIndex + 1, content.config.waves.length),
    waveTotal: content.config.waves.length,
    steam: state.steam,
    saunaHp: state.saunaHp,
    maxSaunaHp: content.config.saunaHp,
    enemiesRemaining:
      state.pendingSpawns.length + state.units.filter((unit) => unit.team === 'enemy').length,
    canStartWave: state.phase === 'prep',
    canUseSisu: state.phase === 'wave' && state.timeMs >= state.sisu.cooldownUntilMs,
    sisuLabel,
    unitButtons: PLAYER_UNIT_IDS.map((unitId) => {
      const archetype = getArchetype(content, unitId);
      return {
        id: unitId,
        name: archetype.name,
        cost: archetype.cost ?? 0,
        selected: state.selectedUnitId === unitId
      };
    }),
    wavePreview: getWaveCounts(currentWave, content)
  };

  return {
    state,
    config: content.config,
    archetypes: content.archetypes,
    hud,
    tiles,
    buildableTiles,
    spawnTiles: content.config.spawnLanes.map(cloneCoord)
  };
}
