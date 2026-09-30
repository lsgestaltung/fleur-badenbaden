/**
 * FLEUR Baden-Baden – Anfrage zählen
 *
 * POST /api/anfrage  { anlass, kanal, seite }  -> 204
 * Wird von main.js (LoungeAnfrage) per sendBeacon aufgerufen, wenn das
 * Formular abgeschickt wird. Speichert nur Zähler, keine personenbezogenen Daten.
 */

import { NextRequest, NextResponse } from 'next/server';
import { zaehlen, anlassSchluessel, KANAELE, SEITEN } from '@/lib/anfragen';

export const dynamic = 'force-dynamic';

const ERLAUBTE_HOSTS = /(^|\.)fleur-bar\.de$|(^|\.)fleur-badenbaden\.de$|\.vercel\.app$|^localhost$|^127\.0\.0\.1$/;

export async function POST(req: NextRequest) {
  const origin = req.headers.get('origin');
  if (origin) {
    try {
      if (!ERLAUBTE_HOSTS.test(new URL(origin).hostname)) return new NextResponse(null, { status: 403 });
    } catch {
      return new NextResponse(null, { status: 403 });
    }
  }

  let body: { anlass?: string; kanal?: string; seite?: string } = {};
  try {
    body = JSON.parse(await req.text());
  } catch {
    return new NextResponse(null, { status: 400 });
  }

  const kanal = body.kanal && body.kanal in KANAELE ? body.kanal : null;
  const seite = body.seite && body.seite in SEITEN ? body.seite : null;
  if (!kanal || !seite) return new NextResponse(null, { status: 400 });

  try {
    await zaehlen(anlassSchluessel(body.anlass || ''), kanal, seite);
  } catch (error) {
    console.error('[Anfrage] Zählen fehlgeschlagen:', error);
  }
  return new NextResponse(null, { status: 204 });
}
