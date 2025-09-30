'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import type { Location, VotableLocation, MapMode } from '@/types/geopoint';
import { VotingStore } from '@/lib/votingStore';

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
        if (votableLocation.userHasVoted) {
          // Voted pin: bigger size and red tint
          return L.icon({
            iconUrl: '/pin.png',
            iconSize: [48, 48], // Bigger size
            iconAnchor: [24, 48], // Adjusted anchor for bigger size
            popupAnchor: [0, -48], // Adjusted popup anchor
            className: 'voted-pin'
          });
        } else {
          // Unvoted pin: normal size
          return L.icon({
            iconUrl: '/pin.png',
            iconSize: [32, 32],
            iconAnchor: [16, 32],
            popupAnchor: [0, -32],
            className: 'unvoted-pin'
          });
        }
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
    if (mode === 'voting' || mode === 'tour') {
      // No popup content in voting/tour modes; we use a modal instead
      return '';
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
        } else if (mode === 'voting' || mode === 'tour') {
          // In voting/tour mode, map clicks act like ESC key (close modals)
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
  }, [isClient, center, zoom, mode]); // Include all dependencies

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
            // Enhance location with voting state for voting mode
            let enhancedLocation = location;
            if (mode === 'voting') {
              const votingStore = VotingStore.getInstance();
              enhancedLocation = {
                ...location,
                userHasVoted: votingStore.hasVoted(location.id)
              } as VotableLocation;
            }

            const iconFn = await getPinIcon(enhancedLocation);
            const icon = await iconFn();
          
            const marker = L.marker([location.lat, location.lng], { icon })
              .addTo(map);

            // Add tooltip showing the location title on hover
            marker.bindTooltip(location.title, {
              direction: 'top',
              offset: [0, -10],
              className: 'custom-tooltip',
              permanent: false,
              sticky: true
            });

            // In voting/tour mode, clicking a marker should trigger an external handler to open the modal
            if ((mode === 'voting' || mode === 'tour') && onPinClickRef.current) {
              marker.on('click', () => {
                onPinClickRef.current?.(enhancedLocation);
              });
            } else {
              // Proposal mode retains popup
              marker.bindPopup(createPopupContent(enhancedLocation));
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
        {/* Add CSS for voted/unvoted pins in voting mode and custom tooltips */}
        <style jsx global>{`
          .voted-pin {
            filter: hue-rotate(0deg) saturate(1.5) brightness(1.2);
          }
          .unvoted-pin {
            filter: none;
          }
          
          /* Custom tooltip styling */
          .custom-tooltip {
            background: rgba(0, 0, 0, 0.8);
            border: none;
            border-radius: 6px;
            color: white;
            font-size: 12px;
            font-weight: 500;
            padding: 6px 10px;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
            white-space: nowrap;
            max-width: 200px;
            overflow: hidden;
            text-overflow: ellipsis;
          }
          
          .custom-tooltip::before {
            border-top-color: rgba(0, 0, 0, 0.8);
          }
        `}</style>
      </div>
    )
  );
}
