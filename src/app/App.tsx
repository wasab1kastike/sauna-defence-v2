import { useEffect, useRef, useState } from 'react';
import type { PointerEvent as ReactPointerEvent } from 'react';

import { gameContent } from '../content/gameContent';
import { pickTileAtCanvasPoint } from '../game/render';
import { createGameRuntime } from '../game/runtime';
import type { GameRuntime, GameSnapshot } from '../game/types';

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

const GUIDE_STORAGE_KEY = 'sauna-defense-v2-guide-seen';
const GUIDE_STEPS = [
  {
    title: 'Board, Path, And Buildable Hexes',
    body: 'Dark tiles are the enemy path. When you select a bench hero, every valid build hex lights up bright green so you can place them fast.'
  },
  {
    title: 'Bench Heroes Can Join Mid-Wave',
    body: 'The bench is your live reserve. If a slot opens on the board, select a bench hero and drop them onto any green build hex, even during combat.'
  },
  {
    title: 'Sauna Holds One Reserve',
    body: 'Click the sauna in the center to inspect its reserve hero. Sauna upgrades can auto-deploy that hero or swap them in when someone gets badly hurt.'
  },
  {
    title: 'SISU Fuels Both Power And Recruitment',
    body: 'Spend SISU on the combat burst when you need a spike, or use it to scout and buy recruitment offers. The market works in prep, live waves, and pause.'
  },
  {
    title: 'Loot Lives In The Drawer',
    body: 'Open Loot from the header, inspect drops, use Auto Assign for quick gearing, or equip them to the hero you have selected.'
  }
] as const;

export function App() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const runtimeRef = useRef<GameRuntime | null>(null);
  const [snapshot, setSnapshot] = useState<GameSnapshot | null>(null);
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
    if (!snapshot || snapshot.hud.introOpen || snapshot.hud.showIntermission || guideSeen || guideStep !== null) {
      return;
    }
    setGuideStep(0);
  }, [guideSeen, guideStep, snapshot]);

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
    if (!runtime || !nextSnapshot || nextSnapshot.hud.introOpen || guideStep !== null) {
      return;
    }
    const tile = pickTileAtCanvasPoint(
      nextSnapshot,
      event.currentTarget.getBoundingClientRect(),
      event.clientX,
      event.clientY
    );
    if (!tile) {
      runtime.dispatch({ type: 'clearSelection' });
      return;
    }
    if (tile.q === 0 && tile.r === 0) {
      runtime.dispatch({ type: 'selectSauna' });
      return;
    }
    runtime.dispatch({ type: 'placeSelectedDefender', tile });
  };

  const selectedDefender = snapshot?.hud.selectedDefender ?? null;
  const selectedSauna = snapshot?.hud.selectedSauna ?? null;
  const selectedLoot = snapshot?.hud.selectedInventoryEntry ?? null;
  const isIntermission = snapshot?.hud.showIntermission ?? false;
  const isPaused = snapshot?.hud.isPaused ?? false;
  const introOpen = snapshot?.hud.introOpen ?? false;
  const inventoryOpen = snapshot?.hud.inventoryOpen ?? false;
  const recruitmentOpen = snapshot?.hud.recruitmentOpen ?? false;
  const hasRecentLoot = snapshot?.hud.hasRecentLoot ?? false;
  const anyDrawerOpen = inventoryOpen || recruitmentOpen;
  const currentGuide = guideStep !== null ? GUIDE_STEPS[guideStep] : null;
  const rosterEntries = snapshot?.hud.rosterEntries ?? [];
  const boardEntries = rosterEntries.filter((entry) => entry.location === 'board');
  const readyEntries = rosterEntries.filter((entry) => entry.location === 'ready');
  const deathLogEntries = snapshot?.hud.deathLogEntries ?? [];
  const openRecruitSlots = snapshot ? Math.max(0, snapshot.hud.rosterCap - snapshot.hud.rosterCount) : 0;
  const recruitReplacementName =
    openRecruitSlots <= 0
      ? selectedSauna?.occupantName ?? selectedDefender?.name ?? null
      : null;
  const nextWavePreview = snapshot?.hud.wavePreview ?? [];

  const renderRosterGroup = (
    title: string,
    entries: typeof rosterEntries,
    emptyText: string
  ) => (
    <div className="roster-group">
      <div className="group-head">
        <strong>{title}</strong>
        <span>{entries.length}</span>
      </div>
      {entries.length > 0 ? (
        <div className="button-stack roster-stack">
          {entries.map((entry) => (
            <div key={entry.id} className={entry.selected ? 'roster-card selected' : 'roster-card'}>
              <button
                className="unit-button"
                onClick={() => runtimeRef.current?.dispatch({ type: 'selectDefender', defenderId: entry.id })}
              >
                <div className="roster-name-row">
                  <span className="roster-name">
                    {entry.name} <em>{entry.title}</em>
                  </span>
                  <span className="role-badge">{entry.templateName}</span>
                </div>
                <small className="roster-role-copy">Level {entry.level} · {entry.subclassName} · {entry.roleSummary}</small>
                <div className="tag-row compact-tags">
                  <span className="tag">{entry.locationLabel}</span>
                  <span className="tag">Lvl {entry.level}</span>
                  <span className="tag">HP {entry.hp}/{entry.maxHp}</span>
                  <span className="tag">ATK {entry.damage}</span>
                  {entry.heal > 0 ? <span className="tag">Heal {entry.heal}</span> : null}
                  <span className="tag">Range {entry.range}</span>
                </div>
              </button>
            </div>
          ))}
        </div>
      ) : (
        <p className="panel-copy small-copy">{emptyText}</p>
      )}
    </div>
  );

  return (
    <main className="shell">
      <section className="hero compact-hero">
        <div className="hero-copy">
          <p className="eyebrow">Sauna Defense V2</p>
          <h1>Hold the sauna.</h1>
          <p className="hero-mini-copy">Bigger lanes, smaller UI, same weird heat.</p>
        </div>
      </section>

      <section className="playfield">
        <div className="arena-column">
          {snapshot ? (
            <>
              <section className="panel map-header-panel compact-header">
                <div className="run-strip">
                  <div className="run-stat-list">
                    <div className="run-stat">
                      <span>Wave</span>
                      <strong>{snapshot.hud.waveNumber}</strong>
                    </div>
                    <div className="run-stat">
                      <span>Board</span>
                      <strong>{snapshot.hud.placedBoardLabel}</strong>
                    </div>
                    <div className="run-stat">
                      <span>SISU</span>
                      <strong>{snapshot.hud.sisu}</strong>
                    </div>
                    <div className="run-stat">
                      <span>Steam</span>
                      <strong>{snapshot.hud.steamEarned}</strong>
                    </div>
                    <div className="run-stat">
                      <span>Sauna HP</span>
                      <strong>{snapshot.hud.saunaHp}/{snapshot.hud.maxSaunaHp}</strong>
                    </div>
                    <div className="run-stat">
                      <span>Sauna</span>
                      <strong>{snapshot.hud.saunaOccupancyLabel}</strong>
                    </div>
                  </div>
                  <div className="header-actions">
                    <button
                      className="ghost-button"
                      onClick={() => {
                        setGuideStep(null);
                        runtimeRef.current?.dispatch({ type: 'openIntro' });
                      }}
                    >
                      Help
                    </button>
                    <button
                      className={inventoryOpen ? 'secondary-button' : 'ghost-button'}
                      onClick={() => runtimeRef.current?.dispatch({ type: 'toggleInventory' })}
                    >
                      Loot {snapshot.hud.inventoryCount}/{snapshot.hud.inventoryCap}
                      {hasRecentLoot ? ' · New' : ''}
                    </button>
                    <button
                      className={recruitmentOpen ? 'secondary-button' : 'ghost-button'}
                      disabled={!snapshot.hud.canOpenRecruitment}
                      onClick={() => runtimeRef.current?.dispatch({ type: 'toggleRecruitment' })}
                    >
                      Recruit
                    </button>
                    <button
                      className={isPaused ? 'secondary-button' : 'ghost-button'}
                      disabled={!snapshot.hud.canPause}
                      onClick={() => runtimeRef.current?.dispatch({ type: 'togglePause' })}
                    >
                      {isPaused ? 'Resume' : 'Pause'}
                    </button>
                  </div>
                </div>
                <div className="tag-row compact-tags">
                  <span className="tag">{snapshot.hud.nextWaveThreat}</span>
                  <span className="tag">{snapshot.hud.nextWavePattern}</span>
                  <span className="tag">{snapshot.hud.placedBoardLabel}</span>
                  {snapshot.hud.pressureSignals.map((signal) => (
                    <span key={signal} className="tag warning-tag">{signal}</span>
                  ))}
                </div>
              </section>

              {recruitmentOpen ? (
                <section className="panel recruitment-drawer-panel">
                  <div className="panel-head">
                    <h2>Recruitment Market</h2>
                    <div className="header-actions">
                      <span>{openRecruitSlots > 0 ? `${openRecruitSlots} open slots` : 'Full roster'}</span>
                      <button
                        className="ghost-button"
                        onClick={() => runtimeRef.current?.dispatch({ type: 'toggleRecruitment' })}
                      >
                        Close
                      </button>
                    </div>
                  </div>
                  <div className="run-stat-list recruit-summary-list">
                    <div className="run-stat">
                      <span>Board</span>
                      <strong>{snapshot.hud.boardCount}</strong>
                    </div>
                    <div className="run-stat">
                      <span>Bench</span>
                      <strong>{snapshot.hud.readyBenchCount}</strong>
                    </div>
                    <div className="run-stat">
                      <span>Sauna</span>
                      <strong>{snapshot.hud.saunaOccupancyLabel}</strong>
                    </div>
                    <div className="run-stat">
                      <span>Free Slots</span>
                      <strong>{snapshot.hud.freeRecruitSlots}</strong>
                    </div>
                    <div className="run-stat">
                      <span>SISU</span>
                      <strong>{snapshot.hud.sisu}</strong>
                    </div>
                    <div className="run-stat">
                      <span>Scout Cost</span>
                      <strong>{snapshot.hud.recruitRollCost} SISU</strong>
                    </div>
                  </div>
                  <p className="panel-copy small-copy">{snapshot.hud.recruitmentStatusText}</p>
                  {openRecruitSlots <= 0 ? (
                    <div className="tag-row compact-tags">
                      <span className="tag">
                        {recruitReplacementName
                          ? `Replacing ${recruitReplacementName}`
                          : 'Select a roster hero or sauna reserve to replace'}
                      </span>
                    </div>
                  ) : null}
                  {snapshot.hud.hasRecruitOffers ? (
                    <div className="offer-list compact-offer-list">
                      {snapshot.hud.recruitOffers.map((offer) => (
                        <div key={offer.id} className={`offer-card offer-${offer.quality}`}>
                          <div className="offer-head">
                            <div>
                              <strong>{offer.name} <em>{offer.title}</em></strong>
                              <small>Level {offer.level} · {offer.subclassName} · {offer.roleName}</small>
                            </div>
                            <span className="tag">{offer.price} SISU</span>
                          </div>
                          <p className="panel-copy small-copy">{offer.roleSummary}</p>
                          <p className="panel-copy flavor-copy small-copy">{offer.lore}</p>
                          <div className="tag-row compact-tags">
                            <span className="tag">HP {offer.hp}</span>
                            <span className="tag">ATK {offer.damage}</span>
                            <span className="tag">Heal {offer.heal}</span>
                            <span className="tag">Range {offer.range}</span>
                          </div>
                          <button
                            className="mini-button"
                            disabled={snapshot.hud.sisu < offer.price || (openRecruitSlots <= 0 && !recruitReplacementName)}
                            onClick={() => runtimeRef.current?.dispatch({ type: 'recruitOffer', offerId: offer.id })}
                          >
                            {openRecruitSlots > 0
                              ? `Recruit For ${offer.price}`
                              : recruitReplacementName
                                ? `Replace For ${offer.price}`
                                : `Pick Replacement (${offer.price})`}
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="recruitment-empty">
                      <p className="panel-copy small-copy">
                        Scout three named weirdos at a time, compare prices and vibes, then recruit exactly one.
                      </p>
                      <div className="open-slot-list compact-offer-list">
                        {Array.from({ length: 3 }).map((_, index) => (
                          <div key={index} className="open-slot-card">
                            <strong>Offer Slot</strong>
                            <small>Scout candidates to fill this lane-holding vacancy.</small>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  <div className="button-row tight">
                    <button
                      className="secondary-button"
                      disabled={!snapshot.hud.canRollRecruitOffers}
                      onClick={() => runtimeRef.current?.dispatch({ type: 'rollRecruitOffers' })}
                    >
                      {snapshot.hud.hasRecruitOffers ? 'Refresh Offers' : 'Roll Offers'} ({snapshot.hud.recruitRollCost} SISU)
                    </button>
                    {snapshot.hud.hasRecruitOffers ? (
                      <button
                        className="ghost-button"
                        onClick={() => runtimeRef.current?.dispatch({ type: 'clearRecruitOffers' })}
                      >
                        Clear Offers
                      </button>
                    ) : null}
                  </div>
                </section>
              ) : null}
            </>
          ) : null}

          <div className="arena-stage">
            <div className="arena-left-rail">
              <section className="panel selected-panel selected-panel-compact">
                <div className="panel-head">
                  <h2>{selectedSauna ? 'Selected Sauna' : 'Selected Hero'}</h2>
                  <span>{selectedSauna ? selectedSauna.occupancyLabel : selectedDefender ? formatLocationLabel(selectedDefender.location) : 'No selection'}</span>
                </div>
                {selectedSauna ? (
                  <div className="detail-card hero-detail">
                    <div className="detail-copy">
                      <strong>Sauna Reserve</strong>
                      <small>Occupancy {selectedSauna.occupancyLabel}</small>
                      <p className="panel-copy flavor-copy small-copy">
                        {selectedSauna.occupantName
                          ? `${selectedSauna.occupantName} ${selectedSauna.occupantTitle} is warming up inside.`
                          : 'Nobody is inside right now.'}
                      </p>
                    </div>
                    {selectedSauna.occupantName ? (
                      <>
                        <div className="metric-grid compact compact-metrics">
                          <div>
                            <span>Hero</span>
                            <strong>{selectedSauna.occupantName}</strong>
                          </div>
                          <div>
                            <span>Role</span>
                            <strong>{selectedSauna.occupantRole}</strong>
                          </div>
                          <div>
                            <span>HP</span>
                            <strong>{selectedSauna.occupantHp}/{selectedSauna.occupantMaxHp}</strong>
                          </div>
                        </div>
                        <p className="panel-copy small-copy">{selectedSauna.occupantLore}</p>
                      </>
                    ) : null}
                    <div className="tag-row compact-tags">
                      <span className="tag">{selectedSauna.autoDeployUnlocked ? 'Auto Deploy armed' : 'Auto Deploy locked'}</span>
                      <span className="tag">{selectedSauna.slapSwapUnlocked ? 'Slap Swap armed' : 'Slap Swap locked'}</span>
                    </div>
                  </div>
                ) : selectedDefender ? (
                  <div className="detail-card hero-detail">
                    <div className="detail-copy">
                      <strong>
                        {selectedDefender.name} <em>{selectedDefender.title}</em>
                      </strong>
                      <small>Level {selectedDefender.level} · {selectedDefender.subclassName} · {selectedDefender.templateName}</small>
                      <p className="panel-copy flavor-copy small-copy">{selectedDefender.lore}</p>
                      <p className="panel-copy small-copy">{selectedDefender.subclassDescription}</p>
                    </div>
                    <div className="metric-grid compact compact-metrics">
                      <div>
                        <span>HP</span>
                        <strong>{selectedDefender.hp}/{selectedDefender.maxHp}</strong>
                      </div>
                      <div>
                        <span>ATK</span>
                        <strong>{selectedDefender.damage}</strong>
                      </div>
                      <div>
                        <span>Heal</span>
                        <strong>{selectedDefender.heal}</strong>
                      </div>
                      <div>
                        <span>Range</span>
                        <strong>{selectedDefender.range}</strong>
                      </div>
                    </div>
                    <p className="panel-copy small-copy">
                      Attack cooldown: {selectedDefender.attackCooldownMs} ms
                    </p>
                    <div className="tag-row compact-tags">
                      <span className="tag">
                        XP {selectedDefender.xp}
                        {selectedDefender.nextLevelXp !== null ? ` / ${selectedDefender.nextLevelXp}` : ' · Max'}
                      </span>
                      <span className="tag">Items {selectedDefender.itemNames.length}/{selectedDefender.itemSlotCount}</span>
                      <span className="tag">Skills {selectedDefender.skillNames.length}/{selectedDefender.skillSlotCount}</span>
                      {selectedDefender.itemNames.length === 0 && selectedDefender.skillNames.length === 0 ? (
                        <span className="tag loadout-tag">Empty loadout</span>
                      ) : null}
                    </div>
                    {(selectedDefender.itemNames.length > 0 || selectedDefender.skillNames.length > 0) ? (
                      <div className="tag-row compact-tags">
                        {selectedDefender.itemNames.map((name) => (
                          <span key={name} className="tag loadout-tag">{name}</span>
                        ))}
                        {selectedDefender.skillNames.map((name) => (
                          <span key={name} className="tag loadout-tag">{name}</span>
                        ))}
                      </div>
                    ) : null}
                    {selectedDefender.location === 'board' && snapshot?.state.phase === 'prep' && !snapshot?.state.saunaDefenderId ? (
                      <button
                        className="mini-button"
                        onClick={() =>
                          runtimeRef.current?.dispatch({ type: 'recallDefenderToSauna', defenderId: selectedDefender.id })
                        }
                      >
                        Send To Sauna
                      </button>
                    ) : null}
                  </div>
                ) : (
                  <p className="panel-copy small-copy">
                    Pick a hero or click the sauna to inspect reserves, stats and upgrades.
                  </p>
                )}
              </section>

              <section className="panel bench-panel">
                <div className="panel-head">
                  <h2>Bench Reserves</h2>
                  <span>{readyEntries.length}</span>
                </div>
                <p className="panel-copy small-copy">
                  Ready heroes waiting beside the board. Select one, then place them on a green build hex.
                </p>
                {renderRosterGroup('Bench Reserves', readyEntries, 'No recruited defenders waiting on the bench.')}
              </section>
            </div>

            <div className="canvas-frame">
              <canvas
                ref={canvasRef}
                className="battle-canvas"
                onPointerMove={handlePointerMove}
                onPointerLeave={handlePointerLeave}
                onPointerDown={handlePointerDown}
              />
              {selectedSauna ? (
                <div className="sauna-popup">
                  <div className="panel sauna-popup-card">
                    <div className="panel-head">
                      <h2>Sauna</h2>
                      <div className="header-actions">
                        <span>{selectedSauna.occupancyLabel}</span>
                        <button
                          className="ghost-button"
                          onClick={() => runtimeRef.current?.dispatch({ type: 'closeSaunaPopup' })}
                        >
                          Close
                        </button>
                      </div>
                    </div>
                    {selectedSauna.occupantName ? (
                      <>
                        <strong>
                          {selectedSauna.occupantName} <em>{selectedSauna.occupantTitle}</em>
                        </strong>
                        <small>{selectedSauna.occupantRole}</small>
                        <small>HP {selectedSauna.occupantHp}/{selectedSauna.occupantMaxHp}</small>
                        <p className="panel-copy small-copy">{selectedSauna.occupantLore}</p>
                      </>
                    ) : (
                      <p className="panel-copy small-copy">Sauna is empty. Send one board hero here during prep to create a reserve.</p>
                    )}
                    <div className="tag-row compact-tags">
                      <span className="tag">{selectedSauna.autoDeployUnlocked ? 'Auto Deploy ready' : 'Auto Deploy locked'}</span>
                      <span className="tag">{selectedSauna.slapSwapUnlocked ? 'Slap Swap ready' : 'Slap Swap locked'}</span>
                    </div>
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        </div>

        <aside className="sidebar action-rail">
          {snapshot ? (
            <>
              <section className="panel action-panel">
                <div className="panel-head">
                  <h2>{snapshot.hud.actionTitle}</h2>
                  <span>{snapshot.hud.phaseLabel}</span>
                </div>
                <p className="panel-copy">{snapshot.hud.actionBody}</p>
                <div className="tag-row compact-tags">
                  <span className="tag">{snapshot.hud.placedBoardLabel}</span>
                  <span className="tag">Bench {snapshot.hud.readyBenchCount}</span>
                  <span className="tag">Recruit Slots {snapshot.hud.freeRecruitSlots}</span>
                </div>
                <div className="button-stack">
                  <button
                    className="primary-button"
                    disabled={snapshot.state.phase !== 'prep' || snapshot.hud.boardCount === 0 || isIntermission}
                    onClick={() => runtimeRef.current?.dispatch({ type: 'startWave' })}
                  >
                    Start Wave
                  </button>
                  <button
                    className="secondary-button"
                    disabled={!snapshot.hud.canUseSisu}
                    onClick={() => runtimeRef.current?.dispatch({ type: 'activateSisu' })}
                  >
                    Activate SISU ({gameContent.config.sisuAbilityCost})
                  </button>
                </div>
                <div className="incoming-strip">
                  {nextWavePreview.map((entry) => (
                    <div key={entry.id} className="incoming-pill">
                      <span>{entry.name}</span>
                      <strong>{entry.count}</strong>
                    </div>
                  ))}
                </div>
              </section>

              <section className="panel">
                <div className="panel-head">
                  <h2>Roster: Owned Heroes</h2>
                  <span>{snapshot.hud.rosterCount} recruited</span>
                </div>
                <p className="panel-copy small-copy">
                  Boarded heroes only. Sauna occupants and bench reserves are handled next to the map.
                </p>
                {renderRosterGroup('On Board', boardEntries, 'No defenders on the board right now.')}
              </section>

              <section className="panel">
                <div className="panel-head">
                  <h2>Death Log</h2>
                  <span>{deathLogEntries.length}/5 shown</span>
                </div>
                {deathLogEntries.length > 0 ? (
                  <div className="button-stack roster-stack">
                    {deathLogEntries.map((entry) => (
                      <div key={entry.id} className="roster-card death-log-card">
                        <strong>Wave {entry.wave}</strong>
                        <small>{entry.heroName}</small>
                        <small>{entry.text}</small>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="panel-copy small-copy">No heroes have fallen this run.</p>
                )}
              </section>
            </>
          ) : (
            <section className="panel">
              <h2>Booting up the sauna...</h2>
              <p className="panel-copy">Creating the first endless roster run.</p>
            </section>
          )}
        </aside>
      </section>

      {snapshot && !isIntermission ? (
        <>
          <div
            className={anyDrawerOpen ? 'drawer-backdrop visible' : 'drawer-backdrop'}
            onClick={() =>
              runtimeRef.current?.dispatch(
                inventoryOpen
                  ? { type: 'toggleInventory' }
                  : recruitmentOpen
                    ? { type: 'toggleRecruitment' }
                    : { type: 'clearSelection' }
              )
            }
          />
          <aside className={inventoryOpen ? 'inventory-drawer open' : 'inventory-drawer'}>
            <section className="panel drawer-panel">
              <div className="panel-head">
                <h2>Inventory</h2>
                <div className="header-actions">
                  <span>{snapshot.hud.inventoryCount}/{snapshot.hud.inventoryCap}</span>
                  <button
                    className="ghost-button"
                    onClick={() => runtimeRef.current?.dispatch({ type: 'toggleInventory' })}
                  >
                    Close
                  </button>
                </div>
              </div>
              {snapshot.hud.inventoryEntries.length > 0 ? (
                <div className="drawer-body">
                  <div className="loot-grid compact-loot-grid">
                    {snapshot.hud.inventoryEntries.map((entry) => (
                      <button
                        key={entry.id}
                        className={entry.selected ? 'loot-card compact selected' : 'loot-card compact'}
                        onClick={() =>
                          runtimeRef.current?.dispatch(
                            entry.selected
                              ? { type: 'clearSelectedInventoryDrop' }
                              : { type: 'selectInventoryDrop', dropId: entry.id }
                          )
                        }
                      >
                        <img src={assetUrl(entry.artPath)} alt={entry.name} className="loot-art compact-art" />
                        <div className="loot-copy">
                          <span className="loot-name">{entry.name}</span>
                          <small>{formatRarity(entry.rarity)}</small>
                          <small>{entry.effectText}</small>
                        </div>
                        {entry.isRecent ? <span className="loot-ping">New</span> : null}
                      </button>
                    ))}
                  </div>

                  {selectedLoot ? (
                    <div className="detail-card loot-detail compact-detail">
                      <img src={assetUrl(selectedLoot.artPath)} alt={selectedLoot.name} className="detail-art compact-detail-art" />
                      <div className="detail-copy">
                        <strong>
                          {selectedLoot.name} · {formatRarity(selectedLoot.rarity)}
                        </strong>
                        <p className="panel-copy flavor-copy">{selectedLoot.flavorText}</p>
                        <p className="panel-copy small-copy">{selectedLoot.effectText}</p>
                      </div>
                      <div className="button-row tight">
                        <button
                          className="mini-button"
                          disabled={!snapshot.hud.canAutoAssignSelectedLoot}
                          onClick={() =>
                            runtimeRef.current?.dispatch({
                              type: 'autoAssignInventoryDrop',
                              dropId: selectedLoot.id
                            })
                          }
                        >
                          Auto Assign
                        </button>
                        <button
                          className="mini-button"
                          disabled={!selectedDefender}
                          onClick={() =>
                            selectedDefender &&
                            runtimeRef.current?.dispatch({
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
                          onClick={() => runtimeRef.current?.dispatch({ type: 'clearSelectedInventoryDrop' })}
                        >
                          Close Loot
                        </button>
                      </div>
                    </div>
                  ) : (
                    <p className="panel-copy small-copy">
                      Pick a loot card to inspect it, auto-assign it, or equip it to the currently selected hero.
                    </p>
                  )}
                </div>
              ) : (
                <p className="panel-copy">No loot waiting. Fresh drops will appear here.</p>
              )}
            </section>
          </aside>
        </>
      ) : null}

      {snapshot && introOpen && guideStep === null ? (
        <div className="overlay-shell intro-shell">
          <section className="overlay-card intro-card">
            <div className="panel-head">
              <h2>Welcome To Sauna Defense</h2>
              <button
                className="ghost-button"
                onClick={() => runtimeRef.current?.dispatch({ type: 'closeIntro' })}
              >
                Skip
              </button>
            </div>
            <p className="panel-copy">
              One quick briefing, then the weird heat-defense begins.
            </p>
            <div className="intermission-grid intro-grid">
              <div className="inventory-card">
                <strong>Board, Bench, Sauna</strong>
                <small>Board heroes fight, bench heroes wait, and one reserve hero can recover in the sauna.</small>
              </div>
              <div className="inventory-card">
                <strong>SISU Does Two Jobs</strong>
                <small>Spend SISU on combat bursts or scout recruitment offers between waves.</small>
              </div>
              <div className="inventory-card">
                <strong>Loot Needs A Home</strong>
                <small>Open Loot, inspect drops, auto-assign them, or equip them to a selected hero.</small>
              </div>
              <div className="inventory-card">
                <strong>Runs Build In Cycles</strong>
                <small>Normal waves chain forward, bosses create a break, and the metashop only appears between runs.</small>
              </div>
            </div>
            <div className="button-row intermission-actions">
              <button
                className="secondary-button"
                onClick={() => setGuideStep(0)}
              >
                Replay Guided Tips
              </button>
              <button
                className="primary-button"
                onClick={() => runtimeRef.current?.dispatch({ type: 'closeIntro' })}
              >
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
            <div className="tag-row compact-tags">
              <span className="tag">{snapshot.hud.placedBoardLabel}</span>
              <span className="tag">SISU {snapshot.hud.sisu}</span>
              <span className="tag">Sauna {snapshot.hud.saunaOccupancyLabel}</span>
            </div>
            <div className="button-row guide-actions">
              <button
                className="ghost-button"
                onClick={() => closeGuide(true)}
              >
                Skip Tips
              </button>
              {guideStep! > 0 ? (
                <button
                  className="secondary-button"
                  onClick={() => setGuideStep((step) => (step === null ? 0 : Math.max(0, step - 1)))}
                >
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

      {snapshot && isIntermission ? (
        <div className="overlay-shell">
          <section className="overlay-card">
            <div className="panel-head">
              <h2>{snapshot.state.phase === 'lost' ? 'Steam Intermission' : 'Between Runs'}</h2>
              <span>{snapshot.hud.bankedSteam} Steam banked</span>
            </div>
            <p className="panel-copy">
              {snapshot.state.phase === 'lost'
                ? snapshot.hud.metaShopUnlocked
                  ? 'The last shift ended in steam and regret. Spend what you banked, then start the next run stronger.'
                  : 'Your first run unlocked the lobby. Pay once to open the metashop for future runs.'
                : snapshot.hud.metaShopUnlocked
                  ? 'Metashop only appears between runs now. Buy what you need, then head back to the heat.'
                  : 'No metashop before the first run. Once you survive a shift, you can pay to open it permanently.'}
            </p>
            {snapshot.hud.metaShopUnlocked ? (
              <div className="intermission-grid">
                {snapshot.hud.metaUpgrades.map((upgrade) => (
                  <div key={upgrade.id} className="inventory-card">
                    <div>
                      <strong>{upgrade.name}</strong>
                      <small>{upgrade.description}</small>
                      <small>
                        Level {upgrade.level}
                        {upgrade.maxed ? ' · MAX' : ` · Cost ${upgrade.cost}`}
                      </small>
                    </div>
                    <button
                      className="mini-button"
                      disabled={!upgrade.affordable || upgrade.maxed}
                      onClick={() => runtimeRef.current?.dispatch({ type: 'buyMetaUpgrade', upgradeId: upgrade.id })}
                    >
                      Buy Upgrade
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="inventory-card unlock-card">
                <div>
                  <strong>Grand Opening</strong>
                  <small>Unlock the metashop once and keep it available in future intermissions.</small>
                  <small>Cost {snapshot.hud.metaShopUnlockCost} Steam</small>
                </div>
                <button
                  className="mini-button"
                  disabled={!snapshot.hud.canUnlockMetaShop}
                  onClick={() => runtimeRef.current?.dispatch({ type: 'unlockMetaShop' })}
                >
                  Open The Shop
                </button>
              </div>
            )}
            <div className="button-row intermission-actions">
              <button
                className="primary-button"
                onClick={() => runtimeRef.current?.dispatch({ type: 'startNextRun' })}
              >
                {snapshot.state.phase === 'lost' ? 'Start Next Run' : 'Back To The Sauna'}
              </button>
            </div>
          </section>
        </div>
      ) : null}
    </main>
  );
}
