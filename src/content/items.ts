import type { GameContent, NamePools } from '../game/types';

export const itemDefinitions: GameContent['itemDefinitions'] = {
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
  };

export const skillDefinitions: GameContent['skillDefinitions'] = {
    fireball: {
      id: 'fireball',
      kind: 'skill',
      name: 'Fireball',
      rarity: 'rare',
      effectText: 'Every 12s your next basic attack marks a tile. After 1s, a fireball explodes there for full damage in radius 2.',
      flavorText: 'Marks the floor, lets everyone panic, then drops a whole bad afternoon on it.',
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
      effectText: 'If no target is in range, blink in for one attack. Below 50% HP, retreat home or near a healer. Kills reset this 12s cooldown.',
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
      effectText: 'On attack, grant self and adjacent allies +50% attack speed for 3s. 15s cooldown, reduced by 1s per kill.',
      flavorText: 'Half prayer, half terrace chant, all morale.',
      artPath: 'loot/battle-hymn.png'
    }
  };

export const alcoholDefinitions: GameContent['alcoholDefinitions'] = {
    light_lager: {
      id: 'light_lager',
      name: 'Light Lager',
      flavorText: 'Crisp, brave, and just dumb enough to feel tactical.',
      price: 8,
      artPath: 'loot/sauna-salt.png',
      positive: { damage: 1 },
      negative: { defense: 1 }
    },
    sauna_stout: {
      id: 'sauna_stout',
      name: 'Sauna Stout',
      flavorText: 'Heavy enough to count as emotional armor.',
      price: 10,
      artPath: 'loot/coal-heart.png',
      positive: { maxHp: 8 },
      negative: { attackCooldownMs: 60 }
    },
    medic_mule: {
      id: 'medic_mule',
      name: 'Medic Mule',
      flavorText: 'A healing classic with terrible depth perception.',
      price: 10,
      artPath: 'loot/cedar-ring.png',
      positive: { heal: 2 },
      negative: { range: 1 }
    },
    sniper_cider: {
      id: 'sniper_cider',
      name: 'Sniper Cider',
      flavorText: 'Sees farther, stands shakier.',
      price: 10,
      artPath: 'loot/bucket-boots.png',
      positive: { range: 1 },
      negative: { maxHp: 4 }
    },
    boiler_ipa: {
      id: 'boiler_ipa',
      name: 'Boiler IPA',
      flavorText: 'Fast hands, dry throat, zero restraint.',
      price: 11,
      artPath: 'loot/ember-amulet.png',
      positive: { attackCooldownMs: 60 },
      negative: { regenHpPerSecond: 1 }
    },
    birch_porter: {
      id: 'birch_porter',
      name: 'Birch Porter',
      flavorText: 'Makes everyone sturdier and significantly less subtle.',
      price: 8,
      artPath: 'loot/towel-wrap.png',
      positive: { defense: 1 },
      negative: { damage: 1 }
    },
    lucky_pils: {
      id: 'lucky_pils',
      name: 'Lucky Pils',
      flavorText: 'Loot gets luckier, decision-making gets worse.',
      price: 13,
      artPath: 'loot/birch-charm.png',
      positive: { lootChance: 0.08 },
      negative: { rewardSisu: 1 }
    },
    overproof_koskenkorva: {
      id: 'overproof_koskenkorva',
      name: 'Overproof Koskenkorva',
      flavorText: 'Hits like a train, patches like an apology.',
      price: 14,
      artPath: 'loot/iron-whisk.png',
      positive: { damage: 2 },
      negative: { heal: 2 }
    }
  };

export const globalModifierDefinitions: GameContent['globalModifierDefinitions'] = {
    iron_brotherhood: {
      id: 'iron_brotherhood',
      rarity: 'common',
      name: 'Iron Brotherhood',
      description: 'Each Frontline Tank on the board hardens the whole roster.',
      countScope: 'board',
      source: { kind: 'template', templateId: 'guardian' },
      effectStat: 'defense',
      amountPerStack: 1
    },
    triage_circle: {
      id: 'triage_circle',
      rarity: 'common',
      name: 'Triage Circle',
      description: 'Living Sauna Medics keep everyone slowly recovering.',
      countScope: 'living',
      source: { kind: 'template', templateId: 'mender' },
      effectStat: 'regenHpPerSecond',
      amountPerStack: 1
    },
    fallen_saints: {
      id: 'fallen_saints',
      rarity: 'rare',
      name: 'Fallen Throwers',
      description: 'Every fallen Backline Thrower leaves the survivors angrier and more accurate.',
      countScope: 'dead',
      source: { kind: 'template', templateId: 'hurler' },
      effectStat: 'damage',
      amountPerStack: 1
    },
    stone_oath: {
      id: 'stone_oath',
      rarity: 'rare',
      name: 'Stone Oath',
      description: 'Stonewalls turn the board into a safer place for everyone.',
      countScope: 'board',
      source: { kind: 'subclass', subclassId: 'stonewall' },
      effectStat: 'defense',
      amountPerStack: 1
    },
    bastion_engine: {
      id: 'bastion_engine',
      rarity: 'legendary',
      name: 'Mikko Engine',
      description: 'Every Mikko turns the whole roster into a thicker wall of bad decisions.',
      countScope: 'living',
      source: { kind: 'first_name', name: 'Mikko' },
      effectStat: 'maxHp',
      amountPerStack: 5
    },
    coal_echoes: {
      id: 'coal_echoes',
      rarity: 'common',
      name: 'Sofia Sparks',
      description: 'Every Sofia convinces the room that throwing harder is a real doctrine.',
      countScope: 'living',
      source: { kind: 'first_name', name: 'Sofia' },
      effectStat: 'damage',
      amountPerStack: 1
    },
    scope_lattice: {
      id: 'scope_lattice',
      rarity: 'epic',
      name: 'Arto Angle',
      description: 'Every Arto somehow finds one cleaner firing line through the steam.',
      countScope: 'living',
      source: { kind: 'first_name', name: 'Arto' },
      effectStat: 'range',
      amountPerStack: 1
    },
    oracle_draft: {
      id: 'oracle_draft',
      rarity: 'common',
      name: 'Jussi Draft',
      description: 'Towel Oracles extend everyone’s reach through the steam.',
      countScope: 'living',
      source: { kind: 'first_name', name: 'Jussi' },
      effectStat: 'heal',
      amountPerStack: 1
    },
    afterglow_watch: {
      id: 'afterglow_watch',
      rarity: 'epic',
      name: 'Afterglow Watch',
      description: 'Afterglow Wardens leave the whole room steadier and harder to wear down.',
      countScope: 'living',
      source: { kind: 'subclass', subclassId: 'afterglow_warden' },
      effectStat: 'regenHpPerSecond',
      amountPerStack: 1
    },
    cinder_cadence: {
      id: 'cinder_cadence',
      rarity: 'rare',
      name: 'Cinder Cadence',
      description: 'Each Fireball user quickens the whole roster’s rhythm.',
      countScope: 'living',
      source: { kind: 'skill', skillId: 'fireball' },
      effectStat: 'attackCooldownMs',
      amountPerStack: -40
    },
    battle_psalm: {
      id: 'battle_psalm',
      rarity: 'legendary',
      name: 'Henri Hymnal',
      description: 'Battle Hymns lift the whole team’s healing output.',
      countScope: 'living',
      source: { kind: 'first_name', name: 'Henri' },
      effectStat: 'heal',
      amountPerStack: 3
    },
    shield_mist: {
      id: 'shield_mist',
      rarity: 'common',
      name: 'Shield Mist',
      description: 'Steam Shields make the whole team tougher.',
      countScope: 'living',
      source: { kind: 'skill', skillId: 'steam_shield' },
      effectStat: 'defense',
      amountPerStack: 1
    },
    cedar_swear: {
      id: 'cedar_swear',
      rarity: 'rare',
      name: 'Laudekuningas Oath',
      description: 'Every Laudekuningas convinces the whole squad to carry themselves like royalty.',
      countScope: 'living',
      source: { kind: 'title', title: 'Laudekuningas' },
      effectStat: 'maxHp',
      amountPerStack: 3
    },
    whisk_discipline: {
      id: 'whisk_discipline',
      rarity: 'epic',
      name: 'Whisk Discipline',
      description: 'Iron Whisks teach the whole team to brace for impact.',
      countScope: 'living',
      source: { kind: 'item', itemId: 'iron_whisk' },
      effectStat: 'defense',
      amountPerStack: 1
    },
    salt_sight: {
      id: 'salt_sight',
      rarity: 'common',
      name: 'Kiuaskuiskaaja Sight',
      description: 'Kiuaskuiskaajat somehow keep every ally one step ahead of the steam.',
      countScope: 'living',
      source: { kind: 'title', title: 'Kiuaskuiskaaja' },
      effectStat: 'range',
      amountPerStack: 1
    },
    loylylordi_lineage: {
      id: 'loylylordi_lineage',
      rarity: 'epic',
      name: 'Loylylordi Lineage',
      description: 'Every Loylylordi raises the damage ceiling for the whole roster.',
      countScope: 'living',
      source: { kind: 'title', title: 'Loylylordi' },
      effectStat: 'damage',
      amountPerStack: 2
    },
    vihtavelho_vow: {
      id: 'vihtavelho_vow',
      rarity: 'rare',
      name: 'Vihtavelho Vow',
      description: 'Vihtavelhot turn every heal into a slightly bigger miracle.',
      countScope: 'living',
      source: { kind: 'title', title: 'Vihtavelho' },
      effectStat: 'heal',
      amountPerStack: 1
    },
    saunklonkku_requiem: {
      id: 'saunklonkku_requiem',
      rarity: 'epic',
      name: 'Saunklonkku Requiem',
      description: 'Dead Saunklonkkus leave behind a harsher fighting spirit.',
      countScope: 'dead',
      source: { kind: 'title', title: 'Saunklonkku' },
      effectStat: 'damage',
      amountPerStack: 2
    },
    shared_grit: {
      id: 'shared_grit',
      rarity: 'common',
      name: 'Shared Grit',
      description: 'Each Backline Thrower keeps the whole room leaning harder into offense.',
      countScope: 'living',
      source: { kind: 'template', templateId: 'hurler' },
      effectStat: 'damage',
      amountPerStack: 1
    },
    steady_hands: {
      id: 'steady_hands',
      rarity: 'rare',
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
      rarity: 'common',
      name: 'Campfire Doctrine',
      description: 'Fallback doctrine: every living hero inspires a bit more healing.',
      countScope: 'living',
      source: { kind: 'roster' },
      effectStat: 'heal',
      amountPerStack: 1,
      isFallback: true
    }
  };

export const metaUpgrades: GameContent['metaUpgrades'] = {
    roster_capacity: {
      id: 'roster_capacity',
      name: 'More Weirdos',
      description: 'Increase both roster capacity and how many defenders can fit on the board.',
      section: 'core',
      baseCost: 5,
      costStep: 5,
      maxLevel: 5
    },
    sauna_capacity: {
      id: 'sauna_capacity',
      name: 'More Steam Benches',
      description: 'Add one more permanent sauna reserve slot to future runs.',
      section: 'sauna',
      baseCost: 6,
      costStep: 6,
      maxLevel: 3
    },
    inventory_slots: {
      id: 'inventory_slots',
      name: 'Overflow Stash',
      description: 'Unlock the loot stash, then expand how many overflow drops it can hold.',
      section: 'core',
      baseCost: 4,
      costStep: 4,
      maxLevel: 5
    },
    loot_luck: {
      id: 'loot_luck',
      name: 'Sticky Fingers',
      description: 'Increase overall drop chance.',
      section: 'loot',
      baseCost: 4,
      costStep: 4,
      maxLevel: 5
    },
    loot_rarity: {
      id: 'loot_rarity',
      name: 'Boss Sniffer',
      description: 'Shift drops toward better rarities.',
      section: 'loot',
      baseCost: 6,
      costStep: 5,
      maxLevel: 5
    },
    loot_auto_assign: {
      id: 'loot_auto_assign',
      name: 'Auto Assign',
      description: 'Unlock a toggle that auto-equips loot into free item and skill slots.',
      section: 'loot',
      baseCost: 6,
      costStep: 0,
      maxLevel: 1
    },
    loot_auto_upgrade: {
      id: 'loot_auto_upgrade',
      name: 'Auto Upgrade',
      description: 'Unlock a toggle that keeps rebuilding the best available item and skill loadouts.',
      section: 'loot',
      baseCost: 10,
      costStep: 0,
      maxLevel: 1
    },
    item_slots: {
      id: 'item_slots',
      name: 'More Pockets Per Hero',
      description: 'Give every defender one more item slot.',
      section: 'loot',
      baseCost: 7,
      costStep: 6,
      maxLevel: 4
    },
    hall_of_fame_unlock: {
      id: 'hall_of_fame_unlock',
      name: 'Sauna Hall of Fame',
      description: 'Unlock a permanent board landmark where title and name buffs live between runs.',
      section: 'hall_of_fame',
      baseCost: 8,
      costStep: 0,
      maxLevel: 1
    },
    beer_shop_unlock: {
      id: 'beer_shop_unlock',
      name: 'Beer Shop',
      description: 'Unlock the bartender and his risky run-long drinks between runs.',
      section: 'beer_shop',
      baseCost: 8,
      costStep: 0,
      maxLevel: 1
    },
    beer_shop_level: {
      id: 'beer_shop_level',
      name: 'Beer Shop Level',
      description: 'Increase bartender stock and unlock more active drink slots.',
      section: 'beer_shop',
      baseCost: 6,
      costStep: 5,
      maxLevel: 5
    },
    sauna_auto_deploy: {
      id: 'sauna_auto_deploy',
      name: 'Auto Deploy',
      description: 'When a board hero dies, the sauna hero jumps in automatically.',
      section: 'sauna',
      baseCost: 8,
      costStep: 0,
      maxLevel: 1
    },
    sauna_slap_swap: {
      id: 'sauna_slap_swap',
      name: 'Slap Swap',
      description: 'Once per wave, a badly hurt board hero swaps with the sauna hero.',
      section: 'sauna',
      baseCost: 12,
      costStep: 0,
      maxLevel: 1
    }
  };

export const nameMasteries: GameContent['nameMasteries'] = {
    laudekuningas: {
      id: 'laudekuningas',
      category: 'title',
      name: 'Laudekuningas',
      description: 'Matching heroes grow harder to push off the benches.',
      matchValue: 'Laudekuningas',
      effectStat: 'maxHp',
      amountPerRank: 6,
      baseCost: 4,
      costStep: 4,
      maxLevel: 5
    },
    loylylordi: {
      id: 'loylylordi',
      category: 'title',
      name: 'Loylylordi',
      description: 'Matching heroes hit harder with every rank.',
      matchValue: 'Loylylordi',
      effectStat: 'damage',
      amountPerRank: 1,
      baseCost: 4,
      costStep: 4,
      maxLevel: 5
    },
    vihtavelho: {
      id: 'vihtavelho',
      category: 'title',
      name: 'Vihtavelho',
      description: 'Matching heroes push a little more healing through the steam.',
      matchValue: 'Vihtavelho',
      effectStat: 'heal',
      amountPerRank: 1,
      baseCost: 4,
      costStep: 4,
      maxLevel: 5
    },
    kiuaskuiskaaja: {
      id: 'kiuaskuiskaaja',
      category: 'title',
      name: 'Kiuaskuiskaaja',
      description: 'Matching heroes attack faster once the heat is on.',
      matchValue: 'Kiuaskuiskaaja',
      effectStat: 'attackCooldownMs',
      amountPerRank: -35,
      baseCost: 4,
      costStep: 4,
      maxLevel: 5
    },
    hoyryruhtinas: {
      id: 'hoyryruhtinas',
      category: 'title',
      name: 'Hoyryruhtinas',
      description: 'Matching heroes learn to stand their ground under pressure.',
      matchValue: 'Hoyryruhtinas',
      effectStat: 'defense',
      amountPerRank: 1,
      baseCost: 4,
      costStep: 4,
      maxLevel: 5
    },
    kivinen: {
      id: 'kivinen',
      category: 'surname',
      name: 'Kivinen',
      description: 'Matching heroes brace like old stones.',
      matchValue: 'Kivinen',
      effectStat: 'defense',
      amountPerRank: 1,
      baseCost: 4,
      costStep: 4,
      maxLevel: 5
    },
    saarinen: {
      id: 'saarinen',
      category: 'surname',
      name: 'Saarinen',
      description: 'Matching heroes recover with calmer pacing.',
      matchValue: 'Saarinen',
      effectStat: 'regenHpPerSecond',
      amountPerRank: 1,
      baseCost: 4,
      costStep: 4,
      maxLevel: 5
    },
    askala: {
      id: 'askala',
      category: 'surname',
      name: 'Askala',
      description: 'Matching heroes push a little more raw damage per hit.',
      matchValue: 'Askala',
      effectStat: 'damage',
      amountPerRank: 1,
      baseCost: 4,
      costStep: 4,
      maxLevel: 5
    },
    lehtinen: {
      id: 'lehtinen',
      category: 'surname',
      name: 'Lehtinen',
      description: 'Matching heroes shave time off every attack cycle.',
      matchValue: 'Lehtinen',
      effectStat: 'attackCooldownMs',
      amountPerRank: -25,
      baseCost: 4,
      costStep: 4,
      maxLevel: 5
    },
    ekberg: {
      id: 'ekberg',
      category: 'surname',
      name: 'Ekberg',
      description: 'Matching heroes carry extra staying power into the fight.',
      matchValue: 'Ekberg',
      effectStat: 'maxHp',
      amountPerRank: 4,
      baseCost: 4,
      costStep: 4,
      maxLevel: 5
    }
  };

export const namePools: NamePools = {
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
  };
