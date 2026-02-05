/**
 * FLEUR Baden-Baden - Main Page (Server Component)
 *
 * Fetches data from KV and renders the page.
 * Uses ISR for automatic revalidation.
 */

import DataStore from '@/lib/kv';
import MainContent from '@/components/MainContent';

// Revalidate every 60 seconds (ISR)
export const revalidate = 60;

export default async function HomePage() {
  // Fetch data server-side
  const [announcement, events, artists] = await Promise.all([
    DataStore.getAnnouncement(),
    DataStore.getUpcomingEvents(10),
    DataStore.getArtists(),
  ]);

  return (
    <MainContent
      announcement={announcement}
      events={events}
      artists={artists}
    />
  );
}
