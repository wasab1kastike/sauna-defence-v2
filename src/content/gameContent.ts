import type { GameContent } from '../game/types';

export const gameContent: GameContent = {
  config: {
    gridRadius: 6,
    buildRadius: 5,
    headerItemCap: 3,
    headerSkillCap: 3,
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
      { q: 0, r: -6 },
      { q: 6, r: -6 },
      { q: 6, r: 0 },
      { q: 0, r: 6 },
      { q: -6, r: 6 },
      { q: -6, r: 0 }
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
        attackCooldownMs: 1100,
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
        attackCooldownMs: 940,
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
        attackCooldownMs: 1180,
        defense: 0,
        regenHpPerSecond: 1
      }
    }
  },
  defenderSubclasses: {
    stonewall: {
      id: 'stonewall',
      templateId: 'guardian',
      unlockLevel: 5,
      name: 'Stonewall',
      description: 'Soaks damage with extra bulk and a slower, heavier stance.',
      modifiers: {
        maxHp: 8,
        attackCooldownMs: 80
      }
    },
    emberguard: {
      id: 'emberguard',
      templateId: 'guardian',
      unlockLevel: 5,
      name: 'Emberguard',
      description: 'Trades some comfort for harder hits and quicker counter-swings.',
      modifiers: {
        damage: 2,
        attackCooldownMs: -70,
        maxHp: -3
      }
    },
    iron_bastion: {
      id: 'iron_bastion',
      templateId: 'guardian',
      unlockLevel: 10,
      name: 'Iron Bastion',
      description: 'Locks in harder with plated calm and stubborn lungs.',
      modifiers: {
        maxHp: 10,
        defense: 1
      }
    },
    revenge_coals: {
      id: 'revenge_coals',
      templateId: 'guardian',
      unlockLevel: 10,
      name: 'Revenge Coals',
      description: 'Every angry swing lands meaner and a little faster.',
      modifiers: {
        damage: 2,
        attackCooldownMs: -80
      }
    },
    bench_oak: {
      id: 'bench_oak',
      templateId: 'guardian',
      unlockLevel: 15,
      name: 'Bench Oak',
      description: 'Turns into pure sauna furniture: heavy, reliable, impossible to ignore.',
      modifiers: {
        maxHp: 12,
        attackCooldownMs: 50,
        defense: 1
      }
    },
    steam_bulwark: {
      id: 'steam_bulwark',
      templateId: 'guardian',
      unlockLevel: 15,
      name: 'Steam Bulwark',
      description: 'Stands in the mist and swings through it like a furnace door.',
      modifiers: {
        damage: 3,
        defense: 1
      }
    },
    avalanche_oath: {
      id: 'avalanche_oath',
      templateId: 'guardian',
      unlockLevel: 20,
      name: 'Avalanche Oath',
      description: 'The last thing enemies hear is wood creaking under impossible confidence.',
      modifiers: {
        maxHp: 14,
        damage: 2,
        defense: 2
      }
    },
    last_ladle: {
      id: 'last_ladle',
      templateId: 'guardian',
      unlockLevel: 20,
      name: 'Last Ladle',
      description: 'Turns every final swing into a loud and personal sermon.',
      modifiers: {
        damage: 4,
        attackCooldownMs: -120,
        maxHp: 4
      }
    },
    coalflinger: {
      id: 'coalflinger',
      templateId: 'hurler',
      unlockLevel: 5,
      name: 'Coalflinger',
      description: 'Throws meaner, hotter shots and lives for splashy knockouts.',
      modifiers: {
        damage: 2,
        maxHp: -2
      }
    },
    bucket_sniper: {
      id: 'bucket_sniper',
      templateId: 'hurler',
      unlockLevel: 5,
      name: 'Bucket Sniper',
      description: 'Lobs from one tile farther away but takes a beat to line it up.',
      modifiers: {
        range: 1,
        attackCooldownMs: 90
      }
    },
    spark_juggler: {
      id: 'spark_juggler',
      templateId: 'hurler',
      unlockLevel: 10,
      name: 'Spark Juggler',
      description: 'Keeps three bad ideas in the air and throws all of them.',
      modifiers: {
        damage: 2,
        attackCooldownMs: -70
      }
    },
    ash_scope: {
      id: 'ash_scope',
      templateId: 'hurler',
      unlockLevel: 10,
      name: 'Ash Scope',
      description: 'Measures arcs through steam and somehow keeps being right.',
      modifiers: {
        range: 1,
        damage: 1
      }
    },
    volley_tender: {
      id: 'volley_tender',
      templateId: 'hurler',
      unlockLevel: 15,
      name: 'Volley Tender',
      description: 'Throws in patient barrages that keep the lane politely burning.',
      modifiers: {
        damage: 2,
        range: 1,
        attackCooldownMs: 50
      }
    },
    shock_pitcher: {
      id: 'shock_pitcher',
      templateId: 'hurler',
      unlockLevel: 15,
      name: 'Shock Pitcher',
      description: 'Prefers faster, riskier tosses and louder enemy regrets.',
      modifiers: {
        damage: 3,
        attackCooldownMs: -100,
        maxHp: -1
      }
    },
    meteor_bucket: {
      id: 'meteor_bucket',
      templateId: 'hurler',
      unlockLevel: 20,
      name: 'Meteor Bucket',
      description: 'Every throw looks illegal, expensive, and extremely satisfying.',
      modifiers: {
        damage: 4,
        range: 1,
        attackCooldownMs: -80
      }
    },
    white_heat_gunner: {
      id: 'white_heat_gunner',
      templateId: 'hurler',
      unlockLevel: 20,
      name: 'White Heat Gunner',
      description: 'Finds the hottest line on the board and never misses it twice.',
      modifiers: {
        damage: 5,
        attackCooldownMs: -130,
        maxHp: -2
      }
    },
    steampriest: {
      id: 'steampriest',
      templateId: 'mender',
      unlockLevel: 5,
      name: 'Steam Priest',
      description: 'Turns every healing cycle into a stronger restorative pulse.',
      modifiers: {
        heal: 2,
        attackCooldownMs: 40
      }
    },
    towel_oracle: {
      id: 'towel_oracle',
      templateId: 'mender',
      unlockLevel: 5,
      name: 'Towel Oracle',
      description: 'Reads the steam beautifully and reaches farther with calmer support.',
      modifiers: {
        range: 1,
        attackCooldownMs: -60,
        heal: -1
      }
    },
    cedar_surgeon: {
      id: 'cedar_surgeon',
      templateId: 'mender',
      unlockLevel: 10,
      name: 'Cedar Surgeon',
      description: 'Stitches burns, panic, and team morale with the same patient hands.',
      modifiers: {
        heal: 2,
        regenHpPerSecond: 1
      }
    },
    calm_whisper: {
      id: 'calm_whisper',
      templateId: 'mender',
      unlockLevel: 10,
      name: 'Calm Whisper',
      description: 'Reaches farther with cooler nerves and a suspiciously soothing stare.',
      modifiers: {
        range: 1,
        attackCooldownMs: -80
      }
    },
    pulse_keeper: {
      id: 'pulse_keeper',
      templateId: 'mender',
      unlockLevel: 15,
      name: 'Pulse Keeper',
      description: 'Keeps the whole line alive with quick, sharp rescue bursts.',
      modifiers: {
        heal: 3,
        attackCooldownMs: -60
      }
    },
    rescue_ritualist: {
      id: 'rescue_ritualist',
      templateId: 'mender',
      unlockLevel: 15,
      name: 'Rescue Ritualist',
      description: 'Turns every support cycle into a wide, calming wave of competence.',
      modifiers: {
        heal: 2,
        range: 1,
        maxHp: 4
      }
    },
    saint_of_steam: {
      id: 'saint_of_steam',
      templateId: 'mender',
      unlockLevel: 20,
      name: 'Saint Of Steam',
      description: 'Heals like the sauna itself personally owes the squad a favor.',
      modifiers: {
        heal: 4,
        regenHpPerSecond: 1,
        range: 1
      }
    },
    afterglow_warden: {
      id: 'afterglow_warden',
      templateId: 'mender',
      unlockLevel: 20,
      name: 'Afterglow Warden',
      description: 'Leaves the whole board steadier, brighter, and annoyingly hard to finish off.',
      modifiers: {
        heal: 3,
        maxHp: 6,
        defense: 1
      }
    }
  },
  enemyArchetypes: {
    raider: {
      id: 'raider',
      name: 'Goblin Raider',
      behavior: 'standard',
      maxHp: 12,
      damage: 4,
      range: 1,
      attackCooldownMs: 1030,
      moveCooldownMs: 860,
      fill: '#d96b5a',
      outline: '#6d231f',
      label: 'R',
      threat: 2
    },
    brute: {
      id: 'brute',
      name: 'Stone Brute',
      behavior: 'standard',
      maxHp: 22,
      damage: 7,
      range: 1,
      attackCooldownMs: 1320,
      moveCooldownMs: 1020,
      fill: '#c14b3f',
      outline: '#5c1715',
      label: 'B',
      threat: 4
    },
    chieftain: {
      id: 'chieftain',
      name: 'Steam Hog Chieftain',
      behavior: 'standard',
      maxHp: 52,
      damage: 10,
      range: 1,
      attackCooldownMs: 1100,
      moveCooldownMs: 930,
      fill: '#8c2d2d',
      outline: '#2f0909',
      label: 'C',
      threat: 10
    },
    pebble: {
      id: 'pebble',
      name: 'Pebble',
      behavior: 'pebble',
      maxHp: 260,
      damage: 18,
      range: 1,
      attackCooldownMs: 1550,
      moveCooldownMs: 1280,
      fill: '#8a5b3d',
      outline: '#2d1408',
      label: 'P',
      threat: 24
    },
    thirsty_user: {
      id: 'thirsty_user',
      name: 'Thirsty End User',
      behavior: 'swarm',
      maxHp: 7,
      damage: 1,
      range: 1,
      attackCooldownMs: 980,
      moveCooldownMs: 620,
      fill: '#cf7d62',
      outline: '#5f271f',
      label: 'U',
      threat: 2
    },
    electric_bather: {
      id: 'electric_bather',
      name: 'Electric Sauna User',
      behavior: 'electric',
      maxHp: 104,
      damage: 9,
      range: 2,
      attackCooldownMs: 1180,
      moveCooldownMs: 900,
      fill: '#5e7fb6',
      outline: '#14243d',
      label: 'E',
      threat: 18
    },
    escalation_manager: {
      id: 'escalation_manager',
      name: 'Escalation Manager',
      behavior: 'summoner',
      maxHp: 126,
      damage: 7,
      range: 2,
      attackCooldownMs: 1240,
      moveCooldownMs: 920,
      fill: '#7f4f5f',
      outline: '#2b121b',
      label: 'M',
      threat: 20
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
    },
    cedar_ring: {
      id: 'cedar_ring',
      kind: 'item',
      name: 'Cedar Ring',
      rarity: 'common',
      effectText: '+3 HP, +1 heal.',
      flavorText: 'Smells expensive even when it clearly was not.',
      artPath: 'loot/cedar-ring.svg',
      modifiers: {
        maxHp: 3,
        heal: 1
      }
    },
    ember_amulet: {
      id: 'ember_amulet',
      kind: 'item',
      name: 'Ember Amulet',
      rarity: 'rare',
      effectText: '+2 damage, -70 ms attack cooldown.',
      flavorText: 'Still glowing from a terrible idea that somehow worked.',
      artPath: 'loot/ember-amulet.svg',
      modifiers: {
        damage: 2,
        attackCooldownMs: -70
      }
    },
    iron_whisk: {
      id: 'iron_whisk',
      kind: 'item',
      name: 'Iron Whisk',
      rarity: 'epic',
      effectText: '+10 HP, +2 damage.',
      flavorText: 'Too heavy for normal sauna use, perfect for abnormal heroics.',
      artPath: 'loot/iron-whisk.svg',
      modifiers: {
        maxHp: 10,
        damage: 2
      }
    },
    sauna_salt: {
      id: 'sauna_salt',
      kind: 'item',
      name: 'Sauna Salt',
      rarity: 'common',
      effectText: '+1 range, -2 HP.',
      flavorText: 'Sharpens the senses and dries every lip in the building.',
      artPath: 'loot/sauna-salt.svg',
      modifiers: {
        range: 1,
        maxHp: -2
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
      effectText: 'Basic attacks sweep all enemies within 1 tile for full damage.',
      flavorText: 'Invented after one slippery sauna floor incident too many.',
      artPath: 'loot/spin-2-win.svg'
    },
    blink_step: {
      id: 'blink_step',
      kind: 'skill',
      name: 'Blink Step',
      rarity: 'rare',
      effectText: 'Below 50% HP, blink back to your home tile. Kills reset this 12s cooldown.',
      flavorText: 'A deeply unwise technique for entering rooms dramatically.',
      artPath: 'loot/blink-step.svg'
    },
    chain_spark: {
      id: 'chain_spark',
      kind: 'skill',
      name: 'Chain Spark',
      rarity: 'rare',
      effectText: 'Attacks arc bonus damage to one nearby enemy.',
      flavorText: 'The electricity is mostly symbolic, but the second target still hates it.',
      artPath: 'loot/chain-spark.svg'
    },
    steam_shield: {
      id: 'steam_shield',
      kind: 'skill',
      name: 'Steam Shield',
      rarity: 'common',
      effectText: 'After attacking, restore a little HP to yourself.',
      flavorText: 'Wraps the user in a smug, medicinal cloud.',
      artPath: 'loot/steam-shield.svg'
    },
    battle_hymn: {
      id: 'battle_hymn',
      kind: 'skill',
      name: 'Battle Hymn',
      rarity: 'epic',
      effectText: 'Attacks also pulse a small heal into a nearby ally.',
      flavorText: 'Half prayer, half terrace chant, all morale.',
      artPath: 'loot/battle-hymn.svg'
    }
  },
  alcoholDefinitions: {
    light_lager: {
      id: 'light_lager',
      name: 'Light Lager',
      flavorText: 'Crisp, brave, and just dumb enough to feel tactical.',
      price: 2,
      artPath: 'loot/sauna-salt.svg',
      positive: { damage: 1 },
      negative: { defense: 1 }
    },
    sauna_stout: {
      id: 'sauna_stout',
      name: 'Sauna Stout',
      flavorText: 'Heavy enough to count as emotional armor.',
      price: 3,
      artPath: 'loot/coal-heart.svg',
      positive: { maxHp: 8 },
      negative: { attackCooldownMs: 60 }
    },
    medic_mule: {
      id: 'medic_mule',
      name: 'Medic Mule',
      flavorText: 'A healing classic with terrible depth perception.',
      price: 3,
      artPath: 'loot/cedar-ring.svg',
      positive: { heal: 2 },
      negative: { range: 1 }
    },
    sniper_cider: {
      id: 'sniper_cider',
      name: 'Sniper Cider',
      flavorText: 'Sees farther, stands shakier.',
      price: 3,
      artPath: 'loot/bucket-boots.svg',
      positive: { range: 1 },
      negative: { maxHp: 4 }
    },
    boiler_ipa: {
      id: 'boiler_ipa',
      name: 'Boiler IPA',
      flavorText: 'Fast hands, dry throat, zero restraint.',
      price: 3,
      artPath: 'loot/ember-amulet.svg',
      positive: { attackCooldownMs: 60 },
      negative: { regenHpPerSecond: 1 }
    },
    birch_porter: {
      id: 'birch_porter',
      name: 'Birch Porter',
      flavorText: 'Makes everyone sturdier and significantly less subtle.',
      price: 2,
      artPath: 'loot/towel-wrap.svg',
      positive: { defense: 1 },
      negative: { damage: 1 }
    },
    lucky_pils: {
      id: 'lucky_pils',
      name: 'Lucky Pils',
      flavorText: 'Loot gets luckier, decision-making gets worse.',
      price: 4,
      artPath: 'loot/birch-charm.svg',
      positive: { lootChance: 0.08 },
      negative: { rewardSisu: 1 }
    },
    overproof_koskenkorva: {
      id: 'overproof_koskenkorva',
      name: 'Overproof Koskenkorva',
      flavorText: 'Hits like a train, patches like an apology.',
      price: 4,
      artPath: 'loot/iron-whisk.svg',
      positive: { damage: 2 },
      negative: { heal: 2 }
    }
  },
  globalModifierDefinitions: {
    iron_brotherhood: {
      id: 'iron_brotherhood',
      name: 'Iron Brotherhood',
      description: 'Each Frontline Tank on the board hardens the whole roster.',
      countScope: 'board',
      source: { kind: 'template', templateId: 'guardian' },
      effectStat: 'defense',
      amountPerStack: 1
    },
    triage_circle: {
      id: 'triage_circle',
      name: 'Triage Circle',
      description: 'Living Sauna Medics keep everyone slowly recovering.',
      countScope: 'living',
      source: { kind: 'template', templateId: 'mender' },
      effectStat: 'regenHpPerSecond',
      amountPerStack: 1
    },
    fallen_saints: {
      id: 'fallen_saints',
      name: 'Fallen Saints',
      description: 'Each fallen Sauna Medic steels the survivors against the next hit.',
      countScope: 'dead',
      source: { kind: 'template', templateId: 'mender' },
      effectStat: 'defense',
      amountPerStack: 1
    },
    stone_oath: {
      id: 'stone_oath',
      name: 'Stone Oath',
      description: 'Stonewalls turn the board into a safer place for everyone.',
      countScope: 'board',
      source: { kind: 'subclass', subclassId: 'stonewall' },
      effectStat: 'defense',
      amountPerStack: 1
    },
    bastion_engine: {
      id: 'bastion_engine',
      name: 'Bastion Engine',
      description: 'Iron Bastions turn every frontline into a thicker wall of bad news.',
      countScope: 'living',
      source: { kind: 'subclass', subclassId: 'iron_bastion' },
      effectStat: 'maxHp',
      amountPerStack: 3
    },
    coal_echoes: {
      id: 'coal_echoes',
      name: 'Coal Echoes',
      description: 'Coalflingers make the whole squad hit harder.',
      countScope: 'living',
      source: { kind: 'subclass', subclassId: 'coalflinger' },
      effectStat: 'damage',
      amountPerStack: 1
    },
    scope_lattice: {
      id: 'scope_lattice',
      name: 'Scope Lattice',
      description: 'Ash Scopes help the whole roster line up cleaner shots through the steam.',
      countScope: 'living',
      source: { kind: 'subclass', subclassId: 'ash_scope' },
      effectStat: 'range',
      amountPerStack: 1
    },
    oracle_draft: {
      id: 'oracle_draft',
      name: 'Oracle Draft',
      description: 'Towel Oracles extend everyone’s reach through the steam.',
      countScope: 'living',
      source: { kind: 'subclass', subclassId: 'towel_oracle' },
      effectStat: 'range',
      amountPerStack: 1
    },
    afterglow_watch: {
      id: 'afterglow_watch',
      name: 'Afterglow Watch',
      description: 'Afterglow Wardens leave the whole room steadier and harder to wear down.',
      countScope: 'living',
      source: { kind: 'subclass', subclassId: 'afterglow_warden' },
      effectStat: 'regenHpPerSecond',
      amountPerStack: 1
    },
    cinder_cadence: {
      id: 'cinder_cadence',
      name: 'Cinder Cadence',
      description: 'Each Fireball user quickens the whole roster’s rhythm.',
      countScope: 'living',
      source: { kind: 'skill', skillId: 'fireball' },
      effectStat: 'attackCooldownMs',
      amountPerStack: -40
    },
    battle_psalm: {
      id: 'battle_psalm',
      name: 'Battle Psalm',
      description: 'Battle Hymns lift the whole team’s healing output.',
      countScope: 'living',
      source: { kind: 'skill', skillId: 'battle_hymn' },
      effectStat: 'heal',
      amountPerStack: 1
    },
    shield_mist: {
      id: 'shield_mist',
      name: 'Shield Mist',
      description: 'Steam Shields make the whole team tougher.',
      countScope: 'living',
      source: { kind: 'skill', skillId: 'steam_shield' },
      effectStat: 'defense',
      amountPerStack: 1
    },
    cedar_swear: {
      id: 'cedar_swear',
      name: 'Cedar Swear',
      description: 'Cedar Rings bulk up everyone in the room.',
      countScope: 'living',
      source: { kind: 'item', itemId: 'cedar_ring' },
      effectStat: 'maxHp',
      amountPerStack: 2
    },
    whisk_discipline: {
      id: 'whisk_discipline',
      name: 'Whisk Discipline',
      description: 'Iron Whisks teach the whole team to brace for impact.',
      countScope: 'living',
      source: { kind: 'item', itemId: 'iron_whisk' },
      effectStat: 'defense',
      amountPerStack: 1
    },
    salt_sight: {
      id: 'salt_sight',
      name: 'Salt Sight',
      description: 'Sauna Salt sharpens the reach of every ally.',
      countScope: 'living',
      source: { kind: 'item', itemId: 'sauna_salt' },
      effectStat: 'range',
      amountPerStack: 1
    },
    loylylordi_lineage: {
      id: 'loylylordi_lineage',
      name: 'Loylylordi Lineage',
      description: 'Every Loylylordi raises the damage ceiling for the whole roster.',
      countScope: 'living',
      source: { kind: 'title', title: 'Loylylordi' },
      effectStat: 'damage',
      amountPerStack: 1
    },
    vihtavelho_vow: {
      id: 'vihtavelho_vow',
      name: 'Vihtavelho Vow',
      description: 'Vihtavelhot turn every heal into a slightly bigger miracle.',
      countScope: 'living',
      source: { kind: 'title', title: 'Vihtavelho' },
      effectStat: 'heal',
      amountPerStack: 1
    },
    saunklonkku_requiem: {
      id: 'saunklonkku_requiem',
      name: 'Saunklonkku Requiem',
      description: 'Dead Saunklonkkus leave behind a harsher fighting spirit.',
      countScope: 'dead',
      source: { kind: 'title', title: 'Saunklonkku' },
      effectStat: 'damage',
      amountPerStack: 1
    },
    shared_grit: {
      id: 'shared_grit',
      name: 'Shared Grit',
      description: 'Fallback doctrine: every living hero adds a little bulk to everyone.',
      countScope: 'living',
      source: { kind: 'roster' },
      effectStat: 'maxHp',
      amountPerStack: 1,
      isFallback: true
    },
    steady_hands: {
      id: 'steady_hands',
      name: 'Steady Hands',
      description: 'Fallback doctrine: a full room speeds everyone up.',
      countScope: 'living',
      source: { kind: 'roster' },
      effectStat: 'attackCooldownMs',
      amountPerStack: -15,
      isFallback: true
    },
    campfire_doctrine: {
      id: 'campfire_doctrine',
      name: 'Campfire Doctrine',
      description: 'Fallback doctrine: every living hero inspires a bit more healing.',
      countScope: 'living',
      source: { kind: 'roster' },
      effectStat: 'heal',
      amountPerStack: 1,
      isFallback: true
    }
  },
  metaUpgrades: {
    roster_capacity: {
      id: 'roster_capacity',
      name: 'More Weirdos',
      description: 'Increase both roster capacity and how many defenders can fit on the board.',
      baseCost: 4,
      costStep: 4,
      maxLevel: 3
    },
    inventory_slots: {
      id: 'inventory_slots',
      name: 'Overflow Stash',
      description: 'Unlock the loot stash, then expand how many overflow drops it can hold.',
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
    },
    beer_shop_unlock: {
      id: 'beer_shop_unlock',
      name: 'Beer Shop',
      description: 'Unlock the bartender and his risky run-long drinks between runs.',
      baseCost: 6,
      costStep: 0,
      maxLevel: 1
    },
    beer_shop_level: {
      id: 'beer_shop_level',
      name: 'Beer Shop Level',
      description: 'Increase bartender stock and unlock more active drink slots.',
      baseCost: 4,
      costStep: 3,
      maxLevel: 3
    },
    sauna_auto_deploy: {
      id: 'sauna_auto_deploy',
      name: 'Auto Deploy',
      description: 'When a board hero dies, the sauna hero jumps in automatically.',
      baseCost: 7,
      costStep: 0,
      maxLevel: 1
    },
    sauna_slap_swap: {
      id: 'sauna_slap_swap',
      name: 'Slap Swap',
      description: 'Once per wave, a badly hurt board hero swaps with the sauna hero.',
      baseCost: 12,
      costStep: 0,
      maxLevel: 1
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
