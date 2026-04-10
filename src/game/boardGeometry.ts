import type {
  AxialCoord,
  BoardExpansionDirection,
  GameContent,
  RunState,
  WorldLandmarkId
} from './types';
import { coordKey, createHexGrid, hexDistance } from './geometry';

const EXPANSION_STEP_LENGTH = 4;

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

const LANDMARK_PREFERENCES: Record<WorldLandmarkId, AxialCoord> = {
  metashop: { q: 1, r: -2 },
  beer_shop: { q: -1, r: 2 }
};

export interface BoardFootprint {
  tiles: AxialCoord[];
  buildableTiles: AxialCoord[];
  spawnTiles: AxialCoord[];
  boundingRadius: number;
  buildRadius: number;
}

function scale(coord: AxialCoord, amount: number): AxialCoord {
  return { q: coord.q * amount, r: coord.r * amount };
}

function cubeProjection(tile: AxialCoord, vector: AxialCoord): number {
  const tileS = -tile.q - tile.r;
  const vectorS = -vector.q - vector.r;
  return tile.q * vector.q + tile.r * vector.r + tileS * vectorS;
}

function directionConfig(direction: BoardExpansionDirection) {
  return BOARD_DIRECTIONS.find((entry) => entry.id === direction)!;
}

function sortTiles(tiles: Iterable<AxialCoord>): AxialCoord[] {
  return [...tiles].sort((left, right) => (left.r - right.r) || (left.q - right.q));
}

function baseSpawnTile(direction: BoardExpansionDirection, content: GameContent): AxialCoord {
  return scale(directionConfig(direction).vector, content.config.gridRadius);
}

function expansionCounts(expansions: BoardExpansionDirection[]): Record<BoardExpansionDirection, number> {
  return BOARD_DIRECTIONS.reduce((acc, entry) => {
    acc[entry.id] = expansions.filter((direction) => direction === entry.id).length;
    return acc;
  }, {} as Record<BoardExpansionDirection, number>);
}

function footprintForExpansions(expansions: BoardExpansionDirection[], content: GameContent): BoardFootprint {
  const tileMap = new Map<string, AxialCoord>();
  const buildableKeys = new Set<string>();
  const baseRadius = content.config.gridRadius;
  const baseBuildRadius = content.config.buildRadius;

  for (const tile of createHexGrid(baseRadius)) {
    tileMap.set(coordKey(tile), tile);
    const distance = hexDistance(tile, { q: 0, r: 0 });
    if (distance > 0 && distance <= baseBuildRadius) {
      buildableKeys.add(coordKey(tile));
    }
  }

  for (const entry of BOARD_DIRECTIONS) {
    const tile = baseSpawnTile(entry.id, content);
    buildableKeys.delete(coordKey(tile));
  }

  const counts = expansionCounts(expansions);
  for (const entry of BOARD_DIRECTIONS) {
    const count = counts[entry.id];
    if (count <= 0) {
      continue;
    }

    const tipDistance = baseRadius + count * EXPANSION_STEP_LENGTH;
    for (let distance = baseRadius; distance < tipDistance; distance += 1) {
      const tile = scale(entry.vector, distance);
      tileMap.set(coordKey(tile), tile);
      if (distance > 0) {
        buildableKeys.add(coordKey(tile));
      }
    }

    for (let distance = baseRadius + 1; distance <= tipDistance; distance += 1) {
      const tile = scale(entry.vector, distance);
      tileMap.set(coordKey(tile), tile);
    }

    const tipTile = scale(entry.vector, tipDistance);
    buildableKeys.delete(coordKey(tipTile));
  }

  const tiles = sortTiles(tileMap.values());
  const buildableTiles = tiles.filter((tile) => buildableKeys.has(coordKey(tile)));
  const spawnTiles = BOARD_DIRECTIONS.map((entry) => {
    const tipDistance = baseRadius + counts[entry.id] * EXPANSION_STEP_LENGTH;
    return scale(entry.vector, tipDistance);
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
  return BOARD_DIRECTIONS.map((entry) => baseSpawnTile(entry.id, content));
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

export function landmarkTileForState(state: RunState, landmarkId: WorldLandmarkId, content: GameContent): AxialCoord {
  const footprint = buildBoardFootprint(state, content);
  const spawnKeys = new Set(footprint.spawnTiles.map(coordKey));
  const buildableKeys = new Set(footprint.buildableTiles.map(coordKey));
  const preference = LANDMARK_PREFERENCES[landmarkId];
  const candidates = footprint.tiles
    .filter((tile) => hexDistance(tile, { q: 0, r: 0 }) >= Math.max(2, content.config.gridRadius - 1))
    .filter((tile) => !spawnKeys.has(coordKey(tile)))
    .filter((tile) => !buildableKeys.has(coordKey(tile)));

  if (candidates.length === 0) {
    return { q: 0, r: 0 };
  }

  return candidates.sort((left, right) =>
    (cubeProjection(right, preference) - cubeProjection(left, preference))
    || (hexDistance(right, { q: 0, r: 0 }) - hexDistance(left, { q: 0, r: 0 }))
    || (left.r - right.r)
    || (left.q - right.q)
  )[0];
}
