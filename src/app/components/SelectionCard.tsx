import type {
  HudSelectedDefender,
  HudSelectedEnemy,
  HudSelectedSauna,
  InputAction
} from '../../game/types';
import {
  formatCadence,
  formatLocationLabel,
  getSelectionCardTitle
} from '../uiHelpers';

interface SelectionCardProps {
  selectedDefender: HudSelectedDefender | null;
  selectedSauna: HudSelectedSauna | null;
  selectedEnemy: HudSelectedEnemy | null;
  dispatch: (action: InputAction) => void;
}

export function SelectionCard({
  selectedDefender,
  selectedSauna,
  selectedEnemy,
  dispatch
}: SelectionCardProps) {
  if (!selectedDefender && !selectedSauna && !selectedEnemy) {
    return null;
  }

  const rootClassName = `selection-card popup-card${selectedDefender ? ' selection-card--compact' : ''}`;

  return (
    <section className={rootClassName}>
      <div className="popup-head">
        <h2>{getSelectionCardTitle(Boolean(selectedSauna), selectedEnemy)}</h2>
        <button className="ghost-button small-ghost" onClick={() => dispatch({ type: 'clearSelection' })}>
          Close
        </button>
      </div>
      {selectedSauna ? (
        <>
          <strong>{selectedSauna.occupantName ? `${selectedSauna.occupantName} ${selectedSauna.occupantTitle}` : 'Sauna empty'}</strong>
          <small>
            {selectedSauna.occupantRole
              ? `${selectedSauna.occupantRole} - ${selectedSauna.occupantSubclassName}`
              : 'No reserve hero inside.'}
          </small>
          {selectedSauna.occupantName ? (
            <>
              <div className="mini-tag-row stat-chip-grid">
                <span className="mini-tag">HP {selectedSauna.occupantHp}/{selectedSauna.occupantMaxHp}</span>
                <span className="mini-tag">{selectedSauna.autoDeployUnlocked ? 'Auto Deploy ready' : 'Auto Deploy locked'}</span>
                <span className="mini-tag">{selectedSauna.slapSwapUnlocked ? 'Slap Swap ready' : 'Slap Swap locked'}</span>
                {selectedSauna.rerollCost !== null ? <span className="mini-tag">Reforge {selectedSauna.rerollCost} SISU</span> : null}
              </div>
              <p className="panel-copy small-copy">{selectedSauna.occupantLore}</p>
              <div className="button-row tight">
                <button
                  className="mini-button"
                  disabled={!selectedSauna.canReroll}
                  onClick={() => dispatch({ type: 'rerollSaunaDefender' })}
                >
                  Reroll (E{selectedSauna.rerollCost !== null ? ` - ${selectedSauna.rerollCost} SISU` : ''})
                </button>
                {selectedSauna.canSendSelectedBoardHero && selectedDefender?.location === 'board' ? (
                  <button
                    className="secondary-button small-button"
                    onClick={() => dispatch({ type: 'recallDefenderToSauna', defenderId: selectedDefender.id })}
                  >
                    {selectedSauna.sendSelectedBoardHeroLabel}
                  </button>
                ) : selectedSauna.sendSelectedBoardHeroLabel && selectedDefender?.location === 'board' ? (
                  <button className="secondary-button small-button" disabled>
                    {selectedSauna.sendSelectedBoardHeroLabel}
                  </button>
                ) : null}
              </div>
            </>
          ) : (
            <>
              <p className="panel-copy small-copy">Send one board hero here during prep or pay SISU for a live retreat when the sauna is empty.</p>
              {selectedSauna.canSendSelectedBoardHero && selectedDefender?.location === 'board' ? (
                <button
                  className="secondary-button small-button"
                  onClick={() => dispatch({ type: 'recallDefenderToSauna', defenderId: selectedDefender.id })}
                >
                  {selectedSauna.sendSelectedBoardHeroLabel}
                </button>
              ) : selectedSauna.sendSelectedBoardHeroLabel && selectedDefender?.location === 'board' ? (
                <button className="secondary-button small-button" disabled>
                  {selectedSauna.sendSelectedBoardHeroLabel}
                </button>
              ) : null}
            </>
          )}
        </>
      ) : selectedEnemy ? (
        <>
          <strong>
            {selectedEnemy.name}
            {selectedEnemy.bossLabel ? ` ${selectedEnemy.bossLabel}` : ''}
          </strong>
          <small>{selectedEnemy.behaviorLabel} - Threat {selectedEnemy.threat}</small>
          <p className="panel-copy small-copy">{selectedEnemy.description}</p>
          <p className="panel-copy flavor-copy small-copy">{selectedEnemy.lore}</p>
          <div className="mini-tag-row stat-chip-grid">
            <span className="mini-tag">HP {selectedEnemy.hp}/{selectedEnemy.maxHp}</span>
            <span className="mini-tag">ATK {selectedEnemy.damage}</span>
            <span className="mini-tag">Range {selectedEnemy.range}</span>
            <span className="mini-tag">Attack {formatCadence(selectedEnemy.attackCooldownMs)}</span>
            <span className="mini-tag">Move {formatCadence(selectedEnemy.moveCooldownMs)}</span>
            <span className="mini-tag">Threat {selectedEnemy.threat}</span>
          </div>
          {selectedEnemy.isBoss ? (
            <div className="popup-card">
              <strong>Boss Threat</strong>
              <small>{selectedEnemy.behaviorLabel}. This one deserves immediate attention.</small>
            </div>
          ) : (
            <p className="panel-copy small-copy">Inspection only. Clicking an enemy does not change targeting or combat commands.</p>
          )}
        </>
      ) : selectedDefender ? (
        <>
          <strong>
            {selectedDefender.name} <em>{selectedDefender.title}</em>
          </strong>
          <small>{selectedDefender.templateName} - {selectedDefender.subclassName} - {formatLocationLabel(selectedDefender.location)}</small>
          <p className="panel-copy small-copy">{selectedDefender.lore}</p>
          <div className="mini-tag-row stat-chip-grid">
            <span className="mini-tag">HP {selectedDefender.hp}/{selectedDefender.maxHp}</span>
            <span className="mini-tag">ATK {selectedDefender.damage}</span>
            <span className="mini-tag">Heal {selectedDefender.heal}</span>
            <span className="mini-tag">Range {selectedDefender.range}</span>
            <span className="mini-tag">DEF {selectedDefender.defense}</span>
            <span className="mini-tag">Regen {selectedDefender.regenHpPerSecond}/s</span>
            <span className="mini-tag">Kills {selectedDefender.kills}</span>
          </div>
          <p className="panel-copy small-copy">{selectedDefender.subclassDescription}</p>
          {selectedDefender.subclasses.length > 0 ? (
            <div className="popup-list">
              {selectedDefender.subclasses.map((subclass) => (
                <div key={subclass.id} className="inventory-card subclass-card">
                  <div className="unit-row-top">
                    <strong>{subclass.name}</strong>
                    <small>Lvl {subclass.unlockLevel}</small>
                  </div>
                  <small>{subclass.effectText}</small>
                  <small>{subclass.statText}</small>
                </div>
              ))}
            </div>
          ) : null}
          <div className="mini-tag-row">
            <span className="mini-tag">
              XP {selectedDefender.xp}
              {selectedDefender.nextLevelXp !== null ? ` / ${selectedDefender.nextLevelXp}` : ' / Max'}
            </span>
            <span className="mini-tag">Items {selectedDefender.items.length}/{selectedDefender.itemSlotCount}</span>
            <span className="mini-tag">Skills {selectedDefender.skills.length}/{selectedDefender.skillSlotCount}</span>
            {selectedDefender.blinkLabel ? <span className="mini-tag">{selectedDefender.blinkLabel}</span> : null}
            {selectedDefender.fireballLabel ? <span className="mini-tag">{selectedDefender.fireballLabel}</span> : null}
            {selectedDefender.skillStatusLabels.map((label) => <span key={label} className="mini-tag">{label}</span>)}
          </div>
          <p className="panel-copy small-copy">Attack cadence {formatCadence(selectedDefender.attackCooldownMs)}.</p>
          {selectedDefender.nextSubclassUnlockLevel !== null ? (
            <p className="panel-copy small-copy">
              Next subclass branch at level {selectedDefender.nextSubclassUnlockLevel}
              {selectedDefender.xpToNextBranch !== null ? ` (${selectedDefender.xpToNextBranch} XP to go).` : '.'}
            </p>
          ) : (
            <p className="panel-copy small-copy">All subclass branches unlocked for this hero.</p>
          )}
          {selectedDefender.items.length > 0 ? (
            <div className="popup-list">
              {selectedDefender.items.map((item) => (
                <div key={item.id} className="popup-card">
                  <strong>{item.name}</strong>
                  <button
                    className="ghost-button small-ghost"
                    onClick={() => dispatch({ type: 'destroyEquippedItem', defenderId: selectedDefender.id, itemId: item.id })}
                  >
                    Destroy
                  </button>
                </div>
              ))}
            </div>
          ) : null}
          {selectedDefender.skills.length > 0 ? (
            <div className="popup-list">
              {selectedDefender.skills.map((skill) => (
                <div key={skill.id} className="popup-card">
                  <strong>{skill.name}</strong>
                  <button
                    className="ghost-button small-ghost"
                    onClick={() => dispatch({ type: 'destroyEquippedSkill', defenderId: selectedDefender.id, skillId: skill.id })}
                  >
                    Forget
                  </button>
                </div>
              ))}
            </div>
          ) : null}
          {selectedDefender.canSaunaCommand ? (
            <button
              className="mini-button"
              onClick={() => dispatch({ type: 'recallDefenderToSauna', defenderId: selectedDefender.id })}
            >
              {selectedDefender.saunaCommandLabel ?? 'Send To Sauna'}
            </button>
          ) : selectedDefender.saunaCommandLabel ? (
            <button className="mini-button" disabled>
              {selectedDefender.saunaCommandLabel}
            </button>
          ) : null}
        </>
      ) : null}
    </section>
  );
}
