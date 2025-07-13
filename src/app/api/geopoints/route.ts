import { NextRequest, NextResponse } from 'next/server'
import { getCloudflareContext } from '@opennextjs/cloudflare'
import { D1Geopoint } from '@/types/geopoint'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const bounds = searchParams.get('bounds') // "north,south,east,west"
    const id = searchParams.get('id') // For getting a specific geopoint

    const { env } = await getCloudflareContext()
    const db = env.DB as D1Database
    
    if (!db) {
      return NextResponse.json(
        { error: 'Database not available' },
        { status: 503 }
      )
    }

    // If ID is provided, return specific geopoint
    if (id) {
      const stmt = db.prepare('SELECT * FROM geopoints WHERE id = ?')
      const result = await stmt.bind(id).first()

      if (!result) {
        return NextResponse.json(
          { error: 'Geopoint not found' },
          { status: 404 }
        )
      }

      const geopoint = {
        ...(result as unknown as D1Geopoint),
      }

      return NextResponse.json({
        success: true,
        geopoint
      })
    }

    // Build query based on filters
    let query = 'SELECT * FROM geopoints WHERE 1=1'
    const params: (string | number)[] = []

    if (bounds) {
      const [north, south, east, west] = bounds.split(',').map(Number)
      query += ' AND lat >= ? AND lat <= ? AND lng >= ? AND lng <= ?'
      params.push(south, north, west, east)
    }

    query += ' ORDER BY created_at DESC'

    // Execute query
    const stmt = db.prepare(query)
    const result = await stmt.bind(...params).all()

    // Transform the data
    const geopoints = (result.results || []).map((row: Record<string, unknown>) => {
      const point = {
        ...(row as unknown as D1Geopoint),
      }
      return point
    })

    return NextResponse.json({
      success: true,
      count: geopoints.length,
      geopoints
    })

  } catch (error) {
    console.error('Error fetching geopoints:', error)
    return NextResponse.json(
      { error: 'Failed to fetch geopoints' },
      { status: 500 }
    )
  }
} 