import type {
  DefenderInstance,
  DefenderLocation,
  GameContent,
  HudRosterEntry,
  HudSaunaDockEntry,
  HudSaunaSlotEntry,
  RunState,
  UnitStats
} from './types';

export interface HudSelectorDependencies {
  canRerollSaunaDefender: (state: RunState) => boolean;
  derivedStats: (state: RunState, defender: DefenderInstance, content: GameContent) => UnitStats;
  sacrificeSteamReward: (defender: DefenderInstance | null) => number;
  saunaRerollCost: (state: RunState) => number | null;
  subclassSummary: (defender: DefenderInstance, content: GameContent) => string;
}

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

export function createHudRosterEntry(
  state: RunState,
  defender: DefenderInstance,
  content: GameContent,
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
    selected: state.selectedDefenderId === defender.id
  };
}

export function createSaunaSlotEntry(
  state: RunState,
  slotIndex: number,
  saunaDefender: DefenderInstance | null,
  content: GameContent,
  deps: HudSelectorDependencies
): HudSaunaSlotEntry {
  return {
    slotIndex,
    occupantId: saunaDefender?.id ?? null,
    occupantName: saunaDefender?.name ?? null,
    occupantTitle: saunaDefender?.title ?? null,
    occupantTemplateName: saunaDefender ? content.defenderTemplates[saunaDefender.templateId].name : null,
    occupantSubclassName: saunaDefender ? deps.subclassSummary(saunaDefender, content) : null,
    occupantLore: saunaDefender?.lore ?? null,
    occupantHp: saunaDefender?.hp ?? null,
    occupantMaxHp: saunaDefender ? deps.derivedStats(state, saunaDefender, content).maxHp : null,
    selected: state.selectedSaunaSlotIndex === slotIndex,
    empty: saunaDefender === null,
    canReroll: saunaDefender !== null && deps.canRerollSaunaDefender(state),
    rerollCost: saunaDefender !== null ? deps.saunaRerollCost(state) : null,
    canSacrifice: saunaDefender !== null,
    sacrificeRewardSteam: deps.sacrificeSteamReward(saunaDefender)
  };
}

export function createSaunaReserveEntry(
  state: RunState,
  saunaDefender: DefenderInstance | null,
  slotIndex: number,
  selectedBoardDefender: DefenderInstance | null,
  content: GameContent,
  deps: HudSelectorDependencies
): HudSaunaDockEntry {
  const saunaSendLabel = selectedBoardDefender
    ? saunaDefender
      ? `Replace Slot ${slotIndex + 1} With ${selectedBoardDefender.name}`
      : `Send ${selectedBoardDefender.name} To Slot ${slotIndex + 1}`
    : null;

  return {
    ...createSaunaSlotEntry(state, slotIndex, saunaDefender, content, deps),
    canSendSelectedBoardHero: selectedBoardDefender !== null && state.overlayMode === 'none' && state.phase === 'prep',
    sendSelectedBoardHeroLabel: saunaSendLabel
  };
}

export function createRosterEntries(
  state: RunState,
  defenders: DefenderInstance[],
  content: GameContent,
  deps: HudSelectorDependencies
): HudRosterEntry[] {
  return defenders
    .filter((defender) => defender.location !== 'dead')
    .sort(
      (left, right) =>
        (ROSTER_LOCATION_ORDER[left.location] - ROSTER_LOCATION_ORDER[right.location])
        || left.name.localeCompare(right.name)
    )
    .map((defender) => createHudRosterEntry(state, defender, content, deps));
}
