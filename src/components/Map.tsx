'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { locationStore } from '../lib/locationStore';

interface MapProps {
  center?: [number, number];
  zoom?: number;
  className?: string;
  onSpecialPinPlaced?: (lat: number, lng: number) => void;
  specialPinCoords?: [number, number] | null;
}

export default function Map({ 
  center = [44.4268, 26.1025], // Bucharest center coordinates
  zoom = 12,
  className = "w-full h-full",
  onSpecialPinPlaced,
  specialPinCoords
}: MapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const specialPinRef = useRef<L.Marker | null>(null);
  const locationMarkersRef = useRef<L.Marker[]>([]);
  const addedLocationIdsRef = useRef<Set<string>>(new Set());
  const onSpecialPinPlacedRef = useRef(onSpecialPinPlaced);
  const [isClient, setIsClient] = useState(false);

  // Ensure we're on the client side
  useEffect(() => {
    setIsClient(true);
  }, []);

  // Update the callback ref when it changes
  useEffect(() => {
    onSpecialPinPlacedRef.current = onSpecialPinPlaced;
  }, [onSpecialPinPlaced]);

  // Initialize map only once
  useEffect(() => {
    if (!isClient || !mapRef.current || mapInstanceRef.current) return;

    console.log('Starting map initialization...');

    const initMap = async () => {
      try {
        // Import Leaflet
        const { default: L } = await import('leaflet');
        console.log('Leaflet imported successfully');

        // Fix for default markers
        delete (L.Icon.Default.prototype as unknown as Record<string, unknown>)._getIconUrl;
        L.Icon.Default.mergeOptions({
          iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
          iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
          shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
        });

        // Create map with Bucharest bounds
        if (!mapRef.current) return;
        const map = L.map(mapRef.current, { 
          zoomControl: false,
          minZoom: 11,
          maxZoom: 17,
          maxBounds: [
            [44.330819, 25.933960], // Southwest corner (Bucharest bounds, bottom left)
            [44.552407, 26.258057]  // Northeast corner (Bucharest bounds, top right)
          ],
          maxBoundsViscosity: 1.0 // Hard limit to bounds
        }).setView(center, zoom);
        mapInstanceRef.current = map;
        console.log('Map created with Bucharest bounds');

        // Add zoom control to bottom right
        L.control.zoom({ position: 'bottomright' }).addTo(map);

        // Add tiles
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '© OpenStreetMap contributors',
          maxZoom: 19,
        }).addTo(map);

        // Load locations from D1 database
        await locationStore.loadLocations();

        // Add initial location markers
        const locations = locationStore.getLocations();
        locations.forEach(location => {
          const marker = L.marker([location.lat, location.lng], {
            icon: L.icon({
              iconUrl: '/pin.png',
              iconSize: [32, 32],
              iconAnchor: [16, 32],
              popupAnchor: [0, -32]
            })
          })
            .addTo(map)
            .bindPopup(`
              <div class="p-3" style="min-width: 250px; max-width: 300px;">
                <h3 class="font-semibold text-lg mb-2">${location.title}</h3>
                <p class="text-gray-600 text-sm leading-relaxed">${location.description}</p>
              </div>
            `);
          locationMarkersRef.current.push(marker);
          addedLocationIdsRef.current.add(location.id);
        });

        // Handle map clicks
        map.on('click', (e: L.LeafletMouseEvent) => {
          const { lat, lng } = e.latlng;
          
          // Remove existing special pin
          if (specialPinRef.current) {
            map.removeLayer(specialPinRef.current);
            specialPinRef.current = null;
          }
          
          // Add new special pin
          const specialPin = L.marker([lat, lng], {
            icon: L.divIcon({
              className: 'special-pin-marker',
              html: `<svg width="48" height="48" viewBox="0 0 32 32" style="filter: drop-shadow(0 3px 6px rgba(0,0,0,0.4));">
                <path d="M16 2C10.48 2 6 6.48 6 12c0 7 10 18 10 18s10-11 10-18c0-5.52-4.48-10-10-10z" fill="#f97316" stroke="#fff" stroke-width="2"/>
                <circle cx="16" cy="12" r="4" fill="#fff"/>
              </svg>`,
              iconSize: [48, 48],
              iconAnchor: [24, 48],
            })
          })
            .addTo(map)
            .bindPopup('Click the + button to add a location here')
            .openPopup();
          
          specialPinRef.current = specialPin;
          
          if (onSpecialPinPlacedRef.current) {
            onSpecialPinPlacedRef.current(lat, lng);
          }
        });

        console.log('Map initialization complete');

      } catch (error) {
        console.error('Map initialization failed:', error);
      }
    };

    initMap();

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [isClient, center, zoom]); // Include center and zoom in dependencies

  // Update map view when center/zoom changes
  useEffect(() => {
    if (!isClient || !mapInstanceRef.current) return;
    
    const map = mapInstanceRef.current;
    map.setView(center, zoom);
  }, [isClient, center, zoom]);

  // Update special pin when coordinates change
  useEffect(() => {
    if (!isClient || !mapInstanceRef.current) return;

    const updatePin = async () => {
      try {
        const { default: L } = await import('leaflet');
        const map = mapInstanceRef.current;
        
        // Remove existing special pin
        if (specialPinRef.current && map) {
          map.removeLayer(specialPinRef.current);
          specialPinRef.current = null;
        }
        
        // Add new special pin if coordinates are provided
        if (specialPinCoords && map) {
          const specialPin = L.marker(specialPinCoords, {
            icon: L.divIcon({
              className: 'special-pin-marker',
              html: `<svg width="48" height="48" viewBox="0 0 32 32" style="filter: drop-shadow(0 3px 6px rgba(0,0,0,0.4));">
                <path d="M16 2C10.48 2 6 6.48 6 12c0 7 10 18 10 18s10-11 10-18c0-5.52-4.48-10-10-10z" fill="#f97316" stroke="#fff" stroke-width="2"/>
                <circle cx="16" cy="12" r="4" fill="#fff"/>
              </svg>`,
              iconSize: [48, 48],
              iconAnchor: [24, 48],
            })
          })
            .addTo(map)
            .bindPopup('Click the + button to add a location here');
          
          specialPinRef.current = specialPin;
        }
      } catch (error) {
        console.error('Failed to update pin:', error);
      }
    };

    updatePin();
  }, [isClient, specialPinCoords]);

  // Check for new locations and add them to the map
  const addNewLocationMarkers = useCallback(async () => {
    if (!isClient || !mapInstanceRef.current) return;

    try {
      const { default: L } = await import('leaflet');
      const map = mapInstanceRef.current;
      const locations = locationStore.getLocations();
      
      locations.forEach(location => {
        // Only add if not already added
        if (!addedLocationIdsRef.current.has(location.id)) {
          const marker = L.marker([location.lat, location.lng], {
            icon: L.icon({
              iconUrl: '/pin.png',
              iconSize: [32, 32],
              iconAnchor: [16, 32],
              popupAnchor: [0, -32]
            })
          })
            .addTo(map)
            .bindPopup(`
              <div class="p-3" style="min-width: 250px; max-width: 300px;">
                <h3 class="font-semibold text-lg mb-2">${location.title}</h3>
                <p class="text-gray-600 text-sm leading-relaxed">${location.description}</p>
              </div>
            `);
          
          locationMarkersRef.current.push(marker);
          addedLocationIdsRef.current.add(location.id);
        }
      });
    } catch (error) {
      console.error('Failed to add new location markers:', error);
    }
  }, [isClient]);

  // Check for new locations periodically
  useEffect(() => {
    if (!isClient) return;

    const interval = setInterval(() => {
      addNewLocationMarkers();
    }, 1000); // Check every second

    return () => clearInterval(interval);
  }, [isClient, addNewLocationMarkers]);

  // Render
  return (
    !isClient ? (
      <div className={`${className} bg-gray-100 flex items-center justify-center`}>
        <div className="text-gray-500">Loading map...</div>
      </div>
    ) : (
      <div className="relative w-full h-full">
        <div 
          ref={mapRef} 
          className={`${className} map-green-tint`}
          data-testid="map-container"
          style={{ minHeight: '100vh' }}
        />
      </div>
    )
  );
} 