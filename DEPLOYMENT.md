# FLEUR Baden-Baden - Deployment Guide

Vollständige Anleitung für GitHub → Vercel Deployment mit Telegram Bot Integration.

---

## Inhaltsverzeichnis

1. [Überblick](#überblick)
2. [GitHub Repository Setup](#1-github-repository-setup)
3. [Vercel Setup](#2-vercel-setup)
4. [Vercel KV einrichten](#3-vercel-kv-einrichten)
5. [Environment Variables](#4-environment-variables)
6. [Telegram Bot erstellen](#5-telegram-bot-erstellen)
7. [Webhook einrichten](#6-webhook-einrichten)
8. [Deployment Workflow](#7-deployment-workflow)
9. [Test-Checkliste](#8-test-checkliste)
10. [Troubleshooting](#9-troubleshooting)

---

## Überblick

### Architektur

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│    GitHub       │────▶│     Vercel      │────▶│   Production    │
│   Repository    │     │   Build & Host  │     │    Website      │
└─────────────────┘     └─────────────────┘     └─────────────────┘
                               │
                               ▼
                        ┌─────────────────┐
                        │   Vercel KV     │
                        │  (Data Store)   │
                        └─────────────────┘
                               ▲
                               │
┌─────────────────┐     ┌─────────────────┐
│    Telegram     │────▶│   API Route     │
│    Bot Admin    │     │   /api/telegram │
└─────────────────┘     └─────────────────┘
```

### Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Hosting**: Vercel
- **Database**: Vercel KV (Redis)
- **Bot**: Telegram Bot API (Webhook)
- **CI/CD**: GitHub → Vercel Auto-Deploy

---

## 1. GitHub Repository Setup

### 1.1 Repository erstellen

```bash
# Im Projektverzeichnis
cd /path/to/Fleur\ Bar

# Git initialisieren
git init

# Alle Dateien hinzufügen
git add .

# Initial Commit
git commit -m "Initial commit: FLEUR Baden-Baden Website"
```

### 1.2 Remote hinzufügen

```bash
# Repository auf GitHub erstellen (github.com/new)
# Dann verbinden:
git remote add origin https://github.com/DEIN-USERNAME/fleur-badenbaden.git
git branch -M main
git push -u origin main
```

### 1.3 Branch-Strategie

| Branch | Zweck | Deployment |
|--------|-------|------------|
| `main` | Production | Auto → Production |
| `dev` | Staging (optional) | Auto → Preview |
| Feature-Branches | Entwicklung | Auto → Preview |

---

## 2. Vercel Setup

### 2.1 Vercel Account & Import

1. Gehe zu [vercel.com](https://vercel.com) und logge dich ein
2. Klicke **"Add New Project"**
3. Wähle **"Import Git Repository"**
4. Autorisiere Vercel für dein GitHub Konto
5. Wähle das Repository `fleur-badenbaden`

### 2.2 Project Settings

```
Framework Preset: Next.js
Root Directory: ./
Build Command: npm run build (auto-detected)
Output Directory: .next (auto-detected)
Install Command: npm install (auto-detected)
```

### 2.3 Domain verbinden

1. Gehe zu Project → Settings → Domains
2. Füge hinzu: `fleur-badenbaden.de`
3. Folge den DNS-Anweisungen bei deinem Domain-Provider

**DNS Records (bei Domain-Provider):**
```
Type: A
Name: @
Value: 76.76.21.21

Type: CNAME
Name: www
Value: cname.vercel-dns.com
```

---

## 3. Vercel KV einrichten

### 3.1 KV Store erstellen

1. Gehe zu Project → Storage
2. Klicke **"Create Database"**
3. Wähle **"KV"** (Redis-kompatibel)
4. Name: `fleur-kv`
5. Region: `Frankfurt (fra1)`
6. Klicke **"Create"**

### 3.2 Mit Projekt verbinden

1. Wähle den erstellten KV Store
2. Klicke **"Connect to Project"**
3. Wähle dein FLEUR Projekt
4. Environment: `Production`, `Preview`, `Development`

> **Wichtig:** Die KV Environment Variables werden automatisch gesetzt!

---

## 4. Environment Variables

### 4.1 In Vercel setzen

Gehe zu: Project → Settings → Environment Variables

| Variable | Wert | Umgebungen |
|----------|------|------------|
| `TELEGRAM_BOT_TOKEN` | `123456789:ABC...` | All |
| `TELEGRAM_WEBHOOK_SECRET` | (generieren) | All |
| `TELEGRAM_ALLOWED_CHAT_IDS` | `123456789,987654321` | All |
| `SITE_BASE_URL` | `https://fleur-badenbaden.de` | Production |
| `SITE_BASE_URL` | `https://fleur-preview.vercel.app` | Preview |
| `WHATSAPP_NUMBER` | `4917661455163` | All |
| `REVALIDATE_SECRET` | (generieren) | All |

### 4.2 Secrets generieren

```bash
# Webhook Secret (32 Bytes)
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Revalidate Secret (16 Bytes)
node -e "console.log(require('crypto').randomBytes(16).toString('hex'))"
```

### 4.3 KV Variables (automatisch)

Diese werden automatisch gesetzt wenn KV verbunden ist:
- `KV_URL`
- `KV_REST_API_URL`
- `KV_REST_API_TOKEN`
- `KV_REST_API_READ_ONLY_TOKEN`

---

## 5. Telegram Bot erstellen

### 5.1 Bot bei BotFather anlegen

1. Öffne Telegram und suche `@BotFather`
2. Sende `/newbot`
3. **Name**: `FLEUR Baden-Baden`
4. **Username**: `fleur_badenbaden_bot` (muss eindeutig sein)
5. Kopiere den **Token** (Format: `123456789:ABCdefGHIjklMNOpqrsTUVwxyz`)

### 5.2 Bot-Befehle setzen

Sende an @BotFather:
```
/setcommands
```

Wähle deinen Bot, dann sende:
```
announce - Neue Ankündigung setzen
event - Neues Event hinzufügen
events - Alle Events anzeigen
delete - Event löschen
hide - Ankündigung ausblenden
show - Ankündigung einblenden
status - Aktuellen Status anzeigen
help - Hilfe anzeigen
```

### 5.3 Deine Chat-ID finden

1. Öffne Telegram und suche `@userinfobot`
2. Starte Chat → zeigt deine User/Chat-ID
3. Notiere die ID für `TELEGRAM_ALLOWED_CHAT_IDS`

---

## 6. Webhook einrichten

### 6.1 Webhook URL

Nach dem Deployment ist der Webhook erreichbar unter:

```
https://fleur-badenbaden.de/api/telegram?secret=<WEBHOOK_SECRET>
```

### 6.2 Webhook bei Telegram setzen

```bash
# Ersetze <BOT_TOKEN> und <WEBHOOK_SECRET>
curl -X POST "https://api.telegram.org/bot<BOT_TOKEN>/setWebhook" \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://fleur-badenbaden.de/api/telegram?secret=<WEBHOOK_SECRET>",
    "allowed_updates": ["message"]
  }'
```

**Erwartete Antwort:**
```json
{"ok": true, "result": true, "description": "Webhook was set"}
```

### 6.3 Webhook Status prüfen

```bash
curl "https://api.telegram.org/bot<BOT_TOKEN>/getWebhookInfo"
```

### 6.4 Webhook entfernen (falls nötig)

```bash
curl "https://api.telegram.org/bot<BOT_TOKEN>/deleteWebhook"
```

---

## 7. Deployment Workflow

### 7.1 Production Deployment

```bash
# Änderungen committen
git add .
git commit -m "Feature: neue Funktion"

# Nach main pushen → Auto-Deploy
git push origin main
```

### 7.2 Preview Deployment

```bash
# Feature-Branch erstellen
git checkout -b feature/neue-funktion

# Änderungen committen
git add .
git commit -m "WIP: neue Funktion"

# Pushen → Erstellt Preview Deployment
git push origin feature/neue-funktion

# Pull Request erstellen auf GitHub
# → Vercel erstellt automatisch Preview URL
```

### 7.3 Manuelles Redeploy

1. Vercel Dashboard → Project → Deployments
2. Klicke auf "..." bei letztem Deployment
3. Wähle "Redeploy"

---

## 8. Test-Checkliste

### ✅ GitHub → Vercel

- [ ] Repository ist mit Vercel verbunden
- [ ] Push zu `main` triggert Production Deployment
- [ ] PRs erhalten Preview Deployments
- [ ] Build läuft fehlerfrei durch

### ✅ Telegram Bot

- [ ] Bot antwortet auf `/start`
- [ ] Nur autorisierte User können Befehle nutzen
- [ ] `/announce Test` aktualisiert Ankündigung
- [ ] `/event 21.02. Test Event` erstellt Event
- [ ] `/status` zeigt aktuelle Daten

### ✅ Daten-Persistenz

- [ ] Vercel KV ist verbunden
- [ ] Daten bleiben nach Redeploy erhalten
- [ ] `/api/data` gibt aktuelle Daten zurück

### ✅ Website-Aktualisierung

- [ ] Ankündigung erscheint nach Telegram Update
- [ ] Events werden korrekt angezeigt
- [ ] Seite revalidiert innerhalb von 60 Sekunden

---

## 9. Troubleshooting

### Problem: Webhook antwortet nicht

**Prüfen:**
```bash
# Webhook Info abrufen
curl "https://api.telegram.org/bot<TOKEN>/getWebhookInfo"
```

**Häufige Ursachen:**
- Secret in URL stimmt nicht mit ENV überein
- Bot Token ist falsch
- HTTPS Zertifikat Problem

**Lösung:**
1. Webhook neu setzen
2. ENV Variables prüfen
3. Vercel Logs prüfen: Project → Deployments → Functions

---

### Problem: 401 Unauthorized bei Bot

**Ursache:** Chat-ID nicht in Whitelist

**Lösung:**
1. Deine Chat-ID bei @userinfobot holen
2. `TELEGRAM_ALLOWED_CHAT_IDS` in Vercel aktualisieren
3. Redeploy triggern

---

### Problem: Daten werden nicht gespeichert

**Prüfen:**
1. Vercel KV ist verbunden (Storage → KV)
2. KV Environment Variables sind gesetzt
3. Vercel Logs auf Fehler prüfen

**Manuell testen:**
```bash
curl https://fleur-badenbaden.de/api/data
```

---

### Problem: Website zeigt alte Daten

**Ursache:** ISR Cache noch aktiv

**Lösung A:** Warten (max 60 Sekunden)

**Lösung B:** Manuell revalidieren
```bash
curl -X POST "https://fleur-badenbaden.de/api/revalidate?secret=<REVALIDATE_SECRET>&path=/"
```

---

### Problem: Build schlägt fehl

**Vercel Logs prüfen:**
1. Project → Deployments
2. Klick auf fehlgeschlagenes Deployment
3. "View Build Logs"

**Häufige Ursachen:**
- TypeScript Fehler
- Fehlende Dependencies
- ENV Variables nicht gesetzt

---

## Support

Bei Fragen oder Problemen:
- **Repository**: github.com/DEIN-USERNAME/fleur-badenbaden
- **Vercel Docs**: vercel.com/docs
- **Next.js Docs**: nextjs.org/docs
- **Telegram Bot API**: core.telegram.org/bots/api

---

**Letzte Aktualisierung:** Februar 2025
