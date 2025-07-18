import { NextRequest, NextResponse } from 'next/server'
import { getCloudflareContext } from '@opennextjs/cloudflare'
import { SanityPin, D1Pin } from '@/types/geopoint'
import { handleWebhookSignature } from '@/lib/webhookUtils'

export async function POST(request: NextRequest) {
  try {
    const { env } = await getCloudflareContext()
    
    // Handle signature verification
    const signatureResult = await handleWebhookSignature(
      request, 
      () => env.SANITY_WEBHOOK_SECRET.get()
    )
    
    if (!signatureResult.success) {
      return NextResponse.json(
        { error: signatureResult.error },
        { status: signatureResult.status }
      )
    }

    // Parse the body after verification
    const body = await request.json() as SanityPin
    
    // Log the webhook payload for debugging
    console.log('Sanity webhook received:', JSON.stringify(body, null, 2))

    // Handle different webhook events
    if (body._type === 'pin') {
      await handlePinUpdate(body)
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

    console.log(`Successfully synced pin ${data.id} to D1`)
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

    console.log(`Successfully deleted pin ${id} from D1`)
  } catch (error) {
    console.error('Error deleting from D1:', error)
    throw error
  }
}

// Handle DELETE webhooks (when documents are deleted from Sanity)
export async function DELETE(request: NextRequest) {
  try {
    const { env } = await getCloudflareContext()
    
    // Handle signature verification
    const signatureResult = await handleWebhookSignature(
      request, 
      () => env.SANITY_WEBHOOK_SECRET.get()
    )
    
    if (!signatureResult.success) {
      return NextResponse.json(
        { error: signatureResult.error },
        { status: signatureResult.status }
      )
    }

    const body = await request.json() as { _type?: string; _id?: string }
    
    if (body._type === 'pin' && body._id) {
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