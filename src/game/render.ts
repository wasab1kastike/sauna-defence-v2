import { coordKey, hexDistance } from './geometry';
import {
  axialFloatToPixel,
  axialToPixel,
  getBoardLayout,
  type BoardLayout
} from './render/layout';
import {
  pickDefenderAtCanvasPoint as pickDefenderAtCanvasPointFromModule,
  pickEnemyAtCanvasPoint as pickEnemyAtCanvasPointFromModule,
  pickTileAtCanvasPoint as pickTileAtCanvasPointFromModule
} from './render/picking';
export { getTileViewportPosition } from './render/layout';
import type {
  AxialCoord,
  BossId,
  DefenderTemplateId,
  EnemyInstance,
  EnemyUnitId,
  GameSnapshot,
  UnitMotionState,
  WaveDefinition
} from './types';

interface TokenPalette {
  shell: string;
  ring: string;
  accent: string;
  glow: string;
  glyph: string;
}

interface HealthBarOptions {
  height?: number;
  offsetMultiplier?: number;
  backdropAlpha?: number;
  strokeColor?: string;
}

export interface AnimatedHexPosition {
  q: number;
  r: number;
  progress: number;
  motionStyle: UnitMotionState['style'] | 'static';
  isMoving: boolean;
}

export interface BossVisualProfile {
  bossId: BossId | null;
  presentation: 'normal' | 'boss_unit' | 'boss_horde_member';
  label: string | null;
  glowColor: string;
  accentColor: string;
}

const DEFENDER_TOKEN_STYLES: TokenPalette[] = [
  { shell: '#f5d69a', ring: '#5a3f1b', accent: '#d46b2d', glow: 'rgba(255,179,92,0.28)', glyph: 'diamond' },
  { shell: '#cddfef', ring: '#22384f', accent: '#70c7d4', glow: 'rgba(112,199,212,0.22)', glyph: 'chevrons' },
  { shell: '#f2b58d', ring: '#6a2e23', accent: '#ffd57c', glow: 'rgba(255,140,92,0.24)', glyph: 'sun' },
  { shell: '#d8efc8', ring: '#294734', accent: '#7bc87a', glow: 'rgba(123,200,122,0.24)', glyph: 'leaf' },
  { shell: '#e2d0f7', ring: '#473061', accent: '#b78ff7', glow: 'rgba(183,143,247,0.24)', glyph: 'split' },
  { shell: '#f1e7be', ring: '#5b5121', accent: '#e0ae41', glow: 'rgba(224,174,65,0.24)', glyph: 'tower' },
  { shell: '#cce8df', ring: '#20433f', accent: '#52b8a3', glow: 'rgba(82,184,163,0.24)', glyph: 'trident' },
  { shell: '#ffd7d2', ring: '#5e2b2b', accent: '#ef7360', glow: 'rgba(239,115,96,0.24)', glyph: 'mask' },
  { shell: '#d5dbff', ring: '#24305c', accent: '#6b87ff', glow: 'rgba(107,135,255,0.24)', glyph: 'star' },
  { shell: '#efe4d6', ring: '#473427', accent: '#b87c4d', glow: 'rgba(184,124,77,0.24)', glyph: 'rune' }
];

const ENEMY_TOKEN_STYLES: TokenPalette[] = [
  { shell: '#8d332c', ring: '#250909', accent: '#ef7360', glow: 'rgba(239,115,96,0.26)', glyph: 'fangs' },
  { shell: '#6d1f36', ring: '#210814', accent: '#f17ca3', glow: 'rgba(241,124,163,0.22)', glyph: 'eye' },
  { shell: '#7a4320', ring: '#281305', accent: '#ffb36a', glow: 'rgba(255,179,106,0.24)', glyph: 'horns' },
  { shell: '#5e2f63', ring: '#1f0c21', accent: '#d58bff', glow: 'rgba(213,139,255,0.22)', glyph: 'claw' },
  { shell: '#364b27', ring: '#0d1709', accent: '#a7dd63', glow: 'rgba(167,221,99,0.2)', glyph: 'skull' }
];

const DEFENDER_PORTRAIT_URLS = [
  `${import.meta.env.BASE_URL}defenders/defender_1.png`,
  `${import.meta.env.BASE_URL}defenders/defender_2.png`,
  `${import.meta.env.BASE_URL}defenders/defender_3.png`,
  `${import.meta.env.BASE_URL}defenders/defender_4.png`
];
const ENEMY_PORTRAIT_URLS = [
  `${import.meta.env.BASE_URL}enemies/enemy_goblin1.png`,
  `${import.meta.env.BASE_URL}enemies/enemy_rockmonster1.png`,
  `${import.meta.env.BASE_URL}enemies/enemy_steamhog4.png`,
  `${import.meta.env.BASE_URL}enemies/enemy_undead3.png`
];
const PEBBLE_HEAD_SPRITE_URL = `${import.meta.env.BASE_URL}enemies/pebble_head.png`;
const PEBBLE_BODY_SPRITE_URL = `${import.meta.env.BASE_URL}enemies/pebble_body.png`;
const BEER_SHOP_SPRITE_URL = `${import.meta.env.BASE_URL}Buildings/olutkauppa.png`;
const DEFENDER_SPRITE_SHEET_URL = `${import.meta.env.BASE_URL}defenders/sauna-party-sheet.png`;
const DEFENDER_ROLE_PORTRAITS: Record<DefenderTemplateId, number[]> = {
  guardian: [0],
  hurler: [1, 3],
  mender: [2]
};
const ENEMY_ROLE_PORTRAITS: Record<EnemyUnitId, number[]> = {
  raider: [0],
  brute: [1],
  chieftain: [2],
  pebble: [1],
  thirsty_user: [0, 3],
  electric_bather: [3],
  escalation_manager: [2, 3]
};

let defenderPortraits: Array<HTMLImageElement | null | undefined> | undefined;
let enemyPortraits: Array<HTMLImageElement | null | undefined> | undefined;
let defenderSpriteSheet: HTMLImageElement | null | undefined;
let processedPortraits = new WeakMap<HTMLImageElement, HTMLCanvasElement>();
let pebbleHeadSprite: HTMLImageElement | null | undefined;
let pebbleBodySprite: HTMLImageElement | null | undefined;
let processedPebbleSprites = new WeakMap<HTMLImageElement, HTMLCanvasElement>();
let beerShopSprite: HTMLImageElement | null | undefined;
let processedBackdropSprites = new WeakMap<HTMLImageElement, HTMLCanvasElement>();

export function collectFireballTelegraphTiles(snapshot: GameSnapshot): AxialCoord[] {
  const tiles = new Map<string, AxialCoord>();
  for (const pending of snapshot.state.pendingFireballs) {
    for (const tile of snapshot.tiles) {
      if (hexDistance(tile, pending.targetTile) <= 2) {
        tiles.set(coordKey(tile), tile);
      }
    }
  }
  return [...tiles.values()];
}

function buildHexPath(ctx: CanvasRenderingContext2D, center: { x: number; y: number }, size: number) {
  ctx.beginPath();
  for (let index = 0; index < 6; index += 1) {
    const angle = Math.PI / 180 * (60 * index - 30);
    const x = center.x + size * Math.cos(angle);
    const y = center.y + size * Math.sin(angle);
    if (index === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
}

function drawTile(
  ctx: CanvasRenderingContext2D,
  center: { x: number; y: number },
  size: number,
  fill: string,
  stroke: string,
  lineWidth = 1
) {
  buildHexPath(ctx, center, size);
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.lineWidth = lineWidth;
  ctx.strokeStyle = stroke;
  ctx.stroke();
}

function coordNoise(tile: AxialCoord) {
  const value = Math.sin(tile.q * 127.1 + tile.r * 311.7 + (tile.q + tile.r) * 74.7) * 43758.5453;
  return value - Math.floor(value);
}

function drawTreeCluster(ctx: CanvasRenderingContext2D, center: { x: number; y: number }, size: number, seed: number) {
  const trunkY = center.y + size * 0.16;
  const offset = (seed - 0.5) * size * 0.18;
  ctx.save();
  ctx.fillStyle = 'rgba(57, 39, 21, 0.7)';
  ctx.fillRect(center.x - size * 0.05 + offset, trunkY, size * 0.1, size * 0.22);
  ctx.fillStyle = 'rgba(46, 94, 70, 0.88)';
  ctx.beginPath();
  ctx.arc(center.x + offset, center.y - size * 0.04, size * 0.18, 0, Math.PI * 2);
  ctx.arc(center.x - size * 0.11 + offset, center.y + size * 0.02, size * 0.12, 0, Math.PI * 2);
  ctx.arc(center.x + size * 0.12 + offset, center.y + size * 0.04, size * 0.11, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawStoneCluster(ctx: CanvasRenderingContext2D, center: { x: number; y: number }, size: number, seed: number) {
  const offset = (seed - 0.5) * size * 0.26;
  ctx.save();
  ctx.fillStyle = 'rgba(121, 136, 140, 0.46)';
  ctx.beginPath();
  ctx.ellipse(center.x - size * 0.08 + offset, center.y + size * 0.14, size * 0.11, size * 0.07, 0.2, 0, Math.PI * 2);
  ctx.ellipse(center.x + size * 0.08 + offset, center.y + size * 0.17, size * 0.09, size * 0.06, -0.15, 0, Math.PI * 2);
  ctx.ellipse(center.x + offset, center.y + size * 0.08, size * 0.08, size * 0.05, 0.4, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawGrassTufts(ctx: CanvasRenderingContext2D, center: { x: number; y: number }, size: number, seed: number) {
  const offset = (seed - 0.5) * size * 0.22;
  ctx.save();
  ctx.strokeStyle = 'rgba(128, 175, 116, 0.34)';
  ctx.lineWidth = Math.max(1, size * 0.05);
  ctx.beginPath();
  ctx.moveTo(center.x - size * 0.12 + offset, center.y + size * 0.2);
  ctx.lineTo(center.x - size * 0.07 + offset, center.y + size * 0.05);
  ctx.moveTo(center.x - size * 0.02 + offset, center.y + size * 0.2);
  ctx.lineTo(center.x + offset, center.y + size * 0.02);
  ctx.moveTo(center.x + size * 0.08 + offset, center.y + size * 0.18);
  ctx.lineTo(center.x + size * 0.09 + offset, center.y + size * 0.04);
  ctx.stroke();
  ctx.restore();
}

function drawRiverMark(ctx: CanvasRenderingContext2D, center: { x: number; y: number }, size: number, tile: AxialCoord) {
  const angle = (tile.q - tile.r) * 0.12;
  ctx.save();
  ctx.translate(center.x, center.y);
  ctx.rotate(angle);
  ctx.strokeStyle = 'rgba(88, 185, 215, 0.48)';
  ctx.lineWidth = Math.max(1.5, size * 0.08);
  ctx.beginPath();
  ctx.moveTo(-size * 0.34, size * 0.12);
  ctx.bezierCurveTo(-size * 0.16, -size * 0.14, size * 0.08, 0, size * 0.3, -size * 0.16);
  ctx.stroke();
  ctx.strokeStyle = 'rgba(192, 245, 255, 0.18)';
  ctx.lineWidth = Math.max(1, size * 0.04);
  ctx.beginPath();
  ctx.moveTo(-size * 0.28, size * 0.08);
  ctx.bezierCurveTo(-size * 0.1, -size * 0.08, size * 0.12, 0.02, size * 0.24, -size * 0.1);
  ctx.stroke();
  ctx.restore();
}

function drawTileDecoration(
  ctx: CanvasRenderingContext2D,
  tile: AxialCoord,
  center: { x: number; y: number },
  size: number,
  buildable: boolean,
  spawn: boolean
) {
  const distance = hexDistance(tile, { q: 0, r: 0 });
  const seed = coordNoise(tile);

  if (spawn) {
    drawStoneCluster(ctx, center, size, seed);
    return;
  }

  if (buildable) {
    if (seed > 0.58) {
      drawGrassTufts(ctx, center, size, seed);
    }
    return;
  }

  if (distance >= 5 && Math.abs(tile.q + tile.r) <= 1) {
    drawRiverMark(ctx, center, size, tile);
    return;
  }

  if (seed > 0.66) {
    drawTreeCluster(ctx, center, size, seed);
    return;
  }

  if (seed > 0.34) {
    drawStoneCluster(ctx, center, size, seed);
  }
}

function drawHealthBar(
  ctx: CanvasRenderingContext2D,
  center: { x: number; y: number },
  width: number,
  ratio: number,
  color: string,
  options: HealthBarOptions = {}
) {
  const height = options.height ?? 5;
  const offsetMultiplier = options.offsetMultiplier ?? 1.2;
  const x = center.x - width / 2;
  const y = center.y - width * offsetMultiplier;
  ctx.fillStyle = `rgba(10, 16, 18, ${options.backdropAlpha ?? 0.45})`;
  ctx.fillRect(x, y, width, height);
  ctx.fillStyle = color;
  ctx.fillRect(x, y, width * Math.max(0, Math.min(1, ratio)), height);
  if (options.strokeColor) {
    ctx.strokeStyle = options.strokeColor;
    ctx.lineWidth = 1;
    ctx.strokeRect(x, y, width, height);
  }
}

function drawPolygon(ctx: CanvasRenderingContext2D, center: { x: number; y: number }, radius: number, sides: number, rotation = 0) {
  ctx.beginPath();
  for (let index = 0; index < sides; index += 1) {
    const angle = rotation + (Math.PI * 2 * index) / sides;
    const x = center.x + radius * Math.cos(angle);
    const y = center.y + radius * Math.sin(angle);
    if (index === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
}

function drawTokenBase(
  ctx: CanvasRenderingContext2D,
  center: { x: number; y: number },
  radius: number,
  palette: TokenPalette,
  accentColor: string
) {
  ctx.save();
  ctx.beginPath();
  ctx.arc(center.x, center.y, radius + 6, 0, Math.PI * 2);
  ctx.fillStyle = palette.glow;
  ctx.fill();

  const ringGradient = ctx.createRadialGradient(center.x, center.y, radius * 0.2, center.x, center.y, radius);
  ringGradient.addColorStop(0, palette.shell);
  ringGradient.addColorStop(1, palette.ring);
  ctx.beginPath();
  ctx.arc(center.x, center.y, radius, 0, Math.PI * 2);
  ctx.fillStyle = ringGradient;
  ctx.fill();

  ctx.beginPath();
  ctx.arc(center.x, center.y, radius * 0.78, 0, Math.PI * 2);
  ctx.fillStyle = accentColor;
  ctx.globalAlpha = 0.24;
  ctx.fill();
  ctx.globalAlpha = 1;

  ctx.beginPath();
  ctx.arc(center.x, center.y, radius * 0.92, 0, Math.PI * 2);
  ctx.lineWidth = 2.5;
  ctx.strokeStyle = palette.ring;
  ctx.stroke();
  ctx.restore();
}

function drawGlyph(ctx: CanvasRenderingContext2D, center: { x: number; y: number }, radius: number, glyph: string, color: string) {
  ctx.save();
  ctx.fillStyle = color;
  ctx.strokeStyle = color;
  ctx.lineWidth = Math.max(2, radius * 0.16);
  switch (glyph) {
    case 'diamond':
      drawPolygon(ctx, center, radius * 0.44, 4, Math.PI / 4);
      ctx.fill();
      break;
    case 'chevrons':
      ctx.beginPath();
      ctx.moveTo(center.x - radius * 0.46, center.y - radius * 0.1);
      ctx.lineTo(center.x, center.y - radius * 0.42);
      ctx.lineTo(center.x + radius * 0.46, center.y - radius * 0.1);
      ctx.moveTo(center.x - radius * 0.36, center.y + radius * 0.2);
      ctx.lineTo(center.x, center.y - radius * 0.12);
      ctx.lineTo(center.x + radius * 0.36, center.y + radius * 0.2);
      ctx.stroke();
      break;
    case 'sun':
      ctx.beginPath();
      ctx.arc(center.x, center.y, radius * 0.24, 0, Math.PI * 2);
      ctx.fill();
      for (let index = 0; index < 8; index += 1) {
        const angle = (Math.PI * 2 * index) / 8;
        ctx.beginPath();
        ctx.moveTo(center.x + Math.cos(angle) * radius * 0.34, center.y + Math.sin(angle) * radius * 0.34);
        ctx.lineTo(center.x + Math.cos(angle) * radius * 0.5, center.y + Math.sin(angle) * radius * 0.5);
        ctx.stroke();
      }
      break;
    case 'leaf':
      ctx.beginPath();
      ctx.moveTo(center.x, center.y - radius * 0.5);
      ctx.quadraticCurveTo(center.x + radius * 0.38, center.y - radius * 0.14, center.x, center.y + radius * 0.46);
      ctx.quadraticCurveTo(center.x - radius * 0.38, center.y - radius * 0.14, center.x, center.y - radius * 0.5);
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(center.x, center.y - radius * 0.34);
      ctx.lineTo(center.x, center.y + radius * 0.26);
      ctx.stroke();
      break;
    case 'split':
      drawPolygon(ctx, center, radius * 0.46, 6, Math.PI / 6);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(center.x, center.y - radius * 0.42);
      ctx.lineTo(center.x, center.y + radius * 0.42);
      ctx.stroke();
      break;
    case 'tower':
      ctx.beginPath();
      ctx.rect(center.x - radius * 0.28, center.y - radius * 0.34, radius * 0.56, radius * 0.68);
      ctx.fill();
      ctx.clearRect(center.x - radius * 0.08, center.y + radius * 0.04, radius * 0.16, radius * 0.24);
      break;
    case 'trident':
      ctx.beginPath();
      ctx.moveTo(center.x, center.y - radius * 0.48);
      ctx.lineTo(center.x, center.y + radius * 0.42);
      ctx.moveTo(center.x - radius * 0.3, center.y - radius * 0.04);
      ctx.lineTo(center.x, center.y - radius * 0.48);
      ctx.lineTo(center.x + radius * 0.3, center.y - radius * 0.04);
      ctx.stroke();
      break;
    case 'mask':
      ctx.beginPath();
      ctx.arc(center.x - radius * 0.18, center.y - radius * 0.04, radius * 0.08, 0, Math.PI * 2);
      ctx.arc(center.x + radius * 0.18, center.y - radius * 0.04, radius * 0.08, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(center.x - radius * 0.26, center.y + radius * 0.22);
      ctx.quadraticCurveTo(center.x, center.y + radius * 0.36, center.x + radius * 0.26, center.y + radius * 0.22);
      ctx.stroke();
      break;
    case 'star':
      ctx.beginPath();
      for (let index = 0; index < 10; index += 1) {
        const angle = -Math.PI / 2 + (Math.PI * index) / 5;
        const pointRadius = index % 2 === 0 ? radius * 0.46 : radius * 0.2;
        const x = center.x + Math.cos(angle) * pointRadius;
        const y = center.y + Math.sin(angle) * pointRadius;
        if (index === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.closePath();
      ctx.fill();
      break;
    case 'rune':
      ctx.beginPath();
      ctx.moveTo(center.x - radius * 0.28, center.y - radius * 0.42);
      ctx.lineTo(center.x + radius * 0.12, center.y - radius * 0.12);
      ctx.lineTo(center.x - radius * 0.08, center.y + radius * 0.06);
      ctx.lineTo(center.x + radius * 0.3, center.y + radius * 0.4);
      ctx.stroke();
      break;
    case 'fangs':
      drawPolygon(ctx, center, radius * 0.42, 3, -Math.PI / 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(center.x - radius * 0.16, center.y + radius * 0.06);
      ctx.lineTo(center.x - radius * 0.08, center.y + radius * 0.38);
      ctx.moveTo(center.x + radius * 0.16, center.y + radius * 0.06);
      ctx.lineTo(center.x + radius * 0.08, center.y + radius * 0.38);
      ctx.stroke();
      break;
    case 'eye':
      ctx.beginPath();
      ctx.ellipse(center.x, center.y, radius * 0.46, radius * 0.26, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(center.x, center.y, radius * 0.12, 0, Math.PI * 2);
      ctx.fill();
      break;
    case 'horns':
      ctx.beginPath();
      ctx.moveTo(center.x - radius * 0.42, center.y - radius * 0.12);
      ctx.lineTo(center.x - radius * 0.18, center.y - radius * 0.48);
      ctx.lineTo(center.x - radius * 0.02, center.y - radius * 0.1);
      ctx.moveTo(center.x + radius * 0.42, center.y - radius * 0.12);
      ctx.lineTo(center.x + radius * 0.18, center.y - radius * 0.48);
      ctx.lineTo(center.x + radius * 0.02, center.y - radius * 0.1);
      ctx.stroke();
      break;
    case 'claw':
      for (let index = -1; index <= 1; index += 1) {
        ctx.beginPath();
        ctx.moveTo(center.x + index * radius * 0.16 - radius * 0.12, center.y + radius * 0.34);
        ctx.lineTo(center.x + index * radius * 0.16 + radius * 0.06, center.y - radius * 0.36);
        ctx.stroke();
      }
      break;
    case 'skull':
      ctx.beginPath();
      ctx.arc(center.x, center.y - radius * 0.06, radius * 0.28, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.rect(center.x - radius * 0.18, center.y + radius * 0.08, radius * 0.36, radius * 0.18);
      ctx.stroke();
      break;
    default:
      ctx.beginPath();
      ctx.arc(center.x, center.y, radius * 0.22, 0, Math.PI * 2);
      ctx.fill();
  }
  ctx.restore();
}

function drawTokenLabel(
  ctx: CanvasRenderingContext2D,
  center: { x: number; y: number },
  radius: number,
  text: string,
  color: string
) {
  ctx.fillStyle = color;
  ctx.font = `800 ${Math.max(9, radius * 0.44)}px Trebuchet MS`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, center.x, center.y + radius * 0.6);
}

function drawDefenderName(
  ctx: CanvasRenderingContext2D,
  center: { x: number; y: number },
  radius: number,
  name: string
) {
  const firstName = name.trim().split(/\s+/)[0] ?? name;
  if (!firstName) return;

  ctx.save();
  ctx.font = `700 ${Math.max(10, radius * 0.34)}px Trebuchet MS`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  const metrics = ctx.measureText(firstName);
  const textWidth = metrics.width;
  const paddingX = Math.max(8, radius * 0.2);
  const pillWidth = textWidth + paddingX * 2;
  const pillHeight = Math.max(16, radius * 0.52);
  const x = center.x - pillWidth / 2;
  const y = center.y - radius * 1.08;
  const r = pillHeight / 2;

  ctx.fillStyle = 'rgba(8, 14, 16, 0.76)';
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + pillWidth - r, y);
  ctx.quadraticCurveTo(x + pillWidth, y, x + pillWidth, y + r);
  ctx.lineTo(x + pillWidth, y + pillHeight - r);
  ctx.quadraticCurveTo(x + pillWidth, y + pillHeight, x + pillWidth - r, y + pillHeight);
  ctx.lineTo(x + r, y + pillHeight);
  ctx.quadraticCurveTo(x, y + pillHeight, x, y + pillHeight - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
  ctx.fill();

  ctx.strokeStyle = 'rgba(255, 232, 188, 0.26)';
  ctx.lineWidth = 1;
  ctx.stroke();

  ctx.fillStyle = '#fff7df';
  ctx.fillText(firstName, center.x, y + pillHeight / 2 + 0.5);
  ctx.restore();
}

function getDefenderPortrait(index: number): HTMLImageElement | null {
  if (typeof Image === 'undefined') {
    return null;
  }
  if (!defenderPortraits) {
    defenderPortraits = DEFENDER_PORTRAIT_URLS.map((url) => {
      const image = new Image();
      image.src = url;
      return image;
    });
  }
  return defenderPortraits[index % defenderPortraits.length] ?? null;
}

function getEnemyPortrait(index: number): HTMLImageElement | null {
  if (typeof Image === 'undefined') {
    return null;
  }
  if (!enemyPortraits) {
    enemyPortraits = ENEMY_PORTRAIT_URLS.map((url) => {
      const image = new Image();
      image.src = url;
      return image;
    });
  }
  return enemyPortraits[index % enemyPortraits.length] ?? null;
}

function getDefenderSpriteSheet(): HTMLImageElement | null {
  if (typeof Image === 'undefined') {
    return null;
  }
  if (!defenderSpriteSheet) {
    defenderSpriteSheet = new Image();
    defenderSpriteSheet.src = DEFENDER_SPRITE_SHEET_URL;
  }
  return defenderSpriteSheet;
}

function getPebbleHeadSprite(): HTMLImageElement | null {
  if (typeof Image === 'undefined') {
    return null;
  }
  if (!pebbleHeadSprite) {
    pebbleHeadSprite = new Image();
    pebbleHeadSprite.src = PEBBLE_HEAD_SPRITE_URL;
  }
  return pebbleHeadSprite;
}

function getPebbleBodySprite(): HTMLImageElement | null {
  if (typeof Image === 'undefined') {
    return null;
  }
  if (!pebbleBodySprite) {
    pebbleBodySprite = new Image();
    pebbleBodySprite.src = PEBBLE_BODY_SPRITE_URL;
  }
  return pebbleBodySprite;
}

function getBeerShopSprite(): HTMLImageElement | null {
  if (typeof Image === 'undefined') {
    return null;
  }
  if (!beerShopSprite) {
    beerShopSprite = new Image();
    beerShopSprite.src = BEER_SHOP_SPRITE_URL;
  }
  return beerShopSprite;
}

function isDrawableImage(image: HTMLImageElement | HTMLCanvasElement | null | undefined): image is HTMLImageElement | HTMLCanvasElement {
  return Boolean(image) && (!(image instanceof HTMLImageElement) || (image.complete && image.naturalWidth > 0));
}

function fitSpriteDimensions(sourceWidth: number, sourceHeight: number, maxWidth: number, maxHeight: number) {
  const scale = Math.min(maxWidth / sourceWidth, maxHeight / sourceHeight);
  return {
    width: sourceWidth * scale,
    height: sourceHeight * scale
  };
}

function drawUnitShadow(
  ctx: CanvasRenderingContext2D,
  center: { x: number; y: number },
  width: number,
  height: number
) {
  ctx.save();
  ctx.fillStyle = 'rgba(6, 10, 12, 0.34)';
  ctx.beginPath();
  ctx.ellipse(center.x, center.y + height * 0.24, width * 0.26, height * 0.09, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawSprite(
  ctx: CanvasRenderingContext2D,
  image: HTMLImageElement | HTMLCanvasElement,
  source: { x: number; y: number; width: number; height: number } | null,
  center: { x: number; y: number },
  maxWidth: number,
  maxHeight: number
) {
  const sourceWidth = source?.width ?? (image instanceof HTMLImageElement ? image.naturalWidth : image.width);
  const sourceHeight = source?.height ?? (image instanceof HTMLImageElement ? image.naturalHeight : image.height);
  const dims = fitSpriteDimensions(sourceWidth, sourceHeight, maxWidth, maxHeight);
  const footY = center.y + maxHeight * 0.22;
  const destX = center.x - dims.width / 2;
  const destY = footY - dims.height;

  drawUnitShadow(ctx, center, dims.width, dims.height);

  ctx.save();
  const previousSmoothing = ctx.imageSmoothingEnabled;
  ctx.imageSmoothingEnabled = false;
  if (source) {
    ctx.drawImage(image, source.x, source.y, source.width, source.height, destX, destY, dims.width, dims.height);
  } else {
    ctx.drawImage(image, destX, destY, dims.width, dims.height);
  }
  ctx.imageSmoothingEnabled = previousSmoothing;
  ctx.restore();
}

function drawRotatedSprite(
  ctx: CanvasRenderingContext2D,
  image: HTMLImageElement | HTMLCanvasElement,
  center: { x: number; y: number },
  maxWidth: number,
  maxHeight: number,
  angle: number,
  shadowWidth = 0,
  shadowHeight = 0,
  flipY = false
) {
  const sourceWidth = image instanceof HTMLImageElement ? image.naturalWidth : image.width;
  const sourceHeight = image instanceof HTMLImageElement ? image.naturalHeight : image.height;
  const dims = fitSpriteDimensions(sourceWidth, sourceHeight, maxWidth, maxHeight);
  if (shadowWidth > 0 && shadowHeight > 0) {
    drawGroundShadow(ctx, { x: center.x, y: center.y + shadowHeight * 0.6 }, shadowWidth, shadowHeight, 'rgba(7, 10, 8, 0.4)');
  }

  ctx.save();
  ctx.translate(center.x, center.y);
  ctx.rotate(angle);
  if (flipY) {
    ctx.scale(1, -1);
  }
  const previousSmoothing = ctx.imageSmoothingEnabled;
  ctx.imageSmoothingEnabled = true;
  ctx.drawImage(image, -dims.width / 2, -dims.height * (flipY ? 0.28 : 0.72), dims.width, dims.height);
  ctx.imageSmoothingEnabled = previousSmoothing;
  ctx.restore();
}

function drawBaselineSprite(
  ctx: CanvasRenderingContext2D,
  image: HTMLImageElement | HTMLCanvasElement,
  center: { x: number; y: number },
  maxWidth: number,
  maxHeight: number,
  baselineY: number,
  smooth = false
) {
  const sourceWidth = image instanceof HTMLImageElement ? image.naturalWidth : image.width;
  const sourceHeight = image instanceof HTMLImageElement ? image.naturalHeight : image.height;
  const dims = fitSpriteDimensions(sourceWidth, sourceHeight, maxWidth, maxHeight);
  const destX = center.x - dims.width / 2;
  const destY = baselineY - dims.height;

  ctx.save();
  const previousSmoothing = ctx.imageSmoothingEnabled;
  ctx.imageSmoothingEnabled = smooth;
  ctx.drawImage(image, destX, destY, dims.width, dims.height);
  ctx.imageSmoothingEnabled = previousSmoothing;
  ctx.restore();
}

function isBackgroundPixel(data: Uint8ClampedArray, offset: number) {
  const r = data[offset];
  const g = data[offset + 1];
  const b = data[offset + 2];
  const a = data[offset + 3];
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  return a > 0 && max > 212 && max - min < 24;
}

function getProcessedPortrait(image: HTMLImageElement | null): HTMLCanvasElement | HTMLImageElement | null {
  if (!image || !image.complete || image.naturalWidth === 0 || typeof document === 'undefined') {
    return image;
  }

  const cached = processedPortraits.get(image);
  if (cached) {
    return cached;
  }

  const canvas = document.createElement('canvas');
  canvas.width = image.naturalWidth;
  canvas.height = image.naturalHeight;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) {
    return image;
  }

  ctx.drawImage(image, 0, 0);
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const { data, width, height } = imageData;
  const visited = new Uint8Array(width * height);
  const queue: number[] = [];

  const enqueue = (x: number, y: number) => {
    if (x < 0 || y < 0 || x >= width || y >= height) return;
    const index = y * width + x;
    if (visited[index]) return;
    visited[index] = 1;
    const offset = index * 4;
    if (!isBackgroundPixel(data, offset)) return;
    queue.push(index);
  };

  for (let x = 0; x < width; x += 1) {
    enqueue(x, 0);
    enqueue(x, height - 1);
  }
  for (let y = 0; y < height; y += 1) {
    enqueue(0, y);
    enqueue(width - 1, y);
  }

  while (queue.length > 0) {
    const index = queue.pop()!;
    const offset = index * 4;
    data[offset + 3] = 0;
    const x = index % width;
    const y = Math.floor(index / width);
    enqueue(x + 1, y);
    enqueue(x - 1, y);
    enqueue(x, y + 1);
    enqueue(x, y - 1);
  }

  ctx.putImageData(imageData, 0, 0);
  processedPortraits.set(image, canvas);
  return canvas;
}

function rgbaDistance(
  left: { r: number; g: number; b: number },
  right: { r: number; g: number; b: number }
) {
  return Math.abs(left.r - right.r) + Math.abs(left.g - right.g) + Math.abs(left.b - right.b);
}

function getProcessedPebbleSprite(image: HTMLImageElement | null): HTMLCanvasElement | HTMLImageElement | null {
  if (!image || !image.complete || image.naturalWidth === 0 || typeof document === 'undefined') {
    return image;
  }

  const cached = processedPebbleSprites.get(image);
  if (cached) {
    return cached;
  }

  const canvas = document.createElement('canvas');
  canvas.width = image.naturalWidth;
  canvas.height = image.naturalHeight;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) {
    return image;
  }

  ctx.drawImage(image, 0, 0);
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const { data, width, height } = imageData;
  const cornerSamples = [
    { r: data[0], g: data[1], b: data[2] },
    { r: data[(width - 1) * 4], g: data[(width - 1) * 4 + 1], b: data[(width - 1) * 4 + 2] },
    {
      r: data[((height - 1) * width) * 4],
      g: data[((height - 1) * width) * 4 + 1],
      b: data[((height - 1) * width) * 4 + 2]
    },
    {
      r: data[((height * width) - 1) * 4],
      g: data[((height * width) - 1) * 4 + 1],
      b: data[((height * width) - 1) * 4 + 2]
    }
  ];
  const background = cornerSamples.reduce(
    (total, sample) => ({
      r: total.r + sample.r / cornerSamples.length,
      g: total.g + sample.g / cornerSamples.length,
      b: total.b + sample.b / cornerSamples.length
    }),
    { r: 0, g: 0, b: 0 }
  );

  const visited = new Uint8Array(width * height);
  const queue: number[] = [];
  const threshold = 72;

  const enqueue = (x: number, y: number) => {
    if (x < 0 || y < 0 || x >= width || y >= height) return;
    const index = y * width + x;
    if (visited[index]) return;
    visited[index] = 1;
    const offset = index * 4;
    const pixel = { r: data[offset], g: data[offset + 1], b: data[offset + 2] };
    if (data[offset + 3] === 0 || rgbaDistance(pixel, background) > threshold) return;
    queue.push(index);
  };

  for (let x = 0; x < width; x += 1) {
    enqueue(x, 0);
    enqueue(x, height - 1);
  }
  for (let y = 0; y < height; y += 1) {
    enqueue(0, y);
    enqueue(width - 1, y);
  }

  while (queue.length > 0) {
    const index = queue.pop()!;
    const offset = index * 4;
    data[offset + 3] = 0;
    const x = index % width;
    const y = Math.floor(index / width);
    enqueue(x + 1, y);
    enqueue(x - 1, y);
    enqueue(x, y + 1);
    enqueue(x, y - 1);
  }

  ctx.putImageData(imageData, 0, 0);
  processedPebbleSprites.set(image, canvas);
  return canvas;
}

function getProcessedBackdropSprite(image: HTMLImageElement | null): HTMLCanvasElement | HTMLImageElement | null {
  if (!image || !image.complete || image.naturalWidth === 0 || typeof document === 'undefined') {
    return image;
  }

  const cached = processedBackdropSprites.get(image);
  if (cached) {
    return cached;
  }

  const canvas = document.createElement('canvas');
  canvas.width = image.naturalWidth;
  canvas.height = image.naturalHeight;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) {
    return image;
  }

  ctx.drawImage(image, 0, 0);
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const { data, width, height } = imageData;
  const cornerSamples = [
    { r: data[0], g: data[1], b: data[2] },
    { r: data[(width - 1) * 4], g: data[(width - 1) * 4 + 1], b: data[(width - 1) * 4 + 2] },
    {
      r: data[((height - 1) * width) * 4],
      g: data[((height - 1) * width) * 4 + 1],
      b: data[((height - 1) * width) * 4 + 2]
    },
    {
      r: data[((height * width) - 1) * 4],
      g: data[((height * width) - 1) * 4 + 1],
      b: data[((height * width) - 1) * 4 + 2]
    }
  ];
  const background = cornerSamples.reduce(
    (total, sample) => ({
      r: total.r + sample.r / cornerSamples.length,
      g: total.g + sample.g / cornerSamples.length,
      b: total.b + sample.b / cornerSamples.length
    }),
    { r: 0, g: 0, b: 0 }
  );

  const visited = new Uint8Array(width * height);
  const queue: number[] = [];
  const threshold = 60;

  const enqueue = (x: number, y: number) => {
    if (x < 0 || y < 0 || x >= width || y >= height) return;
    const index = y * width + x;
    if (visited[index]) return;
    visited[index] = 1;
    const offset = index * 4;
    const pixel = { r: data[offset], g: data[offset + 1], b: data[offset + 2] };
    if (data[offset + 3] === 0 || rgbaDistance(pixel, background) > threshold) return;
    queue.push(index);
  };

  for (let x = 0; x < width; x += 1) {
    enqueue(x, 0);
    enqueue(x, height - 1);
  }
  for (let y = 0; y < height; y += 1) {
    enqueue(0, y);
    enqueue(width - 1, y);
  }

  while (queue.length > 0) {
    const index = queue.pop()!;
    const offset = index * 4;
    data[offset + 3] = 0;
    const x = index % width;
    const y = Math.floor(index / width);
    enqueue(x + 1, y);
    enqueue(x - 1, y);
    enqueue(x, y + 1);
    enqueue(x, y - 1);
  }

  ctx.putImageData(imageData, 0, 0);
  processedBackdropSprites.set(image, canvas);
  return canvas;
}

function drawDefenderPortrait(
  ctx: CanvasRenderingContext2D,
  center: { x: number; y: number },
  radius: number,
  templateId: DefenderTemplateId,
  styleIndex: number
): boolean {
  const rolePortraits = DEFENDER_ROLE_PORTRAITS[templateId] ?? [0];
  const portraitIndex = rolePortraits[styleIndex % rolePortraits.length];

  const portrait = getDefenderPortrait(portraitIndex);
  const processedPortrait = getProcessedPortrait(portrait);
  if (processedPortrait && portrait && portrait.complete && portrait.naturalWidth > 0) {
    drawSprite(ctx, processedPortrait, null, center, radius * 2.45, radius * 2.85);
    return true;
  }

  const sheet = getDefenderSpriteSheet();
  if (!sheet || !sheet.complete || sheet.naturalWidth === 0) {
    return false;
  }

  const frameWidth = sheet.naturalWidth / 4;
  const frameHeight = sheet.naturalHeight;
  const frameX = (portraitIndex % 4) * frameWidth;
  drawSprite(ctx, sheet, { x: frameX, y: 0, width: frameWidth, height: frameHeight }, center, radius * 2.4, radius * 2.9);
  return true;
}

function drawEnemyPortrait(
  ctx: CanvasRenderingContext2D,
  center: { x: number; y: number },
  radius: number,
  archetypeId: EnemyUnitId,
  styleIndex: number
): boolean {
  const rolePortraits = ENEMY_ROLE_PORTRAITS[archetypeId] ?? [0];
  const portraitIndex = rolePortraits[styleIndex % rolePortraits.length];
  const portrait = getEnemyPortrait(portraitIndex);
  const processedPortrait = getProcessedPortrait(portrait);
  if (!processedPortrait || !portrait || !portrait.complete || portrait.naturalWidth === 0) {
    return false;
  }

  drawSprite(ctx, processedPortrait, null, center, radius * 2.2, radius * 3.3);
  return true;
}

function getDefenderStyle(styleId: number) {
  return DEFENDER_TOKEN_STYLES[styleId % DEFENDER_TOKEN_STYLES.length];
}

function getEnemyStyle(styleId: number) {
  return ENEMY_TOKEN_STYLES[styleId % ENEMY_TOKEN_STYLES.length];
}

function clamp(value: number, min = 0, max = 1) {
  return Math.max(min, Math.min(max, value));
}

function lerp(start: number, end: number, progress: number) {
  return start + (end - start) * progress;
}

function easeInOutSine(value: number) {
  const t = clamp(value);
  return -(Math.cos(Math.PI * t) - 1) / 2;
}

function easeOutCubic(value: number) {
  const t = clamp(value);
  return 1 - (1 - t) ** 3;
}

function easeInOutSmooth(value: number) {
  const t = clamp(value);
  return t * t * (3 - 2 * t);
}

export function resolveAnimatedHexPosition(
  tile: AxialCoord,
  motion: UnitMotionState | null | undefined,
  timeMs: number
): AnimatedHexPosition {
  if (!motion) {
    return {
      q: tile.q,
      r: tile.r,
      progress: 1,
      motionStyle: 'static',
      isMoving: false
    };
  }

  const rawProgress = clamp((timeMs - motion.startedAtMs) / Math.max(1, motion.durationMs));
  const easedProgress =
    motion.style === 'blink'
      ? easeOutCubic(rawProgress)
      : motion.style === 'slither'
        ? easeInOutSine(rawProgress)
        : easeInOutSmooth(rawProgress);

  return {
    q: lerp(motion.fromTile.q, motion.toTile.q, easedProgress),
    r: lerp(motion.fromTile.r, motion.toTile.r, easedProgress),
    progress: rawProgress,
    motionStyle: motion.style,
    isMoving: rawProgress < 1
  };
}

export function resolveBossVisualProfile(currentWave: WaveDefinition, archetypeId: EnemyUnitId): BossVisualProfile {
  if (!currentWave.isBoss || !currentWave.bossId) {
    return {
      bossId: null,
      presentation: 'normal',
      label: null,
      glowColor: 'rgba(0,0,0,0)',
      accentColor: 'rgba(0,0,0,0)'
    };
  }

  switch (currentWave.bossId) {
    case 'pebble':
      return archetypeId === 'pebble'
        ? {
            bossId: 'pebble',
            presentation: 'boss_unit',
            label: 'Pebble',
            glowColor: 'rgba(255, 166, 92, 0.42)',
            accentColor: '#ffca78'
          }
        : { bossId: null, presentation: 'normal', label: null, glowColor: 'rgba(0,0,0,0)', accentColor: 'rgba(0,0,0,0)' };
    case 'electric_bather':
      return archetypeId === 'electric_bather'
        ? {
            bossId: 'electric_bather',
            presentation: 'boss_unit',
            label: 'Electric Sauna User',
            glowColor: 'rgba(122, 220, 255, 0.44)',
            accentColor: '#d9f6ff'
          }
        : { bossId: null, presentation: 'normal', label: null, glowColor: 'rgba(0,0,0,0)', accentColor: 'rgba(0,0,0,0)' };
    case 'escalation_manager':
      return archetypeId === 'escalation_manager'
        ? {
            bossId: 'escalation_manager',
            presentation: 'boss_unit',
            label: 'Escalation Manager',
            glowColor: 'rgba(255, 113, 199, 0.38)',
            accentColor: '#ffe2ff'
          }
        : { bossId: null, presentation: 'normal', label: null, glowColor: 'rgba(0,0,0,0)', accentColor: 'rgba(0,0,0,0)' };
    case 'end_user_horde':
      return archetypeId === 'thirsty_user'
        ? {
            bossId: 'end_user_horde',
            presentation: 'boss_horde_member',
            label: 'End-User Horde',
            glowColor: 'rgba(255, 130, 98, 0.3)',
            accentColor: '#ffe2c7'
          }
        : { bossId: null, presentation: 'normal', label: null, glowColor: 'rgba(0,0,0,0)', accentColor: 'rgba(0,0,0,0)' };
    default:
      return {
        bossId: null,
        presentation: 'normal',
        label: null,
        glowColor: 'rgba(0,0,0,0)',
        accentColor: 'rgba(0,0,0,0)'
      };
  }
}

function enemyRenderRadius(layout: BoardLayout, enemy: EnemyInstance, bossProfile: BossVisualProfile): number {
  return layout.hexSize * (
    bossProfile.bossId === 'pebble'
      ? 0.92
      : bossProfile.presentation === 'boss_unit'
        ? 0.72
        : bossProfile.presentation === 'boss_horde_member'
          ? 0.56
          : enemy.archetypeId === 'chieftain'
            ? 0.54
            : 0.45
  );
}

function resolveEnemyCanvasUnit(enemy: EnemyInstance, snapshot: GameSnapshot, layout: BoardLayout) {
  const bossProfile = resolveBossVisualProfile(snapshot.state.currentWave, enemy.archetypeId);
  const animatedUnit = resolveAnimatedCanvasUnit(enemy.tile, enemy.motion ?? null, snapshot.state.timeMs, layout);
  const idleAngle = snapshot.state.timeMs * 0.004 + enemy.instanceId * 0.71;
  const idleX =
    bossProfile.bossId === 'electric_bather'
      ? Math.sin(idleAngle * 1.7) * layout.hexSize * 0.016
      : bossProfile.bossId === 'escalation_manager'
        ? Math.cos(idleAngle) * layout.hexSize * 0.014
        : Math.sin(idleAngle) * layout.hexSize * 0.01;
  const idleY =
    bossProfile.bossId === 'pebble'
      ? Math.sin(idleAngle * 1.3) * layout.hexSize * 0.015
      : Math.cos(idleAngle * 1.2) * layout.hexSize * 0.014;

  return {
    bossProfile,
    animatedUnit,
    center: {
      x: animatedUnit.center.x + idleX,
      y: animatedUnit.center.y + idleY
    },
    radius: enemyRenderRadius(layout, enemy, bossProfile)
  };
}

function pointLerp(
  start: { x: number; y: number },
  end: { x: number; y: number },
  progress: number
) {
  return {
    x: lerp(start.x, end.x, progress),
    y: lerp(start.y, end.y, progress)
  };
}

function fxNoise(seed: number) {
  const value = Math.sin(seed * 127.1) * 43758.5453;
  return value - Math.floor(value);
}

function drawGlowDisc(
  ctx: CanvasRenderingContext2D,
  center: { x: number; y: number },
  radius: number,
  innerColor: string,
  outerColor: string,
  alpha = 1
) {
  ctx.save();
  ctx.globalAlpha *= alpha;
  ctx.globalCompositeOperation = 'screen';
  const gradient = ctx.createRadialGradient(center.x, center.y, radius * 0.08, center.x, center.y, radius);
  gradient.addColorStop(0, innerColor);
  gradient.addColorStop(1, outerColor);
  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.arc(center.x, center.y, radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawShockRing(
  ctx: CanvasRenderingContext2D,
  center: { x: number; y: number },
  radius: number,
  color: string,
  lineWidth: number,
  alpha = 1
) {
  ctx.save();
  ctx.globalAlpha *= alpha;
  ctx.strokeStyle = color;
  ctx.lineWidth = lineWidth;
  ctx.beginPath();
  ctx.arc(center.x, center.y, radius, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}

function drawSparkBurst(
  ctx: CanvasRenderingContext2D,
  center: { x: number; y: number },
  radius: number,
  color: string,
  alpha: number,
  spokes: number,
  rotation = 0
) {
  ctx.save();
  ctx.globalAlpha *= alpha;
  ctx.strokeStyle = color;
  ctx.lineWidth = Math.max(1.2, radius * 0.08);
  for (let index = 0; index < spokes; index += 1) {
    const angle = rotation + (Math.PI * 2 * index) / spokes;
    const inner = radius * 0.2;
    const outer = radius;
    ctx.beginPath();
    ctx.moveTo(center.x + Math.cos(angle) * inner, center.y + Math.sin(angle) * inner);
    ctx.lineTo(center.x + Math.cos(angle) * outer, center.y + Math.sin(angle) * outer);
    ctx.stroke();
  }
  ctx.restore();
}

function drawEmberParticles(
  ctx: CanvasRenderingContext2D,
  center: { x: number; y: number },
  baseRadius: number,
  progress: number,
  seedBase: number,
  color: string,
  count: number
) {
  ctx.save();
  ctx.fillStyle = color;
  for (let index = 0; index < count; index += 1) {
    const seed = seedBase + index * 17.13;
    const angle = fxNoise(seed) * Math.PI * 2;
    const drift = baseRadius * (0.25 + fxNoise(seed + 1) * 0.9) * progress;
    const wobble = (fxNoise(seed + 2) - 0.5) * baseRadius * 0.12;
    const size = Math.max(1.2, baseRadius * (0.03 + fxNoise(seed + 3) * 0.04) * (1 - progress * 0.35));
    const x = center.x + Math.cos(angle) * drift + wobble;
    const y = center.y + Math.sin(angle) * drift - baseRadius * 0.14 * progress;
    ctx.globalAlpha = clamp(0.9 - progress * 0.75, 0, 0.9);
    ctx.beginPath();
    ctx.arc(x, y, size, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function drawSmokeParticles(
  ctx: CanvasRenderingContext2D,
  center: { x: number; y: number },
  baseRadius: number,
  progress: number,
  seedBase: number,
  color: string,
  count: number
) {
  ctx.save();
  for (let index = 0; index < count; index += 1) {
    const seed = seedBase + index * 29.7;
    const angle = fxNoise(seed) * Math.PI * 2;
    const drift = baseRadius * (0.18 + fxNoise(seed + 1) * 0.6) * progress;
    const rise = baseRadius * (0.08 + fxNoise(seed + 2) * 0.26) * progress;
    const radius = baseRadius * (0.08 + fxNoise(seed + 3) * 0.12) * (0.7 + progress * 0.5);
    ctx.globalAlpha = clamp(0.26 - progress * 0.2, 0, 0.26);
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(
      center.x + Math.cos(angle) * drift,
      center.y + Math.sin(angle) * drift - rise,
      radius,
      0,
      Math.PI * 2
    );
    ctx.fill();
  }
  ctx.restore();
}

function drawLightningArc(
  ctx: CanvasRenderingContext2D,
  start: { x: number; y: number },
  end: { x: number; y: number },
  color: string,
  width: number,
  alpha: number,
  seed: number
) {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const length = Math.max(1, Math.hypot(dx, dy));
  const normalX = -dy / length;
  const normalY = dx / length;

  ctx.save();
  ctx.globalAlpha *= alpha;
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.beginPath();
  ctx.moveTo(start.x, start.y);
  const segments = 6;
  for (let index = 1; index < segments; index += 1) {
    const t = index / segments;
    const offset = (fxNoise(seed + index * 11) - 0.5) * length * 0.14;
    const x = lerp(start.x, end.x, t) + normalX * offset;
    const y = lerp(start.y, end.y, t) + normalY * offset;
    ctx.lineTo(x, y);
  }
  ctx.lineTo(end.x, end.y);
  ctx.stroke();
  ctx.restore();
}

function drawAfterimageTrail(
  ctx: CanvasRenderingContext2D,
  start: { x: number; y: number },
  end: { x: number; y: number },
  color: string,
  alpha: number
) {
  ctx.save();
  for (let index = 0; index < 4; index += 1) {
    const t = index / 3;
    const point = pointLerp(start, end, t);
    ctx.globalAlpha = alpha * (1 - t) * 0.55;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.ellipse(point.x, point.y, lerp(6, 15, t), lerp(3, 9, t), 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function drawSpinBlade(
  ctx: CanvasRenderingContext2D,
  center: { x: number; y: number },
  orbitRadius: number,
  angle: number,
  bladeLength: number,
  bladeWidth: number,
  color: string,
  glow: string,
  alpha: number
) {
  const x = center.x + Math.cos(angle) * orbitRadius;
  const y = center.y + Math.sin(angle) * orbitRadius;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle + Math.PI / 2);
  ctx.globalAlpha *= alpha;
  drawGlowDisc(ctx, { x: 0, y: 0 }, bladeLength * 0.72, glow, 'rgba(255,255,255,0)', 0.6);
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(0, -bladeLength * 0.56);
  ctx.lineTo(bladeWidth * 0.42, bladeLength * 0.18);
  ctx.lineTo(0, bladeLength * 0.52);
  ctx.lineTo(-bladeWidth * 0.42, bladeLength * 0.18);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function getTravelAngle(tile: AxialCoord, motion: UnitMotionState | null | undefined, layout: BoardLayout) {
  const from = motion?.fromTile ?? tile;
  const to = motion?.toTile ?? tile;
  const start = axialToPixel(from, layout);
  const end = axialToPixel(to, layout);
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  if (Math.abs(dx) + Math.abs(dy) > 0.5) {
    return Math.atan2(dy, dx);
  }
  const fallback = axialToPixel(tile, layout);
  return Math.atan2(layout.centerY - fallback.y, layout.centerX - fallback.x);
}

function resolveAnimatedCanvasUnit(
  tile: AxialCoord,
  motion: UnitMotionState | null | undefined,
  timeMs: number,
  layout: BoardLayout
) {
  const animated = resolveAnimatedHexPosition(tile, motion, timeMs);
  const center = axialFloatToPixel(animated, layout);
  const angle = getTravelAngle(tile, motion, layout);
  const bounce =
    animated.isMoving && animated.motionStyle === 'blink'
      ? -Math.sin(animated.progress * Math.PI) * layout.hexSize * 0.16
      : animated.isMoving && animated.motionStyle === 'step'
        ? -Math.sin(animated.progress * Math.PI) * layout.hexSize * 0.07
        : 0;
  return {
    animated,
    angle,
    center: {
      x: center.x,
      y: center.y + bounce
    }
  };
}

function drawGroundShadow(
  ctx: CanvasRenderingContext2D,
  center: { x: number; y: number },
  width: number,
  height: number,
  color = 'rgba(5, 8, 10, 0.34)'
) {
  ctx.save();
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.ellipse(center.x, center.y, width, height, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawLabelPill(
  ctx: CanvasRenderingContext2D,
  center: { x: number; y: number },
  text: string,
  width: number,
  fill: string,
  stroke: string,
  color: string
) {
  ctx.save();
  const height = 18;
  const x = center.x - width / 2;
  const y = center.y;
  const radius = height / 2;
  ctx.fillStyle = fill;
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  ctx.lineTo(x + radius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = stroke;
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.fillStyle = color;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = '800 10px Trebuchet MS';
  ctx.fillText(text, center.x, y + height / 2 + 0.5);
  ctx.restore();
}

function drawPebbleBoss(
  ctx: CanvasRenderingContext2D,
  center: { x: number; y: number },
  radius: number,
  angle: number,
  timeMs: number
) {
  const direction = { x: Math.cos(angle), y: Math.sin(angle) };
  const normal = { x: -direction.y, y: direction.x };
  const headSprite = getProcessedPebbleSprite(getPebbleHeadSprite());
  const bodySprite = getProcessedPebbleSprite(getPebbleBodySprite());
  drawGlowDisc(ctx, center, radius * 2.4, 'rgba(255, 184, 108, 0.4)', 'rgba(255, 112, 53, 0)', 0.88);
  drawGroundShadow(ctx, { x: center.x, y: center.y + radius * 0.92 }, radius * 1.25, radius * 0.36, 'rgba(8, 6, 4, 0.46)');
  const head = {
    x: center.x + direction.x * radius * 0.18,
    y: center.y + direction.y * radius * 0.18
  };
  const body = {
    x: center.x - direction.x * radius * 0.56 + normal.x * Math.sin(timeMs * 0.012) * radius * 0.08,
    y: center.y - direction.y * radius * 0.56 + normal.y * Math.sin(timeMs * 0.012) * radius * 0.08
  };
  drawSmokeParticles(ctx, center, radius * 1.65, 0.36 + Math.sin(timeMs * 0.003) * 0.08, timeMs * 0.02, 'rgba(86, 54, 32, 1)', 8);
  if (bodySprite && !(bodySprite instanceof HTMLImageElement && (!bodySprite.complete || bodySprite.naturalWidth === 0))) {
    drawRotatedSprite(ctx, bodySprite, body, radius * 5.2, radius * 2.8, angle + Math.PI, radius * 1.55, radius * 0.42, true);
  } else {
    for (let index = 0; index < 6; index += 1) {
      const progress = index / 5;
      const sway = Math.sin(timeMs * 0.012 + index * 0.72) * radius * 0.18;
      const segmentCenter = {
        x: center.x - direction.x * radius * 0.7 * index + normal.x * sway,
        y: center.y - direction.y * radius * 0.7 * index + normal.y * sway
      };
      const segmentRadius = radius * (1.1 - progress * 0.32);
      ctx.save();
      ctx.translate(segmentCenter.x, segmentCenter.y);
      ctx.rotate(angle + Math.sin(timeMs * 0.008 + index * 0.45) * 0.08);
      const gradient = ctx.createLinearGradient(-segmentRadius, 0, segmentRadius, 0);
      gradient.addColorStop(0, '#4c2b15');
      gradient.addColorStop(0.55, '#8f5e35');
      gradient.addColorStop(1, '#d79255');
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.ellipse(0, 0, segmentRadius, segmentRadius * 0.66, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = 'rgba(43, 18, 7, 0.9)';
      ctx.lineWidth = Math.max(1.5, radius * 0.06);
      ctx.stroke();
      ctx.restore();
    }
  }
  if (headSprite && !(headSprite instanceof HTMLImageElement && (!headSprite.complete || headSprite.naturalWidth === 0))) {
    drawRotatedSprite(ctx, headSprite, head, radius * 2.6, radius * 2.35, angle + Math.PI, radius * 0.85, radius * 0.3, true);
  } else {
    ctx.save();
    ctx.translate(head.x, head.y);
    ctx.rotate(angle);
    ctx.fillStyle = '#f6c67a';
    ctx.beginPath();
    ctx.ellipse(radius * 0.5, -radius * 0.14, radius * 0.12, radius * 0.08, 0, 0, Math.PI * 2);
    ctx.ellipse(radius * 0.5, radius * 0.14, radius * 0.12, radius * 0.08, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#1b0d05';
    ctx.beginPath();
    ctx.arc(radius * 0.52, -radius * 0.14, radius * 0.04, 0, Math.PI * 2);
    ctx.arc(radius * 0.52, radius * 0.14, radius * 0.04, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

function drawElectricBoss(
  ctx: CanvasRenderingContext2D,
  center: { x: number; y: number },
  radius: number,
  timeMs: number,
  chargeProgress: number
) {
  drawGroundShadow(ctx, { x: center.x, y: center.y + radius * 1.02 }, radius * 0.98, radius * 0.3, 'rgba(6, 15, 22, 0.42)');
  drawGlowDisc(ctx, center, radius * (2.1 + chargeProgress * 0.45), 'rgba(208, 245, 255, 0.42)', 'rgba(94, 190, 255, 0)', 0.9);
  drawShockRing(ctx, center, radius * (0.9 + chargeProgress * 0.26), 'rgba(167, 237, 255, 0.95)', Math.max(2, radius * 0.08), 0.72);
  drawSparkBurst(ctx, center, radius * (1.15 + chargeProgress * 0.35), '#def7ff', 0.62 + chargeProgress * 0.2, 10, timeMs * 0.01);
  ctx.save();
  ctx.translate(center.x, center.y);
  const bodyGradient = ctx.createLinearGradient(0, -radius * 1.1, 0, radius * 1.2);
  bodyGradient.addColorStop(0, '#dff7ff');
  bodyGradient.addColorStop(0.4, '#71a8d8');
  bodyGradient.addColorStop(1, '#20334b');
  ctx.fillStyle = bodyGradient;
  ctx.beginPath();
  ctx.ellipse(0, radius * 0.15, radius * 0.62, radius * 0.92, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = 'rgba(228, 250, 255, 0.92)';
  ctx.lineWidth = Math.max(2, radius * 0.06);
  ctx.stroke();
  ctx.fillStyle = '#f8ffff';
  ctx.beginPath();
  ctx.arc(-radius * 0.18, -radius * 0.16, radius * 0.1, 0, Math.PI * 2);
  ctx.arc(radius * 0.18, -radius * 0.16, radius * 0.1, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawEscalationManagerBoss(
  ctx: CanvasRenderingContext2D,
  center: { x: number; y: number },
  radius: number,
  timeMs: number,
  shielded: boolean
) {
  const managerPortrait = getEnemyPortrait(ENEMY_ROLE_PORTRAITS.escalation_manager[0] ?? 0);
  const processedManagerPortrait = getProcessedPortrait(managerPortrait);
  drawGroundShadow(ctx, { x: center.x, y: center.y + radius * 1.05 }, radius, radius * 0.32, 'rgba(14, 8, 15, 0.45)');
  drawGlowDisc(ctx, center, radius * 1.9, shielded ? 'rgba(255, 178, 240, 0.4)' : 'rgba(222, 133, 195, 0.28)', 'rgba(132, 32, 98, 0)', 0.86);
  if (shielded) {
    drawShockRing(ctx, center, radius * 1.08, 'rgba(255, 216, 252, 0.84)', Math.max(2, radius * 0.07), 0.8);
  }
  ctx.save();
  ctx.translate(center.x, center.y);
  ctx.fillStyle = '#321729';
  ctx.beginPath();
  ctx.moveTo(-radius * 0.56, radius * 0.94);
  ctx.lineTo(-radius * 0.48, -radius * 0.18);
  ctx.lineTo(-radius * 0.18, -radius * 0.88);
  ctx.lineTo(radius * 0.18, -radius * 0.88);
  ctx.lineTo(radius * 0.48, -radius * 0.18);
  ctx.lineTo(radius * 0.56, radius * 0.94);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = '#ffdff7';
  ctx.lineWidth = Math.max(2, radius * 0.06);
  ctx.stroke();
  if (isDrawableImage(processedManagerPortrait)) {
    drawBaselineSprite(
      ctx,
      processedManagerPortrait,
      { x: 0, y: radius * 0.06 },
      radius * 1.36,
      radius * 1.64,
      radius * 0.72
    );
  } else {
    ctx.fillStyle = '#ffd8ef';
    ctx.fillRect(-radius * 0.18, -radius * 0.18, radius * 0.36, radius * 0.56);
  }
  ctx.restore();
  for (let index = 0; index < 3; index += 1) {
    const orbitAngle = timeMs * 0.004 + index * ((Math.PI * 2) / 3);
    const ticketCenter = {
      x: center.x + Math.cos(orbitAngle) * radius * 1.2,
      y: center.y + Math.sin(orbitAngle) * radius * 0.7 - radius * 0.18
    };
    ctx.save();
    ctx.translate(ticketCenter.x, ticketCenter.y);
    ctx.rotate(orbitAngle + Math.PI / 2);
    ctx.fillStyle = shielded ? '#fff4fb' : '#f1bfd7';
    ctx.fillRect(-radius * 0.16, -radius * 0.12, radius * 0.32, radius * 0.24);
    ctx.strokeStyle = '#7f325d';
    ctx.lineWidth = 1;
    ctx.strokeRect(-radius * 0.16, -radius * 0.12, radius * 0.32, radius * 0.24);
    ctx.restore();
  }
}

function drawHordeMemberBoss(
  ctx: CanvasRenderingContext2D,
  center: { x: number; y: number },
  radius: number,
  timeMs: number,
  hordeCount: number
) {
  const intensity = clamp(hordeCount / 10, 0.35, 1);
  drawGroundShadow(ctx, { x: center.x, y: center.y + radius * 0.85 }, radius * 0.9, radius * 0.28, 'rgba(11, 8, 6, 0.35)');
  drawGlowDisc(ctx, center, radius * (1.5 + intensity * 0.4), 'rgba(255, 182, 126, 0.28)', 'rgba(183, 48, 24, 0)', 0.76);
  for (let index = 0; index < 3; index += 1) {
    const angle = timeMs * 0.002 + index * 2.1;
    const offset = index === 0 ? 0 : radius * 0.26;
    const memberCenter = {
      x: center.x + Math.cos(angle) * offset,
      y: center.y + Math.sin(angle * 1.3) * offset * 0.55
    };
    ctx.save();
    ctx.translate(memberCenter.x, memberCenter.y);
    ctx.fillStyle = index === 0 ? '#f1b082' : '#d98063';
    ctx.beginPath();
    ctx.arc(0, 0, radius * (index === 0 ? 0.4 : 0.28), 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(84, 28, 16, 0.82)';
    ctx.lineWidth = 1.2;
    ctx.stroke();
    ctx.restore();
  }
}

function drawEnemyBossNameplate(
  ctx: CanvasRenderingContext2D,
  center: { x: number; y: number },
  label: string,
  radius: number,
  profile: BossVisualProfile
) {
  drawLabelPill(
    ctx,
    { x: center.x, y: center.y - radius * 1.95 },
    label,
    Math.max(104, label.length * 6.8),
    'rgba(16, 13, 18, 0.86)',
    profile.glowColor,
    '#fff7ea'
  );
}

function drawBossWaveAtmosphere(
  ctx: CanvasRenderingContext2D,
  snapshot: GameSnapshot,
  layout: BoardLayout,
  viewportWidth: number,
  viewportHeight: number
) {
  const bossId = snapshot.state.currentWave.bossId;
  if (!snapshot.hud.isBossWave || !bossId) return;

  const atmosphere = ctx.createRadialGradient(
    layout.centerX,
    layout.centerY,
    layout.hexSize * 1.4,
    layout.centerX,
    layout.centerY,
    layout.hexSize * 7.8
  );

  if (bossId === 'pebble') {
    atmosphere.addColorStop(0, 'rgba(255, 166, 94, 0.16)');
    atmosphere.addColorStop(1, 'rgba(82, 34, 16, 0)');
  } else if (bossId === 'electric_bather') {
    atmosphere.addColorStop(0, 'rgba(120, 222, 255, 0.16)');
    atmosphere.addColorStop(1, 'rgba(20, 52, 88, 0)');
  } else if (bossId === 'escalation_manager') {
    atmosphere.addColorStop(0, 'rgba(255, 116, 214, 0.14)');
    atmosphere.addColorStop(1, 'rgba(62, 11, 38, 0)');
  } else {
    atmosphere.addColorStop(0, 'rgba(255, 136, 88, 0.14)');
    atmosphere.addColorStop(1, 'rgba(66, 16, 12, 0)');
  }

  ctx.save();
  ctx.fillStyle = atmosphere;
  ctx.fillRect(0, 0, viewportWidth, viewportHeight);
  ctx.restore();
}

function getCombatShake(snapshot: GameSnapshot) {
  let x = 0;
  let y = 0;
  for (const event of snapshot.state.fxEvents) {
    const progress = event.ageMs / event.durationMs;
    const strength =
      event.kind === 'sauna_hit'
        ? 8 * (1 - progress)
        : event.kind === 'boss_hit'
          ? 4.5 * (1 - progress)
          : event.kind === 'fireball'
            ? 3.4 * (1 - progress)
            : 0;
    if (strength <= 0) continue;
    const angle = event.id * 1.73 + event.ageMs * 0.055;
    x += Math.cos(angle) * strength;
    y += Math.sin(angle * 1.37) * strength * 0.7;
  }
  const magnitude = Math.hypot(x, y);
  if (magnitude > 10) {
    const scale = 10 / magnitude;
    x *= scale;
    y *= scale;
  }
  return { x, y };
}

function drawFireballTelegraphs(ctx: CanvasRenderingContext2D, snapshot: GameSnapshot, layout: BoardLayout) {
  if (snapshot.state.pendingFireballs.length === 0) return;

  for (const pending of snapshot.state.pendingFireballs) {
    const timeRemaining = Math.max(0, pending.explodeAtMs - snapshot.state.timeMs);
    const progress = 1 - Math.min(1, timeRemaining / 1000);
    const pulse = 0.58 + Math.sin(snapshot.state.timeMs * 0.02 + pending.targetTile.q * 0.7 + pending.targetTile.r * 0.5) * 0.18;

    for (const tile of snapshot.tiles) {
      const distance = hexDistance(tile, pending.targetTile);
      if (distance > 2) continue;
      const center = axialToPixel(tile, layout);
      const fillAlpha = distance === 0 ? 0.18 + progress * 0.18 : 0.08 + progress * 0.12;
      const strokeAlpha = distance === 0 ? 0.62 + progress * 0.18 : 0.28 + progress * 0.18;
      drawTile(
        ctx,
        center,
        layout.hexSize - 4.5,
        `rgba(255, 112, 61, ${fillAlpha * pulse})`,
        `rgba(255, 210, 144, ${strokeAlpha})`,
        distance === 0 ? 2.6 : 1.4
      );
    }

    const targetCenter = axialToPixel(pending.targetTile, layout);
    drawGlowDisc(ctx, targetCenter, layout.hexSize * (0.7 + progress * 0.3), 'rgba(255,188,98,0.34)', 'rgba(255,99,56,0)', 0.82);
    drawShockRing(ctx, targetCenter, layout.hexSize * (0.42 + progress * 0.18), 'rgba(255,232,182,0.92)', Math.max(2, layout.hexSize * 0.06), 0.92);
  }
}

function drawCombatFx(ctx: CanvasRenderingContext2D, snapshot: GameSnapshot, layout: BoardLayout) {
  for (const event of snapshot.state.fxEvents) {
    const center = axialToPixel(event.tile, layout);
    const progress = event.ageMs / event.durationMs;
    const fade = 1 - progress;
    ctx.save();
    ctx.globalAlpha = Math.max(0, fade);
    const secondary = event.secondaryTile ? axialToPixel(event.secondaryTile, layout) : null;
    const burstRadius = layout.hexSize * (0.42 + progress * 0.5);

    switch (event.kind) {
      case 'heal':
        if (secondary) {
          drawLightningArc(
            ctx,
            secondary,
            center,
            'rgba(173, 255, 189, 0.65)',
            Math.max(2, layout.hexSize * 0.08),
            0.85,
            event.id * 5.3
          );
        }
        drawGlowDisc(ctx, center, layout.hexSize * (0.34 + progress * 0.28), 'rgba(192,255,208,0.72)', 'rgba(110,248,162,0)', 0.85);
        drawShockRing(ctx, center, layout.hexSize * (0.18 + progress * 0.44), '#8ef0ad', 2.6, 0.8);
        drawEmberParticles(ctx, center, layout.hexSize * 0.9, progress, event.id * 3.1, '#d4ffd3', 9);
        break;
      case 'fireball':
        if (secondary) {
          const travelPhase = clamp(progress / 0.42);
          const explosionPhase = clamp((progress - 0.34) / 0.66);
          if (progress < 0.48) {
            const orb = pointLerp(secondary, center, easeOutCubic(travelPhase));
            drawAfterimageTrail(ctx, secondary, orb, 'rgba(255, 154, 74, 0.95)', 0.9);
            drawGlowDisc(ctx, orb, layout.hexSize * 0.42, 'rgba(255,245,196,0.98)', 'rgba(255,136,58,0)', 0.95);
            drawGlowDisc(ctx, orb, layout.hexSize * 0.2, 'rgba(255,255,245,0.95)', 'rgba(255,255,255,0)', 0.95);
            drawSparkBurst(ctx, orb, layout.hexSize * 0.24, '#ffd27b', 0.9 * (1 - travelPhase * 0.5), 4, travelPhase * Math.PI);
            drawEmberParticles(ctx, orb, layout.hexSize * 0.55, travelPhase * 0.55, event.id * 13.1, '#ffcb73', 6);
          }
          if (progress > 0.28) {
            drawGlowDisc(ctx, center, layout.hexSize * (0.55 + explosionPhase * 0.9), 'rgba(255,226,150,0.95)', 'rgba(255,108,46,0)', 0.85);
            drawShockRing(ctx, center, layout.hexSize * (0.16 + explosionPhase * 0.9), '#ffd27b', Math.max(2, layout.hexSize * 0.08), 0.95 - explosionPhase * 0.4);
            drawSparkBurst(ctx, center, layout.hexSize * (0.28 + explosionPhase * 0.62), '#fff0be', 0.9 - explosionPhase * 0.4, 7, explosionPhase * Math.PI * 0.7);
            drawEmberParticles(ctx, center, layout.hexSize * 1.45, explosionPhase, event.id * 7.7, '#ffb05f', 16);
            drawSmokeParticles(ctx, center, layout.hexSize * 1.2, explosionPhase, event.id * 9.4, 'rgba(51, 36, 31, 1)', 8);
          }
        } else {
          drawGlowDisc(ctx, center, layout.hexSize * (0.74 + progress * 1.12), 'rgba(255,228,172,0.96)', 'rgba(255,104,48,0)', 0.96);
          drawShockRing(ctx, center, layout.hexSize * (0.28 + progress * 1.18), '#ffd27b', Math.max(3, layout.hexSize * 0.09), 0.94);
          drawShockRing(ctx, center, layout.hexSize * (0.48 + progress * 1.48), 'rgba(255,188,112,0.56)', Math.max(1.5, layout.hexSize * 0.05), 0.72);
          drawSparkBurst(ctx, center, layout.hexSize * (0.44 + progress * 0.92), '#fff0be', 0.96 - progress * 0.42, 10, progress * Math.PI * 0.9);
          drawEmberParticles(ctx, center, layout.hexSize * 1.9, progress, event.id * 7.7, '#ffb05f', 22);
          drawSmokeParticles(ctx, center, layout.hexSize * 1.7, progress, event.id * 9.4, 'rgba(51, 36, 31, 1)', 12);
        }
        break;
      case 'spin':
        drawGlowDisc(ctx, center, layout.hexSize * (0.78 + Math.sin(progress * Math.PI) * 0.28), 'rgba(255,220,144,0.46)', 'rgba(255,171,77,0)', 0.84);
        drawShockRing(ctx, center, layout.hexSize * (0.9 + progress * 0.38), 'rgba(255,211,125,0.78)', Math.max(3, layout.hexSize * 0.09), 0.82);
        drawShockRing(ctx, center, layout.hexSize * (1.08 + progress * 0.54), 'rgba(255,171,77,0.34)', Math.max(2, layout.hexSize * 0.05), 0.62);
        drawSparkBurst(ctx, center, layout.hexSize * (1.02 + progress * 0.26), '#ffecc5', 0.4, 14, progress * Math.PI * 6.2);
        drawEmberParticles(ctx, center, layout.hexSize * 1.45, progress, event.id * 8.3, '#ffb05f', 18);
        for (let flare = 0; flare < 6; flare += 1) {
          const angle = progress * Math.PI * 5.6 + (Math.PI * 2 * flare) / 6;
          const flareCenter = {
            x: center.x + Math.cos(angle) * layout.hexSize * 0.95,
            y: center.y + Math.sin(angle) * layout.hexSize * 0.95
          };
          drawGlowDisc(ctx, flareCenter, layout.hexSize * 0.18, 'rgba(255,242,194,0.68)', 'rgba(255,168,73,0)', 0.78);
        }
        for (let blade = 0; blade < 3; blade += 1) {
          drawSpinBlade(
            ctx,
            center,
            layout.hexSize * 0.98,
            progress * Math.PI * 7.2 + blade * ((Math.PI * 2) / 3),
            layout.hexSize * 0.98,
            layout.hexSize * 0.26,
            '#fff1d2',
            'rgba(255,199,102,0.9)',
            0.92
          );
        }
        break;
      case 'blink':
        if (secondary) {
          drawAfterimageTrail(ctx, secondary, center, 'rgba(120, 214, 255, 0.98)', 1);
          drawLightningArc(ctx, secondary, center, 'rgba(142, 232, 255, 0.46)', Math.max(2, layout.hexSize * 0.05), 0.62, event.id * 2.7);
          drawLightningArc(ctx, secondary, center, 'rgba(219, 250, 255, 0.3)', Math.max(1, layout.hexSize * 0.025), 0.74, event.id * 3.9);
        }
        drawGlowDisc(ctx, center, layout.hexSize * (0.34 + progress * 0.46), 'rgba(213,249,255,0.82)', 'rgba(100,188,255,0)', 0.9);
        drawShockRing(ctx, center, layout.hexSize * (0.22 + progress * 0.42), '#91dfff', Math.max(2.3, layout.hexSize * 0.07), 0.88);
        drawSparkBurst(ctx, center, layout.hexSize * (0.3 + progress * 0.24), '#dff8ff', 0.72, 8, progress * Math.PI * 3.2);
        break;
      case 'chain':
        if (secondary) {
          drawLightningArc(ctx, secondary, center, '#b9f2ff', Math.max(2, layout.hexSize * 0.08), 0.94, event.id * 7.9);
          drawLightningArc(ctx, secondary, center, '#6dd6ff', Math.max(1.2, layout.hexSize * 0.04), 0.9, event.id * 9.1);
        }
        drawGlowDisc(ctx, center, layout.hexSize * (0.24 + progress * 0.2), 'rgba(214,248,255,0.68)', 'rgba(117,206,255,0)', 0.78);
        drawSparkBurst(ctx, center, layout.hexSize * 0.28, '#d4fbff', 0.78, 5, progress * Math.PI * 2.8);
        break;
      case 'volley':
        if (secondary) {
          const shot = pointLerp(secondary, center, easeOutCubic(clamp(progress / 0.82)));
          drawLightningArc(ctx, secondary, shot, 'rgba(255, 225, 161, 0.86)', Math.max(1.8, layout.hexSize * 0.06), 0.92, event.id * 6.3);
          drawAfterimageTrail(ctx, secondary, shot, 'rgba(255, 176, 92, 0.9)', 0.84);
          drawGlowDisc(ctx, shot, layout.hexSize * 0.16, 'rgba(255,248,218,0.94)', 'rgba(255,168,83,0)', 0.94);
        }
        drawGlowDisc(ctx, center, layout.hexSize * (0.2 + progress * 0.16), 'rgba(255,240,198,0.76)', 'rgba(255,156,78,0)', 0.78);
        drawSparkBurst(ctx, center, layout.hexSize * (0.18 + progress * 0.16), '#ffe9bf', 0.72, 4, progress * Math.PI * 2.1);
        break;
      case 'pulse':
        if (secondary) {
          drawLightningArc(ctx, secondary, center, 'rgba(191, 255, 212, 0.42)', Math.max(1.4, layout.hexSize * 0.04), 0.56, event.id * 4.1);
        }
        drawGlowDisc(ctx, center, layout.hexSize * (0.3 + progress * 0.3), 'rgba(210,255,221,0.74)', 'rgba(105,232,170,0)', 0.82);
        drawShockRing(ctx, center, layout.hexSize * (0.16 + progress * 0.46), '#a4f3c3', Math.max(2, layout.hexSize * 0.05), 0.84);
        drawEmberParticles(ctx, center, layout.hexSize * 0.75, progress, event.id * 5.8, '#deffe7', 7);
        break;
      case 'defender_hit':
        if (secondary) {
          const impact = pointLerp(secondary, center, 0.84);
          drawLightningArc(ctx, impact, center, 'rgba(164, 227, 255, 0.55)', Math.max(1.2, layout.hexSize * 0.03), 0.48, event.id * 4.3);
        }
        drawGlowDisc(ctx, center, burstRadius * 0.7, 'rgba(197,241,255,0.52)', 'rgba(108,197,255,0)', 0.75);
        drawShockRing(ctx, center, layout.hexSize * (0.16 + progress * 0.36), '#8adfff', 2.8, 0.82);
        drawSparkBurst(ctx, center, layout.hexSize * (0.22 + progress * 0.26), '#dff8ff', 0.72, 6, progress * Math.PI);
        break;
      case 'sauna_hit':
        drawGlowDisc(ctx, center, layout.hexSize * (0.72 + progress * 0.92), 'rgba(255,222,151,0.75)', 'rgba(255,106,61,0)', 0.95);
        drawShockRing(ctx, center, layout.hexSize * (0.22 + progress * 0.72), '#ff9a5e', Math.max(3, layout.hexSize * 0.11), 0.95);
        drawShockRing(ctx, center, layout.hexSize * (0.4 + progress * 1.04), 'rgba(255,211,152,0.58)', Math.max(1.5, layout.hexSize * 0.05), 0.7);
        drawSparkBurst(ctx, center, layout.hexSize * (0.3 + progress * 0.68), '#fff1d3', 0.88, 8, progress * Math.PI * 0.85);
        drawSmokeParticles(ctx, center, layout.hexSize * 1.5, progress, event.id * 11.2, 'rgba(54, 34, 28, 1)', 10);
        break;
      case 'boss_hit':
        drawGlowDisc(ctx, center, layout.hexSize * (0.66 + progress * 0.86), 'rgba(255,214,173,0.7)', 'rgba(255,76,62,0)', 0.9);
        drawShockRing(ctx, center, layout.hexSize * (0.2 + progress * 0.82), '#ff6e63', Math.max(3, layout.hexSize * 0.1), 0.92);
        drawSparkBurst(ctx, center, layout.hexSize * (0.34 + progress * 0.62), '#ffe4c9', 0.82, 9, progress * Math.PI * 0.6);
        drawEmberParticles(ctx, center, layout.hexSize * 1.2, progress, event.id * 14.7, '#ff9e74', 14);
        break;
      case 'hit':
      default:
        if (secondary) {
          const shot = pointLerp(secondary, center, easeOutCubic(clamp(progress / 0.78)));
          const dir = {
            x: center.x - secondary.x,
            y: center.y - secondary.y
          };
          const len = Math.max(1, Math.hypot(dir.x, dir.y));
          const impact = {
            x: center.x - (dir.x / len) * layout.hexSize * 0.12,
            y: center.y - (dir.y / len) * layout.hexSize * 0.12
          };
          drawAfterimageTrail(ctx, secondary, shot, 'rgba(255, 198, 118, 0.86)', 0.76);
          drawGlowDisc(ctx, shot, layout.hexSize * 0.12, 'rgba(255,245,216,0.9)', 'rgba(255,178,94,0)', 0.9);
          drawLightningArc(ctx, impact, center, 'rgba(255,224,162,0.42)', Math.max(1, layout.hexSize * 0.03), 0.5, event.id * 2.1);
        }
        drawGlowDisc(ctx, center, layout.hexSize * (0.22 + progress * 0.18), 'rgba(255,238,196,0.52)', 'rgba(255,183,92,0)', 0.7);
        drawSparkBurst(ctx, center, layout.hexSize * (0.16 + progress * 0.18), '#ffe3a4', 0.8, 5, progress * Math.PI * 0.7);
        break;
    }
    ctx.restore();
  }
}

function drawWorldLandmarkShadow(ctx: CanvasRenderingContext2D, center: { x: number; y: number }, width: number, height: number) {
  ctx.save();
  ctx.fillStyle = 'rgba(8, 10, 12, 0.42)';
  ctx.beginPath();
  ctx.ellipse(center.x, center.y + height * 0.52, width * 0.58, height * 0.2, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawMetashopLandmark(
  ctx: CanvasRenderingContext2D,
  center: { x: number; y: number },
  size: number,
  selected: boolean,
  enabled: boolean,
  locked: boolean
) {
  const width = size * 1.08;
  const height = size * 0.9;
  drawWorldLandmarkShadow(ctx, center, width, height);
  ctx.save();
  ctx.translate(center.x, center.y);

  ctx.fillStyle = locked ? 'rgba(74, 64, 52, 0.96)' : 'rgba(87, 64, 40, 0.96)';
  ctx.strokeStyle = locked ? 'rgba(170, 150, 126, 0.36)' : 'rgba(255, 205, 118, 0.52)';
  ctx.lineWidth = selected ? 3 : 2;
  ctx.beginPath();
  ctx.roundRect(-width * 0.42, -height * 0.2, width * 0.84, height * 0.48, 10);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = enabled ? 'rgba(255, 206, 122, 0.94)' : 'rgba(112, 118, 123, 0.84)';
  ctx.beginPath();
  ctx.moveTo(-width * 0.5, -height * 0.18);
  ctx.lineTo(0, -height * 0.52);
  ctx.lineTo(width * 0.5, -height * 0.18);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = 'rgba(30, 22, 18, 0.94)';
  ctx.fillRect(-width * 0.12, -height * 0.02, width * 0.24, height * 0.3);
  ctx.strokeStyle = 'rgba(255, 245, 222, 0.16)';
  ctx.strokeRect(-width * 0.12, -height * 0.02, width * 0.24, height * 0.3);

  ctx.fillStyle = selected ? '#fff4d6' : '#f2debf';
  ctx.font = `800 ${Math.max(10, size * 0.18)}px Trebuchet MS`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('META', 0, -height * 0.06);
  ctx.restore();
}

function drawBeerShopLandmark(
  ctx: CanvasRenderingContext2D,
  center: { x: number; y: number },
  size: number,
  selected: boolean,
  enabled: boolean
) {
  const sprite = getProcessedBackdropSprite(getBeerShopSprite());
  if (isDrawableImage(sprite)) {
    drawWorldLandmarkShadow(ctx, center, size * 1.85, size * 0.94);
    drawGlowDisc(
      ctx,
      { x: center.x, y: center.y - size * 0.1 },
      size * (selected ? 1.08 : 0.9),
      enabled ? 'rgba(255, 204, 112, 0.28)' : 'rgba(165, 165, 165, 0.18)',
      'rgba(0,0,0,0)',
      0.82
    );
    drawBaselineSprite(ctx, sprite, center, size * 2.45, size * 1.9, center.y + size * 0.5);
    return;
  }

  const width = size;
  const height = size * 0.86;
  drawWorldLandmarkShadow(ctx, center, width, height);
  ctx.save();
  ctx.translate(center.x, center.y);

  ctx.fillStyle = enabled ? 'rgba(96, 57, 34, 0.96)' : 'rgba(73, 56, 44, 0.92)';
  ctx.strokeStyle = selected ? 'rgba(255, 226, 169, 0.95)' : 'rgba(221, 174, 116, 0.54)';
  ctx.lineWidth = selected ? 3 : 2;
  ctx.beginPath();
  ctx.roundRect(-width * 0.18, -height * 0.1, width * 0.36, height * 0.5, 12);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = 'rgba(208, 153, 88, 0.94)';
  ctx.beginPath();
  ctx.arc(-width * 0.26, height * 0.1, width * 0.14, 0, Math.PI * 2);
  ctx.arc(width * 0.26, height * 0.1, width * 0.14, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = enabled ? 'rgba(255, 198, 104, 0.98)' : 'rgba(170, 170, 170, 0.78)';
  ctx.beginPath();
  ctx.moveTo(-width * 0.32, -height * 0.12);
  ctx.lineTo(0, -height * 0.36);
  ctx.lineTo(width * 0.32, -height * 0.12);
  ctx.lineTo(0, 0);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = '#fff2d2';
  ctx.font = `800 ${Math.max(11, size * 0.22)}px Trebuchet MS`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('BEER', 0, -height * 0.26);
  ctx.restore();
}

function drawWorldLandmarks(ctx: CanvasRenderingContext2D, snapshot: GameSnapshot, layout: BoardLayout) {
  for (const landmark of snapshot.hud.worldLandmarks) {
    const center = axialToPixel(landmark.tile, layout);
    const size = layout.hexSize * 1.05;
    if (landmark.id === 'metashop') {
      drawMetashopLandmark(ctx, center, size, landmark.selected, landmark.enabled, landmark.locked);
    } else {
      drawBeerShopLandmark(ctx, center, size, landmark.selected, landmark.enabled);
    }

    if (landmark.selected) {
      ctx.save();
      ctx.strokeStyle = 'rgba(255, 241, 214, 0.92)';
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      ctx.arc(center.x, center.y, layout.hexSize * 0.92, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }
  }
}

export function paintSnapshot(
  ctx: CanvasRenderingContext2D,
  snapshot: GameSnapshot,
  viewportWidth: number,
  viewportHeight: number
) {
  const layout = getBoardLayout(viewportWidth, viewportHeight, snapshot.config.gridRadius);
  const buildableSet = new Set(snapshot.buildableTiles.map(coordKey));
  const spawnSet = new Set(snapshot.spawnTiles.map(coordKey));
  const hoverKey = snapshot.state.hoveredTile ? coordKey(snapshot.state.hoveredTile) : null;
  const selected = snapshot.state.selectedDefenderId
    ? snapshot.state.defenders.find((defender) => defender.id === snapshot.state.selectedDefenderId)
    : null;
  const placementMode = Boolean(selected && (selected.location === 'ready' || selected.location === 'sauna'));

  ctx.clearRect(0, 0, viewportWidth, viewportHeight);
  const shake = getCombatShake(snapshot);
  ctx.save();
  ctx.translate(shake.x, shake.y);

  const background = ctx.createLinearGradient(0, 0, 0, viewportHeight);
  background.addColorStop(0, '#08161a');
  background.addColorStop(0.46, '#102127');
  background.addColorStop(1, '#1c0e0a');
  ctx.fillStyle = background;
  ctx.fillRect(0, 0, viewportWidth, viewportHeight);

  const smoke = ctx.createRadialGradient(
    layout.centerX,
    layout.centerY + layout.hexSize,
    layout.hexSize * 0.8,
    layout.centerX,
    layout.centerY,
    layout.hexSize * 7.5
  );
  smoke.addColorStop(0, snapshot.hud.isBossWave ? 'rgba(255, 88, 64, 0.22)' : 'rgba(87, 209, 193, 0.18)');
  smoke.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = smoke;
  ctx.fillRect(0, 0, viewportWidth, viewportHeight);
  drawBossWaveAtmosphere(ctx, snapshot, layout, viewportWidth, viewportHeight);

  for (const tile of snapshot.tiles) {
    const center = axialToPixel(tile, layout);
    const key = coordKey(tile);
    const distance = hexDistance(tile, { q: 0, r: 0 });
    const isSpawn = spawnSet.has(key);
    const isBuildable = buildableSet.has(key);
    let fill = distance === 0 ? 'rgba(54, 94, 96, 0.92)' : 'rgba(27, 49, 54, 0.92)';
    let stroke = 'rgba(154, 219, 214, 0.12)';
    let lineWidth = 1;

    if (isSpawn) {
      fill = 'rgba(109, 43, 48, 0.94)';
      stroke = 'rgba(246, 139, 117, 0.34)';
    } else if (isBuildable) {
      fill = placementMode
        ? 'rgba(42, 108, 76, 0.96)'
        : snapshot.state.phase === 'prep'
          ? 'rgba(110, 72, 35, 0.94)'
          : 'rgba(52, 65, 61, 0.92)';
      stroke = placementMode ? 'rgba(143, 255, 182, 0.52)' : 'rgba(255, 205, 118, 0.2)';
    }

    if (hoverKey === key) {
      fill = isBuildable
        ? placementMode
          ? 'rgba(72, 171, 113, 0.98)'
          : 'rgba(171, 117, 58, 0.98)'
        : 'rgba(75, 92, 89, 0.96)';
      stroke = isBuildable && placementMode ? 'rgba(230, 255, 238, 0.92)' : 'rgba(231, 255, 250, 0.82)';
      lineWidth = 2.2;
    }

    drawTile(ctx, center, layout.hexSize - 1.5, fill, stroke, lineWidth);
    if (distance > 0) {
      drawTileDecoration(ctx, tile, center, layout.hexSize - 1.5, isBuildable, isSpawn);
    }
  }

  drawFireballTelegraphs(ctx, snapshot, layout);
  drawWorldLandmarks(ctx, snapshot, layout);

  const saunaCenter = axialToPixel({ q: 0, r: 0 }, layout);
  const saunaGlow = ctx.createRadialGradient(saunaCenter.x, saunaCenter.y, layout.hexSize * 0.1, saunaCenter.x, saunaCenter.y, layout.hexSize * 1.4);
  saunaGlow.addColorStop(0, 'rgba(255, 216, 126, 0.98)');
  saunaGlow.addColorStop(0.5, 'rgba(255, 159, 88, 0.7)');
  saunaGlow.addColorStop(1, 'rgba(255, 159, 88, 0)');
  ctx.fillStyle = saunaGlow;
  ctx.beginPath();
  ctx.arc(saunaCenter.x, saunaCenter.y, layout.hexSize * 1.3, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(saunaCenter.x, saunaCenter.y, layout.hexSize * 0.58, 0, Math.PI * 2);
  ctx.fillStyle = '#f9ca79';
  ctx.fill();
  ctx.beginPath();
  ctx.arc(saunaCenter.x, saunaCenter.y, layout.hexSize * 0.29, 0, Math.PI * 2);
  ctx.fillStyle = '#76411f';
  ctx.fill();
  if (snapshot.hud.saunaSelected) {
    ctx.beginPath();
    ctx.arc(saunaCenter.x, saunaCenter.y, layout.hexSize * 0.82, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(234, 255, 250, 0.95)';
    ctx.lineWidth = 2.8;
    ctx.stroke();
  }
  ctx.fillStyle = '#fff2da';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `700 ${Math.max(10, layout.hexSize * 0.32)}px Trebuchet MS`;
  ctx.fillText(snapshot.hud.saunaOccupancyLabel, saunaCenter.x, saunaCenter.y - layout.hexSize * 0.96);

  for (const defender of snapshot.state.defenders) {
    if (defender.location !== 'board' || !defender.tile) continue;
    const animatedUnit = resolveAnimatedCanvasUnit(defender.tile, defender.motion ?? null, snapshot.state.timeMs, layout);
    const center = {
      x: animatedUnit.center.x,
      y: animatedUnit.center.y + Math.sin(snapshot.state.timeMs * 0.004 + defender.tokenStyleId) * layout.hexSize * 0.012
    };
    const template = snapshot.defenderTemplates[defender.templateId];
    const stats = defender.items.reduce(
      (total, itemId) => {
        const modifiers = snapshot.itemDefinitions[itemId].modifiers;
        total.maxHp += modifiers.maxHp ?? 0;
        total.damage += modifiers.damage ?? 0;
        total.heal += modifiers.heal ?? 0;
        total.range += modifiers.range ?? 0;
        total.attackCooldownMs += modifiers.attackCooldownMs ?? 0;
        return total;
      },
      {
        maxHp: defender.stats.maxHp,
        damage: defender.stats.damage,
        heal: defender.stats.heal,
        range: defender.stats.range,
        attackCooldownMs: defender.stats.attackCooldownMs
      }
    );
    const radius = layout.hexSize * 0.48;
    const style = getDefenderStyle(defender.tokenStyleId);
    drawGroundShadow(ctx, { x: center.x, y: center.y + radius * 1.05 }, radius * 0.88, radius * 0.28);
    const hasPortrait = drawDefenderPortrait(ctx, center, radius, defender.templateId, defender.tokenStyleId);

    if (selected?.id === defender.id) {
      ctx.beginPath();
      if (hasPortrait) {
        ctx.ellipse(center.x, center.y + radius * 0.55, radius * 0.9, radius * 0.34, 0, 0, Math.PI * 2);
      } else {
        ctx.arc(center.x, center.y, radius + 8, 0, Math.PI * 2);
      }
      ctx.strokeStyle = 'rgba(234, 255, 250, 0.9)';
      ctx.lineWidth = 2.6;
      ctx.stroke();
    }

    if (!hasPortrait) {
      drawTokenBase(ctx, center, radius, style, template.fill);
      drawGlyph(ctx, center, radius, style.glyph, style.glyph === 'tower' ? style.ring : style.accent);
      drawTokenLabel(ctx, center, radius, template.label, '#fff8ed');
    }
    drawHealthBar(ctx, center, layout.hexSize * 1.04, defender.hp / Math.max(1, stats.maxHp), '#7ed8c8');
    drawDefenderName(ctx, center, radius, defender.name);
  }

  const hordeCount = snapshot.state.enemies.filter((enemy) => enemy.archetypeId === 'thirsty_user').length;
  const shieldedManagerIds = new Set(
    snapshot.state.enemies
      .filter((enemy) => enemy.spawnedByEnemyInstanceId != null)
      .map((enemy) => enemy.spawnedByEnemyInstanceId as number)
  );

  for (const enemy of snapshot.state.enemies) {
    const { bossProfile, animatedUnit, center, radius } = resolveEnemyCanvasUnit(enemy, snapshot, layout);
    const archetype = snapshot.enemyArchetypes[enemy.archetypeId];
    const style = getEnemyStyle(enemy.tokenStyleId);
    drawGroundShadow(
      ctx,
      { x: center.x, y: center.y + radius * (bossProfile.presentation === 'boss_unit' ? 1.1 : 0.98) },
      radius * (bossProfile.presentation === 'boss_unit' ? 1.16 : 0.86),
      radius * (bossProfile.presentation === 'boss_unit' ? 0.36 : 0.26),
      bossProfile.presentation === 'boss_unit' ? 'rgba(8, 8, 10, 0.46)' : 'rgba(6, 6, 8, 0.3)'
    );

    if (bossProfile.presentation === 'boss_unit') {
      if (bossProfile.bossId === 'pebble') {
        drawPebbleBoss(ctx, center, radius, animatedUnit.angle, snapshot.state.timeMs);
      } else if (bossProfile.bossId === 'electric_bather') {
        const chargeProgress = clamp(
          1 - ((enemy.nextAbilityAtMs ?? Number.POSITIVE_INFINITY) - snapshot.state.timeMs) / 1250,
          0,
          1
        );
        drawElectricBoss(ctx, center, radius, snapshot.state.timeMs, chargeProgress);
      } else if (bossProfile.bossId === 'escalation_manager') {
        drawEscalationManagerBoss(ctx, center, radius, snapshot.state.timeMs, shieldedManagerIds.has(enemy.instanceId));
      }
      drawEnemyBossNameplate(ctx, center, bossProfile.label ?? archetype.name, radius, bossProfile);
    } else if (bossProfile.presentation === 'boss_horde_member') {
      drawHordeMemberBoss(ctx, center, radius, snapshot.state.timeMs, hordeCount);
    } else {
      const hasPortrait = drawEnemyPortrait(ctx, center, radius, enemy.archetypeId, enemy.tokenStyleId);
      if (!hasPortrait) {
        drawTokenBase(ctx, center, radius, style, archetype.fill);
        drawGlyph(ctx, center, radius, style.glyph, style.accent);
        drawTokenLabel(ctx, center, radius, archetype.label, '#fff0e8');
      }
    }

    if (snapshot.state.selectedEnemyInstanceId === enemy.instanceId) {
      ctx.save();
      ctx.beginPath();
      if (bossProfile.presentation === 'boss_unit') {
        ctx.ellipse(center.x, center.y + radius * 0.72, radius * 1.16, radius * 0.44, 0, 0, Math.PI * 2);
      } else {
        ctx.arc(center.x, center.y, radius + 10, 0, Math.PI * 2);
      }
      ctx.strokeStyle = bossProfile.presentation === 'normal' ? 'rgba(255, 241, 214, 0.96)' : (bossProfile.accentColor || '#fff1d6');
      ctx.lineWidth = 2.8;
      ctx.stroke();
      ctx.restore();
    }

    drawHealthBar(
      ctx,
      center,
      layout.hexSize * (bossProfile.presentation === 'boss_unit' ? 1.56 : bossProfile.presentation === 'boss_horde_member' ? 1.2 : 1.04),
      enemy.hp / archetype.maxHp,
      bossProfile.presentation === 'boss_unit' ? '#ff9f85' : bossProfile.presentation === 'boss_horde_member' ? '#ffb189' : '#ff8772',
      bossProfile.presentation === 'boss_unit'
        ? {
            height: 7,
            offsetMultiplier: 1.45,
            backdropAlpha: 0.62,
            strokeColor: bossProfile.accentColor
          }
        : bossProfile.presentation === 'boss_horde_member'
          ? {
              height: 6,
              offsetMultiplier: 1.32,
              backdropAlpha: 0.56,
              strokeColor: 'rgba(255, 221, 184, 0.42)'
            }
          : undefined
    );
  }

  drawCombatFx(ctx, snapshot, layout);
  ctx.restore();

  if (snapshot.state.overlayMode === 'paused') {
    ctx.fillStyle = 'rgba(6, 12, 14, 0.48)';
    ctx.fillRect(0, 0, viewportWidth, viewportHeight);
    ctx.fillStyle = '#f5efe7';
    ctx.textAlign = 'center';
    ctx.font = '700 28px Trebuchet MS';
    ctx.fillText('Paused', layout.centerX, 60);
    ctx.font = '500 15px Trebuchet MS';
    ctx.fillText('Combat is frozen while you sort heroes and loot.', layout.centerX, 86);
  }

  if (snapshot.state.phase === 'lost' && snapshot.state.overlayMode !== 'intermission') {
    ctx.fillStyle = 'rgba(6, 12, 14, 0.66)';
    ctx.fillRect(0, 0, viewportWidth, viewportHeight);
    ctx.fillStyle = '#f5efe7';
    ctx.textAlign = 'center';
    ctx.font = '700 30px Trebuchet MS';
    ctx.fillText('Sauna Went Cold', layout.centerX, 60);
    ctx.font = '500 16px Trebuchet MS';
    ctx.fillText(snapshot.hud.statusText, layout.centerX, 88);
  }

}

export function pickTileAtCanvasPoint(
  snapshot: GameSnapshot,
  rect: DOMRect,
  clientX: number,
  clientY: number
): AxialCoord | null {
  return pickTileAtCanvasPointFromModule(snapshot, rect, clientX, clientY);
}

export function pickDefenderAtCanvasPoint(
  snapshot: GameSnapshot,
  rect: DOMRect,
  clientX: number,
  clientY: number
): string | null {
  return pickDefenderAtCanvasPointFromModule(
    snapshot,
    rect,
    clientX,
    clientY,
    (nextSnapshot, layout) =>
      nextSnapshot.state.defenders
        .filter((defender) => defender.location === 'board' && defender.tile)
        .map((defender) => ({
          value: defender.id,
          center: axialFloatToPixel(
            resolveAnimatedHexPosition(defender.tile as AxialCoord, defender.motion ?? null, nextSnapshot.state.timeMs),
            layout
          ),
          radius: layout.hexSize * 0.62
        }))
        .sort((left, right) => right.radius - left.radius)
  );
}

export function pickEnemyAtCanvasPoint(
  snapshot: GameSnapshot,
  rect: DOMRect,
  clientX: number,
  clientY: number
): number | null {
  return pickEnemyAtCanvasPointFromModule(
    snapshot,
    rect,
    clientX,
    clientY,
    (nextSnapshot, layout) =>
      nextSnapshot.state.enemies
        .map((enemy) => {
          const resolved = resolveEnemyCanvasUnit(enemy, nextSnapshot, layout);
          return {
            value: enemy.instanceId,
            center: resolved.center,
            radius: resolved.bossProfile.presentation === 'boss_unit' ? resolved.radius * 1.18 : resolved.radius * 1.05
          };
        })
        .sort((left, right) => right.radius - left.radius)
  );
}
