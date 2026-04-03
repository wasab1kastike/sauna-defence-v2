# Content authoring

Tämä dokumentti kuvaa miten peliin lisätään uusi yksikkö turvallisesti nykyiseen sisältörakenteeseen.

## Sisältömoduulit

- `src/content/config.ts` – globaalit peliasetukset.
- `src/content/defenders.ts` – defender-templatet (`guardian`, `hurler`, `mender`-tyyliset rungot).
- `src/content/subclasses.ts` – defender-subclassit, jotka viittaavat templateihin `templateId`:llä.
- `src/content/enemies.ts` – vihollisarkkityypit.
- `src/content/waves.ts` – tutorial-aallot, boss rotation ja ei-boss pattern -kierto.
- `src/content/items.ts` – itemit, skillit, alcoholit, globaalit modifierit, metaupgradet ja name poolit.
- `src/content/gameContent.ts` – koostaa kaiken yllä olevan yhdeksi `gameContent`-objektiksi.

## How to add a new unit

### 1) Lisää uusi defender-template

1. Avaa `src/content/defenders.ts`.
2. Lisää uusi entry `defenderTemplates`-objektiin.
3. Varmista että:
   - objektin avain = `id`,
   - kaikki required statit ovat mukana,
   - värit (`fill`, `outline`) ja `label` ovat näkyviä HUDissa.

> Huom: jos lisäät täysin uuden template-id:n, päivitä myös vastaava tyyppirajaus `src/game/types.ts` (esim. `DefenderTemplateId`) ja mahdolliset sitä käyttävät union-tyypit.

### 2) Lisää subclassit templateen

1. Avaa `src/content/subclasses.ts`.
2. Lisää vähintään yksi subclass entry.
3. Aseta `templateId` osoittamaan juuri lisäämääsi templatea.
4. Pidä avain, `id` ja signatuurit konsistentteina.

### 3) Tarvittaessa lisää loot- tai modifier-sidokset

- Jos yksikkö tarvitsee uusia item/skill-synergioita, tee muutokset `src/content/items.ts`:
  - `itemDefinitions`
  - `skillDefinitions`
  - `globalModifierDefinitions`

### 4) Aja content integrity -testi

`src/content/__tests__/contentIntegrity.test.ts` tarkistaa vähintään:
- ID-uniikkiuden (avaimet vs. `id`),
- subclass → template viitteet,
- modifier source -viitteet (template/subclass/item/skill),
- loot-id -avaruuden ristiriidattomuuden itemien ja skillien välillä.

Suositus:

```bash
npm run test
npm run build
```
