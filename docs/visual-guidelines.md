# Visual Guidelines

Tämä dokumentti määrittää Sauna Defence v2:n visuaalisen baseline-standardin.

## 1) Väri- ja kontrastipaletti

### Peruspaletti
- **Tausta / canvas**: `#0D1117`
- **Paneeli / HUD-tausta**: `#161B22`
- **Korosteväri (primary action)**: `#3FB950`
- **Toissijainen korostus (info/highlight)**: `#58A6FF`
- **Varoitus**: `#D29922`
- **Virhe / kriittinen tila**: `#F85149`
- **Teksti pääsisältö**: `#F0F6FC`
- **Teksti sekundääri**: `#8B949E`

### Kontrastivaatimukset
- Normaali tekstisisältö: vähintään **WCAG AA 4.5:1**.
- Iso teksti (>= 24px tai 18.66px bold): vähintään **3:1**.
- Kriittinen HUD-data (HP, wave, resurssit): tavoite **7:1** aina kun mahdollista.
- Pelkän värikoodauksen käyttö on kielletty kriittisessä tilaviestinnässä: käytä lisäksi ikonia, labelia tai animaatiota.

## 2) Animaatio-standardit (kesto + easing)

### Kesto
- **Micro-interactions** (hover, focus, nappi-press): `100-160ms`
- **UI state transition** (paneelin avaus/sulku, tooltip): `180-260ms`
- **Modal / popup enter-exit**: `220-320ms`
- **FX-heavy tapahtumat** (boss hit, ultimate): `350-700ms`, mutta ei blokkaa inputia.

### Easing
- Sisäänmeno (enter): `cubic-bezier(0.16, 1, 0.3, 1)`
- Ulosmeno (exit): `cubic-bezier(0.7, 0, 0.84, 0)`
- Yleiskäyttöinen UI-liike: `ease-out`
- Loop-animaatiot (ambient): `linear` tai erittäin loiva `ease-in-out`

### Liike- ja saavutettavuusohje
- Kunnioita `prefers-reduced-motion`: vähennä skaalausta/siirtymää ja poista jatkuva parallax.
- Älä ketjuta yli kolmea samanaikaista huomiota varastavaa animaatiota HUD-alueella.

## 3) UI-kerroshierarkia (HUD / popups / FX)

Suositeltu z-index-järjestys:

1. **Game world** (tausta, kenttä, yksiköt) — base layer
2. **World-space FX** (iskut, projektiilit, hit-flashit)
3. **HUD core** (resurssit, wave-info, tärkeät kontrollit)
4. **HUD overlays** (tooltipit, contextual info)
5. **Popups / modals** (pause, confirm, settings)
6. **Critical alerts** (game over, blocking warnings)
7. **Debug overlays** (vain dev-tilassa, ei prodissa oletuksena)

Säännöt:
- Popup ei koskaan saa jäädä critical alert -tason yläpuolelle.
- HUD:n päätekstiä ei saa peittää world-space FX:llä.
- Käytä johdonmukaista varjostusta ja bluria vain overlay-/popup-tasoilla, jotta hierarkia säilyy luettavana.

## 4) Render-suorituskykybudjetit

Tavoitteet (desktop + mobile):
- **Desktop target FPS**: 60 FPS (frame time ~16.7ms)
- **Mobile target FPS**: 30 FPS minimi, 60 FPS tavoite yhteensopivilla laitteilla
- **Draw calls / frame**:
  - Desktop: suositus < 150, hard cap 220
  - Mobile: suositus < 100, hard cap 140
- **P95 frame time**:
  - Desktop: < 20ms
  - Mobile: < 33ms

Budjettisäännöt:
- Uusi efekti ei saa nostaa draw-kutsuja yli 10% ilman erillistä perustelua PR:ssä.
- Jos budjetti ylittyy, PR:ssä tulee olla optimointisuunnitelma (batching, sprite-atlas, FX LOD, culling).

## 5) Mittausohje (performance measurement)

Mittaa aina vähintään kahdessa profiilissa:
1. **Desktop Chrome (production build)**
2. **Mobile emulation (mid-tier preset)**

Prosessi:
1. Aja `npm run build`.
2. Aja preview-tila (esim. `npm run preview`) ja avaa peli production-assettien kanssa.
3. Profiloi 60 s gameplay-loop (normal + heavy FX -hetki).
4. Kirjaa vähintään:
   - average FPS
   - 1% low FPS
   - p95 frame time
   - arvio draw call -tasosta (engine/dev overlay)
5. Liitä mittaustulokset PR-kuvaukseen, jos muutos koskee renderöintiä, FX:ää tai HUD:n visuaalista kuormaa.

## 6) Visual regression checklist (PR)

Kun PR muuttaa visuaaleja, lisää PR:ään:
- ennen/jälkeen-kuvakaappaukset samasta näkymästä
- HUD readability -arvio (kontrasti + informaatiohierarkia)
- Desktop + mobile -varmistus (layout, clipping, tekstin luettavuus)
- huomio `prefers-reduced-motion` käyttäytymisestä, jos animaatioita muutettu

