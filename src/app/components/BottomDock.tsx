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

  const saunaReserve = snapshot.hud.saunaReserve;
  const selectedDefender = snapshot.hud.selectedDefender;

  return (
    <section className="bottom-dock popup-card">
      <div className="dock-row dock-row-split">
        <div className={saunaReserve.selected ? 'sauna-dock-card selected' : 'sauna-dock-card'}>
          <div className="dock-head compact-popup-head">
            <div>
              <h2>Sauna</h2>
              <p className="panel-copy small-copy">Reserve, reforge, swap in prep, and trigger paid live retreats during combat.</p>
            </div>
            <span>{saunaReserve.occupantName ? 'Occupied' : 'Empty'}</span>
          </div>
          {saunaReserve.occupantName ? (
            <>
              <strong>
                {saunaReserve.occupantName} <em>{saunaReserve.occupantTitle}</em>
              </strong>
              <small>{saunaReserve.occupantTemplateName} - {saunaReserve.occupantSubclassName}</small>
              <div className="mini-tag-row">
                <span className="mini-tag">HP {saunaReserve.occupantHp}/{saunaReserve.occupantMaxHp}</span>
                {saunaReserve.rerollCost !== null ? <span className="mini-tag">Reforge {saunaReserve.rerollCost} SISU</span> : null}
                <span className="hotkey-pill">E</span>
              </div>
              <p className="panel-copy small-copy">{saunaReserve.occupantLore}</p>
            </>
          ) : (
            <p className="panel-copy small-copy">Empty sauna. Recruit directly here or pay SISU to pull a board hero back during combat.</p>
          )}
          <div className="button-row sauna-action-row">
            <button className="ghost-button small-ghost" onClick={() => dispatch({ type: 'selectSauna' })}>
              {saunaReserve.selected ? 'Sauna Selected' : 'Inspect Sauna'}
            </button>
            <button
              className="mini-button"
              disabled={!saunaReserve.canReroll}
              onClick={() => dispatch({ type: 'rerollSaunaDefender' })}
            >
              Reroll (E{saunaReserve.rerollCost !== null ? ` - ${saunaReserve.rerollCost} SISU` : ''})
            </button>
            {saunaReserve.canSendSelectedBoardHero && selectedDefender?.location === 'board' ? (
              <button
                className="secondary-button small-button"
                onClick={() => dispatch({ type: 'recallDefenderToSauna', defenderId: selectedDefender.id })}
              >
                {saunaReserve.sendSelectedBoardHeroLabel}
              </button>
            ) : saunaReserve.sendSelectedBoardHeroLabel && selectedDefender?.location === 'board' ? (
              <button className="secondary-button small-button" disabled>
                {saunaReserve.sendSelectedBoardHeroLabel}
              </button>
            ) : null}
          </div>
        </div>

        <div className="market-dock-card">
          <div className="dock-head">
            <div>
              <h2>Recruit Market</h2>
              <p className="panel-copy small-copy">{snapshot.hud.recruitmentStatusText} Hire To Sauna keeps recruits out of the old popup flow.</p>
            </div>
            <span>{snapshot.hud.freeRecruitSlots}/4 live slots</span>
          </div>

          <div className="market-layout">
            <RecruitOfferSlots
              offers={snapshot.hud.recruitOffers}
              dispatch={dispatch}
              className="market-row market-row-four market-row-offers"
            />

            <div className="market-action-stack">
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
          </div>
        </div>
      </div>
    </section>
  );
}
