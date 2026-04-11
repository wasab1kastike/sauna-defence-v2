import type { CSSProperties } from 'react';

import { getTileViewportPosition, pickDefenderAtCanvasPoint, pickEnemyAtCanvasPoint, pickTileAtCanvasPoint } from '../game/render';
import type {
  BoardCamera,
  GameSnapshot,
  HudPanelId,
  HudSelectedEnemy,
  HudWorldLandmarkEntry,
  InputAction
} from '../game/types';

const BOARD_POPUP_MIN_WIDTH = 280;
const BOARD_POPUP_MAX_WIDTH = 420;
const BOARD_POPUP_WIDTH_RATIO = 0.34;
const BOARD_POPUP_MIN_HEIGHT = 320;
const BOARD_POPUP_MAX_HEIGHT = 720;
const BOARD_POPUP_HEIGHT_RATIO = 0.68;
const BOARD_POPUP_MARGIN = 18;
const BOARD_POPUP_MIN_TOP = 86;

export const GUIDE_STEPS = [
  {
    title: 'Topbar At A Glance',
    body: 'The topbar is your quick read: wave, board count, SISU, Steam and Sauna HP all live there now.'
  },
  {
    title: 'Use The Right Rail',
    body: 'Modifiers and Loot stay on the compact right-side rail while recruiting moves into the bottom dock.'
  },
  {
    title: 'Bottom Dock Runs The Roster',
    body: 'The bottom dock is your recruit market now: four slots, quick refresh, and hotkeys A, S, D and F for fast picks.'
  },
  {
    title: 'Map Buildings Matter',
    body: 'Permanent unlocks can appear as buildings on the board. Click them to open places like the Beer Shop, Sauna Kiosk, or Sauna Hall of Fame when available.'
  },
  {
    title: 'Hint Card And Action Buttons',
    body: 'The small left hint card tells you the next step. Start Wave, Autoplay and SISU stay just below it while Q and W handle market controls, and E rerolls only when the sauna is open.'
  }
] as const;

export interface HudUtilityButton {
  id: HudPanelId;
  label: string;
  badge: string | null;
  disabled?: boolean;
}

export function formatRarity(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

export function assetUrl(path: string) {
  return `${import.meta.env.BASE_URL}${path}`;
}

export function formatLocationLabel(location: 'ready' | 'board' | 'sauna' | 'dead') {
  switch (location) {
    case 'board':
      return 'On Board';
    case 'ready':
      return 'In Reserve';
    case 'sauna':
      return 'In Sauna';
    case 'dead':
      return 'Fallen';
    default:
      return location;
  }
}

export function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

export function formatCadence(ms: number) {
  const seconds = ms / 1000;
  return `${seconds >= 10 ? seconds.toFixed(0) : seconds.toFixed(1)}s`;
}

export function compactHintBody(text: string) {
  const [firstSentence] = text.split('. ');
  return firstSentence.endsWith('.') ? firstSentence : `${firstSentence}.`;
}

export function getSelectionCardTitle(selectedSauna: boolean, selectedEnemy: HudSelectedEnemy | null): string {
  if (selectedSauna) return 'Sauna Reserve';
  if (selectedEnemy) return selectedEnemy.isBoss ? 'Boss Profile' : 'Target Profile';
  return 'Selected Hero';
}

export function shouldAutoOpenPatchNotes(lastSeenVersion: string | null | undefined, latestVersion: string): boolean {
  return (lastSeenVersion ?? '') !== latestVersion;
}

export function formatPatchNotesDate(date: string): string {
  const dateOnlyMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  const parsed = dateOnlyMatch
    ? new Date(Number(dateOnlyMatch[1]), Number(dateOnlyMatch[2]) - 1, Number(dateOnlyMatch[3]))
    : new Date(date);
  if (Number.isNaN(parsed.getTime())) {
    return date;
  }
  return new Intl.DateTimeFormat('fi-FI', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  }).format(parsed);
}

export function getLandmarkStyle(
  snapshot: GameSnapshot,
  frameSize: { width: number; height: number },
  landmark: HudWorldLandmarkEntry,
  camera: BoardCamera
): CSSProperties {
  const point = getTileViewportPosition(snapshot, frameSize.width, frameSize.height, landmark.tile, camera);
  return {
    left: `${point.x}px`,
    top: `${point.y}px`
  };
}

export function getLandmarkPopupPlacement(
  point: { x: number; y: number },
  frameSize: { width: number; height: number }
): { left: number; top: number } {
  const popupWidth = Math.min(BOARD_POPUP_MAX_WIDTH, Math.max(BOARD_POPUP_MIN_WIDTH, frameSize.width * BOARD_POPUP_WIDTH_RATIO));
  const popupHeight = Math.min(BOARD_POPUP_MAX_HEIGHT, Math.max(BOARD_POPUP_MIN_HEIGHT, frameSize.height * BOARD_POPUP_HEIGHT_RATIO));
  return {
    left: clamp(
      point.x - (point.x > frameSize.width * 0.55 ? popupWidth - 48 : 48),
      BOARD_POPUP_MARGIN,
      frameSize.width - popupWidth - BOARD_POPUP_MARGIN
    ),
    top: clamp(
      point.y - 72,
      BOARD_POPUP_MIN_TOP,
      frameSize.height - popupHeight - BOARD_POPUP_MARGIN
    )
  };
}

export function getLandmarkPopupStyle(
  snapshot: GameSnapshot,
  frameSize: { width: number; height: number },
  landmark: HudWorldLandmarkEntry | null,
  camera: BoardCamera
): CSSProperties | undefined {
  if (!landmark || frameSize.width === 0 || frameSize.height === 0) {
    return undefined;
  }
  const point = getTileViewportPosition(snapshot, frameSize.width, frameSize.height, landmark.tile, camera);
  const placement = getLandmarkPopupPlacement(point, frameSize);
  return {
    left: `${placement.left}px`,
    top: `${placement.top}px`
  };
}

export function resolveBoardPointerAction(
  snapshot: GameSnapshot,
  rect: DOMRect,
  clientX: number,
  clientY: number,
  camera: BoardCamera,
  pickLandmark: (
    nextSnapshot: GameSnapshot,
    nextRect: DOMRect,
    nextClientX: number,
    nextClientY: number
  ) => HudWorldLandmarkEntry | null
): InputAction {
  const clickedLandmark = pickLandmark(snapshot, rect, clientX, clientY);
  if (clickedLandmark) {
    return { type: 'selectWorldLandmark', landmarkId: clickedLandmark.id };
  }

  const clickedDefenderId = pickDefenderAtCanvasPoint(snapshot, rect, clientX, clientY, camera);
  if (clickedDefenderId) {
    return { type: 'selectDefender', defenderId: clickedDefenderId };
  }

  const clickedEnemyInstanceId = pickEnemyAtCanvasPoint(snapshot, rect, clientX, clientY, camera);
  if (clickedEnemyInstanceId !== null) {
    return { type: 'selectEnemy', enemyInstanceId: clickedEnemyInstanceId };
  }

  const tile = pickTileAtCanvasPoint(snapshot, rect, clientX, clientY, camera);
  if (!tile) {
    return { type: 'clearSelection' };
  }
  if (tile.q === 0 && tile.r === 0) {
    return { type: 'selectSauna' };
  }
  return { type: 'placeSelectedDefender', tile };
}

export function resolveGameplayHotkeyAction(
  snapshot: GameSnapshot | null,
  key: string,
  options: { guideStepActive: boolean; patchNotesOpen: boolean }
): InputAction | null {
  if (!snapshot || options.guideStepActive || options.patchNotesOpen) {
    return null;
  }
  if (
    snapshot.hud.introOpen
    || snapshot.hud.showIntermission
    || snapshot.hud.showGlobalModifierDraft
    || snapshot.hud.showSubclassDraft
  ) {
    return null;
  }

  const normalizedKey = key.toLowerCase();
  if (normalizedKey === 'a' || normalizedKey === 's' || normalizedKey === 'd' || normalizedKey === 'f') {
    const hotkeyIndex = { a: 0, s: 1, d: 2, f: 3 }[normalizedKey];
    const offer = snapshot.hud.recruitOffers[hotkeyIndex];
    return offer && !offer.empty && offer.id !== null && offer.canBuy
      ? { type: 'recruitOffer', offerId: offer.id }
      : null;
  }
  if (normalizedKey === 'q') {
    return snapshot.hud.canRollRecruitOffers ? { type: 'rerollRecruitOffers' } : null;
  }
  if (normalizedKey === 'w') {
    return snapshot.hud.canLevelUpRecruitment ? { type: 'levelUpRecruitment' } : null;
  }
  if (normalizedKey === 'e') {
    return snapshot.hud.saunaSelected && snapshot.hud.saunaReserve.canReroll
      ? { type: 'rerollSaunaDefender' }
      : null;
  }
  return null;
}

export function getHudUtilityButtons(snapshot: GameSnapshot | null, globalModifierCount: number): HudUtilityButton[] {
  if (!snapshot) {
    return [];
  }

  return [
    { id: 'modifiers', label: 'Modifiers', badge: globalModifierCount > 0 ? `${globalModifierCount}` : null },
    {
      id: 'loot',
      label: snapshot.hud.inventoryUnlocked ? 'Loot / Stash' : 'Loot',
      badge: snapshot.hud.hasRecentLoot ? 'New' : (snapshot.hud.inventoryUnlocked ? `${snapshot.hud.inventoryCount}` : null)
    }
  ];
}
