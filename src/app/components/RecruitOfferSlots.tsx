import type { GameSnapshot, InputAction } from '../../game/types';

interface RecruitOfferSlotsProps {
  offers: GameSnapshot['hud']['recruitOffers'];
  dispatch: (action: InputAction) => void;
  className?: string;
}

export function RecruitOfferSlots({
  offers,
  dispatch,
  className = 'market-row'
}: RecruitOfferSlotsProps) {
  return (
    <div className={className}>
      {offers.map((offer, slotIndex) => (
        !offer.empty ? (
          <div key={offer.id ?? `filled-slot-${slotIndex}`} className={`market-card offer-${offer.quality ?? 'rough'}`}>
            <div className="unit-row-top">
              <strong>
                {offer.name} <em>{offer.title}</em>
              </strong>
              <div className="mini-tag-row">
                {offer.hotkeyKey ? <span className="hotkey-pill">{offer.hotkeyKey}</span> : null}
                <span className="mini-tag">{offer.price === 0 ? 'Free' : `${offer.price} SISU`}</span>
              </div>
            </div>
            <small>{offer.roleName} - {offer.subclassName}</small>
            {offer.lore ? <small>{offer.lore}</small> : null}
            <div className="mini-tag-row">
              <span className="mini-tag">Lvl {offer.level}</span>
              <span className="mini-tag">HP {offer.hp}</span>
              <span className="mini-tag">ATK {offer.damage}</span>
              {offer.heal !== null && offer.heal > 0 ? <span className="mini-tag">Heal {offer.heal}</span> : null}
              {offer.range !== null ? <span className="mini-tag">Range {offer.range}</span> : null}
            </div>
            <div className="button-row tight">
              <button
                className="mini-button"
                disabled={!offer.canBuy || offer.id === null}
                onClick={() => {
                  if (offer.id === null) {
                    return;
                  }
                  dispatch({ type: 'recruitOffer', offerId: offer.id });
                }}
              >
                {offer.price === 0 ? 'Recruit Free' : `Recruit ${offer.price} SISU`}
              </button>
              <button
                className="secondary-button small-button"
                disabled={!offer.canHireToSauna || offer.id === null}
                onClick={() => {
                  if (offer.id === null) {
                    return;
                  }
                  dispatch({ type: 'recruitOffer', offerId: offer.id, destination: 'sauna' });
                }}
              >
                {offer.hireToSaunaLabel}
              </button>
            </div>
          </div>
        ) : (
          <div key={`empty-slot-${slotIndex}`} className="market-card market-card-empty">
            <div className="unit-row-top">
              <strong>Empty Slot</strong>
              {offer.hotkeyKey ? <span className="hotkey-pill">{offer.hotkeyKey}</span> : null}
            </div>
            <small>Refresh the market to fill this slot with a new recruit.</small>
          </div>
        )
      ))}
    </div>
  );
}
