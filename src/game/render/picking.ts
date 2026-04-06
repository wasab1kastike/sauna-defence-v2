import { hexDistance } from '../geometry';
import type { AxialCoord, GameSnapshot } from '../types';
import { getBoardLayout, pixelToAxial, type BoardLayout } from './layout';

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
  clientY: number
): AxialCoord | null {
  const layout = getBoardLayout(rect.width, rect.height, snapshot.config.gridRadius);
  const tile = pixelToAxial(clientX - rect.left, clientY - rect.top, layout);
  return hexDistance(tile, { q: 0, r: 0 }) > snapshot.config.gridRadius ? null : tile;
}

export function pickDefenderAtCanvasPoint(
  snapshot: GameSnapshot,
  rect: DOMRect,
  clientX: number,
  clientY: number,
  resolveTargets: (snapshot: GameSnapshot, layout: BoardLayout) => CircleTarget<string>[]
): string | null {
  const layout = getBoardLayout(rect.width, rect.height, snapshot.config.gridRadius);
  const pointer = { x: clientX - rect.left, y: clientY - rect.top };
  return pickCircleTargetAtPoint(pointer, resolveTargets(snapshot, layout));
}

export function pickEnemyAtCanvasPoint(
  snapshot: GameSnapshot,
  rect: DOMRect,
  clientX: number,
  clientY: number,
  resolveTargets: (snapshot: GameSnapshot, layout: BoardLayout) => CircleTarget<number>[]
): number | null {
  const layout = getBoardLayout(rect.width, rect.height, snapshot.config.gridRadius);
  const pointer = { x: clientX - rect.left, y: clientY - rect.top };
  return pickCircleTargetAtPoint(pointer, resolveTargets(snapshot, layout));
}
