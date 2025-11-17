'use client';

import React, { useState, useEffect, useRef, useCallback, useImperativeHandle } from 'react';
import Image from 'next/image';
import { Modal } from './ModalSystem';

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
  mode?: 'proposal' | 'voting' | 'tour';
}

export interface MapControlsRef {
  collapseAll: () => void;
  openHelp: () => void;
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

  // Help modal state for tour mode
  const [showHelpModal, setShowHelpModal] = useState(false);

  // Velostrada modal state for tour mode
  const [showVelostradaModal, setShowVelostradaModal] = useState(false);

  // ESC key handling specifically for help modal
  useEffect(() => {
    if (!showHelpModal) return;

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        setShowHelpModal(false);
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showHelpModal]);

  // ESC key handling specifically for velostrada modal
  useEffect(() => {
    if (!showVelostradaModal) return;

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        setShowVelostradaModal(false);
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showVelostradaModal]);

  // GPS location state
  const [isLocating, setIsLocating] = useState(false);

  // Function to collapse both search and help
  const collapseAll = useCallback(() => {
    setShowSearch(false);
    setShowHelp(false);
    setShowHelpModal(false);
    setShowVelostradaModal(false);
    setSearchResults([]);
  }, []);

  // Function to open help (same behavior as clicking help button)
  const openHelp = useCallback(() => {
    if (mode === 'tour') {
      setShowHelpModal(true);
    } else {
      setShowHelp(true);
    }
  }, [mode]);

  // Expose functions via ref
  useImperativeHandle(ref, () => ({
    collapseAll,
    openHelp
  }), [collapseAll, openHelp]);

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

  // ESC key handling - only when modals are not open (ModalSystem handles it when modals are open)
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape' && !showHelpModal && !showVelostradaModal) {
        collapseAll();
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [collapseAll, showHelpModal, showVelostradaModal]);

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
      {/* Collapsible Search Box - only show for proposal and voting modes */}
      {mode !== 'tour' && showSearch ? (
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
      ) : mode !== 'tour' ? (
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
      ) : null}

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
          onClick={() => mode === 'tour' ? setShowHelpModal(true) : setShowHelp(true)}
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

      {/* Help Modal for Tour Mode */}
      <Modal
        isOpen={mode === 'tour' && showHelpModal}
        onClose={() => setShowHelpModal(false)}
        title="Bucureștiul Posibil"
        size="lg"
      >
        <div className="space-y-6">
          <p className="text-gray-700">
            „Bucureștiul Posibil” este un proiect desfășurat de{' '}
            <a href="https://strazipentruoameni.net" target="_blank" className="text-blue-600 hover:underline" rel="noopener noreferrer">
              Asociația Străzi pentru Oameni
            </a>{' '}
            și este co-finanțat de Administrația Fondului Cultural Național –{' '}
            <a href="https://www.afcn.ro/" target="_blank" className="text-blue-600 hover:underline" rel="noopener noreferrer">
              AFCN
            </a>.
          </p>

          <p className="text-gray-700">
            <a href="https://strazipentruoameni.net/proiecte/bucurestiul-posibil" target="_blank" className="text-blue-600 hover:underline" rel="noopener noreferrer">
              Manifestul Bucureștiul Posibil
            </a>
          </p>

          <div className="flex gap-4">
            <a
              href="https://www.facebook.com/strazipentruoameni"
              target="_blank"
              className="group relative bg-gradient-to-r from-blue-600 to-blue-700 text-white px-6 py-3 rounded-xl hover:from-blue-700 hover:to-blue-800 transition-all duration-300 text-center flex-1 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 flex items-center justify-center gap-2 font-medium"
              rel="noopener noreferrer"
            >
              <svg className="w-5 h-5 group-hover:scale-110 transition-transform duration-200" fill="currentColor" viewBox="0 0 24 24">
                <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
              </svg>
              urmărește-ne pe Facebook
            </a>
            <a
              href="https://www.instagram.com/strazi.pentru.oameni/"
              target="_blank"
              className="group relative bg-gradient-to-r from-pink-500 to-purple-600 text-white px-6 py-3 rounded-xl hover:from-pink-600 hover:to-purple-700 transition-all duration-300 text-center flex-1 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 flex items-center justify-center gap-2 font-medium"
              rel="noopener noreferrer"
            >
              <svg className="w-5 h-5 group-hover:scale-110 transition-transform duration-200" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
              </svg>
              sau pe instagram
            </a>
          </div>

          <div className="flex justify-center">
            <Image
              src="/SpO-si-AFCN.jpg"
              alt="SpO și AFCN"
              width={300}
              height={150}
              className="rounded"
            />
          </div>

          <p className="text-sm text-gray-500 text-center">
            Proiectul nu reprezintă în mod necesar poziția Administrației Fondului Cultural Național. AFCN nu este responsabilă de conținutul proiectului sau de modul în care rezultatele proiectului pot fi folosite. Acestea sunt în întregime responsabilitatea beneficiarului finanțării.
          </p>
        </div>
      </Modal>

      {/* Velostrada Modal for Tour Mode */}
      <Modal
        isOpen={mode === 'tour' && showVelostradaModal}
        onClose={() => setShowVelostradaModal(false)}
        title="Ce este o Velostradă?"
        size="lg"
      >
        <div className="space-y-4 text-gray-700">
          <p>
            Velostrada este un concept deja de mare succes în țări precum Germania, Austria și Olanda, și care a început să se extindă în ultimii ani și în alte țări, precum Franța sau Spania.
          </p>

          <p>
            Este vorba de o stradă secundară unde amenajarea este făcut cu gândul ca bicicliștii să fie principalii utilizatori, iar mașinile să fie în plan secund. Accesul mașinilor NU este interzis pe Velostrăzi, însă circulația se face cu viteză mică, în primul rând pentru accesul la locurile de parcare și accesul riveranilor, și nu ca stradă de tranzit.
          </p>

          <p>
            Velostrada este o soluție low-cost de promovare a transportului alternativ. După transformare, aceste străzi tind să devină mai liniștite, mai verzi și să ofere un aer mai respirabil, aducând un beneficiu important pentru locuitorii din zonă.
          </p>
        </div>
      </Modal>
    </div>
  );
});

MapControls.displayName = 'MapControls';
