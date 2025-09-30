'use client';

import { useState, useEffect, useCallback } from 'react';
import dynamic from 'next/dynamic';
import type { Location, TourLocation } from '@/types/geopoint';
import { TourLocationModal } from '@/components/tour/TourLocationModal';
import { getYoutubeIdForPin } from '@/lib/tourVideoMappings';

// Dynamically import MapLayout
const MapLayout = dynamic(() => import('../../components/shared/MapLayout').then(mod => ({ default: mod.MapLayout })), {
  ssr: false,
  loading: () => (
    <div className="min-h-screen bg-gradient-to-br from-green-400 to-blue-500 flex items-center justify-center">
      <div className="text-white text-xl">Se încarcă harta...</div>
    </div>
  )
});

export default function TourPage() {
  const [center, setCenter] = useState<[number, number]>([44.4268, 26.1025]);
  const [zoom, setZoom] = useState(13);
  const [showWelcomePopup, setShowWelcomePopup] = useState(false);
  const [tourLocations, setTourLocations] = useState<TourLocation[]>([]);
  const [selectedLocation, setSelectedLocation] = useState<TourLocation | null>(null);

  // Load tour locations on mount (using the same endpoint as geopoints, but adding YouTube IDs)
  useEffect(() => {
    const loadTourLocations = async () => {
      try {
        const response = await fetch('/api/geopoints');
        if (response.ok) {
          const data = await response.json() as { pins?: Location[]; locations?: Location[]; total?: number; count?: number };
          // Handle both response structures (pins or locations)
          const pins = data.pins || data.locations || [];
          // Map locations to tour locations with YouTube IDs
          const locationsWithVideos: TourLocation[] = pins.map(loc => ({
            ...loc,
            youtubeId: getYoutubeIdForPin(loc.id)
          }));
          // Only show locations that have YouTube videos
          const locationsWithVideosOnly = locationsWithVideos.filter(loc => loc.youtubeId);
          setTourLocations(locationsWithVideosOnly);
        } else {
          console.error('Failed to load tour locations');
        }
      } catch (error) {
        console.error('Error loading tour locations:', error);
      }
    };

    loadTourLocations();
  }, []);

  // Welcome popup logic
  useEffect(() => {
    const lastShown = localStorage.getItem('tour-welcome-shown');
    const now = new Date().getTime();
    const oneMonth = 30 * 24 * 60 * 60 * 1000; // 30 days in milliseconds

    if (!lastShown || (now - parseInt(lastShown)) > oneMonth) {
      setShowWelcomePopup(true);
    }
  }, []);

  const handleWelcomePopupDismiss = useCallback(() => {
    setShowWelcomePopup(false);
    localStorage.setItem('tour-welcome-shown', new Date().getTime().toString());
  }, []);

  // Welcome content for tour phase
  const welcomeContent = (
    <>
      <div className="text-center">
        <h3 className="text-lg font-semibold mb-4">Bucureștiul Posibil - Tur Virtual 360°</h3>
        <p className="text-gray-600 mb-4">
          Bine ai venit! Explorează locațiile propuse prin tururi virtuale interactive în 360°. 
          Faceți click pe pinuri pentru a vizualiza locațiile într-un mod captivant.
        </p>
        <button
          onClick={handleWelcomePopupDismiss}
          className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
        >
          Am înțeles
        </button>
      </div>
    </>
  );

  return (
    <>
      <MapLayout 
        mode="tour"
        center={center}
        zoom={zoom}
        onCenterChange={setCenter}
        onZoomChange={setZoom}
        showWelcomePopup={showWelcomePopup}
        onWelcomePopupDismiss={handleWelcomePopupDismiss}
        welcomeContent={welcomeContent}
        locations={tourLocations}
        onPinClick={(loc) => setSelectedLocation(loc as TourLocation)}
      />

      <TourLocationModal 
        location={selectedLocation}
        onClose={() => setSelectedLocation(null)}
      />
    </>
  );
}
