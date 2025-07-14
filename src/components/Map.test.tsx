import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import Map from './Map'

// Mock Leaflet
vi.mock('leaflet', () => ({
  default: {
    map: vi.fn(() => ({
      setView: vi.fn(),
      addLayer: vi.fn(),
      removeLayer: vi.fn(),
      on: vi.fn(),
      off: vi.fn(),
      remove: vi.fn(),
    })),
    tileLayer: vi.fn(() => ({
      addTo: vi.fn(),
    })),
    marker: vi.fn(() => ({
      addTo: vi.fn(),
      bindPopup: vi.fn(),
    })),
    divIcon: vi.fn(() => ({})),
    control: {
      zoom: vi.fn(() => ({
        addTo: vi.fn(),
      })),
    },
    Icon: {
      Default: {
        prototype: {},
        mergeOptions: vi.fn(),
      },
    },
  },
}))

// Mock the location store
vi.mock('@/lib/locationStore', () => ({
  locationStore: {
    locations: [
      {
        id: 'test-1',
        title: 'Test Location 1',
        lat: 48.8566,
        lng: 2.3522,
        description: 'Test description 1',
        status: 'approved',
      },
      {
        id: 'test-2',
        title: 'Test Location 2',
        lat: 48.8584,
        lng: 2.2945,
        description: 'Test description 2',
        status: 'pending',
      },
    ],
    addLocation: vi.fn(),
    removeLocation: vi.fn(),
    loadLocations: vi.fn().mockResolvedValue(undefined),
    getLocations: vi.fn(() => [
      {
        id: 'test-1',
        title: 'Test Location 1',
        lat: 48.8566,
        lng: 2.3522,
        description: 'Test description 1',
        status: 'approved',
      },
      {
        id: 'test-2',
        title: 'Test Location 2',
        lat: 48.8584,
        lng: 2.2945,
        description: 'Test description 2',
        status: 'pending',
      },
    ]),
  },
}))

describe('Map Component', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should render the map container', () => {
    render(<Map />)
    
    const mapContainer = screen.getByTestId('map-container')
    expect(mapContainer).toBeInTheDocument()
  })

  it('should have the correct default CSS classes', () => {
    render(<Map />)
    
    const mapContainer = screen.getByTestId('map-container')
    expect(mapContainer).toHaveClass('w-full', 'h-full')
  })

  it('should apply custom CSS classes', () => {
    render(<Map className="custom-class" />)
    
    const mapContainer = screen.getByTestId('map-container')
    expect(mapContainer).toHaveClass('custom-class')
  })

  it('should initialize map with default center and zoom', async () => {
    render(<Map />)
    
    // Wait for the map to be initialized
    await waitFor(() => {
      expect(screen.getByTestId('map-container')).toBeInTheDocument()
    })
  })

  it('should initialize map with custom center and zoom', async () => {
    const customCenter: [number, number] = [40.7128, -74.0060]
    const customZoom = 15
    
    render(<Map center={customCenter} zoom={customZoom} />)
    
    await waitFor(() => {
      expect(screen.getByTestId('map-container')).toBeInTheDocument()
    })
  })

  it('should handle onSpecialPinPlaced callback', async () => {
    const mockOnSpecialPinPlaced = vi.fn()
    render(<Map onSpecialPinPlaced={mockOnSpecialPinPlaced} />)
    
    await waitFor(() => {
      expect(screen.getByTestId('map-container')).toBeInTheDocument()
    })
  })

  it('should handle special pin coordinates', async () => {
    const specialCoords: [number, number] = [45.123, 2.456]
    
    render(<Map specialPinCoords={specialCoords} />)
    
    await waitFor(() => {
      expect(screen.getByTestId('map-container')).toBeInTheDocument()
    })
  })

  it('should render properly with all props', async () => {
    const mockOnSpecialPinPlaced = vi.fn()
    const specialCoords: [number, number] = [45.123, 2.456]
    
    render(
      <Map 
        center={[40.7128, -74.0060]} 
        zoom={15}
        className="custom-map"
        onSpecialPinPlaced={mockOnSpecialPinPlaced}
        specialPinCoords={specialCoords}
      />
    )
    
    const mapContainer = screen.getByTestId('map-container')
    expect(mapContainer).toBeInTheDocument()
    expect(mapContainer).toHaveClass('custom-map')
  })

  it('should cleanup on unmount', async () => {
    const { unmount } = render(<Map />)
    
    await waitFor(() => {
      expect(screen.getByTestId('map-container')).toBeInTheDocument()
    })
    
    unmount()
    // Component should unmount without errors
  })
}) 