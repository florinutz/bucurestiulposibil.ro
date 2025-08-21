'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import type { Location, VotableLocation, MapMode } from '@/types/geopoint';

interface MapCoreProps {
  center?: [number, number];
  zoom?: number;
  className?: string;
  mode: MapMode;
  // Proposal mode props
  onSpecialPinPlaced?: (lat: number, lng: number) => void;
  specialPinCoords?: [number, number] | null;
  // Voting mode props
  locations?: (Location | VotableLocation)[];
  onPinClick?: (location: Location | VotableLocation) => void;
  onMapClick?: () => void;
}

export function MapCore({ 
  center = [44.4268, 26.1025], // Bucharest center coordinates
  zoom = 12,
  className = "w-full h-full",
  mode,
  onSpecialPinPlaced,
  specialPinCoords,
  locations = [],
  onPinClick,
  onMapClick
}: MapCoreProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const specialPinRef = useRef<L.Marker | null>(null);
  const locationMarkersRef = useRef<L.Marker[]>([]);
  const addedLocationIdsRef = useRef<Set<string>>(new Set());
  const onSpecialPinPlacedRef = useRef(onSpecialPinPlaced);
  const onPinClickRef = useRef(onPinClick);
  const onMapClickRef = useRef(onMapClick);
  const [isClient, setIsClient] = useState(false);
  const [isMapReady, setIsMapReady] = useState(false);

  // Ensure we're on the client side
  useEffect(() => {
    setIsClient(true);
  }, []);

  // Update callback refs when they change
  useEffect(() => {
    onSpecialPinPlacedRef.current = onSpecialPinPlaced;
  }, [onSpecialPinPlaced]);

  useEffect(() => {
    onPinClickRef.current = onPinClick;
  }, [onPinClick]);

  useEffect(() => {
    onMapClickRef.current = onMapClick;
  }, [onMapClick]);

  // Get pin icon based on mode and location state
  const getPinIcon = useCallback((location?: Location | VotableLocation) => {
    return async () => {
      const { default: L } = await import('leaflet');

      if (mode === 'voting' && location && 'userHasVoted' in location) {
        const votableLocation = location as VotableLocation;
        return L.icon({
          iconUrl: '/pin.png',
          iconSize: [32, 32],
          iconAnchor: [16, 32],
          popupAnchor: [0, -32],
          className: votableLocation.userHasVoted ? 'voted-pin' : 'unvoted-pin'
        });
      }

      // Default pin for approved locations
      return L.icon({
        iconUrl: '/pin.png',
        iconSize: [32, 32],
        iconAnchor: [16, 32],
        popupAnchor: [0, -32]
      });
    };
  }, [mode]);

  // Create popup content based on mode
  const createPopupContent = useCallback((location: Location | VotableLocation) => {
    if (mode === 'voting') {
      const votableLocation = location as VotableLocation;
      return `
        <div class="p-3 cursor-pointer" style="min-width: 250px; max-width: 300px;">
          <h3 class="font-semibold text-lg mb-2">${location.title}</h3>
          <p class="text-gray-600 text-sm leading-relaxed mb-2">${location.description}</p>
          <div class="bg-gray-50 p-2 rounded mb-2">
            <p class="text-sm text-gray-600">
              <strong>Voturi:</strong> ${votableLocation.voteCount || 0}
            </p>
          </div>
          ${location.submittedByName ? `<div class="mt-3 pt-2 border-t border-gray-200"><p class="text-xs text-gray-800 font-bold">${location.submittedByName}</p></div>` : ''}
          <div class="mt-3 text-center">
            <p class="text-xs text-blue-600">Click pentru a vota</p>
          </div>
        </div>
      `;
    }

    // Proposal mode popup
    return `
      <div class="p-3" style="min-width: 250px; max-width: 300px;">
        <h3 class="font-semibold text-lg mb-2">${location.title}</h3>
        <p class="text-gray-600 text-sm leading-relaxed">${location.description}</p>
        ${location.submittedByName ? `<div class="mt-3 pt-2 border-t border-gray-200"><p class="text-xs text-gray-800 font-bold">${location.submittedByName}</p></div>` : ''}
      </div>
    `;
  }, [mode]);

  // Initialize map only once
  useEffect(() => {
    if (!isClient || !mapRef.current || mapInstanceRef.current) return;

    const initMap = async () => {
      try {
        // Import Leaflet
        const { default: L } = await import('leaflet');

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

        // Add zoom control to bottom right
        L.control.zoom({ position: 'bottomright' }).addTo(map);

        // Add tiles
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '© OpenStreetMap contributors',
          maxZoom: 19,
        }).addTo(map);

        // Handle map clicks based on mode
        if (mode === 'proposal') {
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
        } else if (mode === 'voting') {
          // In voting mode, map clicks act like ESC key (close modals)
          map.on('click', () => {
            if (onMapClickRef.current) {
              onMapClickRef.current();
            }
          });
        }

        setIsMapReady(true);

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
  }, [isClient, center, zoom, mode]); // Include mode in dependencies

  // Update map view when center/zoom changes
  useEffect(() => {
    if (!isClient || !mapInstanceRef.current) return;
    
    const map = mapInstanceRef.current;
    map.setView(center, zoom);
  }, [isClient, center, zoom]);

  // Update special pin when coordinates change (proposal mode only)
  useEffect(() => {
    if (!isClient || !mapInstanceRef.current || mode !== 'proposal') return;

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
  }, [isClient, specialPinCoords, mode]);

  // Manage location markers (for both modes)
  useEffect(() => {
    if (!isClient || !mapInstanceRef.current || !isMapReady) {
      return;
    }

    const updateMarkers = async () => {
      try {
        const { default: L } = await import('leaflet');
        const map = mapInstanceRef.current;
        if (!map) return;
        
        // Clear existing markers
        locationMarkersRef.current.forEach(marker => {
          map.removeLayer(marker);
        });
        locationMarkersRef.current = [];
        addedLocationIdsRef.current.clear();

        // Add new markers
        for (const location of locations) {
          try {
            const iconFn = await getPinIcon(location);
            const icon = await iconFn();
          
            const marker = L.marker([location.lat, location.lng], { icon })
              .addTo(map)
              .bindPopup(createPopupContent(location));

            // Handle click events for voting mode
            if (mode === 'voting' && onPinClickRef.current) {
              marker.on('click', () => {
                if (onPinClickRef.current) {
                  onPinClickRef.current(location);
                }
              });
            }
            
            locationMarkersRef.current.push(marker);
            addedLocationIdsRef.current.add(location.id);
          } catch (error) {
            console.error('MapCore: error creating marker for', location.title, error);
          }
        }
      } catch (error) {
        console.error('Failed to update markers:', error);
      }
    };

    updateMarkers();
  }, [isClient, locations, getPinIcon, createPopupContent, mode, isMapReady]);

  // Render
  return (
    !isClient ? (
      <div className={`${className} bg-gradient-to-br from-green-400 to-blue-500 flex items-center justify-center`}>
        <div className="text-white text-xl">Se încarcă harta...</div>
      </div>
    ) : (
      <div className="relative w-full h-full">
        <div 
          ref={mapRef} 
          className={`${className} map-green-tint`}
          data-testid="map-container"
          style={{ minHeight: '100vh' }}
        />
        {/* Add CSS for voted/unvoted pins in voting mode */}
        {mode === 'voting' && (
          <style jsx>{`
            .voted-pin {
              filter: hue-rotate(120deg) saturate(0.7);
            }
            .unvoted-pin {
              filter: none;
            }
          `}</style>
        )}
      </div>
    )
  );
}
