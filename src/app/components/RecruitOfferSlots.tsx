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
        offer ? (
          <div key={offer.id} className={`market-card offer-${offer.quality}`}>
            <div className="unit-row-top">
              <strong>
                {offer.name} <em>{offer.title}</em>
              </strong>
              <span className="mini-tag">{offer.price === 0 ? 'Free' : `${offer.price} SISU`}</span>
            </div>
            <small>{offer.roleName} - {offer.subclassName}</small>
            <div className="mini-tag-row">
              <span className="mini-tag">Lvl {offer.level}</span>
              <span className="mini-tag">HP {offer.hp}</span>
              <span className="mini-tag">ATK {offer.damage}</span>
            </div>
            <button className="mini-button" onClick={() => dispatch({ type: 'recruitOffer', offerId: offer.id })}>
              {offer.price === 0 ? 'Take Free Hero' : `Buy ${offer.price} SISU`}
            </button>
          </div>
        ) : (
          <div key={`empty-slot-${slotIndex}`} className="market-card market-card-empty">
            <strong>Empty Slot</strong>
            <small>Refresh the market to fill this slot with a new recruit.</small>
          </div>
        )
      ))}
    </div>
  );
}
