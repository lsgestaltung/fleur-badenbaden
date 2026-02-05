/**
 * FLEUR Baden-Baden - Vercel KV Data Layer
 *
 * Handles all data persistence using Vercel KV (Redis).
 * Falls back to in-memory storage for local development.
 */

import { kv } from '@vercel/kv';
import type { SiteData, Announcement, Event, Artist } from './types';

// Keys for KV storage
const KEYS = {
  SITE_DATA: 'fleur:site_data',
  ANNOUNCEMENT: 'fleur:announcement',
  EVENTS: 'fleur:events',
  ARTISTS: 'fleur:artists',
  META: 'fleur:meta',
};

// Default data for initial setup
const DEFAULT_ANNOUNCEMENT: Announcement = {
  active: true,
  text: 'Willkommen im FLEUR Baden-Baden - Un Espace de Nuit',
  link: '#events',
  linkText: 'Events entdecken →',
  icon: '✦',
  priority: 'normal',
  expiresAt: null,
  updatedAt: new Date().toISOString(),
};

const DEFAULT_EVENTS: Event[] = [
  {
    id: 'evt-2025-02-14',
    title: 'VALENTINE\'S SPECIAL',
    date: '2025-02-14',
    time: '22:00',
    djs: ['MAALEEK', 'KEZRULESEVERYTHING'],
    description: 'Deep House & R&B Vibes zum Valentinstag',
    image: '/img/events/valentines.jpg',
    active: true,
    featured: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'evt-2025-02-21',
    title: 'DEEP HOUSE NIGHT',
    date: '2025-02-21',
    time: '22:00',
    djs: ['NIKLAS'],
    description: 'Melodic Deep House Journey',
    image: '/img/events/deep-house.jpg',
    active: true,
    featured: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'evt-2025-02-22',
    title: 'URBAN SATURDAY',
    date: '2025-02-22',
    time: '22:00',
    djs: ['MAALEEK'],
    description: 'Hip-Hop, R&B & Afrobeats',
    image: '/img/events/urban.jpg',
    active: true,
    featured: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'evt-2025-02-28',
    title: 'TECHNO FRIDAY',
    date: '2025-02-28',
    time: '22:00',
    djs: ['GUEST DJ'],
    description: 'Underground Techno Session',
    image: '/img/events/techno.jpg',
    active: true,
    featured: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

const DEFAULT_ARTISTS: Artist[] = [
  {
    id: 'artist-niklas',
    name: 'NIKLAS',
    role: 'resident',
    bio: 'Melodic Deep House & Progressive',
    image: '/img/djs/niklas.jpg',
    instagram: 'niklas_dj',
    active: true,
  },
  {
    id: 'artist-maaleek',
    name: 'MAALEEK',
    role: 'resident',
    bio: 'Hip-Hop, R&B & Afrobeats',
    image: '/img/djs/maaleek.jpg',
    instagram: 'maaleek_official',
    active: true,
  },
];

/**
 * Data Access Object for Vercel KV
 */
export const DataStore = {
  /**
   * Initialize data store with defaults if empty
   */
  async init(): Promise<void> {
    try {
      const existing = await kv.get(KEYS.ANNOUNCEMENT);
      if (!existing) {
        console.log('[KV] Initializing with default data...');
        await this.setAnnouncement(DEFAULT_ANNOUNCEMENT);
        await this.setEvents(DEFAULT_EVENTS);
        await this.setArtists(DEFAULT_ARTISTS);
        await this.updateMeta('system');
      }
    } catch (error) {
      console.error('[KV] Init error:', error);
    }
  },

  /**
   * Get announcement
   */
  async getAnnouncement(): Promise<Announcement> {
    try {
      const data = await kv.get<Announcement>(KEYS.ANNOUNCEMENT);
      return data || DEFAULT_ANNOUNCEMENT;
    } catch (error) {
      console.error('[KV] Get announcement error:', error);
      return DEFAULT_ANNOUNCEMENT;
    }
  },

  /**
   * Set announcement
   */
  async setAnnouncement(announcement: Partial<Announcement>): Promise<void> {
    try {
      const current = await this.getAnnouncement();
      const updated: Announcement = {
        ...current,
        ...announcement,
        updatedAt: new Date().toISOString(),
      };
      await kv.set(KEYS.ANNOUNCEMENT, updated);
    } catch (error) {
      console.error('[KV] Set announcement error:', error);
      throw error;
    }
  },

  /**
   * Get all events
   */
  async getEvents(): Promise<Event[]> {
    try {
      const data = await kv.get<Event[]>(KEYS.EVENTS);
      return data || DEFAULT_EVENTS;
    } catch (error) {
      console.error('[KV] Get events error:', error);
      return DEFAULT_EVENTS;
    }
  },

  /**
   * Get upcoming events (sorted by date)
   */
  async getUpcomingEvents(limit = 10): Promise<Event[]> {
    const events = await this.getEvents();
    const now = new Date().toISOString().split('T')[0];

    return events
      .filter(e => e.active && e.date >= now)
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(0, limit);
  },

  /**
   * Set all events
   */
  async setEvents(events: Event[]): Promise<void> {
    try {
      await kv.set(KEYS.EVENTS, events);
    } catch (error) {
      console.error('[KV] Set events error:', error);
      throw error;
    }
  },

  /**
   * Add or update a single event
   */
  async upsertEvent(event: Partial<Event> & { id?: string }): Promise<Event> {
    const events = await this.getEvents();
    const now = new Date().toISOString();

    if (event.id) {
      // Update existing
      const index = events.findIndex(e => e.id === event.id);
      if (index >= 0) {
        events[index] = { ...events[index], ...event, updatedAt: now };
        await this.setEvents(events);
        return events[index];
      }
    }

    // Create new
    const newEvent: Event = {
      id: `evt-${Date.now()}`,
      title: event.title || 'Neues Event',
      date: event.date || now.split('T')[0],
      time: event.time || '22:00',
      djs: event.djs || [],
      description: event.description || '',
      image: event.image || '',
      active: event.active ?? true,
      featured: event.featured ?? false,
      createdAt: now,
      updatedAt: now,
    };

    events.push(newEvent);
    await this.setEvents(events);
    return newEvent;
  },

  /**
   * Delete an event
   */
  async deleteEvent(eventId: string): Promise<boolean> {
    const events = await this.getEvents();
    const filtered = events.filter(e => e.id !== eventId);

    if (filtered.length === events.length) {
      return false; // Not found
    }

    await this.setEvents(filtered);
    return true;
  },

  /**
   * Get all artists
   */
  async getArtists(): Promise<Artist[]> {
    try {
      const data = await kv.get<Artist[]>(KEYS.ARTISTS);
      return data || DEFAULT_ARTISTS;
    } catch (error) {
      console.error('[KV] Get artists error:', error);
      return DEFAULT_ARTISTS;
    }
  },

  /**
   * Set all artists
   */
  async setArtists(artists: Artist[]): Promise<void> {
    try {
      await kv.set(KEYS.ARTISTS, artists);
    } catch (error) {
      console.error('[KV] Set artists error:', error);
      throw error;
    }
  },

  /**
   * Get complete site data
   */
  async getSiteData(): Promise<SiteData> {
    const [announcement, events, artists] = await Promise.all([
      this.getAnnouncement(),
      this.getEvents(),
      this.getArtists(),
    ]);

    return {
      announcement,
      events,
      artists,
      meta: {
        lastUpdated: new Date().toISOString(),
        updatedBy: 'api',
        version: 1,
      },
    };
  },

  /**
   * Update metadata
   */
  async updateMeta(updatedBy: string): Promise<void> {
    try {
      await kv.set(KEYS.META, {
        lastUpdated: new Date().toISOString(),
        updatedBy,
        version: 1,
      });
    } catch (error) {
      console.error('[KV] Update meta error:', error);
    }
  },
};

export default DataStore;
