import { useCallback, useEffect, useRef, useState } from 'react';
import type { PointerEvent as ReactPointerEvent, ReactNode, WheelEvent as ReactWheelEvent } from 'react';

import { latestPatchNotes } from '../content/patchNotes';
import { gameContent } from '../content/gameContent';
import { getTileViewportPosition, pickTileAtCanvasPoint } from '../game/render';
import { clampBoardCamera, DEFAULT_BOARD_CAMERA } from '../game/render/layout';
import { createGameRuntime, STORAGE_KEY_PREFIX } from '../game/runtime';
import { APP_VERSION } from '../game/version';
import { BottomDock } from './components/BottomDock';
import { GuideOverlay } from './components/GuideOverlay';
import { HudUtilityRail } from './components/HudUtilityRail';
import { IntroOverlay } from './components/IntroOverlay';
import { PatchNotesOverlay } from './components/PatchNotesOverlay';
import { SelectionCard } from './components/SelectionCard';
import {
  assetUrl,
  compactHintBody,
  formatRarity,
  getHudUtilityButtons,
  getLandmarkPopupStyle,
  GUIDE_STEPS,
  resolveBoardPointerAction,
  resolveGameplayHotkeyAction,
  shouldAutoOpenPatchNotes
} from './uiHelpers';
import type {
  BoardCamera,
  GameRuntime,
  GameSnapshot
} from '../game/types';

const GUIDE_STORAGE_KEY = `${STORAGE_KEY_PREFIX}-guide-seen`;
const PATCH_NOTES_LAST_SEEN_STORAGE_KEY = `${STORAGE_KEY_PREFIX}-last-seen-patch-notes`;

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
  const [boardCamera, setBoardCamera] = useState<BoardCamera>(DEFAULT_BOARD_CAMERA);
  const bottomDockRef = useRef<HTMLElement | null>(null);
  const [bottomDockHeight, setBottomDockHeight] = useState(0);
  const panStateRef = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    camera: BoardCamera;
  } | null>(null);

  const markPatchNotesSeen = useCallback(() => {
    if (typeof window === 'undefined') {
      return;
    }
    try {
      window.localStorage.setItem(PATCH_NOTES_LAST_SEEN_STORAGE_KEY, latestPatchNotes.version);
    } catch {
      // Ignore localStorage failures.
    }
  }, []);

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
    runtimeRef.current?.setBoardCamera(boardCamera);
  }, [boardCamera]);

  useEffect(() => {
    const dock = bottomDockRef.current;
    if (!dock) {
      setBottomDockHeight(0);
      return;
    }

    const update = () => {
      setBottomDockHeight(dock.getBoundingClientRect().height);
    };

    update();
    if (typeof ResizeObserver === 'undefined') {
      window.addEventListener('resize', update);
      return () => window.removeEventListener('resize', update);
    }

    const observer = new ResizeObserver(() => update());
    observer.observe(dock);
    return () => observer.disconnect();
  }, [snapshot?.hud.showIntermission]);

  const getBoardCameraSafeArea = (nextSnapshot: GameSnapshot | null) => ({
    topInset: 18,
    bottomInset: nextSnapshot && !nextSnapshot.hud.showIntermission ? bottomDockHeight + 28 : 18
  });

  useEffect(() => {
    if (!snapshot || frameSize.width <= 0 || frameSize.height <= 0) {
      return;
    }
    setBoardCamera((camera) => {
      const clamped = clampBoardCamera(
        camera,
        frameSize.width,
        frameSize.height,
        snapshot.config.gridRadius,
        getBoardCameraSafeArea(snapshot)
      );
      return clamped.zoom === camera.zoom && clamped.offsetX === camera.offsetX && clamped.offsetY === camera.offsetY
        ? camera
        : clamped;
    });
  }, [bottomDockHeight, frameSize.height, frameSize.width, snapshot, snapshot?.config.gridRadius]);

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
        setPatchNotesOpen(false);
        markPatchNotesSeen();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [markPatchNotesSeen, patchNotesOpen]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const action = resolveGameplayHotkeyAction(snapshot, event.key, {
        guideStepActive: guideStep !== null,
        patchNotesOpen
      });
      if (!action) {
        return;
      }
      event.preventDefault();
      runtimeRef.current?.dispatch(action);
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [guideStep, patchNotesOpen, snapshot]);

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
    if (action.type === 'startNextRun' || action.type === 'restartRun') {
      setBoardCamera(DEFAULT_BOARD_CAMERA);
    }
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
      const point = getTileViewportPosition(nextSnapshot, rect.width, rect.height, landmark.tile, boardCamera);
      return Math.hypot(point.x - (clientX - rect.left), point.y - (clientY - rect.top)) <= radius;
    }) ?? null;
  };

  const handlePointerMove = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    const runtime = runtimeRef.current;
    const nextSnapshot = snapshot;
    if (!runtime || !nextSnapshot) {
      return;
    }
    const panState = panStateRef.current;
    if (panState && panState.pointerId === event.pointerId) {
      const rect = event.currentTarget.getBoundingClientRect();
      setBoardCamera(clampBoardCamera({
        zoom: panState.camera.zoom,
        offsetX: panState.camera.offsetX + (event.clientX - panState.startX),
        offsetY: panState.camera.offsetY + (event.clientY - panState.startY)
      }, rect.width, rect.height, nextSnapshot.config.gridRadius, getBoardCameraSafeArea(nextSnapshot)));
      runtime.dispatch({ type: 'hoverTile', tile: null });
      return;
    }
    const tile = pickTileAtCanvasPoint(
      nextSnapshot,
      event.currentTarget.getBoundingClientRect(),
      event.clientX,
      event.clientY,
      boardCamera
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
    if (event.button === 2) {
      panStateRef.current = {
        pointerId: event.pointerId,
        startX: event.clientX,
        startY: event.clientY,
        camera: boardCamera
      };
      event.currentTarget.setPointerCapture(event.pointerId);
      event.preventDefault();
      runtime.dispatch({ type: 'hoverTile', tile: null });
      return;
    }
    if (event.button !== 0) {
      return;
    }

    const rect = event.currentTarget.getBoundingClientRect();
    runtime.dispatch(resolveBoardPointerAction(nextSnapshot, rect, event.clientX, event.clientY, boardCamera, pickLandmarkAtPointer));
  };

  const handlePointerUp = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    if (panStateRef.current?.pointerId !== event.pointerId) {
      return;
    }
    event.currentTarget.releasePointerCapture(event.pointerId);
    panStateRef.current = null;
  };

  const handlePointerCancel = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    if (panStateRef.current?.pointerId === event.pointerId) {
      panStateRef.current = null;
    }
  };

  const handleBoardWheel = (event: ReactWheelEvent<HTMLCanvasElement>) => {
    const nextSnapshot = snapshot;
    if (!nextSnapshot) {
      return;
    }
    const rect = event.currentTarget.getBoundingClientRect();
    const pointerX = event.clientX - rect.left;
    const pointerY = event.clientY - rect.top;
    const zoomFactor = event.deltaY < 0 ? 1.12 : 1 / 1.12;
    const nextZoom = Math.min(1.9, Math.max(0.75, boardCamera.zoom * zoomFactor));
    const scaleRatio = nextZoom / boardCamera.zoom;
    const localX = pointerX - rect.width / 2 - boardCamera.offsetX;
    const localY = pointerY - rect.height / 2 - boardCamera.offsetY;

    event.preventDefault();
    setBoardCamera(clampBoardCamera({
      zoom: nextZoom,
      offsetX: pointerX - rect.width / 2 - localX * scaleRatio,
      offsetY: pointerY - rect.height / 2 - localY * scaleRatio
    }, rect.width, rect.height, nextSnapshot.config.gridRadius, getBoardCameraSafeArea(nextSnapshot)));
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
            <strong>{selectedLoot.name} Â· {formatRarity(selectedLoot.rarity)}</strong>
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

  const renderBottomDock = () => {
    if (!snapshot) {
      return null;
    }
    return <BottomDock snapshot={snapshot} dispatch={dispatch} dockRef={bottomDockRef} />;
  };

  const renderSelectionCard = () => {
    if (!snapshot) {
      return null;
    }
    return (
      <SelectionCard
        selectedDefender={selectedDefender}
        selectedSauna={selectedSauna}
        selectedEnemy={selectedEnemy}
        dispatch={dispatch}
      />
    );
  };

  const renderPanelPopup = () => {
    if (!snapshot || !activePanel) {
      return null;
    }
    if (activePanel === 'recruit') {
      return null;
    }

    const popupStyle = (activePanel === 'beer_shop' || activePanel === 'metashop')
      ? getLandmarkPopupStyle(snapshot, frameSize, activeLandmark, boardCamera)
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
            ) : <p className="panel-copy small-copy">Buy the Overflow Stash upgrade from the Sauna Kiosk to keep extra loot.</p>}
          </section>
          {renderSelectedLootDetail()}
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
      title = 'Sauna Kiosk';
      subtitle = activeLandmark?.statusText ?? 'Endless between-run progression with softcaps instead of hard endings.';
      const metaSections = [
        { id: 'core', label: 'Core' },
        { id: 'loot', label: 'Loot' },
        { id: 'sauna', label: 'Sauna' },
        { id: 'beer_shop', label: 'Beer Shop' }
      ].map((section) => ({
        ...section,
        upgrades: snapshot.hud.metaUpgrades.filter((upgrade) => snapshot.metaUpgrades[upgrade.id].section === section.id)
      })).filter((section) => section.upgrades.length > 0);
      const activeTitleMastery = snapshot.hud.titleMasteries.find((entry) => entry.active) ?? null;
      const activeSurnameMastery = snapshot.hud.surnameMasteries.find((entry) => entry.active) ?? null;
      content = (
        <div className="popup-scroll-stack">
          {!snapshot.hud.metaShopUnlocked ? (
            <section className="popup-section">
              <div className="popup-card">
                <strong>Grand Opening</strong>
                <small>Unlock the Sauna Kiosk once and keep it available in future runs.</small>
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
            <>
              <section className="popup-section">
                <div className="mini-tag-row">
                  <span className="mini-tag">Banked Steam {snapshot.hud.bankedSteam}</span>
                  <span className="mini-tag">{snapshot.hud.showIntermission ? 'Purchases enabled' : 'Between runs only'}</span>
                  <span className="mini-tag">Repeatables keep scaling after softcap</span>
                  <span className="mini-tag">Title focus {activeTitleMastery?.name ?? 'None'}</span>
                  <span className="mini-tag">Surname focus {activeSurnameMastery?.name ?? 'None'}</span>
                </div>
                <p className="panel-copy small-copy">
                  Repeatables never truly max out. Old caps now act as softcaps: costs keep climbing and gains arrive more slowly,
                  while one-shot utility unlocks still finish normally. Name Masteries let you invest in one active title line
                  and one active surname line at a time.
                </p>
              </section>
              {metaSections.map((section) => (
                <section className="popup-section" key={section.id}>
                  <div className="section-head">
                    <strong>{section.label}</strong>
                    <span>{section.upgrades.length}</span>
                  </div>
                  <div className="popup-list">
                    {section.upgrades.map((upgrade) => (
                      <div key={upgrade.id} className="popup-card">
                        <div className="unit-row-top">
                          <strong>{upgrade.name}</strong>
                          <div className="mini-tag-row">
                            <span className="mini-tag">Lvl {upgrade.level}</span>
                            {upgrade.repeatable ? <span className="mini-tag">Repeatable</span> : null}
                            {upgrade.softcapReached ? <span className="mini-tag">Softcap reached</span> : null}
                          </div>
                        </div>
                        <small>{upgrade.description}</small>
                        {upgrade.nextEffectText ? <small>{upgrade.nextEffectText}</small> : null}
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
              ))}
              <section className="popup-section">
                <div className="section-head">
                  <strong>Name Masteries</strong>
                  <span>{snapshot.hud.titleMasteries.length + snapshot.hud.surnameMasteries.length}</span>
                </div>
                <div className="mastery-columns">
                  <div className="popup-list">
                    <div className="section-head">
                      <strong>Titles</strong>
                      <span>{activeTitleMastery?.name ?? 'No focus'}</span>
                    </div>
                    {snapshot.hud.titleMasteries.map((mastery) => (
                      <div key={mastery.id} className="popup-card">
                        <div className="unit-row-top">
                          <strong>{mastery.name}</strong>
                          <div className="mini-tag-row">
                            <span className="mini-tag">Rank {mastery.level}</span>
                            {mastery.active ? <span className="mini-tag">Active</span> : null}
                            {mastery.softcapReached ? <span className="mini-tag">Softcap reached</span> : null}
                          </div>
                        </div>
                        <small>{mastery.description}</small>
                        <small>{mastery.effectText}</small>
                        {mastery.nextEffectText ? <small>{mastery.nextEffectText}</small> : null}
                        <div className="button-row">
                          <button
                            className={mastery.active ? 'ghost-button small-ghost' : 'mini-button'}
                            disabled={!snapshot.hud.showIntermission || !mastery.canActivate || mastery.active}
                            onClick={() => dispatch({ type: 'setActiveNameMastery', masteryId: mastery.id })}
                          >
                            {mastery.active ? 'Active' : 'Set Active'}
                          </button>
                          <button
                            className="mini-button"
                            disabled={!snapshot.hud.showIntermission || !mastery.affordable}
                            onClick={() => dispatch({ type: 'buyNameMasteryRank', masteryId: mastery.id })}
                          >
                            {`Upgrade (${mastery.cost ?? 0} Steam)`}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="popup-list">
                    <div className="section-head">
                      <strong>Surnames</strong>
                      <span>{activeSurnameMastery?.name ?? 'No focus'}</span>
                    </div>
                    {snapshot.hud.surnameMasteries.map((mastery) => (
                      <div key={mastery.id} className="popup-card">
                        <div className="unit-row-top">
                          <strong>{mastery.name}</strong>
                          <div className="mini-tag-row">
                            <span className="mini-tag">Rank {mastery.level}</span>
                            {mastery.active ? <span className="mini-tag">Active</span> : null}
                            {mastery.softcapReached ? <span className="mini-tag">Softcap reached</span> : null}
                          </div>
                        </div>
                        <small>{mastery.description}</small>
                        <small>{mastery.effectText}</small>
                        {mastery.nextEffectText ? <small>{mastery.nextEffectText}</small> : null}
                        <div className="button-row">
                          <button
                            className={mastery.active ? 'ghost-button small-ghost' : 'mini-button'}
                            disabled={!snapshot.hud.showIntermission || !mastery.canActivate || mastery.active}
                            onClick={() => dispatch({ type: 'setActiveNameMastery', masteryId: mastery.id })}
                          >
                            {mastery.active ? 'Active' : 'Set Active'}
                          </button>
                          <button
                            className="mini-button"
                            disabled={!snapshot.hud.showIntermission || !mastery.affordable}
                            onClick={() => dispatch({ type: 'buyNameMasteryRank', masteryId: mastery.id })}
                          >
                            {`Upgrade (${mastery.cost ?? 0} Steam)`}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </section>
            </>
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

  const utilityButtons = getHudUtilityButtons(snapshot, globalModifiers.length);

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
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerCancel}
            onContextMenu={(event) => event.preventDefault()}
            onWheel={handleBoardWheel}
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
                  {snapshot.hud.bossMomentumLabel ? <span className="mini-tag">Horde {snapshot.hud.bossMomentumLabel}</span> : null}
                  {snapshot.hud.bossMomentumTierLabel ? <span className="mini-tag">{snapshot.hud.bossMomentumTierLabel}</span> : null}
                  {snapshot.hud.pebbleBottlesRemainingLabel ? <span className="mini-tag">Bottles {snapshot.hud.pebbleBottlesRemainingLabel}</span> : null}
                  {snapshot.hud.pebbleBottleStacksLabel ? <span className="mini-tag">Bottle Stacks {snapshot.hud.pebbleBottleStacksLabel}</span> : null}
                  <span className="mini-tag">Sauna {snapshot.hud.saunaOccupancyLabel}</span>
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

            <HudUtilityRail activePanel={activePanel} buttons={utilityButtons} dispatch={dispatch} />

            {renderBottomDock()}

            {renderSelectionCard()}
            {renderPanelPopup()}
            <footer className="hud-footer-version">
              <span className="build-badge">v{APP_VERSION}</span>
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

      {patchNotesOpen ? <PatchNotesOverlay onClose={closePatchNotes} /> : null}
      {snapshot && introOpen && guideStep === null ? (
        <IntroOverlay dispatch={dispatch} onReplayTips={() => setGuideStep(0)} />
      ) : null}
      {snapshot && currentGuide && guideStep !== null ? (
        <GuideOverlay
          currentGuide={currentGuide}
          guideStep={guideStep}
          totalSteps={GUIDE_STEPS.length}
          snapshot={snapshot}
          onBack={() => setGuideStep((step) => (step === null ? 0 : Math.max(0, step - 1)))}
          onClose={() => closeGuide(true)}
          onNext={() => {
            if (guideStep >= GUIDE_STEPS.length - 1) {
              closeGuide(true);
              return;
            }
            setGuideStep(guideStep + 1);
          }}
        />
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
