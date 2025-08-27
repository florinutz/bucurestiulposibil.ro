import { NextRequest, NextResponse } from 'next/server';
import { getCloudflareContext } from '@opennextjs/cloudflare';
import type { VoteRequest, VoteResponse } from '@/types/geopoint';

// Note: Edge runtime removed due to OpenNext bundling limitation
// Edge runtime functions must be defined in separate functions for OpenNext
// This will still run on Cloudflare Workers but with Node.js compatibility

function generateVoteId(): string {
  return `vote_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

function getBrowserFingerprint(request: NextRequest, body: VoteRequest) {
  const fingerprint = body.browserFingerprint;
  
  // Use the same improved hash generation as the frontend
  const uniqueParts = [
    fingerprint.sessionId || '',
    fingerprint.additionalEntropy || '',
    fingerprint.screenResolution,
    fingerprint.timezone,
    fingerprint.language,
    fingerprint.platform,
    fingerprint.userAgent.substring(0, 50) // Truncate userAgent since it's long and not unique
  ].join('|');
  
  // Create a more robust hash using multiple approaches
  const base64Hash = btoa(uniqueParts).replace(/[^a-zA-Z0-9]/g, '');
  
  // Also create a simple hash for additional entropy
  let simpleHash = 0;
  for (let i = 0; i < uniqueParts.length; i++) {
    const char = uniqueParts.charCodeAt(i);
    simpleHash = ((simpleHash << 5) - simpleHash) + char;
    simpleHash = simpleHash & simpleHash; // Convert to 32bit integer
  }
  
  // Combine both approaches and take first 32 characters
  const combinedHash = base64Hash + Math.abs(simpleHash).toString(36);
  const hash = combinedHash.substring(0, 32);

  return {
    ...fingerprint,
    hash
  };
}

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
    const body: VoteRequest = await request.json();
    const { geopointId, browserFingerprint } = body;
    
    if (!geopointId || !browserFingerprint) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const fingerprint = getBrowserFingerprint(request, body);
    const voteId = generateVoteId();
    const now = new Date().toISOString();
    
    // Get client IP from Cloudflare headers
    const clientIP = request.headers.get('CF-Connecting-IP') || 
                    request.headers.get('X-Forwarded-For') || 
                    'unknown';

    // Check if pin is votable
    const pinCheck = await db.prepare(
      'SELECT id, is_votable FROM geopoints WHERE id = ? AND is_votable = TRUE'
    ).bind(geopointId).first();
    
    if (!pinCheck) {
      return NextResponse.json(
        { error: 'Pin not found or not votable' },
        { status: 404 }
      );
    }

    // Try to insert vote (will fail if already voted due to UNIQUE constraint)
    try {
      await db.prepare(`
        INSERT INTO votes (
          id, geopoint_id, voted_at, browser_fingerprint,
          ip_address, user_agent, screen_resolution, timezone, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).bind(
        voteId,
        geopointId,
        now,
        fingerprint.hash,
        clientIP,
        fingerprint.userAgent,
        fingerprint.screenResolution,
        fingerprint.timezone,
        now
      ).run();
    } catch (error) {
      // Check if it's a duplicate vote error
      if (error instanceof Error && error.message.includes('UNIQUE constraint failed')) {
        return NextResponse.json(
          { error: 'You have already voted for this location' },
          { status: 409 }
        );
      }
      throw error;
    }

    // Get updated vote count
    const voteCountResult = await db.prepare(
      'SELECT COUNT(*) as count FROM votes WHERE geopoint_id = ?'
    ).bind(geopointId).first();
    
    const newVoteCount = Number(voteCountResult?.count) || 0;

    const response: VoteResponse = {
      success: true,
      voteId,
      newVoteCount
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error recording vote:', error);
    return NextResponse.json(
      { error: 'Failed to record vote' },
      { status: 500 }
    );
  }
}
