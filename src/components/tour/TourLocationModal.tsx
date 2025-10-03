'use client';

import { useEffect, useCallback } from 'react';
import Image from 'next/image';
import { X, ExternalLink } from 'lucide-react';
import type { TourLocation } from '@/types/geopoint';
import { processVelostradaLinks } from '@/lib/processVelostradaLinks';

interface TourLocationModalProps {
  location: TourLocation | null;
  onClose: () => void;
  onVelostradaClick?: () => void;
}

export function TourLocationModal({ location, onClose, onVelostradaClick }: TourLocationModalProps) {
  // ESC key handling
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const handleImageClick = useCallback(() => {
    if (location?.youtubeId) {
      window.open(`https://youtu.be/${location.youtubeId}`, '_blank');
    }
  }, [location?.youtubeId]);

  const handleLinkClick = useCallback(() => {
    if (location?.youtubeId) {
      window.open(`https://youtu.be/${location.youtubeId}`, '_blank');
    }
  }, [location?.youtubeId]);

  if (!location) return null;

  // Use postcard images from public/postcards/ directory based on slug
  // Note: splai doesn't have an image yet
  const imageUrl = location.slug && location.slug !== 'splai' 
    ? `/postcards/${location.slug}.jpg` 
    : null;

  return (
    <>
      {/* Main Modal */}
      <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 md:p-6 lg:p-8">
        {/* Backdrop */}
        <div className="absolute inset-0 bg-black/50" onClick={onClose} />

        {/* Modal container */}
        <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-6xl xl:max-w-7xl max-h-[90vh] overflow-hidden flex flex-col">
          {/* Close button */}
          <button
            className="absolute top-4 right-4 z-10 p-2.5 rounded-full hover:bg-black/5"
            aria-label="Închide"
            onClick={onClose}
          >
            <X size={20} />
          </button>

          {/* Two-column layout (stack on mobile) */}
          <div className="grid grid-cols-1 md:grid-cols-5 flex-1 min-h-0">
            {/* Image column */}
            <div
              className={`relative bg-gray-100 min-h-[42vh] md:min-h-[24rem] lg:min-h-[30rem] md:col-span-3 ${
                location.youtubeId ? 'cursor-pointer' : ''
              }`}
              onClick={handleImageClick}
            >
              {imageUrl ? (
                <>
                  <Image
                    src={imageUrl}
                    alt={location.title}
                    fill
                    priority={false}
                    sizes="(max-width: 768px) 100vw, (max-width: 1280px) 60vw, 65vw"
                    className="object-cover"
                  />
                  {location.youtubeId && (
                    <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
                      <div className="bg-white/90 rounded-full p-3">
                        <ExternalLink size={24} className="text-gray-800" />
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-400">
                  <span className="text-sm">Fără imagine</span>
                </div>
              )}
            </div>

            {/* Content column */}
            <div className="md:col-span-2 flex flex-col min-h-0">
              <div className="p-6 md:p-8 lg:p-10 flex flex-col h-full">
                {/* Fixed header */}
                <div className="flex-shrink-0 mb-5">
                  <h3 className="text-2xl lg:text-3xl font-semibold leading-tight tracking-tight">{location.title}</h3>
                  {location.submittedByName && (
                    <p className="text-sm text-gray-600 mt-1">{location.submittedByName}</p>
                  )}
                </div>

                {/* Scrollable description */}
                <div className="flex-1 min-h-0 mb-5">
                  <div 
                    className="h-full overflow-y-auto pr-2"
                    style={{
                      scrollbarWidth: 'thin',
                      scrollbarColor: '#d1d5db #f3f4f6'
                    }}
                  >
                    <div className="prose prose-gray max-w-none">
                      <p className="text-gray-700 text-[0.95rem] leading-relaxed whitespace-pre-line">
                        {onVelostradaClick && location.description
                          ? processVelostradaLinks(location.description, onVelostradaClick)
                          : location.description}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Fixed footer with link button */}
                {location.youtubeId && (
                  <div className="flex-shrink-0">
                    <button
                      onClick={handleLinkClick}
                      className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-blue-600 text-white hover:bg-blue-700 active:bg-blue-800 shadow-sm transition-colors"
                    >
                      <ExternalLink size={18} />
                      Vezi în 360°
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

    </>
  );
}
