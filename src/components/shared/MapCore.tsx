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
      const votingStore = VotingStore.getInstance();
      const hasVotedAnywhere = votingStore.hasVoted();
      
      return `
        <div class="p-4" style="min-width: 280px; max-width: 320px;">
          <h3 class="font-semibold text-lg mb-3">${location.title}</h3>
          <p class="text-gray-600 text-sm leading-relaxed mb-3">${location.description}</p>
          
          ${location.submittedByName ? `
            <div class="border-t pt-3 mb-3">
              <p class="text-sm font-medium text-gray-800">${location.submittedByName}</p>
            </div>
          ` : ''}

          <div class="bg-gray-50 p-3 rounded mb-3">
            <p class="text-sm text-gray-600 flex items-center gap-2">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M9 12l2 2 4-4"/>
                <path d="M21 12c-1 0-3-1-3-3s2-3 3-3 3 1 3 3-2 3-3 3"/>
                <path d="M3 12c1 0 3-1 3-3s-2-3-3-3-3 1-3 3 2 3 3 3"/>
                <path d="M3 12h6m6 0h6"/>
              </svg>
              <strong>Voturi primite:</strong> <span id="vote-count-${location.id}">${votableLocation.voteCount || 0}</span>
            </p>
          </div>

          <div class="space-y-2">
            <div id="vote-error-${location.id}" class="hidden bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded text-sm"></div>
            
            ${!hasVotedAnywhere ? `
              <div class="flex gap-2">
                <button
                  id="vote-btn-${location.id}"
                  data-location-id="${location.id}"
                  data-location-title="${location.title.replace(/"/g, '&quot;')}"
                  class="vote-button unvoted flex-1 px-4 py-2 rounded text-sm font-medium transition-colors bg-green-600 text-white hover:bg-green-700 active:bg-green-800"
                >
                  🗳️ Votează
                </button>
              </div>
            ` : ''}
          </div>

          <div id="vote-success-${location.id}" class="hidden mt-3 text-center">
            <div class="text-3xl mb-2">🎉</div>
            <p class="text-sm font-medium text-green-700">Mulțumim pentru vot!</p>
            <p class="text-xs text-gray-600 mt-1">Votul tău a fost înregistrat cu succes.</p>
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

  // Handle vote button clicks within popups
  const handleVoteButtonClick = useCallback(async (event: Event) => {
    const target = event.target as HTMLElement;
    if (!target.classList.contains('vote-button') || target.hasAttribute('disabled')) {
      return;
    }

    const locationId = target.getAttribute('data-location-id');
    const locationTitle = target.getAttribute('data-location-title');
    
    if (!locationId || !locationTitle) return;

          // Show loading state
      target.innerHTML = '⏳ Se înregistrează...';
      target.classList.add('opacity-50', 'cursor-wait');

    // Hide any existing error
    const errorElement = document.getElementById(`vote-error-${locationId}`);
    if (errorElement) {
      errorElement.classList.add('hidden');
    }

    try {
      const votingStore = VotingStore.getInstance();
      const result = await votingStore.castVote(locationId, locationTitle);

      // Update vote count in popup
      const voteCountElement = document.getElementById(`vote-count-${locationId}`);
      if (voteCountElement) {
        voteCountElement.textContent = result.newVoteCount.toString();
      }

      // Hide the voted button since user can only vote once
      const buttonContainer = target.closest('.flex.gap-2') as HTMLElement;
      if (buttonContainer) {
        buttonContainer.style.display = 'none';
      }

      // Show success message
      const successElement = document.getElementById(`vote-success-${locationId}`);
      if (successElement) {
        successElement.classList.remove('hidden');
        
        // Hide success message after 3 seconds
        setTimeout(() => {
          if (successElement) {
            successElement.classList.add('hidden');
          }
        }, 3000);
      }

      // Hide all vote buttons since user can only vote once
      const allVoteButtons = document.querySelectorAll('.vote-button');
      allVoteButtons.forEach(button => {
        if (button !== target) {
          // Hide the button container (parent div)
          const buttonContainer = button.closest('.flex.gap-2') as HTMLElement;
          if (buttonContainer) {
            buttonContainer.style.display = 'none';
          }
        }
      });

      // Trigger custom event to update the voted location indicator
      window.dispatchEvent(new CustomEvent('voteSuccess', { 
        detail: { locationId, locationTitle }
      }));

    } catch (error) {
      // Show error message
      if (errorElement) {
        errorElement.textContent = error instanceof Error ? error.message : 'Eroare la înregistrarea votului';
        errorElement.classList.remove('hidden');
      }

      // Reset button state
      target.innerHTML = '🗳️ Votează';
      target.classList.remove('opacity-50', 'cursor-wait');
    }
  }, []);

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

        // Add event delegation for voting buttons in popup
        if (mode === 'voting') {
          // Add click event listener to the map container for vote buttons
          map.getContainer().addEventListener('click', handleVoteButtonClick);
        }

        setIsMapReady(true);

      } catch (error) {
        console.error('Map initialization failed:', error);
      }
    };

    initMap();

    return () => {
      if (mapInstanceRef.current) {
        // Clean up event listeners
        if (mode === 'voting') {
          mapInstanceRef.current.getContainer().removeEventListener('click', handleVoteButtonClick);
        }
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [isClient, center, zoom, mode, handleVoteButtonClick]); // Include all dependencies

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
              .addTo(map)
              .bindPopup(createPopupContent(enhancedLocation));

            // In voting mode, popup handles everything - no additional click handlers needed
            
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
