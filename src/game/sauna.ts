import type { DefenderInstance, DefenderTemplateId, GameContent, RunState } from './types';

export interface SaunaDependencies {
  boardCap: (state: RunState, content: GameContent) => number;
  boardDefenders: (state: RunState) => DefenderInstance[];
  clearUnitMotion: (unit: DefenderInstance) => void;
  derivedMaxHp: (state: RunState, defender: DefenderInstance, content: GameContent) => number;
  generateLore: (state: RunState, templateId: DefenderTemplateId, content: GameContent) => string;
  generateName: (state: RunState, content: GameContent) => { name: string; title: string };
  randomInt: (state: RunState, min: number, max: number) => number;
  rollBaseStatsForTemplate: (state: RunState, templateId: DefenderTemplateId, content: GameContent) => DefenderInstance['stats'];
}

export function autoFillSaunaFromBench(
  state: RunState,
  _content: GameContent,
  _deps: SaunaDependencies
): DefenderInstance | null {
  void state;
  void _content;
  void _deps;
  return null;
}

export function rerollSaunaDefenderIdentityAndStats(
  state: RunState,
  defender: DefenderInstance,
  content: GameContent,
  deps: SaunaDependencies
): void {
  const previousMaxHp = Math.max(1, deps.derivedMaxHp(state, defender, content));
  const hpRatio = defender.hp / previousMaxHp;
  const identity = deps.generateName(state, content);
  const currentTemplateId = defender.templateId;

  defender.name = identity.name;
  defender.title = identity.title;
  defender.lore = deps.generateLore(state, currentTemplateId, content);
  defender.tokenStyleId = deps.randomInt(state, 0, 9);
  defender.stats = deps.rollBaseStatsForTemplate(state, currentTemplateId, content);

  const nextMaxHp = deps.derivedMaxHp(state, defender, content);
  defender.hp = Math.max(1, Math.min(nextMaxHp, Math.round(nextMaxHp * hpRatio)));
}
