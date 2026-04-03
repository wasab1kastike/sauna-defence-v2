# Sauna Defense

Selainpohjainen auto battler / tower defence -hybridi, jossa puolustat keskustassa hehkuvaa saunaa aalto kerrallaan.
Peli sisältää nyt metaprogression, shop-järjestelmiä ja useita pysyviä avauksia aiemman pelkän MVP-rungon sijaan.

## Nykyiset ominaisuudet

- **Run-kohtainen puolustuslooppi:** valitse puolustajia, sijoita laudalle, käynnistä aaltoja ja käytä SISU-aktiivia oikeaan aikaan.
- **Metaprogressio:** Steam-valuutta, completed run -seuranta, unlockit ja pysyvät päivitykset tallennetaan localStorageen.
- **Shopit ja world landmarkit:** Beer Shop / Metashop avautuvat etenemisen kautta ja näkyvät kartalla klikattavina kohteina.
- **HUD + onboarding:** moderni topbar, oikean reunan toiminnot, opastekortit ja guide-stepit uuteen layoutiin.
- **GitHub Pages -julkaisu:** suora deploy `main`-branchista domainiin `https://artobest.com/`.

## Komennot

```bash
npm install
npm run dev
npm run lint
npm run typecheck
npm run test
npm run build
```

- `npm run lint` tarkistaa vähintään `src/**/*.ts` ja `src/**/*.tsx` ESLintillä.
- `npm run typecheck` ajaa TypeScript project references -tarkistuksen (`tsc -b --pretty false`).
- GitHub Pages -workflow ajaa komennot järjestyksessä `lint -> typecheck -> test -> build`.

## Tallennusavaimet ja versiointi

Canonical tallennusversio on **`v3`** ja yhtenäinen avainprefix on **`sauna-defense-v3`**.

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

## Julkaisu

GitHub Pages -julkaisu käyttää custom domainia `artobest.com`.

- tuotantobase on `/`
- push `main`-branchiin julkaisee pelin GitHub Pagesiin GitHub Actionsin kautta
- julkaisuosoite on `https://artobest.com/`
- `public/CNAME` kertoo GitHub Pagesille käytettävän custom domainin

## Pelisilmukka

1. Valitse puolustaja oikean reunan HUDista.
2. Napauta tai klikkaa buildable-heksaa kentällä.
3. Käynnistä aalto.
4. Aktivoi SISU oikealla hetkellä.
5. Selviydy kuudesta aallosta.

## Rakenne

- `src/app` React-kuori ja HUD
- `src/game` pelitila, runtime, renderöinti ja testit
- `src/content` tasapaino- ja aaltodata
