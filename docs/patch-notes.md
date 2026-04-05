# Patch notes -ylläpito

Tämä projekti tuottaa pelaajille näkyvän patch notes -sisällön suoraan `CHANGELOG.md`:stä.

## Lähde ja tagit

1. Uusin release-kohde tunnistetaan muodosta:
   - `## x.y.z - YYYY-MM-DD`
2. Jokainen release- ja Unreleased-listarivi tagitetaan:
   - `- [player] ...` = pelaajille näkyvä tai pelattavuuteen vaikuttava muutos.
   - `- [internal] ...` = sisäinen tekninen/prosessi/dokumentaatio muutos.

> Generointi käyttää vain `[player]`-merkinnät.

## Generointi

Aja:

```bash
npm run build:patch-notes
```

Skripti:

- lukee `CHANGELOG.md` uusimman release-kohdan,
- kerää `[player]`-rivit kategorioittain (`Added`, `Changed`, `Fixed`, `Breaking`),
- kirjoittaa UI:lle JSON-tiedoston `src/content/generated/latest-player-patch-notes.json`,
- kirjoittaa dokumentaatioversion `docs/latest-player-patch-notes.md`.

## CI-validointi

Aja paikallisesti:

```bash
npm run check:player-patch-notes
```

Tarkistus varmistaa, että:

- `package.json` version kohdalle löytyy release-otsikko `CHANGELOG.md`:stä,
- kyseisessä release-kohdassa on vähintään yksi `[player]`-merkintä,
- `src/content/generated/latest-player-patch-notes.json` sisältää saman version + päivämäärän kuin release,
- `docs/latest-player-patch-notes.md` sisältää saman version + päivämäärän kuin release.

Sama tarkistus ajetaan CI:ssä PR:lle workflowssa `changelog-check.yml`.

## Julkaisurutiini

1. Nosta `package.json` versio.
2. Lisää uusi release-otsikko changelogiin ja tagitetut merkinnät.
3. Aja `npm run build:patch-notes`.
4. Commitoi myös generoidut tiedostot.
