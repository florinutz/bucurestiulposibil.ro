import { NextRequest, NextResponse } from 'next/server';
import { getCloudflareContext } from '@opennextjs/cloudflare';

// Note: Edge runtime removed due to OpenNext bundling limitation
// Edge runtime functions must be defined in separate functions for OpenNext
// This will still run on Cloudflare Workers but with Node.js compatibility

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function GET(request: NextRequest) {
  const { env } = await getCloudflareContext();
  const db = env.DB as D1Database;
  
  if (!db) {
    return NextResponse.json(
      { error: 'Database not available' },
      { status: 503 }
    );
  }
  
  try {
    // Query votable pins with vote counts
    const query = `
      SELECT 
        g.id, g.title, g.slug, g.lat, g.lng, g.description,
        g.submitted_by_name, g.created_at, g.updated_at,
        COUNT(v.id) as vote_count
      FROM geopoints g
      LEFT JOIN votes v ON g.id = v.geopoint_id
      WHERE g.is_votable = TRUE
      GROUP BY g.id
      ORDER BY vote_count DESC, g.created_at ASC
    `;
    
    const result = await db.prepare(query).all();
    
    const votableLocations = result.results.map(row => ({
      id: row.id as string,
      title: row.title as string,
      description: (row.description as string) || '',
      lat: row.lat as number,
      lng: row.lng as number,
      status: 'approved' as const,
      createdAt: new Date(row.created_at as string),
      submittedByName: row.submitted_by_name as string | null,
      isVotable: true,
      voteCount: (row.vote_count as number) || 0
    }));

    return NextResponse.json({ 
      locations: votableLocations,
      total: votableLocations.length 
    });
  } catch (error) {
    console.error('Error fetching votable geopoints:', error);
    return NextResponse.json(
      { error: 'Failed to fetch voting locations' },
      { status: 500 }
    );
  }
}
