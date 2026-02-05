'use client';

/**
 * FLEUR Baden-Baden - Main Content Component
 *
 * Client component that renders the main page content.
 * Receives data from server component via props.
 */

import { useEffect } from 'react';
import type { Announcement, Event, Artist } from '@/lib/types';

interface MainContentProps {
  announcement: Announcement;
  events: Event[];
  artists: Artist[];
}

export default function MainContent({ announcement, events, artists }: MainContentProps) {
  // Initialize client-side scripts after mount
  useEffect(() => {
    // Import and run main.js functionality
    const initScripts = async () => {
      // The existing main.js will run automatically
      // This effect is for any additional React-specific initialization
    };
    initScripts();
  }, []);

  // Format date for display
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('de-DE', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
    });
  };

  return (
    <>
      {/* Custom Cursor */}
      <div className="cursor" aria-hidden="true">
        <div className="cursor-dot"></div>
        <div className="cursor-outline"></div>
      </div>

      {/* Navigation */}
      <header className="header">
        <nav className="nav">
          <a href="/" className="nav-logo">
            <img src="/img/Element 1.svg" alt="FLEUR Baden-Baden" className="logo-img" />
          </a>
          <a href="#booking" className="nav-cta btn btn-primary">Tisch Buchen</a>
          <button className="nav-toggle" aria-label="Menu" aria-expanded="false">
            <span className="hamburger"></span>
          </button>
        </nav>
      </header>

      {/* Fullscreen Navigation Overlay */}
      <div className="nav-overlay" aria-hidden="true">
        <div className="nav-overlay-content">
          <ul className="nav-menu">
            <li><a href="#hero" data-text="HOME">HOME</a></li>
            <li><a href="#events" data-text="EVENTS">EVENTS</a></li>
            <li><a href="#djs" data-text="RESIDENT DJS">RESIDENT DJS</a></li>
            <li><a href="#booking" data-text="TISCH BUCHEN">TISCH BUCHEN</a></li>
            <li><a href="#gallery" data-text="GALERIE">GALERIE</a></li>
            <li><a href="/jobs" data-text="JOBS">JOBS</a></li>
            <li><a href="#contact" data-text="KONTAKT">KONTAKT</a></li>
          </ul>
          <div className="nav-overlay-footer">
            <div className="nav-info">
              <p>Sophienstraße 15, Baden-Baden</p>
              <p><a href="tel:+4917661455163">+49 176 61455163</a></p>
            </div>
            <div className="nav-social">
              <a href="https://instagram.com/fleurbadenbaden" target="_blank" rel="noopener" aria-label="Instagram">
                <svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg>
              </a>
              <a href="https://wa.me/4917661455163" target="_blank" rel="noopener" aria-label="WhatsApp">
                <svg viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
              </a>
            </div>
          </div>
        </div>
      </div>

      <main>
        {/* Announcement Banner */}
        {announcement.active && (
          <section className="announcement" id="announcement">
            <div className="announcement-content">
              <span className="announcement-icon">{announcement.icon}</span>
              <p className="announcement-text">{announcement.text}</p>
              <a href={announcement.link} className="announcement-link">
                {announcement.linkText}
              </a>
            </div>
          </section>
        )}

        {/* Hero Section */}
        <section className="hero" id="hero">
          <div className="hero-texture"></div>
          <div className="hero-content">
            <img src="/img/Element 1.svg" alt="FLEUR" className="hero-logo" />
            <p className="hero-tagline">Un Espace de Nuit</p>
            <p className="hero-address">Sophienstraße 15, Baden-Baden</p>
            <div className="hero-cta">
              <a href="#booking" className="btn btn-primary">Tisch Reservieren</a>
              <a href="#events" className="btn btn-outline">Events</a>
            </div>
          </div>
          <div className="hero-scroll">
            <span>Scroll</span>
            <div className="scroll-line"></div>
          </div>
        </section>

        {/* Events Section */}
        <section className="events" id="events">
          <div className="container">
            <div className="section-header">
              <span className="section-label">Was kommt</span>
              <h2 className="section-title">
                <span className="section-title-outline">EVENTS</span>
              </h2>
            </div>

            <div className="events-scroll-container">
              <div className="events-track">
                {events.map((event) => (
                  <article key={event.id} className="event-card">
                    <div className="event-date">
                      <span className="event-day">{new Date(event.date).getDate()}</span>
                      <span className="event-month">
                        {new Date(event.date).toLocaleDateString('de-DE', { month: 'short' })}
                      </span>
                    </div>
                    <div className="event-info">
                      <h3 className="event-title">{event.title}</h3>
                      {event.djs.length > 0 && (
                        <p className="event-djs">{event.djs.join(' • ')}</p>
                      )}
                      {event.description && (
                        <p className="event-desc">{event.description}</p>
                      )}
                    </div>
                    <div className="event-time">{event.time} Uhr</div>
                  </article>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* DJs Section */}
        <section className="djs" id="djs">
          <div className="container">
            <div className="section-header">
              <span className="section-label">Die Sounds</span>
              <h2 className="section-title">
                <span className="section-title-outline">RESIDENT DJS</span>
              </h2>
            </div>

            <div className="djs-grid">
              {artists.filter(a => a.role === 'resident' && a.active).map((artist) => (
                <article key={artist.id} className="dj-card">
                  <div className="dj-image">
                    <img src={artist.image || '/img/djs/placeholder.jpg'} alt={artist.name} />
                  </div>
                  <div className="dj-info">
                    <h3 className="dj-name">{artist.name}</h3>
                    <p className="dj-genre">{artist.bio}</p>
                    {artist.instagram && (
                      <a
                        href={`https://instagram.com/${artist.instagram}`}
                        target="_blank"
                        rel="noopener"
                        className="dj-social"
                      >
                        @{artist.instagram}
                      </a>
                    )}
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* Booking Section Placeholder - Keep existing HTML structure */}
        <section className="booking" id="booking">
          <div className="container">
            <div className="section-header">
              <span className="section-label">Dein Platz</span>
              <h2 className="section-title">
                <span className="section-title-outline">TISCH BUCHEN</span>
              </h2>
            </div>
            {/* Booking content will be rendered by existing index.html */}
          </div>
        </section>

        {/* Contact Section */}
        <section className="contact" id="contact">
          <div className="container">
            <div className="section-header">
              <span className="section-label">Finde uns</span>
              <h2 className="section-title">
                <span className="section-title-outline">KONTAKT</span>
              </h2>
            </div>
            <div className="contact-grid">
              <div className="contact-info">
                <address>
                  <p><strong>FLEUR Baden-Baden</strong></p>
                  <p>Sophienstraße 15</p>
                  <p>76530 Baden-Baden</p>
                </address>
                <p>
                  <a href="tel:+4917661455163">+49 176 61455163</a>
                </p>
                <p>
                  <a href="mailto:info@fleur-badenbaden.de">info@fleur-badenbaden.de</a>
                </p>
              </div>
              <div className="contact-hours">
                <h3>Öffnungszeiten</h3>
                <p>Freitag: 22:00 – 05:00</p>
                <p>Samstag: 22:00 – 05:00</p>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="footer">
        <div className="footer-texture"></div>
        <div className="container">
          <div className="footer-bottom">
            <p className="footer-copy">© {new Date().getFullYear()} FLEUR Baden-Baden. Alle Rechte vorbehalten.</p>
            <nav className="footer-legal">
              <a href="/impressum">Impressum</a>
              <a href="/datenschutz">Datenschutz</a>
            </nav>
          </div>
          <div className="footer-credit">
            <span>Mit <span className="heart">♥</span> entwickelt von <a href="https://lsgestaltung.de" target="_blank" rel="noopener">lsgestaltung.de</a></span>
          </div>
        </div>
      </footer>

      {/* Load client-side scripts */}
      <script src="/js/main.js" defer></script>
    </>
  );
}
