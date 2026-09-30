# Events pflegen – FLEUR Website

Kurzfassung: **Eine Karte in `public/index.html` anlegen, committen, mergen.** Alles andere passiert automatisch.

---

## 1. Neues Event anlegen

Datei: `public/index.html`, Bereich `<div class="events-grid" id="eventsGrid">`.

Karten **chronologisch** einfügen (das Skript sortiert zwar selbst, aber so bleibt die Datei lesbar). Vorlage:

```html
<article class="event-card" data-date="2026-11-06">
    <div class="event-card-date">
        <span class="event-day">FR</span>
        <span class="event-num">6</span>
        <span class="event-month">NOV</span>
    </div>
    <div class="event-card-content">
        <span class="event-special">Urban Fleur</span>   <!-- optional, sonst Zeile weglassen -->
        <h3 class="event-artist">KÜNSTLERNAME</h3>
        <div class="event-meta">
            <span>23:00 Uhr</span>
        </div>
    </div>
    <a href="https://wa.me/4917661455163?text=Hi,%20ich%20möchte%20gerne%20für%20den%206.%20November%20(Künstlername)%20einen%20Tisch%20reservieren." class="event-cta" target="_blank">
        <span>Tisch reservieren</span>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
    </a>
</article>
```

| Feld | Pflicht | Hinweis |
|---|---|---|
| `data-date` | ja | Format `JJJJ-MM-TT`. **Das ist die Wahrheit** – Wochentag/Tag/Monat in der Karte werden per JS daraus korrigiert, die Event-Seite rechnet ebenfalls nur mit `data-date`. |
| `event-day` / `event-num` / `event-month` | ja | Trotzdem korrekt eintragen (Anzeige ohne JavaScript). Monate: JAN FEB MÄR APR MAI JUN JUL AUG SEP OKT NOV DEZ |
| `event-special` | nein | Label über dem Namen, z. B. „Urban Fleur“, „Halloween“, „1 Year Fleur“. Wird Teil des Event-Namens bei Google („Urban Fleur: RNB LOVERS“). |
| `event-artist` | ja | Künstler in GROSSBUCHSTABEN, mehrere mit ` x ` oder ` · ` trennen (`FRIZZO x DEX`). Daraus entsteht die URL. |
| `event-meta` | ja | Beginn, Format `23:00 Uhr` |
| `event-cta` | ja | WhatsApp-Link mit vorausgefülltem Text. Wird 1:1 auf die Event-Seite übernommen. |
| Klasse `event-card-featured` | nein | Aktuell ohne sichtbaren Unterschied. |

**Nicht** nötig: JSON-LD, Sitemap, Event-Seite, Banner – das erledigen Skript und `main.js`.

---

## 2. Was dann automatisch passiert

Beim Build (`npm run build` → `prebuild`) liest `scripts/build-pages.mjs` alle Karten und erzeugt:

| Ergebnis | Beispiel |
|---|---|
| Eine Seite pro Event mit Event-Schema für Google | `/events/2026-11-06-kuenstlername` |
| Übersicht aller Events | `/events` |
| Inhaltsseiten aus `scripts/seiten/*.html` | `/tisch-reservieren`, `/geburtstag-feiern-baden-baden` |
| Sitemap | `/sitemap.xml` |

Im Browser (`public/js/main.js`):

- **Startseite** zeigt immer die **nächsten 3** Events, der Rest hinter „Alle Termine anzeigen“.
- **Banner** oben zeigt automatisch das nächste Event (außer eine frische Telegram-Durchsage ist aktiv).
- **Event-Namen** werden auf ihre Event-Seite verlinkt.
- **Stichtag:** Ein Clubabend zählt bis **06:00 Uhr am Folgetag** (Europe/Berlin). Danach gilt er als vergangen.

URL-Bildung (`slugify`, identisch in Skript und `main.js`): Kleinbuchstaben, ä→ae ö→oe ü→ue ß→ss, alles andere → `-`, Datum davor.
`FRIZZO x DEX` am 23.10.2026 → `/events/2026-10-23-frizzo-x-dex`

---

## 3. Sonderfälle

| Fall | Vorgehen |
|---|---|
| **Event abgesagt** | Karte löschen. Beim nächsten Build verschwindet die Event-Seite (nur bei kommenden Events). |
| **Künstler/Name geändert** | Karte anpassen. Neue URL entsteht, die alte kommende Seite wird entfernt. |
| **Monatswechsel** | Neue Karten ergänzen. Alte Karten *können* bleiben (werden automatisch ausgeblendet) oder gelöscht werden – ihre Event-Seiten bleiben als Archiv erhalten und zeigen „Dieser Abend liegt schon hinter uns“. |
| **Keine kommenden Events** | Startseite zeigt „Neue Termine folgen in Kürze“ mit Instagram-Link. |
| **Zwei Events am selben Tag mit gleichem Namen** | Build bricht ab (doppelte URL) – Namen unterscheiden. |
| **Eigener Dresscode für ein Event** | Aktuell nur als `event-special` oder im Instagram-Post; die Event-Seite zeigt den Standard-Dresscode. |

---

## 4. Lokal prüfen (optional)

```bash
npm install
npm run pages      # erzeugt Event-Seiten + Sitemap, meldet Fehler in den Karten
npm run build && npm start
```

Dann `http://localhost:3000/events` öffnen. Fehlt lokal der Next-Compiler (SWC), einmalig:
`npm install --no-save @next/swc-linux-x64-gnu@14.1.0` (bzw. passendes Paket fürs eigene System).

Die erzeugten Dateien (`public/events/*`, `public/tisch-reservieren.html`, `public/geburtstag-feiern-baden-baden.html`, `public/sitemap.xml`) werden mit committet, damit Änderungen im PR sichtbar sind. **Nie von Hand bearbeiten** – Texte der Inhaltsseiten in `scripts/seiten/`, Event-Seiten-Layout in `scripts/build-pages.mjs`.

---

## 5. Veröffentlichen

1. Branch anlegen, Karte(n) ändern, `npm run pages`, committen.
2. PR gegen `main` → Vercel baut Vorschauen.
3. Merge nach `main` → deployt **beide** Vercel-Projekte (`fleur-bar` und `fleur-badenbaden`). Live: **https://fleur-bar.de**

---

## 6. Achtung: Telegram-Bot und Events

Der Bot (`/api/telegram`) kennt `SET EVENTS <MONAT>` und `DELETE EVENTS`. Diese Befehle speichern Events **nur in der Datenbank (Upstash Redis) – die Website zeigt sie nicht an.** Events auf der Seite kommen ausschließlich aus den Karten in `index.html`.

Vom Bot wirksam ist nur die **Durchsage** (`/announce`, `/hide`, `/show`): Sie ersetzt den automatischen Banner, solange sie aktiv ist und `expiresAt` in der Zukunft liegt bzw. (ohne Ablaufdatum) jünger als 14 Tage ist.

`public/data/announcement.json` wird von der Website nicht mehr gelesen (Altlast des früheren Stand-alone-Bots in `telegram-bot/`).
