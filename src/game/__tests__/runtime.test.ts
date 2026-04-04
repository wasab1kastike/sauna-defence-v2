import { STORAGE_KEY_PREFIX, migrateLegacyStorageKeys } from '../runtime';

function createStorageMock(initial: Record<string, string>): Storage {
  const values = new Map(Object.entries(initial));
  return {
    get length() {
      return values.size;
    },
    clear() {
      values.clear();
    },
    getItem(key: string) {
      return values.has(key) ? values.get(key)! : null;
    },
    key(index: number) {
      return Array.from(values.keys())[index] ?? null;
    },
    removeItem(key: string) {
      values.delete(key);
    },
    setItem(key: string, value: string) {
      values.set(key, value);
    }
  };
}

describe('storage migration', () => {
  const META_KEY = `${STORAGE_KEY_PREFIX}-meta`;
  const PREFERENCES_KEY = `${STORAGE_KEY_PREFIX}-preferences`;
  const INTRO_SEEN_KEY = `${STORAGE_KEY_PREFIX}-intro-seen`;

  it('moves v2 values into v3 keys and removes v2 keys', () => {
    const storage = createStorageMock({
      'sauna-defense-v2-meta': '{"steam":55}',
      'sauna-defense-v2-preferences': '{"autoplayEnabled":true}',
      'sauna-defense-v2-intro-seen': 'true'
    });

    migrateLegacyStorageKeys(storage);

    expect(storage.getItem(META_KEY)).toBe('{"steam":55}');
    expect(storage.getItem(PREFERENCES_KEY)).toBe('{"autoplayEnabled":true}');
    expect(storage.getItem(INTRO_SEEN_KEY)).toBe('true');
    expect(storage.getItem('sauna-defense-v2-meta')).toBeNull();
    expect(storage.getItem('sauna-defense-v2-preferences')).toBeNull();
    expect(storage.getItem('sauna-defense-v2-intro-seen')).toBeNull();
  });

  it('does not overwrite existing v3 values', () => {
    const storage = createStorageMock({
      'sauna-defense-v2-meta': '{"steam":3}',
      [META_KEY]: '{"steam":999}'
    });

    migrateLegacyStorageKeys(storage);

    expect(storage.getItem(META_KEY)).toBe('{"steam":999}');
    expect(storage.getItem('sauna-defense-v2-meta')).toBeNull();
  });
});
