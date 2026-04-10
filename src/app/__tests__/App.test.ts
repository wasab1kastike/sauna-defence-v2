import { act, createElement } from 'react';
import {
  formatPatchNotesDate,
  GUIDE_STEPS,
  getHudUtilityButtons,
  getLandmarkPopupPlacement,
  getSelectionCardTitle,
  resolveGameplayHotkeyAction,
  resolveBoardPointerAction,
  shouldAutoOpenPatchNotes
} from '../uiHelpers';
import { renderToStaticMarkup } from 'react-dom/server';
import { createRoot } from 'react-dom/client';
import { gameContent } from '../../content/gameContent';
import { allPatchNotes } from '../../content/patchNotes';
import { createDefaultMetaProgress, createInitialState, createSnapshot } from '../../game/logic';
import { clampBoardCamera, DEFAULT_BOARD_CAMERA } from '../../game/render/layout';
import { getTileViewportPosition } from '../../game/render';
import { BottomDock } from '../components/BottomDock';
import { PatchNotesOverlay } from '../components/PatchNotesOverlay';
import { SelectionCard } from '../components/SelectionCard';

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

  it('allows more vertical camera travel when a bottom dock safe area is present', () => {
    const plainUp = clampBoardCamera({ zoom: 1, offsetX: 0, offsetY: -999 }, 900, 700, 6);
    const safeUp = clampBoardCamera({ zoom: 1, offsetX: 0, offsetY: -999 }, 900, 700, 6, {
      topInset: 18,
      bottomInset: 220
    });
    const plainDown = clampBoardCamera({ zoom: 1, offsetX: 0, offsetY: 999 }, 900, 700, 6);
    const safeDown = clampBoardCamera({ zoom: 1, offsetX: 0, offsetY: 999 }, 900, 700, 6, {
      topInset: 18,
      bottomInset: 220
    });

    expect(Math.abs(safeUp.offsetY)).toBeGreaterThan(Math.abs(plainUp.offsetY));
    expect(safeDown.offsetY).toBeGreaterThan(plainDown.offsetY);
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
    const defender = state.recruitOffers.find((entry) => entry !== null)!.candidate;
    state.defenders.push(defender);
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

  it('opens patch notes automatically only when version differs', () => {
    expect(shouldAutoOpenPatchNotes('0.1.0', '0.1.1')).toBe(true);
    expect(shouldAutoOpenPatchNotes('0.1.1', '0.1.1')).toBe(false);
    expect(shouldAutoOpenPatchNotes(null, '0.1.1')).toBe(true);
  });

  it('formats patch note dates to player-friendly Finnish date text', () => {
    expect(formatPatchNotesDate('2026-04-04')).toContain('2026');
    expect(formatPatchNotesDate('not-a-date')).toBe('not-a-date');
  });

  it('uses Sauna Kiosk in guide copy for board landmarks', () => {
    expect(GUIDE_STEPS.some((step) => step.body.includes('Sauna Kiosk'))).toBe(true);
  });

  it('lets players browse older patch notes inside the modal', async () => {
    const reactActEnv = globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean };
    const previousActFlag = reactActEnv.IS_REACT_ACT_ENVIRONMENT;
    reactActEnv.IS_REACT_ACT_ENVIRONMENT = true;
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);

    await act(async () => {
      root.render(createElement(PatchNotesOverlay, { onClose: () => undefined }));
    });

    const buttons = () => Array.from(container.querySelectorAll('button'));
    const newerButton = () => buttons().find((button) => button.textContent?.includes('Uudempi')) as HTMLButtonElement;
    const olderButton = () => buttons().find((button) => button.textContent?.includes('Vanhempi')) as HTMLButtonElement;

    expect(container.textContent).toContain(`Versio ${allPatchNotes[0].version}`);
    expect(newerButton().disabled).toBe(true);
    expect(olderButton().disabled).toBe(false);

    await act(async () => {
      olderButton().dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(container.textContent).toContain(`Versio ${allPatchNotes[1].version}`);
    expect(newerButton().disabled).toBe(false);

    for (let index = 2; index < allPatchNotes.length; index += 1) {
      await act(async () => {
        olderButton().dispatchEvent(new MouseEvent('click', { bubbles: true }));
      });
      expect(container.textContent).toContain(`Versio ${allPatchNotes[index].version}`);
    }

    expect(olderButton().disabled).toBe(true);

    await act(async () => {
      newerButton().dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(container.textContent).toContain(`Versio ${allPatchNotes[allPatchNotes.length - 2].version}`);

    await act(async () => {
      root.unmount();
    });
    container.remove();
    reactActEnv.IS_REACT_ACT_ENVIRONMENT = previousActFlag;
  });

  it('maps A, S, D and F to the four recruit market slots', () => {
    const state = createInitialState(gameContent, createDefaultMetaProgress(), 42, false);
    const snapshot = createSnapshot(state, gameContent);

    expect(resolveGameplayHotkeyAction(snapshot, 'a', { guideStepActive: false, patchNotesOpen: false })).toEqual({
      type: 'recruitOffer',
      offerId: snapshot.hud.recruitOffers[0].id
    });
    expect(resolveGameplayHotkeyAction(snapshot, 's', { guideStepActive: false, patchNotesOpen: false })).toEqual({
      type: 'recruitOffer',
      offerId: snapshot.hud.recruitOffers[1].id
    });
    expect(resolveGameplayHotkeyAction(snapshot, 'd', { guideStepActive: false, patchNotesOpen: false })).toEqual({
      type: 'recruitOffer',
      offerId: snapshot.hud.recruitOffers[2].id
    });
    expect(resolveGameplayHotkeyAction(snapshot, 'f', { guideStepActive: false, patchNotesOpen: false })).toEqual({
      type: 'recruitOffer',
      offerId: snapshot.hud.recruitOffers[3].id
    });
  });

  it('maps Q and W globally, but E only when the sauna is selected', () => {
    const state = createInitialState(gameContent, createDefaultMetaProgress(), 42, false);
    state.sisu.current = 12;
    const saunaHero = state.recruitOffers.find((entry) => entry !== null)!.candidate;
    saunaHero.location = 'sauna';
    saunaHero.tile = null;
    state.defenders.push(saunaHero);
    state.saunaDefenderId = saunaHero.id;
    const snapshot = createSnapshot(state, gameContent);
    state.selectedMapTarget = 'sauna';
    const saunaSelectedSnapshot = createSnapshot(state, gameContent);

    expect(resolveGameplayHotkeyAction(snapshot, 'q', { guideStepActive: false, patchNotesOpen: false })).toEqual({ type: 'rerollRecruitOffers' });
    expect(resolveGameplayHotkeyAction(snapshot, 'w', { guideStepActive: false, patchNotesOpen: false })).toEqual({ type: 'levelUpRecruitment' });
    expect(resolveGameplayHotkeyAction(snapshot, 'e', { guideStepActive: false, patchNotesOpen: false })).toBeNull();
    expect(resolveGameplayHotkeyAction(saunaSelectedSnapshot, 'e', { guideStepActive: false, patchNotesOpen: false })).toEqual({ type: 'rerollSaunaDefender' });
  });

  it('keeps sauna reroll out of the default dock and inside the selected sauna view', () => {
    const state = createInitialState(gameContent, createDefaultMetaProgress(), 42, false);
    state.sisu.current = 12;
    const saunaHero = state.recruitOffers.find((entry) => entry !== null)!.candidate;
    saunaHero.location = 'sauna';
    saunaHero.tile = null;
    state.defenders.push(saunaHero);
    state.saunaDefenderId = saunaHero.id;

    const snapshot = createSnapshot(state, gameContent);
    const dockMarkup = renderToStaticMarkup(createElement(BottomDock, {
      snapshot,
      dispatch: () => undefined
    }));

    expect(dockMarkup).not.toContain('Inspect Sauna');
    expect(dockMarkup).not.toContain('Reroll (E');

    state.selectedMapTarget = 'sauna';
    const selectedSaunaSnapshot = createSnapshot(state, gameContent);
    const selectionMarkup = renderToStaticMarkup(createElement(SelectionCard, {
      selectedDefender: selectedSaunaSnapshot.hud.selectedDefender,
      selectedSauna: selectedSaunaSnapshot.hud.selectedSauna,
      selectedEnemy: selectedSaunaSnapshot.hud.selectedEnemy,
      dispatch: () => undefined
    }));

    expect(selectionMarkup).toContain('Reroll (E');
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

  it('normalizes a stale recruit popup panel back to dock-only HUD state', () => {
    const state = createInitialState(gameContent, createDefaultMetaProgress(), 42, false);
    state.activePanel = 'recruit';

    const snapshot = createSnapshot(state, gameContent);

    expect(snapshot.hud.activePanel).toBeNull();
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
