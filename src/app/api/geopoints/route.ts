import { NextRequest, NextResponse } from 'next/server'
import { getCloudflareContext } from '@opennextjs/cloudflare'
import { D1Pin } from '@/types/geopoint'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const bounds = searchParams.get('bounds') // "north,south,east,west"
    const id = searchParams.get('id') // For getting a specific pin

    const { env } = await getCloudflareContext()
    const db = env.DB as D1Database
    
    if (!db) {
      return NextResponse.json(
        { error: 'Database not available' },
        { status: 503 }
      )
    }

    // If ID is provided, return specific pin
    if (id) {
      const stmt = db.prepare('SELECT * FROM geopoints WHERE id = ?')
      const result = await stmt.bind(id).first()

      if (!result) {
        return NextResponse.json(
          { error: 'Pin not found' },
          { status: 404 }
        )
      }

      const pin = {
        ...(result as unknown as D1Pin),
      }

      return NextResponse.json({
        success: true,
        pin
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
    const pins = (result.results || []).map((row: Record<string, unknown>) => {
      const point = {
        ...(row as unknown as D1Pin),
      }
      return point
    })

    return NextResponse.json({
      success: true,
      count: pins.length,
      pins
    })

  } catch (error) {
    console.error('Error fetching pins:', error)
    return NextResponse.json(
      { error: 'Failed to fetch pins' },
      { status: 500 }
    )
  }
} 