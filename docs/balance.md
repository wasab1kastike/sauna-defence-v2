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
- **Wave 10-20** siirtyy 6-lane volley -malliin: vihollisia tulee kaikista nykyisistä spawn-paikoista samalla beatilla, jolloin kenttä täyttyy aiempaa nopeammin.
- **Wave 21-30** siirtyy overdrive-rampiin: spawn-count kasvaa nykyistä paljon jyrkemmin ja volleyt tihenevät edelleen, jotta late game näyttää ja tuntuu selvästi raskaammalta.

Käytännön odote baseline-ajossa:
- **Wave 5** ei vielakaan ole riisutulle deterministic-baseline-rosterille luotettava clear-checkpoint, vaikka Pebblen ensikohtaaminen on aiempaa pehmeampi ja myöhemmat encounterit skaalautuvat selvemmin tankki/hitaus-suuntaan.
- **Wave 10** ei enää ole baseline-rosterille vakaa clear-checkpoint (odotettu fail uuden rampin jälkeen).
- **Wave 15** pysyy baseline-rosterille fail-checkpointina uuden cycle-rampin alla.

## Target-mittarit

### 1) Wave clear time
- Seurataan wavejen **5 / 10 / 15** clear time -arvoja (millisekunteina).
- Raportointiluku on baseline-skenaarioiden keskiarvo per checkpoint.
- Tavoite: trendi ei saa hajota regressiossa (ks. testin lukitut rajat).
- Huom: wave 10 ja wave 15 ovat nyt tarkoituksella "fail checkpoint" baseline-rosterille (`-1` = checkpointia ei saavutettu).

### 2) Aluekeskimääräinen sauna HP checkpointissa 5/10/15
- Mittari lasketaan 3-wave trailing-ikkuna-keskiarvona:
  - wave 5: avg(HP wave 3, 4, 5)
  - wave 10: avg(HP wave 8, 9, 10)
  - wave 15: avg(HP wave 13, 14, 15)
- Raportointiluku on baseline-skenaarioiden keskiarvo.
- Tavoite: sauna HP ei saa pudota yli regressiorajan.
- Huom: kun wave 10/15 checkpointia ei saavuteta, baseline-tavoite on `0`.

### 3) Defender survival ratio rooleittain
- Lasketaan runin lopussa (checkpoint wave 15 jälkeen):
  - `guardian`: elossa / alussa olleet guardianit
  - `hurler`: elossa / alussa olleet hurlerit
  - `mender`: elossa / alussa olleet menderit
- Raportointiluku on baseline-skenaarioiden keskiarvo.


## Recap: vihollismaarat per wave (1-30)

Alla nykyisen balanssilogiikan tuottama spawn-maara per wave (`createWaveDefinition`, nykyinen `main`).

Ankkurit (pyydetty ramp):
- wave 6 = **15**
- wave 10 = **30**
- wave 15 = **60**
- wave 20 = **100**
- wave 25 = **140**
- wave 30 = **190**

| Wave | Spawns | Boss |
|---:|---:|:---:|
| 1 | 3 | no |
| 2 | 4 | no |
| 3 | 4 | no |
| 4 | 5 | no |
| 5 | 11 | yes |
| 6 | 15 | no |
| 7 | 19 | no |
| 8 | 23 | no |
| 9 | 26 | no |
| 10 | 30 | yes |
| 11 | 36 | no |
| 12 | 42 | no |
| 13 | 48 | no |
| 14 | 54 | no |
| 15 | 60 | yes |
| 16 | 68 | no |
| 17 | 76 | no |
| 18 | 84 | no |
| 19 | 92 | no |
| 20 | 100 | yes |
| 21 | 108 | no |
| 22 | 116 | no |
| 23 | 124 | no |
| 24 | 132 | no |
| 25 | 140 | yes |
| 26 | 150 | no |
| 27 | 160 | no |
| 28 | 170 | no |
| 29 | 180 | no |
| 30 | 190 | yes |

## PR-käytäntö balanssimuutoksille

Kaikki balanssia muuttavat PR:t:
1. päivittävät tämän tiedoston (`docs/balance.md`), ja
2. päivittävät/lukitsevat regressiomittarit `src/game/__tests__/balance.spec.ts`-testissä.

Jos balanssimuutos on tarkoituksellinen, päivitä target-arvot ja kirjaa perustelu PR-kuvaukseen.
