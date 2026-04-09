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

## PR-käytäntö balanssimuutoksille

Kaikki balanssia muuttavat PR:t:
1. päivittävät tämän tiedoston (`docs/balance.md`), ja
2. päivittävät/lukitsevat regressiomittarit `src/game/__tests__/balance.spec.ts`-testissä.

Jos balanssimuutos on tarkoituksellinen, päivitä target-arvot ja kirjaa perustelu PR-kuvaukseen.
