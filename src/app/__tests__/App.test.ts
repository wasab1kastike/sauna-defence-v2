import { didBoardPointerBecomeDrag, getLandmarkPopupPlacement, getSelectionCardTitle, resolveBoardPointerAction } from '../App';
import { gameContent } from '../../content/gameContent';
import { createDefaultMetaProgress, createInitialState, createSnapshot } from '../../game/logic';
import { DEFAULT_BOARD_CAMERA, getTileViewportPosition } from '../../game/render';

describe('App popup helpers', () => {
  it('keeps landmark popups inside the frame near the top-left edge', () => {
    const placement = getLandmarkPopupPlacement({ x: 12, y: 20 }, { width: 900, height: 700 });

    expect(placement.left).toBe(18);
    expect(placement.top).toBe(86);
  });

  it('keeps landmark popups inside the frame near the bottom-right edge', () => {
    const placement = getLandmarkPopupPlacement({ x: 880, y: 690 }, { width: 900, height: 700 });

    expect(placement.left).toBe(576);
    expect(placement.top).toBeCloseTo(206, 6);
  });

  it('uses an enemy-specific heading when an enemy profile is selected', () => {
    expect(getSelectionCardTitle(false, {
      instanceId: 1,
      name: 'Pebble',
      description: 'Boss',
      lore: 'Huge worm',
      isBoss: true,
      hp: 100,
      maxHp: 100,
      damage: 10,
      range: 1,
      attackCooldownMs: 1000,
      moveCooldownMs: 1000,
      threat: 20,
      behaviorLabel: 'Tunnels past heroes',
      bossLabel: 'Boss'
    })).toBe('Boss Profile');
  });

  it('keeps defender selection above enemy selection when their hit areas overlap', () => {
    const state = createInitialState(gameContent, createDefaultMetaProgress(), 42, false);
    const defender = state.defenders.find((entry) => entry.location === 'ready')!;
    defender.location = 'board';
    defender.tile = { q: 0, r: -1 };
    defender.homeTile = { q: 0, r: -1 };
    state.enemies = [{
      instanceId: 7,
      archetypeId: 'raider',
      tokenStyleId: 0,
      tile: { q: 0, r: -1 },
      hp: gameContent.enemyArchetypes.raider.maxHp,
      lastHitByDefenderId: null,
      attackReadyAtMs: 999999,
      moveReadyAtMs: 999999
    }];

    const snapshot = createSnapshot(state, gameContent);
    const rect = { left: 0, top: 0, width: 900, height: 700 } as DOMRect;
    const point = getTileViewportPosition(snapshot, rect.width, rect.height, defender.tile!);
    const action = resolveBoardPointerAction(snapshot, rect, point.x, point.y, DEFAULT_BOARD_CAMERA, () => null);

    expect(action).toEqual({ type: 'selectDefender', defenderId: defender.id });
  });

  it('treats tiny pointer movement as a click and larger movement as a drag', () => {
    expect(didBoardPointerBecomeDrag({ x: 100, y: 100 }, { x: 106, y: 107 })).toBe(false);
    expect(didBoardPointerBecomeDrag({ x: 100, y: 100 }, { x: 108, y: 108 })).toBe(true);
  });
});
