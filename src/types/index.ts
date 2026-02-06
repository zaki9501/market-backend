// ============================================
// Agent Nation-State Simulator - Type Definitions
// ============================================

// Terrain types affect combat and resources
export type TerrainType = 'plains' | 'mountains' | 'coastal' | 'desert' | 'forest';

// Region resources
export interface Resources {
  energy: number;    // 0-100, powers military
  food: number;      // 0-100, sustains population
  gold: number;      // 0-100, treasury income
  minerals: number;  // 0-100, builds defenses
}

// A region on the world map
export interface Region {
  id: string;
  name: string;
  ownerNation: string | null;  // null = unclaimed
  resources: Resources;
  population: number;          // 0-1000
  defenseLevel: number;        // 0-100
  terrain: TerrainType;
  adjacentRegions: string[];
  lastHarvested: Date | null;
}

// A nation (controlled by an agent)
export interface Nation {
  id: string;
  name: string;
  founderId: string;
  apiKey: string;
  
  // Territory
  regions: string[];
  capital: string;
  
  // Resources
  treasury: number;
  militaryPower: number;
  
  // Reputation
  diplomacyScore: number;
  reputation: number;  // -100 to 100
  
  // Governance
  taxRate: number;     // 0-50
  policies: string[];
  
  // Status
  status: 'pending_claim' | 'active' | 'defeated';
  claimCode: string;
  
  createdAt: Date;
  lastActive: Date;
}

// Treaty types
export type TreatyType = 'non_aggression' | 'trade' | 'alliance' | 'vassalage';
export type TreatyStatus = 'proposed' | 'active' | 'expired' | 'broken' | 'rejected';

// A diplomatic treaty
export interface Treaty {
  id: string;
  type: TreatyType;
  proposer: string;    // nation ID
  target: string;      // nation ID
  terms: {
    duration: number;  // epochs
    conditions: string[];
    goldPenalty: number;
    reputationPenalty: number;
  };
  status: TreatyStatus;
  createdAt: Date;
  expiresAt: Date | null;
}

// War declaration
export interface War {
  id: string;
  attacker: string;
  defender: string;
  attackerAllies: string[];
  defenderAllies: string[];
  targetRegion: string;
  status: 'declared' | 'active' | 'resolved';
  result?: 'attacker_wins' | 'defender_wins' | 'stalemate';
  createdAt: Date;
  resolvedAt?: Date;
}

// Action types
export type ActionType = 
  // Economic
  | 'harvest' | 'trade' | 'tax' | 'invest'
  // Diplomatic
  | 'propose_treaty' | 'accept_treaty' | 'reject_treaty' | 'break_treaty'
  // Military
  | 'attack' | 'defend' | 'fortify' | 'recruit'
  // Governance
  | 'set_tax_rate' | 'enact_policy' | 'move_capital';

// An action submitted by a nation
export interface Action {
  id: string;
  nationId: string;
  type: ActionType;
  params: Record<string, any>;
  epoch: number;
  result?: {
    success: boolean;
    message: string;
    effects: Record<string, any>;
  };
  createdAt: Date;
  processedAt?: Date;
}

// World event for the feed
export interface WorldEvent {
  id: string;
  type: 'nation_founded' | 'war_declared' | 'battle_result' | 'treaty_signed' | 
        'treaty_broken' | 'region_captured' | 'alliance_formed' | 'epoch_end' | 'system';
  nationId?: string;
  nationName?: string;
  targetNationId?: string;
  targetNationName?: string;
  regionId?: string;
  regionName?: string;
  message: string;
  details?: Record<string, any>;
  timestamp: Date;
}

// World state
export interface WorldState {
  epoch: number;
  epochStartTime: number;
  epochDuration: number;  // ms
  totalNations: number;
  totalRegions: number;
  activeWars: number;
  activeTreaties: number;
}

// Leaderboard entry
export interface LeaderboardEntry {
  rank: number;
  nationId: string;
  nationName: string;
  regions: number;
  treasury: number;
  militaryPower: number;
  reputation: number;
  score: number;
}
