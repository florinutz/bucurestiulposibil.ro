'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { MapCore } from './MapCore';
import { MapControls, MapControlsRef } from './MapControls';
import { Modal } from './ModalSystem';
import Image from 'next/image';
import type { Location, VotableLocation, MapMode } from '@/types/geopoint';
import { VotingStore } from '@/lib/votingStore';

interface MapLayoutProps {
  mode: MapMode;
  center?: [number, number];
  zoom?: number;
  locations?: (Location | VotableLocation)[];
  children?: React.ReactNode;
  // Proposal mode props
  onSpecialPinPlaced?: (lat: number, lng: number) => void;
  specialPinCoords?: [number, number] | null;
  // Voting mode props
  onPinClick?: (location: Location | VotableLocation) => void;
  // Map controls
  onCenterChange?: (center: [number, number]) => void;
  onZoomChange?: (zoom: number) => void;
  // Welcome popup override
  showWelcomePopup?: boolean;
  onWelcomePopupDismiss?: () => void;
  welcomeContent?: React.ReactNode;
}

export function MapLayout({
  mode,
  center = [44.4268, 26.1025],
  zoom = 12,
  locations = [],
  children,
  onSpecialPinPlaced,
  specialPinCoords,
  onPinClick,
  onCenterChange,
  onZoomChange,
  showWelcomePopup = false,
  onWelcomePopupDismiss,
  welcomeContent
}: MapLayoutProps) {
  // Logo popup state
  const [showLogoPopup, setShowLogoPopup] = useState(false);
  const mapControlsRef = useRef<MapControlsRef>(null);
  
  // Voting indicator state
  const [votedLocation, setVotedLocation] = useState<{ id: string; title: string } | null>(null);

  // Handle logo click
  const handleLogoClick = useCallback(() => {
    setShowLogoPopup(true);
  }, []);

    // Handle map click in voting mode (act like ESC)
  const handleMapClick = useCallback(() => {
    if (mode === 'voting') {
      // Close any open modals when map is clicked in voting mode
      if (showLogoPopup) {
        setShowLogoPopup(false);
      } else if (showWelcomePopup && onWelcomePopupDismiss) {
        onWelcomePopupDismiss();
      }
      
      // Also collapse search/help controls (same as ESC key)
      if (mapControlsRef.current) {
        mapControlsRef.current.collapseAll();
      }
    }
  }, [mode, showLogoPopup, showWelcomePopup, onWelcomePopupDismiss]);

  // Check for voted location in voting mode
  useEffect(() => {
    if (mode === 'voting') {
      const votingStore = VotingStore.getInstance();
      const voted = votingStore.getVotedLocation();
      setVotedLocation(voted);
      
      // Set up a listener for localStorage changes (from other tabs/windows)
      const handleStorageChange = (e: StorageEvent) => {
        if (e.key === 'votedLocation') {
          const newVoted = e.newValue ? JSON.parse(e.newValue) : null;
          setVotedLocation(newVoted);
        }
      };

      // Set up a listener for immediate vote success events
      const handleVoteSuccess = (e: CustomEvent) => {
        const { locationId, locationTitle } = e.detail;
        setVotedLocation({ id: locationId, title: locationTitle });
      };
      
      window.addEventListener('storage', handleStorageChange);
      window.addEventListener('voteSuccess', handleVoteSuccess as EventListener);
      
      return () => {
        window.removeEventListener('storage', handleStorageChange);
        window.removeEventListener('voteSuccess', handleVoteSuccess as EventListener);
      };
    }
  }, [mode]);

  // ESC key handling
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (showLogoPopup) {
          setShowLogoPopup(false);
        } else if (showWelcomePopup && onWelcomePopupDismiss) {
          onWelcomePopupDismiss();
        }
        
        // Also collapse controls (this is handled by MapControls internally, 
        // but we ensure it happens even if controls don't handle it)
        if (mapControlsRef.current) {
          mapControlsRef.current.collapseAll();
        }
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showLogoPopup, showWelcomePopup, onWelcomePopupDismiss]);

  return (
    <main className="relative w-full h-screen overflow-hidden">
      {/* Preload image for logo popup */}
      <div className="hidden">
        <Image 
          src="/SpO-si-AFCN.jpg" 
          alt="Preload" 
          width={400} 
          height={200}
          priority
        />
      </div>
      
      {/* Map rendered first, z-0 */}
      <div className="absolute inset-0 z-0">
        <MapCore 
          center={center} 
          zoom={zoom} 
          className="w-full h-full"
          mode={mode}
          onSpecialPinPlaced={onSpecialPinPlaced}
          specialPinCoords={specialPinCoords}
          locations={locations}
          onPinClick={onPinClick}
          onMapClick={handleMapClick}
        />
      </div>

      {/* Logo - top left, z-20 */}
      <div className="pointer-events-none fixed top-4 left-4 z-20">
        <div className="pointer-events-auto bg-white/90 backdrop-blur-sm rounded-lg shadow-lg p-2 inline-block">
          <button onClick={handleLogoClick} className="cursor-pointer block">
            <Image 
              src="/BP-logo-site.png" 
              alt="Bucureștiul Posibil" 
              width={150} 
              height={45}
              className="h-auto max-w-full"
            />
          </button>
        </div>
      </div>

      {/* Map Controls: search, help, locate me */}
      <MapControls 
        ref={mapControlsRef}
        onCenterChange={onCenterChange}
        onZoomChange={onZoomChange}
        mode={mode}
      />

      {/* Voted Location Indicator - top right */}
      {mode === 'voting' && votedLocation && (
        <div className="pointer-events-none fixed top-4 right-4 z-20">
          <div className="pointer-events-auto bg-white/95 backdrop-blur-sm rounded-lg shadow-lg p-3 max-w-xs">
            <div className="flex items-center gap-2 text-sm">
              <span className="text-green-600 font-medium">✓ Votul tău:</span>
            </div>
            <div className="font-medium text-gray-800 text-sm mt-1">
              {votedLocation.title}
            </div>
          </div>
        </div>
      )}

      {/* Page-specific content (e.g., add button, voting UI, etc.) */}
      {children}

      {/* Logo Popup Modal */}
      <Modal 
        isOpen={showLogoPopup} 
        onClose={() => setShowLogoPopup(false)}
        title="Bucureștiul Posibil"
        size="md"
      >
        <div className="text-center space-y-4">
          <p className="text-gray-600">
            Platformă de angajare civică pentru îmbunătățirea orașului București.
          </p>
          <div>
            <Image 
              src="/SpO-si-AFCN.jpg" 
              alt="SpO și AFCN" 
              width={300} 
              height={150}
              className="mx-auto rounded"
            />
          </div>
          <p className="text-sm text-gray-500">
            Proiect realizat cu sprijinul Administrației Fondului Cultural Național (AFCN)
          </p>
        </div>
      </Modal>

      {/* Welcome Popup (if provided) */}
      {showWelcomePopup && welcomeContent && (
        <div
          className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"
          onClick={onWelcomePopupDismiss}
        >
          <div 
            className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md" 
            onClick={e => e.stopPropagation()}
          >
            {welcomeContent}
          </div>
        </div>
      )}
    </main>
  );
}
