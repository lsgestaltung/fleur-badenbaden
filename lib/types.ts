/**
 * FLEUR Baden-Baden - Type Definitions
 */

export interface Announcement {
  active: boolean;
  text: string;
  link: string;
  linkText: string;
  icon: string;
  priority: 'low' | 'normal' | 'high';
  expiresAt: string | null;
  updatedAt: string;
}

export interface Event {
  id: string;
  title: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:MM
  endTime?: string;
  djs: string[]; // Artists performing
  description: string;
  image: string;
  active: boolean;
  featured: boolean;
  month?: string; // e.g., "FEBRUAR"
  createdAt: string;
  updatedAt: string;
}

export interface Artist {
  id: string;
  name: string;
  role: string; // 'resident' | 'guest'
  bio: string;
  image: string;
  instagram?: string;
  soundcloud?: string;
  active: boolean;
}

export interface SiteData {
  announcement: Announcement;
  events: Event[];
  artists: Artist[];
  meta: {
    lastUpdated: string;
    updatedBy: string;
    version: number;
  };
}

export interface TelegramUpdate {
  update_id: number;
  message?: {
    message_id: number;
    from: {
      id: number;
      is_bot: boolean;
      first_name: string;
      username?: string;
    };
    chat: {
      id: number;
      type: string;
    };
    date: number;
    text?: string;
  };
}

export interface TelegramResponse {
  ok: boolean;
  result?: unknown;
  description?: string;
}
