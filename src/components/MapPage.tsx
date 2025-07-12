'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Map from './Map';
import { locationStore } from '../lib/locationStore';

interface MapPageProps {
  initialCenter?: [number, number];
  initialZoom?: number;
  title?: string;
}

export default function MapPage({ 
  initialCenter = [40.7128, -74.0060], 
  initialZoom = 13,
  title = "Interactive Map"
}: MapPageProps) {
  const [center, setCenter] = useState<[number, number]>(initialCenter);
  const [zoom, setZoom] = useState(initialZoom);
  const [proposals, setProposals] = useState<Array<{
    id: string;
    title: string;
    description: string;
    lat: number;
    lng: number;
    timestamp: Date;
  }>>([]);
  const [showProposalSuccess, setShowProposalSuccess] = useState(false);

  // Special pin state
  const [specialPinCoords, setSpecialPinCoords] = useState<[number, number] | null>(null);

  // Proposal dialog state
  const [showProposalForm, setShowProposalForm] = useState(false);
  const [proposalData, setProposalData] = useState({ title: '', description: '' });
  const proposalDialogRef = useRef<HTMLDivElement>(null);

  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Array<{ 
    lat: string; 
    lon: string; 
    display_name: string;
    boundingbox?: string[];
    class?: string;
    type?: string;
  }>>([]);

  // Search functionality using Nominatim with debouncing
  const searchLocations = useCallback(async (query: string) => {
    if (query.length < 3) {
      setSearchResults([]);
      return;
    }
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5&addressdetails=1&extratags=1`
      );
      const data = await response.json() as Array<{ 
        lat: string; 
        lon: string; 
        display_name: string;
        boundingbox?: string[];
        class?: string;
        type?: string;
      }>;
      setSearchResults(data);
    } catch (error) {
      setSearchResults([]);
    }
  }, []);

  // Debounced search effect
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      searchLocations(searchQuery);
    }, 700);

    return () => clearTimeout(timeoutId);
  }, [searchQuery, searchLocations]);

  // Calculate appropriate zoom level based on location type and bounding box
  const calculateZoomLevel = useCallback((result: { 
    lat: string; 
    lon: string; 
    display_name: string;
    boundingbox?: string[];
    class?: string;
    type?: string;
  }) => {
    // Default zoom for local places
    let zoom = 16;
    // Check if we have a bounding box
    if (result.boundingbox && result.boundingbox.length === 4) {
      const [minLat, maxLat, minLon, maxLon] = result.boundingbox.map(Number);
      const latDiff = Math.abs(maxLat - minLat);
      const lonDiff = Math.abs(maxLon - minLon);
      const maxDiff = Math.max(latDiff, lonDiff);
      // Very granular zoom levels for precise location sizing
      if (maxDiff > 150) {
        zoom = 0; // Entire world view
      } else if (maxDiff > 100) {
        zoom = 1; // Oceans, continents
      } else if (maxDiff > 70) {
        zoom = 2; // Large countries
      } else if (maxDiff > 50) {
        zoom = 3; // Medium-large countries
      } else if (maxDiff > 30) {
        zoom = 4; // Countries
      } else if (maxDiff > 20) {
        zoom = 5; // Large states/regions
      } else if (maxDiff > 15) {
        zoom = 6; // States/regions
      } else if (maxDiff > 10) {
        zoom = 7; // Large cities/metropolitan areas
      } else if (maxDiff > 7) {
        zoom = 8; // Metropolitan areas
      } else if (maxDiff > 5) {
        zoom = 9; // Large cities
      } else if (maxDiff > 3) {
        zoom = 10; // Cities
      } else if (maxDiff > 2) {
        zoom = 11; // Large towns
      } else if (maxDiff > 1.5) {
        zoom = 12; // Towns
      } else if (maxDiff > 1) {
        zoom = 13; // Small towns
      } else if (maxDiff > 0.7) {
        zoom = 14; // Villages
      } else if (maxDiff > 0.5) {
        zoom = 15; // Small villages
      } else if (maxDiff > 0.3) {
        zoom = 16; // Neighborhoods
      } else if (maxDiff > 0.1) {
        zoom = 17; // Small neighborhoods
      } else if (maxDiff > 0.05) {
        zoom = 18; // Streets/blocks
      } else {
        zoom = 19; // Buildings/very small areas
      }
    }
    // Override based on location class/type for better UX
    if (result.class === 'boundary' && result.type === 'administrative') {
      if (result.display_name.toLowerCase().includes('country')) {
        zoom = 4;
      } else if (result.display_name.toLowerCase().includes('state')) {
        zoom = 6;
      } else {
        zoom = 8;
      }
    } else if (result.class === 'natural' && result.type === 'water') {
      if (result.display_name.toLowerCase().includes('ocean')) {
        zoom = 1;
      } else if (result.display_name.toLowerCase().includes('sea')) {
        zoom = 2;
      } else {
        zoom = 6;
      }
    } else if (result.class === 'place' && result.type === 'city') {
      zoom = 11;
    } else if (result.class === 'place' && result.type === 'town') {
      zoom = 13;
    } else if (result.class === 'place' && result.type === 'village') {
      zoom = 15;
    }
    // Cap zoom between 0 and 19 (Leaflet default)
    zoom = Math.max(0, Math.min(zoom, 19));
    return zoom;
  }, []);

  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value;
    setSearchQuery(query);
    // Remove the immediate searchLocations call since it's now handled by the debounced effect
  }, []);

  const handleSearchSelect = useCallback((result: { 
    lat: string; 
    lon: string; 
    display_name: string;
    boundingbox?: string[];
    class?: string;
    type?: string;
  }) => {
    const calculatedZoom = calculateZoomLevel(result);
    setCenter([parseFloat(result.lat), parseFloat(result.lon)]);
    setZoom(calculatedZoom);
    setSearchQuery(result.display_name);
    setSearchResults([]);
  }, [calculateZoomLevel]);

  // GPS location state
  const [isLocating, setIsLocating] = useState(false);

  // GPS button handler with improved error handling
  const handleGPSLocation = useCallback(() => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by this browser.');
      return;
    }

    setIsLocating(true);

    const options = {
      enableHighAccuracy: true,
      timeout: 30000, // Increased to 30 seconds to allow time for permission grant
      maximumAge: 300000 // 5 minutes cache
    };

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setIsLocating(false);
        setCenter([position.coords.latitude, position.coords.longitude]);
        setZoom(16);
        console.log('Location obtained:', position.coords);
      },
      (error) => {
        setIsLocating(false);
        console.error('Geolocation error:', error);
        
        switch (error.code) {
          case error.PERMISSION_DENIED:
            alert('Location access denied. Please enable location permissions in your browser settings and try again.');
            break;
          case error.POSITION_UNAVAILABLE:
            alert('Location information is unavailable. Please check your device settings and try again.');
            break;
          case error.TIMEOUT:
            alert('Location request timed out. Please try again or check your internet connection.');
            break;
          default:
            alert('An unknown error occurred while getting your location. Please try again.');
            break;
        }
      },
      options
    );
  }, []);

  // Special pin placement handler
  const handleSpecialPinPlaced = useCallback((lat: number, lng: number) => {
    setSpecialPinCoords([lat, lng]);
  }, []);

  // Add location button handler
  const handleAddLocationClick = useCallback(() => {
    if (!specialPinCoords) {
      alert('Please click on the paris first to place a pin, then click the + button to add a location.');
      return;
    }
    setShowProposalForm(true);
  }, [specialPinCoords]);

  // ESC key closes modal
  useEffect(() => {
    if (!showProposalForm) return;
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') setShowProposalForm(false);
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showProposalForm]);

  // Backdrop click closes modal
  const handleBackdropClick = useCallback((e: React.MouseEvent<HTMLDivElement, MouseEvent>) => {
    if (e.target === proposalDialogRef.current) {
      setShowProposalForm(false);
    }
  }, []);

  const handleProposalSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    if (specialPinCoords) {
      const data = {
        title: proposalData.title,
        description: proposalData.description,
        lat: specialPinCoords[0],
        lng: specialPinCoords[1]
      };
      // Log the submission
      console.log('Proposal submitted:', data);
      // Add to proposals (for demo, not backend)
      const newProposal = locationStore.addProposal(data);
      
      // For demo purposes, automatically approve the proposal so it shows on the map
      const approvedLocation = locationStore.approveProposal(newProposal.id);
      
      setProposals(prev => [...prev, {
        id: newProposal.id,
        title: newProposal.title,
        description: newProposal.description,
        lat: newProposal.lat,
        lng: newProposal.lng,
        timestamp: newProposal.createdAt
      }]);
      setShowProposalSuccess(true);
      setTimeout(() => setShowProposalSuccess(false), 3000);
      setShowProposalForm(false);
      setProposalData({ title: '', description: '' }); // Clear form on submit
      setSpecialPinCoords(null); // Remove the special pin after submission
    }
  }, [specialPinCoords, proposalData]);

  return (
    <div className="relative w-full h-screen overflow-hidden">
      {/* Map rendered first, z-0 */}
      <div className="absolute inset-0 z-0">
        <Map 
          center={center} 
          zoom={zoom} 
          className="w-full h-full"
          onProposeLocation={undefined}
          onSpecialPinPlaced={handleSpecialPinPlaced}
          specialPinCoords={specialPinCoords}
        />
      </div>

      {/* Overlay UI: stacked column, pointer-events-none on container, z-20 */}
      <div className="pointer-events-none fixed top-4 left-4 z-20 flex flex-col gap-4 max-w-xs w-[90vw]">
        {/* Title */}
        <div className="pointer-events-auto bg-white/90 backdrop-blur-sm rounded-lg shadow-lg p-4">
          <h1 className="text-xl font-semibold text-gray-800">{title}</h1>
        </div>
        {/* Search Box */}
        <div className="pointer-events-auto w-full">
          <div className="relative">
            <input
              type="text"
              placeholder="Search locations..."
              value={searchQuery}
              onChange={handleSearchChange}
              className="w-full px-4 py-2 pr-10 bg-white/90 backdrop-blur-sm rounded-lg shadow-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <svg className="absolute right-3 top-2.5 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          {/* Search Results */}
          {searchResults.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-lg shadow-lg border border-gray-200 max-h-60 overflow-y-auto">
              {searchResults.map((result, index) => (
                <button
                  key={index}
                  onClick={() => handleSearchSelect(result)}
                  className="w-full px-4 py-2 text-left hover:bg-gray-50 border-b border-gray-100 last:border-b-0"
                >
                  <div className="font-medium text-sm">{result.display_name.split(',')[0]}</div>
                  <div className="text-xs text-gray-500">{result.display_name}</div>
                </button>
              ))}
            </div>
          )}
        </div>
        {/* Info Panel */}
        <div className="pointer-events-auto bg-white/90 backdrop-blur-sm rounded-lg shadow-lg p-4 min-w-[200px] space-y-2 text-sm text-gray-600">
          <div><span className="font-medium">Latitude:</span> {center[0].toFixed(4)}</div>
          <div><span className="font-medium">Longitude:</span> {center[1].toFixed(4)}</div>
          <div><span className="font-medium">Zoom:</span> {zoom}</div>
          <div className="pt-2 border-t border-gray-200"><span className="font-medium">Proposals:</span> {proposals.length}</div>
          {specialPinCoords && (
            <div className="pt-2 border-t border-gray-200">
              <span className="font-medium text-green-600">Pin placed ✓</span>
            </div>
          )}
        </div>
      </div>

      {/* Add Location Button: top right, z-20 */}
      <div className="fixed top-4 right-4 z-20 pointer-events-auto">
        <button
          onClick={handleAddLocationClick}
          className={`p-3 rounded-lg shadow-lg border transition-all duration-200 ${
            specialPinCoords 
              ? 'bg-green-500 hover:bg-green-600 text-white border-green-600' 
              : 'bg-white/90 backdrop-blur-sm text-gray-700 border-gray-200 hover:bg-white'
          }`}
          title={specialPinCoords ? "Add location at pinned coordinates" : "Click on paris first to place a pin"}
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
        </button>
      </div>

      {/* GPS Button: bottom right, never covers map controls, z-20 */}
      <div className="fixed bottom-4 right-4 z-20 pointer-events-auto">
        <button
          id="gps-locate-btn"
          onClick={handleGPSLocation}
          disabled={isLocating}
          className={`p-3 rounded-lg shadow-lg border transition-all duration-200 ${
            isLocating 
              ? 'bg-blue-500 text-white border-blue-600 cursor-not-allowed' 
              : 'bg-white/90 backdrop-blur-sm text-gray-700 border-gray-200 hover:bg-white'
          }`}
          title={isLocating ? "Locating..." : "Find my location"}
        >
          {isLocating ? (
            <svg className="w-6 h-6 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          ) : (
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          )}
        </button>
      </div>

      {/* Proposal Dialog/Modal: z-50 */}
      {showProposalForm && (
        <div
          className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"
          ref={proposalDialogRef}
          onClick={handleBackdropClick}
        >
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-semibold mb-4">Add New Location</h3>
            <form onSubmit={handleProposalSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Title
                </label>
                <input
                  type="text"
                  required
                  value={proposalData.title}
                  onChange={(e) => setProposalData({ ...proposalData, title: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter location title"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  required
                  value={proposalData.description}
                  onChange={(e) => setProposalData({ ...proposalData, description: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={3}
                  placeholder="Enter location description"
                />
              </div>
              <div className="text-sm text-gray-600">
                Coordinates: {specialPinCoords?.[0].toFixed(6)}, {specialPinCoords?.[1].toFixed(6)}
              </div>
              <div className="flex space-x-3">
                <button
                  type="submit"
                  className="flex-1 bg-blue-500 text-white py-2 px-4 rounded-md hover:bg-blue-600 transition-colors"
                >
                  Add Location
                </button>
                <button
                  type="button"
                  onClick={() => setShowProposalForm(false)}
                  className="flex-1 bg-gray-300 text-gray-700 py-2 px-4 rounded-md hover:bg-gray-400 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Success Message */}
      {showProposalSuccess && (
        <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-30">
          <div className="bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg">
            <div className="flex items-center space-x-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <span>Location added successfully!</span>
            </div>
          </div>
        </div>
      )}

      {/* Instructions Panel: bottom left, pointer-events-none, z-10 */}
      <div className="pointer-events-none fixed bottom-4 left-4 z-10">
        <div className="pointer-events-auto bg-white/90 backdrop-blur-sm rounded-lg shadow-lg p-4 max-w-sm">
          <h3 className="font-semibold text-gray-800 mb-2">How to use:</h3>
          <ul className="text-sm text-gray-600 space-y-1">
            <li>• <strong>Search:</strong> Use the search box to find locations</li>
            <li>• <strong>GPS:</strong> Click the location button to find your position</li>
            <li>• <strong>Place Pin:</strong> Click anywhere on the map to place a red pin</li>
            <li>• <strong>Add Location:</strong> Click the + button to add a location at the pin</li>
            <li>• <strong>View:</strong> Click on existing pins to see location details</li>
          </ul>
        </div>
      </div>

      {/* Attribution: bottom right, above GPS button, z-10 */}
      <div className="fixed bottom-20 right-4 z-10">
        <div className="bg-white/90 backdrop-blur-sm rounded px-2 py-1 text-xs text-gray-600">
          © OpenStreetMap contributors
        </div>
      </div>
    </div>
  );
} 