import type { GameSnapshot, InputAction } from '../../game/types';
import { RecruitOfferSlots } from './RecruitOfferSlots';

interface BottomDockProps {
  snapshot: GameSnapshot;
  dispatch: (action: InputAction) => void;
}

export function BottomDock({ snapshot, dispatch }: BottomDockProps) {
  if (snapshot.hud.showIntermission) {
    return null;
  }

  return (
    <section className="bottom-dock popup-card">
      <div className="dock-head">
        <div>
          <h2>Recruit Market</h2>
          <p className="panel-copy small-copy">{snapshot.hud.recruitmentStatusText}</p>
        </div>
        <span>{snapshot.hud.freeRecruitSlots}/4 live slots</span>
      </div>

      <div className="button-row tight market-actions">
        <button
          className="mini-button"
          disabled={!snapshot.hud.canRollRecruitOffers}
          onClick={() => dispatch({ type: 'rerollRecruitOffers' })}
        >
          Refresh (Q - {snapshot.hud.recruitRollCost} SISU)
        </button>
        <button
          className="secondary-button"
          disabled={!snapshot.hud.canLevelUpRecruitment}
          onClick={() => dispatch({ type: 'levelUpRecruitment' })}
        >
          Level Up (W - {snapshot.hud.recruitLevelUpCost} SISU)
        </button>
      </div>

      <RecruitOfferSlots offers={snapshot.hud.recruitOffers} dispatch={dispatch} className="market-row market-row-four" />
    </section>
  );
}
