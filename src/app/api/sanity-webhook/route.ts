import { NextRequest, NextResponse } from 'next/server'
import { getCloudflareContext } from '@opennextjs/cloudflare'
import { SanityGeopoint, D1Geopoint } from '@/types/geopoint'

export async function POST(request: NextRequest) {
  try {
    const { env } = await getCloudflareContext()
    
    // Get webhook secret from Secrets Store binding
    const WEBHOOK_SECRET = await env.SANITY_WEBHOOK_SECRET.get()

    // Verify webhook signature (optional but recommended)
    const signature = request.headers.get('sanity-webhook-signature')
    if (WEBHOOK_SECRET && signature) {
      // Add signature verification logic here if needed
      // This is a simplified example - in production, use proper HMAC verification
    }

    const body = await request.json() as SanityGeopoint
    
    // Log the webhook payload for debugging
    console.log('Sanity webhook received:', JSON.stringify(body, null, 2))

    // Handle different webhook events
    if (body._type === 'geopoint') {
      await handleGeopointUpdate(body)
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Webhook error:', error)
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    )
  }
}

async function handleGeopointUpdate(sanityData: SanityGeopoint) {
  // Only sync approved geopoints to D1
  if (sanityData.status !== 'approved') {
    console.log(`Geopoint ${sanityData._id} is not approved, skipping D1 sync`)
    
    // If it was previously approved but now rejected/pending, remove from D1
    if (sanityData.status === 'rejected' || sanityData.status === 'pending') {
      await deleteFromD1(sanityData._id)
    }
    return
  }

  // Convert Sanity data to D1 format
  const d1Data: D1Geopoint = {
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

async function upsertToD1(data: D1Geopoint) {
  try {
    const { env } = await getCloudflareContext()
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

    console.log(`Successfully synced geopoint ${data.id} to D1`)
  } catch (error) {
    console.error('Error syncing to D1:', error)
    throw error
  }
}

async function deleteFromD1(id: string) {
  try {
    const { env } = await getCloudflareContext()
    const db = env.DB as D1Database
    
    if (!db) {
      throw new Error('D1 database not available')
    }

    const stmt = db.prepare('DELETE FROM geopoints WHERE id = ?')
    await stmt.bind(id).run()

    console.log(`Successfully deleted geopoint ${id} from D1`)
  } catch (error) {
    console.error('Error deleting from D1:', error)
    throw error
  }
}

// Handle DELETE webhooks (when documents are deleted from Sanity)
export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json() as { _type?: string; _id?: string }
    
    if (body._type === 'geopoint' && body._id) {
      await deleteFromD1(body._id)
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Delete webhook error:', error)
    return NextResponse.json(
      { error: 'Delete webhook processing failed' },
      { status: 500 }
    )
  }
} 