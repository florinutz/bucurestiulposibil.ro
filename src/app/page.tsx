'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import dynamic from 'next/dynamic';
import type { TourLocation } from '@/types/geopoint';
import { TourLocationModal } from '@/components/tour/TourLocationModal';
import tourPinsData from '@/data/tourPins.json';

// Dynamically import MapLayout
const MapLayout = dynamic(() => import('../components/shared/MapLayout').then(mod => ({ default: mod.MapLayout })), {
  ssr: false,
  loading: () => (
    <div className="min-h-screen bg-gradient-to-br from-green-400 to-blue-500 flex items-center justify-center">
      <div className="text-white text-xl">Se încarcă harta...</div>
    </div>
  )
});

interface TourPin {
  title: string;
  url: string;
  coords: [number, number];
  youtubeId: string;
  text: string;
}

export default function TourPage() {
  const router = useRouter();
  const pathname = usePathname();
  
  const [center, setCenter] = useState<[number, number]>([44.4268, 26.1025]);
  const [zoom, setZoom] = useState(13);
  const [tourLocations, setTourLocations] = useState<TourLocation[]>([]);
  const [selectedLocation, setSelectedLocation] = useState<TourLocation | null>(null);
  const [showVelostradaModal, setShowVelostradaModal] = useState(false);
  
  // Track if URL change was initiated from pin click (to avoid zoom change)
  const isPinClickNavigationRef = useRef<boolean>(false);

  // Load tour locations from JSON
  useEffect(() => {
    const pins = tourPinsData as TourPin[];
    const locations: TourLocation[] = pins.map((pin) => ({
      id: pin.url,
      title: pin.title,
      slug: pin.url,
      lat: pin.coords[0],
      lng: pin.coords[1],
      description: pin.text,
      status: 'approved' as const,
      createdAt: new Date(),
      youtubeId: pin.youtubeId
    }));
    setTourLocations(locations);
  }, []);

  // Handle URL-based pin opening (only for direct URL access, not pin clicks)
  useEffect(() => {
    // On root path, close any open modal
    if (pathname === '/') {
      isPinClickNavigationRef.current = false;
      return;
    }

    // Skip if this URL change was from a pin click
    if (isPinClickNavigationRef.current) {
      isPinClickNavigationRef.current = false;
      return;
    }

    // Extract slug from pathname (remove leading slash)
    const slug = pathname.slice(1);
    
    // Find matching location
    const matchingLocation = tourLocations.find(loc => loc.slug === slug);
    
    // This is a direct URL access - open modal and center/zoom map
    if (matchingLocation) {
      setSelectedLocation(matchingLocation);
      setCenter([matchingLocation.lat, matchingLocation.lng]);
      setZoom(16);
    }
  }, [pathname, tourLocations]);

  // Handle pin click from map
  const handlePinClick = useCallback((loc: TourLocation) => {
    setSelectedLocation(loc);
    // Mark this as pin-initiated navigation to prevent zoom change
    isPinClickNavigationRef.current = true;
    // Update URL without page reload
    router.push(`/${loc.slug}`, { scroll: false });
  }, [router]);

  // Handle modal close
  const handleModalClose = useCallback(() => {
    setSelectedLocation(null);
    // Mark as pin-initiated to prevent any side effects
    isPinClickNavigationRef.current = true;
    // Return to root URL without page reload
    router.push('/', { scroll: false });
  }, [router]);

  // Handle velostrada click
  const handleVelostradaClick = useCallback(() => {
    setShowVelostradaModal(true);
  }, []);

  // Handle ESC key for velostrada modal (with higher priority)
  useEffect(() => {
    if (!showVelostradaModal) return;

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        setShowVelostradaModal(false);
      }
    };

    // Add listener with capture phase to intercept before other listeners
    window.addEventListener('keydown', handleEscape, true);
    return () => window.removeEventListener('keydown', handleEscape, true);
  }, [showVelostradaModal]);

  return (
    <>
      <MapLayout
        mode="tour"
        center={center}
        zoom={zoom}
        onCenterChange={setCenter}
        onZoomChange={setZoom}
        locations={tourLocations}
        onPinClick={handlePinClick}
      />

      <TourLocationModal 
        location={selectedLocation}
        onClose={handleModalClose}
        onVelostradaClick={handleVelostradaClick}
      />

      {/* Velostrada Modal */}
      {showVelostradaModal && (
        <div 
          className="fixed inset-0 z-[30000] bg-black/50 flex items-center justify-center p-4"
          onClick={() => setShowVelostradaModal(false)}
          onKeyDown={(e) => {
            if (e.key === 'Escape') {
              e.stopPropagation();
              setShowVelostradaModal(false);
            }
          }}
        >
          <div 
            className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-semibold text-gray-800">Ce este o Velostradă?</h2>
                <button
                  onClick={() => setShowVelostradaModal(false)}
                  className="text-gray-500 hover:text-gray-700 transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="space-y-4 text-gray-700">
                <p>
                  Velostrada este un concept deja de mare succes în țări precum Germania, Austria și Olanda, și care a început să se extindă în ultimii ani și în alte țări, precum Franța sau Spania.
                </p>

                <p>
                  Este vorba de o stradă secundară unde amenajarea este făcut cu gândul ca bicicliștii să fie principalii utilizatori, iar mașinile să fie în plan secund. Accesul mașinilor NU este interzis pe Velostrăzi, însă circulația se face cu viteză mică, în primul rând pentru accesul la locurile de parcare și accesul riveranilor, și nu ca stradă de tranzit.
                </p>

                <p>
                  Velostrada este o soluție low-cost de promovare a transportului alternativ. După transformare, aceste străzi tind să devină mai liniștite, mai verzi și să ofere un aer mai respirabil, aducând un beneficiu important pentru locuitorilor din zonă.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
