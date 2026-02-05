# FLEUR Baden-Baden Telegram Bot - Ankündigungsfeld-System

## Übersicht

Dieses System ermöglicht die einfache Aktualisierung des Ankündigungsfelds auf der FLEUR Website über einen Telegram Bot. Der Bot empfängt Nachrichten, verarbeitet sie und aktualisiert automatisch eine JSON-Datei, die von der Website geladen wird.

## Architektur

```
┌─────────────────┐      ┌─────────────────┐      ┌─────────────────┐
│  Telegram App   │──────│  Telegram Bot   │──────│   JSON File     │
│  (Smartphone)   │      │  (Node.js)      │      │  (Static Host)  │
└─────────────────┘      └─────────────────┘      └─────────────────┘
                                                           │
                                                           ▼
                                                  ┌─────────────────┐
                                                  │    Website      │
                                                  │  (fetch JSON)   │
                                                  └─────────────────┘
```

## Datenformat

### announcement.json
```json
{
  "version": 1,
  "lastUpdated": "2025-02-14T18:30:00Z",
  "announcement": {
    "active": true,
    "text": "Valentine's Day Special am 14. Februar mit MAALEEK + KEZRULESEVERYTHING!",
    "link": "#events",
    "linkText": "Mehr erfahren →",
    "icon": "✦",
    "priority": "normal",
    "expiresAt": "2025-02-15T06:00:00Z"
  },
  "events": [
    {
      "id": "evt-001",
      "title": "DEEP HOUSE NIGHT",
      "date": "2025-02-14",
      "time": "22:00",
      "djs": ["MAALEEK", "KEZRULESEVERYTHING"],
      "description": "Valentine's Day Special",
      "image": "img/events/deep-house-night.jpg",
      "active": true
    }
  ],
  "meta": {
    "updatedBy": "telegram",
    "updateCount": 42
  }
}
```

## Telegram Bot Befehle

| Befehl | Beschreibung | Beispiel |
|--------|--------------|----------|
| `/announce <text>` | Setzt neue Ankündigung | `/announce Heute: DJ Night mit MAALEEK!` |
| `/event <datum> <titel>` | Neues Event hinzufügen | `/event 2025-02-21 Latin Night` |
| `/hide` | Blendet Ankündigungsfeld aus | `/hide` |
| `/show` | Zeigt Ankündigungsfeld wieder | `/show` |
| `/status` | Zeigt aktuelle Konfiguration | `/status` |
| `/help` | Zeigt alle Befehle | `/help` |

## Setup-Anleitung

### 1. Bot bei Telegram erstellen

1. Öffne Telegram und suche nach `@BotFather`
2. Starte Chat und sende `/newbot`
3. Folge den Anweisungen:
   - Bot Name: `FLEUR Announcements`
   - Bot Username: `fleur_announcements_bot` (muss eindeutig sein)
4. Kopiere den **Bot Token** (sieht aus wie: `123456789:ABCdefGHIjklMNOpqrsTUVwxyz`)
5. Sende `/setcommands` an BotFather und wähle deinen Bot
6. Füge folgende Befehle hinzu:
```
announce - Neue Ankündigung setzen
event - Neues Event hinzufügen
hide - Ankündigung ausblenden
show - Ankündigung einblenden
status - Aktuelle Konfiguration anzeigen
help - Hilfe anzeigen
```

### 2. Autorisierte User festlegen

1. Öffne Telegram und suche nach `@userinfobot`
2. Starte Chat - er zeigt dir deine User-ID (z.B. `123456789`)
3. Notiere die IDs aller Personen, die den Bot nutzen dürfen

### 3. Umgebungsvariablen

Erstelle `.env` Datei:

```env
# Telegram Bot Token (von BotFather)
TELEGRAM_BOT_TOKEN=123456789:ABCdefGHIjklMNOpqrsTUVwxyz

# Autorisierte Telegram User IDs (kommagetrennt)
AUTHORIZED_USERS=123456789,987654321

# Geheimer Schlüssel für Webhook-Authentifizierung
WEBHOOK_SECRET=ein-sehr-langer-zufälliger-string-hier

# Pfad zur JSON-Ausgabedatei
OUTPUT_PATH=./public/data/announcement.json

# Server Port
PORT=3000

# Website URL (für Webhook)
WEBSITE_URL=https://fleur-badenbaden.de
```

### 4. Installation

```bash
# Repository klonen oder Dateien kopieren
cd telegram-bot

# Dependencies installieren
npm install

# Bot starten (Entwicklung)
npm run dev

# Bot starten (Produktion)
npm start
```

### 5. Deployment Optionen

#### Option A: Eigener Server (VPS)

```bash
# Mit PM2 für Process Management
npm install -g pm2
pm2 start bot.js --name "fleur-telegram-bot"
pm2 save
pm2 startup
```

#### Option B: Vercel/Netlify (Serverless)

Für Serverless wird der Bot als Webhook konfiguriert:

1. Deploy `webhook-handler.js` als Serverless Function
2. Webhook bei Telegram registrieren:
```bash
curl -X POST "https://api.telegram.org/bot<BOT_TOKEN>/setWebhook" \
     -H "Content-Type: application/json" \
     -d '{"url": "https://your-domain.com/api/telegram-webhook?secret=<WEBHOOK_SECRET>"}'
```

#### Option C: Railway/Render/Fly.io

Diese Plattformen unterstützen Long-Running-Prozesse:

1. Repository mit Code pushen
2. Umgebungsvariablen in Dashboard setzen
3. Auto-Deploy aktivieren

## Security

### Implementierte Sicherheitsmaßnahmen

1. **User-Authentifizierung**: Nur autorisierte Telegram-User können Befehle ausführen
2. **Bot Token als ENV**: Token wird nicht im Code gespeichert
3. **Webhook Secret**: Verhindert unautorisierte Webhook-Aufrufe
4. **Rate Limiting**: Maximal 10 Updates pro Minute
5. **Input Sanitization**: Alle Eingaben werden bereinigt
6. **HTTPS Only**: Webhook nur über HTTPS erreichbar

### Empfehlungen

- Bot Token regelmäßig rotieren
- Autorisierte User-Liste klein halten
- Logs auf verdächtige Aktivitäten überwachen
- Backup der announcement.json automatisieren

## Fehlerhandling

### Bekannte Fehlerfälle

| Fehler | Ursache | Lösung |
|--------|---------|--------|
| `401 Unauthorized` | Ungültiger Bot Token | Token bei BotFather neu generieren |
| `403 Forbidden` | User nicht autorisiert | User-ID zu AUTHORIZED_USERS hinzufügen |
| `ENOENT` | Output-Pfad existiert nicht | Verzeichnis erstellen |
| `Rate limit exceeded` | Zu viele Anfragen | Warten oder Limit erhöhen |

### Logging

Der Bot loggt alle Aktivitäten:

```
[2025-02-14 18:30:00] INFO: Bot started
[2025-02-14 18:30:15] INFO: Command /announce from user 123456789
[2025-02-14 18:30:15] INFO: Announcement updated successfully
[2025-02-14 18:30:20] WARN: Unauthorized access attempt from user 999999999
```
