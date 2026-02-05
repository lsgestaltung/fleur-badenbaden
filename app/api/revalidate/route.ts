/**
 * FLEUR Baden-Baden - On-Demand Revalidation
 *
 * Manually trigger ISR revalidation.
 * Called after Telegram updates to refresh cached pages.
 *
 * Endpoint: POST /api/revalidate?secret=<REVALIDATE_SECRET>&path=/
 */

import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath, revalidateTag } from 'next/cache';

export async function POST(request: NextRequest) {
  const secret = request.nextUrl.searchParams.get('secret');
  const path = request.nextUrl.searchParams.get('path') || '/';
  const tag = request.nextUrl.searchParams.get('tag');

  // Verify secret
  if (secret !== process.env.REVALIDATE_SECRET) {
    return NextResponse.json({ error: 'Invalid secret' }, { status: 401 });
  }

  try {
    if (tag) {
      revalidateTag(tag);
      console.log(`[Revalidate] Tag revalidated: ${tag}`);
    } else {
      revalidatePath(path);
      console.log(`[Revalidate] Path revalidated: ${path}`);
    }

    return NextResponse.json({
      revalidated: true,
      path: tag ? undefined : path,
      tag: tag || undefined,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[Revalidate] Error:', error);
    return NextResponse.json({ error: 'Revalidation failed' }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'Use POST to trigger revalidation',
    usage: 'POST /api/revalidate?secret=<secret>&path=/',
  });
}
