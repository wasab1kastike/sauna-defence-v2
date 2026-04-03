import { gameContent } from '../gameContent';

describe('content integrity', () => {
  it('keeps IDs unique and cross-content references valid', () => {
    const templateEntries = Object.entries(gameContent.defenderTemplates);
    const subclassEntries = Object.entries(gameContent.defenderSubclasses);
    const enemyEntries = Object.entries(gameContent.enemyArchetypes);
    const itemEntries = Object.entries(gameContent.itemDefinitions);
    const skillEntries = Object.entries(gameContent.skillDefinitions);

    const assertUniqueKeyedIds = <T extends { id: string }>(entries: Array<[string, T]>, label: string) => {
      const ids = new Set<string>();
      for (const [key, definition] of entries) {
        expect(definition.id).toBe(key);
        expect(ids.has(definition.id)).toBe(false);
        ids.add(definition.id);
      }
      expect(ids.size).toBe(entries.length);
      expect(ids.size).toBeGreaterThan(0);
      expect(label.length).toBeGreaterThan(0);
    };

    assertUniqueKeyedIds(templateEntries, 'templates');
    assertUniqueKeyedIds(subclassEntries, 'subclasses');
    assertUniqueKeyedIds(enemyEntries, 'enemies');
    assertUniqueKeyedIds(itemEntries, 'items');
    assertUniqueKeyedIds(skillEntries, 'skills');

    const templateIds = new Set(templateEntries.map(([, definition]) => definition.id));
    for (const [, subclass] of subclassEntries) {
      expect(templateIds.has(subclass.templateId)).toBe(true);
    }

    const itemIds = new Set(itemEntries.map(([, definition]) => definition.id));
    const skillIds = new Set(skillEntries.map(([, definition]) => definition.id));
    const allLootIds = new Set<string>();

    for (const itemId of itemIds) {
      expect(allLootIds.has(itemId)).toBe(false);
      allLootIds.add(itemId);
    }
    for (const skillId of skillIds) {
      expect(allLootIds.has(skillId)).toBe(false);
      allLootIds.add(skillId);
    }

    for (const definition of Object.values(gameContent.globalModifierDefinitions)) {
      if (definition.source.kind === 'template') {
        expect(templateIds.has(definition.source.templateId)).toBe(true);
      }
      if (definition.source.kind === 'subclass') {
        expect(gameContent.defenderSubclasses[definition.source.subclassId]).toBeDefined();
      }
      if (definition.source.kind === 'item') {
        expect(itemIds.has(definition.source.itemId)).toBe(true);
      }
      if (definition.source.kind === 'skill') {
        expect(skillIds.has(definition.source.skillId)).toBe(true);
      }
    }
  });
});
