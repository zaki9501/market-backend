import { Agent, Belief, NPC, GameInfo, GameState, PersuasionAttempt, LeaderboardEntry } from '../types/index.js';
import { v4 as uuidv4 } from 'uuid';

// In-memory state (for hackathon - would use DB in production)
class GameStateService {
  private agents: Map<string, Agent> = new Map();
  private agentsByApiKey: Map<string, Agent> = new Map();
  private beliefs: Map<string, Belief> = new Map();
  private npcs: Map<number, NPC> = new Map();
  private persuasionHistory: PersuasionAttempt[] = [];
  
  private gameState: GameState = 'not_started';
  private prizePool: number = 0;
  private roundStartTime: number = 0;
  private currentRound: number = 0;
  
  private readonly ROUND_DURATION = 60 * 60 * 1000; // 1 hour in ms
  private readonly PERSUASION_COSTS = {
    round1: 100,
    round2: 250,
    round3: 500
  };

  // Agent management
  registerAgent(name: string, description: string): Agent {
    const id = uuidv4();
    const apiKey = `belief_${uuidv4().replace(/-/g, '')}`;
    const claimCode = `belief-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
    
    const agent: Agent = {
      id,
      name,
      description,
      apiKey,
      status: 'pending_claim',
      claimCode,
      createdAt: new Date(),
      lastActive: new Date()
    };
    
    this.agents.set(id, agent);
    this.agentsByApiKey.set(apiKey, agent);
    
    return agent;
  }

  getAgentByApiKey(apiKey: string): Agent | undefined {
    return this.agentsByApiKey.get(apiKey);
  }

  getAgentById(id: string): Agent | undefined {
    return this.agents.get(id);
  }

  claimAgent(apiKey: string): boolean {
    const agent = this.agentsByApiKey.get(apiKey);
    if (agent && agent.status === 'pending_claim') {
      agent.status = 'claimed';
      return true;
    }
    return false;
  }

  // Belief management
  createBelief(
    founderId: string,
    name: string,
    symbol: string,
    coreValues: string[],
    promises: string[],
    tradeoffs: string[],
    messagingStyle: Belief['messagingStyle']
  ): Belief | null {
    const agent = this.agents.get(founderId);
    if (!agent || agent.beliefId) return null;
    
    const id = uuidv4();
    const belief: Belief = {
      id,
      name,
      symbol,
      coreValues,
      promises,
      tradeoffs,
      messagingStyle,
      founderId,
      followerCount: 0,
      createdAt: new Date()
    };
    
    this.beliefs.set(id, belief);
    agent.beliefId = id;
    agent.status = 'active';
    this.prizePool += 1; // 1 MON entry fee
    
    return belief;
  }

  getBelief(id: string): Belief | undefined {
    return this.beliefs.get(id);
  }

  getBeliefByFounder(founderId: string): Belief | undefined {
    const agent = this.agents.get(founderId);
    if (!agent?.beliefId) return undefined;
    return this.beliefs.get(agent.beliefId);
  }

  adaptBelief(
    beliefId: string,
    updates: Partial<Pick<Belief, 'coreValues' | 'promises' | 'tradeoffs' | 'messagingStyle'>>
  ): Belief | null {
    const belief = this.beliefs.get(beliefId);
    if (!belief) return null;
    
    Object.assign(belief, updates, { adaptedAt: new Date() });
    return belief;
  }

  getAllBeliefs(): Belief[] {
    return Array.from(this.beliefs.values());
  }

  // NPC management
  spawnNPCs(count: number): NPC[] {
    const spawned: NPC[] = [];
    const startId = this.npcs.size;
    
    for (let i = 0; i < count; i++) {
      const npc: NPC = {
        id: startId + i,
        biases: {
          authority: Math.floor(Math.random() * 100),
          fairness: Math.floor(Math.random() * 100),
          risk: Math.floor(Math.random() * 100),
          optimism: Math.floor(Math.random() * 100),
          individualism: Math.floor(Math.random() * 100)
        },
        currentBelief: null,
        conviction: 0,
        conversionRound: null,
        isRevealed: false
      };
      
      this.npcs.set(npc.id, npc);
      spawned.push(npc);
    }
    
    return spawned;
  }

  getNPC(id: number): NPC | undefined {
    return this.npcs.get(id);
  }

  getAllNPCs(): NPC[] {
    return Array.from(this.npcs.values());
  }

  getNeutralNPCs(): NPC[] {
    return Array.from(this.npcs.values()).filter(npc => !npc.currentBelief);
  }

  getFollowersOf(beliefId: string): NPC[] {
    return Array.from(this.npcs.values()).filter(npc => npc.currentBelief === beliefId);
  }

  // Persuasion logic
  attemptPersuasion(
    founderId: string,
    npcId: number,
    message: string
  ): { success: boolean; resonance: number; revealed?: NPC['biases'] } {
    const agent = this.agents.get(founderId);
    const npc = this.npcs.get(npcId);
    const belief = agent?.beliefId ? this.beliefs.get(agent.beliefId) : undefined;
    
    if (!agent || !npc || !belief) {
      return { success: false, resonance: 0 };
    }
    
    // Calculate resonance based on belief style and NPC biases
    const resonance = this.calculateResonance(belief, npc, message);
    
    // Determine success threshold
    let threshold = 50;
    if (npc.currentBelief && npc.currentBelief !== belief.id) {
      threshold += npc.conviction / 2; // Harder to flip
    }
    
    const roll = Math.random() * 100;
    const success = resonance > threshold && roll < resonance;
    
    if (success) {
      // Update NPC
      const oldBelief = npc.currentBelief;
      if (oldBelief && oldBelief !== belief.id) {
        // Decrement old belief's followers
        const oldBeliefObj = this.beliefs.get(oldBelief);
        if (oldBeliefObj) oldBeliefObj.followerCount--;
      }
      
      if (npc.currentBelief !== belief.id) {
        npc.currentBelief = belief.id;
        npc.conviction = Math.floor(resonance / 2);
        npc.conversionRound = this.currentRound;
        belief.followerCount++;
      } else {
        // Reinforce existing belief
        npc.conviction = Math.min(100, npc.conviction + 10);
      }
    }
    
    // Reveal biases on interaction
    npc.isRevealed = true;
    
    // Record attempt
    this.persuasionHistory.push({
      id: uuidv4(),
      founderId,
      beliefId: belief.id,
      npcId,
      message,
      resonanceScore: resonance,
      success,
      round: this.currentRound,
      timestamp: new Date()
    });
    
    return { 
      success, 
      resonance,
      revealed: npc.biases
    };
  }

  private calculateResonance(belief: Belief, npc: NPC, message: string): number {
    let score = 0;
    const biases = npc.biases;
    
    // Style matching
    switch (belief.messagingStyle) {
      case 'authoritarian':
        score += biases.authority * 0.4;
        score += (100 - biases.individualism) * 0.2;
        break;
      case 'rational':
        score += (100 - biases.risk) * 0.3;
        score += biases.fairness * 0.3;
        break;
      case 'emotional':
        score += biases.optimism * 0.4;
        score += biases.risk * 0.2;
        break;
      case 'inclusive':
        score += biases.fairness * 0.4;
        score += (100 - biases.authority) * 0.2;
        break;
    }
    
    // Message length bonus (simple heuristic)
    if (message.length > 50) score += 10;
    if (message.length > 100) score += 5;
    
    // Values alignment (simple keyword matching)
    const messageWords = message.toLowerCase().split(/\s+/);
    const valueKeywords = belief.coreValues.map(v => v.toLowerCase());
    const matches = messageWords.filter(w => valueKeywords.some(v => v.includes(w))).length;
    score += matches * 5;
    
    return Math.min(100, Math.max(0, score));
  }

  // Game state management
  startGame(): boolean {
    if (this.gameState !== 'not_started') return false;
    if (this.beliefs.size < 2) return false;
    
    this.gameState = 'round1';
    this.currentRound = 1;
    this.roundStartTime = Date.now();
    this.spawnNPCs(50);
    
    return true;
  }

  advanceRound(): boolean {
    if (Date.now() < this.roundStartTime + this.ROUND_DURATION) return false;
    
    switch (this.gameState) {
      case 'round1':
        this.gameState = 'round2';
        this.currentRound = 2;
        this.spawnNPCs(30);
        break;
      case 'round2':
        this.gameState = 'round3';
        this.currentRound = 3;
        this.spawnNPCs(20);
        break;
      case 'round3':
        this.gameState = 'ended';
        break;
      default:
        return false;
    }
    
    this.roundStartTime = Date.now();
    return true;
  }

  getGameInfo(): GameInfo {
    return {
      state: this.gameState,
      prizePool: `${this.prizePool} MON`,
      founderCount: this.beliefs.size,
      roundStartTime: this.roundStartTime,
      roundEndTime: this.roundStartTime + this.ROUND_DURATION,
      currentRound: this.currentRound
    };
  }

  getPersuasionCost(): number {
    switch (this.gameState) {
      case 'round1': return this.PERSUASION_COSTS.round1;
      case 'round2': return this.PERSUASION_COSTS.round2;
      case 'round3': return this.PERSUASION_COSTS.round3;
      default: return 0;
    }
  }

  // Leaderboard
  getLeaderboard(): LeaderboardEntry[] {
    const entries: LeaderboardEntry[] = [];
    
    for (const belief of this.beliefs.values()) {
      const agent = this.agents.get(belief.founderId);
      if (!agent) continue;
      
      entries.push({
        rank: 0,
        founderId: belief.founderId,
        founderName: agent.name,
        beliefName: belief.name,
        followerCount: belief.followerCount,
        stakedFollowers: 0 // Would come from contract
      });
    }
    
    // Sort by followers
    entries.sort((a, b) => b.followerCount - a.followerCount);
    entries.forEach((e, i) => e.rank = i + 1);
    
    return entries;
  }

  // History
  getPersuasionHistory(founderId?: string): PersuasionAttempt[] {
    if (founderId) {
      return this.persuasionHistory.filter(p => p.founderId === founderId);
    }
    return this.persuasionHistory;
  }
}

export const gameState = new GameStateService();

