import type {
  DefenderInstance,
  DefenderLocation,
  GameContent,
  HudRosterEntry,
  HudSaunaDockEntry,
  RunState,
  UnitStats
} from './types';

export interface HudSelectorDependencies {
  benchRerollCost: (state: RunState, defenderId: string) => number;
  canRerollSaunaDefender: (state: RunState) => boolean;
  derivedStats: (state: RunState, defender: DefenderInstance, content: GameContent) => UnitStats;
  saunaRerollCost: (state: RunState) => number | null;
  subclassSummary: (defender: DefenderInstance, content: GameContent) => string;
}

const RESERVE_SHORTCUT_KEYS = ['A', 'S', 'D'] as const;
const ROSTER_LOCATION_ORDER: Record<DefenderLocation, number> = {
  board: 0,
  sauna: 1,
  ready: 2,
  dead: 3
};

function rosterLocationLabel(location: DefenderLocation): string {
  switch (location) {
    case 'board':
      return 'On Board';
    case 'sauna':
      return 'In Sauna';
    case 'ready':
      return 'In Reserve';
    case 'dead':
      return 'Fallen';
    default:
      return location;
  }
}

export function createReserveShortcutKeyMap(readyReserveDefenders: DefenderInstance[]): Map<string, string> {
  return new Map(
    readyReserveDefenders
      .slice(0, RESERVE_SHORTCUT_KEYS.length)
      .map((defender, index) => [defender.id, RESERVE_SHORTCUT_KEYS[index]])
  );
}

export function createHudRosterEntry(
  state: RunState,
  defender: DefenderInstance,
  content: GameContent,
  shortcutKeyByDefenderId: Map<string, string>,
  deps: HudSelectorDependencies
): HudRosterEntry {
  const stats = deps.derivedStats(state, defender, content);
  const subclassName = deps.subclassSummary(defender, content);

  return {
    id: defender.id,
    name: defender.name,
    title: defender.title,
    templateName: content.defenderTemplates[defender.templateId].name,
    subclassName,
    roleSummary: content.defenderTemplates[defender.templateId].role,
    locationLabel: rosterLocationLabel(defender.location),
    summary: `Lvl ${defender.level} ${subclassName} - ${stats.damage} ATK - ${stats.defense} DEF`,
    level: defender.level,
    hp: defender.hp,
    maxHp: stats.maxHp,
    damage: stats.damage,
    heal: stats.heal,
    range: stats.range,
    defense: stats.defense,
    regenHpPerSecond: stats.regenHpPerSecond,
    kills: defender.kills,
    location: defender.location,
    benchRerollCount: state.benchRerollCountsByDefenderId[defender.id] ?? 0,
    benchRerollCost: deps.benchRerollCost(state, defender.id),
    shortcutKey: shortcutKeyByDefenderId.get(defender.id) ?? null,
    selected: state.selectedDefenderId === defender.id
  };
}

export function createReadyReserveEntries(
  state: RunState,
  readyReserveDefenders: DefenderInstance[],
  content: GameContent,
  shortcutKeyByDefenderId: Map<string, string>,
  deps: HudSelectorDependencies
): HudRosterEntry[] {
  return readyReserveDefenders.map((defender) =>
    createHudRosterEntry(state, defender, content, shortcutKeyByDefenderId, deps)
  );
}

export function createSaunaReserveEntry(
  state: RunState,
  saunaDefender: DefenderInstance | null,
  selectedBoardDefender: DefenderInstance | null,
  content: GameContent,
  deps: HudSelectorDependencies
): HudSaunaDockEntry {
  const saunaSendLabel = selectedBoardDefender
    ? saunaDefender
      ? `Replace Sauna Hero With ${selectedBoardDefender.name}`
      : `Send ${selectedBoardDefender.name} To Sauna`
    : null;

  return {
    occupantId: saunaDefender?.id ?? null,
    occupantName: saunaDefender?.name ?? null,
    occupantTitle: saunaDefender?.title ?? null,
    occupantTemplateName: saunaDefender ? content.defenderTemplates[saunaDefender.templateId].name : null,
    occupantSubclassName: saunaDefender ? deps.subclassSummary(saunaDefender, content) : null,
    occupantLore: saunaDefender?.lore ?? null,
    occupantHp: saunaDefender?.hp ?? null,
    occupantMaxHp: saunaDefender ? deps.derivedStats(state, saunaDefender, content).maxHp : null,
    selected: state.selectedMapTarget === 'sauna',
    canReroll: deps.canRerollSaunaDefender(state),
    rerollCost: deps.saunaRerollCost(state),
    canSendSelectedBoardHero: selectedBoardDefender !== null && state.overlayMode === 'none' && state.phase === 'prep',
    sendSelectedBoardHeroLabel: saunaSendLabel
  };
}

export function createRosterEntries(
  state: RunState,
  defenders: DefenderInstance[],
  content: GameContent,
  shortcutKeyByDefenderId: Map<string, string>,
  deps: HudSelectorDependencies
): HudRosterEntry[] {
  return defenders
    .filter((defender) => defender.location !== 'dead')
    .sort(
      (left, right) =>
        (ROSTER_LOCATION_ORDER[left.location] - ROSTER_LOCATION_ORDER[right.location])
        || left.name.localeCompare(right.name)
    )
    .map((defender) => createHudRosterEntry(state, defender, content, shortcutKeyByDefenderId, deps));
}
