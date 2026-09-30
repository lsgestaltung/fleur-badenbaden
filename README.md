# FLEUR Baden-Baden

> Un Espace de Nuit - Der exklusive Nightclub in Baden-Baden

## Quick Start

```bash
# Dependencies installieren
npm install

# Lokaler Entwicklungsserver
npm run dev

# Production Build
npm run build
```

## Projektstruktur

```
fleur-badenbaden/
├── app/                    # Next.js App Router
│   ├── api/
│   │   ├── telegram/       # Telegram Webhook
│   │   ├── data/           # Data API
│   │   └── revalidate/     # ISR Revalidation
│   ├── layout.tsx
│   ├── page.tsx
│   └── globals.css
├── components/             # React Components
│   └── MainContent.tsx
├── lib/                    # Utilities
│   ├── types.ts           # TypeScript Definitionen
│   └── kv.ts              # Vercel KV Data Layer
├── public/                 # Static Assets
│   ├── img/
│   ├── css/
│   ├── js/
│   └── fonts/
├── scripts/                # Helper Scripts
│   ├── setup-telegram.sh
│   └── generate-secrets.js
├── telegram-bot/           # Standalone Bot (Alternative)
├── DEPLOYMENT.md           # Deployment Anleitung
└── vercel.json            # Vercel Config
```

## Features

- 🌐 **Next.js 14** mit App Router
- 📱 **Telegram Bot** für Content-Management
- 🔄 **ISR** (Incremental Static Regeneration)
- 💾 **Vercel KV** für Datenpersistenz
- 🚀 **Auto-Deploy** via GitHub → Vercel

## Events & Unterseiten

Neue Events wie bisher als Karte in `public/index.html` (`#eventsGrid`) anlegen. Alles Weitere erzeugt `scripts/build-pages.mjs` automatisch vor jedem Build:

- eine Seite pro Event unter `/events/<datum>-<name>` (mit Event-Schema für Google)
- die Übersicht `/events`
- die Inhaltsseiten aus `scripts/seiten/*.html` (`/tisch-reservieren`, `/geburtstag-feiern-baden-baden`)
- `public/sitemap.xml`

Lokal: `npm run pages`. Die erzeugten Dateien nicht von Hand bearbeiten – Texte der Inhaltsseiten in `scripts/seiten/` ändern.

## Deployment

Siehe [DEPLOYMENT.md](./DEPLOYMENT.md) für die vollständige Anleitung.

### Kurzfassung

1. Repository zu GitHub pushen
2. Mit Vercel verbinden
3. Vercel KV einrichten
4. Environment Variables setzen
5. Telegram Webhook konfigurieren

### Environment Variables

| Variable | Beschreibung |
|----------|--------------|
| `TELEGRAM_BOT_TOKEN` | Bot Token von @BotFather |
| `TELEGRAM_WEBHOOK_SECRET` | Geheimes Token für Webhook |
| `TELEGRAM_ALLOWED_CHAT_IDS` | Autorisierte Chat IDs |
| `SITE_BASE_URL` | Website URL |
| `REVALIDATE_SECRET` | Secret für ISR Trigger |

## Telegram Bot Befehle

| Befehl | Funktion |
|--------|----------|
| `/announce <text>` | Ankündigung setzen |
| `/event <datum> <titel>` | Event hinzufügen |
| `/events` | Events auflisten |
| `/hide` | Ankündigung ausblenden |
| `/show` | Ankündigung einblenden |
| `/status` | Status anzeigen |

## Lokale Entwicklung

```bash
# .env.local erstellen
cp .env.example .env.local

# Secrets generieren
node scripts/generate-secrets.js

# Server starten
npm run dev
```

## Lizenz

© 2025 FLEUR Baden-Baden. Alle Rechte vorbehalten.

---

Mit ♥ entwickelt von [lsgestaltung.de](https://lsgestaltung.de)
