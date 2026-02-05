/**
 * FLEUR Baden-Baden - Telegram Webhook Handler
 *
 * Serverless-Version des Bots für Vercel/Netlify/etc.
 * Wird als API-Endpoint deployed und von Telegram via Webhook aufgerufen.
 */

const crypto = require('crypto');

// ============================================
// CONFIGURATION (from environment)
// ============================================
const CONFIG = {
    botToken: process.env.TELEGRAM_BOT_TOKEN,
    authorizedUsers: (process.env.AUTHORIZED_USERS || '').split(',').map(id => parseInt(id.trim())),
    webhookSecret: process.env.WEBHOOK_SECRET,
    outputPath: process.env.OUTPUT_PATH || './public/data/announcement.json'
};

// For Vercel/Netlify, use a storage service instead of local file
// This example uses Vercel KV or similar
let storage;
try {
    storage = require('@vercel/kv');
} catch {
    storage = null;
}

// ============================================
// DATA MANAGEMENT (Serverless Version)
// ============================================
const DataManager = {
    async load() {
        if (storage) {
            const data = await storage.get('announcement');
            return data || this.getDefaultData();
        }
        // Fallback for local development
        const fs = require('fs').promises;
        try {
            const content = await fs.readFile(CONFIG.outputPath, 'utf8');
            return JSON.parse(content);
        } catch {
            return this.getDefaultData();
        }
    },

    async save(data) {
        data.lastUpdated = new Date().toISOString();
        data.meta.updateCount++;

        if (storage) {
            await storage.set('announcement', data);
            return true;
        }
        // Fallback for local development
        const fs = require('fs').promises;
        const path = require('path');
        await fs.mkdir(path.dirname(CONFIG.outputPath), { recursive: true });
        await fs.writeFile(CONFIG.outputPath, JSON.stringify(data, null, 2));
        return true;
    },

    getDefaultData() {
        return {
            version: 1,
            lastUpdated: new Date().toISOString(),
            announcement: {
                active: true,
                text: 'Willkommen im FLEUR Baden-Baden!',
                link: '#events',
                linkText: 'Mehr erfahren',
                icon: '',
                priority: 'normal',
                expiresAt: null
            },
            events: [],
            meta: {
                updatedBy: 'telegram',
                updateCount: 0
            }
        };
    },

    sanitize(text) {
        if (!text) return '';
        return text
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .trim()
            .substring(0, 500);
    }
};

// ============================================
// TELEGRAM API HELPER
// ============================================
async function sendMessage(chatId, text) {
    const url = `https://api.telegram.org/bot${CONFIG.botToken}/sendMessage`;
    await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            chat_id: chatId,
            text: text
        })
    });
}

// ============================================
// COMMAND HANDLERS
// ============================================
const handlers = {
    async start(chatId) {
        await sendMessage(chatId, `
FLEUR Baden-Baden Announcement Bot

Befehle:
/announce <text> - Neue Ankündigung
/hide - Ausblenden
/show - Einblenden
/status - Status anzeigen
/help - Hilfe
        `.trim());
    },

    async help(chatId) {
        await sendMessage(chatId, `
/announce <text> - Setzt Ankündigung
/event <YYYY-MM-DD> <titel> - Neues Event
/hide - Blendet aus
/show - Blendet ein
/status - Zeigt Status
/link <url> - Setzt Link
/icon <emoji> - Setzt Icon
        `.trim());
    },

    async announce(chatId, text) {
        if (!text) {
            await sendMessage(chatId, 'Bitte Text angeben.');
            return;
        }
        const data = await DataManager.load();
        data.announcement.text = DataManager.sanitize(text);
        data.announcement.active = true;
        await DataManager.save(data);
        await sendMessage(chatId, `Ankündigung aktualisiert: "${text}"`);
    },

    async hide(chatId) {
        const data = await DataManager.load();
        data.announcement.active = false;
        await DataManager.save(data);
        await sendMessage(chatId, 'Ankündigung ausgeblendet.');
    },

    async show(chatId) {
        const data = await DataManager.load();
        data.announcement.active = true;
        await DataManager.save(data);
        await sendMessage(chatId, 'Ankündigung eingeblendet.');
    },

    async status(chatId) {
        const data = await DataManager.load();
        await sendMessage(chatId, `
Status:
- Aktiv: ${data.announcement.active ? 'Ja' : 'Nein'}
- Text: "${data.announcement.text}"
- Events: ${data.events.length}
- Updates: ${data.meta.updateCount}
        `.trim());
    },

    async event(chatId, args) {
        const match = args.match(/^(\d{4}-\d{2}-\d{2})\s+(.+)$/);
        if (!match) {
            await sendMessage(chatId, 'Format: /event YYYY-MM-DD Titel');
            return;
        }
        const data = await DataManager.load();
        data.events.push({
            id: `evt-${Date.now()}`,
            title: DataManager.sanitize(match[2]),
            date: match[1],
            time: '22:00',
            djs: [],
            description: '',
            active: true
        });
        await DataManager.save(data);
        await sendMessage(chatId, `Event hinzugefügt: ${match[2]} am ${match[1]}`);
    },

    async link(chatId, url) {
        const data = await DataManager.load();
        data.announcement.link = DataManager.sanitize(url);
        await DataManager.save(data);
        await sendMessage(chatId, `Link aktualisiert: ${url}`);
    },

    async icon(chatId, emoji) {
        const data = await DataManager.load();
        data.announcement.icon = emoji.substring(0, 5);
        await DataManager.save(data);
        await sendMessage(chatId, `Icon aktualisiert: ${emoji}`);
    }
};

// ============================================
// MAIN HANDLER (Vercel/Netlify API Route)
// ============================================
module.exports = async function handler(req, res) {
    // Verify webhook secret
    const secret = req.query.secret;
    if (secret !== CONFIG.webhookSecret) {
        console.warn('Invalid webhook secret');
        return res.status(401).json({ error: 'Unauthorized' });
    }

    // Only accept POST
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const update = req.body;

        // Validate update structure
        if (!update.message || !update.message.text) {
            return res.status(200).json({ ok: true });
        }

        const message = update.message;
        const userId = message.from.id;
        const chatId = message.chat.id;
        const text = message.text;

        // Check authorization
        if (!CONFIG.authorizedUsers.includes(userId)) {
            console.warn(`Unauthorized user: ${userId}`);
            return res.status(200).json({ ok: true }); // Silent fail
        }

        // Parse command
        const commandMatch = text.match(/^\/(\w+)(?:\s+(.*))?$/);
        if (!commandMatch) {
            return res.status(200).json({ ok: true });
        }

        const command = commandMatch[1].toLowerCase();
        const args = commandMatch[2] || '';

        // Execute handler
        if (handlers[command]) {
            await handlers[command](chatId, args);
        } else {
            await sendMessage(chatId, 'Unbekannter Befehl. /help für Hilfe.');
        }

        return res.status(200).json({ ok: true });

    } catch (error) {
        console.error('Webhook error:', error);
        return res.status(500).json({ error: 'Internal error' });
    }
};

// For Vercel API routes
module.exports.config = {
    api: {
        bodyParser: true
    }
};
