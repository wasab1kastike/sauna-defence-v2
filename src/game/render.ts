import { coordKey, hexDistance } from './logic';
import type { AxialCoord, GameSnapshot } from './types';

const SQRT3 = Math.sqrt(3);

interface BoardLayout {
  hexSize: number;
  centerX: number;
  centerY: number;
}

interface TokenPalette {
  shell: string;
  ring: string;
  accent: string;
  glow: string;
  glyph: string;
}

interface SpriteFrame {
  x: number;
  y: number;
  w: number;
  h: number;
  scale?: number;
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

const DEFENDER_SPRITE_SHEET_URL = `${import.meta.env.BASE_URL}defenders/sauna-party-sheet.png`;
const DEFENDER_SPRITE_FRAMES: SpriteFrame[] = [
  { x: 24, y: 120, w: 360, h: 760, scale: 1.04 },
  { x: 340, y: 120, w: 360, h: 760, scale: 1.02 },
  { x: 650, y: 80, w: 470, h: 820, scale: 1.08 },
  { x: 1090, y: 120, w: 330, h: 760, scale: 1.02 }
];

let defenderSpriteSheet: HTMLImageElement | null | undefined;

function getBoardLayout(width: number, height: number, radius: number): BoardLayout {
  const padding = Math.max(24, Math.min(width, height) * 0.06);
  const horizontalCapacity = (width - padding * 2) / (SQRT3 * (radius * 2 + 1.5));
  const verticalCapacity = (height - padding * 2) / (radius * 3 + 2.4);
  return {
    hexSize: Math.max(18, Math.min(horizontalCapacity, verticalCapacity)),
    centerX: width / 2,
    centerY: height / 2
  };
}

function axialToPixel(tile: AxialCoord, layout: BoardLayout) {
  return {
    x: layout.centerX + layout.hexSize * SQRT3 * (tile.q + tile.r / 2),
    y: layout.centerY + layout.hexSize * 1.5 * tile.r
  };
}

function roundAxial(q: number, r: number): AxialCoord {
  let x = q;
  let z = r;
  let y = -x - z;
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

function pixelToAxial(x: number, y: number, layout: BoardLayout): AxialCoord {
  const localX = x - layout.centerX;
  const localY = y - layout.centerY;
  const q = (SQRT3 / 3 * localX - localY / 3) / layout.hexSize;
  const r = ((2 / 3) * localY) / layout.hexSize;
  return roundAxial(q, r);
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

function drawHealthBar(
  ctx: CanvasRenderingContext2D,
  center: { x: number; y: number },
  width: number,
  ratio: number,
  color: string
) {
  const x = center.x - width / 2;
  const y = center.y - width * 0.88;
  ctx.fillStyle = 'rgba(10, 16, 18, 0.45)';
  ctx.fillRect(x, y, width, 5);
  ctx.fillStyle = color;
  ctx.fillRect(x, y, width * Math.max(0, Math.min(1, ratio)), 5);
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

function drawDefenderPortrait(
  ctx: CanvasRenderingContext2D,
  center: { x: number; y: number },
  radius: number,
  spriteIndex: number
): boolean {
  const sheet = getDefenderSpriteSheet();
  if (!sheet || !sheet.complete || sheet.naturalWidth === 0) {
    return false;
  }

  const frame = DEFENDER_SPRITE_FRAMES[spriteIndex % DEFENDER_SPRITE_FRAMES.length];
  const scale = frame.scale ?? 1;
  const destWidth = radius * 1.86 * scale;
  const destHeight = destWidth * (frame.h / frame.w);
  const destX = center.x - destWidth / 2;
  const destY = center.y - destHeight * 0.58;

  ctx.save();
  ctx.beginPath();
  ctx.arc(center.x, center.y, radius * 0.79, 0, Math.PI * 2);
  ctx.clip();
  const previousSmoothing = ctx.imageSmoothingEnabled;
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(sheet, frame.x, frame.y, frame.w, frame.h, destX, destY, destWidth, destHeight);
  ctx.imageSmoothingEnabled = previousSmoothing;
  ctx.restore();
  return true;
}

function getDefenderStyle(styleId: number) {
  return DEFENDER_TOKEN_STYLES[styleId % DEFENDER_TOKEN_STYLES.length];
}

function getEnemyStyle(styleId: number) {
  return ENEMY_TOKEN_STYLES[styleId % ENEMY_TOKEN_STYLES.length];
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

  ctx.clearRect(0, 0, viewportWidth, viewportHeight);

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

  for (const tile of snapshot.tiles) {
    const center = axialToPixel(tile, layout);
    const key = coordKey(tile);
    const distance = hexDistance(tile, { q: 0, r: 0 });
    let fill = distance === 0 ? 'rgba(54, 94, 96, 0.92)' : 'rgba(27, 49, 54, 0.92)';
    let stroke = 'rgba(154, 219, 214, 0.12)';
    let lineWidth = 1;

    if (spawnSet.has(key)) {
      fill = 'rgba(109, 43, 48, 0.94)';
      stroke = 'rgba(246, 139, 117, 0.34)';
    } else if (buildableSet.has(key)) {
      fill = snapshot.state.phase === 'prep' ? 'rgba(110, 72, 35, 0.94)' : 'rgba(52, 65, 61, 0.92)';
      stroke = 'rgba(255, 205, 118, 0.2)';
    }

    if (hoverKey === key) {
      fill = buildableSet.has(key) ? 'rgba(171, 117, 58, 0.98)' : 'rgba(75, 92, 89, 0.96)';
      stroke = 'rgba(231, 255, 250, 0.82)';
      lineWidth = 2.2;
    }

    drawTile(ctx, center, layout.hexSize - 1.5, fill, stroke, lineWidth);
  }

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

  for (const defender of snapshot.state.defenders) {
    if (defender.location !== 'board' || !defender.tile) continue;
    const center = axialToPixel(defender.tile, layout);
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
    const radius = layout.hexSize * 0.39;
    const style = getDefenderStyle(defender.tokenStyleId);

    if (selected?.id === defender.id) {
      ctx.beginPath();
      ctx.arc(center.x, center.y, radius + 8, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(234, 255, 250, 0.9)';
      ctx.lineWidth = 2.6;
      ctx.stroke();
    }

    drawTokenBase(ctx, center, radius, style, template.fill);
    if (!drawDefenderPortrait(ctx, center, radius, defender.tokenStyleId)) {
      drawGlyph(ctx, center, radius, style.glyph, style.glyph === 'tower' ? style.ring : style.accent);
      drawTokenLabel(ctx, center, radius, template.label, '#fff8ed');
    }
    drawHealthBar(ctx, center, layout.hexSize * 0.94, defender.hp / Math.max(1, stats.maxHp), '#7ed8c8');
  }

  for (const enemy of snapshot.state.enemies) {
    const center = axialToPixel(enemy.tile, layout);
    const archetype = snapshot.enemyArchetypes[enemy.archetypeId];
    const radius = layout.hexSize * (enemy.archetypeId === 'chieftain' ? 0.42 : 0.36);
    const style = getEnemyStyle(enemy.tokenStyleId);
    drawTokenBase(ctx, center, radius, style, archetype.fill);
    drawGlyph(ctx, center, radius, style.glyph, style.accent);
    drawTokenLabel(ctx, center, radius, archetype.label, '#fff0e8');
    drawHealthBar(ctx, center, layout.hexSize * 0.94, enemy.hp / archetype.maxHp, '#ff8772');
  }

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

  ctx.fillStyle = 'rgba(234, 247, 244, 0.96)';
  ctx.textAlign = 'left';
  ctx.font = '700 14px Trebuchet MS';
  ctx.fillText(snapshot.hud.isBossWave ? `Boss Wave ${snapshot.hud.waveNumber}` : `Wave ${snapshot.hud.waveNumber}`, 18, 24);
  ctx.fillText(`Board ${snapshot.hud.boardCount}/${snapshot.hud.boardCap}`, 18, 44);
}

export function pickTileAtCanvasPoint(
  snapshot: GameSnapshot,
  rect: DOMRect,
  clientX: number,
  clientY: number
): AxialCoord | null {
  const layout = getBoardLayout(rect.width, rect.height, snapshot.config.gridRadius);
  const tile = pixelToAxial(clientX - rect.left, clientY - rect.top, layout);
  if (hexDistance(tile, { q: 0, r: 0 }) > snapshot.config.gridRadius) {
    return null;
  }
  return tile;
}
