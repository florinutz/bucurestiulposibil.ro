import { NextRequest, NextResponse } from 'next/server'
import { getCloudflareContext } from '@opennextjs/cloudflare'
import { SanityPin, D1Pin } from '@/types/geopoint'
import { handleWebhookSignature } from '@/lib/webhookUtils'

export async function POST(request: NextRequest) {
  try {
    console.log('Request headers:', Object.fromEntries(request.headers.entries()))
    
    const { env } = getCloudflareContext()
    
    // Clone the request to preserve the body for later use
    const clonedRequest = request.clone()
    
    // Handle signature verification
    const signatureResult = await handleWebhookSignature(
      request, 
      () => env.SANITY_WEBHOOK_SECRET.get()
    )
    
    if (!signatureResult.success) {
      console.log('Signature verification failed:', signatureResult.error)
      return NextResponse.json(
        { error: signatureResult.error },
        { status: signatureResult.status }
      )
    }

    console.log('Signature verification passed')

    // Parse the body from the cloned request
    const bodyText = await clonedRequest.text()
    console.log('Raw request body:', bodyText)
    
    if (!bodyText) {
      console.error('Empty request body received')
      return NextResponse.json(
        { error: 'Empty request body' },
        { status: 400 }
      )
    }
    
    let body: SanityPin
    try {
      body = JSON.parse(bodyText) as SanityPin
      console.log('Parsed webhook payload:', JSON.stringify(body, null, 2))
    } catch (parseError) {
      console.error('JSON parse error:', parseError)
      console.error('Failed to parse body:', bodyText)
      return NextResponse.json(
        { error: 'Invalid JSON payload' },
        { status: 400 }
      )
    }

    // Handle different webhook events
    if (body._type === 'pin') {
      console.log(`Processing pin webhook for ID: ${body._id}`)
      await handlePinUpdate(body)
    } else {
      console.log(`Ignoring webhook for type: ${body._type}`)
    }

    console.log('=== WEBHOOK PROCESSING COMPLETE ===')
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Webhook error:', error)
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace')
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    )
  }
}

async function handlePinUpdate(sanityData: SanityPin) {
  // Only sync approved pins to D1
  if (sanityData.status !== 'approved') {
    console.log(`Pin ${sanityData._id} is not approved, skipping D1 sync`)
    
    // If it was previously approved but now rejected/pending, remove from D1
    if (sanityData.status === 'rejected' || sanityData.status === 'pending') {
      await deleteFromD1(sanityData._id)
    }
    return
  }

  // Convert Sanity data to D1 format
  const d1Data: D1Pin = {
    id: sanityData._id,
    title: sanityData.title,
    slug: sanityData.slug.current,
    lat: sanityData.location.lat,
    lng: sanityData.location.lng,
    description: sanityData.description || null,
    created_at: sanityData._createdAt,
    updated_at: sanityData._updatedAt,
    approved_at: sanityData.approvedAt || null,
    approved_by: sanityData.approvedBy || null,
  }

  await upsertToD1(d1Data)
}

async function upsertToD1(data: D1Pin) {
  try {
    const { env } = getCloudflareContext()
    const db = env.DB as D1Database
    
    if (!db) {
      throw new Error('D1 database not available')
    }

    // Use INSERT OR REPLACE to handle both create and update
    const stmt = db.prepare(`
      INSERT OR REPLACE INTO geopoints (
        id, title, slug, lat, lng, description,
        created_at, updated_at, approved_at, approved_by
      ) VALUES (
        ?, ?, ?, ?, ?, ?,
        ?, ?, ?, ?
      )
    `)

    await stmt.bind(
      data.id,
      data.title,
      data.slug,
      data.lat,
      data.lng,
      data.description || null,
      data.created_at,
      data.updated_at,
      data.approved_at || null,
      data.approved_by || null
    ).run()

    console.log(`Successfully synced pin ${data.id} to D1`)
  } catch (error) {
    console.error('Error syncing to D1:', error)
    throw error
  }
}

async function deleteFromD1(id: string) {
  try {
    const { env } = getCloudflareContext()
    const db = env.DB as D1Database
    
    if (!db) {
      throw new Error('D1 database not available')
    }

    const stmt = db.prepare('DELETE FROM geopoints WHERE id = ?')
    await stmt.bind(id).run()

    console.log(`Successfully deleted pin ${id} from D1`)
  } catch (error) {
    console.error('Error deleting from D1:', error)
    throw error
  }
}

// Handle DELETE webhooks (when documents are deleted from Sanity)
export async function DELETE(request: NextRequest) {
  try {
    console.log('=== SANITY DELETE WEBHOOK DEBUG ===')
    console.log('Request URL:', request.url)
    console.log('Request method:', request.method)
    console.log('Request headers:', Object.fromEntries(request.headers.entries()))
    
    const { env } = getCloudflareContext()
    
    // Clone the request to preserve the body for later use
    const clonedRequest = request.clone()
    
    // Handle signature verification
    const signatureResult = await handleWebhookSignature(
      request, 
      () => env.SANITY_WEBHOOK_SECRET.get()
    )
    
    if (!signatureResult.success) {
      console.log('Signature verification failed:', signatureResult.error)
      return NextResponse.json(
        { error: signatureResult.error },
        { status: signatureResult.status }
      )
    }
    
    console.log('Signature verification passed')

    // Parse the body from the cloned request
    const bodyText = await clonedRequest.text()
    console.log('Raw DELETE request body:', bodyText)
    
    if (!bodyText) {
      console.error('Empty DELETE request body received')
      return NextResponse.json(
        { error: 'Empty request body' },
        { status: 400 }
      )
    }
    
    let body: { _type?: string; _id?: string }
    try {
      body = JSON.parse(bodyText)
      console.log('Parsed DELETE webhook payload:', JSON.stringify(body, null, 2))
    } catch (parseError) {
      console.error('JSON parse error for DELETE:', parseError)
      console.error('Failed to parse DELETE body:', bodyText)
      return NextResponse.json(
        { error: 'Invalid JSON payload' },
        { status: 400 }
      )
    }
    
    if (body._type === 'pin' && body._id) {
      console.log(`Processing pin DELETE webhook for ID: ${body._id}`)
      await deleteFromD1(body._id)
    } else {
      console.log(`Ignoring DELETE webhook for type: ${body._type}`)
    }

    console.log('=== DELETE WEBHOOK PROCESSING COMPLETE ===')
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Delete webhook error:', error)
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace')
    return NextResponse.json(
      { error: 'Delete webhook processing failed' },
      { status: 500 }
    )
  }
} 