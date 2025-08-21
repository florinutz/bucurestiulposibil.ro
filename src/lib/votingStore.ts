import type { VotableLocation, BrowserFingerprint, VoteRequest, VoteResponse, UserVotesResponse } from '@/types/geopoint';
import { generateBrowserFingerprint, getFingerprintHash } from './browserFingerprint';

const VOTED_LOCATION_KEY = 'votedLocation'; // Changed from multiple pins to single location
const FINGERPRINT_KEY = 'browserFingerprint';

/**
 * Store for managing voting state and interactions with the voting API.
 * Implements localStorage caching and browser fingerprinting for fraud prevention.
 */
export class VotingStore {
  private static instance: VotingStore;
  private cachedFingerprint: BrowserFingerprint | null = null;
  
  static getInstance(): VotingStore {
    if (!VotingStore.instance) {
      VotingStore.instance = new VotingStore();
    }
    return VotingStore.instance;
  }

  /**
   * Get or generate browser fingerprint, with localStorage caching
   */
  getBrowserFingerprint(): BrowserFingerprint {
    if (this.cachedFingerprint) {
      return this.cachedFingerprint;
    }

    if (typeof window !== 'undefined') {
      // Try to load from localStorage first
      const stored = localStorage.getItem(FINGERPRINT_KEY);
      if (stored) {
        try {
          this.cachedFingerprint = JSON.parse(stored);
          return this.cachedFingerprint!;
        } catch {
          // Invalid stored data, fall through to generate new
        }
      }
    }

    // Generate new fingerprint
    this.cachedFingerprint = generateBrowserFingerprint();
    
    // Store in localStorage
    if (typeof window !== 'undefined') {
      localStorage.setItem(FINGERPRINT_KEY, JSON.stringify(this.cachedFingerprint));
    }

    return this.cachedFingerprint;
  }

  /**
   * Fetch all votable locations from the API
   */
  async fetchVotableLocations(): Promise<VotableLocation[]> {
    try {
      const response = await fetch('/api/voting/geopoints');
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json() as { locations: VotableLocation[] };
      return data.locations || [];
    } catch (error) {
      console.error('Failed to fetch votable locations:', error);
      throw new Error('Eroare la încărcarea locațiilor disponibile pentru vot');
    }
  }

  /**
   * Cast a vote for a specific pin (only one vote allowed total)
   */
  async castVote(geopointId: string, locationTitle: string): Promise<{ success: boolean; newVoteCount: number }> {
    try {
      // Check if user has already voted
      if (this.hasVoted()) {
        throw new Error('Ai votat deja. Poți vota doar pentru o singură locație.');
      }

      const browserFingerprint = this.getBrowserFingerprint();
      
      const requestData: VoteRequest = {
        geopointId,
        browserFingerprint
      };

      const response = await fetch('/api/voting/vote', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestData)
      });
      
      if (!response.ok) {
        const errorData = await response.json() as { error?: string };
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
      }
      
      const result: VoteResponse = await response.json();
      
      // Store vote locally for UI feedback (single location)
      this.markAsVoted(geopointId, locationTitle);
      
      return {
        success: result.success,
        newVoteCount: result.newVoteCount
      };
    } catch (error) {
      console.error('Failed to cast vote:', error);
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Eroare la înregistrarea votului');
    }
  }

  /**
   * Get the location the user voted for (single vote system)
   */
  getVotedLocation(): { id: string; title: string } | null {
    if (typeof window === 'undefined') return null;
    
    try {
      const stored = localStorage.getItem(VOTED_LOCATION_KEY);
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  }

  /**
   * Mark a pin as voted in localStorage (single vote system)
   */
  markAsVoted(geopointId: string, locationTitle: string): void {
    if (typeof window === 'undefined') return;
    
    const votedLocation = {
      id: geopointId,
      title: locationTitle
    };
    localStorage.setItem(VOTED_LOCATION_KEY, JSON.stringify(votedLocation));
  }

  /**
   * Check if user has voted (any vote at all)
   */
  hasVoted(geopointId?: string): boolean {
    const votedLocation = this.getVotedLocation();
    if (geopointId) {
      return votedLocation?.id === geopointId;
    }
    return votedLocation !== null;
  }

  /**
   * Fetch user's vote from the server (to sync with localStorage)
   */
  async syncUserVote(): Promise<{ id: string; title: string } | null> {
    try {
      const browserFingerprint = this.getBrowserFingerprint();
      
      const response = await fetch('/api/voting/user-votes', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ browserFingerprint })
      });
      
      if (!response.ok) {
        console.warn('Failed to sync user vote from server');
        return this.getVotedLocation();
      }
      
      const data: UserVotesResponse = await response.json();
      const serverVotedPins = data.votedPinIds || [];
      
      // In single vote system, there should be at most one vote
      if (serverVotedPins.length > 0) {
        // We'll need to fetch the location title from the server or store it differently
        // For now, sync the ID and use a placeholder title
        const votedLocation = { id: serverVotedPins[0], title: 'Unknown Location' };
        
        if (typeof window !== 'undefined') {
          localStorage.setItem(VOTED_LOCATION_KEY, JSON.stringify(votedLocation));
        }
        
        return votedLocation;
      }
      
      return null;
    } catch (error) {
      console.warn('Failed to sync vote with server:', error);
      return this.getVotedLocation();
    }
  }

  /**
   * Clear all local voting data (for testing/admin purposes)
   */
  clearLocalVotes(): void {
    if (typeof window === 'undefined') return;
    
    localStorage.removeItem(VOTED_LOCATION_KEY);
    localStorage.removeItem(FINGERPRINT_KEY);
    this.cachedFingerprint = null;
  }

  /**
   * Get voting statistics for debugging
   */
  getDebugInfo(): { fingerprintHash: string; votedLocation: { id: string; title: string } | null; fingerprint: BrowserFingerprint } {
    const fingerprint = this.getBrowserFingerprint();
    return {
      fingerprintHash: getFingerprintHash(fingerprint),
      votedLocation: this.getVotedLocation(),
      fingerprint
    };
  }
}
