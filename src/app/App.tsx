import { useEffect, useRef, useState } from 'react';
import type { CSSProperties, PointerEvent as ReactPointerEvent, ReactNode } from 'react';

import { latestPatchNotes } from '../content/patchNotes';
import { gameContent } from '../content/gameContent';
import { getTileViewportPosition, pickDefenderAtCanvasPoint, pickEnemyAtCanvasPoint, pickTileAtCanvasPoint } from '../game/render';
import { createGameRuntime, STORAGE_KEY_PREFIX } from '../game/runtime';
import { APP_VERSION } from '../game/version';
import type {
  GameRuntime,
  GameSnapshot,
  HudPanelId,
  HudSelectedEnemy,
  HudWorldLandmarkEntry,
  InputAction
} from '../game/types';

function formatRarity(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function assetUrl(path: string) {
  return `${import.meta.env.BASE_URL}${path}`;
}

function formatLocationLabel(location: 'ready' | 'board' | 'sauna' | 'dead') {
  switch (location) {
    case 'board':
      return 'On Board';
    case 'ready':
      return 'On Bench';
    case 'sauna':
      return 'In Sauna';
    case 'dead':
      return 'Fallen';
    default:
      return location;
  }
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function formatCadence(ms: number) {
  const seconds = ms / 1000;
  return `${seconds >= 10 ? seconds.toFixed(0) : seconds.toFixed(1)}s`;
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
  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) {
    return date;
  }
  return new Intl.DateTimeFormat('fi-FI', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  }).format(parsed);
}

const BOARD_POPUP_MIN_WIDTH = 280;
const BOARD_POPUP_MAX_WIDTH = 420;
const BOARD_POPUP_WIDTH_RATIO = 0.34;
const BOARD_POPUP_MIN_HEIGHT = 320;
const BOARD_POPUP_MAX_HEIGHT = 720;
const BOARD_POPUP_HEIGHT_RATIO = 0.68;
const BOARD_POPUP_MARGIN = 18;
const BOARD_POPUP_MIN_TOP = 86;

const GUIDE_STORAGE_KEY = `${STORAGE_KEY_PREFIX}-guide-seen`;
const PATCH_NOTES_LAST_SEEN_STORAGE_KEY = `${STORAGE_KEY_PREFIX}-last-seen-patch-notes`;
const GUIDE_STEPS = [
  {
    title: 'Topbar At A Glance',
    body: 'The topbar is your quick read: wave, board count, SISU, Steam and Sauna HP all live there now.'
  },
  {
    title: 'Use The Right Rail',
    body: 'Modifiers, Loot and Recruit open from the compact right-side rail so the board stays visible underneath.'
  },
  {
    title: 'Selection Pops Up On Board',
    body: 'Click a hero or the sauna to open a small selection card on top of the map instead of using a permanent side panel.'
  },
  {
    title: 'Map Buildings Matter',
    body: 'Permanent unlocks can appear as buildings on the board. Click them to open things like the Beer Shop or Metashop when available.'
  },
  {
    title: 'Hint Card And Action Buttons',
    body: 'The small left hint card tells you the next step. Start Wave, Autoplay and SISU stay just below it as your main live controls.'
  }
] as const;

function compactHintBody(text: string) {
  const [firstSentence] = text.split('. ');
  return firstSentence.endsWith('.') ? firstSentence : `${firstSentence}.`;
}

function getLandmarkStyle(
  snapshot: GameSnapshot,
  frameSize: { width: number; height: number },
  landmark: HudWorldLandmarkEntry
): CSSProperties {
  const point = getTileViewportPosition(snapshot, frameSize.width, frameSize.height, landmark.tile);
  return {
    left: `${point.x}px`,
    top: `${point.y}px`
  };
}

export function getLandmarkPopupPlacement(
  point: { x: number; y: number },
  frameSize: { width: number; height: number },
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

function getLandmarkPopupStyle(
  snapshot: GameSnapshot,
  frameSize: { width: number; height: number },
  landmark: HudWorldLandmarkEntry | null
): CSSProperties | undefined {
  if (!landmark || frameSize.width === 0 || frameSize.height === 0) {
    return undefined;
  }
  const point = getTileViewportPosition(snapshot, frameSize.width, frameSize.height, landmark.tile);
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

  const clickedDefenderId = pickDefenderAtCanvasPoint(snapshot, rect, clientX, clientY);
  if (clickedDefenderId) {
    return { type: 'selectDefender', defenderId: clickedDefenderId };
  }

  const clickedEnemyInstanceId = pickEnemyAtCanvasPoint(snapshot, rect, clientX, clientY);
  if (clickedEnemyInstanceId !== null) {
    return { type: 'selectEnemy', enemyInstanceId: clickedEnemyInstanceId };
  }

  const tile = pickTileAtCanvasPoint(snapshot, rect, clientX, clientY);
  if (!tile) {
    return { type: 'clearSelection' };
  }
  if (tile.q === 0 && tile.r === 0) {
    return { type: 'selectSauna' };
  }
  return { type: 'placeSelectedDefender', tile };
}

export function App() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const frameRef = useRef<HTMLDivElement | null>(null);
  const runtimeRef = useRef<GameRuntime | null>(null);
  const [snapshot, setSnapshot] = useState<GameSnapshot | null>(null);
  const [frameSize, setFrameSize] = useState({ width: 0, height: 0 });
  const [guideSeen, setGuideSeen] = useState(() => {
    if (typeof window === 'undefined') {
      return false;
    }
    try {
      return window.localStorage.getItem(GUIDE_STORAGE_KEY) === 'true';
    } catch {
      return false;
    }
  });
  const [guideStep, setGuideStep] = useState<number | null>(null);
  const [patchNotesOpen, setPatchNotesOpen] = useState(false);
  const [patchNotesChecked, setPatchNotesChecked] = useState(false);

  const markPatchNotesSeen = () => {
    if (typeof window === 'undefined') {
      return;
    }
    try {
      window.localStorage.setItem(PATCH_NOTES_LAST_SEEN_STORAGE_KEY, latestPatchNotes.version);
    } catch {
      // Ignore localStorage failures.
    }
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }

    const runtime = createGameRuntime({
      canvas,
      content: gameContent,
      storage: typeof window !== 'undefined' ? window.localStorage : null
    });

    runtimeRef.current = runtime;
    const unsubscribe = runtime.subscribe(setSnapshot);

    const resize = () => {
      runtime.resize();
    };

    resize();
    runtime.start();
    window.addEventListener('resize', resize);

    return () => {
      window.removeEventListener('resize', resize);
      unsubscribe();
      runtime.stop();
      runtimeRef.current = null;
    };
  }, []);

  useEffect(() => {
    const frame = frameRef.current;
    if (!frame) {
      return;
    }

    const update = () => {
      const rect = frame.getBoundingClientRect();
      setFrameSize({ width: rect.width, height: rect.height });
    };

    update();

    if (typeof ResizeObserver === 'undefined') {
      window.addEventListener('resize', update);
      return () => window.removeEventListener('resize', update);
    }

    const observer = new ResizeObserver(() => update());
    observer.observe(frame);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!snapshot || snapshot.hud.introOpen || snapshot.hud.showIntermission || guideSeen || guideStep !== null) {
      return;
    }
    setGuideStep(0);
  }, [guideSeen, guideStep, snapshot]);

  useEffect(() => {
    if (!snapshot || patchNotesChecked) {
      return;
    }
    if (snapshot.hud.introOpen || snapshot.hud.showGlobalModifierDraft || snapshot.hud.showSubclassDraft || guideStep !== null) {
      return;
    }
    if (typeof window === 'undefined') {
      setPatchNotesChecked(true);
      return;
    }

    let lastSeenVersion = '';
    try {
      lastSeenVersion = window.localStorage.getItem(PATCH_NOTES_LAST_SEEN_STORAGE_KEY) ?? '';
    } catch {
      // Ignore localStorage failures.
    }

    if (shouldAutoOpenPatchNotes(lastSeenVersion, latestPatchNotes.version)) {
      setPatchNotesOpen(true);
    }
    setPatchNotesChecked(true);
  }, [guideStep, patchNotesChecked, snapshot]);

  useEffect(() => {
    if (!patchNotesOpen) {
      return;
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        closePatchNotes();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [patchNotesOpen]);

  const persistGuideSeen = (value: boolean) => {
    setGuideSeen(value);
    if (typeof window === 'undefined') {
      return;
    }
    try {
      window.localStorage.setItem(GUIDE_STORAGE_KEY, value ? 'true' : 'false');
    } catch {
      // Ignore localStorage failures.
    }
  };

  const closeGuide = (markSeen = true) => {
    setGuideStep(null);
    if (markSeen && !guideSeen) {
      persistGuideSeen(true);
    }
    if (snapshot?.hud.introOpen) {
      runtimeRef.current?.dispatch({ type: 'closeIntro' });
    }
  };

  const dispatch = (action: Parameters<GameRuntime['dispatch']>[0]) => {
    runtimeRef.current?.dispatch(action);
  };

  const openPatchNotes = () => {
    setPatchNotesOpen(true);
  };

  const closePatchNotes = () => {
    setPatchNotesOpen(false);
    markPatchNotesSeen();
  };

  const pickLandmarkAtPointer = (
    nextSnapshot: GameSnapshot,
    rect: DOMRect,
    clientX: number,
    clientY: number
  ) => {
    const radius = Math.max(24, Math.min(rect.width, rect.height) * 0.035);
    return nextSnapshot.hud.worldLandmarks.find((landmark) => {
      const point = getTileViewportPosition(nextSnapshot, rect.width, rect.height, landmark.tile);
      return Math.hypot(point.x - (clientX - rect.left), point.y - (clientY - rect.top)) <= radius;
    }) ?? null;
  };

  const handlePointerMove = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    const runtime = runtimeRef.current;
    const nextSnapshot = snapshot;
    if (!runtime || !nextSnapshot) {
      return;
    }
    const tile = pickTileAtCanvasPoint(
      nextSnapshot,
      event.currentTarget.getBoundingClientRect(),
      event.clientX,
      event.clientY
    );
    runtime.dispatch({ type: 'hoverTile', tile });
  };

  const handlePointerLeave = () => {
    runtimeRef.current?.dispatch({ type: 'hoverTile', tile: null });
  };

  const handlePointerDown = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    const runtime = runtimeRef.current;
    const nextSnapshot = snapshot;
    if (!runtime || !nextSnapshot || nextSnapshot.hud.introOpen || nextSnapshot.hud.showGlobalModifierDraft || nextSnapshot.hud.showSubclassDraft || guideStep !== null) {
      return;
    }

    const rect = event.currentTarget.getBoundingClientRect();
    runtime.dispatch(resolveBoardPointerAction(nextSnapshot, rect, event.clientX, event.clientY, pickLandmarkAtPointer));
  };

  const selectedDefender = snapshot?.hud.selectedDefender ?? null;
  const selectedSauna = snapshot?.hud.selectedSauna ?? null;
  const selectedEnemy = snapshot?.hud.selectedEnemy ?? null;
  const selectedLoot = snapshot?.hud.selectedInventoryEntry ?? null;
  const activePanel = snapshot?.hud.activePanel ?? null;
  const activeLandmark = snapshot?.hud.worldLandmarks.find((entry) => entry.selected) ?? null;
  const currentGuide = guideStep !== null ? GUIDE_STEPS[guideStep] : null;
  const introOpen = snapshot?.hud.introOpen ?? false;
  const showModifierDraft = snapshot?.hud.showGlobalModifierDraft ?? false;
  const showSubclassDraft = snapshot?.hud.showSubclassDraft ?? false;

  const rosterEntries = snapshot?.hud.rosterEntries ?? [];
  const readyEntries = rosterEntries.filter((entry) => entry.location === 'ready');
  const deathLogEntries = snapshot?.hud.deathLogEntries ?? [];
  const headerItemEntries = snapshot?.hud.headerItemEntries ?? [];
  const headerSkillEntries = snapshot?.hud.headerSkillEntries ?? [];
  const inventoryEntries = snapshot?.hud.inventoryEntries ?? [];
  const globalModifiers = snapshot?.hud.globalModifiers ?? [];
  const globalModifierSummary = snapshot?.hud.globalModifierSummary ?? [];
  const totalModifierPicks = globalModifiers.reduce((sum, modifier) => sum + modifier.pickCount, 0);
  const hintBody = snapshot ? compactHintBody(snapshot.hud.actionBody) : '';

  const renderLootRow = (title: string, entries: typeof headerItemEntries, emptyText: string) => (
    <section className="popup-section">
      <div className="section-head">
        <strong>{title}</strong>
        <span>{entries.length}</span>
      </div>
      {entries.length > 0 ? (
        <div className="loot-chip-grid">
          {entries.map((entry) => (
            <button
              key={entry.id}
              className={entry.selected ? 'loot-chip selected' : 'loot-chip'}
              onClick={() =>
                dispatch(
                  entry.selected
                    ? { type: 'clearSelectedInventoryDrop' }
                    : { type: 'selectInventoryDrop', dropId: entry.id }
                )
              }
            >
              <img src={assetUrl(entry.artPath)} alt={entry.name} className="loot-chip-art" />
              <div className="loot-chip-copy">
                <strong>{entry.name}</strong>
                <small>{entry.effectText}</small>
              </div>
              {entry.isRecent ? <span className="loot-pill">New</span> : null}
            </button>
          ))}
        </div>
      ) : (
        <p className="panel-copy small-copy">{emptyText}</p>
      )}
    </section>
  );

  const renderSelectedLootDetail = () => {
    if (!selectedLoot || !snapshot) {
      return null;
    }
    return (
      <section className="popup-section detail-shell">
        <div className="detail-card compact-detail-card">
          <img src={assetUrl(selectedLoot.artPath)} alt={selectedLoot.name} className="detail-art" />
          <div className="detail-copy">
            <strong>{selectedLoot.name} · {formatRarity(selectedLoot.rarity)}</strong>
            <p className="panel-copy flavor-copy small-copy">{selectedLoot.flavorText}</p>
            <p className="panel-copy small-copy">{selectedLoot.effectText}</p>
          </div>
        </div>
        <div className="button-row tight">
          <button
            className="mini-button"
            disabled={!snapshot.hud.canAutoAssignSelectedLoot}
            onClick={() => dispatch({ type: 'autoAssignInventoryDrop', dropId: selectedLoot.id })}
          >
            Auto Assign
          </button>
          <button
            className="mini-button"
            disabled={!selectedDefender}
            onClick={() =>
              selectedDefender &&
              dispatch({
                type: 'equipInventoryDrop',
                dropId: selectedLoot.id,
                defenderId: selectedDefender.id
              })
            }
          >
            Equip To Selected
          </button>
          <button
            className="ghost-button"
            onClick={() => dispatch({ type: 'sellInventoryDrop', dropId: selectedLoot.id })}
          >
            Sell For {selectedLoot.sellPrice} Steam
          </button>
          <button className="ghost-button" onClick={() => dispatch({ type: 'clearSelectedInventoryDrop' })}>
            Clear
          </button>
        </div>
      </section>
    );
  };

  const renderBenchStrip = () => {
    if (!snapshot || readyEntries.length === 0) {
      return null;
    }
    return (
      <aside className="bench-strip popup-card">
        <div className="popup-head compact-popup-head">
          <h2>Bench</h2>
          <span>{readyEntries.length} waiting</span>
        </div>
        <div className="bench-list">
          {readyEntries.map((entry) => (
            <div key={entry.id} className={entry.selected ? 'bench-card selected' : 'bench-card'}>
              <div className="unit-row-top">
                <strong>
                  {entry.name} <em>{entry.title}</em>
                </strong>
                <span className="mini-tag">Rerolls {entry.benchRerollCount}</span>
              </div>
              <small>{entry.summary}</small>
              <div className="mini-tag-row">
                <span className="mini-tag">HP {entry.hp}/{entry.maxHp}</span>
                <span className="mini-tag">ATK {entry.damage}</span>
                <span className="mini-tag">Kills {entry.kills}</span>
                {entry.heal > 0 ? <span className="mini-tag">Heal {entry.heal}</span> : null}
              </div>
              <div className="button-row tight">
                <button className="ghost-button small-ghost" onClick={() => dispatch({ type: 'selectDefender', defenderId: entry.id })}>
                  {entry.selected ? 'Selected' : 'Inspect'}
                </button>
                <button className="mini-button" onClick={() => dispatch({ type: 'rerollBenchDefender', defenderId: entry.id })}>
                  Reroll ({entry.benchRerollCost} SISU)
                </button>
              </div>
            </div>
          ))}
        </div>
      </aside>
    );
  };

  const renderSelectionCard = () => {
    if (!snapshot || (!selectedDefender && !selectedSauna && !selectedEnemy)) {
      return null;
    }
    return (
      <section className="selection-card popup-card">
        <div className="popup-head">
          <h2>{getSelectionCardTitle(Boolean(selectedSauna), selectedEnemy)}</h2>
          <button className="ghost-button small-ghost" onClick={() => dispatch({ type: 'clearSelection' })}>
            Close
          </button>
        </div>
        {selectedSauna ? (
          <>
            <strong>{selectedSauna.occupantName ? `${selectedSauna.occupantName} ${selectedSauna.occupantTitle}` : 'Sauna empty'}</strong>
            <small>{selectedSauna.occupantRole ?? 'No reserve hero inside.'}</small>
            {selectedSauna.occupantName ? (
              <>
                <div className="mini-tag-row">
                  <span className="mini-tag">HP {selectedSauna.occupantHp}/{selectedSauna.occupantMaxHp}</span>
                  <span className="mini-tag">{selectedSauna.autoDeployUnlocked ? 'Auto Deploy ready' : 'Auto Deploy locked'}</span>
                  <span className="mini-tag">{selectedSauna.slapSwapUnlocked ? 'Slap Swap ready' : 'Slap Swap locked'}</span>
                </div>
                <p className="panel-copy small-copy">{selectedSauna.occupantLore}</p>
              </>
            ) : (
              <p className="panel-copy small-copy">Send one board hero here during prep to create a reserve.</p>
            )}
          </>
        ) : selectedEnemy ? (
          <>
            <strong>
              {selectedEnemy.name}
              {selectedEnemy.bossLabel ? ` ${selectedEnemy.bossLabel}` : ''}
            </strong>
            <small>{selectedEnemy.behaviorLabel} · Threat {selectedEnemy.threat}</small>
            <p className="panel-copy small-copy">{selectedEnemy.description}</p>
            <p className="panel-copy flavor-copy small-copy">{selectedEnemy.lore}</p>
            <div className="mini-tag-row">
              <span className="mini-tag">HP {selectedEnemy.hp}/{selectedEnemy.maxHp}</span>
              <span className="mini-tag">ATK {selectedEnemy.damage}</span>
              <span className="mini-tag">Range {selectedEnemy.range}</span>
              <span className="mini-tag">Attack {formatCadence(selectedEnemy.attackCooldownMs)}</span>
              <span className="mini-tag">Move {formatCadence(selectedEnemy.moveCooldownMs)}</span>
              <span className="mini-tag">Threat {selectedEnemy.threat}</span>
            </div>
            {selectedEnemy.isBoss ? (
              <div className="popup-card">
                <strong>Boss Threat</strong>
                <small>{selectedEnemy.behaviorLabel}. This one deserves immediate attention.</small>
              </div>
            ) : (
              <p className="panel-copy small-copy">Inspection only. Clicking an enemy does not change targeting or combat commands.</p>
            )}
          </>
        ) : selectedDefender ? (
          <>
            <strong>
              {selectedDefender.name} <em>{selectedDefender.title}</em>
            </strong>
            <small>{selectedDefender.templateName} · {selectedDefender.subclassName} · {formatLocationLabel(selectedDefender.location)}</small>
            <p className="panel-copy small-copy">{selectedDefender.lore}</p>
            <div className="mini-tag-row">
              <span className="mini-tag">HP {selectedDefender.hp}/{selectedDefender.maxHp}</span>
              <span className="mini-tag">ATK {selectedDefender.damage}</span>
              <span className="mini-tag">Heal {selectedDefender.heal}</span>
              <span className="mini-tag">Range {selectedDefender.range}</span>
              <span className="mini-tag">DEF {selectedDefender.defense}</span>
              <span className="mini-tag">Regen {selectedDefender.regenHpPerSecond}/s</span>
              <span className="mini-tag">Kills {selectedDefender.kills}</span>
            </div>
            <p className="panel-copy small-copy">{selectedDefender.subclassDescription}</p>
            {selectedDefender.subclasses.length > 0 ? (
              <div className="popup-list">
                {selectedDefender.subclasses.map((subclass) => (
                  <div key={subclass.id} className="inventory-card subclass-card">
                    <div className="unit-row-top">
                      <strong>{subclass.name}</strong>
                      <small>Lvl {subclass.unlockLevel}</small>
                    </div>
                    <small>{subclass.effectText}</small>
                    <small>{subclass.statText}</small>
                  </div>
                ))}
              </div>
            ) : null}
            <div className="mini-tag-row">
              <span className="mini-tag">
                XP {selectedDefender.xp}
                {selectedDefender.nextLevelXp !== null ? ` / ${selectedDefender.nextLevelXp}` : ' · Max'}
              </span>
              <span className="mini-tag">Items {selectedDefender.items.length}/{selectedDefender.itemSlotCount}</span>
              <span className="mini-tag">Skills {selectedDefender.skills.length}/{selectedDefender.skillSlotCount}</span>
              {selectedDefender.blinkLabel ? <span className="mini-tag">{selectedDefender.blinkLabel}</span> : null}
              {selectedDefender.fireballLabel ? <span className="mini-tag">{selectedDefender.fireballLabel}</span> : null}
            </div>
            {(selectedDefender.items.length > 0 || selectedDefender.skills.length > 0) ? (
              <div className="popup-list">
                {selectedDefender.items.map((item) => (
                  <div key={item.id} className="popup-card loadout-row">
                    <span>{item.name}</span>
                    <button
                      className="ghost-button small-ghost"
                      onClick={() =>
                        dispatch({
                          type: 'destroyEquippedItem',
                          defenderId: selectedDefender.id,
                          itemId: item.id
                        })
                      }
                    >
                      Destroy
                    </button>
                  </div>
                ))}
                {selectedDefender.skills.map((skill) => (
                  <div key={skill.id} className="popup-card loadout-row">
                    <span>{skill.name}</span>
                    <button
                      className="ghost-button small-ghost"
                      onClick={() =>
                        dispatch({
                          type: 'destroyEquippedSkill',
                          defenderId: selectedDefender.id,
                          skillId: skill.id
                        })
                      }
                    >
                      Forget
                    </button>
                  </div>
                ))}
              </div>
            ) : null}
            {selectedDefender.location === 'board' && snapshot.state.phase === 'prep' && !snapshot.state.saunaDefenderId ? (
              <button
                className="mini-button"
                onClick={() => dispatch({ type: 'recallDefenderToSauna', defenderId: selectedDefender.id })}
              >
                Send To Sauna
              </button>
            ) : null}
          </>
        ) : null}
      </section>
    );
  };

  const renderPanelPopup = () => {
    if (!snapshot || !activePanel) {
      return null;
    }

    const popupStyle = (activePanel === 'beer_shop' || activePanel === 'metashop')
      ? getLandmarkPopupStyle(snapshot, frameSize, activeLandmark)
      : undefined;
    const popupClassName = (activePanel === 'beer_shop' || activePanel === 'metashop')
      ? 'board-popup board-popup-landmark'
      : 'board-popup board-popup-utility';

    let title = '';
    let subtitle = '';
    let content: ReactNode = null;

    if (activePanel === 'modifiers') {
      title = 'Global Modifiers';
      subtitle = globalModifiers.length > 0 ? `${globalModifiers.length} modifiers, ${totalModifierPicks} picks` : 'No active modifiers';
      content = (
        <div className="popup-scroll-stack">
          {globalModifierSummary.length > 0 ? (
            <section className="popup-section">
              <div className="mini-tag-row">
                {globalModifierSummary.map((entry) => (
                  <span key={entry.stat} className="mini-tag">{entry.label}</span>
                ))}
              </div>
            </section>
          ) : null}
          <section className="popup-section">
            {globalModifiers.length > 0 ? (
              <div className="popup-list">
                {globalModifiers.map((modifier) => (
                  <div key={modifier.id} className="popup-card modifier-card">
                    <strong>{modifier.name}</strong>
                    <small>{modifier.description}</small>
                    <small>{modifier.sourceLabel}</small>
                    <small>{modifier.formulaText}</small>
                    <div className="mini-tag-row">
                      <span className={`mini-tag rarity-tag rarity-${modifier.rarity}`}>{formatRarity(modifier.rarity)}</span>
                      <span className="mini-tag">{modifier.pickCount} picks</span>
                      <span className="mini-tag">{modifier.stackCount} live stacks</span>
                      <span className="mini-tag">{modifier.resolvedEffectText}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : <p className="panel-copy small-copy">First boss kill opens a three-card modifier draft.</p>}
          </section>
          <section className="popup-section">
            <div className="section-head">
              <strong>Death Log</strong>
              <span>{deathLogEntries.length}</span>
            </div>
            {deathLogEntries.length > 0 ? (
              <div className="popup-list">
                {deathLogEntries.map((entry) => (
                  <div key={entry.id} className="popup-card">
                    <strong>Wave {entry.wave}</strong>
                    <small>{entry.heroName}</small>
                    <small>{entry.text}</small>
                  </div>
                ))}
              </div>
            ) : <p className="panel-copy small-copy">No heroes have fallen this run.</p>}
          </section>
        </div>
      );
    } else if (activePanel === 'loot') {
      title = 'Loot And Stash';
      subtitle = snapshot.hud.inventoryUnlocked
        ? `Stash ${snapshot.hud.inventoryCount}/${snapshot.hud.inventoryCap}`
        : 'Overflow stash locked';
      content = (
        <div className="popup-scroll-stack">
          {(snapshot.hud.autoAssignUnlocked || snapshot.hud.autoUpgradeUnlocked) ? (
            <section className="popup-section">
              <div className="section-head">
                <strong>Automation</strong>
                <span>Loot QoL</span>
              </div>
              <div className="button-row tight">
                {snapshot.hud.autoAssignUnlocked ? (
                  <button
                    className={snapshot.hud.autoAssignEnabled ? 'secondary-button small-button' : 'ghost-button small-ghost'}
                    onClick={() => dispatch({ type: 'toggleAutoAssign' })}
                  >
                    {snapshot.hud.autoAssignEnabled ? 'Auto Assign On' : 'Auto Assign Off'}
                  </button>
                ) : null}
                {snapshot.hud.autoUpgradeUnlocked ? (
                  <button
                    className={snapshot.hud.autoUpgradeEnabled ? 'secondary-button small-button' : 'ghost-button small-ghost'}
                    onClick={() => dispatch({ type: 'toggleAutoUpgrade' })}
                  >
                    {snapshot.hud.autoUpgradeEnabled ? 'Auto Upgrade On' : 'Auto Upgrade Off'}
                  </button>
                ) : null}
              </div>
            </section>
          ) : null}
          {renderLootRow('Header Items', headerItemEntries, 'No item drops waiting in the header.')}
          {renderLootRow('Header Skills', headerSkillEntries, 'No skill drops waiting in the header.')}
          <section className="popup-section">
            <div className="section-head">
              <strong>Overflow Stash</strong>
              <span>{snapshot.hud.inventoryCount}/{snapshot.hud.inventoryCap}</span>
            </div>
            {snapshot.hud.inventoryUnlocked ? (
              inventoryEntries.length > 0 ? (
                <div className="loot-chip-grid">
                  {inventoryEntries.map((entry) => (
                    <button
                      key={entry.id}
                      className={entry.selected ? 'loot-chip selected' : 'loot-chip'}
                      onClick={() =>
                        dispatch(
                          entry.selected
                            ? { type: 'clearSelectedInventoryDrop' }
                            : { type: 'selectInventoryDrop', dropId: entry.id }
                        )
                      }
                    >
                      <img src={assetUrl(entry.artPath)} alt={entry.name} className="loot-chip-art" />
                      <div className="loot-chip-copy">
                        <strong>{entry.name}</strong>
                        <small>{entry.effectText}</small>
                      </div>
                      {entry.isRecent ? <span className="loot-pill">New</span> : null}
                    </button>
                  ))}
                </div>
              ) : <p className="panel-copy small-copy">No overflow loot stored.</p>
            ) : <p className="panel-copy small-copy">Buy the Overflow Stash upgrade from the metashop to keep extra loot.</p>}
          </section>
          {renderSelectedLootDetail()}
        </div>
      );
    } else if (activePanel === 'recruit') {
      title = 'Recruitment Market';
      subtitle = snapshot.hud.recruitmentStatusText;
      content = (
        <div className="popup-scroll-stack">
          <section className="popup-section">
            <div className="mini-tag-row">
              <span className="mini-tag">Board {snapshot.hud.boardCount}/{snapshot.hud.boardCap}</span>
              <span className="mini-tag">Bench {snapshot.hud.readyBenchCount}</span>
              <span className="mini-tag">SISU {snapshot.hud.sisu}</span>
              <span className="mini-tag">Recruit Lvl +{snapshot.hud.recruitLevelBonus}</span>
            </div>
            <p className="panel-copy small-copy">
              Targeted rerolls keep the main class and level, but reroll the hero identity and base attributes.
            </p>
            <div className="button-row tight">
              <button
                className="mini-button"
                disabled={!snapshot.hud.canRollRecruitOffers}
                onClick={() => dispatch({ type: 'rerollRecruitOffers' })}
              >
                {snapshot.hud.hasRecruitOffers ? 'Reroll 3 Offers' : 'Roll 3 Offers'} ({snapshot.hud.recruitRollCost} SISU)
              </button>
              <button
                className="secondary-button"
                disabled={!snapshot.hud.canLevelUpRecruitment}
                onClick={() => dispatch({ type: 'levelUpRecruitment' })}
              >
                Recruit Level Up ({snapshot.hud.recruitLevelUpCost} SISU)
              </button>
              {snapshot.hud.hasRecruitOffers ? (
                <button className="ghost-button" onClick={() => dispatch({ type: 'clearRecruitOffers' })}>
                  Clear Offers
                </button>
              ) : null}
            </div>
          </section>
          <section className="popup-section">
            <div className="section-head">
              <strong>Current Offers</strong>
              <span>{snapshot.hud.recruitOffers.length}</span>
            </div>
            {snapshot.hud.recruitOffers.length > 0 ? (
              <div className="popup-list">
                {snapshot.hud.recruitOffers.map((offer) => (
                  <div key={offer.id} className={`popup-card offer-card offer-${offer.quality}`}>
                    <div className="unit-row-top">
                      <strong>
                        {offer.name} <em>{offer.title}</em>
                      </strong>
                      <span className="mini-tag">{offer.quality}</span>
                    </div>
                    <small>{offer.roleName} · {offer.subclassName}</small>
                    <small>{offer.lore}</small>
                    <div className="mini-tag-row">
                      <span className="mini-tag">Lvl {offer.level}</span>
                      <span className="mini-tag">HP {offer.hp}</span>
                      <span className="mini-tag">ATK {offer.damage}</span>
                      <span className="mini-tag">Heal {offer.heal}</span>
                      <span className="mini-tag">Range {offer.range}</span>
                      <span className="mini-tag">Rerolls {offer.rerollCount}</span>
                    </div>
                    <div className="button-row tight">
                      <button className="mini-button" onClick={() => dispatch({ type: 'recruitOffer', offerId: offer.id })}>
                        Recruit For {offer.price} SISU
                      </button>
                      <button className="ghost-button small-ghost" onClick={() => dispatch({ type: 'rerollRecruitOffer', offerId: offer.id })}>
                        Reroll ({offer.rerollCost} SISU)
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : <p className="panel-copy small-copy">No candidates waiting. Roll the market to scout three new heroes.</p>}
          </section>
        </div>
      );
    } else if (activePanel === 'beer_shop') {
      title = 'Beer Shop';
      subtitle = activeLandmark?.statusText ?? 'Risky run-long booze with visible regret.';
      content = (
        <div className="popup-scroll-stack">
          <section className="popup-section">
            <div className="mini-tag-row">
              <span className="mini-tag">Steam {snapshot.hud.bankedSteam}</span>
              <span className="mini-tag">Shop Level {snapshot.hud.beerShopLevel}</span>
              <span className="mini-tag">Active {snapshot.hud.beerActiveSlotCount}/{snapshot.hud.beerActiveSlotCap}</span>
            </div>
          </section>
          <section className="popup-section">
            <div className="section-head">
              <strong>On Tap</strong>
              <span>{snapshot.hud.beerShopOffers.length}</span>
            </div>
            {snapshot.hud.beerShopOffers.length > 0 ? (
              <div className="popup-list">
                {snapshot.hud.beerShopOffers.map((offer) => (
                  <div key={offer.id} className="popup-card">
                    <div className="detail-card compact-detail-card">
                      <img src={assetUrl(offer.artPath)} alt={offer.name} className="detail-art small-detail-art" />
                      <div className="detail-copy">
                        <strong>{offer.name}</strong>
                        <small>{offer.flavorText}</small>
                        <small>{offer.positiveEffectText}</small>
                        <small>{offer.negativeEffectText}</small>
                      </div>
                    </div>
                    <button
                      className="mini-button"
                      disabled={!offer.canBuy}
                      onClick={() => dispatch({ type: 'buyBeerShopOffer', offerId: offer.id })}
                    >
                      {offer.purchaseLabel}
                    </button>
                  </div>
                ))}
              </div>
            ) : <p className="panel-copy small-copy">No drinks unlocked yet.</p>}
          </section>
          <section className="popup-section">
            <div className="section-head">
              <strong>Active Drinks</strong>
              <span>{snapshot.hud.activeAlcohols.length}</span>
            </div>
            {snapshot.hud.activeAlcohols.length > 0 ? (
              <div className="popup-list">
                {snapshot.hud.activeAlcohols.map((drink) => (
                  <div key={drink.alcoholId} className="popup-card">
                    <div className="detail-card compact-detail-card">
                      <img src={assetUrl(drink.artPath)} alt={drink.name} className="detail-art small-detail-art" />
                      <div className="detail-copy">
                        <strong>{drink.name}</strong>
                        <small>Stacks {drink.stacks}</small>
                        <small>{drink.positiveEffectText}</small>
                        <small>{drink.negativeEffectText}</small>
                      </div>
                    </div>
                    <button
                      className="ghost-button"
                      onClick={() => dispatch({ type: 'removeActiveAlcohol', alcoholId: drink.alcoholId })}
                    >
                      Dump Out
                    </button>
                  </div>
                ))}
              </div>
            ) : <p className="panel-copy small-copy">No active drinks. Buy one now and it applies immediately.</p>}
          </section>
        </div>
      );
    } else if (activePanel === 'metashop') {
      title = 'Metashop';
      subtitle = activeLandmark?.statusText ?? 'Permanent between-run upgrades.';
      content = (
        <div className="popup-scroll-stack">
          {!snapshot.hud.metaShopUnlocked ? (
            <section className="popup-section">
              <div className="popup-card">
                <strong>Grand Opening</strong>
                <small>Unlock the metashop once and keep it available in future runs.</small>
                <small>Cost {snapshot.hud.metaShopUnlockCost} Steam</small>
                <button
                  className="mini-button"
                  disabled={!snapshot.hud.canUnlockMetaShop || !snapshot.hud.showIntermission}
                  onClick={() => dispatch({ type: 'unlockMetaShop' })}
                >
                  {snapshot.hud.showIntermission ? 'Open The Shop' : 'Between Runs Only'}
                </button>
              </div>
            </section>
          ) : (
            <section className="popup-section">
              <div className="mini-tag-row">
                <span className="mini-tag">Banked Steam {snapshot.hud.bankedSteam}</span>
                <span className="mini-tag">{snapshot.hud.showIntermission ? 'Purchases enabled' : 'Between runs only'}</span>
              </div>
              <div className="popup-list">
                {snapshot.hud.metaUpgrades.map((upgrade) => (
                  <div key={upgrade.id} className="popup-card">
                    <div className="unit-row-top">
                      <strong>{upgrade.name}</strong>
                      <span className="mini-tag">Lvl {upgrade.level}</span>
                    </div>
                    <small>{upgrade.description}</small>
                    <button
                      className="mini-button"
                      disabled={!snapshot.hud.showIntermission || !upgrade.affordable || upgrade.maxed}
                      onClick={() => dispatch({ type: 'buyMetaUpgrade', upgradeId: upgrade.id })}
                    >
                      {upgrade.maxed ? 'Maxed' : `Buy${upgrade.cost !== null ? ` (${upgrade.cost} Steam)` : ''}`}
                    </button>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
      );
    }

    return (
      <section className={popupClassName} style={popupStyle}>
        <div className="popup-head">
          <div>
            <h2>{title}</h2>
            <p className="panel-copy small-copy">{subtitle}</p>
          </div>
          <button className="ghost-button small-ghost" onClick={() => dispatch({ type: 'closeHudPanel' })}>
            Close
          </button>
        </div>
        {content}
      </section>
    );
  };

  const utilityButtons: Array<{ id: HudPanelId; label: string; badge: string | null; disabled?: boolean }> = snapshot ? [
    { id: 'modifiers', label: 'Modifiers', badge: globalModifiers.length > 0 ? `${globalModifiers.length}` : null },
    {
      id: 'loot',
      label: snapshot.hud.inventoryUnlocked ? 'Loot / Stash' : 'Loot',
      badge: snapshot.hud.hasRecentLoot ? 'New' : (snapshot.hud.inventoryUnlocked ? `${snapshot.hud.inventoryCount}` : null)
    },
    { id: 'recruit', label: 'Recruit', badge: snapshot.hud.hasRecruitOffers ? `${snapshot.hud.recruitOffers.length}` : null, disabled: !snapshot.hud.canOpenRecruitment }
  ] : [];

  return (
    <main className="shell board-shell">
      <section className="board-stage">
        <div className="canvas-frame board-canvas-frame" ref={frameRef}>
          <canvas
            ref={canvasRef}
            className="battle-canvas"
            onPointerMove={handlePointerMove}
            onPointerLeave={handlePointerLeave}
            onPointerDown={handlePointerDown}
          />

          {snapshot ? (
            <>
            <header className="hud-topbar">
              <div className="hud-brand">
                <p className="eyebrow">Sauna Defense V2</p>
                <strong>{snapshot.hud.phaseLabel}</strong>
              </div>
              <div className="topbar-stats">
                <div className="topbar-stat">
                  <span>Wave</span>
                  <strong>{snapshot.hud.waveNumber}</strong>
                </div>
                <div className="topbar-stat">
                  <span>Board</span>
                  <strong>{snapshot.hud.placedBoardLabel}</strong>
                </div>
                <div className="topbar-stat">
                  <span>SISU</span>
                  <strong>{snapshot.hud.sisu}</strong>
                </div>
                <div className="topbar-stat">
                  <span>{snapshot.hud.showIntermission ? 'Steam Bank' : 'Steam'}</span>
                  <strong>{snapshot.hud.showIntermission ? snapshot.hud.bankedSteam : snapshot.hud.steamEarned}</strong>
                </div>
                <div className="topbar-stat">
                  <span>Sauna HP</span>
                  <strong>{snapshot.hud.saunaHp}/{snapshot.hud.maxSaunaHp}</strong>
                </div>
              </div>
              <div className="topbar-actions">
                <button className="ghost-button small-ghost" onClick={openPatchNotes}>
                  Patch Notes
                </button>
                <button
                  className="ghost-button small-ghost"
                  onClick={() => {
                    setGuideStep(null);
                    dispatch({ type: 'openIntro' });
                  }}
                >
                  Help
                </button>
                <button
                  className={snapshot.hud.isPaused ? 'secondary-button small-button' : 'ghost-button small-ghost'}
                  disabled={!snapshot.hud.canPause}
                  onClick={() => dispatch({ type: 'togglePause' })}
                >
                  {snapshot.hud.isPaused ? 'Resume' : 'Pause'}
                </button>
              </div>
            </header>

            <div className="hud-action-cluster">
              <div className="hud-status-card hud-hint-card">
                <div className="popup-head compact-popup-head">
                  <h2>{snapshot.hud.actionTitle}</h2>
                  <span>{snapshot.hud.bossName ?? snapshot.hud.nextWavePattern}</span>
                </div>
                <p className="panel-copy small-copy hint-copy">{hintBody}</p>
                <div className="mini-tag-row">
                  <span className="mini-tag">{snapshot.hud.nextWaveThreat}</span>
                  <span className="mini-tag">Bench {snapshot.hud.readyBenchCount}</span>
                  <span className="mini-tag">Recruit Slots {snapshot.hud.freeRecruitSlots}</span>
                </div>
              </div>
              <div className="hud-main-actions hud-action-buttons">
                {snapshot.hud.showIntermission ? (
                  <button className="primary-button" onClick={() => dispatch({ type: 'startNextRun' })}>
                    {snapshot.state.phase === 'lost' ? 'Start Next Run' : 'Back To The Sauna'}
                  </button>
                ) : (
                  <button
                    className="primary-button"
                    disabled={snapshot.state.phase !== 'prep' || snapshot.hud.boardCount === 0}
                    onClick={() => dispatch({ type: 'startWave' })}
                  >
                    Start Wave
                  </button>
                )}
                <button
                  className={snapshot.hud.autoplayEnabled ? 'secondary-button' : 'ghost-button'}
                  disabled={snapshot.hud.showIntermission}
                  onClick={() => dispatch({ type: 'toggleAutoplay' })}
                >
                  {snapshot.hud.autoplayEnabled ? 'Autoplay On' : 'Autoplay Off'}
                </button>
                <button
                  className="secondary-button"
                  disabled={!snapshot.hud.canUseSisu}
                  onClick={() => dispatch({ type: 'activateSisu' })}
                >
                  {snapshot.hud.sisuLabel}
                </button>
              </div>
            </div>

            <nav className="hud-utility-rail">
              {utilityButtons.map((button) => (
                <button
                  key={button.id}
                  className={activePanel === button.id ? 'utility-button active' : 'utility-button'}
                  disabled={button.disabled}
                  onClick={() => dispatch({ type: 'openHudPanel', panel: button.id })}
                >
                  <span>{button.label}</span>
                  {button.badge ? <small>{button.badge}</small> : null}
                </button>
              ))}
            </nav>

            {renderBenchStrip()}

            {snapshot.hud.worldLandmarks.map((landmark) => (
              <button
                key={landmark.id}
                className={landmark.selected ? 'landmark-chip selected' : 'landmark-chip'}
                style={getLandmarkStyle(snapshot, frameSize, landmark)}
                onClick={() => dispatch({ type: 'selectWorldLandmark', landmarkId: landmark.id })}
              >
                <strong>{landmark.label}</strong>
                <small>{landmark.badgeText}</small>
              </button>
            ))}

            {renderSelectionCard()}
            {renderPanelPopup()}
            <footer className="hud-footer-version">
              <span className="mini-tag">App {APP_VERSION}</span>
            </footer>
            </>
          ) : (
            <section className="boot-panel boot-overlay">
              <h2>Booting up the sauna...</h2>
              <p className="panel-copy">Creating the first endless roster run.</p>
            </section>
          )}
        </div>
      </section>

      {patchNotesOpen ? (
        <div
          className="overlay-shell patch-notes-shell"
          role="dialog"
          aria-modal="true"
          aria-labelledby="patch-notes-title"
          onClick={() => closePatchNotes()}
        >
          <section className="overlay-card patch-notes-card" onClick={(event) => event.stopPropagation()}>
            <div className="panel-head patch-notes-head">
              <div>
                <p className="eyebrow">Tuoreimmat kuulumiset</p>
                <h2 id="patch-notes-title">Patch Notes</h2>
                <p className="panel-copy small-copy">Pieni katsaus siihen, mikä tekee seuraavasta runista sujuvamman.</p>
              </div>
              <button className="ghost-button" onClick={closePatchNotes}>
                Sulje
              </button>
            </div>
            <div className="patch-notes-meta">
              <span className="version-badge">Versio {latestPatchNotes.version}</span>
              <span className="panel-copy small-copy">{formatPatchNotesDate(latestPatchNotes.date)}</span>
            </div>
            <div className="patch-notes-grid">
              <section className="inventory-card patch-notes-section">
                <h3>✨ Uutta</h3>
                <ul>
                  {latestPatchNotes.new.map((entry) => (
                    <li key={entry}>{entry}</li>
                  ))}
                </ul>
              </section>
              <section className="inventory-card patch-notes-section">
                <h3>🛠️ Parannettu</h3>
                <ul>
                  {latestPatchNotes.improved.map((entry) => (
                    <li key={entry}>{entry}</li>
                  ))}
                </ul>
              </section>
              <section className="inventory-card patch-notes-section">
                <h3>✅ Korjattu</h3>
                <ul>
                  {latestPatchNotes.fixed.map((entry) => (
                    <li key={entry}>{entry}</li>
                  ))}
                </ul>
              </section>
            </div>
            <div className="button-row">
              <button className="primary-button" onClick={closePatchNotes}>
                Jatka peliin
              </button>
            </div>
          </section>
        </div>
      ) : null}

      {snapshot && introOpen && guideStep === null ? (
        <div className="overlay-shell intro-shell">
          <section className="overlay-card intro-card">
            <div className="panel-head">
              <h2>Welcome To Sauna Defense</h2>
              <button className="ghost-button" onClick={() => dispatch({ type: 'closeIntro' })}>
                Skip
              </button>
            </div>
            <p className="panel-copy">One quick briefing, then the weird heat-defense begins.</p>
            <div className="intermission-grid intro-grid">
              <div className="inventory-card">
                <strong>Board First</strong>
                <small>The map is the main view now. Most info opens as small HUD popups instead of large permanent panels.</small>
              </div>
              <div className="inventory-card">
                <strong>Topbar + Utility Rail</strong>
                <small>The topbar tracks your run state, the bench sits on the left, and the right rail opens Modifiers, Loot and Recruit.</small>
              </div>
              <div className="inventory-card">
                <strong>Selection Lives On The Map</strong>
                <small>Click a hero or the sauna to inspect them in a small on-board popup without losing sight of the fight.</small>
              </div>
              <div className="inventory-card">
                <strong>Buildings Unlock On The Map</strong>
                <small>Shops and future upgrades can show up as map landmarks, so progression changes the board visually too.</small>
              </div>
            </div>
            <div className="button-row intermission-actions">
              <button className="secondary-button" onClick={() => setGuideStep(0)}>
                Replay Guided Tips
              </button>
              <button className="primary-button" onClick={() => dispatch({ type: 'closeIntro' })}>
                Start The Shift
              </button>
            </div>
          </section>
        </div>
      ) : null}

      {snapshot && currentGuide ? (
        <div className="overlay-shell guide-shell">
          <section className="overlay-card guide-card">
            <div className="panel-head">
              <h2>Quick Guided Tips</h2>
              <span>Step {guideStep! + 1}/{GUIDE_STEPS.length}</span>
            </div>
            <strong>{currentGuide.title}</strong>
            <p className="panel-copy">{currentGuide.body}</p>
            <div className="mini-tag-row">
              <span className="mini-tag">{snapshot.hud.placedBoardLabel}</span>
              <span className="mini-tag">SISU {snapshot.hud.sisu}</span>
              <span className="mini-tag">Sauna {snapshot.hud.saunaOccupancyLabel}</span>
            </div>
            <div className="button-row guide-actions">
              <button className="ghost-button" onClick={() => closeGuide(true)}>
                Skip Tips
              </button>
              {guideStep! > 0 ? (
                <button className="secondary-button" onClick={() => setGuideStep((step) => (step === null ? 0 : Math.max(0, step - 1)))}>
                  Back
                </button>
              ) : null}
              <button
                className="primary-button"
                onClick={() => {
                  if (guideStep === null || guideStep >= GUIDE_STEPS.length - 1) {
                    closeGuide(true);
                    return;
                  }
                  setGuideStep(guideStep + 1);
                }}
              >
                {guideStep === GUIDE_STEPS.length - 1 ? 'Done' : 'Next Tip'}
              </button>
            </div>
          </section>
        </div>
      ) : null}

      {snapshot && showModifierDraft ? (
        <div className="overlay-shell">
          <section className="overlay-card modifier-draft-card">
            <div className="panel-head">
              <h2>Boss Reward Draft</h2>
              <span>Choose one</span>
            </div>
            <p className="panel-copy">
              Pick one run-long modifier. Identity-heavy cards now care most about first names, titles and main classes.
            </p>
            <div className="modifier-draft-grid">
              {snapshot.hud.globalModifierDraftOffers.map((modifier, index) => (
                <div key={`${modifier.id}-${index}`} className="modifier-card draft-card">
                  <strong>{modifier.name}</strong>
                  <small>{modifier.description}</small>
                  <small>{modifier.sourceLabel}</small>
                  <small>{modifier.formulaText}</small>
                  <div className="mini-tag-row">
                    <span className={`mini-tag rarity-tag rarity-${modifier.rarity}`}>{formatRarity(modifier.rarity)}</span>
                    <span className="mini-tag">{modifier.ownedCount} owned</span>
                    <span className="mini-tag">{modifier.stackCount} stacks live</span>
                    <span className="mini-tag">{modifier.incrementText}</span>
                    <span className="mini-tag">{modifier.projectedEffectText}</span>
                  </div>
                  <button className="primary-button" onClick={() => dispatch({ type: 'draftGlobalModifier', modifierId: modifier.id })}>
                    Pick Modifier
                  </button>
                </div>
              ))}
            </div>
          </section>
        </div>
      ) : null}

      {snapshot && showSubclassDraft ? (
        <div className="overlay-shell">
          <section className="overlay-card">
            <div className="panel-head">
              <h2>Subclass Branch</h2>
              <span>
                {snapshot.hud.subclassDraftHeroName} {snapshot.hud.subclassDraftHeroTitle}
              </span>
            </div>
            <p className="panel-copy">
              Level {snapshot.hud.subclassDraftHeroLevel} unlocked a new branch. Pick one upgrade path before the run continues.
            </p>
            <div className="intermission-grid">
              {snapshot.hud.subclassDraftOffers.map((offer) => (
                <div key={offer.id} className="inventory-card">
                  <div>
                    <strong>{offer.name}</strong>
                    <small>Unlock level {offer.unlockLevel}</small>
                    <small>{offer.description}</small>
                    <small>{offer.effectText}</small>
                    <small>{offer.statText}</small>
                  </div>
                  <button className="mini-button" onClick={() => dispatch({ type: 'draftSubclassChoice', subclassId: offer.id })}>
                    Choose Branch
                  </button>
                </div>
              ))}
            </div>
          </section>
        </div>
      ) : null}
    </main>
  );
}
