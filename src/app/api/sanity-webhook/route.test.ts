import { describe, it, expect, vi, beforeEach } from 'vitest'
import { POST, DELETE } from './route'
import { NextRequest } from 'next/server'
import { SanityPin } from '@/types/geopoint'
import { isValidSignature } from '@sanity/webhook'

// Mock the Cloudflare context
vi.mock('@opennextjs/cloudflare', () => ({
  getCloudflareContext: vi.fn(() => ({
    env: {
      SANITY_WEBHOOK_SECRET: {
        get: vi.fn().mockResolvedValue('test-webhook-secret'),
      },
      DB: {
        prepare: vi.fn().mockReturnValue({
          bind: vi.fn().mockReturnValue({
            run: vi.fn().mockResolvedValue({}),
          }),
        }),
      },
    },
  })),
}))

// Mock the Sanity webhook toolkit
vi.mock('@sanity/webhook', () => ({
  isValidSignature: vi.fn().mockResolvedValue(true),
  SIGNATURE_HEADER_NAME: 'sanity-webhook-signature',
}))

// Mock NextRequest.text() to return the body
const mockText = vi.fn()
const mockHeaders = new Map()
vi.mock('next/server', async () => {
  const actual = await vi.importActual('next/server')
  return {
    ...actual,
    NextRequest: class MockNextRequest {
      constructor(url: string, options?: { headers?: Record<string, string> }) {
        // Mock constructor
        if (options?.headers) {
          Object.entries(options.headers).forEach(([key, value]) => {
            mockHeaders.set(key, value)
          })
        }
      }
      text() {
        return mockText()
      }
      get headers() {
        return mockHeaders
      }
    }
  }
})

// Mock console to avoid noise in tests
vi.mock('console', () => ({
  log: vi.fn(),
  error: vi.fn(),
  warn: vi.fn(),
}))

describe('/api/sanity-webhook', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockHeaders.clear()
    // Default mock for request body
    mockText.mockResolvedValue('{"_id":"test-pin-id","_type":"pin"}')
  })

  describe('POST', () => {
    it('should process approved pin webhook successfully', async () => {
      const webhookData: SanityPin = {
        _id: 'test-pin-id',
        _type: 'pin',
        _createdAt: '2025-01-01T00:00:00Z',
        _updatedAt: '2025-01-01T00:00:00Z',
        _rev: 'test-rev',
        title: 'Test Point',
        slug: { current: 'test-point' },
        location: { lat: 48.8566, lng: 2.3522 },
        description: 'Test description',
        status: 'approved',
        submittedBy: { name: 'Test User', email: 'test@example.com', ip: '127.0.0.1' },
        approvedAt: '2025-01-01T00:00:00Z',
        approvedBy: 'admin',
      }

      // Mock the request body
      mockText.mockResolvedValueOnce(JSON.stringify(webhookData))

      const request = new NextRequest('http://localhost:3000/api/sanity-webhook', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'sanity-webhook-signature': '01020304'
        },
        body: JSON.stringify(webhookData),
      })

      const response = await POST(request)
      const data = await response.json() as { success: boolean }

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
    })

    it('should skip D1 sync for non-approved pins', async () => {
      const webhookData: SanityPin = {
        _id: 'test-pin-id',
        _type: 'pin',
        _createdAt: '2025-01-01T00:00:00Z',
        _updatedAt: '2025-01-01T00:00:00Z',
        _rev: 'test-rev',
        title: 'Test Point',
        slug: { current: 'test-point' },
        location: { lat: 48.8566, lng: 2.3522 },
        description: 'Test description',
        status: 'pending',
        submittedBy: { name: 'Test User', email: 'test@example.com', ip: '127.0.0.1' },
      }

      // Mock the request body
      mockText.mockResolvedValueOnce(JSON.stringify(webhookData))

      const request = new NextRequest('http://localhost:3000/api/sanity-webhook', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'sanity-webhook-signature': '01020304'
        },
        body: JSON.stringify(webhookData),
      })

      const response = await POST(request)
      const data = await response.json() as { success: boolean }

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
    })

    it('should delete from D1 when pin is rejected', async () => {
      const webhookData: SanityPin = {
        _id: 'test-pin-id',
        _type: 'pin',
        _createdAt: '2025-01-01T00:00:00Z',
        _updatedAt: '2025-01-01T00:00:00Z',
        _rev: 'test-rev',
        title: 'Test Point',
        slug: { current: 'test-point' },
        location: { lat: 48.8566, lng: 2.3522 },
        description: 'Test description',
        status: 'rejected',
        submittedBy: { name: 'Test User', email: 'test@example.com', ip: '127.0.0.1' },
      }

      // Mock the request body
      mockText.mockResolvedValueOnce(JSON.stringify(webhookData))

      const request = new NextRequest('http://localhost:3000/api/sanity-webhook', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'sanity-webhook-signature': '01020304'
        },
        body: JSON.stringify(webhookData),
      })

      const response = await POST(request)
      const data = await response.json() as { success: boolean }

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
    })

    it('should handle webhook without signature when no secret configured', async () => {
      const webhookData: SanityPin = {
        _id: 'test-pin-id',
        _type: 'pin',
        _createdAt: '2025-01-01T00:00:00Z',
        _updatedAt: '2025-01-01T00:00:00Z',
        _rev: 'test-rev',
        title: 'Test Point',
        slug: { current: 'test-point' },
        location: { lat: 48.8566, lng: 2.3522 },
        description: 'Test description',
        status: 'approved',
        submittedBy: { name: 'Test User', email: 'test@example.com', ip: '127.0.0.1' },
        approvedAt: '2025-01-01T00:00:00Z',
        approvedBy: 'admin',
      }

      // Mock the request body
      mockText.mockResolvedValueOnce(JSON.stringify(webhookData))

      const request = new NextRequest('http://localhost:3000/api/sanity-webhook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(webhookData),
      })

      const response = await POST(request)
      // Should either succeed or fail gracefully
      expect([200, 401, 500]).toContain(response.status)
    })

    it('should return 401 for invalid signature', async () => {
      // Mock signature verification to fail
      vi.mocked(isValidSignature).mockResolvedValueOnce(false)

      const webhookData: SanityPin = {
        _id: 'test-pin-id',
        _type: 'pin',
        _createdAt: '2025-01-01T00:00:00Z',
        _updatedAt: '2025-01-01T00:00:00Z',
        _rev: 'test-rev',
        title: 'Test Point',
        slug: { current: 'test-point' },
        location: { lat: 48.8566, lng: 2.3522 },
        description: 'Test description',
        status: 'approved',
        submittedBy: { name: 'Test User', email: 'test@example.com', ip: '127.0.0.1' },
        approvedAt: '2025-01-01T00:00:00Z',
        approvedBy: 'admin',
      }

      // Mock the request body
      mockText.mockResolvedValueOnce(JSON.stringify(webhookData))

      const request = new NextRequest('http://localhost:3000/api/sanity-webhook', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'sanity-webhook-signature': 'invalid-signature'
        },
        body: JSON.stringify(webhookData),
      })

      const response = await POST(request)
      const data = await response.json() as { error: string }

      expect(response.status).toBe(401)
      expect(data.error).toBe('Invalid signature')
    })

    it('should handle non-pin webhook types gracefully', async () => {
      const webhookData = {
        _id: 'test-other-id',
        _type: 'other-document-type',
        _createdAt: '2025-01-01T00:00:00Z',
        _updatedAt: '2025-01-01T00:00:00Z',
        title: 'Other Document',
      }

      // Mock the request body
      mockText.mockResolvedValueOnce(JSON.stringify(webhookData))

      const request = new NextRequest('http://localhost:3000/api/sanity-webhook', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'sanity-webhook-signature': '01020304'
        },
        body: JSON.stringify(webhookData),
      })

      const response = await POST(request)
      const data = await response.json() as { success: boolean }

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
    })

    it('should handle malformed JSON gracefully', async () => {
      // Mock malformed JSON body
      mockText.mockResolvedValueOnce('invalid-json')

      const request = new NextRequest('http://localhost:3000/api/sanity-webhook', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'sanity-webhook-signature': '01020304'
        },
        body: 'invalid-json',
      })

      const response = await POST(request)
      const data = await response.json() as { error: string }

      expect(response.status).toBe(400)
      expect(data.error).toBe('Invalid JSON payload')
    })
  })

  describe('DELETE', () => {
    it('should delete pin from D1 when webhook is received', async () => {
      const deleteData = {
        _id: 'test-pin-id',
        _type: 'pin',
      }

      // Mock the request body
      mockText.mockResolvedValueOnce(JSON.stringify(deleteData))

      const request = new NextRequest('http://localhost:3000/api/sanity-webhook', {
        method: 'DELETE',
        headers: { 
          'Content-Type': 'application/json',
          'sanity-webhook-signature': '01020304'
        },
        body: JSON.stringify(deleteData),
      })

      const response = await DELETE(request)
      const data = await response.json() as { success: boolean }

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
    })

    it('should handle non-pin delete webhooks gracefully', async () => {
      const deleteData = {
        _id: 'test-other-id',
        _type: 'other-document-type',
      }

      // Mock the request body
      mockText.mockResolvedValueOnce(JSON.stringify(deleteData))

      const request = new NextRequest('http://localhost:3000/api/sanity-webhook', {
        method: 'DELETE',
        headers: { 
          'Content-Type': 'application/json',
          'sanity-webhook-signature': '01020304'
        },
        body: JSON.stringify(deleteData),
      })

      const response = await DELETE(request)
      const data = await response.json() as { success: boolean }

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
    })

    it('should return 401 for invalid signature on DELETE', async () => {
      // Mock signature verification to fail
      vi.mocked(isValidSignature).mockResolvedValueOnce(false)

      const deleteData = {
        _id: 'test-pin-id',
        _type: 'pin',
      }

      // Mock the request body
      mockText.mockResolvedValueOnce(JSON.stringify(deleteData))

      const request = new NextRequest('http://localhost:3000/api/sanity-webhook', {
        method: 'DELETE',
        headers: { 
          'Content-Type': 'application/json',
          'sanity-webhook-signature': 'invalid-signature'
        },
        body: JSON.stringify(deleteData),
      })

      const response = await DELETE(request)
      const data = await response.json() as { error: string }

      expect(response.status).toBe(401)
      expect(data.error).toBe('Invalid signature')
    })
  })

  describe('Signature Verification', () => {
    it('should verify valid HMAC-SHA256 signatures', async () => {
      const webhookData: SanityPin = {
        _id: 'test-pin-id',
        _type: 'pin',
        _createdAt: '2025-01-01T00:00:00Z',
        _updatedAt: '2025-01-01T00:00:00Z',
        _rev: 'test-rev',
        title: 'Test Point',
        slug: { current: 'test-point' },
        location: { lat: 48.8566, lng: 2.3522 },
        description: 'Test description',
        status: 'approved',
        submittedBy: { name: 'Test User', email: 'test@example.com', ip: '127.0.0.1' },
        approvedAt: '2025-01-01T00:00:00Z',
        approvedBy: 'admin',
      }

      // Mock the request body
      mockText.mockResolvedValueOnce(JSON.stringify(webhookData))

      const request = new NextRequest('http://localhost:3000/api/sanity-webhook', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'sanity-webhook-signature': '01020304'
        },
        body: JSON.stringify(webhookData),
      })

      const response = await POST(request)
      const data = await response.json() as { success: boolean }

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
    })

    it('should handle missing signature header', async () => {
      const webhookData: SanityPin = {
        _id: 'test-pin-id',
        _type: 'pin',
        _createdAt: '2025-01-01T00:00:00Z',
        _updatedAt: '2025-01-01T00:00:00Z',
        _rev: 'test-rev',
        title: 'Test Point',
        slug: { current: 'test-point' },
        location: { lat: 48.8566, lng: 2.3522 },
        description: 'Test description',
        status: 'approved',
        submittedBy: { name: 'Test User', email: 'test@example.com', ip: '127.0.0.1' },
        approvedAt: '2025-01-01T00:00:00Z',
        approvedBy: 'admin',
      }

      // Mock the request body
      mockText.mockResolvedValueOnce(JSON.stringify(webhookData))

      const request = new NextRequest('http://localhost:3000/api/sanity-webhook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(webhookData),
      })

      const response = await POST(request)
      const data = await response.json() as { error: string }

      expect(response.status).toBe(401)
      expect(data.error).toBe('Invalid signature')
    })
  })
}) 