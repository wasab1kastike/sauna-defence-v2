import type { GameContent } from '../game/types';

export const gameContent: GameContent = {
  config: {
    gridRadius: 4,
    buildRadius: 3,
    saunaHp: 56,
    startingSteam: 18,
    sisuDurationMs: 5500,
    sisuCooldownMs: 14000,
    sisuAttackMultiplier: 1.35,
    sisuDamageMultiplier: 1.4,
    betweenWaveSteam: 4,
    spawnLanes: [
      { q: 0, r: -4 },
      { q: 4, r: -4 },
      { q: 4, r: 0 },
      { q: 0, r: 4 },
      { q: -4, r: 4 },
      { q: -4, r: 0 }
    ],
    waves: [
      {
        id: 1,
        rewardSteam: 5,
        spawns: [
          { atMs: 0, enemyId: 'raider', laneIndex: 0 },
          { atMs: 1200, enemyId: 'raider', laneIndex: 2 },
          { atMs: 2600, enemyId: 'raider', laneIndex: 4 },
          { atMs: 4200, enemyId: 'raider', laneIndex: 1 },
          { atMs: 5400, enemyId: 'raider', laneIndex: 3 }
        ]
      },
      {
        id: 2,
        rewardSteam: 5,
        spawns: [
          { atMs: 0, enemyId: 'raider', laneIndex: 0 },
          { atMs: 800, enemyId: 'raider', laneIndex: 1 },
          { atMs: 1600, enemyId: 'raider', laneIndex: 2 },
          { atMs: 2400, enemyId: 'raider', laneIndex: 3 },
          { atMs: 3200, enemyId: 'brute', laneIndex: 4 },
          { atMs: 5200, enemyId: 'raider', laneIndex: 5 }
        ]
      },
      {
        id: 3,
        rewardSteam: 6,
        spawns: [
          { atMs: 0, enemyId: 'brute', laneIndex: 0 },
          { atMs: 900, enemyId: 'raider', laneIndex: 2 },
          { atMs: 1800, enemyId: 'raider', laneIndex: 3 },
          { atMs: 3000, enemyId: 'brute', laneIndex: 5 },
          { atMs: 4500, enemyId: 'raider', laneIndex: 1 },
          { atMs: 6000, enemyId: 'raider', laneIndex: 4 }
        ]
      },
      {
        id: 4,
        rewardSteam: 6,
        spawns: [
          { atMs: 0, enemyId: 'raider', laneIndex: 0 },
          { atMs: 700, enemyId: 'raider', laneIndex: 1 },
          { atMs: 1400, enemyId: 'brute', laneIndex: 2 },
          { atMs: 2300, enemyId: 'raider', laneIndex: 4 },
          { atMs: 3200, enemyId: 'brute', laneIndex: 5 },
          { atMs: 4200, enemyId: 'raider', laneIndex: 3 },
          { atMs: 5600, enemyId: 'brute', laneIndex: 0 }
        ]
      },
      {
        id: 5,
        rewardSteam: 7,
        spawns: [
          { atMs: 0, enemyId: 'brute', laneIndex: 1 },
          { atMs: 1200, enemyId: 'raider', laneIndex: 3 },
          { atMs: 2000, enemyId: 'brute', laneIndex: 4 },
          { atMs: 3200, enemyId: 'raider', laneIndex: 0 },
          { atMs: 4200, enemyId: 'raider', laneIndex: 2 },
          { atMs: 5300, enemyId: 'chieftain', laneIndex: 5 }
        ]
      },
      {
        id: 6,
        rewardSteam: 0,
        spawns: [
          { atMs: 0, enemyId: 'brute', laneIndex: 0 },
          { atMs: 800, enemyId: 'brute', laneIndex: 2 },
          { atMs: 1600, enemyId: 'raider', laneIndex: 1 },
          { atMs: 2600, enemyId: 'raider', laneIndex: 3 },
          { atMs: 3600, enemyId: 'brute', laneIndex: 4 },
          { atMs: 5200, enemyId: 'chieftain', laneIndex: 5 },
          { atMs: 7200, enemyId: 'chieftain', laneIndex: 2 }
        ]
      }
    ]
  },
  archetypes: {
    guardian: {
      id: 'guardian',
      team: 'player',
      name: 'Guardian',
      cost: 6,
      maxHp: 30,
      damage: 7,
      heal: 0,
      range: 1,
      attackCooldownMs: 1000,
      moveCooldownMs: 0,
      fill: '#f0c47c',
      outline: '#5d3a15',
      label: 'G'
    },
    hurler: {
      id: 'hurler',
      team: 'player',
      name: 'Hurler',
      cost: 5,
      maxHp: 16,
      damage: 5,
      heal: 0,
      range: 2,
      attackCooldownMs: 850,
      moveCooldownMs: 0,
      fill: '#ef8c54',
      outline: '#5c2414',
      label: 'H'
    },
    mender: {
      id: 'mender',
      team: 'player',
      name: 'Mender',
      cost: 7,
      maxHp: 18,
      damage: 2,
      heal: 5,
      range: 2,
      attackCooldownMs: 1100,
      moveCooldownMs: 0,
      fill: '#90d7a3',
      outline: '#214c31',
      label: 'M'
    },
    raider: {
      id: 'raider',
      team: 'enemy',
      name: 'Raider',
      maxHp: 10,
      damage: 4,
      heal: 0,
      range: 1,
      attackCooldownMs: 950,
      moveCooldownMs: 780,
      fill: '#d96b5a',
      outline: '#6d231f',
      label: 'R'
    },
    brute: {
      id: 'brute',
      team: 'enemy',
      name: 'Brute',
      maxHp: 18,
      damage: 6,
      heal: 0,
      range: 1,
      attackCooldownMs: 1250,
      moveCooldownMs: 980,
      fill: '#c14b3f',
      outline: '#5c1715',
      label: 'B'
    },
    chieftain: {
      id: 'chieftain',
      team: 'enemy',
      name: 'Chieftain',
      maxHp: 32,
      damage: 8,
      heal: 0,
      range: 1,
      attackCooldownMs: 1000,
      moveCooldownMs: 860,
      fill: '#8c2d2d',
      outline: '#2f0909',
      label: 'C'
    }
  }
};
