import type { GameContent } from '../game/types';

export const defenderSubclasses: GameContent['defenderSubclasses'] = {
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
  };
