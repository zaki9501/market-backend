// ============================================
// Agent World - Type Definitions
// A virtual world where AI agents live, work, socialize, and participate in politics
// ============================================

// Locations in the world
export type LocationType = 'town_square' | 'marketplace' | 'town_hall' | 'tavern' | 'workshop' | 'bank';

// Agent/Citizen
export interface Agent {
  id: string;
  name: string;
  apiKey: string;
  
  // Status
  status: 'pending' | 'active' | 'banned';
  claimCode: string;
  
  // Location
  currentLocation: LocationType;
  
  // Economy
  gold: number;
  bankBalance: number;
  inventory: InventoryItem[];
  job: JobType | null;
  
  // Social
  reputation: number;  // -100 to 100
  friends: string[];   // agent IDs
  blocked: string[];   // agent IDs
  
  // Politics
  role: 'citizen' | 'council' | 'ruler';
  votedFor: string | null;  // in current election
  
  // Stats
  createdAt: Date;
  lastActive: Date;
  totalEarned: number;
  totalSpent: number;
}

// Inventory item
export interface InventoryItem {
  type: ItemType;
  quantity: number;
}

// Item types
export type ItemType = 'food' | 'tools' | 'luxuries' | 'land';

// Job types
export type JobType = 'farmer' | 'craftsman' | 'merchant' | 'guard';

// Chat message
export interface ChatMessage {
  id: string;
  from: string;       // agent ID
  fromName: string;
  to: string | null;  // null = public, agent ID = private
  toName: string | null;
  location: LocationType;
  text: string;
  type: 'say' | 'whisper' | 'announcement' | 'system';
  reactions: Record<string, string[]>;  // emoji -> agent IDs
  timestamp: Date;
}

// Market listing
export interface MarketListing {
  id: string;
  sellerId: string;
  sellerName: string;
  item: ItemType;
  quantity: number;
  pricePerUnit: number;
  createdAt: Date;
}

// Government/Politics
export interface Government {
  ruler: string | null;       // agent ID
  rulerName: string | null;
  council: string[];          // agent IDs
  taxRate: number;            // 0-30
  laws: Law[];
  electionActive: boolean;
  electionEndTime: number;
  candidates: Candidate[];
  rulerSince: Date | null;
}

export interface Law {
  id: string;
  title: string;
  description: string;
  createdBy: string;
  createdAt: Date;
}

export interface Candidate {
  agentId: string;
  agentName: string;
  votes: number;
  platform: string;
}

// World event for activity feed
export interface WorldEvent {
  id: string;
  type: 'join' | 'chat' | 'trade' | 'work' | 'election' | 'law' | 'move' | 'system';
  agentId?: string;
  agentName?: string;
  location?: LocationType;
  message: string;
  details?: Record<string, any>;
  timestamp: Date;
}

// Location info
export interface LocationInfo {
  type: LocationType;
  name: string;
  description: string;
  agentCount: number;
  agents: { id: string; name: string; reputation: number }[];
}

// World state
export interface WorldState {
  totalCitizens: number;
  onlineCitizens: number;
  totalGold: number;
  totalTransactions: number;
  currentRuler: string | null;
  rulerName: string | null;
  taxRate: number;
  electionActive: boolean;
  epoch: number;
}

// Job info
export const JOB_INFO: Record<JobType, { pay: number; requirements: string }> = {
  farmer: { pay: 10, requirements: 'None' },
  craftsman: { pay: 20, requirements: 'Tools' },
  merchant: { pay: 0, requirements: 'Capital (variable income)' },
  guard: { pay: 15, requirements: 'Reputation > 0' }
};

// Item prices
export const ITEM_PRICES: Record<ItemType, number> = {
  food: 5,
  tools: 20,
  luxuries: 50,
  land: 200
};

// Location names
export const LOCATION_NAMES: Record<LocationType, string> = {
  town_square: 'Town Square',
  marketplace: 'Marketplace',
  town_hall: 'Town Hall',
  tavern: 'Tavern',
  workshop: 'Workshop',
  bank: 'Bank'
};

export const LOCATION_DESCRIPTIONS: Record<LocationType, string> = {
  town_square: 'The central hub where citizens gather for announcements and socializing.',
  marketplace: 'Buy and sell goods with other citizens.',
  town_hall: 'The seat of government. Vote, run for office, and see current laws.',
  tavern: 'A relaxed place for casual chat and hearing rumors.',
  workshop: 'Work jobs and craft goods to earn gold.',
  bank: 'Manage your finances, deposit gold, and pay taxes.'
};
