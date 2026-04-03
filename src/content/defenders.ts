import type { GameContent } from '../game/types';

export const defenderTemplates: GameContent['defenderTemplates'] = {
    guardian: {
      id: 'guardian',
      name: 'Frontline Tank',
      role: 'Absorbs hits and holds the lane',
      fill: '#f0c47c',
      outline: '#5d3a15',
      label: 'G',
      stats: {
        maxHp: 32,
        damage: 7,
        heal: 0,
        range: 1,
        attackCooldownMs: 1300,
        defense: 1,
        regenHpPerSecond: 0
      }
    },
    hurler: {
      id: 'hurler',
      name: 'Backline Thrower',
      role: 'Deals ranged damage from safer tiles',
      fill: '#ef8c54',
      outline: '#5c2414',
      label: 'H',
      stats: {
        maxHp: 18,
        damage: 6,
        heal: 0,
        range: 2,
        attackCooldownMs: 1110,
        defense: 0,
        regenHpPerSecond: 0
      }
    },
    mender: {
      id: 'mender',
      name: 'Sauna Medic',
      role: 'Heals allies and steadies the line',
      fill: '#90d7a3',
      outline: '#214c31',
      label: 'M',
      stats: {
        maxHp: 20,
        damage: 2,
        heal: 5,
        range: 2,
        attackCooldownMs: 1390,
        defense: 0,
        regenHpPerSecond: 1
      }
    }
  };
