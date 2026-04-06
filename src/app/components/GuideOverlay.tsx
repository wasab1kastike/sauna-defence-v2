import type { GameSnapshot } from '../../game/types';

interface GuideOverlayProps {
  currentGuide: { title: string; body: string };
  guideStep: number;
  totalSteps: number;
  snapshot: GameSnapshot;
  onBack: () => void;
  onClose: () => void;
  onNext: () => void;
}

export function GuideOverlay({
  currentGuide,
  guideStep,
  totalSteps,
  snapshot,
  onBack,
  onClose,
  onNext
}: GuideOverlayProps) {
  return (
    <div className="overlay-shell guide-shell">
      <section className="overlay-card guide-card">
        <div className="panel-head">
          <h2>Quick Guided Tips</h2>
          <span>Step {guideStep + 1}/{totalSteps}</span>
        </div>
        <strong>{currentGuide.title}</strong>
        <p className="panel-copy">{currentGuide.body}</p>
        <div className="mini-tag-row">
          <span className="mini-tag">{snapshot.hud.placedBoardLabel}</span>
          <span className="mini-tag">SISU {snapshot.hud.sisu}</span>
          <span className="mini-tag">Sauna {snapshot.hud.saunaOccupancyLabel}</span>
        </div>
        <div className="button-row guide-actions">
          <button className="ghost-button" onClick={onClose}>
            Skip Tips
          </button>
          {guideStep > 0 ? (
            <button className="secondary-button" onClick={onBack}>
              Back
            </button>
          ) : null}
          <button className="primary-button" onClick={onNext}>
            {guideStep === totalSteps - 1 ? 'Done' : 'Next Tip'}
          </button>
        </div>
      </section>
    </div>
  );
}
