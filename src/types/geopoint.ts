// Map mode type
export type MapMode = 'proposal' | 'voting';

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
export interface D1Pin {
  id: string // maps to _id
  title: string
  slug: string
  lat: number
  lng: number
  description?: string | null
  submitted_by_name?: string | null
  submitted_by_email?: string | null
  submitted_by_ip?: string | null
  created_at: string
  updated_at: string
  approved_at?: string | null
  approved_by?: string | null
  is_votable: number // SQLite boolean as number (0 or 1)
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

// Browser fingerprint for voting fraud prevention
export interface BrowserFingerprint {
  userAgent: string
  screenResolution: string
  timezone: string
  language: string
  platform: string
  sessionId: string
  additionalEntropy: string
}

// Vote record in D1 database
export interface Vote {
  id: string
  geopoint_id: string
  voted_at: string
  browser_fingerprint: string
  ip_address?: string | null
  user_agent?: string | null
  screen_resolution?: string | null
  timezone?: string | null
  session_id?: string | null
  created_at: string
}

// Extended location interface for voting
export interface VotableLocation {
  id: string
  title: string
  description: string
  lat: number
  lng: number
  status: 'approved'
  createdAt: Date
  submittedByName?: string
  isVotable: boolean
  voteCount: number
  userHasVoted?: boolean
}

// Frontend interface for regular locations (extends for backward compatibility)
export interface Location {
  id: string
  title: string
  description: string
  lat: number
  lng: number
  status: 'approved'
  createdAt: Date
  submittedByName?: string
}

// API request/response interfaces for voting
export interface VoteRequest {
  geopointId: string
  browserFingerprint: BrowserFingerprint
}

export interface VoteResponse {
  success: boolean
  voteId: string
  newVoteCount: number
}

export interface UserVotesResponse {
  votedPinIds: string[]
}

export interface VotingGeopointsResponse {
  locations: VotableLocation[]
} 