import type { GameSnapshot, InputAction } from '../../game/types';

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

      <div className="market-row market-row-four">
        {snapshot.hud.recruitOffers.map((offer) => (
          <div
            key={`recruit-slot-${offer.slotIndex}`}
            className={offer.empty ? 'market-card market-card-empty' : `market-card offer-${offer.quality ?? 'rough'}`}
          >
            <div className="unit-row-top">
              <strong>
                {offer.empty ? 'Empty Slot' : `${offer.name} `}
                {!offer.empty && offer.title ? <em>{offer.title}</em> : null}
              </strong>
              {offer.hotkeyKey ? <span className="hotkey-pill">{offer.hotkeyKey}</span> : null}
            </div>

            {offer.empty ? (
              <p className="panel-copy small-copy">Bought heroes leave an empty slot behind until the next refresh.</p>
            ) : (
              <>
                <small>{offer.roleName} - {offer.subclassName}</small>
                <div className="mini-tag-row">
                  <span className="mini-tag">Lvl {offer.level}</span>
                  <span className="mini-tag">HP {offer.hp}</span>
                  <span className="mini-tag">ATK {offer.damage}</span>
                  <span className="mini-tag">{offer.isFree ? 'Free' : `${offer.price} SISU`}</span>
                </div>
                <button
                  className="mini-button"
                  disabled={!offer.canBuy || offer.id === null}
                  onClick={() => offer.id !== null && dispatch({ type: 'recruitOffer', offerId: offer.id })}
                >
                  {offer.isFree ? 'Recruit Free' : `Recruit ${offer.price} SISU`}
                </button>
              </>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
