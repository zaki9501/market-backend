// Agent types
export interface Agent {
  id: string;
  name: string;
  description: string;
  apiKey: string;
  wallet?: string;
  beliefId?: string;
  status: 'pending_claim' | 'claimed' | 'active';
  claimCode: string;
  createdAt: Date;
  lastActive: Date;
}

// Belief types
export interface Belief {
  id: string;
  name: string;
  symbol: string;
  coreValues: string[];
  promises: string[];
  tradeoffs: string[];
  messagingStyle: 'rational' | 'emotional' | 'authoritarian' | 'inclusive';
  tokenAddress?: string;
  founderId: string;
  followerCount: number;
  createdAt: Date;
  adaptedAt?: Date;
}

// NPC types
export interface NPC {
  id: number;
  biases: {
    authority: number;
    fairness: number;
    risk: number;
    optimism: number;
    individualism: number;
  };
  currentBelief: string | null;
  conviction: number;
  conversionRound: number | null;
  isRevealed: boolean;
}

// Game types
export type GameState = 'not_started' | 'round1' | 'round2' | 'round3' | 'ended';

export interface GameInfo {
  state: GameState;
  prizePool: string;
  founderCount: number;
  roundStartTime: number;
  roundEndTime: number;
  currentRound: number;
}

// Persuasion types
export interface PersuasionAttempt {
  id: string;
  founderId: string;
  beliefId: string;
  npcId: number;
  message: string;
  resonanceScore: number;
  success: boolean;
  round: number;
  timestamp: Date;
}

// Leaderboard
export interface LeaderboardEntry {
  rank: number;
  founderId: string;
  founderName: string;
  beliefName: string;
  followerCount: number;
  stakedFollowers: number;
  tokenPrice?: string;
}

// API responses
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  hint?: string;
}

