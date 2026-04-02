# Sauna Defense MVP

Kevyt selainpeli, jossa puolustat keskustassa hehkuvaa saunaa kuuden aallon ajan.

## Tavoite

- Pieni, pelattava MVP ilman raskasta selainruntimea
- React vain HUDiin ja valikoihin
- Simulaatio ja renderointi omassa `src/game`-kerroksessaan

## Komennot

```bash
npm install
npm run dev
npm run test
npm run build
```

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
