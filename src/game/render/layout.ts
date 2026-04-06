import type { AxialCoord, GameSnapshot } from '../types';

const SQRT3 = Math.sqrt(3);

export interface BoardLayout {
  hexSize: number;
  centerX: number;
  centerY: number;
}

export function getBoardLayout(width: number, height: number, radius: number): BoardLayout {
  const visualRadius = Math.max(1, radius - Math.min(0.55, Math.max(0.22, radius * 0.06)));
  const padding = Math.max(12, Math.min(width, height) * 0.032);
  const horizontalCapacity = (width - padding * 2) / (SQRT3 * (visualRadius * 2 + 1.4));
  const verticalCapacity = (height - padding * 2) / (visualRadius * 3 + 2.22);
  return {
    hexSize: Math.max(14, Math.min(horizontalCapacity, verticalCapacity)),
    centerX: width / 2,
    centerY: height / 2
  };
}

export function axialToPixel(tile: AxialCoord, layout: BoardLayout) {
  return {
    x: layout.centerX + layout.hexSize * SQRT3 * (tile.q + tile.r / 2),
    y: layout.centerY + layout.hexSize * 1.5 * tile.r
  };
}

export function axialFloatToPixel(tile: { q: number; r: number }, layout: BoardLayout) {
  return {
    x: layout.centerX + layout.hexSize * SQRT3 * (tile.q + tile.r / 2),
    y: layout.centerY + layout.hexSize * 1.5 * tile.r
  };
}

export function getTileViewportPosition(
  snapshot: GameSnapshot,
  viewportWidth: number,
  viewportHeight: number,
  tile: AxialCoord
) {
  return axialToPixel(tile, getBoardLayout(viewportWidth, viewportHeight, snapshot.config.gridRadius));
}

export function roundAxial(q: number, r: number): AxialCoord {
  const x = q;
  const z = r;
  const y = -x - z;
  let rx = Math.round(x);
  let ry = Math.round(y);
  let rz = Math.round(z);
  const xDiff = Math.abs(rx - x);
  const yDiff = Math.abs(ry - y);
  const zDiff = Math.abs(rz - z);
  if (xDiff > yDiff && xDiff > zDiff) rx = -ry - rz;
  else if (yDiff > zDiff) ry = -rx - rz;
  else rz = -rx - ry;
  return { q: rx, r: rz };
}

export function pixelToAxial(x: number, y: number, layout: BoardLayout): AxialCoord {
  const localX = x - layout.centerX;
  const localY = y - layout.centerY;
  const q = (SQRT3 / 3 * localX - localY / 3) / layout.hexSize;
  const r = ((2 / 3) * localY) / layout.hexSize;
  return roundAxial(q, r);
}
