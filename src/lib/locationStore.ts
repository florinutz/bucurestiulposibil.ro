export interface Location {
  id: string;
  title: string;
  description: string;
  lat: number;
  lng: number;
  status: 'approved' | 'pending' | 'rejected';
  createdAt: Date;
  createdBy?: string;
}

export interface LocationProposal {
  id: string;
  title: string;
  description: string;
  lat: number;
  lng: number;
  status: 'pending' | 'rejected';
  createdAt: Date;
  createdBy?: string;
}

interface D1Pin {
  id: string;
  title: string;
  description: string;
  lat: number;
  lng: number;
  created_at: string;
  updated_at: string;
}

// In-memory storage for demo purposes
class LocationStore {
  private locations: Location[] = [];
  private proposals: LocationProposal[] = [];
  private isLoaded = false;

  // Load locations from D1 database
  async loadLocations(): Promise<void> {
    if (this.isLoaded) return;
    
    try {
      const response = await fetch('/api/geopoints');
      if (response.ok) {
        const result = await response.json() as { success: boolean; count: number; pins: D1Pin[] };
        if (result.success && result.pins) {
          this.locations = result.pins.map((point: D1Pin) => ({
            id: point.id,
            title: point.title,
            description: point.description || '',
            lat: point.lat,
            lng: point.lng,
            status: 'approved' as const,
            createdAt: new Date(point.created_at),
            createdBy: 'system'
          }));
          this.isLoaded = true;
          console.log('Loaded locations from D1:', this.locations.length);
        } else {
          console.error('Invalid response format from D1 API');
        }
      } else {
        console.error('Failed to load locations from D1');
      }
    } catch (error) {
      console.error('Error loading locations:', error);
    }
  }

  // Get all approved locations
  getLocations(): Location[] {
    return this.locations.filter(location => location.status === 'approved');
  }

  // Get all pending proposals
  getProposals(): LocationProposal[] {
    return this.proposals.filter(proposal => proposal.status === 'pending');
  }

  // Add a new location proposal
  addProposal(proposal: Omit<LocationProposal, 'id' | 'status' | 'createdAt'>): LocationProposal {
    const newProposal: LocationProposal = {
      ...proposal,
      id: Date.now().toString(),
      status: 'pending',
      createdAt: new Date()
    };
    
    this.proposals.push(newProposal);
    return newProposal;
  }

  // Approve a proposal (move to locations)
  approveProposal(proposalId: string): Location | null {
    const proposalIndex = this.proposals.findIndex(p => p.id === proposalId);
    if (proposalIndex === -1) return null;

    const proposal = this.proposals[proposalIndex];
    const location: Location = {
      ...proposal,
      status: 'approved'
    };

    this.locations.push(location);
    this.proposals.splice(proposalIndex, 1);
    
    return location;
  }

  // Reject a proposal
  rejectProposal(proposalId: string): boolean {
    const proposalIndex = this.proposals.findIndex(p => p.id === proposalId);
    if (proposalIndex === -1) return false;

    this.proposals[proposalIndex].status = 'rejected';
    return true;
  }

  // Get location by ID
  getLocationById(id: string): Location | null {
    return this.locations.find(location => location.id === id) || null;
  }

  // Get proposal by ID
  getProposalById(id: string): LocationProposal | null {
    return this.proposals.find(proposal => proposal.id === id) || null;
  }

  // Search locations by title or description
  searchLocations(query: string): Location[] {
    const lowerQuery = query.toLowerCase();
    return this.locations.filter(location => 
      location.title.toLowerCase().includes(lowerQuery) ||
      location.description.toLowerCase().includes(lowerQuery)
    );
  }

  // Force reload locations from D1
  async reloadLocations(): Promise<void> {
    this.isLoaded = false;
    await this.loadLocations();
  }
}

// Export singleton instance
export const locationStore = new LocationStore(); 