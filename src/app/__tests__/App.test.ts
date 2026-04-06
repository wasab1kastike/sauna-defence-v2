import {
  formatPatchNotesDate,
  getHudUtilityButtons,
  getLandmarkPopupPlacement,
  getSelectionCardTitle,
  resolveGameplayHotkeyAction,
  resolveBoardPointerAction,
  shouldAutoOpenPatchNotes
} from '../uiHelpers';
import { gameContent } from '../../content/gameContent';
import { createDefaultMetaProgress, createInitialState, createSnapshot } from '../../game/logic';
import { getTileViewportPosition } from '../../game/render';

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
    const action = resolveBoardPointerAction(snapshot, rect, point.x, point.y, () => null);

    expect(action).toEqual({ type: 'selectDefender', defenderId: defender.id });
  });

  it('opens patch notes automatically only when version differs', () => {
    expect(shouldAutoOpenPatchNotes('0.1.0', '0.1.1')).toBe(true);
    expect(shouldAutoOpenPatchNotes('0.1.1', '0.1.1')).toBe(false);
    expect(shouldAutoOpenPatchNotes(null, '0.1.1')).toBe(true);
  });

  it('formats patch note dates to player-friendly Finnish date text', () => {
    expect(formatPatchNotesDate('2026-04-04')).toContain('2026');
    expect(formatPatchNotesDate('not-a-date')).toBe('not-a-date');
  });

  it('maps A, S and D to the first three ready reserve heroes', () => {
    const state = createInitialState(gameContent, createDefaultMetaProgress(), 42, false);
    const snapshot = createSnapshot(state, gameContent);

    expect(resolveGameplayHotkeyAction(snapshot, 'a', { guideStepActive: false, patchNotesOpen: false })).toEqual({
      type: 'selectDefender',
      defenderId: snapshot.hud.readyReserveEntries[0].id
    });
    expect(resolveGameplayHotkeyAction(snapshot, 's', { guideStepActive: false, patchNotesOpen: false })).toEqual({
      type: 'selectDefender',
      defenderId: snapshot.hud.readyReserveEntries[1].id
    });
    expect(resolveGameplayHotkeyAction(snapshot, 'd', { guideStepActive: false, patchNotesOpen: false })).toEqual({
      type: 'selectDefender',
      defenderId: snapshot.hud.readyReserveEntries[2].id
    });
  });

  it('maps Q, W and E to recruit refresh, recruit level up, and sauna reroll', () => {
    const state = createInitialState(gameContent, createDefaultMetaProgress(), 42, false);
    state.sisu.current = 12;
    const snapshot = createSnapshot(state, gameContent);

    expect(resolveGameplayHotkeyAction(snapshot, 'q', { guideStepActive: false, patchNotesOpen: false })).toEqual({ type: 'rerollRecruitOffers' });
    expect(resolveGameplayHotkeyAction(snapshot, 'w', { guideStepActive: false, patchNotesOpen: false })).toEqual({ type: 'levelUpRecruitment' });
    expect(resolveGameplayHotkeyAction(snapshot, 'e', { guideStepActive: false, patchNotesOpen: false })).toEqual({ type: 'rerollSaunaDefender' });
  });

  it('blocks gameplay hotkeys while blocking overlays are active', () => {
    const state = createInitialState(gameContent, createDefaultMetaProgress(), 42, false);
    state.sisu.current = 12;
    const snapshot = createSnapshot(state, gameContent);

    expect(resolveGameplayHotkeyAction(snapshot, 'q', { guideStepActive: true, patchNotesOpen: false })).toBeNull();
    expect(resolveGameplayHotkeyAction(snapshot, 'e', { guideStepActive: false, patchNotesOpen: true })).toBeNull();
  });

  it('keeps recruitment out of the right-side utility rail', () => {
    const state = createInitialState(gameContent, createDefaultMetaProgress(), 42, false);
    const snapshot = createSnapshot(state, gameContent);
    const buttons = getHudUtilityButtons(snapshot, snapshot.hud.globalModifiers.length);

    expect(buttons.map((button) => button.id)).toEqual(['modifiers', 'loot']);
  });

  it('blocks gameplay hotkeys during intermission', () => {
    const state = createInitialState(gameContent, createDefaultMetaProgress(), 42, false);
    state.phase = 'lost';
    state.overlayMode = 'intermission';
    const snapshot = createSnapshot(state, gameContent);

    expect(resolveGameplayHotkeyAction(snapshot, 'a', { guideStepActive: false, patchNotesOpen: false })).toBeNull();
    expect(resolveGameplayHotkeyAction(snapshot, 'q', { guideStepActive: false, patchNotesOpen: false })).toBeNull();
  });
});
