#!/bin/bash

# ============================================
# FLEUR Baden-Baden - Telegram Webhook Setup
# ============================================

echo "🌸 FLEUR Baden-Baden - Telegram Webhook Setup"
echo "=============================================="
echo ""

# Check for required variables
if [ -z "$TELEGRAM_BOT_TOKEN" ]; then
    read -p "Telegram Bot Token eingeben: " TELEGRAM_BOT_TOKEN
fi

if [ -z "$TELEGRAM_WEBHOOK_SECRET" ]; then
    read -p "Webhook Secret eingeben: " TELEGRAM_WEBHOOK_SECRET
fi

if [ -z "$SITE_BASE_URL" ]; then
    read -p "Website URL eingeben (z.B. https://fleur-badenbaden.de): " SITE_BASE_URL
fi

# Construct webhook URL
WEBHOOK_URL="${SITE_BASE_URL}/api/telegram?secret=${TELEGRAM_WEBHOOK_SECRET}"

echo ""
echo "Webhook URL: $WEBHOOK_URL"
echo ""

# Set webhook
echo "Setze Webhook..."
RESPONSE=$(curl -s -X POST "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/setWebhook" \
    -H "Content-Type: application/json" \
    -d "{\"url\": \"${WEBHOOK_URL}\", \"allowed_updates\": [\"message\"]}")

echo "Antwort: $RESPONSE"
echo ""

# Verify webhook
echo "Prüfe Webhook-Status..."
INFO=$(curl -s "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/getWebhookInfo")
echo "Status: $INFO"
echo ""

# Check for success
if echo "$RESPONSE" | grep -q '"ok":true'; then
    echo "✅ Webhook erfolgreich eingerichtet!"
else
    echo "❌ Fehler beim Einrichten des Webhooks"
    echo "Bitte prüfe Token und URL"
fi

echo ""
echo "=============================================="
echo "Nächste Schritte:"
echo "1. Öffne Telegram und sende /start an deinen Bot"
echo "2. Prüfe die Vercel Function Logs bei Problemen"
echo "=============================================="
