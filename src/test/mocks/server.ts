import { setupServer } from 'msw/node'
import { http, HttpResponse } from 'msw'

// Create handlers for your API endpoints
export const handlers = [
  // Mock Sanity API
  http.post('https://test-project.api.sanity.io/v2025-01-12/data/mutate/test', () => {
    return HttpResponse.json({
      transactionId: 'test-transaction-id',
      results: [
        {
          id: 'test-document-id',
          operation: 'create',
        },
      ],
    })
  }),

  // Mock your API endpoints
  http.post('/api/propose-point', () => {
    return HttpResponse.json({
      success: true,
      id: 'test-point-id',
      message: 'Point proposal submitted successfully and is pending moderation',
    })
  }),

  http.get('/api/geopoints', () => {
    return HttpResponse.json({
      geopoints: [
        {
          id: 'test-point-1',
          title: 'Test Point 1',
          lat: 48.8566,
          lng: 2.3522,
          description: 'Test description',
        },
      ],
    })
  }),
]

export const server = setupServer(...handlers) 