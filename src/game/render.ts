import { coordKey, hexDistance } from './logic';
import type { AxialCoord, GameSnapshot } from './types';

const SQRT3 = Math.sqrt(3);

interface BoardLayout {
  hexSize: number;
  centerX: number;
  centerY: number;
}

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

function drawBadge(
  ctx: CanvasRenderingContext2D,
  center: { x: number; y: number },
  radius: number,
  fill: string,
  outline: string,
  label: string
) {
  ctx.beginPath();
  ctx.arc(center.x, center.y, radius, 0, Math.PI * 2);
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.strokeStyle = outline;
  ctx.stroke();
  ctx.fillStyle = '#fff5e6';
  ctx.font = `700 ${Math.max(11, radius * 0.84)}px Trebuchet MS`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(label, center.x, center.y + 1);
}

function drawHealthBar(
  ctx: CanvasRenderingContext2D,
  center: { x: number; y: number },
  width: number,
  ratio: number,
  color: string
) {
  const x = center.x - width / 2;
  const y = center.y - width * 0.82;
  ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
  ctx.fillRect(x, y, width, 5);
  ctx.fillStyle = color;
  ctx.fillRect(x, y, width * Math.max(0, Math.min(1, ratio)), 5);
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
  background.addColorStop(0, '#2b160f');
  background.addColorStop(1, '#120907');
  ctx.fillStyle = background;
  ctx.fillRect(0, 0, viewportWidth, viewportHeight);

  const ember = ctx.createRadialGradient(
    layout.centerX,
    layout.centerY,
    layout.hexSize * 0.7,
    layout.centerX,
    layout.centerY,
    layout.hexSize * 6.4
  );
  ember.addColorStop(0, snapshot.hud.isBossWave ? 'rgba(255, 92, 68, 0.22)' : 'rgba(255, 185, 102, 0.16)');
  ember.addColorStop(1, 'rgba(255, 185, 102, 0)');
  ctx.fillStyle = ember;
  ctx.fillRect(0, 0, viewportWidth, viewportHeight);

  for (const tile of snapshot.tiles) {
    const center = axialToPixel(tile, layout);
    const key = coordKey(tile);
    const distance = hexDistance(tile, { q: 0, r: 0 });
    let fill = distance === 0 ? 'rgba(112, 60, 26, 0.96)' : 'rgba(63, 35, 20, 0.9)';
    let stroke = 'rgba(246, 201, 144, 0.12)';
    let lineWidth = 1;

    if (spawnSet.has(key)) {
      fill = 'rgba(112, 40, 35, 0.96)';
      stroke = 'rgba(229, 126, 118, 0.32)';
    } else if (buildableSet.has(key)) {
      fill = snapshot.state.phase === 'prep' ? 'rgba(98, 58, 30, 0.96)' : 'rgba(76, 45, 27, 0.86)';
      stroke = 'rgba(241, 169, 77, 0.26)';
    }

    if (hoverKey === key) {
      fill = buildableSet.has(key) ? 'rgba(154, 95, 49, 0.98)' : 'rgba(102, 56, 33, 0.96)';
      stroke = 'rgba(255, 226, 157, 0.68)';
      lineWidth = 2;
    }

    drawTile(ctx, center, layout.hexSize - 1.5, fill, stroke, lineWidth);
  }

  const saunaCenter = axialToPixel({ q: 0, r: 0 }, layout);
  ctx.beginPath();
  ctx.arc(saunaCenter.x, saunaCenter.y, layout.hexSize * 0.64, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(255, 204, 118, 0.92)';
  ctx.fill();
  ctx.beginPath();
  ctx.arc(saunaCenter.x, saunaCenter.y, layout.hexSize * 0.32, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(138, 74, 24, 0.98)';
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
        maxHp: template.stats.maxHp,
        damage: template.stats.damage,
        heal: template.stats.heal,
        range: template.stats.range,
        attackCooldownMs: template.stats.attackCooldownMs
      }
    );
    const radius = layout.hexSize * 0.37;

    if (selected?.id === defender.id) {
      ctx.beginPath();
      ctx.arc(center.x, center.y, radius + 7, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(255, 233, 187, 0.78)';
      ctx.lineWidth = 2;
      ctx.stroke();
    }

    drawBadge(ctx, center, radius, template.fill, template.outline, template.label);
    drawHealthBar(ctx, center, layout.hexSize * 0.88, defender.hp / Math.max(1, stats.maxHp), '#7cd69f');
  }

  for (const enemy of snapshot.state.enemies) {
    const center = axialToPixel(enemy.tile, layout);
    const archetype = snapshot.enemyArchetypes[enemy.archetypeId];
    const radius = layout.hexSize * (enemy.archetypeId === 'chieftain' ? 0.39 : 0.34);
    drawBadge(ctx, center, radius, archetype.fill, archetype.outline, archetype.label);
    drawHealthBar(ctx, center, layout.hexSize * 0.88, enemy.hp / archetype.maxHp, '#ef7360');
  }

  if (snapshot.state.phase === 'lost') {
    ctx.fillStyle = 'rgba(18, 8, 6, 0.62)';
    ctx.fillRect(0, 0, viewportWidth, viewportHeight);
    ctx.fillStyle = '#fff2da';
    ctx.textAlign = 'center';
    ctx.font = '700 28px Trebuchet MS';
    ctx.fillText('Sauna Went Cold', layout.centerX, 56);
    ctx.font = '500 16px Trebuchet MS';
    ctx.fillText(snapshot.hud.statusText, layout.centerX, 84);
  }

  ctx.fillStyle = 'rgba(255, 240, 216, 0.94)';
  ctx.textAlign = 'left';
  ctx.font = '600 14px Trebuchet MS';
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
