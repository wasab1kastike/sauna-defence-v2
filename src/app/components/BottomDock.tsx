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

  const liveOfferCount = snapshot.hud.recruitOffers.filter(Boolean).length;
  const saunaStatus = snapshot.hud.saunaOccupantName
    ? `Sauna occupied by ${snapshot.hud.saunaOccupantName}`
    : 'Sauna empty';

  return (
    <section className="bottom-dock popup-card">
      <div className="dock-head">
        <div>
          <h2>Recruit Market</h2>
          <p className="panel-copy small-copy">{snapshot.hud.recruitmentStatusText}</p>
        </div>
        <span>{liveOfferCount}/4 slots</span>
      </div>
      <div className="mini-tag-row">
        <span className="mini-tag">{saunaStatus}</span>
        <span className="mini-tag">Recruit Lvl +{snapshot.hud.recruitLevelBonus}</span>
        <span className="mini-tag">SISU {snapshot.hud.sisu}</span>
      </div>
      <div className="button-row market-actions-inline">
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
      <RecruitOfferSlots offers={snapshot.hud.recruitOffers} dispatch={dispatch} />
    </section>
  );
}
