# FLEUR Baden-Baden - Projekt-Dokumentation

## Übersicht

**Projekt:** FLEUR Baden-Baden Website
**Typ:** Premium Nightclub Website mit dynamischem Content-Management
**Agentur:** [lsgestaltung.de](https://lsgestaltung.de)
**Live URL:** https://fleur-badenbaden.vercel.app
**Repository:** https://github.com/lsgestaltung/fleur-badenbaden

---

## Tech Stack

| Komponente | Technologie |
|------------|-------------|
| Framework | Next.js 14 (App Router) |
| Deployment | Vercel |
| Datenbank | Upstash Redis |
| Content Management | Telegram Bot |
| Styling | Custom CSS (Vanilla) |
| Font | TOX Typewriter (lokal) |
| Sprache | TypeScript |

---

## Projektstruktur

```
fleur-baden-baden/
├── app/
│   ├── api/
│   │   ├── data/route.ts       # API für Frontend-Daten
│   │   ├── telegram/route.ts   # Telegram Bot Webhook
│   │   └── revalidate/route.ts # On-Demand Revalidation
│   ├── layout.tsx
│   └── page.tsx                # Redirect zu /index.html
├── lib/
│   ├── kv.ts                   # Redis DataStore
│   └── types.ts                # TypeScript Interfaces
├── public/
│   ├── css/style.css           # Haupt-Stylesheet
│   ├── js/main.js              # Frontend JavaScript
│   ├── img/                    # Bilder & Assets
│   ├── fonts/                  # Lokale Fonts
│   ├── index.html              # Startseite
│   ├── impressum.html          # Impressum
│   ├── datenschutz.html        # Datenschutz
│   └── jobs.html               # Jobs-Seite
├── vercel.json                 # Vercel Konfiguration
├── next.config.js              # Next.js Konfiguration
├── package.json
└── tsconfig.json
```

---

## Design System

### Farben

| Name | Hex | Verwendung |
|------|-----|------------|
| `--fleur-orange` | #E8793A | Primärfarbe, Akzente |
| `--fleur-orange-light` | #F5A66A | Hover States |
| `--fleur-black` | #0A0A0A | Hintergrund |
| `--fleur-anthracite` | #121212 | Sekundärer Hintergrund |
| `--fleur-cream` | #F5F0E8 | Text |
| `--fleur-light-grey` | #888888 | Sekundärer Text |

### Typografie

- **Display Font:** TOX Typewriter (lokal gehostet)
- **Body Font:** TOX Typewriter / Courier Prime (Fallback)
- **Größen:** Fluid Typography mit `clamp()`

### Spacing

```css
--space-xs: 0.5rem;   /* 8px */
--space-sm: 1rem;     /* 16px */
--space-md: 2rem;     /* 32px - responsive */
--space-lg: 4rem;     /* 64px - responsive */
--space-xl: 8rem;     /* 128px - responsive */
```

---

## Telegram Bot

### Konfiguration

**Bot Token:** `8391640571:AAESgY5CRm1OCtL5quDHrnSFs2AmojtW4HY`
**Webhook URL:** `https://fleur-badenbaden.vercel.app/api/telegram?secret=<WEBHOOK_SECRET>`

### Environment Variables (Vercel)

```
TELEGRAM_BOT_TOKEN=8391640571:AAESgY5CRm1OCtL5quDHrnSFs2AmojtW4HY
TELEGRAM_WEBHOOK_SECRET=<generated-secret>
TELEGRAM_ALLOWED_CHAT_IDS=<admin-chat-id>
UPSTASH_REDIS_REST_URL=<upstash-url>
UPSTASH_REDIS_REST_TOKEN=<upstash-token>
```

### Befehle

#### Ankündigungen

| Befehl | Beschreibung |
|--------|-------------|
| `/announce <text>` | Neue Ankündigung setzen |
| `/hide` | Ankündigung ausblenden |
| `/show` | Ankündigung einblenden |
| `/status` | Aktuellen Status anzeigen |

#### Event-Management

| Befehl | Beschreibung |
|--------|-------------|
| `DELETE EVENTS` | Alle Events löschen |
| `SET EVENTS MONAT` | Bulk-Import Events |
| `/events` | Alle Events anzeigen |

### Event-Format

```
SET EVENTS FEBRUAR
6.02 FRIZZO
07.02 KEYS BANDIT
14.02 URBAN FLEUR | VALENTINES DAY
MAALEEK x KEZRULESEVERYTHING
20.02 Lumes
21.02 2 ROCK G
27.02 PRIVATE PARTY (GESCHLOSSENE GESELLSCHAFT)
28.02 FLEUR x DOKTOR SCHRÖMBGENS
LUIS SARANDA
```

**Parsing-Regeln:**
- Datum: D.MM oder DD.MM am Zeilenanfang
- Event-Titel: Text nach dem Datum
- Artists: Folgezeilen bis zum nächsten Datum
- Trennzeichen: `x`, `&`, `,`
- Fallback: Titel = Artist wenn keine Folgezeile

---

## API Endpoints

### GET /api/data

Gibt aktuelle Site-Daten zurück.

**Response:**
```json
{
  "announcement": {
    "active": true,
    "text": "Ankündigungstext",
    "link": "#events",
    "linkText": "Events entdecken →",
    "icon": "✦"
  },
  "events": [...],
  "artists": [...],
  "meta": {
    "lastUpdated": "2025-02-05T19:04:39.215Z",
    "updatedBy": "api"
  }
}
```

### POST /api/telegram?secret=<SECRET>

Telegram Webhook für Bot-Commands.

### POST /api/revalidate

On-Demand Revalidation für ISR.

---

## URL-Struktur

| Seite | URL |
|-------|-----|
| Startseite | `/` |
| Impressum | `/impressum` |
| Datenschutz | `/datenschutz` |
| Jobs | `/jobs` |

**Redirects (301):**
- `/index.html` → `/`
- `/impressum.html` → `/impressum`
- `/datenschutz.html` → `/datenschutz`
- `/jobs.html` → `/jobs`

---

## Datenmodelle

### Announcement

```typescript
interface Announcement {
  active: boolean;
  text: string;
  link: string;
  linkText: string;
  icon: string;
  priority: 'low' | 'normal' | 'high';
  expiresAt: string | null;
  updatedAt: string;
}
```

### Event

```typescript
interface Event {
  id: string;
  title: string;
  date: string;        // YYYY-MM-DD
  time: string;        // HH:MM
  djs: string[];       // Artists
  description: string;
  image: string;
  active: boolean;
  featured: boolean;
  month?: string;      // z.B. "FEBRUAR"
  createdAt: string;
  updatedAt: string;
}
```

---

## Deployment

### Vercel

1. Push zu GitHub `main` Branch
2. Vercel baut automatisch
3. Preview Deployments für PRs

### Environment Variables

Alle in Vercel Dashboard unter Settings → Environment Variables konfiguriert.

---

## Mobile Optimierung

- Kein horizontales Scrollen
- Responsive Breakpoints: 480px, 768px, 1024px
- Touch-optimierte Elemente
- Custom Cursor nur auf Desktop

---

## SEO

- Semantic HTML5
- Open Graph Meta Tags
- Twitter Card Meta Tags
- JSON-LD Structured Data (NightClub Schema)
- Geo-Tags für Local SEO
- Canonical URLs

---

## Performance

- Lokale Fonts (kein Google Fonts für Hauptschrift)
- Komprimierte Bilder (sips)
- Lazy Loading
- CSS ohne Framework
- Kein jQuery

---

## Sicherheit

- Webhook Secret für Telegram
- Chat-ID Whitelist für Admin-Zugriff
- Input Sanitization
- Security Headers (X-Frame-Options, etc.)
- HTTPS only

---

## Kontakt

**Technische Betreuung:**
lsgestaltung.de
https://lsgestaltung.de

---

*Stand: Februar 2025*
