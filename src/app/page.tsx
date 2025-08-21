'use client';

import { useState, useEffect, useCallback } from 'react';
import dynamic from 'next/dynamic';
import type { VotableLocation, Location } from '@/types/geopoint';
import { VotingStore } from '@/lib/votingStore';
import { VotingModal } from '@/components/voting/VotingModals';

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
  const [votableLocations, setVotableLocations] = useState<VotableLocation[]>([]);
  const [selectedLocation, setSelectedLocation] = useState<VotableLocation | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const votingStore = VotingStore.getInstance();

  const loadVotableLocations = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Fetch votable locations
      const locations = await votingStore.fetchVotableLocations();
      
      // Sync user votes and mark which pins user has voted for
      const votedPins = await votingStore.syncUserVotes();
      
      // Add userHasVoted flag to each location
      const locationsWithVoteStatus = locations.map(location => ({
        ...location,
        userHasVoted: votedPins.includes(location.id)
      }));
      
      setVotableLocations(locationsWithVoteStatus);
    } catch (error) {
      console.error('Error loading votable locations:', error);
      setError(error instanceof Error ? error.message : 'Eroare la încărcarea locațiilor');
    } finally {
      setLoading(false);
    }
  }, [votingStore]);

  // Load votable locations on mount
  useEffect(() => {
    loadVotableLocations();
  }, [loadVotableLocations]);

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

  // Handle pin clicks to open voting modal
  const handlePinClick = useCallback((location: VotableLocation | Location) => {
    // Type guard to ensure we only handle VotableLocation in voting mode
    if ('isVotable' in location && location.isVotable) {
      setSelectedLocation(location as VotableLocation);
    }
  }, []);

  // Handle successful vote
  const handleVoteSuccess = useCallback((geopointId: string, newVoteCount: number) => {
    // Update the location in our state
    setVotableLocations(prev => prev.map(loc => 
      loc.id === geopointId 
        ? { ...loc, voteCount: newVoteCount, userHasVoted: true }
        : loc
    ));
    
    // Close modal
    setSelectedLocation(null);
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

  // Show error state
  if (error && !loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-400 to-red-600 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg p-6 max-w-md w-full text-center">
          <h2 className="text-xl font-semibold mb-4 text-red-600">Eroare</h2>
          <p className="text-gray-700 mb-4">{error}</p>
          <button 
            onClick={loadVotableLocations}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Încearcă din nou
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
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
        onPinClick={handlePinClick}
      />
      
      {/* Voting Modal */}
      <VotingModal
        location={selectedLocation}
        onClose={() => setSelectedLocation(null)}
        onVoteSuccess={handleVoteSuccess}
      />
    </>
  );
}