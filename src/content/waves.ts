import type { BossCategory, BossId, EnemyUnitId, WavePattern, WaveSpawn } from '../game/types';

export interface BossRotationEntry {
  bossId: BossId;
  bossCategory: BossCategory;
  name: string;
  hint: string;
}

export interface TutorialWaveTemplate {
  index: number;
  rewardSisu: number;
  pressure: number;
  pattern: 'tutorial' | 'split' | 'staggered';
  spawns: WaveSpawn[];
}

export const nonBossPatterns: Array<Exclude<WavePattern, 'tutorial' | 'boss_pressure' | 'boss_breach'>> = [
  'split',
  'staggered',
  'spearhead',
  'surge'
];

export const bossRotation: BossRotationEntry[] = [
  {
    bossId: 'pebble',
    bossCategory: 'breach',
    name: 'Pebble',
    hint: 'Massive beer worm. Ignores heroes and tunnels straight for the sauna.'
  },
  {
    bossId: 'end_user_horde',
    bossCategory: 'pressure',
    name: 'End-User Horde',
    hint: 'Weak alone, lethal in a crowd. Kill the swarm fast to collapse the ramping damage.'
  },
  {
    bossId: 'electric_bather',
    bossCategory: 'pressure',
    name: 'Electric Sauna User',
    hint: 'Punishes clumped defenders with chain shocks every few seconds.'
  },
  {
    bossId: 'escalation_manager',
    bossCategory: 'pressure',
    name: 'Escalation Manager',
    hint: 'Opens new tickets mid-fight and shrugs off damage while its users are still alive.'
  }
];

export const tutorialWaves: TutorialWaveTemplate[] = [
  {
    index: 1,
    rewardSisu: 3,
    pressure: 4,
    pattern: 'tutorial',
    spawns: [
      { atMs: 0, enemyId: 'raider', laneIndex: 0 },
      { atMs: 1100, enemyId: 'raider', laneIndex: 2 },
      { atMs: 2300, enemyId: 'raider', laneIndex: 4 }
    ]
  },
  {
    index: 2,
    rewardSisu: 3,
    pressure: 6,
    pattern: 'tutorial',
    spawns: [
      { atMs: 0, enemyId: 'raider', laneIndex: 0 },
      { atMs: 800, enemyId: 'raider', laneIndex: 3 },
      { atMs: 1700, enemyId: 'brute', laneIndex: 1 },
      { atMs: 3100, enemyId: 'raider', laneIndex: 5 }
    ]
  },
  {
    index: 3,
    rewardSisu: 3,
    pressure: 9,
    pattern: 'split',
    spawns: [
      { atMs: 0, enemyId: 'brute', laneIndex: 0 },
      { atMs: 900, enemyId: 'raider', laneIndex: 2 },
      { atMs: 1600, enemyId: 'raider', laneIndex: 4 },
      { atMs: 2900, enemyId: 'brute', laneIndex: 1 }
    ]
  },
  {
    index: 4,
    rewardSisu: 3,
    pressure: 11,
    pattern: 'staggered',
    spawns: [
      { atMs: 0, enemyId: 'raider', laneIndex: 0 },
      { atMs: 700, enemyId: 'raider', laneIndex: 2 },
      { atMs: 1400, enemyId: 'brute', laneIndex: 4 },
      { atMs: 2300, enemyId: 'raider', laneIndex: 1 },
      { atMs: 3200, enemyId: 'brute', laneIndex: 5 }
    ]
  }
];

export const endUserHordeSpawnOrder: EnemyUnitId = 'thirsty_user';
