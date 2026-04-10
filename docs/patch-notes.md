# Patch notes -yllapito

Tama projekti tuottaa pelaajille nakyvan patch notes -sisallon suoraan `CHANGELOG.md`:sta.

## Lahde ja tagit

1. Uusin release-kohde tunnistetaan muodosta:
   - `## x.y.z - YYYY-MM-DD`
2. Jokainen release- ja Unreleased-listarivi tagitetaan:
   - `- [player] ...` = pelaajille nakyva tai pelattavuuteen vaikuttava muutos.
   - `- [internal] ...` = sisainen tekninen, prosessi-, dokumentaatio- tai CI/CD-muutos.
3. Uusimmassa release-kohdassa on oltava erillinen `### Player Notes` -lohko:

```md
### Player Notes

#### Intro
Yksi lyhyt, pelaajalle kirjoitettu johdanto.

#### New Features
- 2-4 lyhytta bulletia

#### General Improvements
- 2-4 lyhytta bulletia

#### General Fixes
- 2-4 lyhytta bulletia
```

> Generointi kayttaa vain `Player Notes` -lohkoa. Tavalliset changelog-kategoriat ja `[player]`-tagit jaavat kehityksen totuuslahteeksi.

## Kirjoitustyyli pelaajille

- Kayta lyhyita, korkeintaan yhden lauseen mittaisia bullet-riveja.
- Kirjoita pelaajan kielella: kuvaa lopputulos, ei tiedostopolkuja tai toteutustekniikkaa.
- Savy saa olla kevyt ja hieman humoristinen.
- Intro on yksi lyhyt rivi, ei romaania.

## Generointi

Aja:

```bash
npm run build:patch-notes
```

Skripti:

- lukee `CHANGELOG.md` uusimman release-kohdan,
- parsii kaikki release-kohdat, joissa on kelvollinen `### Player Notes` -osio,
- kirjoittaa UI:lle historiatiedoston `src/content/generated/player-patch-notes-history.json`,
- kirjoittaa dokumentaatioversion `docs/latest-player-patch-notes.md`.

## CI-validointi

Aja paikallisesti:

```bash
npm run check:player-patch-notes
```

Tarkistus varmistaa, etta:

- `package.json` version kohdalle loytyy release-otsikko `CHANGELOG.md`:sta,
- kyseisessa release-kohdassa on `### Player Notes`,
- `#### Intro` on olemassa ja sisaltaa tekstia,
- pelaajille nakyvissa osioissa on yhteensa vahintaan yksi bullet,
- `src/content/generated/player-patch-notes-history.json` sisaltaa uusimman releasen version + paivamaaran seka release-historian oikeassa jarjestyksessa,
- `docs/latest-player-patch-notes.md` sisaltaa saman version + paivamaaran kuin release.

Sama tarkistus ajetaan CI:ssa workflowssa `changelog-check.yml`.

## Julkaisurutiini

1. Nosta `package.json` versio.
2. Lisaa uusi release-otsikko changelogiin seka normaalit tekniset kategoriat.
3. Kirjoita saman release-kohdan alle `### Player Notes` -lohko.
4. Aja `npm run build:patch-notes`.
5. Commitoi myos generoidut tiedostot.
