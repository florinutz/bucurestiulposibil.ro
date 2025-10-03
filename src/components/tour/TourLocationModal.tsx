'use client';

import { useEffect, useState, useCallback } from 'react';
import Image from 'next/image';
import { X, Maximize2, ExternalLink } from 'lucide-react';
import type { TourLocation } from '@/types/geopoint';
import { processVelostradaLinks } from '@/lib/processVelostradaLinks';
import { useIsMobile } from '@/lib/useIsMobile';

interface TourLocationModalProps {
  location: TourLocation | null;
  onClose: () => void;
  onVelostradaClick?: () => void;
}

export function TourLocationModal({ location, onClose, onVelostradaClick }: TourLocationModalProps) {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const isMobile = useIsMobile();

  // ESC key handling
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (isFullscreen) {
          setIsFullscreen(false);
        } else {
          onClose();
        }
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose, isFullscreen]);

  const handleImageClick = useCallback(() => {
    if (location?.youtubeId) {
      setIsFullscreen(true);
    }
  }, [location?.youtubeId]);

  const handleFullscreenClick = useCallback(() => {
    if (location?.youtubeId) {
      setIsFullscreen(true);
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
                location.youtubeId ? 'cursor-pointer group' : ''
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
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all duration-300 flex items-center justify-center">
                      <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-white/90 rounded-full p-4">
                        <Maximize2 size={32} className="text-gray-800" />
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

                {/* Fixed footer with fullscreen button */}
                {location.youtubeId && (
                  <div className="flex-shrink-0">
                    <button
                      onClick={handleFullscreenClick}
                      className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-blue-600 text-white hover:bg-blue-700 active:bg-blue-800 shadow-sm transition-colors"
                    >
                      <Maximize2 size={18} />
                      Vezi în 360°
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Fullscreen Video Modal */}
      {isFullscreen && location.youtubeId && (
        <div className="fixed inset-0 z-[20000] bg-black flex items-center justify-center">
          {/* Close button */}
          <button
            className="absolute top-4 right-4 z-10 p-2.5 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
            aria-label="Închide"
            onClick={() => setIsFullscreen(false)}
          >
            <X size={24} />
          </button>

          {/* YouTube iframe for desktop, link for mobile */}
          <div className="w-full h-full max-w-[95vw] max-h-[95vh] flex items-center justify-center">
            {isMobile ? (
              // Mobile: Show link that opens in new tab
              <a
                href={`https://youtu.be/${location.youtubeId}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-3 px-8 py-4 rounded-lg bg-red-600 hover:bg-red-700 text-white text-lg font-medium transition-colors shadow-lg"
                onClick={() => setIsFullscreen(false)}
              >
                <ExternalLink size={24} />
                Vezi în YouTube
              </a>
            ) : (
              // Desktop: Show embedded iframe
              <iframe
                width="100%"
                height="100%"
                src={`https://www.youtube-nocookie.com/embed/${location.youtubeId}?autoplay=1&controls=1`}
                title={location.title}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                referrerPolicy="strict-origin-when-cross-origin"
                allowFullScreen
                className="w-full h-full"
              />
            )}
          </div>
        </div>
      )}
    </>
  );
}
