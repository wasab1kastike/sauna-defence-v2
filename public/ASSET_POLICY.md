# Public Asset Policy

Tämä tiedosto määrittää `public/`-hakemiston asset-standardit.

## 1) Formaattiprioriteetti

1. **Ensisijainen:** vektoriformaatit (`.svg`) UI-ikoneille, symboleille ja yksinkertaisille elementeille.
2. **Toissijainen:** rasterit (`.png`, tarvittaessa `.webp`) silloin kun tekstuuri, maalausjälki tai pikseligrafiikka vaatii sitä.
3. Älä lisää binaariformaatteja, joita build ei käytä suoraan (esim. lähdeprojektitiedostot).

## 2) Optimointivaatimukset

- SVG:t:
  - poista turha metadata
  - minimoi polut ja ryhmittelyt
  - varmista skaalautuvuus ilman blur-artefakteja
- PNG/WebP:
  - pakkaa ilman näkyvää laatuhäviötä
  - vältä ylisuuria dimensioita (pidä lähde lähellä käyttöresoluutiota)
  - suosi sprite-arkkeja, jos useita pieniä kuvia renderöidään samassa näkymässä

## 3) Nimeämiskäytännöt `public/`

Yleiset säännöt:
- käytä `kebab-case`-tyyliä
- käytä vain pieniä kirjaimia
- vältä välilyöntejä ja erikoismerkkejä

Suositeltu rakenne:
- `public/ui/` -> käyttöliittymäassetit (`ui-health-bar.svg`)
- `public/enemies/` -> viholliset (`enemy-goblin-01.png`)
- `public/defenders/` -> puolustajat (`defender-sauna-guardian-01.png`)
- `public/fx/` -> efektit (`fx-steam-burst-01.webp`)

Variantit ja versiot:
- käytä numeerista suffiksia kahdella numerolla: `-01`, `-02`, ...
- jos tarvitset väliaikaisen migration, lisää `-v2`, `-v3` vain perustellusti ja dokumentoi PR:ssä

## 4) GitHub Pages / docs-hygienia

Kun lisäät tai poistat assetteja `public/`-hakemistosta:
- varmista ettei rikkinäisiä polkuja jää dokumentaatioon
- päivitä tarvittaessa README/dokumentaatio viittaamaan uusiin asset-polkujen nimiin
- validoi production build ennen mergeä

