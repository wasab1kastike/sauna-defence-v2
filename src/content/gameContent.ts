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
    sisuAttackMultiplier: 1.08,
    sisuDamageMultiplier: 1.25,
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
    cyclePressureBase: 7,
    cyclePressureStep: 6,
    wavePressureStep: 3,
    minSpawnIntervalMs: 320,
    spawnIntervalStepMs: 80,
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
  },
  defenderSubclasses: {
    stonewall: {
      id: 'stonewall',
      templateId: 'guardian',
      unlockLevel: 5,
      name: 'Stonewall',
      description: 'Turns every close-range hit into a painful mistake for the attacker.',
      signatureId: 'retaliate_adjacent',
      effectText: 'When hit by an adjacent enemy, strike back for 2 damage.',
      statText: '+10 HP, +120 ms attack cooldown.',
      modifiers: {
        maxHp: 10,
        attackCooldownMs: 120
      }
    },
    emberguard: {
      id: 'emberguard',
      templateId: 'guardian',
      unlockLevel: 5,
      name: 'Emberguard',
      description: 'Each swing splashes heat into the whole scrum around the target.',
      signatureId: 'melee_splash',
      effectText: 'Basic attacks splash 45% damage to enemies adjacent to the target.',
      statText: '+2 damage, -90 ms attack cooldown, -3 HP.',
      modifiers: {
        damage: 2,
        attackCooldownMs: -90,
        maxHp: -3
      }
    },
    iron_bastion: {
      id: 'iron_bastion',
      templateId: 'guardian',
      unlockLevel: 10,
      name: 'Iron Bastion',
      description: 'Radiates heavy calm that makes nearby allies harder to break.',
      signatureId: 'defense_aura',
      effectText: 'Allies within 1 tile gain +1 DEF and +2 max HP.',
      statText: '+8 HP, +1 DEF.',
      modifiers: {
        maxHp: 8,
        defense: 1
      }
    },
    revenge_coals: {
      id: 'revenge_coals',
      templateId: 'guardian',
      unlockLevel: 10,
      name: 'Revenge Coals',
      description: 'Getting hit showers the lane with spiteful burning fragments.',
      signatureId: 'retaliate_burst',
      effectText: 'When hit, the attacker takes 3 damage and nearby enemies take 1.',
      statText: '+1 damage, -70 ms attack cooldown.',
      modifiers: {
        damage: 1,
        attackCooldownMs: -70
      }
    },
    bench_oak: {
      id: 'bench_oak',
      templateId: 'guardian',
      unlockLevel: 15,
      name: 'Bench Oak',
      description: 'Plants itself into the lane and sweeps crowds instead of trading punches.',
      signatureId: 'adjacent_spin',
      effectText: 'If at least 2 enemies are adjacent, basic attacks hit all adjacent enemies for full damage.',
      statText: '+12 HP, +1 DEF, +80 ms attack cooldown.',
      modifiers: {
        maxHp: 12,
        attackCooldownMs: 80,
        defense: 1
      }
    },
    steam_bulwark: {
      id: 'steam_bulwark',
      templateId: 'guardian',
      unlockLevel: 15,
      name: 'Steam Bulwark',
      description: 'Each attack hardens the line by patching up the front.',
      signatureId: 'attack_guard_pulse',
      effectText: 'After attacking, heal self for 3 and the nearest ally within 1 tile for 2.',
      statText: '+2 damage, +1 DEF.',
      modifiers: {
        damage: 2,
        defense: 1
      }
    },
    avalanche_oath: {
      id: 'avalanche_oath',
      templateId: 'guardian',
      unlockLevel: 20,
      name: 'Avalanche Oath',
      description: 'Each impact caves the whole pack inward around the first victim.',
      signatureId: 'heavy_impact_splash',
      effectText: 'Melee hits deal 60% splash damage to enemies adjacent to the target.',
      statText: '+12 HP, +2 damage, +1 DEF.',
      modifiers: {
        maxHp: 12,
        damage: 2,
        defense: 1
      }
    },
    last_ladle: {
      id: 'last_ladle',
      templateId: 'guardian',
      unlockLevel: 20,
      name: 'Last Ladle',
      description: 'Finishing blows turn into a fast second sermon while the enemy is reeling.',
      signatureId: 'finisher_double_tap',
      effectText: 'Against targets below 50% HP, immediately strike again for 70% damage.',
      statText: '+3 damage, -110 ms attack cooldown, +2 HP.',
      modifiers: {
        damage: 3,
        attackCooldownMs: -110,
        maxHp: 2
      }
    },
    coalflinger: {
      id: 'coalflinger',
      templateId: 'hurler',
      unlockLevel: 5,
      name: 'Coalflinger',
      description: 'Throws packed coals that burst and singe everything near the hit.',
      signatureId: 'ranged_splash',
      effectText: 'Every throw splashes 35% damage in radius 1 around the target.',
      statText: '+1 damage.',
      modifiers: {
        damage: 1
      }
    },
    bucket_sniper: {
      id: 'bucket_sniper',
      templateId: 'hurler',
      unlockLevel: 5,
      name: 'Bucket Sniper',
      description: 'Prefers the long lane and punishes enemies caught at the edge of reach.',
      signatureId: 'max_range_focus',
      effectText: 'Prioritizes the farthest target in range and gains +2 damage at max range.',
      statText: '+1 range, +110 ms attack cooldown, +1 damage.',
      modifiers: {
        range: 1,
        attackCooldownMs: 110,
        damage: 1
      }
    },
    spark_juggler: {
      id: 'spark_juggler',
      templateId: 'hurler',
      unlockLevel: 10,
      name: 'Spark Juggler',
      description: 'Turns one attack into a frantic cascade of three smaller bolts.',
      signatureId: 'triple_bolt',
      effectText: 'Fire 3 bolts per attack at up to 3 enemies for 55% damage each.',
      statText: '-20 ms attack cooldown.',
      modifiers: {
        attackCooldownMs: -20
      }
    },
    ash_scope: {
      id: 'ash_scope',
      templateId: 'hurler',
      unlockLevel: 10,
      name: 'Ash Scope',
      description: 'Reads ricochet lines through steam and lets one hit jump onward.',
      signatureId: 'single_chain',
      effectText: 'Primary hits chain to 1 nearby enemy within 2 tiles for 50% damage.',
      statText: '+1 range, +1 damage.',
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
      description: 'Every careful throw is followed by a second, faster follow-up shot.',
      signatureId: 'double_shot',
      effectText: 'Each attack fires a second shot for 70% damage at the same or nearest target.',
      statText: '+1 damage, +1 range, +70 ms attack cooldown.',
      modifiers: {
        damage: 1,
        range: 1,
        attackCooldownMs: 70
      }
    },
    shock_pitcher: {
      id: 'shock_pitcher',
      templateId: 'hurler',
      unlockLevel: 15,
      name: 'Shock Pitcher',
      description: 'Throws live trouble that forks through clustered enemies.',
      signatureId: 'double_chain',
      effectText: 'Primary hits chain to 2 nearby enemies within 2 tiles for 45% damage each.',
      statText: '+2 damage, -90 ms attack cooldown, -1 HP.',
      modifiers: {
        damage: 2,
        attackCooldownMs: -90,
        maxHp: -1
      }
    },
    meteor_bucket: {
      id: 'meteor_bucket',
      templateId: 'hurler',
      unlockLevel: 20,
      name: 'Meteor Bucket',
      description: 'Each hit lands like a tiny fireball and scorches a whole patch of board.',
      signatureId: 'fireblast_throw',
      effectText: 'Every hit also deals 60% splash damage in radius 1 with fireblast FX.',
      statText: '+3 damage, +1 range, +40 ms attack cooldown.',
      modifiers: {
        damage: 3,
        range: 1,
        attackCooldownMs: 40
      }
    },
    white_heat_gunner: {
      id: 'white_heat_gunner',
      templateId: 'hurler',
      unlockLevel: 20,
      name: 'White Heat Gunner',
      description: 'Executes weak targets and immediately snaps to the next opening.',
      signatureId: 'execute_and_retarget',
      effectText: 'Deal +4 damage to enemies below 40% HP. If the primary target dies, fire a 60% retarget shot.',
      statText: '+3 damage, -110 ms attack cooldown, -2 HP.',
      modifiers: {
        damage: 3,
        attackCooldownMs: -110,
        maxHp: -2
      }
    },
    steampriest: {
      id: 'steampriest',
      templateId: 'mender',
      unlockLevel: 5,
      name: 'Steam Priest',
      description: 'Primary heals ripple outward into the cluster around the patient.',
      signatureId: 'heal_pulse_target',
      effectText: 'Primary heals also restore 50% heal to allies adjacent to the healed target.',
      statText: '+1 heal, +60 ms attack cooldown.',
      modifiers: {
        heal: 1,
        attackCooldownMs: 60
      }
    },
    towel_oracle: {
      id: 'towel_oracle',
      templateId: 'mender',
      unlockLevel: 5,
      name: 'Towel Oracle',
      description: 'When no urgent healing is needed, every attack still sneaks in support.',
      signatureId: 'support_on_attack',
      effectText: 'When attacking instead of healing, also heal the lowest-HP ally in range for 2.',
      statText: '+1 range, -40 ms attack cooldown.',
      modifiers: {
        range: 1,
        attackCooldownMs: -40
      }
    },
    cedar_surgeon: {
      id: 'cedar_surgeon',
      templateId: 'mender',
      unlockLevel: 10,
      name: 'Cedar Surgeon',
      description: 'Finds the critical cases first and pours extra help into them.',
      signatureId: 'emergency_bonus_heal',
      effectText: 'Targets below 50% HP receive +3 bonus healing.',
      statText: '+2 heal, +1 regen/s.',
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
      description: 'Spreads one treatment across two bodies instead of overcommitting to one.',
      signatureId: 'double_heal',
      effectText: 'Each heal affects the two most injured allies in range for 80% heal each.',
      statText: '+1 range, -70 ms attack cooldown.',
      modifiers: {
        range: 1,
        attackCooldownMs: -70
      }
    },
    pulse_keeper: {
      id: 'pulse_keeper',
      templateId: 'mender',
      unlockLevel: 15,
      name: 'Pulse Keeper',
      description: 'Every successful heal also steadies the patient and the medic together.',
      signatureId: 'rescue_pair_heal',
      effectText: 'After healing, the primary target and the mender each recover 2 extra HP.',
      statText: '+2 heal, -40 ms attack cooldown.',
      modifiers: {
        heal: 2,
        attackCooldownMs: -40
      }
    },
    rescue_ritualist: {
      id: 'rescue_ritualist',
      templateId: 'mender',
      unlockLevel: 15,
      name: 'Rescue Ritualist',
      description: 'Pushes a short healing wave outward from their own tile every time they work.',
      signatureId: 'self_centered_heal_wave',
      effectText: 'Every heal sends 2 HP to all allies within 1 tile of the mender.',
      statText: '+1 heal, +1 range, +4 HP.',
      modifiers: {
        heal: 1,
        range: 1,
        maxHp: 4
      }
    },
    saint_of_steam: {
      id: 'saint_of_steam',
      templateId: 'mender',
      unlockLevel: 20,
      name: 'Saint Of Steam',
      description: 'Turns each main heal into a boardwide blessing across the whole support radius.',
      signatureId: 'full_range_benediction',
      effectText: 'Every heal also affects all injured allies in range for 60% heal.',
      statText: '+3 heal, +1 regen/s, +1 range.',
      modifiers: {
        heal: 3,
        regenHpPerSecond: 1,
        range: 1
      }
    },
    afterglow_warden: {
      id: 'afterglow_warden',
      templateId: 'mender',
      unlockLevel: 20,
      name: 'Afterglow Warden',
      description: 'Wraps nearby allies in lingering aftercare and tops up the whole line after each heal.',
      signatureId: 'aftercare_aura',
      effectText: 'Allies within 1 tile gain +1 DEF and +1 regen. Every heal also restores 1 HP to all living board allies.',
      statText: '+2 heal, +4 HP, +1 DEF.',
      modifiers: {
        heal: 2,
        maxHp: 4,
        defense: 1
      }
    }
  },
  enemyArchetypes: {
    raider: {
      id: 'raider',
      name: 'Goblin Raider',
      behavior: 'standard',
      description: 'A fast melee pest that rushes the nearest defender and starts stabbing immediately.',
      lore: 'Claims every stolen ladle is a cultural artifact.',
      maxHp: 12,
      damage: 4,
      range: 1,
      attackCooldownMs: 1215,
      moveCooldownMs: 1000,
      fill: '#d96b5a',
      outline: '#6d231f',
      label: 'R',
      threat: 2
    },
    brute: {
      id: 'brute',
      name: 'Stone Brute',
      behavior: 'standard',
      description: 'A slower frontline bruiser with more health and heavier hits than a raider.',
      lore: 'Still convinced doors are a conspiracy against shoulders.',
      maxHp: 22,
      damage: 7,
      range: 1,
      attackCooldownMs: 1560,
      moveCooldownMs: 1185,
      fill: '#c14b3f',
      outline: '#5c1715',
      label: 'B',
      threat: 4
    },
    chieftain: {
      id: 'chieftain',
      name: 'Steam Hog Chieftain',
      behavior: 'standard',
      description: 'An elite lane crusher with boss-tier bulk for a normal wave threat.',
      lore: 'Promoted itself after winning one argument and eating the minutes.',
      maxHp: 52,
      damage: 10,
      range: 1,
      attackCooldownMs: 1300,
      moveCooldownMs: 1080,
      fill: '#8c2d2d',
      outline: '#2f0909',
      label: 'C',
      threat: 10
    },
    pebble: {
      id: 'pebble',
      name: 'Pebble',
      behavior: 'pebble',
      description: 'A giant tunneling worm boss that ignores heroes and slithers straight toward the sauna.',
      lore: 'Named Pebble by someone who had never seen a pebble before.',
      maxHp: 260,
      damage: 18,
      range: 1,
      attackCooldownMs: 1830,
      moveCooldownMs: 1485,
      fill: '#8a5b3d',
      outline: '#2d1408',
      label: 'P',
      threat: 24
    },
    thirsty_user: {
      id: 'thirsty_user',
      name: 'Thirsty End User',
      behavior: 'swarm',
      description: 'A weak swarm unit that becomes dangerous when too many thirsty users stay alive together.',
      lore: 'Opened eight duplicate tickets because the first seven felt lonely.',
      maxHp: 7,
      damage: 1,
      range: 1,
      attackCooldownMs: 1155,
      moveCooldownMs: 720,
      fill: '#cf7d62',
      outline: '#5f271f',
      label: 'U',
      threat: 2
    },
    electric_bather: {
      id: 'electric_bather',
      name: 'Electric Sauna User',
      behavior: 'electric',
      description: 'A ranged boss that shocks clustered heroes and chains electricity through wet targets.',
      lore: 'Read one safety poster and took it as a personal challenge.',
      maxHp: 104,
      damage: 9,
      range: 2,
      attackCooldownMs: 1390,
      moveCooldownMs: 1045,
      fill: '#5e7fb6',
      outline: '#14243d',
      label: 'E',
      threat: 18
    },
    escalation_manager: {
      id: 'escalation_manager',
      name: 'Escalation Manager',
      behavior: 'summoner',
      description: 'A support boss that summons thirsty users and shrugs off damage while its minions remain alive.',
      lore: 'Has never solved a problem directly when three meetings could do less.',
      maxHp: 126,
      damage: 7,
      range: 2,
      attackCooldownMs: 1465,
      moveCooldownMs: 1065,
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
      artPath: 'loot/lucky-ladle.png',
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
      artPath: 'loot/coal-heart.png',
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
      artPath: 'loot/towel-wrap.png',
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
      artPath: 'loot/bucket-boots.png',
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
      artPath: 'loot/birch-charm.png',
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
      artPath: 'loot/cedar-ring.png',
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
      artPath: 'loot/ember-amulet.png',
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
      artPath: 'loot/iron-whisk.png',
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
      artPath: 'loot/sauna-salt.png',
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
      artPath: 'loot/fireball.png'
    },
    spin2win: {
      id: 'spin2win',
      kind: 'skill',
      name: 'Spin 2 Win',
      rarity: 'epic',
      effectText: 'Basic attacks sweep all enemies within 1 tile for full damage.',
      flavorText: 'Invented after one slippery sauna floor incident too many.',
      artPath: 'loot/spin-2-win.png'
    },
    blink_step: {
      id: 'blink_step',
      kind: 'skill',
      name: 'Blink Step',
      rarity: 'rare',
      effectText: 'Below 50% HP, blink back to your home tile. Kills reset this 12s cooldown.',
      flavorText: 'A deeply unwise technique for entering rooms dramatically.',
      artPath: 'loot/blink-step.png'
    },
    chain_spark: {
      id: 'chain_spark',
      kind: 'skill',
      name: 'Chain Spark',
      rarity: 'rare',
      effectText: 'Attacks arc bonus damage to one nearby enemy.',
      flavorText: 'The electricity is mostly symbolic, but the second target still hates it.',
      artPath: 'loot/chain-spark.png'
    },
    steam_shield: {
      id: 'steam_shield',
      kind: 'skill',
      name: 'Steam Shield',
      rarity: 'common',
      effectText: 'After attacking, restore a little HP to yourself.',
      flavorText: 'Wraps the user in a smug, medicinal cloud.',
      artPath: 'loot/steam-shield.png'
    },
    battle_hymn: {
      id: 'battle_hymn',
      kind: 'skill',
      name: 'Battle Hymn',
      rarity: 'epic',
      effectText: 'Attacks also pulse a small heal into a nearby ally.',
      flavorText: 'Half prayer, half terrace chant, all morale.',
      artPath: 'loot/battle-hymn.png'
    }
  },
  alcoholDefinitions: {
    light_lager: {
      id: 'light_lager',
      name: 'Light Lager',
      flavorText: 'Crisp, brave, and just dumb enough to feel tactical.',
      price: 2,
      artPath: 'loot/sauna-salt.png',
      positive: { damage: 1 },
      negative: { defense: 1 }
    },
    sauna_stout: {
      id: 'sauna_stout',
      name: 'Sauna Stout',
      flavorText: 'Heavy enough to count as emotional armor.',
      price: 3,
      artPath: 'loot/coal-heart.png',
      positive: { maxHp: 8 },
      negative: { attackCooldownMs: 60 }
    },
    medic_mule: {
      id: 'medic_mule',
      name: 'Medic Mule',
      flavorText: 'A healing classic with terrible depth perception.',
      price: 3,
      artPath: 'loot/cedar-ring.png',
      positive: { heal: 2 },
      negative: { range: 1 }
    },
    sniper_cider: {
      id: 'sniper_cider',
      name: 'Sniper Cider',
      flavorText: 'Sees farther, stands shakier.',
      price: 3,
      artPath: 'loot/bucket-boots.png',
      positive: { range: 1 },
      negative: { maxHp: 4 }
    },
    boiler_ipa: {
      id: 'boiler_ipa',
      name: 'Boiler IPA',
      flavorText: 'Fast hands, dry throat, zero restraint.',
      price: 3,
      artPath: 'loot/ember-amulet.png',
      positive: { attackCooldownMs: 60 },
      negative: { regenHpPerSecond: 1 }
    },
    birch_porter: {
      id: 'birch_porter',
      name: 'Birch Porter',
      flavorText: 'Makes everyone sturdier and significantly less subtle.',
      price: 2,
      artPath: 'loot/towel-wrap.png',
      positive: { defense: 1 },
      negative: { damage: 1 }
    },
    lucky_pils: {
      id: 'lucky_pils',
      name: 'Lucky Pils',
      flavorText: 'Loot gets luckier, decision-making gets worse.',
      price: 4,
      artPath: 'loot/birch-charm.png',
      positive: { lootChance: 0.08 },
      negative: { rewardSisu: 1 }
    },
    overproof_koskenkorva: {
      id: 'overproof_koskenkorva',
      name: 'Overproof Koskenkorva',
      flavorText: 'Hits like a train, patches like an apology.',
      price: 4,
      artPath: 'loot/iron-whisk.png',
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
    loot_auto_assign: {
      id: 'loot_auto_assign',
      name: 'Auto Assign',
      description: 'Unlock a toggle that auto-equips loot into free item and skill slots.',
      baseCost: 5,
      costStep: 0,
      maxLevel: 1
    },
    loot_auto_upgrade: {
      id: 'loot_auto_upgrade',
      name: 'Auto Upgrade',
      description: 'Unlock a toggle that keeps rebuilding the best available item and skill loadouts.',
      baseCost: 8,
      costStep: 0,
      maxLevel: 1
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
