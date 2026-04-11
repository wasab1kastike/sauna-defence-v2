import { applyAction, createDefaultMetaProgress, createDefaultRunPreferences, createInitialState, createSnapshot, stepState } from './logic';
import { paintSnapshot } from './render';
import { DEFAULT_BOARD_CAMERA } from './render/layout';
import type { BoardCamera, GameRuntime, GameRuntimeConfig, GameSnapshot, InputAction, MetaProgress, RunPreferences, RunState } from './types';
import { SAVE_SCHEMA_VERSION } from './version';

export const STORAGE_VERSION = SAVE_SCHEMA_VERSION;
export const STORAGE_KEY_PREFIX = `sauna-defense-${STORAGE_VERSION}`;

const STORAGE_KEYS = {
  meta: `${STORAGE_KEY_PREFIX}-meta`,
  preferences: `${STORAGE_KEY_PREFIX}-preferences`,
  introSeen: `${STORAGE_KEY_PREFIX}-intro-seen`
} as const;

const LEGACY_STORAGE_KEYS_V2 = {
  meta: 'sauna-defense-v2-meta',
  preferences: 'sauna-defense-v2-preferences',
  introSeen: 'sauna-defense-v2-intro-seen'
} as const;

export function migrateLegacyStorageKeys(storage?: Storage | null) {
  if (!storage) {
    return;
  }

  try {
    for (const [key, legacyKey] of Object.entries(LEGACY_STORAGE_KEYS_V2) as Array<[
      keyof typeof LEGACY_STORAGE_KEYS_V2,
      string
    ]>) {
      const nextKey = STORAGE_KEYS[key];
      const existing = storage.getItem(nextKey);
      const legacyValue = storage.getItem(legacyKey);
      if (existing === null && legacyValue !== null) {
        storage.setItem(nextKey, legacyValue);
      }
      if (legacyValue !== null) {
        storage.removeItem(legacyKey);
      }
    }
  } catch {
    // Ignore localStorage errors.
  }
}

export function loadMeta(storage?: Storage | null): MetaProgress {
  if (!storage) {
    return createDefaultMetaProgress();
  }

  try {
    const raw = storage.getItem(STORAGE_KEYS.meta);
    if (!raw) {
      return createDefaultMetaProgress();
    }
    const parsed = JSON.parse(raw) as Partial<MetaProgress>;
    const defaults = createDefaultMetaProgress();
    const activeHallOfFameTitleId =
      typeof parsed.activeHallOfFameTitleId === 'string' && parsed.activeHallOfFameTitleId in defaults.hallOfFameTitleLevels
        ? parsed.activeHallOfFameTitleId
        : null;
    const activeHallOfFameNameId =
      typeof parsed.activeHallOfFameNameId === 'string' && parsed.activeHallOfFameNameId in defaults.hallOfFameNameLevels
        ? parsed.activeHallOfFameNameId
        : null;
    const steam = typeof parsed.steam === 'number' && Number.isFinite(parsed.steam) ? parsed.steam : 0;
    const completedRuns =
      typeof parsed.completedRuns === 'number' && Number.isFinite(parsed.completedRuns) ? parsed.completedRuns : 0;
    return {
      steam,
      completedRuns,
      shopUnlocked: parsed.shopUnlocked === true,
      upgrades: {
        ...defaults.upgrades,
        ...parsed.upgrades
      },
      activeHallOfFameTitleId,
      activeHallOfFameNameId,
      hallOfFameTitleLevels: {
        ...defaults.hallOfFameTitleLevels,
        ...parsed.hallOfFameTitleLevels
      },
      hallOfFameNameLevels: {
        ...defaults.hallOfFameNameLevels,
        ...parsed.hallOfFameNameLevels
      }
    };
  } catch {
    return createDefaultMetaProgress();
  }
}

function saveMeta(storage: Storage | null | undefined, meta: MetaProgress) {
  if (!storage) {
    return;
  }
  storage.setItem(STORAGE_KEYS.meta, JSON.stringify(meta));
}

function loadPreferences(storage?: Storage | null): RunPreferences {
  if (!storage) {
    return createDefaultRunPreferences();
  }

  try {
    const raw = storage.getItem(STORAGE_KEYS.preferences);
    if (!raw) {
      return createDefaultRunPreferences();
    }
    const parsed = JSON.parse(raw) as Partial<RunPreferences>;
    return {
      autoAssignEnabled: parsed.autoAssignEnabled === true,
      autoUpgradeEnabled: parsed.autoUpgradeEnabled === true,
      autoplayEnabled: parsed.autoplayEnabled === true
    };
  } catch {
    return createDefaultRunPreferences();
  }
}

function savePreferences(storage: Storage | null | undefined, preferences: RunPreferences) {
  if (!storage) {
    return;
  }
  storage.setItem(STORAGE_KEYS.preferences, JSON.stringify(preferences));
}

function loadIntroSeen(storage?: Storage | null): boolean {
  if (!storage) {
    return false;
  }
  try {
    return storage.getItem(STORAGE_KEYS.introSeen) === 'true';
  } catch {
    return false;
  }
}

function saveIntroSeen(storage?: Storage | null, value = true) {
  if (!storage) {
    return;
  }
  try {
    storage.setItem(STORAGE_KEYS.introSeen, value ? 'true' : 'false');
  } catch {
    // Ignore localStorage errors.
  }
}

export function createGameRuntime(config: GameRuntimeConfig): GameRuntime {
  const storage = config.storage ?? (typeof window !== 'undefined' ? window.localStorage : null);
  migrateLegacyStorageKeys(storage);
  let state: RunState = createInitialState(
    config.content,
    loadMeta(storage),
    Date.now() >>> 0,
    false,
    !loadIntroSeen(storage),
    [],
    loadPreferences(storage)
  );
  let snapshot: GameSnapshot = createSnapshot(state, config.content);
  let animationFrameId = 0;
  let lastFrameMs = 0;
  let lastEmitMs = 0;
  let boardCamera: BoardCamera = DEFAULT_BOARD_CAMERA;
  const listeners = new Set<(snapshot: GameSnapshot) => void>();

  const emit = (force = false) => {
    if (!force && state.timeMs - lastEmitMs < 100) {
      return;
    }
    snapshot = createSnapshot(state, config.content);
    lastEmitMs = state.timeMs;
    saveMeta(storage, state.meta);
    savePreferences(storage, {
      autoAssignEnabled: state.autoAssignEnabled,
      autoUpgradeEnabled: state.autoUpgradeEnabled,
      autoplayEnabled: state.autoplayEnabled
    });
    for (const listener of listeners) {
      listener(snapshot);
    }
  };

  const render = () => {
    const ctx = config.canvas.getContext('2d');
    if (!ctx) {
      return;
    }
    const rect = config.canvas.getBoundingClientRect();
    paintSnapshot(ctx, snapshot, rect.width, rect.height, boardCamera);
  };

  const sync = (forceEmit = false) => {
    snapshot = createSnapshot(state, config.content);
    render();
    emit(forceEmit);
  };

  const frame = (timestamp: number) => {
    if (lastFrameMs === 0) {
      lastFrameMs = timestamp;
    }
    const deltaMs = Math.min(50, timestamp - lastFrameMs);
    lastFrameMs = timestamp;
    state = stepState(state, deltaMs, config.content);
    sync(false);
    animationFrameId = window.requestAnimationFrame(frame);
  };

  return {
    start() {
      if (animationFrameId !== 0) {
        return;
      }
      sync(true);
      animationFrameId = window.requestAnimationFrame(frame);
    },

    stop() {
      if (animationFrameId !== 0) {
        window.cancelAnimationFrame(animationFrameId);
        animationFrameId = 0;
      }
      lastFrameMs = 0;
    },

    resize() {
      const rect = config.canvas.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      const width = Math.max(1, Math.round(rect.width * dpr));
      const height = Math.max(1, Math.round(rect.height * dpr));

      if (config.canvas.width !== width || config.canvas.height !== height) {
        config.canvas.width = width;
        config.canvas.height = height;
      }

      const ctx = config.canvas.getContext('2d');
      if (ctx) {
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      }
      render();
      emit(true);
    },

    setBoardCamera(camera: BoardCamera) {
      boardCamera = { ...camera };
      render();
    },

    dispatch(action: InputAction) {
      state = applyAction(state, action, config.content);
      if (action.type === 'closeIntro') {
        saveIntroSeen(storage, true);
      }
      sync(true);
    },

    subscribe(listener) {
      listeners.add(listener);
      listener(snapshot);
      return () => {
        listeners.delete(listener);
      };
    },

    getSnapshot() {
      return snapshot;
    }
  };
}
