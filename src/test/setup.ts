import '@testing-library/jest-dom'
import { beforeAll, afterEach, afterAll, vi } from 'vitest'
import { server } from './mocks/server'

// Mock Cloudflare Workers environment
Object.defineProperty(global, 'crypto', {
  value: crypto,
  writable: true,
})

// Mock Cloudflare context
;(global as { getCloudflareContext?: () => Promise<{ env: Record<string, unknown> }> }).getCloudflareContext = vi.fn().mockResolvedValue({
  env: {
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
  },
})

// Mock Next.js Request/Response
;(global as { Request?: typeof Request }).Request = Request
;(global as { Response?: typeof Response }).Response = Response

// Setup MSW for API mocking
beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))
afterEach(() => server.resetHandlers())
afterAll(() => server.close())

// Mock console methods in tests
global.console = {
  ...console,
  log: vi.fn(),
  error: vi.fn(),
  warn: vi.fn(),
  info: vi.fn(),
  debug: vi.fn(),
} 
