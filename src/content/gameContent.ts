import type { GameContent } from '../game/types';
import { config } from './config';
import { speech } from './chatter';
import { defenderSubclasses } from './subclasses';
import { defenderTemplates } from './defenders';
import { enemyArchetypes } from './enemies';
import {
  alcoholDefinitions,
  globalModifierDefinitions,
  itemDefinitions,
  metaUpgrades,
  namePools,
  skillDefinitions
} from './items';

export const gameContent: GameContent = {
  config,
  defenderTemplates,
  defenderSubclasses,
  enemyArchetypes,
  itemDefinitions,
  skillDefinitions,
  alcoholDefinitions,
  globalModifierDefinitions,
  metaUpgrades,
  namePools,
  speech
};
