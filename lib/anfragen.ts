/**
 * FLEUR Baden-Baden – anonyme Zählung von Formular-Anfragen
 *
 * Gezählt wird nur, WIE OFT das Anfrage-Formular (WhatsApp/Mail) abgeschickt
 * wird – nach Anlass, Kanal und Seite. Keine Namen, keine Inhalte, keine
 * IP-Adressen, keine Cookies. Ob die Nachricht danach wirklich gesendet
 * wurde, liegt beim Gast (WhatsApp/Mailprogramm).
 *
 * Redis-Hashes (Felder: summe, anlass:<x>, kanal:<x>, seite:<x>):
 *   fleur:anfragen:gesamt
 *   fleur:anfragen:monat:YYYY-MM
 *   fleur:anfragen:tag:YYYY-MM-DD   (läuft nach 400 Tagen ab)
 */

import { redis } from './kv';

export const ANLAESSE: Record<string, string> = {
  'geburtstag': 'Geburtstag',
  'abend-mit-freunden': 'Abend mit Freunden',
  'firmenfeier-weihnachtsfeier': 'Firmenfeier / Weihnachtsfeier',
  'anderer-anlass': 'Anderer Anlass',
  'ohne-angabe': 'ohne Angabe',
};

export const KANAELE: Record<string, string> = { whatsapp: 'WhatsApp', mail: 'E-Mail' };

export const SEITEN: Record<string, string> = {
  '/weihnachtsfeier-baden-baden': 'Weihnachtsfeier',
  '/geburtstag-feiern-baden-baden': 'Geburtstag feiern',
  '/tisch-reservieren': 'Tisch reservieren',
};

const PREFIX = 'fleur:anfragen';

/** Datum in Berlin als YYYY-MM-DD */
export function berlinDatum(d = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Berlin' }).format(d);
}

export function anlassSchluessel(text: string): string {
  const s = (text || '').toLowerCase()
    .replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/ß/g, 'ss')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  return s in ANLAESSE ? s : 'ohne-angabe';
}

export async function zaehlen(anlass: string, kanal: string, seite: string): Promise<void> {
  const tag = berlinDatum();
  const keys = [`${PREFIX}:gesamt`, `${PREFIX}:monat:${tag.slice(0, 7)}`, `${PREFIX}:tag:${tag}`];
  const felder = ['summe', `anlass:${anlass}`, `kanal:${kanal}`, `seite:${seite}`];
  const p = redis.pipeline();
  for (const k of keys) for (const f of felder) p.hincrby(k, f, 1);
  p.expire(keys[2], 400 * 24 * 3600);
  await p.exec();
}

export type Zahlen = Record<string, number>;

function normalisieren(h: Record<string, unknown> | null): Zahlen {
  const out: Zahlen = {};
  for (const [k, v] of Object.entries(h || {})) out[k] = Number(v) || 0;
  return out;
}

export async function statistik(tage = 30, monate = 6) {
  const heute = new Date();
  const tagListe: string[] = [];
  for (let i = 0; i < tage; i++) tagListe.push(berlinDatum(new Date(heute.getTime() - i * 86400000)));
  const monatListe: string[] = [];
  const [y, m] = berlinDatum(heute).split('-').map(Number);
  for (let i = 0; i < monate; i++) {
    const d = new Date(Date.UTC(y, m - 1 - i, 15));
    monatListe.push(d.toISOString().slice(0, 7));
  }
  const p = redis.pipeline();
  p.hgetall(`${PREFIX}:gesamt`);
  for (const mo of monatListe) p.hgetall(`${PREFIX}:monat:${mo}`);
  for (const t of tagListe) p.hgetall(`${PREFIX}:tag:${t}`);
  const res = (await p.exec()) as (Record<string, unknown> | null)[];
  return {
    gesamt: normalisieren(res[0]),
    monate: monatListe.map((mo, i) => ({ monat: mo, zahlen: normalisieren(res[1 + i]) })),
    tage: tagListe.map((t, i) => ({ tag: t, zahlen: normalisieren(res[1 + monatListe.length + i]) })),
  };
}
