import { coordKey } from '../geometry';
import type { AxialCoord, BoardCamera, GameSnapshot } from '../types';
import { DEFAULT_BOARD_CAMERA, getBoardLayout, pixelToAxial, type BoardLayout } from './layout';

interface CircleTarget<T> {
  center: { x: number; y: number };
  radius: number;
  value: T;
}

function pickCircleTargetAtPoint<T>(
  point: { x: number; y: number },
  targets: CircleTarget<T>[]
): T | null {
  const hit = targets.find((target) => (
    Math.hypot(target.center.x - point.x, target.center.y - point.y) <= target.radius
  ));
  return hit?.value ?? null;
}

export function pickTileAtCanvasPoint(
  snapshot: GameSnapshot,
  rect: DOMRect,
  clientX: number,
  clientY: number,
  camera: BoardCamera = DEFAULT_BOARD_CAMERA
): AxialCoord | null {
  const layout = getBoardLayout(rect.width, rect.height, snapshot.config.gridRadius, camera);
  const tile = pixelToAxial(clientX - rect.left, clientY - rect.top, layout);
  const tileKeys = new Set(snapshot.tiles.map(coordKey));
  return tileKeys.has(coordKey(tile)) ? tile : null;
}

export function pickDefenderAtCanvasPoint(
  snapshot: GameSnapshot,
  rect: DOMRect,
  clientX: number,
  clientY: number,
  resolveTargets: (snapshot: GameSnapshot, layout: BoardLayout) => CircleTarget<string>[],
  camera: BoardCamera = DEFAULT_BOARD_CAMERA
): string | null {
  const layout = getBoardLayout(rect.width, rect.height, snapshot.config.gridRadius, camera);
  const pointer = { x: clientX - rect.left, y: clientY - rect.top };
  return pickCircleTargetAtPoint(pointer, resolveTargets(snapshot, layout));
}

export function pickEnemyAtCanvasPoint(
  snapshot: GameSnapshot,
  rect: DOMRect,
  clientX: number,
  clientY: number,
  resolveTargets: (snapshot: GameSnapshot, layout: BoardLayout) => CircleTarget<number>[],
  camera: BoardCamera = DEFAULT_BOARD_CAMERA
): number | null {
  const layout = getBoardLayout(rect.width, rect.height, snapshot.config.gridRadius, camera);
  const pointer = { x: clientX - rect.left, y: clientY - rect.top };
  return pickCircleTargetAtPoint(pointer, resolveTargets(snapshot, layout));
}
