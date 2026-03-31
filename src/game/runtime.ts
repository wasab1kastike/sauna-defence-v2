import { applyAction, createInitialState, createSnapshot, stepState } from './logic';
import { paintSnapshot } from './render';
import type { GameRuntime, GameRuntimeConfig, GameSnapshot, InputAction, RunState } from './types';

export function createGameRuntime(config: GameRuntimeConfig): GameRuntime {
  let state: RunState = createInitialState(config.content);
  let snapshot: GameSnapshot = createSnapshot(state, config.content);
  let animationFrameId = 0;
  let lastFrameMs = 0;
  let lastEmitMs = 0;
  const listeners = new Set<(snapshot: GameSnapshot) => void>();

  const emit = (force = false) => {
    if (!force && state.timeMs - lastEmitMs < 100) {
      return;
    }
    snapshot = createSnapshot(state, config.content);
    lastEmitMs = state.timeMs;
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
    paintSnapshot(ctx, snapshot, rect.width, rect.height);
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

    dispatch(action: InputAction) {
      state = applyAction(state, action, config.content);
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
