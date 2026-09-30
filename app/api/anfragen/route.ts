/**
 * FLEUR Baden-Baden – Statistik der Formular-Anfragen
 *
 * GET /anfragen  (Rewrite auf /api/anfragen)
 * Geschützt per Browser-Anmeldung: Benutzername egal, Passwort = STATS_SECRET
 * (Vercel → Settings → Environment Variables). Ohne STATS_SECRET ist die Seite aus.
 * ?format=json liefert die Rohdaten.
 */

import { NextRequest, NextResponse } from 'next/server';
import { timingSafeEqual } from 'crypto';
import { statistik, ANLAESSE, KANAELE, SEITEN, type Zahlen } from '@/lib/anfragen';

export const dynamic = 'force-dynamic';

function berechtigt(req: NextRequest): boolean {
  const secret = process.env.STATS_SECRET;
  if (!secret) return false;
  const auth = req.headers.get('authorization') || '';
  if (!auth.startsWith('Basic ')) return false;
  const passwort = Buffer.from(auth.slice(6), 'base64').toString('utf8').split(':').slice(1).join(':');
  const a = Buffer.from(passwort);
  const b = Buffer.from(secret);
  return a.length === b.length && timingSafeEqual(a, b);
}

const esc = (s: string) => s.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c] as string));
const n = (z: Zahlen, k: string) => z[k] || 0;
const MONATE = ['Jan', 'Feb', 'Mär', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez'];
const monatName = (m: string) => `${MONATE[Number(m.slice(5, 7)) - 1]} ${m.slice(0, 4)}`;
const tagName = (t: string) => `${t.slice(8, 10)}.${t.slice(5, 7)}.`;

function aufschluesselung(z: Zahlen, prefix: string, namen: Record<string, string>) {
  return Object.entries(namen)
    .map(([k, label]) => [label, n(z, `${prefix}:${k}`)] as const)
    .filter(([, v]) => v > 0)
    .map(([label, v]) => `<li><span>${esc(label)}</span><b>${v}</b></li>`).join('') || '<li><span>noch keine</span><b>0</b></li>';
}

export async function GET(req: NextRequest) {
  if (!process.env.STATS_SECRET) {
    return new NextResponse('Statistik nicht eingerichtet: STATS_SECRET in Vercel setzen.', { status: 503 });
  }
  if (!berechtigt(req)) {
    return new NextResponse('Anmeldung erforderlich', {
      status: 401,
      headers: { 'WWW-Authenticate': 'Basic realm="FLEUR Anfragen", charset="UTF-8"' },
    });
  }

  const daten = await statistik(30, 6);
  if (req.nextUrl.searchParams.get('format') === 'json') {
    return NextResponse.json(daten, { headers: { 'Cache-Control': 'no-store' } });
  }

  const W = 'anlass:firmenfeier-weihnachtsfeier';
  const g = daten.gesamt;
  const dieserMonat = daten.monate[0];
  const monatsZeilen = daten.monate.map(m => `<tr><td>${monatName(m.monat)}</td><td>${n(m.zahlen, 'summe')}</td><td>${n(m.zahlen, W)}</td><td>${n(m.zahlen, 'anlass:geburtstag')}</td></tr>`).join('');
  const maxTag = Math.max(1, ...daten.tage.map(t => n(t.zahlen, 'summe')));
  const tagesZeilen = daten.tage.map(t => {
    const s = n(t.zahlen, 'summe'), w = n(t.zahlen, W);
    return `<tr><td>${tagName(t.tag)}</td><td class="bar"><i style="width:${(s / maxTag) * 100}%"></i></td><td>${s}</td><td>${w || ''}</td></tr>`;
  }).join('');

  const html = `<!DOCTYPE html>
<html lang="de"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex, nofollow"><title>Anfragen | FLEUR</title>
<style>
:root{--o:#ff8e28;--ink:#0a0a0a;--c:#f5f0e8}
*{box-sizing:border-box}body{margin:0;background:var(--ink);color:var(--c);font:16px/1.5 "Courier Prime","Courier New",monospace;padding:20px 16px 40px}
main{max-width:720px;margin:0 auto}h1{font-size:1.5rem;letter-spacing:.1em;text-transform:uppercase;margin:0 0 4px}
.sub{opacity:.8;margin:0 0 22px;font-size:.9rem}
.kacheln{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px;margin-bottom:22px}
.k{border:1px solid rgba(245,240,232,.25);padding:14px}.k.hl{background:var(--o);color:var(--ink);border-color:var(--o)}
.k b{display:block;font-size:2rem;line-height:1.1}.k span{font-size:.85rem}
h2{font-size:1rem;color:var(--o);text-transform:lowercase;margin:26px 0 8px}
ul{list-style:none;margin:0;padding:0}li{display:flex;justify-content:space-between;border-bottom:1px solid rgba(245,240,232,.15);padding:6px 0}
table{width:100%;border-collapse:collapse;font-size:.92rem}td,th{padding:6px 4px;border-bottom:1px solid rgba(245,240,232,.12);text-align:right}
td:first-child,th:first-child{text-align:left}th{color:var(--o);font-weight:normal;text-transform:lowercase}
.bar{width:45%}.bar i{display:block;height:10px;background:var(--o);min-width:0}
.hinweis{margin-top:26px;font-size:.85rem;opacity:.85;border-left:3px solid var(--o);padding-left:10px}
</style></head><body><main>
<h1>Anfragen</h1>
<p class="sub">Abgeschickte Anfrage-Formulare auf fleur-bar.de · Stand ${esc(new Date().toLocaleString('de-DE', { timeZone: 'Europe/Berlin' }))}</p>
<div class="kacheln">
  <div class="k hl"><b>${n(g, W)}</b><span>Weihnachtsfeier gesamt</span></div>
  <div class="k hl"><b>${n(dieserMonat.zahlen, W)}</b><span>Weihnachtsfeier ${monatName(dieserMonat.monat)}</span></div>
  <div class="k"><b>${n(g, 'summe')}</b><span>alle Anfragen gesamt</span></div>
  <div class="k"><b>${n(dieserMonat.zahlen, 'summe')}</b><span>alle ${monatName(dieserMonat.monat)}</span></div>
</div>
<h2>nach Anlass (gesamt)</h2><ul>${aufschluesselung(g, 'anlass', ANLAESSE)}</ul>
<h2>nach Kanal (gesamt)</h2><ul>${aufschluesselung(g, 'kanal', KANAELE)}</ul>
<h2>nach Seite (gesamt)</h2><ul>${aufschluesselung(g, 'seite', SEITEN)}</ul>
<h2>letzte 6 Monate</h2>
<table><tr><th>Monat</th><th>alle</th><th>Weihn.</th><th>Geb.</th></tr>${monatsZeilen}</table>
<h2>letzte 30 Tage</h2>
<table><tr><th>Tag</th><th></th><th>alle</th><th>Weihn.</th></tr>${tagesZeilen}</table>
<p class="hinweis">Gezählt wird das Absenden des Formulars (WhatsApp oder E-Mail). Ob die Nachricht danach wirklich verschickt wurde, siehst du in WhatsApp bzw. im Postfach – jede Anfrage trägt dort die Kennung „Anfrage über fleur-bar.de/…“.</p>
</main></body></html>`;

  return new NextResponse(html, {
    headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex' },
  });
}
