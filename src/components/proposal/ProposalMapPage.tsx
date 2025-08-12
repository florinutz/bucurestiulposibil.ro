'use client';

import { useState, useEffect, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { Modal } from '../shared/ModalSystem';
import type { Location } from '@/types/geopoint';

// Dynamically import MapLayout to ensure consistent SSR handling
const MapLayout = dynamic(() => import('../shared/MapLayout').then(mod => ({ default: mod.MapLayout })), {
  ssr: false,
  loading: () => (
    <div className="min-h-screen bg-gradient-to-br from-green-400 to-blue-500 flex items-center justify-center">
      <div className="text-white text-xl">Se încarcă harta...</div>
    </div>
  )
});

interface MapPageProps {
  initialCenter?: [number, number];
  initialZoom?: number;
}

export default function ProposalMapPage({ 
  initialCenter = [44.4268, 26.1025], // Bucharest center coordinates
  initialZoom = 13
}: MapPageProps) {
  const [center, setCenter] = useState<[number, number]>(initialCenter);
  const [zoom, setZoom] = useState(initialZoom);
  const [locations, setLocations] = useState<Location[]>([]);

  // Special pin state
  const [specialPinCoords, setSpecialPinCoords] = useState<[number, number] | null>(null);

  // Proposal dialog state
  const [showProposalForm, setShowProposalForm] = useState(false);
  const [proposalData, setProposalData] = useState({ 
    title: '', 
    description: '', 
    name: '',
    email: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Welcome popup state
  const [showSiteLoadPopup, setShowSiteLoadPopup] = useState(false);

  // Load locations on mount
  useEffect(() => {
    const loadLocations = async () => {
      try {
        const response = await fetch('/api/geopoints');
        if (response.ok) {
          const data = await response.json() as { success: boolean; count: number; pins: Array<{
            id: string; title: string; description?: string; lat: number; lng: number;
            created_at: string; submitted_by_name?: string;
          }> };
          
          if (data.success && data.pins) {
            const loadedLocations = data.pins.map(point => ({
              id: point.id,
              title: point.title,
              description: point.description || '',
              lat: point.lat,
              lng: point.lng,
              status: 'approved' as const,
              createdAt: new Date(point.created_at),
              submittedByName: point.submitted_by_name || undefined
            }));
            setLocations(loadedLocations);
          } else {
            console.error('Invalid response format from geopoints API');
          }
        } else {
          console.error('Failed to load locations from geopoints API');
        }
      } catch (error) {
        console.error('Error loading locations:', error);
      }
    };
    loadLocations();
  }, []);

  // Check for site load popup on mount
  useEffect(() => {
    const lastShown = localStorage.getItem('site-load-popup-last-shown');
    const now = new Date().getTime();
    const oneMonth = 30 * 24 * 60 * 60 * 1000; // 30 days in milliseconds
    
    if (!lastShown || (now - parseInt(lastShown)) > oneMonth) {
      setShowSiteLoadPopup(true);
    }
  }, []);

  // Handle site load popup dismiss
  const handleSiteLoadPopupDismiss = useCallback(() => {
    setShowSiteLoadPopup(false);
    localStorage.setItem('site-load-popup-last-shown', new Date().getTime().toString());
  }, []);

  // Special pin placement handler
  const handleSpecialPinPlaced = useCallback((lat: number, lng: number) => {
    setSpecialPinCoords([lat, lng]);
  }, []);

  // Add location button handler
  const handleAddLocationClick = useCallback(() => {
    if (!specialPinCoords) {
      alert('Te rog să faci click pe hartă mai întâi pentru a plasa un pin, apoi apasă butonul + pentru a adăuga o locație.');
      return;
    }
    
    if (process.env.NEXT_PUBLIC_DISABLE_PROPOSALS === 'true') {
      alert('Propunerile de locații sunt dezactivate.');
      return;
    }
    
    setShowProposalForm(true);
  }, [specialPinCoords]);

  // Clear error when modal is opened
  useEffect(() => {
    if (showProposalForm) {
      setSubmitError(null);
    }
  }, [showProposalForm]);

  const handleProposalSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!specialPinCoords) return;

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const proposalPayload = {
        title: proposalData.title,
        description: proposalData.description,
        location: {
          lat: specialPinCoords[0],
          lng: specialPinCoords[1]
        },
        submittedBy: {
          name: proposalData.name,
          email: proposalData.email
        }
      };

      const response = await fetch('/api/propose-point', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(proposalPayload),
      });

      const result = await response.json() as { success?: boolean; error?: string; message?: string; id?: string };

      if (!response.ok) {
        throw new Error(result.error || 'Failed to submit proposal');
      }

      setShowProposalForm(false);
      setShowProposalSuccess(true);
      setProposalData({ title: '', description: '', name: '', email: '' });
      setSpecialPinCoords(null);
      
      // Refresh locations after successful proposal
      setTimeout(async () => {
        try {
          const response = await fetch('/api/geopoints');
          if (response.ok) {
            const data = await response.json() as { success: boolean; count: number; pins: Array<{
              id: string; title: string; description?: string; lat: number; lng: number;
              created_at: string; submitted_by_name?: string;
            }> };
            
            if (data.success && data.pins) {
              const refreshedLocations = data.pins.map(point => ({
                id: point.id,
                title: point.title,
                description: point.description || '',
                lat: point.lat,
                lng: point.lng,
                status: 'approved' as const,
                createdAt: new Date(point.created_at),
                submittedByName: point.submitted_by_name || undefined
              }));
              setLocations(refreshedLocations);
            }
          }
        } catch (error) {
          console.error('Error refreshing locations:', error);
        }
      }, 1000);
      
    } catch (error) {
      console.error('Error submitting proposal:', error);
      setSubmitError(error instanceof Error ? error.message : 'Failed to submit proposal');
    } finally {
      setIsSubmitting(false);
    }
  }, [specialPinCoords, proposalData]);

  // Success modal state
  const [showProposalSuccess, setShowProposalSuccess] = useState(false);

  // Welcome popup content
  const welcomeContent = (
    <>
      <div className="text-center">
        <h3 className="text-lg font-semibold mb-4">Bucureștiul Posibil</h3>
        <p className="text-gray-600 mb-4">
          Salut! Pentru a propune o nouă locație, fă click pe hartă pentru a plasa un pin, apoi apasă butonul &ldquo;+&rdquo; pentru a completa detaliile.
        </p>
        <button
          onClick={handleSiteLoadPopupDismiss}
          className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
        >
          Am înțeles
        </button>
      </div>
    </>
  );


  
  return (
    <MapLayout
      mode="proposal"
      center={center}
      zoom={zoom}
      locations={locations}
      onSpecialPinPlaced={handleSpecialPinPlaced}
      specialPinCoords={specialPinCoords}
      onCenterChange={setCenter}
      onZoomChange={setZoom}
      showWelcomePopup={showSiteLoadPopup}
      onWelcomePopupDismiss={handleSiteLoadPopupDismiss}
      welcomeContent={welcomeContent}
    >
      {/* Add Location Button: top right, z-30 */}
      <div className="fixed top-4 right-4 z-30 pointer-events-auto">
        <button
          onClick={handleAddLocationClick}
          className={`p-3 rounded-lg shadow-lg border transition-all duration-200 ${
            specialPinCoords 
              ? 'bg-green-500 hover:bg-green-600 text-white border-green-600 cursor-pointer' 
              : 'bg-white/90 backdrop-blur-sm text-gray-700 border-gray-200 hover:bg-white'
          } ${specialPinCoords ? 'animate-wobble' : ''}`}
          title={specialPinCoords ? "Add location at pinned coordinates" : "Click on map first to place a pin"}
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
        </button>
      </div>

      {/* Proposal Dialog/Modal */}
      <Modal 
        isOpen={showProposalForm} 
        onClose={() => setShowProposalForm(false)}
        title="Propune o nouă locație"
        size="md"
      >
        <form onSubmit={handleProposalSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Titlu:
            </label>
            <input
              type="text"
              required
              disabled={isSubmitting}
              value={proposalData.title}
              onChange={(e) => setProposalData({ ...proposalData, title: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
              placeholder="Introdu titlul locației"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Cum ți-ai dori tu ca locul respectiv să se schimbe:
            </label>
            <textarea
              required
              disabled={isSubmitting}
              value={proposalData.description}
              onChange={(e) => setProposalData({ ...proposalData, description: e.target.value })}
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
              placeholder="Descrie schimbarea pe care o propui..."
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Numele tău (opțional):
            </label>
            <input
              type="text"
              disabled={isSubmitting}
              value={proposalData.name}
              onChange={(e) => setProposalData({ ...proposalData, name: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
              placeholder="Introdu numele tău"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email (opțional):
            </label>
            <input
              type="email"
              disabled={isSubmitting}
              value={proposalData.email}
              onChange={(e) => setProposalData({ ...proposalData, email: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
              placeholder="Introdu adresa de email"
            />
          </div>
          {submitError && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded">
              {submitError}
            </div>
          )}
          <div className="flex gap-3">
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition-colors disabled:bg-blue-400 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <>
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white inline" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Se trimite...
                </>
              ) : (
                'Trimite'
              )}
            </button>
            <button
              type="button"
              disabled={isSubmitting}
              onClick={() => setShowProposalForm(false)}
              className="flex-1 bg-gray-300 text-gray-700 py-2 px-4 rounded-md hover:bg-gray-400 transition-colors disabled:bg-gray-200 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
          </div>
        </form>
      </Modal>

      {/* Success Modal with Fireworks */}
      {showProposalSuccess && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm"></div>
          
          {/* Fireworks Animation */}
          <div className="absolute inset-0 pointer-events-none">
            {/* Firework 1 */}
            <div className="absolute top-1/4 left-1/4 animate-ping">
              <div className="w-2 h-2 bg-yellow-400 rounded-full"></div>
            </div>
            <div className="absolute top-1/4 left-1/4 animate-ping" style={{ animationDelay: '0.5s' }}>
              <div className="w-1 h-1 bg-red-400 rounded-full"></div>
            </div>
            
            {/* Firework 2 */}
            <div className="absolute top-1/3 right-1/4 animate-ping" style={{ animationDelay: '0.3s' }}>
              <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
            </div>
            <div className="absolute top-1/3 right-1/4 animate-ping" style={{ animationDelay: '0.8s' }}>
              <div className="w-1 h-1 bg-green-400 rounded-full"></div>
            </div>
            
            {/* Firework 3 */}
            <div className="absolute bottom-1/3 left-1/3 animate-ping" style={{ animationDelay: '0.7s' }}>
              <div className="w-2 h-2 bg-purple-400 rounded-full"></div>
            </div>
            <div className="absolute bottom-1/3 left-1/3 animate-ping" style={{ animationDelay: '1.2s' }}>
              <div className="w-1 h-1 bg-pink-400 rounded-full"></div>
            </div>
            
            {/* Firework 4 */}
            <div className="absolute top-1/2 right-1/3 animate-ping" style={{ animationDelay: '1s' }}>
              <div className="w-2 h-2 bg-orange-400 rounded-full"></div>
            </div>
            <div className="absolute top-1/2 right-1/3 animate-ping" style={{ animationDelay: '1.5s' }}>
              <div className="w-1 h-1 bg-yellow-300 rounded-full"></div>
            </div>
            
            {/* Firework 5 */}
            <div className="absolute bottom-1/4 right-1/4 animate-ping" style={{ animationDelay: '0.2s' }}>
              <div className="w-2 h-2 bg-cyan-400 rounded-full"></div>
            </div>
            <div className="absolute bottom-1/4 right-1/4 animate-ping" style={{ animationDelay: '0.9s' }}>
              <div className="w-1 h-1 bg-indigo-400 rounded-full"></div>
            </div>
          </div>
          
          {/* Modal Content */}
          <div className="relative bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full mx-4 transform transition-all duration-300 scale-100">
            {/* Success Icon */}
            <div className="flex justify-center mb-6">
              <div className="w-20 h-20 bg-gradient-to-r from-green-400 to-blue-500 rounded-full flex items-center justify-center animate-bounce">
                <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </svg>
              </div>
            </div>
            
            {/* Success Message */}
            <div className="text-center mb-6">
              <h3 className="text-2xl font-bold text-gray-800 mb-2">Îți mulțumim! 🎉</h3>
              <p className="text-gray-600">
                Propunerea ta a fost trimisă și va deveni vizibilă pe hartă de îndată ce va fi aprobată de un moderator!
              </p>
            </div>
            
            {/* Close Button */}
            <div className="flex justify-center">
              <button
                onClick={() => setShowProposalSuccess(false)}
                className="bg-gradient-to-r from-blue-500 to-purple-600 text-white px-8 py-3 rounded-lg font-semibold hover:from-blue-600 hover:to-purple-700 transition-all duration-200 transform hover:scale-105 shadow-lg"
              >
                Ok
              </button>
            </div>
          </div>
        </div>
      )}
    </MapLayout>
  );
}