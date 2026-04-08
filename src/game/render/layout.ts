import type { AxialCoord, BoardCamera, GameSnapshot } from '../types';

const SQRT3 = Math.sqrt(3);
const BASE_PADDING_RATIO = 0.032;
const MIN_PADDING = 12;

export const DEFAULT_BOARD_CAMERA: BoardCamera = {
  zoom: 1,
  offsetX: 0,
  offsetY: 0
};

export interface BoardLayout {
  hexSize: number;
  centerX: number;
  centerY: number;
}

function baseBoardHexSize(width: number, height: number, radius: number): number {
  const visualRadius = Math.max(1, radius - Math.min(0.55, Math.max(0.22, radius * 0.06)));
  const padding = Math.max(MIN_PADDING, Math.min(width, height) * BASE_PADDING_RATIO);
  const horizontalCapacity = (width - padding * 2) / (SQRT3 * (visualRadius * 2 + 1.4));
  const verticalCapacity = (height - padding * 2) / (visualRadius * 3 + 2.22);
  return Math.max(14, Math.min(horizontalCapacity, verticalCapacity));
}

export function clampBoardCamera(
  camera: BoardCamera,
  width: number,
  height: number,
  radius: number
): BoardCamera {
  const zoom = Math.min(1.9, Math.max(0.75, camera.zoom));
  const padding = Math.max(MIN_PADDING, Math.min(width, height) * BASE_PADDING_RATIO);
  const hexSize = baseBoardHexSize(width, height, radius) * zoom;
  const boardHalfWidth = (SQRT3 * hexSize * (radius * 2 + 1)) / 2;
  const boardHalfHeight = hexSize * (radius * 1.5 + 1.2);
  const maxOffsetX = Math.max(0, boardHalfWidth + padding - width / 2);
  const maxOffsetY = Math.max(0, boardHalfHeight + padding - height / 2);

  return {
    zoom,
    offsetX: Math.min(maxOffsetX, Math.max(-maxOffsetX, camera.offsetX)),
    offsetY: Math.min(maxOffsetY, Math.max(-maxOffsetY, camera.offsetY))
  };
}

export function getBoardLayout(width: number, height: number, radius: number, camera: BoardCamera = DEFAULT_BOARD_CAMERA): BoardLayout {
  const nextCamera = clampBoardCamera(camera, width, height, radius);
  return {
    hexSize: baseBoardHexSize(width, height, radius) * nextCamera.zoom,
    centerX: width / 2 + nextCamera.offsetX,
    centerY: height / 2 + nextCamera.offsetY
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
  tile: AxialCoord,
  camera: BoardCamera = DEFAULT_BOARD_CAMERA
) {
  return axialToPixel(tile, getBoardLayout(viewportWidth, viewportHeight, snapshot.config.gridRadius, camera));
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
