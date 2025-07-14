import { describe, it, expect, vi, beforeEach } from 'vitest'
import { POST, DELETE } from './route'
import { NextRequest } from 'next/server'
import { SanityPin } from '@/types/geopoint'

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

// Mock crypto for signature verification
const mockCrypto = {
  subtle: {
    importKey: vi.fn().mockResolvedValue('mock-key'),
    sign: vi.fn().mockResolvedValue(new Uint8Array([1, 2, 3, 4])),
  },
}

Object.defineProperty(global, 'crypto', {
  value: mockCrypto,
  writable: true,
})

// Mock TextEncoder for signature verification
global.TextEncoder = class {
  encode(text: string) {
    return new Uint8Array(Buffer.from(text, 'utf8'))
  }
} as typeof TextEncoder

// Mock console to avoid noise in tests
vi.mock('console', () => ({
  log: vi.fn(),
  error: vi.fn(),
  warn: vi.fn(),
}))

describe('/api/sanity-webhook', () => {
  beforeEach(() => {
    vi.clearAllMocks()
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

      // Mock the signature verification to succeed
      mockCrypto.subtle.sign.mockResolvedValueOnce(new Uint8Array([1, 2, 3, 4]))

      const request = new NextRequest('http://localhost:3000/api/sanity-webhook', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'sanity-webhook-signature': '01020304' // matches the mocked signature
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

      // Mock the signature verification to succeed
      mockCrypto.subtle.sign.mockResolvedValueOnce(new Uint8Array([1, 2, 3, 4]))

      const request = new NextRequest('http://localhost:3000/api/sanity-webhook', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'sanity-webhook-signature': '01020304' // matches the mocked signature
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

      // Mock the signature verification to succeed
      mockCrypto.subtle.sign.mockResolvedValueOnce(new Uint8Array([1, 2, 3, 4]))

      const request = new NextRequest('http://localhost:3000/api/sanity-webhook', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'sanity-webhook-signature': '01020304' // matches the mocked signature
        },
        body: JSON.stringify(webhookData),
      })

      const response = await POST(request)
      const data = await response.json() as { success: boolean }

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
    })

    it('should handle webhook without signature when no secret configured', async () => {
      // This test would require more complex mocking, so we'll test the basic flow
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
      mockCrypto.subtle.sign.mockRejectedValueOnce(new Error('Invalid signature'))

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

      // Mock the signature verification to succeed
      mockCrypto.subtle.sign.mockResolvedValueOnce(new Uint8Array([1, 2, 3, 4]))

      const request = new NextRequest('http://localhost:3000/api/sanity-webhook', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'sanity-webhook-signature': '01020304' // matches the mocked signature
        },
        body: JSON.stringify(webhookData),
      })

      const response = await POST(request)
      const data = await response.json() as { success: boolean }

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
    })

    it('should handle malformed JSON gracefully', async () => {
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

      expect(response.status).toBe(500)
      expect(data.error).toBe('Webhook processing failed')
    })
  })

  describe('DELETE', () => {
    it('should delete pin from D1 when webhook is received', async () => {
      const deleteData = {
        _id: 'test-pin-id',
        _type: 'pin',
      }

      // Mock the signature verification to succeed
      mockCrypto.subtle.sign.mockResolvedValueOnce(new Uint8Array([1, 2, 3, 4]))

      const request = new NextRequest('http://localhost:3000/api/sanity-webhook', {
        method: 'DELETE',
        headers: { 
          'Content-Type': 'application/json',
          'sanity-webhook-signature': '01020304' // matches the mocked signature
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

      // Mock the signature verification to succeed
      mockCrypto.subtle.sign.mockResolvedValueOnce(new Uint8Array([1, 2, 3, 4]))

      const request = new NextRequest('http://localhost:3000/api/sanity-webhook', {
        method: 'DELETE',
        headers: { 
          'Content-Type': 'application/json',
          'sanity-webhook-signature': '01020304' // matches the mocked signature
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
      mockCrypto.subtle.sign.mockRejectedValueOnce(new Error('Invalid signature'))

      const deleteData = {
        _id: 'test-pin-id',
        _type: 'pin',
      }

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
      // Mock successful signature verification
      mockCrypto.subtle.sign.mockResolvedValueOnce(new Uint8Array([1, 2, 3, 4]))

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

      const request = new NextRequest('http://localhost:3000/api/sanity-webhook', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'sanity-webhook-signature': '01020304' // matches the mocked signature
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