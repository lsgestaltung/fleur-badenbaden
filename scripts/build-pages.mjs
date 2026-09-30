#!/usr/bin/env node
/**
 * FLEUR Baden-Baden – statische Unterseiten erzeugen
 *
 * Quelle sind die Event-Karten in public/index.html (#eventsGrid). Daraus entstehen:
 *   public/events/<datum>-<name>.html   eine Seite pro Event, mit Event-Schema für Google
 *   public/events/index.html            Übersicht aller kommenden Events (/events)
 *   public/<seite>.html                 Inhaltsseiten aus scripts/seiten/*.html
 *   public/sitemap.xml
 *
 * Läuft automatisch vor jedem Build (npm "prebuild"), lokal: npm run pages
 *
 * Neue Events: wie bisher nur die Karte in index.html anlegen – alles andere
 * erzeugt dieses Skript. Seiten vergangener Events bleiben erhalten (Google
 * soll keine 404 sehen); kommende Seiten ohne Karte (abgesagt/umbenannt)
 * werden entfernt.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PUBLIC = path.join(ROOT, 'public');
const EVENTS_DIR = path.join(PUBLIC, 'events');
const SEITEN_DIR = path.join(ROOT, 'scripts', 'seiten');
const SITE = 'https://fleur-bar.de';
const WHATSAPP = 'https://wa.me/4917661455163';
const TZ = 'Europe/Berlin';

const WOCHENTAGE = ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag'];
const WT_KURZ = ['SO', 'MO', 'DI', 'MI', 'DO', 'FR', 'SA'];
const MONATE = ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'];
const MON_KURZ = ['JAN', 'FEB', 'MÄR', 'APR', 'MAI', 'JUN', 'JUL', 'AUG', 'SEP', 'OKT', 'NOV', 'DEZ'];

// ---------------------------------------------------------------- Helfer

const esc = s => String(s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const decode = s => s
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&nbsp;/g, ' ');

const text = html => decode(html.replace(/<[^>]*>/g, '')).replace(/\s+/g, ' ').trim();

/** Muss identisch sein mit EventLinks.slug in public/js/main.js */
export function slugify(s) {
    return s.toLowerCase()
        .replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/ß/g, 'ss')
        .normalize('NFKD').replace(/[̀-ͯ]/g, '')
        .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

const eventSlug = e => `${e.date}-${slugify(e.artist)}`;

/** Offset von Europe/Berlin in Minuten zu einem UTC-Zeitpunkt */
function offsetAt(ms) {
    const teil = new Intl.DateTimeFormat('en-US', { timeZone: TZ, timeZoneName: 'longOffset' })
        .formatToParts(new Date(ms)).find(p => p.type === 'timeZoneName').value; // "GMT+02:00"
    const m = teil.match(/GMT([+-])(\d{2}):(\d{2})/);
    return m ? (m[1] === '-' ? -1 : 1) * (Number(m[2]) * 60 + Number(m[3])) : 0;
}

/** ISO 8601 mit korrektem Berliner Offset (Sommer-/Winterzeit) */
function isoBerlin(datum, hh, mm, plusTage = 0) {
    const [y, mo, d] = datum.split('-').map(Number);
    const lokal = Date.UTC(y, mo - 1, d + plusTage, hh, mm);
    const off = offsetAt(lokal - offsetAt(lokal - 60 * 60000) * 60000);
    const t = new Date(lokal);
    const p = n => String(n).padStart(2, '0');
    const vz = off >= 0 ? '+' : '-';
    return `${t.getUTCFullYear()}-${p(t.getUTCMonth() + 1)}-${p(t.getUTCDate())}T${p(hh)}:${p(mm)}:00${vz}${p(Math.floor(Math.abs(off) / 60))}:${p(Math.abs(off) % 60)}`;
}

/** Clubabend zählt bis 06:00 des Folgetags – gleiche Regel wie main.js */
function heutigerClubtag() {
    const jetzt = new Date(Date.now() - 6 * 3600 * 1000);
    return new Intl.DateTimeFormat('en-CA', { timeZone: TZ }).format(jetzt);
}

function wochentagIndex(datum) {
    const [y, m, d] = datum.split('-').map(Number);
    return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
}

function datumLang(datum) {
    const [y, m, d] = datum.split('-').map(Number);
    return `${WOCHENTAGE[wochentagIndex(datum)]}, ${d}. ${MONATE[m - 1]} ${y}`;
}

function datumKurz(datum) {
    const [y, m, d] = datum.split('-').map(Number);
    return `${WOCHENTAGE[wochentagIndex(datum)].slice(0, 2)} ${d}.${m}.${y}`;
}

/** Mindestalter: Fr 18, Sa 21 – andere Tage unbekannt */
function mindestalter(datum) {
    return { 5: 18, 6: 21 }[wochentagIndex(datum)] || null;
}

function performer(e) {
    if (/\bclub$/i.test(e.artist)) return [];
    return e.artist.split(/\s+(?:x|&|·|,)\s+|,\s*/i)
        .map(s => s.trim()).filter(s => s && !/^fleur$/i.test(s));
}

function waLink(e) {
    const [, m, d] = e.date.split('-').map(Number);
    const wofuer = e.special ? `${e.special}, ${e.artist}` : e.artist;
    return `${WHATSAPP}?text=${encodeURIComponent(`Hi, ich möchte gerne für den ${d}. ${MONATE[m - 1]} (${wofuer}) einen Tisch reservieren.`)}`;
}

function schreiben(datei, inhalt) {
    fs.mkdirSync(path.dirname(datei), { recursive: true });
    const alt = fs.existsSync(datei) ? fs.readFileSync(datei, 'utf8') : null;
    if (alt !== inhalt) fs.writeFileSync(datei, inhalt);
}

// ---------------------------------------------------------------- Events lesen

function eventsLesen() {
    const html = fs.readFileSync(path.join(PUBLIC, 'index.html'), 'utf8');
    const start = html.indexOf('id="eventsGrid"');
    if (start < 0) throw new Error('#eventsGrid nicht gefunden in index.html');
    const bereich = html.slice(start, html.indexOf('id="eventsEmpty"', start));

    const events = [];
    for (const m of bereich.matchAll(/<article class="([^"]*event-card[^"]*)" data-date="([^"]+)">([\s\S]*?)<\/article>/g)) {
        const [, klassen, date, inner] = m;
        if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new Error(`Ungültiges data-date: ${date}`);
        const artist = text((inner.match(/class="event-artist">([\s\S]*?)<\/h3>/) || [])[1] || '');
        if (!artist) throw new Error(`Event ${date} ohne .event-artist`);
        const special = text((inner.match(/class="event-special">([\s\S]*?)<\/span>/) || [])[1] || '');
        const meta = text((inner.match(/class="event-meta">([\s\S]*?)<\/div>/) || [])[1] || '');
        const zeit = (meta.match(/(\d{1,2}):(\d{2})/) || [null, '23', '00']);
        const cta = (inner.match(/<a href="([^"]+)"[^>]*class="event-cta"/) || [])[1];
        events.push({
            date, artist, special: special || null,
            hh: Number(zeit[1]), mm: Number(zeit[2]),
            featured: klassen.includes('event-card-featured'),
            ctaKarte: cta ? decode(cta) : null,
        });
    }
    if (!events.length) throw new Error('Keine Event-Karten gefunden');

    events.sort((a, b) => a.date.localeCompare(b.date));
    const gesehen = new Set();
    for (const e of events) {
        e.slug = eventSlug(e);
        if (gesehen.has(e.slug)) throw new Error(`Doppelter Event-Slug: ${e.slug}`);
        gesehen.add(e.slug);
        e.url = `/events/${e.slug}`;
        e.name = e.special ? `${e.special}: ${e.artist}` : e.artist;
        e.uhrzeit = `${String(e.hh).padStart(2, '0')}:${String(e.mm).padStart(2, '0')}`;
        e.cta = e.ctaKarte || waLink(e);
    }
    return events;
}

// ---------------------------------------------------------------- Layout

const ICON_IG = '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg>';
const ICON_WA = '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>';
const PFEIL = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M5 12h14M12 5l7 7-7 7"/></svg>';

const FUSS_LINKS = [
    ['/events', 'Events'],
    ['/tisch-reservieren', 'Tisch reservieren'],
    ['/geburtstag-feiern-baden-baden', 'Geburtstag feiern'],
    ['/event-location', 'Event Location'],
    ['/jobs', 'Jobs'],
];

function layout({ pfad, titel, beschreibung, ogBild = '/img/og-image.jpg', schema = [], inhalt }) {
    const canonical = SITE + pfad;
    const ld = schema.map(s => `    <script type="application/ld+json">\n${JSON.stringify(s, null, 4)}\n    </script>`).join('\n');
    const fuss = FUSS_LINKS.map(([href, label]) =>
        `<a href="${href}"${href === pfad ? ' class="active" aria-current="page"' : ''}>${label}</a>`).join('\n                    ');
    return `<!DOCTYPE html>
<!-- Automatisch erzeugt von scripts/build-pages.mjs – Änderungen hier gehen beim nächsten Build verloren. -->
<html lang="de">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${esc(titel)}</title>
    <meta name="description" content="${esc(beschreibung)}">
    <meta name="robots" content="index, follow">
    <link rel="canonical" href="${canonical}">

    <meta property="og:type" content="website">
    <meta property="og:site_name" content="FLEUR Baden-Baden">
    <meta property="og:locale" content="de_DE">
    <meta property="og:url" content="${canonical}">
    <meta property="og:title" content="${esc(titel)}">
    <meta property="og:description" content="${esc(beschreibung)}">
    <meta property="og:image" content="${SITE}${ogBild}">
    <meta name="twitter:card" content="summary_large_image">

    <link rel="icon" href="/favicon.ico" sizes="32x32">
    <link rel="icon" href="/favicon.svg" type="image/svg+xml">
    <link rel="apple-touch-icon" href="/img/apple-touch-icon.png">
    <link rel="manifest" href="/site.webmanifest">
    <meta name="theme-color" content="#0a0a0a">

    <link rel="preload" href="/fonts/tox-typewriter.woff2" as="font" type="font/woff2" crossorigin>
    <link rel="stylesheet" href="/css/style.css">
${ld}
</head>
<body class="subpage">
    <div class="cursor" aria-hidden="true">
        <div class="cursor-dot"></div>
        <div class="cursor-outline"></div>
    </div>

    <header class="header">
        <nav class="nav">
            <a href="/" class="nav-logo">
                <img src="/img/Element 1.svg" alt="FLEUR Baden-Baden" class="logo-img">
            </a>
            <button class="nav-toggle" aria-label="Menu" aria-expanded="false">
                <span class="hamburger"></span>
            </button>
        </nav>
    </header>

    <div class="nav-overlay" aria-hidden="true">
        <div class="nav-overlay-content">
            <ul class="nav-menu">
                <li><a href="/" data-text="HOME">HOME</a></li>
                <li><a href="/events" data-text="EVENTS">EVENTS</a></li>
                <li><a href="/tisch-reservieren" data-text="TISCH BUCHEN">TISCH BUCHEN</a></li>
                <li><a href="/event-location" data-text="EVENT LOCATION">EVENT LOCATION</a></li>
                <li><a href="/#gallery" data-text="IMPRESSIONS">IMPRESSIONS</a></li>
                <li><a href="/jobs" data-text="JOBS">JOBS</a></li>
                <li><a href="/#contact" data-text="KONTAKT">KONTAKT</a></li>
            </ul>
            <div class="nav-overlay-footer">
                <div class="nav-info">
                    <p>Sophienstraße 15, Baden-Baden</p>
                    <p><a href="tel:+4917661455163">+49 176 61455163</a></p>
                </div>
                <div class="nav-social">
                    <a href="https://instagram.com/fleurbadenbaden" target="_blank" rel="noopener" aria-label="Instagram">${ICON_IG}</a>
                    <a href="${WHATSAPP}" target="_blank" rel="noopener" aria-label="WhatsApp">${ICON_WA}</a>
                </div>
            </div>
        </div>
    </div>

    <main>
${inhalt}
    </main>

    <footer class="footer footer-minimal footer-sub">
        <div class="footer-texture"></div>
        <div class="container">
            <nav class="footer-sitelinks" aria-label="Weitere Seiten">
                    ${fuss}
            </nav>
            <p class="footer-sub-info">FLEUR · Sophienstraße 15 · 76530 Baden-Baden · Fr &amp; Sa ab 23:00 · <a href="${WHATSAPP}" target="_blank" rel="noopener">WhatsApp +49 176 61455163</a></p>
            <div class="footer-bottom">
                <p class="footer-copy">© <span class="js-year">${new Date().getFullYear()}</span> FLEUR Baden-Baden. Alle Rechte vorbehalten.</p>
                <nav class="footer-legal">
                    <a href="/impressum">Impressum</a>
                    <a href="/datenschutz">Datenschutz</a>
                </nav>
            </div>
            <div class="footer-credit">
                <span>Mit <span class="heart">♥</span> entwickelt von <a href="https://lsgestaltung.de" target="_blank" rel="noopener">lsgestaltung.de</a></span>
            </div>
        </div>
    </footer>

    <div class="cookie-banner" id="cookieBanner" aria-hidden="true">
        <div class="cookie-banner-content">
            <div class="cookie-banner-text">
                <p>Wir verwenden Cookies, um Ihnen die bestmögliche Erfahrung auf unserer Website zu bieten. Durch die Nutzung unserer Website stimmen Sie der Verwendung von Cookies gemäß unserer <a href="/datenschutz">Datenschutzerklärung</a> zu.</p>
            </div>
            <div class="cookie-banner-actions">
                <button class="cookie-btn cookie-btn-accept" id="cookieAccept">Akzeptieren</button>
                <button class="cookie-btn cookie-btn-decline" id="cookieDecline">Nur notwendige</button>
            </div>
        </div>
    </div>

    <script src="/js/main.js"></script>
</body>
</html>
`;
}

function brotkrumen(teile) {
    return {
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: teile.map(([name, pfad], i) => ({
            '@type': 'ListItem', position: i + 1, name, item: SITE + pfad,
        })),
    };
}

function brotkrumenHtml(teile) {
    return `<nav class="breadcrumb" aria-label="Brotkrumen">${teile.map(([name, pfad], i) =>
        i === teile.length - 1 ? `<span aria-current="page">${esc(name)}</span>` : `<a href="${pfad}">${esc(name)}</a>`
    ).join('<span aria-hidden="true"> / </span>')}</nav>`;
}

// ---------------------------------------------------------------- Bausteine

function karte(e) {
    const [, m, d] = e.date.split('-').map(Number);
    return `                    <article class="event-card${e.featured ? ' event-card-featured' : ''}" data-date="${e.date}">
                        <div class="event-card-date">
                            <span class="event-day">${WT_KURZ[wochentagIndex(e.date)]}</span>
                            <span class="event-num">${d}</span>
                            <span class="event-month">${MON_KURZ[m - 1]}</span>
                        </div>
                        <div class="event-card-content">
${e.special ? `                            <span class="event-special">${esc(e.special)}</span>\n` : ''}                            <h3 class="event-artist"><a href="${e.url}">${esc(e.artist)}</a></h3>
                            <div class="event-meta">
                                <span>${e.uhrzeit} Uhr</span>
                            </div>
                        </div>
                        <a href="${esc(e.cta)}" class="event-cta" target="_blank" rel="noopener">
                            <span>Tisch reservieren</span>
                            ${PFEIL}
                        </a>
                    </article>`;
}

function eventRaster(events, { id = 'eventsGrid', anzahl = 3, titelOutline, titelFilled, mitAlleLink = true }) {
    return `        <section id="events" class="events events--next">
            <div class="container">
                <header class="section-header center">
                    <h2 class="section-title">
                        <span class="section-title-outline">${titelOutline}</span>
                        <span class="section-title-filled">${titelFilled}</span>
                    </h2>
                </header>

                <div class="events-grid" id="${id}" data-anzahl="${anzahl}">
<!-- weitere:start -->
${events.map(karte).join('\n\n')}
<!-- weitere:ende -->
                </div>
                <p class="events-empty" id="eventsEmpty" hidden>Neue Termine folgen in Kürze – aktuell auf <a href="https://instagram.com/fleurbadenbaden" target="_blank" rel="noopener">@fleurbadenbaden</a></p>
                <div class="events-more">
                    <button type="button" class="events-more-btn" id="eventsMore" aria-controls="${id}" aria-expanded="false" hidden>Alle Termine anzeigen</button>${mitAlleLink ? `
                    <a href="/events" class="events-all-link">Alle Events im Überblick</a>` : ''}
                </div>
            </div>
        </section>`;
}

// ---------------------------------------------------------------- Seiten

function eventSchema(e) {
    const alter = mindestalter(e.date);
    const perf = performer(e);
    const s = {
        '@context': 'https://schema.org',
        '@type': 'Event',
        name: `${e.name} im FLEUR Baden-Baden`,
        startDate: isoBerlin(e.date, e.hh, e.mm),
        endDate: isoBerlin(e.date, 5, 0, 1),
        eventStatus: 'https://schema.org/EventScheduled',
        eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
        description: beschreibungEvent(e),
        image: [`${SITE}/img/og-image.jpg`],
        url: SITE + e.url,
        location: {
            '@type': 'NightClub',
            '@id': `${SITE}/#nightclub`,
            name: 'FLEUR Baden-Baden',
            address: {
                '@type': 'PostalAddress',
                streetAddress: 'Sophienstraße 15',
                addressLocality: 'Baden-Baden',
                postalCode: '76530',
                addressRegion: 'Baden-Württemberg',
                addressCountry: 'DE',
            },
        },
        organizer: { '@type': 'Organization', name: 'FLEUR Baden-Baden', url: SITE },
    };
    if (perf.length) s.performer = perf.map(name => ({ '@type': 'PerformingGroup', name }));
    if (alter) s.typicalAgeRange = `${alter}-`;
    return s;
}

function beschreibungEvent(e) {
    const alter = mindestalter(e.date);
    return `${e.name} im FLEUR Baden-Baden: ${datumLang(e.date)}, ab ${e.uhrzeit} Uhr in der Sophienstraße 15.` +
        (alter ? ` Einlass ab ${alter} Jahren.` : '') + ' Tische in VIP Lounge oder am Hightable per WhatsApp reservieren.';
}

function eventSeite(e, alle) {
    const alter = mindestalter(e.date);
    const [y, m, d] = e.date.split('-').map(Number);
    const andere = alle.filter(x => x !== e);
    const krumen = [['Start', '/'], ['Events', '/events'], [e.artist, e.url]];

    const inhalt = `        <section class="page-header evp-hero">
            <div class="container">
                ${brotkrumenHtml(krumen)}
                <p class="evp-kicker">[${WT_KURZ[wochentagIndex(e.date)].toLowerCase()}] ${d}. ${MONATE[m - 1].toLowerCase()} ${y} · ${e.uhrzeit} uhr</p>
${e.special ? `                <span class="event-special">${esc(e.special)}</span>\n` : ''}                <h1 class="page-title evp-title">${esc(e.artist)}</h1>
                <p class="evp-sub">im FLEUR Baden-Baden</p>
            </div>
        </section>

        <section class="event-detail" data-event-date="${e.date}">
            <div class="container-narrow">
                <p class="event-vorbei" hidden>Dieser Abend liegt schon hinter uns. Die nächsten Termine findest du weiter unten.</p>
                <dl class="event-facts">
                    <div><dt>Datum</dt><dd>${datumLang(e.date)}</dd></div>
                    <div><dt>Beginn</dt><dd>${e.uhrzeit} Uhr, Ende offen</dd></div>
                    <div><dt>Ort</dt><dd><a href="https://maps.google.com/?q=Sophienstra%C3%9Fe+15+Baden-Baden" target="_blank" rel="noopener">FLEUR, Sophienstraße 15, 76530 Baden-Baden</a></dd></div>
${alter ? `                    <div><dt>Einlass</dt><dd>ab ${alter} Jahren, bitte Ausweis mitbringen</dd></div>\n` : ''}                    <div><dt>Dresscode</dt><dd>Smart Casual, lange Hosen, keine Sandalen</dd></div>
                </dl>
                <p class="event-text">${esc(beschreibungEvent(e))}</p>
                <div class="event-actions">
                    <a href="${esc(e.cta)}" class="btn btn-primary" target="_blank" rel="noopener">Tisch reservieren</a>
                    <a href="/tisch-reservieren" class="btn btn-secondary">Lounge &amp; Hightables</a>
                </div>
            </div>
        </section>

${eventRaster(andere, { titelOutline: 'WEITERE', titelFilled: 'TERMINE' })}`;

    return layout({
        pfad: e.url,
        titel: `${e.name} – ${datumKurz(e.date)} | FLEUR Baden-Baden`,
        beschreibung: beschreibungEvent(e),
        schema: [eventSchema(e), brotkrumen(krumen)],
        inhalt,
    });
}

function uebersicht(events) {
    const krumen = [['Start', '/'], ['Events', '/events']];
    const inhalt = `        <section class="page-header">
            <div class="container">
                ${brotkrumenHtml(krumen)}
                <h1 class="page-title">
                    <span class="section-title-outline">EVENTS</span>
                </h1>
                <p class="page-lead">Alle kommenden Clubnächte im FLEUR in Baden-Baden. Freitag und Samstag ab 23 Uhr, Sophienstraße 15. Tische reservierst du direkt beim Termin.</p>
            </div>
        </section>

${eventRaster(events, { anzahl: 999, titelOutline: 'KOMMENDE', titelFilled: 'NÄCHTE', mitAlleLink: false })}`;

    return layout({
        pfad: '/events',
        titel: 'Events & Partys in Baden-Baden | FLEUR Club',
        beschreibung: 'Alle kommenden Events im FLEUR Baden-Baden: House, Tech-House und Urban-Nächte, Freitag und Samstag ab 23 Uhr. Jetzt Tisch reservieren.',
        schema: [{
            '@context': 'https://schema.org',
            '@type': 'ItemList',
            name: 'Events im FLEUR Baden-Baden',
            itemListElement: events.map((e, i) => ({ '@type': 'ListItem', position: i + 1, url: SITE + e.url })),
        }, brotkrumen(krumen)],
        inhalt,
    });
}

/** Inhaltsseite aus scripts/seiten/<name>.html – Kopf als JSON in <!-- --> */
function inhaltsSeite(datei, events, heute) {
    const roh = fs.readFileSync(datei, 'utf8');
    const kopf = roh.match(/^<!--\s*([\s\S]*?)\s*-->/);
    if (!kopf) throw new Error(`${datei}: JSON-Kopf fehlt`);
    const meta = JSON.parse(kopf[1]);
    const krumen = [['Start', '/'], [meta.brotkrume, meta.pfad]];
    const kommend = events.filter(e => e.date >= heute);
    let koerper = roh.slice(kopf[0].length).trim()
        .replace('{{BROTKRUMEN}}', brotkrumenHtml(krumen))
        .replace('{{EVENTS}}', eventRaster(kommend.length ? kommend : events,
            { titelOutline: 'NÄCHSTE', titelFilled: 'EVENTS' }));
    return {
        pfad: meta.pfad,
        html: layout({
            pfad: meta.pfad,
            titel: meta.titel,
            beschreibung: meta.beschreibung,
            schema: [brotkrumen(krumen), ...(meta.schema || [])],
            inhalt: koerper.split('\n').map(z => z ? '        ' + z : z).join('\n'),
        }),
    };
}

function sitemap(pfade) {
    const heute = new Intl.DateTimeFormat('en-CA', { timeZone: TZ }).format(new Date());
    const zeilen = pfade.map(([p, lastmod]) =>
        `  <url><loc>${SITE}${p}</loc>${lastmod ? `<lastmod>${lastmod === true ? heute : lastmod}</lastmod>` : ''}</url>`);
    return `<?xml version="1.0" encoding="UTF-8"?>
<!-- Automatisch erzeugt von scripts/build-pages.mjs -->
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${zeilen.join('\n')}
</urlset>
`;
}

// ---------------------------------------------------------------- Ablauf

function main() {
    const events = eventsLesen();
    const heute = heutigerClubtag();

    // Event-Seiten
    fs.mkdirSync(EVENTS_DIR, { recursive: true });
    const aktuell = new Set(events.map(e => `${e.slug}.html`));
    for (const e of events) schreiben(path.join(EVENTS_DIR, `${e.slug}.html`), eventSeite(e, events));

    // Bestehende Seiten ohne Karte: vergangen -> behalten (nur "Weitere Termine" auffrischen),
    // kommend -> entfernen (abgesagt oder umbenannt)
    const kommend = events.filter(e => e.date >= heute);
    const archiv = [];
    for (const f of fs.readdirSync(EVENTS_DIR)) {
        if (!/^\d{4}-\d{2}-\d{2}-.+\.html$/.test(f) || aktuell.has(f)) continue;
        const datum = f.slice(0, 10);
        const datei = path.join(EVENTS_DIR, f);
        if (datum >= heute) { fs.unlinkSync(datei); console.log(`  entfernt (keine Karte mehr): ${f}`); continue; }
        const alt = fs.readFileSync(datei, 'utf8');
        const neu = alt.replace(/<!-- weitere:start -->[\s\S]*?<!-- weitere:ende -->/,
            `<!-- weitere:start -->\n${(kommend.length ? kommend : events).map(karte).join('\n\n')}\n<!-- weitere:ende -->`);
        schreiben(datei, neu);
        archiv.push(f.replace(/\.html$/, ''));
    }

    schreiben(path.join(EVENTS_DIR, 'index.html'), uebersicht(events));

    // Inhaltsseiten
    const seiten = fs.existsSync(SEITEN_DIR)
        ? fs.readdirSync(SEITEN_DIR).filter(f => f.endsWith('.html')).sort()
        : [];
    const seitenPfade = [];
    for (const f of seiten) {
        const { pfad, html } = inhaltsSeite(path.join(SEITEN_DIR, f), events, heute);
        schreiben(path.join(PUBLIC, `${pfad.replace(/^\//, '')}.html`), html);
        seitenPfade.push(pfad);
    }

    // Sitemap
    const pfade = [
        ['/', true],
        ['/events', true],
        ...seitenPfade.map(p => [p, true]),
        ['/event-location', true],
        ['/jobs', true],
        ...events.map(e => [e.url, true]),
        ...archiv.sort().map(s => [`/events/${s}`, false]),
        ['/impressum', false],
        ['/datenschutz', false],
    ];
    schreiben(path.join(PUBLIC, 'sitemap.xml'), sitemap(pfade));

    console.log(`build-pages: ${events.length} Event-Seiten, ${archiv.length} im Archiv, ${seitenPfade.length} Inhaltsseiten, ${pfade.length} URLs in der Sitemap`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
    try { main(); } catch (err) {
        console.error(`build-pages: ${err.message}`);
        process.exit(1);
    }
}
