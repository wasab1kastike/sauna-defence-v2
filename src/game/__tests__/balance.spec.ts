import { gameContent } from '../../content/gameContent';
import {
  applyAction,
  createWaveDefinition,
  createDefaultMetaProgress,
  createInitialState,
  stepState
} from '../logic';
import type { DefenderInstance, DefenderTemplateId, RunState } from '../types';

type Checkpoint = 5 | 10 | 15;

interface ScenarioMetrics {
  seed: number;
  clearedWave5Boss: boolean;
  clearTimeMs: Record<Checkpoint, number>;
  saunaHpByWave: Record<number, number>;
  survivalRatioByRole: Record<DefenderTemplateId, number>;
}

const CHECKPOINTS: Checkpoint[] = [5, 10, 15];
const SEEDS = [1337, 4242, 9001];
const STEP_MS = 100;
const MAX_SIM_TIME_MS = 12 * 60 * 1000;
const BOARD_TILES = [
  { q: 0, r: -1 },
  { q: 1, r: -1 },
  { q: -1, r: 0 },
  { q: 0, r: 1 }
];

function buildBaselineDefender(seed: number, templateId: DefenderTemplateId, index: number, tile: (typeof BOARD_TILES)[number]): DefenderInstance {
  const source = createInitialState(gameContent, createDefaultMetaProgress(), seed + index, false, false)
    .recruitOffers.find((offer) => offer !== null)!.candidate;
  const template = gameContent.defenderTemplates[templateId];
  return {
    ...source,
    id: `${templateId}-baseline-${index}`,
    templateId,
    name: `${template.name} ${index}`,
    title: `Baseline ${index}`,
    lore: `${template.name} baseline defender`,
    stats: { ...template.stats },
    hp: template.stats.maxHp,
    location: 'board',
    tile,
    homeTile: tile,
    motion: null,
    level: 6,
    xp: 0,
    items: [],
    skills: [],
    kills: 0,
    lastHitByEnemyId: null
  };
}

function createBaselineState(seed: number): RunState {
  const state = createInitialState(gameContent, createDefaultMetaProgress(), seed, false, false);
  state.defenders = [
    buildBaselineDefender(seed, 'guardian', 1, BOARD_TILES[0]),
    buildBaselineDefender(seed, 'guardian', 2, BOARD_TILES[1]),
    buildBaselineDefender(seed, 'hurler', 3, BOARD_TILES[2]),
    buildBaselineDefender(seed, 'mender', 4, BOARD_TILES[3])
  ];

  return state;
}

function maybeResolveDraft(state: RunState): RunState {
  if (state.overlayMode === 'modifier_draft' && state.globalModifierDraftOffers.length > 0) {
    return applyAction(
      state,
      { type: 'draftGlobalModifier', modifierId: state.globalModifierDraftOffers[0] },
      gameContent
    );
  }

  if (state.overlayMode === 'subclass_draft' && state.subclassDraftOfferIds.length > 0) {
    return applyAction(
      state,
      { type: 'draftSubclassChoice', subclassId: state.subclassDraftOfferIds[0] },
      gameContent
    );
  }

  return state;
}

function average(values: number[]): number {
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function simulateBaselineScenario(seed: number): ScenarioMetrics {
  let state = createBaselineState(seed);
  const waveStartMs = new Map<number, number>();
  const clearTimeMs: Record<Checkpoint, number> = { 5: -1, 10: -1, 15: -1 };
  const saunaHpByWave: Record<number, number> = {};
  const startingRoleCounts: Record<DefenderTemplateId, number> = {
    guardian: state.defenders.filter((entry) => entry.templateId === 'guardian').length,
    hurler: state.defenders.filter((entry) => entry.templateId === 'hurler').length,
    mender: state.defenders.filter((entry) => entry.templateId === 'mender').length
  };

  let elapsedMs = 0;

  while (elapsedMs <= MAX_SIM_TIME_MS) {
    state = maybeResolveDraft(state);

    if (
      state.phase === 'wave' &&
      state.overlayMode === 'none' &&
      state.sisu.current >= gameContent.config.sisuAbilityCost &&
      state.timeMs >= state.sisu.cooldownUntilMs
    ) {
      state = applyAction(state, { type: 'activateSisu' }, gameContent);
    }

    if (state.phase === 'prep' && state.overlayMode === 'none' && state.waveIndex <= 16) {
      state = applyAction(state, { type: 'startWave' }, gameContent);
      waveStartMs.set(state.currentWave.index, state.timeMs);
    }

    const prevWaveIndex = state.waveIndex;
    const prevPhase = state.phase;

    state = stepState(state, STEP_MS, gameContent);
    elapsedMs += STEP_MS;

    if (state.phase === 'lost') {
      break;
    }

    if (state.waveIndex > prevWaveIndex) {
      saunaHpByWave[prevWaveIndex] = state.saunaHp;
      if (CHECKPOINTS.includes(prevWaveIndex as Checkpoint)) {
        const startMs = waveStartMs.get(prevWaveIndex) ?? state.timeMs;
        clearTimeMs[prevWaveIndex as Checkpoint] = state.timeMs - startMs;
      }
    }

    if (prevPhase === 'wave' && prevWaveIndex === 5 && state.waveIndex >= 6) {
      // boss wave 5 cleared, recorded by wave index jump
    }

    if (state.waveIndex >= 16 && state.phase !== 'wave') {
      break;
    }
  }

  const livingByRole: Record<DefenderTemplateId, number> = {
    guardian: state.defenders.filter((entry) => entry.templateId === 'guardian' && entry.location !== 'dead').length,
    hurler: state.defenders.filter((entry) => entry.templateId === 'hurler' && entry.location !== 'dead').length,
    mender: state.defenders.filter((entry) => entry.templateId === 'mender' && entry.location !== 'dead').length
  };

  return {
    seed,
    clearedWave5Boss: state.waveIndex >= 6,
    clearTimeMs,
    saunaHpByWave,
    survivalRatioByRole: {
      guardian: livingByRole.guardian / startingRoleCounts.guardian,
      hurler: livingByRole.hurler / startingRoleCounts.hurler,
      mender: livingByRole.mender / startingRoleCounts.mender
    }
  };
}

function areaAverageSaunaHp(metrics: ScenarioMetrics, checkpoint: Checkpoint): number {
  const values = [checkpoint - 2, checkpoint - 1, checkpoint]
    .map((wave) => metrics.saunaHpByWave[wave])
    .filter((value): value is number => typeof value === 'number');
  return values.length === 3 ? average(values) : 0;
}

describe('balance baseline regression metrics', () => {
  let cachedScenarios: ScenarioMetrics[] | null = null;
  const getScenarios = () => {
    if (!cachedScenarios) {
      cachedScenarios = SEEDS.map((seed) => simulateBaselineScenario(seed));
    }
    return cachedScenarios;
  };

  it('marks wave 5 Pebble as fully shutting down the stripped baseline roster', () => {
    const scenarios = getScenarios();
    expect(scenarios.filter((scenario) => scenario.clearedWave5Boss)).toHaveLength(3);
    expect(scenarios.find((scenario) => scenario.seed === 4242)?.clearedWave5Boss).toBe(true);
    expect(scenarios.find((scenario) => scenario.seed === 1337)?.clearedWave5Boss).toBe(true);
  });

  it('locks checkpoint clear-time envelopes for waves 5/10/15', () => {
    const scenarios = getScenarios();
    const avgWave5 = Math.round(average(scenarios.map((scenario) => scenario.clearTimeMs[5])));
    const avgWave10 = Math.round(average(scenarios.map((scenario) => scenario.clearTimeMs[10])));
    const avgWave15 = Math.round(average(scenarios.map((scenario) => scenario.clearTimeMs[15])));

    expect(avgWave5).toBe(43200);
    expect(avgWave10).toBe(-1);
    expect(avgWave15).toBe(-1);
  });

  it('locks area-average sauna HP checkpoints and role survival ratios', () => {
    const scenarios = getScenarios();
    const avgHpWave5 = average(scenarios.map((scenario) => areaAverageSaunaHp(scenario, 5)));
    const avgHpWave10 = average(scenarios.map((scenario) => areaAverageSaunaHp(scenario, 10)));
    const avgHpWave15 = average(scenarios.map((scenario) => areaAverageSaunaHp(scenario, 15)));

    const avgGuardianSurvival = average(scenarios.map((scenario) => scenario.survivalRatioByRole.guardian));
    const avgHurlerSurvival = average(scenarios.map((scenario) => scenario.survivalRatioByRole.hurler));
    const avgMenderSurvival = average(scenarios.map((scenario) => scenario.survivalRatioByRole.mender));

    expect(avgHpWave5).toBeCloseTo(66.66666666666667, 10);
    expect(avgHpWave10).toBe(0);
    expect(avgHpWave15).toBe(0);

    expect(avgGuardianSurvival).toBeCloseTo(1 / 3, 10);
    expect(avgMenderSurvival).toBe(0);
    expect(avgHurlerSurvival).toBe(0);
  });

  it('keeps onboarding counts stable while locking the new late-game spawn anchors', () => {
    expect(createWaveDefinition(1, gameContent).spawns).toHaveLength(3);
    expect(createWaveDefinition(4, gameContent).spawns).toHaveLength(5);
    expect(createWaveDefinition(6, gameContent).spawns).toHaveLength(15);
    expect(createWaveDefinition(10, gameContent).spawns).toHaveLength(32);
    expect(createWaveDefinition(15, gameContent).spawns).toHaveLength(67);
    expect(createWaveDefinition(20, gameContent).spawns).toHaveLength(112);
    expect(createWaveDefinition(25, gameContent).spawns).toHaveLength(157);
    expect(createWaveDefinition(30, gameContent).spawns).toHaveLength(212);
  });
});
