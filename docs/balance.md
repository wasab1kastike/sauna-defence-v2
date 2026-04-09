# Balance targets

Tämä dokumentti määrittää regressioseurannan target-mittarit. Mittarit tuotetaan deterministisellä `src/game/__tests__/balance.spec.ts` baseline-simulaatiolla.

## Baseline-skenaariot

Ajetaan kolme determinististä baseline-runia siemenillä `1337`, `4242` ja `9001`.

Yhteiset ehdot:
- käytetään oletusmetaa (`createDefaultMetaProgress`), ei lisä-ostoksia
- käytetään baseline-rosteria (vain alku-runin puolustajat)
- asetellaan 4 kenttäpuolustajaa samoille tileille joka ajossa
- drafteissa valitaan aina ensimmäinen tarjolla oleva vaihtoehto

## Wave ramp -malli (päivitetty)

Wavet 1-4 pidetään ennallaan onboarding-vakauden vuoksi.

Wave 5+: 
- **Wave pressure** kasvattaa ei-boss-waveja aiempaa enemmän jokaisessa 5-wave syklissä (`cycleRamp + milestoneBonus`).
- **Composition scaling** muuntaa paineen tiheämmäksi unit-mixiksi: bruten yläraja kasvaa syklin mukana ja korkeammilla sykleillä lisätään ylimääräisiä spawn pickejä.
- **Spawn pacing** kiristyy syklin kasvaessa (`spawnIntervalMs` pienenee nopeammin), mutta kunnioittaa aina `minSpawnIntervalMs`-rajaa.

Käytännön odote baseline-ajossa:
- **Wave 5** clearataan edelleen luotettavasti.
- **Wave 10** clearataan edelleen useimmissa baseline-skenaarioissa, mutta paine/HP laskee aiempaa nopeammin.
- **Wave 15** ei enää ole baseline-rosterille vakaa clear-checkpoint uuden 5-wave cycle rampin jälkeen.

## Target-mittarit

### 1) Wave clear time
- Seurataan wavejen **5 / 10 / 15** clear time -arvoja (millisekunteina).
- Raportointiluku on baseline-skenaarioiden keskiarvo per checkpoint.
- Tavoite: trendi ei saa hajota regressiossa (ks. testin lukitut rajat).
- Huom: wave 15 on nyt tarkoituksella "fail checkpoint" baseline-rosterille (`-1` = checkpointia ei saavutettu).

### 2) Aluekeskimääräinen sauna HP checkpointissa 5/10/15
- Mittari lasketaan 3-wave trailing-ikkuna-keskiarvona:
  - wave 5: avg(HP wave 3, 4, 5)
  - wave 10: avg(HP wave 8, 9, 10)
  - wave 15: avg(HP wave 13, 14, 15)
- Raportointiluku on baseline-skenaarioiden keskiarvo.
- Tavoite: sauna HP ei saa pudota yli regressiorajan.
- Huom: kun wave 15 checkpointia ei saavuteta, baseline-tavoite on `0`.

### 3) Defender survival ratio rooleittain
- Lasketaan runin lopussa (checkpoint wave 15 jälkeen):
  - `guardian`: elossa / alussa olleet guardianit
  - `hurler`: elossa / alussa olleet hurlerit
  - `mender`: elossa / alussa olleet menderit
- Raportointiluku on baseline-skenaarioiden keskiarvo.


## Recap: vihollismaarat per wave (1-30)

Alla nykyisen balanssilogiikan tuottama spawn-maara per wave (`createWaveDefinition`, nykyinen `main`):

| Wave | Spawns | Boss | Pattern |
|---:|---:|:---:|:---|
| 1 | 3 | no | tutorial |
| 2 | 4 | no | tutorial |
| 3 | 4 | no | split |
| 4 | 5 | no | staggered |
| 5 | 1 | yes | boss_breach |
| 6 | 6 | no | staggered |
| 7 | 7 | no | spearhead |
| 8 | 9 | no | surge |
| 9 | 9 | no | split |
| 10 | 16 | yes | boss_pressure |
| 11 | 10 | no | spearhead |
| 12 | 12 | no | surge |
| 13 | 12 | no | split |
| 14 | 13 | no | staggered |
| 15 | 1 | yes | boss_pressure |
| 16 | 16 | no | surge |
| 17 | 16 | no | split |
| 18 | 17 | no | staggered |
| 19 | 18 | no | spearhead |
| 20 | 1 | yes | boss_pressure |
| 21 | 22 | no | split |
| 22 | 23 | no | staggered |
| 23 | 24 | no | spearhead |
| 24 | 26 | no | surge |
| 25 | 1 | yes | boss_breach |
| 26 | 29 | no | staggered |
| 27 | 30 | no | spearhead |
| 28 | 32 | no | surge |
| 29 | 32 | no | split |
| 30 | 16 | yes | boss_pressure |

## PR-käytäntö balanssimuutoksille

Kaikki balanssia muuttavat PR:t:
1. päivittävät tämän tiedoston (`docs/balance.md`), ja
2. päivittävät/lukitsevat regressiomittarit `src/game/__tests__/balance.spec.ts`-testissä.

Jos balanssimuutos on tarkoituksellinen, päivitä target-arvot ja kirjaa perustelu PR-kuvaukseen.
