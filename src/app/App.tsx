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

  const selectedDefender = snapshot?.hud.selectedDefender ?? null;
  const selectedLoot = snapshot?.hud.selectedInventoryEntry ?? null;
  const isIntermission = snapshot?.hud.showIntermission ?? false;
  const isPaused = snapshot?.hud.isPaused ?? false;

  return (
    <main className="shell">
      <section className="hero compact-hero">
        <div className="hero-copy">
          <p className="eyebrow">Sauna Defense V2</p>
          <h1>Pause, loot, regroup, then throw the next weird hero into the heat.</h1>
          <p className="lede">
            Survive chain waves, freeze combat when loot decisions matter, and spend Steam only between
            runs while the next cursed sauna crew waits outside.
          </p>
        </div>
        <div className="status-card">
          <span>Run Mode</span>
          <strong>
            {isIntermission ? 'Intermission' : isPaused ? 'Paused' : snapshot?.hud.isBossWave ? 'Boss pressure' : 'Live combat'}
          </strong>
          <small>{snapshot?.hud.nextWavePattern ?? 'Booting sauna logic'}</small>
        </div>
      </section>

      <section className="playfield">
        <div className="arena-column">
          <section className="panel loot-dock">
            <div className="panel-head">
              <h2>Loot Dock</h2>
              <span>{snapshot?.hud.inventoryCount ?? 0}/{snapshot?.hud.inventoryCap ?? 0}</span>
            </div>
            {snapshot && snapshot.hud.inventoryEntries.length > 0 ? (
              <div className="loot-grid">
                {snapshot.hud.inventoryEntries.map((entry) => (
                  <button
                    key={entry.id}
                    className={entry.selected ? 'loot-card selected' : 'loot-card'}
                    onClick={() =>
                      runtimeRef.current?.dispatch(
                        entry.selected
                          ? { type: 'clearSelectedInventoryDrop' }
                          : { type: 'selectInventoryDrop', dropId: entry.id }
                      )
                    }
                  >
                    <img src={assetUrl(entry.artPath)} alt={entry.name} className="loot-art" />
                    <span className="loot-name">{entry.name}</span>
                    <small>{formatRarity(entry.rarity)}</small>
                    {entry.isRecent ? <span className="loot-ping">New</span> : null}
                  </button>
                ))}
              </div>
            ) : (
              <p className="panel-copy">
                No loot waiting. New drops land here, and pause lets you think before equipping them.
              </p>
            )}
          </section>

          <div className="canvas-frame">
            <canvas
              ref={canvasRef}
              className="battle-canvas"
              onPointerMove={handlePointerMove}
              onPointerLeave={handlePointerLeave}
              onPointerDown={handlePointerDown}
            />
          </div>
        </div>

        <aside className="sidebar action-rail">
          {snapshot ? (
            <>
              <section className="panel run-panel">
                <div className="panel-head">
                  <h2>Run Header</h2>
                  <button
                    className={isPaused ? 'secondary-button' : 'ghost-button'}
                    disabled={!snapshot.hud.canPause}
                    onClick={() => runtimeRef.current?.dispatch({ type: 'togglePause' })}
                  >
                    {isPaused ? 'Resume' : 'Pause'}
                  </button>
                </div>
                <div className="metric-grid compact">
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
                    <strong>{snapshot.hud.saunaHp}/{snapshot.hud.maxSaunaHp}</strong>
                  </div>
                </div>
                <div className="tag-row">
                  <span className="tag">{snapshot.hud.nextWaveThreat}</span>
                  <span className="tag">{snapshot.hud.nextWavePattern}</span>
                  {snapshot.hud.pressureSignals.map((signal) => (
                    <span key={signal} className="tag warning-tag">{signal}</span>
                  ))}
                </div>
              </section>

              <section className="panel action-panel">
                <div className="panel-head">
                  <h2>{snapshot.hud.actionTitle}</h2>
                  <span>{snapshot.hud.phaseLabel}</span>
                </div>
                <p className="panel-copy">{snapshot.hud.actionBody}</p>
                {selectedLoot ? (
                  <div className="detail-card loot-detail">
                    <img src={assetUrl(selectedLoot.artPath)} alt={selectedLoot.name} className="detail-art" />
                    <div className="detail-copy">
                      <strong>
                        {selectedLoot.name} · {formatRarity(selectedLoot.rarity)}
                      </strong>
                      <p className="panel-copy flavor-copy">{selectedLoot.flavorText}</p>
                      <p className="panel-copy small-copy">{selectedLoot.effectText}</p>
                    </div>
                    <div className="button-row">
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
                ) : null}
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
                  <button
                    className="secondary-button"
                    disabled={!snapshot.hud.canRecruit}
                    onClick={() => runtimeRef.current?.dispatch({ type: 'gambleRecruit' })}
                  >
                    Gamble Recruit ({snapshot.hud.recruitCost} SISU)
                  </button>
                  <button
                    className="ghost-button"
                    onClick={() => runtimeRef.current?.dispatch({ type: 'restartRun' })}
                  >
                    Reset Run
                  </button>
                </div>
              </section>

              <section className="panel selected-panel">
                <div className="panel-head">
                  <h2>Selected Hero</h2>
                  <span>{selectedDefender ? selectedDefender.location : 'No hero selected'}</span>
                </div>
                {selectedDefender ? (
                  <div className="detail-card hero-detail">
                    <div className="detail-copy">
                      <strong>
                        {selectedDefender.name} <em>{selectedDefender.title}</em>
                      </strong>
                      <small>{selectedDefender.templateName}</small>
                      <p className="panel-copy flavor-copy">{selectedDefender.lore}</p>
                    </div>
                    <div className="metric-grid compact">
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
                    {selectedDefender.location === 'board' && snapshot.state.phase === 'prep' && !snapshot.state.saunaDefenderId ? (
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
                  <p className="panel-copy">
                    Pick a hero to inspect their stats, lore, loadout and sauna actions.
                  </p>
                )}
              </section>

              <section className="panel">
                <div className="panel-head">
                  <h2>Roster</h2>
                  <span>{snapshot.hud.rosterCount}/{snapshot.hud.rosterCap}</span>
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
                        <small>HP {entry.hp}/{entry.maxHp}</small>
                      </button>
                    </div>
                  ))}
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
            </>
          ) : (
            <section className="panel">
              <h2>Booting up the sauna...</h2>
              <p className="panel-copy">Creating the first endless roster run.</p>
            </section>
          )}
        </aside>
      </section>

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
