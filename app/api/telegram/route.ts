/**
 * FLEUR Baden-Baden - Telegram Webhook Handler
 *
 * Serverless API Route for Telegram Bot integration.
 * Handles incoming messages and updates site content.
 *
 * Commands:
 * - /start, /help - Show help
 * - /announce <text> - Set announcement
 * - /hide, /show - Toggle announcement
 * - /status - Current status
 * - DELETE EVENTS - Delete all events
 * - SET EVENTS <MONAT> - Bulk import events
 *
 * Endpoint: POST /api/telegram?secret=<WEBHOOK_SECRET>
 */

import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import DataStore from '@/lib/kv';
import type { TelegramUpdate, Event } from '@/lib/types';

// Environment variables
const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN!;
const WEBHOOK_SECRET = process.env.TELEGRAM_WEBHOOK_SECRET!;
const ALLOWED_CHAT_IDS = (process.env.TELEGRAM_ALLOWED_CHAT_IDS || '')
  .split(',')
  .map(id => parseInt(id.trim()))
  .filter(id => !isNaN(id));

// Month name to number mapping
const MONTH_MAP: Record<string, number> = {
  'JANUAR': 1, 'JANUARY': 1, 'JAN': 1,
  'FEBRUAR': 2, 'FEBRUARY': 2, 'FEB': 2,
  'MÄRZ': 3, 'MAERZ': 3, 'MARCH': 3, 'MAR': 3,
  'APRIL': 4, 'APR': 4,
  'MAI': 5, 'MAY': 5,
  'JUNI': 6, 'JUNE': 6, 'JUN': 6,
  'JULI': 7, 'JULY': 7, 'JUL': 7,
  'AUGUST': 8, 'AUG': 8,
  'SEPTEMBER': 9, 'SEPT': 9, 'SEP': 9,
  'OKTOBER': 10, 'OCTOBER': 10, 'OKT': 10, 'OCT': 10,
  'NOVEMBER': 11, 'NOV': 11,
  'DEZEMBER': 12, 'DECEMBER': 12, 'DEZ': 12, 'DEC': 12,
};

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
 * Sanitize user input for HTML
 */
function sanitize(text: string): string {
  return text
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .trim();
}

/**
 * Trigger revalidation for all relevant paths
 */
function triggerRevalidation(): void {
  revalidatePath('/');
  revalidatePath('/api/data');
  revalidatePath('/index.html');
}

/**
 * Parse event text block into Event objects
 *
 * Format:
 * 6.02 FRIZZO
 * 07.02 KEYS BANDIT
 * 14.02 URBAN FLEUR | VALENTINES DAY
 * MAALEEK x KEZRULESEVERYTHING
 */
interface ParseResult {
  success: boolean;
  events?: Omit<Event, 'id' | 'createdAt' | 'updatedAt'>[];
  error?: string;
  lineNumber?: number;
}

function parseEventBlock(text: string, monthName: string): ParseResult {
  const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);

  if (lines.length === 0) {
    return { success: false, error: 'Keine Events im Text gefunden', lineNumber: 1 };
  }

  // Get year - use current year, or next year if month is in the past
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;
  const targetMonth = MONTH_MAP[monthName.toUpperCase()] || currentMonth;
  const year = targetMonth < currentMonth ? currentYear + 1 : currentYear;

  const events: Omit<Event, 'id' | 'createdAt' | 'updatedAt'>[] = [];
  let currentEvent: Omit<Event, 'id' | 'createdAt' | 'updatedAt'> | null = null;
  let currentArtists: string[] = [];

  // Regex to match date at start of line: D.MM or DD.MM
  const dateRegex = /^(\d{1,2})\.(\d{1,2})\s+(.+)$/;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lineNumber = i + 1;

    const dateMatch = line.match(dateRegex);

    if (dateMatch) {
      // Save previous event if exists
      if (currentEvent) {
        // If no artists were added, use title as artist (fallback)
        if (currentArtists.length === 0) {
          currentArtists = [currentEvent.title.split('|')[0].trim()];
        }
        currentEvent.djs = currentArtists;
        events.push(currentEvent);
      }

      // Parse new event
      const [, dayStr, monthStr, title] = dateMatch;
      const day = parseInt(dayStr);
      const month = parseInt(monthStr);

      // Validate date
      if (month < 1 || month > 12) {
        return { success: false, error: `Ungültiger Monat: ${month}`, lineNumber };
      }
      if (day < 1 || day > 31) {
        return { success: false, error: `Ungültiger Tag: ${day}`, lineNumber };
      }

      // Format date as ISO
      const dateStr = `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;

      currentEvent = {
        title: title.trim(),
        date: dateStr,
        time: '22:00',
        djs: [],
        description: '',
        image: '',
        active: true,
        featured: false,
        month: monthName.toUpperCase(),
      };
      currentArtists = [];

    } else if (currentEvent) {
      // This line is an artist line for the current event
      // Split by common separators: x, &, ,
      const artistsInLine = line
        .split(/\s+x\s+|\s+&\s+|\s*,\s*/i)
        .map(a => a.trim())
        .filter(a => a.length > 0);

      currentArtists.push(...artistsInLine);
    } else {
      // Line doesn't start with date and no current event
      return {
        success: false,
        error: `Datum nicht erkannt: "${line}"`,
        lineNumber
      };
    }
  }

  // Don't forget the last event
  if (currentEvent) {
    if (currentArtists.length === 0) {
      currentArtists = [currentEvent.title.split('|')[0].trim()];
    }
    currentEvent.djs = currentArtists;
    events.push(currentEvent);
  }

  if (events.length === 0) {
    return { success: false, error: 'Keine gültigen Events gefunden', lineNumber: 1 };
  }

  return { success: true, events };
}

/**
 * Handle DELETE EVENTS command
 */
async function handleDeleteEvents(chatId: number): Promise<void> {
  try {
    await DataStore.setEvents([]);
    triggerRevalidation();
    await sendMessage(chatId, '🗑️ Alle Events wurden gelöscht.');
  } catch (error) {
    console.error('[Telegram] Delete events error:', error);
    await sendMessage(chatId, '❌ Fehler beim Löschen der Events.');
  }
}

/**
 * Handle SET EVENTS command
 */
async function handleSetEvents(chatId: number, monthName: string, eventText: string): Promise<void> {
  // Validate month
  if (!MONTH_MAP[monthName.toUpperCase()]) {
    await sendMessage(chatId, `❌ Unbekannter Monat: ${monthName}\nBeispiel: SET EVENTS FEBRUAR`);
    return;
  }

  if (!eventText.trim()) {
    await sendMessage(chatId, '❌ Keine Events angegeben.\nSende SET EVENTS MONAT gefolgt von den Events.');
    return;
  }

  // Parse events
  const result = parseEventBlock(eventText, monthName);

  if (!result.success) {
    await sendMessage(
      chatId,
      `❌ Fehler in Zeile ${result.lineNumber}: ${result.error}\n\nKein Event wurde importiert.`
    );
    return;
  }

  // Transactional: Create all events with IDs
  const now = new Date().toISOString();
  const eventsWithIds: Event[] = result.events!.map((e, index) => ({
    ...e,
    id: `evt-${Date.now()}-${index}`,
    createdAt: now,
    updatedAt: now,
  }));

  try {
    // Replace all events (transactional)
    await DataStore.setEvents(eventsWithIds);
    triggerRevalidation();

    // Build success message with preview
    const previewCount = Math.min(3, eventsWithIds.length);
    const preview = eventsWithIds
      .slice(0, previewCount)
      .map(e => `  • ${e.date.slice(5)}: ${e.title}`)
      .join('\n');

    const remaining = eventsWithIds.length - previewCount;
    const moreText = remaining > 0 ? `\n  ... und ${remaining} weitere` : '';

    await sendMessage(
      chatId,
      `✅ ${eventsWithIds.length} Events für ${monthName.toUpperCase()} erfolgreich importiert!\n\n<b>Vorschau:</b>\n${preview}${moreText}`
    );

  } catch (error) {
    console.error('[Telegram] Set events error:', error);
    await sendMessage(chatId, '❌ Fehler beim Speichern der Events. Keine Events wurden importiert.');
  }
}

/**
 * Command handlers (slash commands)
 */
const commands: Record<string, (chatId: number, args: string) => Promise<void>> = {
  async start(chatId) {
    await sendMessage(chatId, `
<b>🌸 FLEUR Baden-Baden Bot</b>

<b>📢 Ankündigungen:</b>
/announce &lt;text&gt; - Neue Ankündigung
/hide - Ausblenden
/show - Einblenden

<b>📅 Event-Management:</b>
<code>DELETE EVENTS</code> - Alle Events löschen
<code>SET EVENTS MONAT</code> - Events importieren

<b>Event-Format:</b>
<code>SET EVENTS FEBRUAR
6.02 FRIZZO
07.02 KEYS BANDIT
14.02 VALENTINES DAY
MAALEEK x KEZRULESEVERYTHING</code>

<b>📊 System:</b>
/status - Aktueller Status
/events - Events anzeigen

<i>Tipp: Datum-Format ist D.MM oder DD.MM</i>
    `.trim());
  },

  async help(chatId) {
    await commands.start(chatId, '');
  },

  async announce(chatId, args) {
    if (!args.trim()) {
      await sendMessage(chatId, '❌ Bitte Text angeben: /announce <text>');
      return;
    }

    await DataStore.setAnnouncement({
      text: sanitize(args),
      active: true,
    });

    triggerRevalidation();
    await sendMessage(chatId, `✅ Ankündigung aktualisiert:\n"${args}"`);
  },

  async hide(chatId) {
    await DataStore.setAnnouncement({ active: false });
    triggerRevalidation();
    await sendMessage(chatId, '✅ Ankündigung ausgeblendet.');
  },

  async show(chatId) {
    await DataStore.setAnnouncement({ active: true });
    triggerRevalidation();
    await sendMessage(chatId, '✅ Ankündigung eingeblendet.');
  },

  async events(chatId) {
    const events = await DataStore.getEvents();

    if (events.length === 0) {
      await sendMessage(chatId, '📭 Keine Events vorhanden.');
      return;
    }

    // Group by month
    const byMonth: Record<string, Event[]> = {};
    for (const e of events) {
      const month = e.month || 'SONSTIGE';
      if (!byMonth[month]) byMonth[month] = [];
      byMonth[month].push(e);
    }

    let message = '<b>📅 Alle Events:</b>\n';
    for (const [month, monthEvents] of Object.entries(byMonth)) {
      message += `\n<b>${month}:</b>\n`;
      for (const e of monthEvents.sort((a, b) => a.date.localeCompare(b.date))) {
        const dateShort = e.date.slice(5); // MM-DD
        const artists = e.djs.length > 0 ? ` (${e.djs.join(', ')})` : '';
        message += `• ${dateShort}: ${e.title}${artists}\n`;
      }
    }

    await sendMessage(chatId, message);
  },

  async status(chatId) {
    const [announcement, events] = await Promise.all([
      DataStore.getAnnouncement(),
      DataStore.getEvents(),
    ]);

    const activeEvents = events.filter(e => e.active).length;

    await sendMessage(chatId, `
<b>📊 FLEUR Status</b>

<b>Ankündigung:</b>
${announcement.active ? '✅ Aktiv' : '❌ Inaktiv'}
"${announcement.text}"

<b>Events:</b>
${events.length} Events gespeichert
${activeEvents} davon aktiv

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

    const message = update.message!;
    const chatId = message.chat.id;
    const userId = message.from!.id;
    const text = message.text!;

    // 3. Check authorization (Chat ID whitelist)
    if (ALLOWED_CHAT_IDS.length > 0 && !ALLOWED_CHAT_IDS.includes(chatId)) {
      console.warn(`[Telegram] Unauthorized chat: ${chatId} (user: ${userId})`);
      return NextResponse.json({ ok: true });
    }

    // 4. Log the request
    console.log(`[Telegram] Message from ${message.from.username || userId}: ${text.substring(0, 50)}...`);

    // 5. Check for text commands (DELETE EVENTS, SET EVENTS)
    const textUpper = text.toUpperCase().trim();

    // DELETE EVENTS
    if (textUpper === 'DELETE EVENTS') {
      await handleDeleteEvents(chatId);
      return NextResponse.json({ ok: true });
    }

    // SET EVENTS <MONAT>
    const setEventsMatch = text.match(/^SET\s+EVENTS\s+(\w+)\s*([\s\S]*)/i);
    if (setEventsMatch) {
      const [, monthName, eventText] = setEventsMatch;
      await handleSetEvents(chatId, monthName.trim(), eventText.trim());
      return NextResponse.json({ ok: true });
    }

    // 6. Parse slash command
    const slashMatch = text.match(/^\/(\w+)(?:@\w+)?(?:\s+(.*))?$/);
    if (slashMatch) {
      const [, command, args = ''] = slashMatch;
      const handler = commands[command.toLowerCase()];

      if (handler) {
        await handler(chatId, args);
      } else {
        await sendMessage(chatId, `❓ Unbekannter Befehl: /${command}\nNutze /help für Hilfe.`);
      }
      return NextResponse.json({ ok: true });
    }

    // 7. Unknown message format - show help hint
    if (text.length > 5) {
      await sendMessage(chatId, '💡 Tipp: Nutze /help für alle Befehle oder "SET EVENTS MONAT" für Event-Import.');
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
