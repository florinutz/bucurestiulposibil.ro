# Testing Setup

This project uses **Vitest** as the primary testing framework, along with **Testing Library** for React component testing and **MSW** for API mocking.

## Quick Start

```bash
# Run tests in watch mode
npm test

# Run tests with UI
npm run test:ui

# Run tests once
npm run test:run

# Run tests with coverage
npm run test:coverage
```

## Testing Stack

- **Vitest**: Fast test runner with native TypeScript support
- **@testing-library/react**: React component testing utilities
- **@testing-library/jest-dom**: Custom Jest matchers for DOM testing
- **@testing-library/user-event**: User interaction simulation
- **MSW**: API mocking for integration tests

## Test Structure

```
src/
├── test/
│   ├── setup.ts          # Global test setup
│   ├── utils.tsx         # Test utilities and helpers
│   ├── mocks/
│   │   └── server.ts     # MSW server setup
│   └── README.md         # This file
├── app/
│   └── api/
│       └── propose-point/
│           └── route.test.ts  # API route tests
└── components/
    └── Map.test.tsx      # Component tests
```

## Writing Tests

### API Route Tests

```typescript
import { describe, it, expect, vi } from 'vitest'
import { POST } from './route'
import { NextRequest } from 'next/server'

// Mock dependencies
vi.mock('@opennextjs/cloudflare', () => ({
  getCloudflareContext: vi.fn().mockResolvedValue({
    env: { /* mock env */ }
  }),
}))

describe('/api/propose-point', () => {
  it('should create a new point proposal', async () => {
    const request = new NextRequest('http://localhost:3000/api/propose-point', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ /* test data */ }),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
  })
})
```

### Component Tests

```typescript
import { describe, it, expect } from 'vitest'
import { render, screen } from '@/test/utils'
import Map from './Map'

// Mock external dependencies
vi.mock('leaflet', () => ({
  default: { /* mock Leaflet */ }
}))

describe('Map Component', () => {
  it('should render the map container', () => {
    render(<Map />)
    expect(screen.getByTestId('map-container')).toBeInTheDocument()
  })
})
```

### Integration Tests

```typescript
import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent } from '@/test/utils'
import { rest } from 'msw'
import { server } from '@/test/mocks/server'

describe('Map Integration', () => {
  it('should load and display locations', async () => {
    // Mock API response
    server.use(
      rest.get('/api/geopoints', (req, res, ctx) => {
        return res(ctx.json({ geopoints: [/* test data */] }))
      })
    )

    render(<Map />)
    
    // Wait for data to load
    await screen.findByText('Test Location')
    expect(screen.getByText('Test Location')).toBeInTheDocument()
  })
})
```

## Test Utilities

### Mock Data Helpers

```typescript
import { createMockGeopoint, createMockGeopointProposal } from '@/test/utils'

// Create test data with defaults
const geopoint = createMockGeopoint()

// Override specific fields
const customGeopoint = createMockGeopoint({
  title: 'Custom Title',
  status: 'pending'
})
```

### Cloudflare Environment Mocking

```typescript
import { createMockCloudflareEnv } from '@/test/utils'

const mockEnv = createMockCloudflareEnv({
  DB: {
    prepare: vi.fn().mockReturnValue({
      bind: vi.fn().mockReturnValue({
        run: vi.fn().mockResolvedValue({ rows: [] })
      })
    })
  }
})
```

## Best Practices

1. **Test Structure**: Use `describe` blocks to group related tests
2. **Test Names**: Use descriptive test names that explain the behavior
3. **Mocking**: Mock external dependencies (APIs, libraries) to isolate units
4. **Assertions**: Test one thing per test and use specific assertions
5. **Setup/Teardown**: Use `beforeEach`/`afterEach` for common setup
6. **Coverage**: Aim for high coverage but focus on critical paths

## Configuration

The testing setup is configured in:
- `vitest.config.ts`: Main Vitest configuration
- `src/test/setup.ts`: Global test setup and mocks
- `src/test/mocks/server.ts`: MSW server for API mocking

## Debugging Tests

```bash
# Run specific test file
npm test src/components/Map.test.tsx

# Run tests with verbose output
npm test -- --reporter=verbose

# Debug failing tests
npm test -- --reporter=verbose --no-coverage
```

## Coverage

Coverage reports are generated in the `coverage/` directory. Open `coverage/index.html` to view detailed coverage information. 