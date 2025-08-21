'use client';

import { useState, useEffect, useCallback } from 'react';
import dynamic from 'next/dynamic';
import type { Location } from '@/types/geopoint';

// Dynamically import MapLayout
const MapLayout = dynamic(() => import('../components/shared/MapLayout').then(mod => ({ default: mod.MapLayout })), {
  ssr: false,
  loading: () => (
    <div className="min-h-screen bg-gradient-to-br from-green-400 to-blue-500 flex items-center justify-center">
      <div className="text-white text-xl">Se încarcă harta...</div>
    </div>
  )
});

export default function VotingPage() {
  const [center, setCenter] = useState<[number, number]>([44.4268, 26.1025]);
  const [zoom, setZoom] = useState(13);
  const [showWelcomePopup, setShowWelcomePopup] = useState(false);
  const [votableLocations, setVotableLocations] = useState<Location[]>([]);

  // Load votable locations on mount
  useEffect(() => {
    const loadVotableLocations = async () => {
      try {
        const response = await fetch('/api/voting/geopoints');
        if (response.ok) {
          const data = await response.json() as { locations: Location[]; total: number };
          setVotableLocations(data.locations || []);
        } else {
          console.error('Failed to load votable locations');
        }
      } catch (error) {
        console.error('Error loading votable locations:', error);
      }
    };

    loadVotableLocations();
  }, []);

  // Welcome popup logic
  useEffect(() => {
    const lastShown = localStorage.getItem('voting-welcome-shown');
    const now = new Date().getTime();
    const oneMonth = 30 * 24 * 60 * 60 * 1000; // 30 days in milliseconds

    if (!lastShown || (now - parseInt(lastShown)) > oneMonth) {
      setShowWelcomePopup(true);
    }
  }, []);

  const handleWelcomePopupDismiss = useCallback(() => {
    setShowWelcomePopup(false);
    localStorage.setItem('voting-welcome-shown', new Date().getTime().toString());
  }, []);

  // Welcome content for voting phase
  const welcomeContent = (
    <>
      <div className="text-center">
        <h3 className="text-lg font-semibold mb-4">Bucureștiul Posibil - Faza de Vot</h3>
        <p className="text-gray-600 mb-4">
          Salut! În această fază puteți vota pentru locațiile propuse care vor fi afișate pe hartă. Faceți click pe pin-urile pentru a vedea detaliile și a vota.
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
    <MapLayout 
      mode="voting"
      center={center}
      zoom={zoom}
      onCenterChange={setCenter}
      onZoomChange={setZoom}
      showWelcomePopup={showWelcomePopup}
      onWelcomePopupDismiss={handleWelcomePopupDismiss}
      welcomeContent={welcomeContent}
      locations={votableLocations}
    />
  );
}