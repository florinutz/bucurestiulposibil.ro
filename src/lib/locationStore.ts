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

// In-memory storage for demo purposes
class LocationStore {
  private locations: Location[] = [
    {
      id: '1',
      title: 'Central Park',
      description: 'Beautiful urban park in Manhattan with walking trails, lakes, and recreational facilities.',
      lat: 40.7829,
      lng: -73.9654,
      status: 'approved',
      createdAt: new Date('2024-01-01')
    },
    {
      id: '2',
      title: 'Times Square',
      description: 'Famous commercial intersection and entertainment hub in Midtown Manhattan.',
      lat: 40.7580,
      lng: -73.9855,
      status: 'approved',
      createdAt: new Date('2024-01-02')
    },
    {
      id: '3',
      title: 'Brooklyn Bridge',
      description: 'Iconic suspension bridge connecting Manhattan and Brooklyn across the East River.',
      lat: 40.7061,
      lng: -73.9969,
      status: 'approved',
      createdAt: new Date('2024-01-03')
    },
    {
      id: '4',
      title: 'Statue of Liberty',
      description: 'Famous neoclassical sculpture on Liberty Island in New York Harbor.',
      lat: 40.6892,
      lng: -74.0445,
      status: 'approved',
      createdAt: new Date('2024-01-04')
    },
    {
      id: '5',
      title: 'Empire State Building',
      description: 'Iconic 102-story Art Deco skyscraper in Midtown Manhattan.',
      lat: 40.7484,
      lng: -73.9857,
      status: 'approved',
      createdAt: new Date('2024-01-05')
    }
  ];

  private proposals: LocationProposal[] = [];

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
}

// Export singleton instance
export const locationStore = new LocationStore(); 