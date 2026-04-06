import type { AxialCoord } from './types';

const CENTER: AxialCoord = { q: 0, r: 0 };

export function coordKey(coord: AxialCoord): string {
  return `${coord.q},${coord.r}`;
}

export function sameCoord(left: AxialCoord, right: AxialCoord): boolean {
  return left.q === right.q && left.r === right.r;
}

export function add(left: AxialCoord, right: AxialCoord): AxialCoord {
  return { q: left.q + right.q, r: left.r + right.r };
}

export function cloneCoord(coord: AxialCoord): AxialCoord {
  return { q: coord.q, r: coord.r };
}

export function rotateClockwise(coord: AxialCoord): AxialCoord {
  return { q: -coord.r, r: coord.q + coord.r };
}

export function rotateCoord(coord: AxialCoord, times: number): AxialCoord {
  let next = { ...coord };
  for (let index = 0; index < times; index += 1) {
    next = rotateClockwise(next);
  }
  return next;
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
  return tiles.sort((left, right) => (left.r - right.r) || (left.q - right.q));
}

export function perimeterTiles(radius: number): AxialCoord[] {
  if (radius <= 0) {
    return [{ ...CENTER }];
  }

  const tiles: AxialCoord[] = [];
  let tile = { q: 0, r: -radius };
  const edges: AxialCoord[] = [
    { q: 1, r: 0 },
    { q: 0, r: 1 },
    { q: -1, r: 1 },
    { q: -1, r: 0 },
    { q: 0, r: -1 },
    { q: 1, r: -1 }
  ];

  tiles.push({ ...tile });
  for (const edge of edges) {
    for (let step = 0; step < radius; step += 1) {
      tile = add(tile, edge);
      if (tiles.length < radius * 6) {
        tiles.push({ ...tile });
      }
    }
  }

  return tiles;
}
