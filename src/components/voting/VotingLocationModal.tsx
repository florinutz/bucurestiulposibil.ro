'use client';

import Image from 'next/image';
import { X, Vote, CheckCircle2 } from 'lucide-react';
import type { VotableLocation } from '@/types/geopoint';
import { VotingStore } from '@/lib/votingStore';
import { getLocationImageUrl } from '@/lib/locationImages';

interface VotingLocationModalProps {
  location: VotableLocation | null;
  onClose: () => void;
  onVoteSuccess: (geopointId: string, newVoteCount: number) => void;
}

export function VotingLocationModal({ location, onClose, onVoteSuccess }: VotingLocationModalProps) {
  if (!location) return null;

  const votingStore = VotingStore.getInstance();
  const hasVotedAnywhere = votingStore.hasVoted();
  const hasVotedThis = votingStore.hasVoted(location.id);
  const imageUrl = getLocationImageUrl(location.id);

  const handleVote = async () => {
    if (hasVotedAnywhere) return;
    const result = await votingStore.castVote(location.id, location.title);
    onVoteSuccess(location.id, result.newVoteCount);
  };

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 md:p-6 lg:p-8">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />

      {/* Modal container */}
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-6xl xl:max-w-7xl overflow-hidden">
        {/* Close button */}
        <button
          className="absolute top-4 right-4 z-10 p-2.5 rounded-full hover:bg-black/5"
          aria-label="Închide"
          onClick={onClose}
        >
          <X size={20} />
        </button>

        {/* Two-column layout (stack on mobile) */}
        <div className="grid grid-cols-1 md:grid-cols-5">
          {/* Image column */}
          <div className="relative bg-gray-100 min-h-[42vh] md:min-h-[24rem] lg:min-h-[30rem] md:col-span-3">
            {imageUrl ? (
              // Next/Image with fill for cover behavior
              <Image
                src={imageUrl}
                alt={location.title}
                fill
                priority={false}
                sizes="(max-width: 768px) 100vw, (max-width: 1280px) 60vw, 65vw"
                className="object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-gray-400">
                <span className="text-sm">Fără imagine</span>
              </div>
            )}
          </div>

          {/* Content column */}
          <div className="p-6 md:p-8 lg:p-10 space-y-5 md:col-span-2">
            <div>
              <h3 className="text-2xl lg:text-3xl font-semibold leading-tight tracking-tight">{location.title}</h3>
              {location.submittedByName && (
                <p className="text-sm text-gray-600 mt-1">{location.submittedByName}</p>
              )}
            </div>

            <p className="text-gray-700 text-[0.95rem] leading-relaxed whitespace-pre-line">
              {location.description}
            </p>

            <div className="bg-gray-50 rounded-lg p-3 text-sm text-gray-700 inline-flex items-center gap-2 shadow-sm">
              <Vote size={16} />
              <strong>Voturi primite:</strong>
              <span>{location.voteCount}</span>
            </div>

            <div>
              {!hasVotedAnywhere ? (
                <button
                  onClick={handleVote}
                  className="mt-3 inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-green-600 text-white hover:bg-green-700 active:bg-green-800 shadow-sm"
                >
                  <Vote size={16} />
                  Votează
                </button>
              ) : hasVotedThis ? (
                <div className="mt-3 inline-flex items-center gap-2 text-green-700">
                  <CheckCircle2 size={18} />
                  Ai votat această locație
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}


