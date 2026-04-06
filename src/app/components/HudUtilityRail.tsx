import type { HudPanelId, InputAction } from '../../game/types';
import type { HudUtilityButton } from '../uiHelpers';

interface HudUtilityRailProps {
  activePanel: HudPanelId | null;
  buttons: HudUtilityButton[];
  dispatch: (action: InputAction) => void;
}

export function HudUtilityRail({ activePanel, buttons, dispatch }: HudUtilityRailProps) {
  return (
    <nav className="hud-utility-rail">
      {buttons.map((button) => (
        <button
          key={button.id}
          className={activePanel === button.id ? 'utility-button active' : 'utility-button'}
          disabled={button.disabled}
          onClick={() => dispatch({ type: 'openHudPanel', panel: button.id })}
        >
          <span>{button.label}</span>
          {button.badge ? <small>{button.badge}</small> : null}
        </button>
      ))}
    </nav>
  );
}
