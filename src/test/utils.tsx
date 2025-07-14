import { render, RenderOptions } from '@testing-library/react'
import { ReactElement } from 'react'
import { vi } from 'vitest'

// Custom render function with providers
const customRender = (
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
) => render(ui, { ...options })

// Test data helpers
export const createMockGeopoint = (overrides = {}) => ({
  id: 'test-point-1',
  title: 'Test Point',
  lat: 48.8566,
  lng: 2.3522,
  description: 'Test description',
  status: 'approved' as const,
  created_at: '2025-01-01T00:00:00Z',
  updated_at: '2025-01-01T00:00:00Z',
  approved_at: '2025-01-01T00:00:00Z',
  approved_by: 'test-user',
  ...overrides,
})

export const createMockGeopointProposal = (overrides = {}) => ({
  title: 'Test Point',
  location: { lat: 48.8566, lng: 2.3522 },
  description: 'Test description',
  submittedBy: { name: 'Test User', email: 'test@example.com' },
  ...overrides,
})

export const createMockSanityGeopoint = (overrides = {}) => ({
  _id: 'test-document-id',
  _type: 'geopoint',
  _createdAt: '2025-01-01T00:00:00Z',
  _updatedAt: '2025-01-01T00:00:00Z',
  title: 'Test Point',
  slug: { current: 'test-point', _type: 'slug' },
  location: { _type: 'geopoint', lat: 48.8566, lng: 2.3522 },
  description: 'Test description',
  status: 'approved' as const,
  submittedBy: { name: 'Test User', email: 'test@example.com', ip: '127.0.0.1' },
  approvedAt: '2025-01-01T00:00:00Z',
  approvedBy: 'test-user',
  ...overrides,
})

// Mock Cloudflare environment
export const createMockCloudflareEnv = (overrides = {}) => ({
  DB: {
    prepare: vi.fn().mockReturnValue({
      bind: vi.fn().mockReturnValue({
        run: vi.fn().mockResolvedValue({}),
      }),
    }),
  },
  SANITY_API_TOKEN: {
    get: vi.fn().mockResolvedValue('test-token'),
  },
  SANITY_WEBHOOK_SECRET: {
    get: vi.fn().mockResolvedValue('test-secret'),
  },
  ...overrides,
})

// Export everything
export * from '@testing-library/react'
export { customRender as render } 