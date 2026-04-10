import type {
  AxialCoord,
  BoardExpansionDirection,
  GameContent,
  RunState,
  WorldLandmarkId
} from './types';
import { coordKey, hexDistance } from './geometry';

const EXPANSION_STEP_LENGTH = 4;
const LANDMARK_IDS: WorldLandmarkId[] = ['metashop', 'beer_shop'];

const BOARD_DIRECTIONS: Array<{
  id: BoardExpansionDirection;
  vector: AxialCoord;
  label: string;
}> = [
  { id: 'north', vector: { q: 0, r: -1 }, label: 'north' },
  { id: 'northeast', vector: { q: 1, r: -1 }, label: 'northeast' },
  { id: 'southeast', vector: { q: 1, r: 0 }, label: 'southeast' },
  { id: 'south', vector: { q: 0, r: 1 }, label: 'south' },
  { id: 'southwest', vector: { q: -1, r: 1 }, label: 'southwest' },
  { id: 'northwest', vector: { q: -1, r: 0 }, label: 'northwest' }
] as const;

const LANDMARK_SELECTION_SALTS: Record<WorldLandmarkId, number> = {
  metashop: 0x6d657461,
  beer_shop: 0x62656572
};

export interface BoardFootprint {
  tiles: AxialCoord[];
  buildableTiles: AxialCoord[];
  spawnTiles: AxialCoord[];
  boundingRadius: number;
  buildRadius: number;
}

function directionConfig(direction: BoardExpansionDirection) {
  return BOARD_DIRECTIONS.find((entry) => entry.id === direction)!;
}

function sortTiles(tiles: Iterable<AxialCoord>): AxialCoord[] {
  return [...tiles].sort((left, right) => (left.r - right.r) || (left.q - right.q));
}

interface DirectionBounds {
  qMin: number;
  qMax: number;
  rMin: number;
  rMax: number;
  sMin: number;
  sMax: number;
}

function mixSeed(seed: number, salt: number): number {
  let value = (seed ^ salt ^ 0x9e3779b9) >>> 0;
  value = Math.imul(value ^ (value >>> 16), 0x85ebca6b) >>> 0;
  value = Math.imul(value ^ (value >>> 13), 0xc2b2ae35) >>> 0;
  return (value ^ (value >>> 16)) >>> 0;
}

function expansionCounts(expansions: BoardExpansionDirection[]): Record<BoardExpansionDirection, number> {
  return BOARD_DIRECTIONS.reduce((acc, entry) => {
    acc[entry.id] = expansions.filter((direction) => direction === entry.id).length;
    return acc;
  }, {} as Record<BoardExpansionDirection, number>);
}

function boundsForRadius(
  radius: number,
  counts: Record<BoardExpansionDirection, number>
): DirectionBounds {
  return {
    qMin: -radius - counts.southwest * EXPANSION_STEP_LENGTH,
    qMax: radius + counts.northeast * EXPANSION_STEP_LENGTH,
    rMin: -radius - counts.north * EXPANSION_STEP_LENGTH,
    rMax: radius + counts.south * EXPANSION_STEP_LENGTH,
    sMin: -radius - counts.northwest * EXPANSION_STEP_LENGTH,
    sMax: radius + counts.southeast * EXPANSION_STEP_LENGTH
  };
}

function tilesWithinBounds(bounds: DirectionBounds): AxialCoord[] {
  const tiles: AxialCoord[] = [];
  for (let q = bounds.qMin; q <= bounds.qMax; q += 1) {
    const rStart = Math.max(bounds.rMin, bounds.sMin - q);
    const rEnd = Math.min(bounds.rMax, bounds.sMax - q);
    for (let r = rStart; r <= rEnd; r += 1) {
      tiles.push({ q, r });
    }
  }
  return sortTiles(tiles);
}

function sideSortKey(direction: BoardExpansionDirection, tile: AxialCoord): [number, number] {
  switch (direction) {
    case 'north':
    case 'south':
      return [tile.q, tile.r];
    case 'northeast':
    case 'southwest':
      return [tile.r, tile.q];
    case 'southeast':
    case 'northwest':
      return [tile.q, tile.r];
    default:
      return [tile.r, tile.q];
  }
}

function sideTilesForDirection(
  tiles: AxialCoord[],
  bounds: DirectionBounds,
  direction: BoardExpansionDirection
): AxialCoord[] {
  const sideTiles = tiles.filter((tile) => {
    switch (direction) {
      case 'north':
        return tile.r === bounds.rMin;
      case 'northeast':
        return tile.q === bounds.qMax;
      case 'southeast':
        return tile.q + tile.r === bounds.sMax;
      case 'south':
        return tile.r === bounds.rMax;
      case 'southwest':
        return tile.q === bounds.qMin;
      case 'northwest':
        return tile.q + tile.r === bounds.sMin;
      default:
        return false;
    }
  });

  return sideTiles.sort((left, right) => {
    const [leftPrimary, leftSecondary] = sideSortKey(direction, left);
    const [rightPrimary, rightSecondary] = sideSortKey(direction, right);
    return (leftPrimary - rightPrimary) || (leftSecondary - rightSecondary);
  });
}

function footprintForExpansions(expansions: BoardExpansionDirection[], content: GameContent): BoardFootprint {
  const counts = expansionCounts(expansions);
  const boardBounds = boundsForRadius(content.config.gridRadius, counts);
  const buildBounds = boundsForRadius(content.config.buildRadius, counts);
  const tiles = tilesWithinBounds(boardBounds);
  const buildableTiles = tilesWithinBounds(buildBounds).filter((tile) => hexDistance(tile, { q: 0, r: 0 }) > 0);
  const spawnTiles = BOARD_DIRECTIONS.map((entry) => {
    const sideTiles = sideTilesForDirection(tiles, boardBounds, entry.id);
    return { ...sideTiles[Math.floor(sideTiles.length / 2)] };
  });

  return {
    tiles,
    buildableTiles,
    spawnTiles,
    boundingRadius: tiles.reduce((max, tile) => Math.max(max, hexDistance(tile, { q: 0, r: 0 })), 0),
    buildRadius: buildableTiles.reduce((max, tile) => Math.max(max, hexDistance(tile, { q: 0, r: 0 })), 0)
  };
}

export function boardExpansionDirections(): BoardExpansionDirection[] {
  return BOARD_DIRECTIONS.map((entry) => entry.id);
}

export function boardExpansionDirectionVector(direction: BoardExpansionDirection): AxialCoord {
  return { ...directionConfig(direction).vector };
}

export function boardExpansionDirectionLabel(direction: BoardExpansionDirection): string {
  return directionConfig(direction).label;
}

export function defeatedBossCountForWave(index: number, content: GameContent): number {
  return Math.max(0, Math.floor((Math.max(1, index) - 1) / content.config.bossEvery));
}

export function buildBoardFootprint(state: RunState, content: GameContent): BoardFootprint {
  return footprintForExpansions(state.boardExpansionDirections, content);
}

export function gridRadiusForWave(index: number, content: GameContent): number {
  const bossCount = defeatedBossCountForWave(index, content);
  return content.config.gridRadius + (bossCount > 0 ? EXPANSION_STEP_LENGTH * Math.min(bossCount, 6) : 0);
}

export function buildRadiusForWave(index: number, content: GameContent): number {
  const bossCount = defeatedBossCountForWave(index, content);
  return content.config.buildRadius + (bossCount > 0 ? EXPANSION_STEP_LENGTH * Math.min(bossCount, 6) : 0);
}

export function currentGridRadius(state: RunState, content: GameContent): number {
  return buildBoardFootprint(state, content).boundingRadius;
}

export function currentBuildRadius(state: RunState, content: GameContent): number {
  return buildBoardFootprint(state, content).buildRadius;
}

export function spawnLanesForWave(_index: number, content: GameContent): AxialCoord[] {
  return footprintForExpansions([], content).spawnTiles;
}

export function currentSpawnLanes(state: RunState, content: GameContent): AxialCoord[] {
  return buildBoardFootprint(state, content).spawnTiles;
}

export function isTileInBoard(state: RunState, tile: AxialCoord, content: GameContent): boolean {
  return buildBoardFootprint(state, content).tiles.some((entry) => entry.q === tile.q && entry.r === tile.r);
}

export function isBuildableTile(state: RunState, tile: AxialCoord, content: GameContent): boolean {
  return buildBoardFootprint(state, content).buildableTiles.some((entry) => entry.q === tile.q && entry.r === tile.r);
}

export function createLandmarkTilesForState(
  state: RunState,
  content: GameContent
): Record<WorldLandmarkId, AxialCoord> {
  const footprint = buildBoardFootprint(state, content);
  const spawnKeys = new Set(footprint.spawnTiles.map(coordKey));
  const buildableKeys = new Set(footprint.buildableTiles.map(coordKey));
  const allCandidates = footprint.tiles
    .filter((tile) => {
      const distance = hexDistance(tile, { q: 0, r: 0 });
      return distance >= 1 && distance <= 4;
    })
    .filter((tile) => buildableKeys.has(coordKey(tile)))
    .filter((tile) => !spawnKeys.has(coordKey(tile)))
    .sort((left, right) => (left.r - right.r) || (left.q - right.q));
  const preferredCandidates = allCandidates.filter((tile) => {
    const distance = hexDistance(tile, { q: 0, r: 0 });
    return distance >= 3 && distance <= 4;
  });
  const candidates = preferredCandidates.length >= LANDMARK_IDS.length ? preferredCandidates : allCandidates;

  const available = [...candidates];
  const landmarkTiles = {} as Record<WorldLandmarkId, AxialCoord>;
  for (const landmarkId of LANDMARK_IDS) {
    const fallback = available[0] ?? { q: 0, r: 0 };
    const index = available.length > 0
      ? mixSeed(state.seed, LANDMARK_SELECTION_SALTS[landmarkId] ^ available.length) % available.length
      : 0;
    const picked = available.splice(index, 1)[0] ?? fallback;
    landmarkTiles[landmarkId] = { ...picked };
  }
  return landmarkTiles;
}

export function landmarkTileForState(state: RunState, landmarkId: WorldLandmarkId, content: GameContent): AxialCoord {
  const stored = state.landmarkTiles?.[landmarkId];
  if (stored && isTileInBoard(state, stored, content)) {
    return { ...stored };
  }
  return createLandmarkTilesForState(state, content)[landmarkId];
}
