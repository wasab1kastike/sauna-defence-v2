import type { InputAction } from '../../game/types';

interface IntroOverlayProps {
  dispatch: (action: InputAction) => void;
  onReplayTips: () => void;
}

export function IntroOverlay({ dispatch, onReplayTips }: IntroOverlayProps) {
  return (
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
            <strong>Topbar + Bottom Dock</strong>
            <small>The topbar tracks your run state, the bottom dock handles the four-slot recruit market, and the right rail keeps Modifiers and Loot close by.</small>
          </div>
          <div className="inventory-card">
            <strong>Sauna Is Your Reforge Slot</strong>
            <small>The sauna now acts as a single reserve slot and reroll station. Refresh and level up stay on Q/W, while E works only after you open the sauna.</small>
          </div>
          <div className="inventory-card">
            <strong>Buildings Unlock On The Map</strong>
            <small>Shops and future upgrades can show up as map landmarks, so progression changes the board visually too.</small>
          </div>
        </div>
        <div className="button-row intermission-actions">
          <button className="secondary-button" onClick={onReplayTips}>
            Replay Guided Tips
          </button>
          <button className="primary-button" onClick={() => dispatch({ type: 'closeIntro' })}>
            Start The Shift
          </button>
        </div>
      </section>
    </div>
  );
}
