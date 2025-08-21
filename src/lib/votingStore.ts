import type { VotableLocation, BrowserFingerprint, VoteRequest, VoteResponse, UserVotesResponse } from '@/types/geopoint';
import { generateBrowserFingerprint, getFingerprintHash } from './browserFingerprint';

const VOTED_PINS_KEY = 'votedPins';
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
   * Cast a vote for a specific pin
   */
  async castVote(geopointId: string): Promise<{ success: boolean; newVoteCount: number }> {
    try {
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
      
      // Store vote locally for UI feedback
      this.markAsVoted(geopointId);
      
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
   * Get list of pin IDs that the user has voted for (from localStorage)
   */
  getVotedPins(): string[] {
    if (typeof window === 'undefined') return [];
    
    try {
      const stored = localStorage.getItem(VOTED_PINS_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  }

  /**
   * Mark a pin as voted in localStorage
   */
  markAsVoted(geopointId: string): void {
    if (typeof window === 'undefined') return;
    
    const votedPins = this.getVotedPins();
    if (!votedPins.includes(geopointId)) {
      votedPins.push(geopointId);
      localStorage.setItem(VOTED_PINS_KEY, JSON.stringify(votedPins));
    }
  }

  /**
   * Check if user has voted for a specific pin (from localStorage)
   */
  hasVoted(geopointId: string): boolean {
    return this.getVotedPins().includes(geopointId);
  }

  /**
   * Fetch user's votes from the server (to sync with localStorage)
   */
  async syncUserVotes(): Promise<string[]> {
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
        console.warn('Failed to sync user votes from server');
        return this.getVotedPins();
      }
      
      const data: UserVotesResponse = await response.json();
      const serverVotedPins = data.votedPinIds || [];
      
      // Merge with local storage and update
      const localVotedPins = this.getVotedPins();
      const mergedVotes = Array.from(new Set([...localVotedPins, ...serverVotedPins]));
      
      if (typeof window !== 'undefined') {
        localStorage.setItem(VOTED_PINS_KEY, JSON.stringify(mergedVotes));
      }
      
      return mergedVotes;
    } catch (error) {
      console.warn('Failed to sync votes with server:', error);
      return this.getVotedPins();
    }
  }

  /**
   * Clear all local voting data (for testing/admin purposes)
   */
  clearLocalVotes(): void {
    if (typeof window === 'undefined') return;
    
    localStorage.removeItem(VOTED_PINS_KEY);
    localStorage.removeItem(FINGERPRINT_KEY);
    this.cachedFingerprint = null;
  }

  /**
   * Get voting statistics for debugging
   */
  getDebugInfo(): { fingerprintHash: string; votedPins: string[]; fingerprint: BrowserFingerprint } {
    const fingerprint = this.getBrowserFingerprint();
    return {
      fingerprintHash: getFingerprintHash(fingerprint),
      votedPins: this.getVotedPins(),
      fingerprint
    };
  }
}
