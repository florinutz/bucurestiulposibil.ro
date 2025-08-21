import { NextRequest, NextResponse } from 'next/server';
import { getCloudflareContext } from '@opennextjs/cloudflare';
import type { BrowserFingerprint, UserVotesResponse } from '@/types/geopoint';

// Note: Edge runtime removed due to OpenNext bundling limitation
// Edge runtime functions must be defined in separate functions for OpenNext
// This will still run on Cloudflare Workers but with Node.js compatibility

export async function POST(request: NextRequest) {
  const { env } = await getCloudflareContext();
  const db = env.DB as D1Database;
  
  if (!db) {
    return NextResponse.json(
      { error: 'Database not available' },
      { status: 503 }
    );
  }
  
  try {
    const { browserFingerprint }: { browserFingerprint: BrowserFingerprint } = await request.json();
    
    if (!browserFingerprint) {
      return NextResponse.json(
        { error: 'Browser fingerprint required' },
        { status: 400 }
      );
    }

    const fingerprintHash = btoa(JSON.stringify(browserFingerprint))
      .replace(/[^a-zA-Z0-9]/g, '').substr(0, 32);
    
    const result = await db.prepare(
      'SELECT geopoint_id FROM votes WHERE browser_fingerprint = ?'
    ).bind(fingerprintHash).all();
    
    const votedPinIds = result.results.map(row => row.geopoint_id as string);
    
    const response: UserVotesResponse = { votedPinIds };
    return NextResponse.json(response);
  } catch (error) {
    console.error('Error fetching user votes:', error);
    return NextResponse.json(
      { error: 'Failed to fetch user votes' },
      { status: 500 }
    );
  }
}
