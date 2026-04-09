import type { GameSnapshot, HudSelectedDefender, InputAction } from '../../game/types';

interface BottomDockProps {
  snapshot: GameSnapshot;
  readyEntries: GameSnapshot['hud']['readyReserveEntries'];
  saunaReserve: GameSnapshot['hud']['saunaReserve'];
  selectedDefender: HudSelectedDefender | null;
  dispatch: (action: InputAction) => void;
}

export function BottomDock({
  snapshot,
  readyEntries,
  saunaReserve,
  selectedDefender,
  dispatch
}: BottomDockProps) {
  if (snapshot.hud.showIntermission) {
    return null;
  }

  return (
    <section className="bottom-dock popup-card">
      <div className="dock-row">
        <div className="dock-head">
          <div>
            <h2>Reserve Row</h2>
            <p className="panel-copy small-copy">Select heroes with `A`, `S`, `D`, then click a build tile to deploy.</p>
          </div>
          <span>{readyEntries.length} ready</span>
        </div>
        <div className="reserve-row">
          {readyEntries.length > 0 ? readyEntries.map((entry) => (
            <button
              key={entry.id}
              className={entry.selected ? 'reserve-card selected' : 'reserve-card'}
              onClick={() => dispatch({ type: 'selectDefender', defenderId: entry.id })}
            >
              <div className="unit-row-top">
                <strong>
                  {entry.name} <em>{entry.title}</em>
                </strong>
                {entry.shortcutKey ? <span className="hotkey-pill">{entry.shortcutKey}</span> : null}
              </div>
              <small>{entry.templateName} - {entry.subclassName}</small>
              <div className="mini-tag-row">
                <span className="mini-tag">HP {entry.hp}/{entry.maxHp}</span>
                <span className="mini-tag">ATK {entry.damage}</span>
                {entry.heal > 0 ? <span className="mini-tag">Heal {entry.heal}</span> : null}
              </div>
            </button>
          )) : (
            <div className="reserve-empty panel-copy small-copy">No heroes in the reserve row right now.</div>
          )}
        </div>
      </div>

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
            <p className="panel-copy small-copy">Empty sauna. If the board is full, the next recruit will warm up here first.</p>
          )}
          <div className="button-row tight">
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
              <p className="panel-copy small-copy">{snapshot.hud.recruitmentStatusText} You can also hire straight into the sauna reserve.</p>
            </div>
            <span>{snapshot.hud.recruitOffers.length}/3 offers</span>
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
          <div className="market-row">
            {snapshot.hud.recruitOffers.length > 0 ? snapshot.hud.recruitOffers.map((offer) => (
              <div key={offer.id} className={`market-card offer-${offer.quality}`}>
                <div className="unit-row-top">
                  <strong>
                    {offer.name} <em>{offer.title}</em>
                  </strong>
                  <span className="mini-tag">{offer.quality}</span>
                </div>
                <small>{offer.roleName} - {offer.subclassName}</small>
                <small>{offer.lore}</small>
                <div className="mini-tag-row">
                  <span className="mini-tag">Lvl {offer.level}</span>
                  <span className="mini-tag">HP {offer.hp}</span>
                  <span className="mini-tag">ATK {offer.damage}</span>
                  {offer.heal > 0 ? <span className="mini-tag">Heal {offer.heal}</span> : null}
                  <span className="mini-tag">Range {offer.range}</span>
                </div>
                <div className="button-row tight">
                  <button className="mini-button" onClick={() => dispatch({ type: 'recruitOffer', offerId: offer.id })}>
                    Buy {offer.price} SISU
                  </button>
                  <button
                    className="secondary-button small-button"
                    disabled={!offer.canHireToSauna}
                    onClick={() => dispatch({ type: 'recruitOffer', offerId: offer.id, destination: 'sauna' })}
                  >
                    {offer.hireToSaunaLabel}
                  </button>
                  <button className="ghost-button small-ghost" onClick={() => dispatch({ type: 'rerollRecruitOffer', offerId: offer.id })}>
                    Reroll {offer.rerollCost}
                  </button>
                </div>
              </div>
            )) : (
              <div className="reserve-empty panel-copy small-copy">No candidates waiting. Refresh the market to scout three more heroes.</div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
