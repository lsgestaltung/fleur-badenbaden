/**
 * FLEUR Baden-Baden - Telegram Announcement Bot
 *
 * Dieser Bot ermöglicht die einfache Aktualisierung des
 * Ankündigungsfelds auf der Website über Telegram.
 */

require('dotenv').config();
const TelegramBot = require('node-telegram-bot-api');
const fs = require('fs').promises;
const path = require('path');

// ============================================
// CONFIGURATION
// ============================================
const CONFIG = {
    botToken: process.env.TELEGRAM_BOT_TOKEN,
    authorizedUsers: (process.env.AUTHORIZED_USERS || '').split(',').map(id => parseInt(id.trim())),
    outputPath: process.env.OUTPUT_PATH || './public/data/announcement.json',
    rateLimitPerMinute: 10,
    logLevel: process.env.LOG_LEVEL || 'info'
};

// Validate configuration
if (!CONFIG.botToken) {
    console.error('[ERROR] TELEGRAM_BOT_TOKEN is required');
    process.exit(1);
}

if (CONFIG.authorizedUsers.length === 0 || CONFIG.authorizedUsers[0] === 0) {
    console.error('[ERROR] AUTHORIZED_USERS is required');
    process.exit(1);
}

// ============================================
// LOGGING
// ============================================
const Logger = {
    levels: { error: 0, warn: 1, info: 2, debug: 3 },
    currentLevel: 2,

    init() {
        this.currentLevel = this.levels[CONFIG.logLevel] || 2;
    },

    format(level, message) {
        const timestamp = new Date().toISOString().replace('T', ' ').split('.')[0];
        return `[${timestamp}] ${level.toUpperCase()}: ${message}`;
    },

    error(msg) { if (this.currentLevel >= 0) console.error(this.format('error', msg)); },
    warn(msg) { if (this.currentLevel >= 1) console.warn(this.format('warn', msg)); },
    info(msg) { if (this.currentLevel >= 2) console.log(this.format('info', msg)); },
    debug(msg) { if (this.currentLevel >= 3) console.log(this.format('debug', msg)); }
};

Logger.init();

// ============================================
// RATE LIMITING
// ============================================
const RateLimiter = {
    requests: new Map(),

    check(userId) {
        const now = Date.now();
        const userRequests = this.requests.get(userId) || [];

        // Remove requests older than 1 minute
        const recentRequests = userRequests.filter(time => now - time < 60000);

        if (recentRequests.length >= CONFIG.rateLimitPerMinute) {
            return false;
        }

        recentRequests.push(now);
        this.requests.set(userId, recentRequests);
        return true;
    }
};

// ============================================
// DATA MANAGEMENT
// ============================================
const DataManager = {
    data: null,

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

    async load() {
        try {
            const content = await fs.readFile(CONFIG.outputPath, 'utf8');
            this.data = JSON.parse(content);
            Logger.info('Data loaded from file');
        } catch (error) {
            if (error.code === 'ENOENT') {
                Logger.info('No existing data file, creating default');
                this.data = this.getDefaultData();
                await this.save();
            } else {
                Logger.error(`Failed to load data: ${error.message}`);
                this.data = this.getDefaultData();
            }
        }
        return this.data;
    },

    async save() {
        try {
            // Ensure directory exists
            const dir = path.dirname(CONFIG.outputPath);
            await fs.mkdir(dir, { recursive: true });

            // Update metadata
            this.data.lastUpdated = new Date().toISOString();
            this.data.meta.updateCount++;

            // Write file
            await fs.writeFile(
                CONFIG.outputPath,
                JSON.stringify(this.data, null, 2),
                'utf8'
            );

            Logger.info('Data saved to file');
            return true;
        } catch (error) {
            Logger.error(`Failed to save data: ${error.message}`);
            return false;
        }
    },

    // Sanitize user input
    sanitize(text) {
        if (!text) return '';
        return text
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .trim()
            .substring(0, 500); // Max 500 chars
    }
};

// ============================================
// AUTHORIZATION
// ============================================
function isAuthorized(userId) {
    return CONFIG.authorizedUsers.includes(userId);
}

function authMiddleware(handler) {
    return async (msg, match) => {
        const userId = msg.from.id;
        const username = msg.from.username || 'unknown';

        if (!isAuthorized(userId)) {
            Logger.warn(`Unauthorized access attempt from user ${userId} (@${username})`);
            return;
        }

        if (!RateLimiter.check(userId)) {
            Logger.warn(`Rate limit exceeded for user ${userId}`);
            bot.sendMessage(msg.chat.id, 'Zu viele Anfragen. Bitte warte eine Minute.');
            return;
        }

        Logger.info(`Command from user ${userId} (@${username}): ${msg.text}`);
        return handler(msg, match);
    };
}

// ============================================
// BOT INITIALIZATION
// ============================================
const bot = new TelegramBot(CONFIG.botToken, { polling: true });

Logger.info('Bot starting...');

// ============================================
// COMMAND HANDLERS
// ============================================

// /start - Welcome message
bot.onText(/\/start/, authMiddleware(async (msg) => {
    const welcomeMessage = `
FLEUR Baden-Baden Announcement Bot

Verfügbare Befehle:
/announce <text> - Neue Ankündigung setzen
/event <datum> <titel> - Neues Event hinzufügen
/hide - Ankündigung ausblenden
/show - Ankündigung einblenden
/status - Aktuelle Konfiguration anzeigen
/help - Diese Hilfe anzeigen

Beispiel:
/announce Heute Nacht: Deep House mit DJ MAALEEK!
    `.trim();

    await bot.sendMessage(msg.chat.id, welcomeMessage);
}));

// /help - Show help
bot.onText(/\/help/, authMiddleware(async (msg) => {
    const helpMessage = `
Befehle im Detail:

/announce <text>
Setzt den Text im Ankündigungsfeld.
Beispiel: /announce Valentine's Special am 14. Februar!

/event <YYYY-MM-DD> <titel>
Fügt ein neues Event hinzu.
Beispiel: /event 2025-02-21 Latin Night

/hide
Blendet das Ankündigungsfeld aus.

/show
Zeigt das Ankündigungsfeld wieder an.

/status
Zeigt die aktuelle Konfiguration.

/link <url>
Setzt den Link der Ankündigung.
Beispiel: /link #events

/icon <emoji>
Setzt das Icon der Ankündigung.
Beispiel: /icon
    `.trim();

    await bot.sendMessage(msg.chat.id, helpMessage);
}));

// /announce <text> - Set announcement
bot.onText(/\/announce (.+)/, authMiddleware(async (msg, match) => {
    const text = DataManager.sanitize(match[1]);

    if (!text) {
        await bot.sendMessage(msg.chat.id, 'Bitte gib einen Text ein.');
        return;
    }

    DataManager.data.announcement.text = text;
    DataManager.data.announcement.active = true;

    if (await DataManager.save()) {
        await bot.sendMessage(msg.chat.id, `Ankündigung aktualisiert:\n"${text}"`);
    } else {
        await bot.sendMessage(msg.chat.id, 'Fehler beim Speichern. Bitte erneut versuchen.');
    }
}));

// /event <date> <title> - Add event
bot.onText(/\/event (\d{4}-\d{2}-\d{2}) (.+)/, authMiddleware(async (msg, match) => {
    const date = match[1];
    const title = DataManager.sanitize(match[2]);

    // Validate date
    const eventDate = new Date(date);
    if (isNaN(eventDate.getTime())) {
        await bot.sendMessage(msg.chat.id, 'Ungültiges Datum. Format: YYYY-MM-DD');
        return;
    }

    const newEvent = {
        id: `evt-${Date.now()}`,
        title: title,
        date: date,
        time: '22:00',
        djs: [],
        description: '',
        image: '',
        active: true
    };

    DataManager.data.events.push(newEvent);

    if (await DataManager.save()) {
        await bot.sendMessage(msg.chat.id,
            `Event hinzugefügt:\n${title}\nDatum: ${date}`
        );
    } else {
        await bot.sendMessage(msg.chat.id, 'Fehler beim Speichern.');
    }
}));

// /hide - Hide announcement
bot.onText(/\/hide/, authMiddleware(async (msg) => {
    DataManager.data.announcement.active = false;

    if (await DataManager.save()) {
        await bot.sendMessage(msg.chat.id, 'Ankündigungsfeld ausgeblendet.');
    } else {
        await bot.sendMessage(msg.chat.id, 'Fehler beim Speichern.');
    }
}));

// /show - Show announcement
bot.onText(/\/show/, authMiddleware(async (msg) => {
    DataManager.data.announcement.active = true;

    if (await DataManager.save()) {
        await bot.sendMessage(msg.chat.id, 'Ankündigungsfeld eingeblendet.');
    } else {
        await bot.sendMessage(msg.chat.id, 'Fehler beim Speichern.');
    }
}));

// /status - Show current status
bot.onText(/\/status/, authMiddleware(async (msg) => {
    const data = DataManager.data;
    const statusMessage = `
Aktueller Status:

Ankündigung:
- Aktiv: ${data.announcement.active ? 'Ja' : 'Nein'}
- Text: "${data.announcement.text}"
- Link: ${data.announcement.link}

Events: ${data.events.length} eingetragen

Letzte Aktualisierung: ${data.lastUpdated}
Update-Zähler: ${data.meta.updateCount}
    `.trim();

    await bot.sendMessage(msg.chat.id, statusMessage);
}));

// /link <url> - Set link
bot.onText(/\/link (.+)/, authMiddleware(async (msg, match) => {
    const link = DataManager.sanitize(match[1]);
    DataManager.data.announcement.link = link;

    if (await DataManager.save()) {
        await bot.sendMessage(msg.chat.id, `Link aktualisiert: ${link}`);
    } else {
        await bot.sendMessage(msg.chat.id, 'Fehler beim Speichern.');
    }
}));

// /icon <emoji> - Set icon
bot.onText(/\/icon (.+)/, authMiddleware(async (msg, match) => {
    const icon = match[1].trim().substring(0, 5);
    DataManager.data.announcement.icon = icon;

    if (await DataManager.save()) {
        await bot.sendMessage(msg.chat.id, `Icon aktualisiert: ${icon}`);
    } else {
        await bot.sendMessage(msg.chat.id, 'Fehler beim Speichern.');
    }
}));

// /linktext <text> - Set link text
bot.onText(/\/linktext (.+)/, authMiddleware(async (msg, match) => {
    const linkText = DataManager.sanitize(match[1]);
    DataManager.data.announcement.linkText = linkText;

    if (await DataManager.save()) {
        await bot.sendMessage(msg.chat.id, `Link-Text aktualisiert: ${linkText}`);
    } else {
        await bot.sendMessage(msg.chat.id, 'Fehler beim Speichern.');
    }
}));

// ============================================
// ERROR HANDLING
// ============================================
bot.on('polling_error', (error) => {
    Logger.error(`Polling error: ${error.message}`);
});

bot.on('error', (error) => {
    Logger.error(`Bot error: ${error.message}`);
});

// Handle unknown commands for authorized users
bot.on('message', (msg) => {
    if (!msg.text) return;
    if (msg.text.startsWith('/') && !msg.text.match(/^\/(start|help|announce|event|hide|show|status|link|icon|linktext)/)) {
        if (isAuthorized(msg.from.id)) {
            bot.sendMessage(msg.chat.id, 'Unbekannter Befehl. Nutze /help für eine Liste aller Befehle.');
        }
    }
});

// ============================================
// STARTUP
// ============================================
(async () => {
    await DataManager.load();
    Logger.info('Bot started successfully');
    Logger.info(`Authorized users: ${CONFIG.authorizedUsers.join(', ')}`);
    Logger.info(`Output path: ${CONFIG.outputPath}`);
})();

// Graceful shutdown
process.on('SIGINT', () => {
    Logger.info('Shutting down...');
    bot.stopPolling();
    process.exit(0);
});

process.on('SIGTERM', () => {
    Logger.info('Shutting down...');
    bot.stopPolling();
    process.exit(0);
});
