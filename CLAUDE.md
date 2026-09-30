# FLEUR Baden-Baden – Website

Club-Website für FLEUR (Sophienstraße 15, 76530 Baden-Baden). Kunde von LS Gestaltung.
**Live: https://fleur-bar.de** – das ist die einzige echte Domain.

## Wichtigste Regeln

- **Events pflegen = Karte in `public/index.html` (`#eventsGrid`) anlegen.** Ausführlich: `docs/EVENTS-PFLEGEN.md`. Nichts anderes anfassen, Event-Seiten/Sitemap entstehen automatisch.
- **Erzeugte Dateien nie von Hand bearbeiten:** `public/events/*`, `public/tisch-reservieren.html`, `public/geburtstag-feiern-baden-baden.html`, `public/sitemap.xml`. Quelle ist `scripts/build-pages.mjs` bzw. `scripts/seiten/*.html`. Nach Änderungen `npm run pages` ausführen und das Ergebnis mit committen.
- **Domain:** Alle absoluten URLs (Canonical, og:, JSON-LD, Sitemap) auf `https://fleur-bar.de`. `fleur-badenbaden.de` ist **nicht registriert** – nie verwenden, auch nicht für Mailadressen.
- **Kontakt-Mail:** überall `info@fleur.management` (auch Impressum/Datenschutz, keine andere Adresse verwenden). Telefon/WhatsApp: `+49 176 61455163`.
- **Nichts erfinden:** Preise, Eintritt, Mindestverzehr, Kapazitäten nur mit Bestätigung des Kunden. Eintritt ist bewusst nirgends genannt (wird separat geklärt).
- **Keine externen Ressourcen** (Google Fonts, CDNs, Tracking): Schriften liegen lokal in `public/fonts/`. Externe Einbindung ohne Einwilligung ist in DE abmahnfähig; die Datenschutzerklärung sagt ausdrücklich, dass nichts nachgeladen und nichts getrackt wird. Wer etwas Externes einbaut, muss `datenschutz.html` anpassen.
- **Jobs:** Stellen stehen in `public/jobs.html` als Karte **und** als `JobPosting`-JSON-LD im `<head>` (Google Jobs). Beide gemeinsam ändern; bei neuer/geänderter Stelle `datePosted` aktualisieren, bei gestrichener Stelle das JSON-LD entfernen.
- **Merge nach `main` deployt zwei Vercel-Projekte** (`fleur-bar`, `fleur-badenbaden`). Arbeit immer über Branch + PR.

## Aufbau

- Next.js 14.1 (App Router) liefert nur `public/` aus; Seiten sind statisches HTML. `/` → `index.html` per Rewrite.
- Saubere URLs über Rewrites **in beiden** Dateien: `next.config.js` und `vercel.json` (dort auch Redirects `*.html` → sauberer Pfad). Neue Seite = beide Dateien ergänzen.
- `public/js/main.js`: ein IIFE mit Modulen. Relevant:
  - `AnnouncementLoader` – Banner: zeigt das nächste Event aus den Karten; eine Telegram-Durchsage (`/api/data`, Upstash Redis) hat Vorrang, solange frisch (`expiresAt` in der Zukunft oder `updatedAt` < 14 Tage).
  - `currentClubDate()` – **Clubabend zählt bis 06:00 am Folgetag**, Europe/Berlin via `Intl` (DST-sicher). Überall dieselbe Regel verwenden.
  - `EventsNext` – zeigt die nächsten N Karten (`data-anzahl` am Grid, Standard 3), Rest hinter „Alle Termine anzeigen“.
  - `EventLinks` – verlinkt Event-Namen auf `/events/<datum>-<slug>`; zeigt auf vergangenen Event-Seiten den Hinweis. `slug()` muss identisch mit `slugify()` in `scripts/build-pages.mjs` bleiben.
- `scripts/build-pages.mjs` läuft als `prebuild`. Liest die Karten, schreibt Event-Seiten (Event-Schema, Berliner Offset, `typicalAgeRange`), `/events`, Inhaltsseiten, Sitemap. Vergangene Event-Seiten bleiben (Archiv), kommende ohne Karte werden gelöscht.
- Telegram-Bot `app/api/telegram`: nur `/announce`, `/hide`, `/show` wirken auf die Seite. `SET EVENTS` schreibt nach Redis, **wird nicht angezeigt**. `public/data/announcement.json` ist Altlast, wird nicht gelesen.

## Fakten – und wo sie stehen

Ändert sich etwas, **alle** Stellen anpassen (grep hilft):

| Fakt | Stand | Stellen |
|---|---|---|
| Öffnungszeiten | Fr & Sa ab 23:00, Open End (je nach Nacht 3–5 Uhr) | `index.html` (Hero, Marquee, Banner-Default, FAQ sichtbar + FAQPage-JSON-LD, Footer, `openingHoursSpecification` closes 05:00), `jobs.html` Footer, `scripts/seiten/*`, Footer in `build-pages.mjs` |
| Mindestalter | Fr 18, Sa 21 (andere Tage: keine Angabe) | FAQ in `index.html` (+ JSON-LD), `mindestalter()` in `build-pages.mjs`, `scripts/seiten/*` |
| Dresscode | Smart Casual, Hemden gern gesehen, lange Hosen, keine kurzen Hosen/Sandalen; je Event anders möglich | FAQ in `index.html` (+ JSON-LD), Event-Seite in `build-pages.mjs`, `scripts/seiten/tisch-reservieren.html` |
| Musik | House/Tech-House, dazu Urban-/RnB-Nächte | FAQ, `index.html` Meta |
| Resident DJ | Niklas Beuscher | `index.html` |
| Getränke-Bundle | Individuelles Getränkepaket zur Lounge/zum Hightable nach Absprache (keine Preise genannt) | FAQ in `index.html` (+ JSON-LD), NightClub-`hasOfferCatalog`, `scripts/seiten/*`, `public/llms.txt` |
| Private Location | bis 180 Gäste, Full Service, 4–6 Wochen Vorlauf fürs Wochenende | `event-location.html`, `scripts/seiten/geburtstag-feiern-baden-baden.html` |

**KI-Sichtbarkeit:** `public/llms.txt` ist das Faktenblatt für ChatGPT, Perplexity & Co. – bei geänderten Fakten mitpflegen. Inhaltsseiten beginnen mit einer „Kurz gesagt“-Antwort; FAQ-Blöcke dort als `<h3 class="faq-q">` + `<p class="faq-a">` schreiben, das FAQPage-Schema erzeugt der Generator daraus automatisch.

**FAQ-Regel:** Sichtbare FAQ (`.faq-question`) und `FAQPage`-JSON-LD im `<head>` von `index.html` müssen Frage für Frage identisch sein.

## Design

- Hauptfarbe Orange `--fleur-orange: #ff8e28` (aus den Social-Postings), Tinte `#0a0a0a`, Creme `#F5F0E8`.
- Schriften: Tox Typewriter (Lizenz gekauft, `fonts/tox-typewriter.woff2`) + Courier Prime (`--font-light`).
- Bausteine: `.deco-frame` (Art-déco-Rahmen, SVG-Symbol `#deco-ecke`), Runen-Muster `img/muster-orange.svg` / `img/muster-dunkel.svg`, Event-Karten `.events--next .event-card`.
- Bilder als `<picture>` mit AVIF/WebP/JPEG aus `public/img/opt/`.

## Prüfen vor dem Push

```bash
npm run pages                    # Karten gültig? Seiten erzeugt?
npm run build                    # inkl. prebuild; SWC fehlt lokal? npm i --no-save @next/swc-linux-x64-gnu@14.1.0
npm start                        # /, /events, /events/<slug>, /tisch-reservieren, /sitemap.xml
```

Sinnvolle Checks: JSON-LD aller Seiten parst; FAQ sichtbar == JSON-LD; kein horizontales Scrollen bei 320/390/1440 px; keine JS-Fehler; Event-Logik mit simulierter Uhr (z. B. Playwright `page.clock.install`) inkl. 02:00 Uhr nachts und Zeitumstellung Ende Oktober.
