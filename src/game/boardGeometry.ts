import type { GameContent, RunState, WorldLandmarkId, AxialCoord } from './types';
import { add, perimeterTiles } from './geometry';

export function defeatedBossCountForWave(index: number, content: GameContent): number {
  return Math.max(0, Math.floor((Math.max(1, index) - 1) / content.config.bossEvery));
}

export function gridRadiusForWave(index: number, content: GameContent): number {
  return content.config.gridRadius + defeatedBossCountForWave(index, content);
}

export function buildRadiusForWave(index: number, content: GameContent): number {
  return content.config.buildRadius + defeatedBossCountForWave(index, content);
}

export function currentGridRadius(state: RunState, content: GameContent): number {
  return gridRadiusForWave(state.waveIndex, content);
}

export function currentBuildRadius(state: RunState, content: GameContent): number {
  return buildRadiusForWave(state.waveIndex, content);
}

export function spawnLanesForWave(index: number, content: GameContent): AxialCoord[] {
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

export function currentSpawnLanes(state: RunState, content: GameContent): AxialCoord[] {
  return spawnLanesForWave(state.waveIndex, content);
}

export function landmarkTileForWave(index: number, landmarkId: WorldLandmarkId, content: GameContent): AxialCoord {
  const radius = gridRadiusForWave(index, content);
  const offset = Math.ceil(radius / 2);
  return landmarkId === 'metashop'
    ? add({ q: 0, r: 0 }, { q: offset, r: -radius })
    : add({ q: 0, r: 0 }, { q: -offset, r: radius });
}
