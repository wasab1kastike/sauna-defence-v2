# Sauna Defense

Selainpohjainen auto battler / tower defence -hybridi, jossa puolustat keskustassa hehkuvaa saunaa aalto kerrallaan.
Peli sisältää nyt metaprogression, shop-järjestelmiä ja useita pysyviä avauksia aiemman pelkän MVP-rungon sijaan.

## Nykyiset ominaisuudet

- **Run-kohtainen puolustuslooppi:** valitse puolustajia, sijoita laudalle, käynnistä aaltoja ja käytä SISU-aktiivia oikeaan aikaan.
- **Metaprogressio:** Steam-valuutta, completed run -seuranta, unlockit ja pysyvät päivitykset tallennetaan localStorageen.
- **Shopit ja world landmarkit:** Beer Shop / Sauna Kiosk avautuvat etenemisen kautta ja näkyvät kartalla klikattavina kohteina.
- **HUD + onboarding:** moderni topbar, oikean reunan toiminnot, opastekortit ja guide-stepit uuteen layoutiin.
- **GitHub Pages -julkaisu:** suora deploy `main`-branchista domainiin `https://artobest.com/`.

## Komennot

```bash
npm install
npm run dev
npm run lint
npm run typecheck
npm run test
npm run build:patch-notes
npm run check:player-patch-notes
npm run build
```

- `npm run lint` tarkistaa vähintään `src/**/*.ts` ja `src/**/*.tsx` ESLintillä.
- `npm run typecheck` ajaa TypeScript project references -tarkistuksen (`tsc -b --pretty false`).
- `npm run build:patch-notes` generoi uusimman release-version pelaajille näkyvät patch notes -tiedostot (`src/content/generated/latest-player-patch-notes.json` + `docs/latest-player-patch-notes.md`).
- `npm run check:player-patch-notes` varmistaa että `package.json` version release-kohdassa on vähintään yksi `[player]` merkintä **ja** että generoidut patch notes -tiedostot ovat synkassa version/päivämäärän kanssa.
- GitHub Pages -workflow ajaa komennot järjestyksessä `lint -> typecheck -> test -> build:patch-notes -> build`.

## Tallennusavaimet ja versiointi

Tallennusskeeman canonical-versio tulee vakiosta `SAVE_SCHEMA_VERSION` (`src/game/version.ts`) ja nykyinen arvo on **`v3`**. Avainprefix muodostuu runtime:ssa automaattisesti muodossa `sauna-defense-${SAVE_SCHEMA_VERSION}`.

### Inventaario

- `src/game/runtime.ts`
  - `sauna-defense-v3-meta`
  - `sauna-defense-v3-preferences`
  - `sauna-defense-v3-intro-seen`
  - sisältää migraattorin, joka siirtää vanhat `v2`-avaimet (`meta`, `preferences`, `intro-seen`) `v3`-avaimiin.
- `src/app/App.tsx`
  - `sauna-defense-v3-guide-seen`
  - rakennetaan samasta canonical prefixistä (`STORAGE_KEY_PREFIX`) kuin runtime-avaimet.
- `README.md`
  - dokumentoi canonical version (`v3`) ja yhtenäisen avainprefixin (`sauna-defense-v3`).

## Release process

### 1) Version nosto

1. Päivitä versionumero tiedostoon `package.json` (semver: patch/minor/major).
2. Varmista että mahdolliset breaking-muutokset on merkitty myös changelogiin kohdassa `Breaking`.
3. Buildissä Vite injektoi `__APP_VERSION__`-globaalin arvosta `process.env.npm_package_version` (`vite.config.ts`), ja peli näyttää sen HUDin pienessä build-badgessa muodossa `vX.Y.Z`. Tämä tarkoittaa, että pelissä näkyvä versio päivittyy automaattisesti aina `package.json` version bumpin yhteydessä.
4. Jos haluat pelaajille näkyvän uuden build-tunnisteen julkaisuun, bumpaa `package.json` versionumero ennen mergeä tai pushia `main`iin. Badge on tarkoituksella version-only eikä sisällä commit hashia.

### 2) Changelogin päivitys

Päivitä juuren `CHANGELOG.md` aina ennen mergeä seuraavalla rakenteella:

- `Added`
- `Changed`
- `Fixed`
- `Breaking`

Jokainen release- ja Unreleased-listarivi tagitetaan muodossa `- [player] ...` tai `- [internal] ...`.

Jos PR muuttaa käyttäytymistä (`src/`, `public/`, build- tai runtime-konfiguraatio), lisää vähintään yksi merkintä relevanttiin kohtaan.

### 3) Patch notes -generointi ennen buildia

1. Aja `npm run build:patch-notes` (tai luota CI:hin), joka lukee uusimman release-kohdan (`## x.y.z - YYYY-MM-DD`) ja käyttää vain `[player]`-rivien sisältöä.
2. Tarkista generoidut tiedostot:
   - `src/content/generated/latest-player-patch-notes.json` (UI käyttää tätä)
   - `docs/latest-player-patch-notes.md` (GitHub Pages -dokumentaatio)
3. Aja `npm run check:player-patch-notes` ennen releasemergausta; CI tekee saman validoinnin PR:issä.

### 4) GitHub Pages deployn validointi

1. Avaa GitHub Actions ja varmista että workflow **Deploy To GitHub Pages** on onnistunut (`lint -> typecheck -> test -> build:patch-notes -> build -> deploy`).
2. Tarkista workflow-ajon `deploy`-jobista julkaistu `page_url`.
3. Varmista että build-jobin artifact-tarkistus meni läpi (`dist/index.html`, `dist/assets/`, `dist/CNAME`).
4. Varmista että deploy-jobin smoke check vastaa onnistuneesti julkaistuun Pages-URLiin.
5. Varmista että tuotanto-URL vastaa odotettua osoitetta: `https://artobest.com/`.

### 5) Domain-varmistus (GitHub Pages)

- `public/CNAME` täytyy sisältää custom domain: `artobest.com`.
- GitHub repository settings → Pages: varmista että custom domain on `artobest.com` ja HTTPS on käytössä.
- GitHub Pages voi custom-domainin takana palvella vanhaa HTML:ää vielä hetken deployn jälkeen. `artobest.com` palauttaa tyypillisesti `Cache-Control: max-age=600`, joten odota tarvittaessa noin 10 minuuttia ennen kuin tulkitset julkaisun jääneen vanhaan buildiin.
- Julkaisun jälkeen validoi sekä:
  - `https://artobest.com/`
  - GitHub Pages -ympäristön URL workflow-ajosta (deploy-jobin `page_url`)

## Pelisilmukka

1. Valitse puolustaja oikean reunan HUDista.
2. Napauta tai klikkaa buildable-heksaa kentällä.
3. Käynnistä aalto.
4. Aktivoi SISU oikealla hetkellä.
5. Selviydy kuudesta aallosta.

## Rakenne

- `src/app` React-kuori ja HUD
- `src/game` pelitila, runtime, renderöinti ja testit
- `src/content` tasapaino- ja aaltodata (moduulit: `config`, `defenders`, `subclasses`, `enemies`, `waves`, `items`)
- `docs/content-authoring.md` ohjeet uuden yksikön lisäämiseen ja content-viitteiden ylläpitoon

- `docs/balance.md` balanssibaseline + regressiokäytännöt
- `docs/visual-guidelines.md` visuaalinen paletti, animaatiostandardit, render-budgetit ja visual regression -checklist
- `docs/patch-notes.md` patch notes -prosessi, tagikäytäntö, generointi ja ylläpito
- `docs/latest-player-patch-notes.md` automaattisesti generoitu viimeisin pelaajille julkaistava patch notes
- `public/ASSET_POLICY.md` `public/`-hakemiston formaatti-, optimointi- ja nimeämispolitiikat
