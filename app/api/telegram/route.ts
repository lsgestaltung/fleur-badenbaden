/**
 * FLEUR Baden-Baden - Telegram Webhook Handler
 *
 * Serverless API Route for Telegram Bot integration.
 * Handles incoming messages and updates site content.
 *
 * Endpoint: POST /api/telegram?secret=<WEBHOOK_SECRET>
 */

import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import DataStore from '@/lib/kv';
import type { TelegramUpdate } from '@/lib/types';

// Environment variables
const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN!;
const WEBHOOK_SECRET = process.env.TELEGRAM_WEBHOOK_SECRET!;
const ALLOWED_CHAT_IDS = (process.env.TELEGRAM_ALLOWED_CHAT_IDS || '')
  .split(',')
  .map(id => parseInt(id.trim()))
  .filter(id => !isNaN(id));

/**
 * Send message via Telegram API
 */
async function sendMessage(chatId: number, text: string): Promise<void> {
  const url = `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`;

  await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      parse_mode: 'HTML',
    }),
  });
}

/**
 * Sanitize user input
 */
function sanitize(text: string): string {
  return text
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .trim()
    .substring(0, 1000);
}

/**
 * Parse date from text (supports: YYYY-MM-DD, DD.MM.YYYY, DD.MM.)
 */
function parseDate(text: string): string | null {
  // ISO format
  const isoMatch = text.match(/(\d{4}-\d{2}-\d{2})/);
  if (isoMatch) return isoMatch[1];

  // German format with year
  const deMatch = text.match(/(\d{1,2})\.(\d{1,2})\.(\d{4})/);
  if (deMatch) {
    const [, day, month, year] = deMatch;
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  }

  // German format without year (assume current/next year)
  const shortMatch = text.match(/(\d{1,2})\.(\d{1,2})\./);
  if (shortMatch) {
    const [, day, month] = shortMatch;
    const now = new Date();
    let year = now.getFullYear();
    const date = new Date(year, parseInt(month) - 1, parseInt(day));
    if (date < now) year++;
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  }

  return null;
}

/**
 * Command handlers
 */
const commands: Record<string, (chatId: number, args: string) => Promise<void>> = {
  /**
   * /start - Welcome message
   */
  async start(chatId) {
    await sendMessage(chatId, `
<b>🌸 FLEUR Baden-Baden Bot</b>

Verfügbare Befehle:

<b>Ankündigungen:</b>
/announce &lt;text&gt; - Neue Ankündigung setzen
/hide - Ankündigung ausblenden
/show - Ankündigung einblenden

<b>Events:</b>
/event &lt;datum&gt; &lt;titel&gt; - Neues Event
/events - Alle Events anzeigen
/delete &lt;event-id&gt; - Event löschen

<b>System:</b>
/status - Aktueller Status
/help - Diese Hilfe

<i>Beispiel:</i>
/announce Valentine's Special am 14.02.!
/event 21.02. Deep House Night
    `.trim());
  },

  /**
   * /help - Show help
   */
  async help(chatId) {
    await commands.start(chatId, '');
  },

  /**
   * /announce <text> - Set announcement
   */
  async announce(chatId, args) {
    if (!args.trim()) {
      await sendMessage(chatId, '❌ Bitte Text angeben: /announce <text>');
      return;
    }

    await DataStore.setAnnouncement({
      text: sanitize(args),
      active: true,
    });

    // Trigger revalidation
    revalidatePath('/');
    revalidatePath('/api/data');

    await sendMessage(chatId, `✅ Ankündigung aktualisiert:\n"${args}"`);
  },

  /**
   * /hide - Hide announcement
   */
  async hide(chatId) {
    await DataStore.setAnnouncement({ active: false });
    revalidatePath('/');
    await sendMessage(chatId, '✅ Ankündigung ausgeblendet.');
  },

  /**
   * /show - Show announcement
   */
  async show(chatId) {
    await DataStore.setAnnouncement({ active: true });
    revalidatePath('/');
    await sendMessage(chatId, '✅ Ankündigung eingeblendet.');
  },

  /**
   * /event <date> <title> - Add new event
   */
  async event(chatId, args) {
    const date = parseDate(args);
    if (!date) {
      await sendMessage(chatId, '❌ Format: /event <datum> <titel>\nBeispiel: /event 21.02. Deep House Night');
      return;
    }

    // Extract title (everything after the date)
    const title = args
      .replace(/\d{4}-\d{2}-\d{2}/, '')
      .replace(/\d{1,2}\.\d{1,2}\.\d{4}/, '')
      .replace(/\d{1,2}\.\d{1,2}\./, '')
      .trim();

    if (!title) {
      await sendMessage(chatId, '❌ Bitte Titel angeben.');
      return;
    }

    const event = await DataStore.upsertEvent({
      title: sanitize(title),
      date,
      time: '22:00',
      djs: [],
      active: true,
    });

    revalidatePath('/');
    revalidatePath('/api/data');

    await sendMessage(chatId, `✅ Event erstellt:\n${event.title}\n📅 ${date}\n🆔 ${event.id}`);
  },

  /**
   * /events - List all events
   */
  async events(chatId) {
    const events = await DataStore.getUpcomingEvents(10);

    if (events.length === 0) {
      await sendMessage(chatId, '📭 Keine kommenden Events.');
      return;
    }

    const list = events
      .map(e => `• ${e.date}: <b>${e.title}</b>\n  DJs: ${e.djs.join(', ') || '-'}\n  ID: ${e.id}`)
      .join('\n\n');

    await sendMessage(chatId, `<b>📅 Kommende Events:</b>\n\n${list}`);
  },

  /**
   * /delete <event-id> - Delete event
   */
  async delete(chatId, args) {
    const eventId = args.trim();
    if (!eventId) {
      await sendMessage(chatId, '❌ Bitte Event-ID angeben: /delete <event-id>');
      return;
    }

    const deleted = await DataStore.deleteEvent(eventId);
    if (deleted) {
      revalidatePath('/');
      await sendMessage(chatId, `✅ Event gelöscht: ${eventId}`);
    } else {
      await sendMessage(chatId, `❌ Event nicht gefunden: ${eventId}`);
    }
  },

  /**
   * /status - Show current status
   */
  async status(chatId) {
    const [announcement, events] = await Promise.all([
      DataStore.getAnnouncement(),
      DataStore.getUpcomingEvents(5),
    ]);

    await sendMessage(chatId, `
<b>📊 FLEUR Status</b>

<b>Ankündigung:</b>
${announcement.active ? '✅ Aktiv' : '❌ Inaktiv'}
"${announcement.text}"

<b>Events:</b>
${events.length} kommende Events

<b>Letzte Aktualisierung:</b>
${announcement.updatedAt}
    `.trim());
  },
};

/**
 * POST handler for Telegram webhook
 */
export async function POST(request: NextRequest) {
  // 1. Verify webhook secret
  const secret = request.nextUrl.searchParams.get('secret');
  if (secret !== WEBHOOK_SECRET) {
    console.warn('[Telegram] Invalid webhook secret');
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const update: TelegramUpdate = await request.json();

    // 2. Validate update structure
    if (!update.message?.text || !update.message?.from) {
      return NextResponse.json({ ok: true });
    }

    const { message } = update;
    const chatId = message.chat.id;
    const userId = message.from.id;
    const text = message.text;

    // 3. Check authorization (Chat ID whitelist)
    if (ALLOWED_CHAT_IDS.length > 0 && !ALLOWED_CHAT_IDS.includes(chatId)) {
      console.warn(`[Telegram] Unauthorized chat: ${chatId} (user: ${userId})`);
      return NextResponse.json({ ok: true }); // Silent fail for security
    }

    // 4. Log the request
    console.log(`[Telegram] Message from ${message.from.username || userId}: ${text}`);

    // 5. Parse command
    const match = text.match(/^\/(\w+)(?:@\w+)?(?:\s+(.*))?$/);
    if (!match) {
      // Not a command, ignore
      return NextResponse.json({ ok: true });
    }

    const [, command, args = ''] = match;

    // 6. Execute command handler
    const handler = commands[command.toLowerCase()];
    if (handler) {
      await handler(chatId, args);
    } else {
      await sendMessage(chatId, `❓ Unbekannter Befehl: /${command}\nNutze /help für Hilfe.`);
    }

    return NextResponse.json({ ok: true });

  } catch (error) {
    console.error('[Telegram] Webhook error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

/**
 * GET handler - Health check
 */
export async function GET() {
  return NextResponse.json({
    status: 'ok',
    service: 'fleur-telegram-webhook',
    timestamp: new Date().toISOString(),
  });
}
