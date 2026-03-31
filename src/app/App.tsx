import { useEffect, useRef, useState } from 'react';
import type { PointerEvent as ReactPointerEvent } from 'react';

import { gameContent } from '../content/gameContent';
import { pickTileAtCanvasPoint } from '../game/render';
import { createGameRuntime } from '../game/runtime';
import type { GameRuntime, GameSnapshot } from '../game/types';

function formatRarity(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

export function App() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const runtimeRef = useRef<GameRuntime | null>(null);
  const [snapshot, setSnapshot] = useState<GameSnapshot | null>(null);

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
    if (!runtime || !nextSnapshot) {
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
    runtime.dispatch({ type: 'placeSelectedDefender', tile });
  };

  const selectedDefender = snapshot?.hud.selectedDefender;

  return (
    <main className="shell">
      <section className="hero">
        <div className="hero-copy">
          <p className="eyebrow">Sauna Defense V2</p>
          <h1>Endless loyly defense with weird hero names, loot and meta upgrades.</h1>
          <p className="lede">
            Build a tiny named roster, keep one defender warming in the sauna, gamble new recruits with
            SISU and try to survive long enough to cash out Steam for the next run.
          </p>
        </div>
        <div className="status-card">
          <span>Live Build</span>
          <strong>Endless roster run</strong>
          <small>{snapshot?.hud.isBossWave ? 'Boss pressure incoming' : 'Regular wave cadence'}</small>
        </div>
      </section>

      <section className="playfield">
        <div className="canvas-frame">
          <canvas
            ref={canvasRef}
            className="battle-canvas"
            onPointerMove={handlePointerMove}
            onPointerLeave={handlePointerLeave}
            onPointerDown={handlePointerDown}
          />
        </div>

        <aside className="sidebar">
          {snapshot ? (
            <>
              <section className="panel">
                <div className="panel-head">
                  <h2>Run Status</h2>
                  <span>{snapshot.hud.phaseLabel}</span>
                </div>
                <div className="metric-grid">
                  <div>
                    <span>Wave</span>
                    <strong>{snapshot.hud.waveNumber}</strong>
                  </div>
                  <div>
                    <span>SISU</span>
                    <strong>{snapshot.hud.sisu}</strong>
                  </div>
                  <div>
                    <span>Steam</span>
                    <strong>{snapshot.hud.steamEarned}</strong>
                  </div>
                  <div>
                    <span>Sauna HP</span>
                    <strong>
                      {snapshot.hud.saunaHp}/{snapshot.hud.maxSaunaHp}
                    </strong>
                  </div>
                </div>
                <div className="metric-grid compact">
                  <div>
                    <span>Board</span>
                    <strong>
                      {snapshot.hud.boardCount}/{snapshot.hud.boardCap}
                    </strong>
                  </div>
                  <div>
                    <span>Roster</span>
                    <strong>
                      {snapshot.hud.rosterCount}/{snapshot.hud.rosterCap}
                    </strong>
                  </div>
                  <div>
                    <span>Inventory</span>
                    <strong>
                      {snapshot.hud.inventoryCount}/{snapshot.hud.inventoryCap}
                    </strong>
                  </div>
                  <div>
                    <span>Enemies</span>
                    <strong>{snapshot.hud.enemiesRemaining}</strong>
                  </div>
                </div>
                <p className="panel-copy">{snapshot.hud.statusText}</p>
                <p className="panel-copy muted-line">
                  Sauna slot: {snapshot.hud.saunaOccupantName ?? 'Empty'}
                </p>
              </section>

              <section className="panel">
                <div className="panel-head">
                  <h2>Commands</h2>
                  <span>{snapshot.hud.sisuLabel}</span>
                </div>
                <div className="button-stack">
                  <button
                    className="primary-button"
                    disabled={snapshot.state.phase !== 'prep' || snapshot.hud.boardCount === 0}
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
                  <button
                    className="secondary-button"
                    disabled={!snapshot.hud.canRecruit}
                    onClick={() => runtimeRef.current?.dispatch({ type: 'gambleRecruit' })}
                  >
                    Gamble Recruit ({snapshot.hud.recruitCost} SISU)
                  </button>
                </div>
                <button
                  className="ghost-button"
                  onClick={() => runtimeRef.current?.dispatch({ type: 'restartRun' })}
                >
                  Start Fresh Run
                </button>
              </section>

              <section className="panel">
                <div className="panel-head">
                  <h2>Roster</h2>
                  <span>4 board + 1 sauna</span>
                </div>
                <div className="button-stack roster-stack">
                  {snapshot.hud.rosterEntries.map((entry) => (
                    <div key={entry.id} className={entry.selected ? 'roster-card selected' : 'roster-card'}>
                      <button
                        className="unit-button"
                        onClick={() => runtimeRef.current?.dispatch({ type: 'selectDefender', defenderId: entry.id })}
                      >
                        <span>
                          {entry.name} <em>{entry.title}</em>
                        </span>
                        <small>{entry.templateName}</small>
                        <small>{entry.summary}</small>
                        <small>
                          HP {entry.hp}/{entry.maxHp}
                        </small>
                      </button>
                      {entry.location === 'board' && snapshot.state.phase === 'prep' && !snapshot.state.saunaDefenderId ? (
                        <button
                          className="mini-button"
                          onClick={() =>
                            runtimeRef.current?.dispatch({ type: 'recallDefenderToSauna', defenderId: entry.id })
                          }
                        >
                          Send To Sauna
                        </button>
                      ) : null}
                    </div>
                  ))}
                </div>
              </section>

              <section className="panel">
                <div className="panel-head">
                  <h2>Selected</h2>
                  <span>{selectedDefender ? selectedDefender.location : 'No hero selected'}</span>
                </div>
                {selectedDefender ? (
                  <div className="selected-card">
                    <strong>
                      {selectedDefender.name} <em>{selectedDefender.title}</em>
                    </strong>
                    <p className="panel-copy">{selectedDefender.templateName}</p>
                    <div className="metric-grid compact">
                      <div>
                        <span>HP</span>
                        <strong>
                          {selectedDefender.hp}/{selectedDefender.maxHp}
                        </strong>
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
                    <div className="tag-row">
                      <span className="tag">Items {selectedDefender.itemNames.length}/{selectedDefender.itemSlotCount}</span>
                      <span className="tag">Skills {selectedDefender.skillNames.length}/{selectedDefender.skillSlotCount}</span>
                    </div>
                    <ul className="token-list">
                      {selectedDefender.itemNames.map((name) => (
                        <li key={name}>{name}</li>
                      ))}
                      {selectedDefender.skillNames.map((name) => (
                        <li key={name}>{name}</li>
                      ))}
                      {selectedDefender.itemNames.length === 0 && selectedDefender.skillNames.length === 0 ? (
                        <li>Empty loadout</li>
                      ) : null}
                    </ul>
                  </div>
                ) : (
                  <p className="panel-copy">Select a defender to place them, equip loot or send them to the sauna.</p>
                )}
              </section>

              <section className="panel">
                <div className="panel-head">
                  <h2>Loot Inventory</h2>
                  <span>{snapshot.hud.inventoryCount} stored</span>
                </div>
                <div className="button-stack">
                  {snapshot.hud.inventoryEntries.length > 0 ? (
                    snapshot.hud.inventoryEntries.map((entry) => (
                      <div key={entry.id} className={entry.isRecent ? 'inventory-card recent' : 'inventory-card'}>
                        <div>
                          <strong>
                            {entry.name} · {formatRarity(entry.rarity)}
                          </strong>
                          <small>
                            {entry.kind} from wave {entry.waveFound}
                          </small>
                          <small>{entry.description}</small>
                        </div>
                        <div className="button-row tight">
                          <button
                            className="mini-button"
                            disabled={!selectedDefender}
                            onClick={() =>
                              selectedDefender &&
                              runtimeRef.current?.dispatch({
                                type: 'equipInventoryDrop',
                                dropId: entry.id,
                                defenderId: selectedDefender.id
                              })
                            }
                          >
                            Equip To Selected
                          </button>
                          {entry.isRecent ? (
                            <button
                              className="mini-button ghostish"
                              onClick={() => runtimeRef.current?.dispatch({ type: 'dismissRecentDrop' })}
                            >
                              Clear Ping
                            </button>
                          ) : null}
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="panel-copy">Drops auto-pick up here. Equip them immediately or save them for later.</p>
                  )}
                </div>
              </section>

              <section className="panel">
                <div className="panel-head">
                  <h2>Next Wave</h2>
                  <span>{snapshot.hud.isBossWave ? 'Boss' : 'Forecast'}</span>
                </div>
                <ul className="wave-list">
                  {snapshot.hud.wavePreview.map((entry) => (
                    <li key={entry.id}>
                      <span>{entry.name}</span>
                      <strong>{entry.count}</strong>
                    </li>
                  ))}
                </ul>
              </section>

              {snapshot.state.phase === 'lost' ? (
                <section className="panel meta-panel">
                  <div className="panel-head">
                    <h2>Meta Shop</h2>
                    <span>{snapshot.state.meta.steam} Steam banked</span>
                  </div>
                  <div className="button-stack">
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
                          onClick={() =>
                            runtimeRef.current?.dispatch({ type: 'buyMetaUpgrade', upgradeId: upgrade.id })
                          }
                        >
                          Buy Upgrade
                        </button>
                      </div>
                    ))}
                  </div>
                </section>
              ) : null}
            </>
          ) : (
            <section className="panel">
              <h2>Booting up the sauna...</h2>
              <p className="panel-copy">Creating the first endless roster run.</p>
            </section>
          )}
        </aside>
      </section>
    </main>
  );
}
