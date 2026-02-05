/**
 * FLEUR Baden-Baden - Redis Data Layer
 *
 * Handles all data persistence using Upstash Redis.
 */

import { Redis } from '@upstash/redis';
import type { SiteData, Announcement, Event, Artist } from './types';

// Initialize Redis client
const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL || '',
  token: process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN || '',
});

// Keys for storage
const KEYS = {
  ANNOUNCEMENT: 'fleur:announcement',
  EVENTS: 'fleur:events',
  ARTISTS: 'fleur:artists',
  META: 'fleur:meta',
};

// Default data
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

const DEFAULT_EVENTS: Event[] = [];
const DEFAULT_ARTISTS: Artist[] = [];

/**
 * Data Store
 */
export const DataStore = {
  async getAnnouncement(): Promise<Announcement> {
    try {
      const data = await redis.get<Announcement>(KEYS.ANNOUNCEMENT);
      return data || DEFAULT_ANNOUNCEMENT;
    } catch (error) {
      console.error('[Redis] Get announcement error:', error);
      return DEFAULT_ANNOUNCEMENT;
    }
  },

  async setAnnouncement(announcement: Partial<Announcement>): Promise<void> {
    try {
      const current = await this.getAnnouncement();
      const updated: Announcement = {
        ...current,
        ...announcement,
        updatedAt: new Date().toISOString(),
      };
      await redis.set(KEYS.ANNOUNCEMENT, updated);
    } catch (error) {
      console.error('[Redis] Set announcement error:', error);
      throw error;
    }
  },

  async getEvents(): Promise<Event[]> {
    try {
      const data = await redis.get<Event[]>(KEYS.EVENTS);
      return data || DEFAULT_EVENTS;
    } catch (error) {
      console.error('[Redis] Get events error:', error);
      return DEFAULT_EVENTS;
    }
  },

  async getUpcomingEvents(limit = 10): Promise<Event[]> {
    const events = await this.getEvents();
    const now = new Date().toISOString().split('T')[0];
    return events
      .filter(e => e.active && e.date >= now)
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(0, limit);
  },

  async setEvents(events: Event[]): Promise<void> {
    try {
      await redis.set(KEYS.EVENTS, events);
    } catch (error) {
      console.error('[Redis] Set events error:', error);
      throw error;
    }
  },

  async upsertEvent(event: Partial<Event> & { id?: string }): Promise<Event> {
    const events = await this.getEvents();
    const now = new Date().toISOString();

    if (event.id) {
      const index = events.findIndex(e => e.id === event.id);
      if (index >= 0) {
        events[index] = { ...events[index], ...event, updatedAt: now };
        await this.setEvents(events);
        return events[index];
      }
    }

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

  async deleteEvent(eventId: string): Promise<boolean> {
    const events = await this.getEvents();
    const filtered = events.filter(e => e.id !== eventId);
    if (filtered.length === events.length) return false;
    await this.setEvents(filtered);
    return true;
  },

  async getArtists(): Promise<Artist[]> {
    try {
      const data = await redis.get<Artist[]>(KEYS.ARTISTS);
      return data || DEFAULT_ARTISTS;
    } catch (error) {
      console.error('[Redis] Get artists error:', error);
      return DEFAULT_ARTISTS;
    }
  },

  async setArtists(artists: Artist[]): Promise<void> {
    try {
      await redis.set(KEYS.ARTISTS, artists);
    } catch (error) {
      console.error('[Redis] Set artists error:', error);
      throw error;
    }
  },

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
};

export default DataStore;
