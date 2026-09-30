/**
 * FLEUR Baden-Baden - Main JavaScript
 * Un Espace de Nuit
 */

(function() {
    'use strict';

    // ============================================
    // CUSTOM CURSOR
    // ============================================
    const Cursor = {
        cursor: null,
        cursorDot: null,
        cursorOutline: null,
        mouseX: 0,
        mouseY: 0,
        outlineX: 0,
        outlineY: 0,

        init() {
            this.cursor = document.querySelector('.cursor');
            if (!this.cursor) return;

            this.cursorDot = this.cursor.querySelector('.cursor-dot');
            this.cursorOutline = this.cursor.querySelector('.cursor-outline');

            // Check for touch device
            if ('ontouchstart' in window) {
                this.cursor.style.display = 'none';
                return;
            }

            this.bindEvents();
            this.animate();
        },

        bindEvents() {
            document.addEventListener('mousemove', (e) => {
                this.mouseX = e.clientX;
                this.mouseY = e.clientY;

                // Move dot immediately
                if (this.cursorDot) {
                    this.cursorDot.style.left = `${this.mouseX}px`;
                    this.cursorDot.style.top = `${this.mouseY}px`;
                }
            });

            // Hover states
            const hoverElements = document.querySelectorAll('a, button, .btn, .booking-option, .map-area, .gallery-item');
            hoverElements.forEach(el => {
                el.addEventListener('mouseenter', () => document.body.classList.add('cursor-hover'));
                el.addEventListener('mouseleave', () => document.body.classList.remove('cursor-hover'));
            });

            // Hide cursor when leaving window
            document.addEventListener('mouseleave', () => {
                if (this.cursor) this.cursor.style.opacity = '0';
            });

            document.addEventListener('mouseenter', () => {
                if (this.cursor) this.cursor.style.opacity = '1';
            });
        },

        animate() {
            // Smooth follow for outline
            this.outlineX += (this.mouseX - this.outlineX) * 0.15;
            this.outlineY += (this.mouseY - this.outlineY) * 0.15;

            if (this.cursorOutline) {
                this.cursorOutline.style.left = `${this.outlineX}px`;
                this.cursorOutline.style.top = `${this.outlineY}px`;
            }

            requestAnimationFrame(() => this.animate());
        }
    };

    // ============================================
    // NAVIGATION
    // ============================================
    const Navigation = {
        header: null,
        navToggle: null,
        navOverlay: null,
        navLinks: null,
        isOpen: false,

        init() {
            this.header = document.querySelector('.header');
            this.navToggle = document.querySelector('.nav-toggle');
            this.navOverlay = document.querySelector('.nav-overlay');
            this.navLinks = document.querySelectorAll('.nav-menu a');

            if (!this.navToggle || !this.navOverlay) return;

            this.bindEvents();
        },

        bindEvents() {
            // Toggle menu
            this.navToggle.addEventListener('click', () => this.toggle());

            // Close on link click
            this.navLinks.forEach(link => {
                link.addEventListener('click', () => this.close());
            });

            // Close on escape
            document.addEventListener('keydown', (e) => {
                if (e.key === 'Escape' && this.isOpen) {
                    this.close();
                }
            });

            // Scroll behavior for header
            let lastScroll = 0;
            window.addEventListener('scroll', () => {
                const currentScroll = window.pageYOffset;

                if (currentScroll > 100) {
                    this.header.classList.add('scrolled');
                } else {
                    this.header.classList.remove('scrolled');
                }

                lastScroll = currentScroll;
            });
        },

        toggle() {
            this.isOpen ? this.close() : this.open();
        },

        open() {
            this.isOpen = true;
            this.navToggle.setAttribute('aria-expanded', 'true');
            this.navOverlay.setAttribute('aria-hidden', 'false');
            document.body.classList.add('nav-open');
        },

        close() {
            this.isOpen = false;
            this.navToggle.setAttribute('aria-expanded', 'false');
            this.navOverlay.setAttribute('aria-hidden', 'true');
            document.body.classList.remove('nav-open');
        }
    };

    // ============================================
    // SMOOTH SCROLL
    // ============================================
    const SmoothScroll = {
        init() {
            document.querySelectorAll('a[href^="#"]').forEach(anchor => {
                anchor.addEventListener('click', (e) => {
                    const href = anchor.getAttribute('href');
                    if (href === '#') return;

                    const target = document.querySelector(href);
                    if (target) {
                        e.preventDefault();
                        const headerOffset = 80;
                        const elementPosition = target.getBoundingClientRect().top;
                        const offsetPosition = elementPosition + window.pageYOffset - headerOffset;

                        window.scrollTo({
                            top: offsetPosition,
                            behavior: 'smooth'
                        });
                    }
                });
            });
        }
    };

    // ============================================
    // SCROLL ANIMATIONS
    // ============================================
    const ScrollAnimations = {
        observer: null,

        init() {
            // Add fade-in class to elements
            const animatedElements = document.querySelectorAll(
                '.section-header, .event-item, .booking-option, .dj-card, .gallery-item, .footer-col'
            );

            animatedElements.forEach(el => {
                el.classList.add('fade-in');
            });

            // Create intersection observer
            this.observer = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        entry.target.classList.add('visible');
                        // Optionally unobserve after animation
                        // this.observer.unobserve(entry.target);
                    }
                });
            }, {
                threshold: 0.1,
                rootMargin: '0px 0px -50px 0px'
            });

            // Observe elements
            document.querySelectorAll('.fade-in').forEach(el => {
                this.observer.observe(el);
            });
        }
    };

    // ============================================
    // BOOKING FLOOR PLAN + MODAL
    // ============================================
    const BookingFloorplan = {
        options: null,
        floorplanAreas: null,
        modal: null,
        modalTitle: null,
        modalDesc: null,
        modalDate: null,
        modalPersons: null,
        modalWhatsApp: null,
        currentArea: null,

        init() {
            this.options = document.querySelectorAll('.booking-option-bookable');
            this.floorplanAreas = document.querySelectorAll('.floorplan-bookable[data-bookable="true"]');
            this.modal = document.getElementById('bookingModal');
            this.modalTitle = document.getElementById('modalTitle');
            this.modalDesc = document.getElementById('modalDesc');
            this.modalDate = document.getElementById('modalDate');
            this.modalPersons = document.getElementById('modalPersons');
            this.modalWhatsApp = document.getElementById('modalWhatsApp');

            if (!this.modal) return;

            // Set default date to today
            if (this.modalDate) {
                const today = new Date().toISOString().split('T')[0];
                this.modalDate.value = today;
            }

            this.bindEvents();
        },

        bindEvents() {
            // Option clicks (only bookable options)
            this.options.forEach(option => {
                option.addEventListener('click', () => {
                    const title = option.dataset.title;
                    const desc = option.dataset.desc;
                    const area = option.dataset.area;
                    this.openModal(title, desc, area);
                });
            });

            // Floorplan area clicks (only bookable areas)
            this.floorplanAreas.forEach(area => {
                area.addEventListener('click', () => {
                    // Only open modal if area is bookable
                    if (area.dataset.bookable !== 'true') return;

                    const title = area.dataset.title;
                    const desc = area.dataset.desc;
                    const areaType = area.dataset.area;
                    this.openModal(title, desc, areaType);
                });
            });

            // Close modal
            if (this.modal) {
                const closeBtn = this.modal.querySelector('.booking-modal-close');
                const overlay = this.modal.querySelector('.booking-modal-overlay');

                if (closeBtn) closeBtn.addEventListener('click', () => this.closeModal());
                if (overlay) overlay.addEventListener('click', () => this.closeModal());

                // Close on escape
                document.addEventListener('keydown', (e) => {
                    if (e.key === 'Escape') this.closeModal();
                });

                // Update WhatsApp link when form changes
                if (this.modalDate) this.modalDate.addEventListener('change', () => this.updateWhatsAppLink());
                if (this.modalPersons) this.modalPersons.addEventListener('change', () => this.updateWhatsAppLink());
            }
        },

        openModal(title, desc, area) {
            this.currentArea = area;

            if (this.modalTitle) this.modalTitle.textContent = title || 'Reservierung';
            if (this.modalDesc) this.modalDesc.textContent = desc || '';

            this.updateWhatsAppLink();

            if (this.modal) {
                this.modal.classList.add('active');
                this.modal.setAttribute('aria-hidden', 'false');
                document.body.style.overflow = 'hidden';
            }
        },

        closeModal() {
            if (this.modal) {
                this.modal.classList.remove('active');
                this.modal.setAttribute('aria-hidden', 'true');
                document.body.style.overflow = '';
            }
        },

        updateWhatsAppLink() {
            if (!this.modalWhatsApp) return;

            const areaName = this.modalTitle ? this.modalTitle.textContent : 'einen Tisch';
            const date = this.modalDate ? this.formatDate(this.modalDate.value) : '[Datum]';
            const persons = this.modalPersons ? this.modalPersons.value : '2';

            const message = `Hi, ich würde gerne den ${areaName} reservieren für den ${date} für ${persons} Personen. Danke!`;
            const encodedMessage = encodeURIComponent(message);

            this.modalWhatsApp.href = `https://wa.me/4917661455163?text=${encodedMessage}`;
        },

        formatDate(dateString) {
            if (!dateString) return '[Datum]';
            const date = new Date(dateString);
            const options = { day: 'numeric', month: 'long', year: 'numeric' };
            return date.toLocaleDateString('de-DE', options);
        }
    };

    // ============================================
    // RESIDENT DJ IMAGE CAROUSEL
    // ============================================
    const ResidentCarousel = {
        carousel: null,
        images: null,
        currentIndex: 0,
        interval: null,

        init() {
            this.carousel = document.getElementById('niklasCarousel');
            if (!this.carousel) return;

            this.images = this.carousel.querySelectorAll('.resident-img');
            if (this.images.length <= 1) return;

            // Start carousel with 3 second interval
            this.startCarousel();
        },

        startCarousel() {
            this.interval = setInterval(() => {
                this.nextImage();
            }, 3000);
        },

        nextImage() {
            // Remove active from current
            this.images[this.currentIndex].classList.remove('active');

            // Move to next
            this.currentIndex = (this.currentIndex + 1) % this.images.length;

            // Add active to new current
            this.images[this.currentIndex].classList.add('active');
        }
    };

    // ============================================
    // DJ SLIDER
    // ============================================
    const DJSlider = {
        slider: null,
        track: null,
        isDragging: false,
        startX: 0,
        scrollLeft: 0,

        init() {
            this.slider = document.querySelector('.djs-slider');
            this.track = document.querySelector('.djs-track');

            if (!this.slider) return;

            this.bindEvents();
        },

        bindEvents() {
            // Mouse drag
            this.slider.addEventListener('mousedown', (e) => this.startDrag(e));
            this.slider.addEventListener('mousemove', (e) => this.drag(e));
            this.slider.addEventListener('mouseup', () => this.endDrag());
            this.slider.addEventListener('mouseleave', () => this.endDrag());

            // Touch
            this.slider.addEventListener('touchstart', (e) => this.startDrag(e));
            this.slider.addEventListener('touchmove', (e) => this.drag(e));
            this.slider.addEventListener('touchend', () => this.endDrag());
        },

        startDrag(e) {
            this.isDragging = true;
            this.slider.classList.add('dragging');
            this.startX = e.type.includes('mouse') ? e.pageX : e.touches[0].pageX;
            this.scrollLeft = this.slider.scrollLeft;
        },

        drag(e) {
            if (!this.isDragging) return;
            e.preventDefault();

            const x = e.type.includes('mouse') ? e.pageX : e.touches[0].pageX;
            const walk = (this.startX - x) * 1.5;
            this.slider.scrollLeft = this.scrollLeft + walk;
        },

        endDrag() {
            this.isDragging = false;
            this.slider.classList.remove('dragging');
        }
    };

    // ============================================
    // GALLERY LIGHTBOX (Basic Implementation)
    // ============================================
    const Gallery = {
        items: null,

        init() {
            this.items = document.querySelectorAll('.gallery-item');

            if (!this.items.length) return;

            this.bindEvents();
        },

        bindEvents() {
            this.items.forEach((item, index) => {
                item.addEventListener('click', () => {
                    // For now, just add a visual feedback
                    // Full lightbox can be implemented later
                    item.style.transform = 'scale(0.98)';
                    setTimeout(() => {
                        item.style.transform = '';
                    }, 150);
                });
            });
        }
    };

    // ============================================
    // MARQUEE PAUSE ON HOVER
    // ============================================
    const Marquee = {
        init() {
            const marquees = document.querySelectorAll('.marquee');

            marquees.forEach(marquee => {
                const content = marquee.querySelector('.marquee-content');

                marquee.addEventListener('mouseenter', () => {
                    if (content) content.style.animationPlayState = 'paused';
                });

                marquee.addEventListener('mouseleave', () => {
                    if (content) content.style.animationPlayState = 'running';
                });
            });
        }
    };

    // ============================================
    // PARALLAX EFFECT (Subtle)
    // ============================================
    const Parallax = {
        hero: null,
        heroTexture: null,

        init() {
            this.hero = document.querySelector('.hero');
            this.heroTexture = document.querySelector('.hero-texture');

            if (!this.hero || !this.heroTexture) return;

            window.addEventListener('scroll', () => this.onScroll());
        },

        onScroll() {
            const scrolled = window.pageYOffset;
            const heroHeight = this.hero.offsetHeight;

            if (scrolled < heroHeight) {
                const parallaxValue = scrolled * 0.3;
                this.heroTexture.style.transform = `translateY(${parallaxValue}px)`;
            }
        }
    };

    // ============================================
    // PRELOADER (Optional)
    // ============================================
    const Preloader = {
        init() {
            // Add loaded class after page load
            window.addEventListener('load', () => {
                document.body.classList.add('loaded');

                // Remove preloader if exists
                const preloader = document.querySelector('.preloader');
                if (preloader) {
                    preloader.style.opacity = '0';
                    setTimeout(() => {
                        preloader.style.display = 'none';
                    }, 500);
                }
            });
        }
    };

    // Copyright-Jahr aktuell halten
    document.querySelectorAll('.js-year').forEach(el => { el.textContent = new Date().getFullYear(); });

    // ============================================
    // ANNOUNCEMENT LOADER (Telegram Bot Integration)
    // ============================================
    const AnnouncementLoader = {
        announcementSection: null,
        announcementText: null,
        announcementLink: null,
        announcementIcon: null,
        dataUrl: '/api/data',
        cacheKey: 'fleur_announcement_cache',
        cacheDuration: 5 * 60 * 1000, // 5 minutes

        // Eine Durchsage aus dem Bot gilt nur, solange sie frisch ist. Ohne
        // diese Grenze bleibt eine Meldung ohne expiresAt ewig stehen.
        maxAnnouncementAge: 14 * 24 * 60 * 60 * 1000,

        init() {
            this.announcementSection = document.getElementById('announcement');
            this.announcementText = document.getElementById('announcementText');
            this.announcementLink = document.querySelector('.announcement-link');
            this.announcementIcon = document.querySelector('.announcement-icon');

            if (!this.announcementSection) return;

            // Sofort das naechste Event anzeigen, damit nie ein alter Stand
            // aufblitzt, waehrend /api/data noch laedt.
            this.applyNextEvent();
            this.loadAnnouncement();
        },

        /* ---- Automatischer Hinweis auf das naechste Event ----
           Quelle sind die Event-Karten im Markup. Sie werden ohnehin
           gepflegt, also gibt es keine zweite Liste, die veralten kann. */

        // Datum in Berlin als YYYY-MM-DD. Ueber Intl statt Zeitzonen-Offset,
        // damit die Sommerzeitumstellung Ende Oktober nichts verschiebt.
        berlinDate(d) {
            return new Intl.DateTimeFormat('en-CA', {
                timeZone: 'Europe/Berlin',
                year: 'numeric', month: '2-digit', day: '2-digit'
            }).format(d);
        },

        // Ein Clubabend zaehlt bis 06:00 des Folgetages. Um 02:00 Uhr in der
        // Nacht soll noch der Abend von gestern stehen, nicht schon der naechste.
        currentClubDate() {
            const jetzt = new Date();
            const stunde = parseInt(new Intl.DateTimeFormat('de-DE', {
                timeZone: 'Europe/Berlin', hour: '2-digit', hour12: false
            }).format(jetzt), 10);

            const heute = this.berlinDate(jetzt);
            if (stunde >= 6) return heute;

            const gestern = new Date(heute + 'T12:00:00Z');
            gestern.setUTCDate(gestern.getUTCDate() - 1);
            return gestern.toISOString().slice(0, 10);
        },

        nextEvent() {
            const stichtag = this.currentClubDate();
            let treffer = null;

            document.querySelectorAll('.event-card[data-date]').forEach(karte => {
                const datum = karte.dataset.date;
                if (!/^\d{4}-\d{2}-\d{2}$/.test(datum)) return;
                if (datum < stichtag) return;
                if (treffer && datum >= treffer.datum) return;

                const kuenstler = karte.querySelector('.event-artist');
                if (!kuenstler || !kuenstler.textContent.trim()) return;

                treffer = { datum, name: kuenstler.textContent.trim() };
            });

            return treffer;
        },

        nextEventText() {
            const ev = this.nextEvent();
            if (!ev) return null;

            // Mittag UTC als Ankerzeit - so kippt das Datum in keiner Zeitzone.
            const label = new Date(ev.datum + 'T12:00:00Z').toLocaleDateString('de-DE', {
                timeZone: 'Europe/Berlin',
                weekday: 'long', day: 'numeric', month: 'long'
            });

            return label + ': ' + ev.name;
        },

        applyNextEvent() {
            const text = this.nextEventText();

            // Kein kommendes Event: lieber nichts zeigen als etwas Altes.
            if (!text) {
                this.hide();
                return false;
            }

            if (this.announcementText) this.announcementText.textContent = text;
            this.show();
            return true;
        },

        // Gilt die Durchsage aus dem Bot noch?
        announcementIsFresh(a) {
            if (!a || !a.active) return false;

            if (a.expiresAt) return new Date(a.expiresAt) > new Date();

            // Ohne Ablaufdatum entscheidet das Alter.
            const stand = a.updatedAt || a.lastUpdated;
            if (!stand) return false;

            // Kein Mindestwert: liegt der Zeitstempel leicht in der Zukunft, weil
            // Server- und Besucheruhr auseinanderlaufen, ist die Meldung erst
            // recht aktuell und soll angezeigt werden.
            const alter = Date.now() - new Date(stand).getTime();
            return Number.isFinite(alter) && alter < this.maxAnnouncementAge;
        },

        async loadAnnouncement() {
            try {
                // Check cache first
                const cached = this.getFromCache();
                if (cached) {
                    this.updateUI(cached);
                    return;
                }

                // Fetch from server
                const response = await fetch(this.dataUrl);
                if (!response.ok) throw new Error('Failed to fetch');

                const data = await response.json();

                // Cache the data
                this.saveToCache(data);

                // Update UI
                this.updateUI(data);

            } catch (error) {
                console.warn('Announcement load failed, using default:', error);
                // Der automatische Hinweis steht bereits - nichts weiter zu tun.
            }
        },

        updateUI(data) {
            const a = data && data.announcement;

            // Abgelaufen, abgeschaltet oder veraltet: nicht ausblenden, sondern
            // auf das naechste Event zurueckfallen.
            if (!a || !this.announcementIsFresh(a) || !a.text) {
                this.applyNextEvent();
                return;
            }

            const { text, link, linkText, icon } = a;

            // Update content
            if (this.announcementText && text) {
                this.announcementText.textContent = text;
            }

            if (this.announcementLink && link) {
                this.announcementLink.href = link;
                if (linkText) {
                    this.announcementLink.textContent = linkText;
                }
            }

            if (this.announcementIcon && icon) {
                this.announcementIcon.textContent = icon;
            }

            // Show the announcement
            this.show();
        },

        show() {
            if (this.announcementSection) {
                this.announcementSection.style.display = '';
                this.announcementSection.classList.add('active');
            }
        },

        hide() {
            if (this.announcementSection) {
                this.announcementSection.style.display = 'none';
                this.announcementSection.classList.remove('active');
            }
        },

        getFromCache() {
            try {
                const cached = localStorage.getItem(this.cacheKey);
                if (!cached) return null;

                const { data, timestamp } = JSON.parse(cached);
                const age = Date.now() - timestamp;

                if (age > this.cacheDuration) {
                    localStorage.removeItem(this.cacheKey);
                    return null;
                }

                return data;
            } catch {
                return null;
            }
        },

        saveToCache(data) {
            try {
                localStorage.setItem(this.cacheKey, JSON.stringify({
                    data,
                    timestamp: Date.now()
                }));
            } catch {
                // Storage might be full or disabled
            }
        }
    };

    // ============================================
    // EVENT WEEKDAY CALCULATOR
    // ============================================
    const EventWeekday = {
        weekdays: ['SO', 'MO', 'DI', 'MI', 'DO', 'FR', 'SA'],
        months: ['JAN', 'FEB', 'MÄR', 'APR', 'MAI', 'JUN', 'JUL', 'AUG', 'SEP', 'OKT', 'NOV', 'DEZ'],

        init() {
            const eventCards = document.querySelectorAll('.event-card[data-date]');

            eventCards.forEach(card => {
                const dateStr = card.dataset.date;
                if (!dateStr) return;

                const date = new Date(dateStr + 'T00:00:00');
                if (isNaN(date.getTime())) return;

                const dayElement = card.querySelector('.event-day');
                const monthElement = card.querySelector('.event-month');

                if (dayElement) {
                    dayElement.textContent = this.weekdays[date.getDay()];
                }

                if (monthElement) {
                    monthElement.textContent = this.months[date.getMonth()];
                }
            });
        }
    };

    // ============================================
    // COOKIE BANNER
    // ============================================
    const CookieBanner = {
        banner: null,
        acceptBtn: null,
        declineBtn: null,
        cookieName: 'fleur_cookie_consent',
        cookieDuration: 365, // days

        init() {
            this.banner = document.getElementById('cookieBanner');
            this.acceptBtn = document.getElementById('cookieAccept');
            this.declineBtn = document.getElementById('cookieDecline');

            if (!this.banner) return;

            // Check if user has already made a choice
            const consent = this.getCookie(this.cookieName);
            if (!consent) {
                // Show banner after a short delay
                setTimeout(() => this.show(), 1000);
            }

            this.bindEvents();
        },

        bindEvents() {
            if (this.acceptBtn) {
                this.acceptBtn.addEventListener('click', () => {
                    this.setCookie(this.cookieName, 'accepted', this.cookieDuration);
                    this.hide();
                    this.enableAnalytics();
                });
            }

            if (this.declineBtn) {
                this.declineBtn.addEventListener('click', () => {
                    this.setCookie(this.cookieName, 'declined', this.cookieDuration);
                    this.hide();
                });
            }
        },

        show() {
            if (this.banner) {
                this.banner.classList.add('active');
                this.banner.setAttribute('aria-hidden', 'false');
            }
        },

        hide() {
            if (this.banner) {
                this.banner.classList.remove('active');
                this.banner.setAttribute('aria-hidden', 'true');
            }
        },

        enableAnalytics() {
            // Google Analytics can be loaded here if consent is given
            // Example: load GA script dynamically
            console.log('Analytics cookies enabled');
        },

        setCookie(name, value, days) {
            const date = new Date();
            date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
            const expires = 'expires=' + date.toUTCString();
            document.cookie = name + '=' + value + ';' + expires + ';path=/;SameSite=Lax';
        },

        getCookie(name) {
            const nameEQ = name + '=';
            const cookies = document.cookie.split(';');
            for (let i = 0; i < cookies.length; i++) {
                let cookie = cookies[i].trim();
                if (cookie.indexOf(nameEQ) === 0) {
                    return cookie.substring(nameEQ.length);
                }
            }
            return null;
        }
    };

    // ============================================
    // INITIALIZE ALL MODULES
    // ============================================
    document.addEventListener('DOMContentLoaded', () => {
        Cursor.init();
        Navigation.init();
        SmoothScroll.init();
        ScrollAnimations.init();
        BookingFloorplan.init();
        ResidentCarousel.init();
        DJSlider.init();
        Gallery.init();
        Marquee.init();
        Parallax.init();
        Preloader.init();
        AnnouncementLoader.init();
        EventWeekday.init();
        CookieBanner.init();

        console.log('FLEUR Baden-Baden - Website initialized');
    });

})();
