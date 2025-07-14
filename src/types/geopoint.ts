// Sanity pin data structure
export interface SanityPin {
  _id: string
  _type: 'pin'
  _createdAt: string
  _updatedAt: string
  _rev: string
  title: string
  slug: {
    current: string
  }
  location: {
    lat: number
    lng: number
  }
  description?: string
  status: 'pending' | 'approved' | 'rejected' | 'draft'
  submittedBy?: {
    name?: string
    email?: string
    ip?: string
  }
  moderationNotes?: string
  approvedAt?: string
  approvedBy?: string
  publishedAt?: string
}

// D1 database structure (flattened for SQL)
export interface D1Geopoint {
  id: string // maps to _id
  title: string
  slug: string
  lat: number
  lng: number
  description?: string | null
  created_at: string
  updated_at: string
  approved_at?: string | null
  approved_by?: string | null
}

// Form data for point proposals
export interface PinProposal {
  title: string
  location: {
    lat: number
    lng: number
  }
  description?: string
  submittedBy: {
    name?: string
    email?: string
  }
}

// Webhook payload from Sanity
export interface SanityWebhookPayload {
  _id: string
  _type: string
  _createdAt: string
  _updatedAt: string
  _rev: string
  [key: string]: unknown
}

// Webhook event types
export type SanityWebhookEvent = 'create' | 'update' | 'delete'

export interface SanityWebhookData {
  _type: string
  _id: string
  eventType: SanityWebhookEvent
  data: SanityPin | null // null for delete events
} 