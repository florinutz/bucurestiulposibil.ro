'use client';

import React, { useState, useEffect, useRef, useCallback, useImperativeHandle } from 'react';

interface SearchResult {
  lat: string;
  lon: string;
  display_name: string;
  boundingbox?: string[];
  class?: string;
  type?: string;
}

interface MapControlsProps {
  onCenterChange?: (center: [number, number]) => void;
  onZoomChange?: (zoom: number) => void;
  mode?: 'proposal' | 'voting';
}

export interface MapControlsRef {
  collapseAll: () => void;
}

export const MapControls = React.forwardRef<MapControlsRef, MapControlsProps>(({ 
  onCenterChange, 
  onZoomChange,
  mode = 'proposal'
}, ref) => {
  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [showSearch, setShowSearch] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Help box state
  const [showHelp, setShowHelp] = useState(false);

  // GPS location state
  const [isLocating, setIsLocating] = useState(false);

  // Function to collapse both search and help
  const collapseAll = useCallback(() => {
    setShowSearch(false);
    setShowHelp(false);
    setSearchResults([]);
  }, []);

  // Expose collapseAll function via ref
  useImperativeHandle(ref, () => ({
    collapseAll
  }), [collapseAll]);

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
      const data = await response.json() as SearchResult[];
      setSearchResults(data);
    } catch {
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
  const calculateZoomLevel = useCallback((result: SearchResult) => {
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
  }, []);

  const handleSearchSelect = useCallback((result: SearchResult) => {
    const calculatedZoom = calculateZoomLevel(result);
    const center: [number, number] = [parseFloat(result.lat), parseFloat(result.lon)];
    
    if (onCenterChange) onCenterChange(center);
    if (onZoomChange) onZoomChange(calculatedZoom);
    
    setSearchQuery(''); // Clear search input when suggestion is selected
    setSearchResults([]);
    collapseAll(); // Collapse search and help when location is selected
  }, [calculateZoomLevel, collapseAll, onCenterChange, onZoomChange]);

  // GPS button handler with improved error handling
  const handleGPSLocation = useCallback(() => {
    if (!navigator.geolocation) {
      alert('Geolocalizarea nu este suportată de acest browser.');
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
        const center: [number, number] = [position.coords.latitude, position.coords.longitude];
        if (onCenterChange) onCenterChange(center);
        if (onZoomChange) onZoomChange(16);
        collapseAll();
        console.log('Location obtained:', position.coords);
      },
      (error) => {
        setIsLocating(false);
        console.error('Geolocation error:', error);
        
        switch (error.code) {
          case error.PERMISSION_DENIED:
            alert('Accesul la locație a fost refuzat. Te rog să activezi permisiunile de locație în setările browserului și să încerci din nou.');
            break;
          case error.POSITION_UNAVAILABLE:
            alert('Informațiile despre locație nu sunt disponibile. Te rog să verifici setările dispozitivului și să încerci din nou.');
            break;
          case error.TIMEOUT:
            alert('Cererea pentru locație a expirat. Te rog să încerci din nou sau să verifici conexiunea la internet.');
            break;
          default:
            alert('A apărut o eroare necunoscută în obținerea locației tale. Te rog să încerci din nou.');
            break;
        }
      },
      options
    );
  }, [onCenterChange, onZoomChange, collapseAll]);

  // Focus search input when expanded
  useEffect(() => {
    if (showSearch && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [showSearch]);

  // ESC key handling
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        collapseAll();
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [collapseAll]);

  const getHelpContent = () => {
    if (mode === 'voting') {
      return (
        <ul className="text-sm text-gray-600 space-y-1">
          <li>• Fă click pe pinuri de pe hartă pentru a vedea detaliile și a vota</li>
          <li>• Poți vota o singură locatie.</li>
        </ul>
      );
    }

    return (
      <ul className="text-sm text-gray-600 space-y-1">
        <li>• Așază pin-ul cu un click/apasare pe locația dorită de pe hartă</li>
        <li>• Odată ce pin-ul este așezat pe locația dorită apasă pe butonul &ldquo;+&rdquo; din colțul dreapta sus al ecranului</li>
        <li>• Introdu detaliile opționale</li>
        <li>• Pin-urile vor apărea pe hartă imediat ce vor fi aprobate de un moderator</li>
      </ul>
    );
  };

  return (
    <div className="fixed bottom-28 right-4 z-30 flex flex-col items-end gap-3 pointer-events-auto">
      {/* Collapsible Search Box */}
      {showSearch ? (
        <div className="relative w-64">
          <input
            ref={searchInputRef}
            type="text"
            placeholder="Caută locații..."
            value={searchQuery}
            onChange={handleSearchChange}
            className="w-full px-4 py-2 pr-10 bg-white/90 backdrop-blur-sm rounded-lg shadow-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <svg className="absolute right-3 top-2.5 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          {/* Search Results (now above input) */}
          {searchResults.length > 0 && (
            <div className="absolute bottom-full left-0 right-0 mb-1 bg-white rounded-lg shadow-lg border border-gray-200 max-h-60 overflow-y-auto">
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
      ) : (
        <button
          onClick={() => setShowSearch(true)}
          className="p-3 bg-white/90 backdrop-blur-sm rounded-lg shadow-lg border border-gray-200 hover:bg-white transition-colors cursor-pointer"
          title="Caută locație"
          style={{ marginBottom: 0 }}
        >
          <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </button>
      )}

      {/* Help Button */}
      {showHelp ? (
        <div className="bg-white/90 backdrop-blur-sm rounded-lg shadow-lg p-4 max-w-sm">
          <div className="flex justify-between items-center mb-2">
            <h3 className="font-semibold text-gray-800">
              {mode === 'voting' ? 'Cum votezi:' : 'Cum folosești harta:'}
            </h3>
            <button
              onClick={() => setShowHelp(false)}
              className="text-gray-500 hover:text-gray-700 transition-colors cursor-pointer"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          {getHelpContent()}
        </div>
      ) : (
        <button
          onClick={() => setShowHelp(true)}
          className="p-3 bg-white/90 backdrop-blur-sm rounded-lg shadow-lg border border-gray-200 hover:bg-white transition-colors cursor-pointer"
          title="Ajutor"
        >
          <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </button>
      )}

      {/* Locate Me Button */}
      <button
        id="gps-locate-btn"
        onClick={handleGPSLocation}
        disabled={isLocating}
        className={`p-3 rounded-lg shadow-lg border transition-all duration-200 ${
          isLocating 
            ? 'bg-blue-500 text-white border-blue-600 cursor-not-allowed' 
            : 'bg-white/90 backdrop-blur-sm text-gray-700 border-gray-200 hover:bg-white cursor-pointer'
        }`}
        title={isLocating ? "Localizare..." : "Locația mea actuală"}
        style={{ marginBottom: 0 }}
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
  );
});

MapControls.displayName = 'MapControls';
