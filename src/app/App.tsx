import { useEffect, useRef, useState } from 'react';
import type { PointerEvent as ReactPointerEvent } from 'react';

import { gameContent } from '../content/gameContent';
import { pickTileAtCanvasPoint } from '../game/render';
import { createGameRuntime } from '../game/runtime';
import type { GameRuntime, GameSnapshot, PlayerUnitId } from '../game/types';

const unitDescriptions: Record<PlayerUnitId, string> = {
  guardian: 'Eturivin kestävä puolustaja.',
  hurler: 'Heittää hiillosta kahden heksan päähän.',
  mender: 'Parantaa liittolaisia ja paikkaa rintamaa.'
};

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
      content: gameContent
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
      runtime.dispatch({ type: 'hoverTile', tile: null });
      return;
    }
    runtime.dispatch({ type: 'placeSelectedUnit', tile });
  };

  const selectedUnit =
    snapshot?.hud.unitButtons.find((button) => button.selected)?.id ?? null;

  return (
    <main className="shell">
      <section className="hero">
        <div className="hero-copy">
          <p className="eyebrow">Sauna Defense MVP</p>
          <h1>Pidä sauna lämpimänä kuuden aallon ajan.</h1>
          <p className="lede">
            Kevyt selainprototyyppi, jossa rakennat pienen puolustuksen, käynnistät aallot
            ja aktivoit SISUn oikealla hetkellä.
          </p>
        </div>
        <div className="status-card">
          <span>Tekninen suunta</span>
          <strong>React HUD + kevyt canvas-runtime</strong>
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
                  <h2>Tilanne</h2>
                  <span>{snapshot.hud.phaseLabel}</span>
                </div>
                <div className="metric-grid">
                  <div>
                    <span>Wave</span>
                    <strong>
                      {snapshot.hud.waveNumber}/{snapshot.hud.waveTotal}
                    </strong>
                  </div>
                  <div>
                    <span>Steam</span>
                    <strong>{snapshot.hud.steam}</strong>
                  </div>
                  <div>
                    <span>Sauna HP</span>
                    <strong>
                      {snapshot.hud.saunaHp}/{snapshot.hud.maxSaunaHp}
                    </strong>
                  </div>
                  <div>
                    <span>Enemies</span>
                    <strong>{snapshot.hud.enemiesRemaining}</strong>
                  </div>
                </div>
                <p className="panel-copy">{snapshot.hud.statusText}</p>
              </section>

              <section className="panel">
                <div className="panel-head">
                  <h2>Rekrytoi</h2>
                  <span>{selectedUnit ? 'Napauta heksaa sijoittaaksesi' : 'Valitse yksikkö'}</span>
                </div>
                <div className="button-stack">
                  {snapshot.hud.unitButtons.map((button) => (
                    <button
                      key={button.id}
                      className={button.selected ? 'unit-button selected' : 'unit-button'}
                      onClick={() => {
                        if (button.selected) {
                          runtimeRef.current?.dispatch({ type: 'clearSelection' });
                          return;
                        }
                        runtimeRef.current?.dispatch({
                          type: 'selectUnitType',
                          unitId: button.id
                        });
                      }}
                    >
                      <span>
                        {button.name} · {button.cost} steam
                      </span>
                      <small>{unitDescriptions[button.id]}</small>
                    </button>
                  ))}
                </div>
              </section>

              <section className="panel">
                <div className="panel-head">
                  <h2>Komennot</h2>
                  <span>{snapshot.hud.sisuLabel}</span>
                </div>
                <div className="button-row">
                  <button
                    className="primary-button"
                    disabled={!snapshot.hud.canStartWave}
                    onClick={() => runtimeRef.current?.dispatch({ type: 'startWave' })}
                  >
                    Käynnistä aalto
                  </button>
                  <button
                    className="secondary-button"
                    disabled={!snapshot.hud.canUseSisu}
                    onClick={() => runtimeRef.current?.dispatch({ type: 'activateSisu' })}
                  >
                    Aktivoi SISU
                  </button>
                </div>
                <button
                  className="ghost-button"
                  onClick={() => runtimeRef.current?.dispatch({ type: 'restartRun' })}
                >
                  Aloita sessio alusta
                </button>
              </section>

              <section className="panel">
                <div className="panel-head">
                  <h2>Seuraava aalto</h2>
                  <span>{snapshot.hud.canStartWave ? 'Ennuste' : 'Käynnissä'}</span>
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
              <h2>Käynnistetään...</h2>
              <p className="panel-copy">Runtime rakentaa kenttää ja ensimmäistä wavea.</p>
            </section>
          )}
        </aside>
      </section>
    </main>
  );
}
