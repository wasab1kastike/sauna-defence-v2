# Balance targets

This document defines the baseline regression targets for `src/game/__tests__/balance.spec.ts`.

## Baseline scenarios

Run three deterministic baseline simulations with seeds `1337`, `4242`, and `9001`.

Shared rules:
- use default meta progress via `createDefaultMetaProgress()`
- use the stripped baseline roster only
- place the same four defenders on the same board tiles every run
- always pick the first available draft option

## Wave ramp model

Waves 1-4 stay authored and readable for onboarding.

Wave 5+:
- Enemy stat scaling still uses separate boss and normal ramps so boss waves remain distinct spikes.
- Spawn pacing compresses harder from wave 5 onward, and again from wave 10 onward, while still respecting a minimum interval floor.
- Combat cadence now ramps with the wave: defenders attack faster, selected enemy attack timers shorten, and boss ability loops come back sooner.
- Proc-heavy builds get more internal chaos in mid/late game: `Fireball`, `Blink Step`, and `Battle Hymn` recover faster, and `Chain Spark` forks into extra targets from wave 10 onward.
- Wave 10-20 uses full-lane volleys plus larger same-beat clusters.
- Wave 21-30 enters overdrive: more enemies arrive per beat and volley spacing tightens again.

Practical baseline expectation:
- Wave 5 remains a meaningful checkpoint instead of a free clear.
- Wave 10 is intentionally much less stable for the stripped baseline roster.
- Wave 15 remains a fail checkpoint for the stripped baseline roster.

## Target metrics

### 1) Wave clear time

Track checkpoint clear times for waves `5 / 10 / 15` in milliseconds.

### 2) Area-average sauna HP

Use a trailing three-wave average:
- wave 5: avg(HP wave 3, 4, 5)
- wave 10: avg(HP wave 8, 9, 10)
- wave 15: avg(HP wave 13, 14, 15)

### 3) Defender survival ratio

Track final survival ratios for:
- `guardian`
- `hurler`
- `mender`

## Spawn recap (waves 1-30)

Anchor points for the current tempo pass:
- wave 6 = **15**
- wave 10 = **32**
- wave 15 = **67**
- wave 20 = **112**
- wave 25 = **157**
- wave 30 = **212**

| Wave | Spawns | Boss |
|---:|---:|:---:|
| 1 | 3 | no |
| 2 | 4 | no |
| 3 | 4 | no |
| 4 | 5 | no |
| 5 | 11 | yes |
| 6 | 15 | no |
| 7 | 19 | no |
| 8 | 24 | no |
| 9 | 28 | no |
| 10 | 32 | yes |
| 11 | 39 | no |
| 12 | 46 | no |
| 13 | 53 | no |
| 14 | 60 | no |
| 15 | 67 | yes |
| 16 | 76 | no |
| 17 | 85 | no |
| 18 | 94 | no |
| 19 | 103 | no |
| 20 | 112 | yes |
| 21 | 121 | no |
| 22 | 130 | no |
| 23 | 139 | no |
| 24 | 148 | no |
| 25 | 157 | yes |
| 26 | 168 | no |
| 27 | 179 | no |
| 28 | 190 | no |
| 29 | 201 | no |
| 30 | 212 | yes |

## PR policy

Every balance-changing PR should:
1. update `docs/balance.md`
2. update the locked expectations in `src/game/__tests__/balance.spec.ts`

If a balance shift is intentional, record the new target values in both places.
