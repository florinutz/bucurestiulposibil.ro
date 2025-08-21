'use client';

import { useState } from 'react';
import { X, Vote, CheckCircle2 } from 'lucide-react';
import type { VotableLocation } from '@/types/geopoint';
import { VotingStore } from '@/lib/votingStore';

interface VotingModalProps {
  location: VotableLocation | null;
  onClose: () => void;
  onVoteSuccess: (geopointId: string, newVoteCount: number) => void;
}

/**
 * Main voting modal that shows location details and allows voting
 */
export function VotingModal({ location, onClose, onVoteSuccess }: VotingModalProps) {
  const [isVoting, setIsVoting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [newVoteCount, setNewVoteCount] = useState<number | null>(null);
  
  const votingStore = VotingStore.getInstance();

  if (!location) return null;

  const handleVote = async () => {
    if (votingStore.hasVoted(location.id)) {
      setError('Ai votat deja pentru această locație');
      return;
    }

    setIsVoting(true);
    setError(null);

    try {
      const result = await votingStore.castVote(location.id);
      setNewVoteCount(result.newVoteCount);
      onVoteSuccess(location.id, result.newVoteCount);
      setShowSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Eroare la înregistrarea votului');
    } finally {
      setIsVoting(false);
    }
  };

  const handleSuccessClose = () => {
    setShowSuccess(false);
    setNewVoteCount(null);
    onClose();
  };

  if (showSuccess) {
    return (
      <VoteSuccessModal 
        onClose={handleSuccessClose} 
        voteCount={newVoteCount || location.voteCount}
        locationTitle={location.title}
      />
    );
  }

  const hasVoted = votingStore.hasVoted(location.id);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-[10000]">
      <div className="bg-white rounded-lg max-w-md w-full p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-start mb-4">
          <h3 className="text-lg font-semibold pr-4">{location.title}</h3>
          <button 
            onClick={onClose} 
            className="text-gray-500 hover:text-gray-700 flex-shrink-0"
            aria-label="Închide"
          >
            <X size={20} />
          </button>
        </div>
        
        <p className="text-gray-700 mb-4 leading-relaxed">{location.description}</p>
        
        <div className="bg-gray-50 p-3 rounded mb-4">
          <p className="text-sm text-gray-600 flex items-center gap-2">
            <Vote size={16} />
            <strong>Voturi primite:</strong> {location.voteCount}
          </p>
        </div>

        {location.submittedByName && (
          <div className="border-t pt-3 mb-4">
            <p className="text-sm font-medium text-gray-800">
              {location.submittedByName}
            </p>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded mb-4 flex items-start gap-2">
            <X size={16} className="mt-0.5 flex-shrink-0" />
            <span className="text-sm">{error}</span>
          </div>
        )}

        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 border border-gray-300 rounded hover:bg-gray-50 transition-colors"
          >
            Închide
          </button>
          <button
            onClick={handleVote}
            disabled={isVoting || hasVoted}
            className={`flex-1 px-4 py-2 rounded text-white transition-colors flex items-center justify-center gap-2 ${
              hasVoted 
                ? 'bg-gray-400 cursor-not-allowed' 
                : isVoting
                ? 'bg-green-400 cursor-wait'
                : 'bg-green-600 hover:bg-green-700'
            }`}
          >
            {isVoting ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                Se înregistrează...
              </>
            ) : hasVoted ? (
              <>
                <CheckCircle2 size={16} />
                Ai votat deja
              </>
            ) : (
              <>
                <Vote size={16} />
                Votează
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

interface VoteSuccessModalProps {
  onClose: () => void;
  voteCount: number;
  locationTitle: string;
}

/**
 * Success modal shown after successful vote
 */
export function VoteSuccessModal({ onClose, voteCount, locationTitle }: VoteSuccessModalProps) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-[10000]">
      <div className="bg-white rounded-lg max-w-md w-full p-6 text-center">
        <div className="text-6xl mb-4">🎉</div>
        <h3 className="text-xl font-semibold mb-2">Mulțumim pentru vot!</h3>
        <p className="text-gray-600 mb-2">
          Votul tău pentru <strong>&ldquo;{locationTitle}&rdquo;</strong> a fost înregistrat cu succes.
        </p>
        <p className="text-sm text-gray-500 mb-6">
          Total voturi pentru această locație: <strong>{voteCount}</strong>
        </p>
        <button
          onClick={onClose}
          className="px-6 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition-colors"
        >
          Închide
        </button>
      </div>
    </div>
  );
}

/**
 * Debug modal for testing voting functionality
 */
export function VotingDebugModal({ onClose }: { onClose: () => void }) {
  const votingStore = VotingStore.getInstance();
  const debugInfo = votingStore.getDebugInfo();

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-[10000]">
      <div className="bg-white rounded-lg max-w-lg w-full p-6">
        <div className="flex justify-between items-start mb-4">
          <h3 className="text-lg font-semibold">Voting Debug Info</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <X size={20} />
          </button>
        </div>
        
        <div className="space-y-4 text-sm">
          <div>
            <strong>Fingerprint Hash:</strong>
            <div className="font-mono bg-gray-100 p-2 rounded mt-1 break-all">
              {debugInfo.fingerprintHash}
            </div>
          </div>
          
          <div>
            <strong>Voted Pins:</strong>
            <div className="bg-gray-100 p-2 rounded mt-1">
              {debugInfo.votedPins.length > 0 ? (
                <ul className="list-disc list-inside">
                  {debugInfo.votedPins.map(pinId => (
                    <li key={pinId} className="font-mono">{pinId}</li>
                  ))}
                </ul>
              ) : (
                <span className="text-gray-500">No votes yet</span>
              )}
            </div>
          </div>
          
          <div>
            <strong>Browser Fingerprint:</strong>
            <div className="bg-gray-100 p-2 rounded mt-1 font-mono text-xs">
              <pre>{JSON.stringify(debugInfo.fingerprint, null, 2)}</pre>
            </div>
          </div>
        </div>

        <div className="flex gap-3 mt-6">
          <button
            onClick={() => {
              votingStore.clearLocalVotes();
              alert('Local voting data cleared!');
              onClose();
            }}
            className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 text-sm"
          >
            Clear Local Data
          </button>
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 border border-gray-300 rounded hover:bg-gray-50"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
