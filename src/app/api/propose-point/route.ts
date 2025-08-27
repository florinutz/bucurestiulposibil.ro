import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@sanity/client'
import { PinProposal } from '@/types/geopoint'
import { getCloudflareContext } from '@opennextjs/cloudflare'

export async function POST(request: NextRequest) {
  try {
    const { env } = getCloudflareContext()
    
    // Support both Secrets Store bindings and plain string env (typegen variations)
    const tokenBinding = (env as unknown as Record<string, unknown>).SANITY_API_TOKEN as unknown;
    const resolvedToken = typeof tokenBinding === 'string'
      ? tokenBinding
      : (tokenBinding && typeof (tokenBinding as { get?: () => Promise<string> }).get === 'function'
          ? await (tokenBinding as { get: () => Promise<string> }).get()
          : process.env.SANITY_API_TOKEN);

    const sanityClient = createClient({
      projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID!,
      dataset: process.env.NEXT_PUBLIC_SANITY_DATASET!,
      apiVersion: '2025-01-12',
      token: resolvedToken!,
      useCdn: false,
    })

    const body = await request.json() as PinProposal
    
    // Basic validation
    if (!body.title || !body.location) {
      return NextResponse.json(
        { error: 'Title and location are required' },
        { status: 400 }
      )
    }

    // Get client IP for tracking
    const clientIP = request.headers.get('x-forwarded-for') || 
                    request.headers.get('x-real-ip') || 
                    'unknown'

    // Create slug from title
    const slug = body.title
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim()

    // Create the document in Sanity
    const sanityDoc = {
      _type: 'pin',
      title: body.title,
      slug: {
        current: slug,
        _type: 'slug'
      },
      location: {
        _type: 'geopoint',
        lat: body.location.lat,
        lng: body.location.lng
      },
      description: body.description || null,
      status: 'pending', // Always pending for user submissions
      submittedBy: {
        name: body.submittedBy.name || null,
        email: body.submittedBy.email || null,
        ip: clientIP,
      },
      publishedAt: new Date().toISOString(),
    }

    // Create the document
    const result = await sanityClient.create(sanityDoc)

    console.log('Point proposal created in Sanity:', result._id)

    return NextResponse.json({
      success: true,
      id: result._id,
      message: 'Point proposal submitted successfully and is pending moderation'
    })

  } catch (error) {
    console.error('Error creating point proposal:', error)
    
    // Handle specific Sanity errors
    if (error instanceof Error) {
      if (error.message.includes('slug')) {
        return NextResponse.json(
          { error: 'A location with this name already exists' },
          { status: 409 }
        )
      }
      
      if (error.message.includes('Unauthorized')) {
        return NextResponse.json(
          { error: 'Service temporarily unavailable' },
          { status: 503 }
        )
      }
    }

    return NextResponse.json(
      { error: 'Failed to submit point proposal' },
      { status: 500 }
    )
  }
}

// GET endpoint to check if a point already exists (optional)
export async function GET(request: NextRequest) {
  try {
    const { env } = await getCloudflareContext()
    
    // Create Sanity client for reading data with Secrets Store binding
    const sanityClient = createClient({
      projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID!,
      dataset: process.env.NEXT_PUBLIC_SANITY_DATASET!,
      apiVersion: '2025-01-12',
      token: await env.SANITY_API_TOKEN.get(),
      useCdn: false,
    })

    const { searchParams } = new URL(request.url)
    const title = searchParams.get('title')
    const lat = searchParams.get('lat')
    const lng = searchParams.get('lng')

    if (!title && (!lat || !lng)) {
      return NextResponse.json(
        { error: 'Either title or coordinates are required' },
        { status: 400 }
      )
    }

    let query = ''
    let params: Record<string, string | number> = {}

    if (title) {
      query = `*[_type == "pin" && title match $title][0]`
      params.title = `*${title}*`
    } else if (lat && lng) {
      // Check for points within ~100m radius (rough approximation)
      const latFloat = parseFloat(lat)
      const lngFloat = parseFloat(lng)
      const tolerance = 0.001 // roughly 100m
      
      query = `*[_type == "pin" && 
        location.lat >= $minLat && location.lat <= $maxLat &&
        location.lng >= $minLng && location.lng <= $maxLng][0]`
      
      params = {
        minLat: latFloat - tolerance,
        maxLat: latFloat + tolerance,
        minLng: lngFloat - tolerance,
        maxLng: lngFloat + tolerance,
      }
    }

    const existing = await sanityClient.fetch(query, params)

    return NextResponse.json({
      exists: !!existing,
      point: existing ? {
        id: existing._id,
        title: existing.title,
        status: existing.status
      } : null
    })

  } catch (error) {
    console.error('Error checking existing point:', error)
    return NextResponse.json(
      { error: 'Failed to check existing points' },
      { status: 500 }
    )
  }
} 