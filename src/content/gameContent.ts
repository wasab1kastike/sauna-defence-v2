import type { GameContent } from '../game/types';

export const gameContent: GameContent = {
  config: {
    gridRadius: 4,
    buildRadius: 3,
    saunaHp: 72,
    startingSisu: 10,
    sisuAbilityCost: 5,
    sisuDurationMs: 5000,
    sisuCooldownMs: 12500,
    sisuAttackMultiplier: 1.18,
    sisuDamageMultiplier: 1.4,
    boardCap: 4,
    saunaCap: 1,
    baseRosterCap: 5,
    baseInventoryCap: 2,
    baseItemSlots: 1,
    recruitBaseCost: 6,
    recruitCostStep: 2,
    recruitWaveStep: 1,
    steamPerSaunaWave: 1,
    saunaHealPerPrep: 5,
    baseLootChance: 0.18,
    bossLootChance: 1,
    bossEvery: 5,
    cyclePressureBase: 6,
    cyclePressureStep: 5,
    wavePressureStep: 2,
    minSpawnIntervalMs: 340,
    spawnIntervalStepMs: 55,
    lowSisuThreshold: 4,
    lowSaunaHintRatio: 0.45,
    metaShopUnlockCost: 4,
    spawnLanes: [
      { q: 0, r: -4 },
      { q: 4, r: -4 },
      { q: 4, r: 0 },
      { q: 0, r: 4 },
      { q: -4, r: 4 },
      { q: -4, r: 0 }
    ]
  },
  defenderTemplates: {
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
        attackCooldownMs: 980
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
        attackCooldownMs: 840
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
        attackCooldownMs: 1080
      }
    }
  },
  enemyArchetypes: {
    raider: {
      id: 'raider',
      name: 'Goblin Raider',
      maxHp: 12,
      damage: 4,
      range: 1,
      attackCooldownMs: 940,
      moveCooldownMs: 760,
      fill: '#d96b5a',
      outline: '#6d231f',
      label: 'R',
      threat: 2
    },
    brute: {
      id: 'brute',
      name: 'Stone Brute',
      maxHp: 22,
      damage: 7,
      range: 1,
      attackCooldownMs: 1220,
      moveCooldownMs: 930,
      fill: '#c14b3f',
      outline: '#5c1715',
      label: 'B',
      threat: 4
    },
    chieftain: {
      id: 'chieftain',
      name: 'Steam Hog Chieftain',
      maxHp: 52,
      damage: 10,
      range: 1,
      attackCooldownMs: 980,
      moveCooldownMs: 820,
      fill: '#8c2d2d',
      outline: '#2f0909',
      label: 'C',
      threat: 10
    }
  },
  itemDefinitions: {
    ladle: {
      id: 'ladle',
      kind: 'item',
      name: 'Lucky Ladle',
      rarity: 'common',
      effectText: '+5 HP, -40 ms attack speed.',
      flavorText: 'Still warm from a soup no one admits making.',
      artPath: 'loot/lucky-ladle.svg',
      modifiers: {
        maxHp: 5,
        attackCooldownMs: -40
      }
    },
    coal_heart: {
      id: 'coal_heart',
      kind: 'item',
      name: 'Coal Heart',
      rarity: 'rare',
      effectText: '+3 damage, -2 HP.',
      flavorText: 'Beats angrily whenever someone throws weak löyly.',
      artPath: 'loot/coal-heart.svg',
      modifiers: {
        damage: 3,
        maxHp: -2
      }
    },
    towel_wrap: {
      id: 'towel_wrap',
      kind: 'item',
      name: 'Towel Wrap',
      rarity: 'common',
      effectText: '+8 HP, -1 range.',
      flavorText: 'A heroic amount of towel for a suspiciously small warrior.',
      artPath: 'loot/towel-wrap.svg',
      modifiers: {
        maxHp: 8,
        range: -1
      }
    },
    bucket_boots: {
      id: 'bucket_boots',
      kind: 'item',
      name: 'Bucket Boots',
      rarity: 'rare',
      effectText: '+1 range, +120 ms attack cooldown.',
      flavorText: 'Clonk louder, kick farther, think slower.',
      artPath: 'loot/bucket-boots.svg',
      modifiers: {
        range: 1,
        attackCooldownMs: 120
      }
    },
    birch_charm: {
      id: 'birch_charm',
      kind: 'item',
      name: 'Birch Charm',
      rarity: 'epic',
      effectText: '+2 heal, +1 damage, -60 ms attack cooldown.',
      flavorText: 'A blessed vihta trinket that smells like trouble and midsummer.',
      artPath: 'loot/birch-charm.svg',
      modifiers: {
        heal: 2,
        damage: 1,
        attackCooldownMs: -60
      }
    }
  },
  skillDefinitions: {
    fireball: {
      id: 'fireball',
      kind: 'skill',
      name: 'Fireball',
      rarity: 'rare',
      effectText: 'Basic attacks splash ember damage to nearby enemies.',
      flavorText: 'Throws a rude little sun at anyone standing too close.',
      artPath: 'loot/fireball.svg'
    },
    spin2win: {
      id: 'spin2win',
      kind: 'skill',
      name: 'Spin 2 Win',
      rarity: 'epic',
      effectText: 'Melee hits also clip all adjacent enemies.',
      flavorText: 'Invented after one slippery sauna floor incident too many.',
      artPath: 'loot/spin-2-win.svg'
    },
    blink_step: {
      id: 'blink_step',
      kind: 'skill',
      name: 'Blink Step',
      rarity: 'rare',
      effectText: 'If no target is in range, blink one hex closer to danger.',
      flavorText: 'A deeply unwise technique for entering rooms dramatically.',
      artPath: 'loot/blink-step.svg'
    }
  },
  metaUpgrades: {
    roster_capacity: {
      id: 'roster_capacity',
      name: 'More Weirdos',
      description: 'Increase total named defenders you can carry into a run.',
      baseCost: 4,
      costStep: 4,
      maxLevel: 3
    },
    inventory_slots: {
      id: 'inventory_slots',
      name: 'Bigger Pockets',
      description: 'Increase shared drop inventory size.',
      baseCost: 3,
      costStep: 3,
      maxLevel: 3
    },
    loot_luck: {
      id: 'loot_luck',
      name: 'Sticky Fingers',
      description: 'Increase overall drop chance.',
      baseCost: 4,
      costStep: 4,
      maxLevel: 3
    },
    loot_rarity: {
      id: 'loot_rarity',
      name: 'Boss Sniffer',
      description: 'Shift drops toward better rarities.',
      baseCost: 5,
      costStep: 5,
      maxLevel: 3
    },
    item_slots: {
      id: 'item_slots',
      name: 'More Pockets Per Hero',
      description: 'Give every defender one more item slot.',
      baseCost: 6,
      costStep: 5,
      maxLevel: 2
    }
  },
  namePools: {
    first: [
      'Mikko',
      'Aki',
      'Henrik',
      'Tom',
      'Jussi',
      'Sofia',
      'Väinö',
      'Siina',
      'Juhani',
      'Joonas.J.',
      'Henri',
      'Aaro',
      'Arto',
      'Jani',
      'Jere',
      'Manu',
      'Marko',
      'Niklas',
      'Oliver',
      'Vesa'
    ],
    last: [
      'Korhonen',
      'Hopeasaari',
      'Asplund',
      'Ekberg',
      'Kurikka-Oja',
      'Kivinen',
      'Saarinen',
      'Säilävaara',
      'Haapamäki',
      'Laurikainen',
      'Ossi',
      'Askala',
      'Halttunen',
      'Majuri',
      'Ahlström',
      'Katajisto',
      'Lehtinen',
      'Vikman',
      'Roth',
      'Tiittanen'
    ],
    title: [
      'Saunklonkku',
      'Hoyryruhtinas',
      'Loylylordi',
      'Vihtavelho',
      'Laudekuningas',
      'Kiuaskuiskaaja',
      'Hoyryhirmu',
      'Saunatonttu',
      'Loylylegenda',
      'Klapikeisari',
      'Hikihiippa'
    ],
    loreHooks: {
      guardian: [
        'swears the sauna door only opens when they glare at it first',
        'once blocked a whole bachelor party with one towel and a bad mood',
        'insists every proper defense begins with heavier benches'
      ],
      hurler: [
        'claims every bucket toss is part of a larger artistic statement',
        'keeps counting perfect löyly arcs nobody else can see',
        'has not met a flammable idea they did not trust immediately'
      ],
      mender: [
        'treats singed eyebrows like a sacred calling',
        'can patch both morale and towel seams with alarming speed',
        'believes every bruise is just a future sauna story'
      ]
    },
    loreQuirks: [
      'Refuses to enter the lauteet without a dramatic pre-sigh.',
      'Keeps a backup vihta for emotional emergencies.',
      'Still argues with the kiuas like it owes them money.',
      'Thinks hydration is for cowards, then lectures everyone about hydration.',
      'Calls every near miss a planned tactical steam feint.',
      'Has a personal rivalry with lukewarm decisions.',
      'Claims the towels whisper better strategy after midnight.'
    ]
  }
};
