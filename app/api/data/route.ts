/**
 * FLEUR Baden-Baden - Data API
 *
 * Returns current site data (announcements, events, artists).
 * Used by the frontend to fetch dynamic content.
 *
 * Endpoint: GET /api/data
 */

import { NextResponse } from 'next/server';
import DataStore from '@/lib/kv';

export const dynamic = 'force-dynamic'; // Always fetch fresh data
export const revalidate = 60; // Revalidate every 60 seconds

export async function GET() {
  try {
    const data = await DataStore.getSiteData();

    return NextResponse.json(data, {
      headers: {
        'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300',
      },
    });
  } catch (error) {
    console.error('[API] Data fetch error:', error);

    // Return default data on error
    return NextResponse.json({
      announcement: {
        active: true,
        text: 'Willkommen im FLEUR Baden-Baden',
        link: '#events',
        linkText: 'Events entdecken →',
        icon: '✦',
      },
      events: [],
      artists: [],
      meta: {
        lastUpdated: new Date().toISOString(),
        updatedBy: 'fallback',
        version: 1,
      },
    });
  }
}
