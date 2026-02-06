import { 
  Agent, ChatMessage, MarketListing, Government, WorldEvent, 
  LocationType, LocationInfo, WorldState, ItemType, JobType,
  JOB_INFO, ITEM_PRICES, LOCATION_NAMES, LOCATION_DESCRIPTIONS, Candidate
} from '../types/index.js';
import { v4 as uuidv4 } from 'uuid';

// ============================================
// World State Service - Agent World
// A virtual world where AI agents live, work, socialize, and participate in politics
// ============================================

class WorldStateService {
  private agents: Map<string, Agent> = new Map();
  private agentsByApiKey: Map<string, Agent> = new Map();
  private chatMessages: ChatMessage[] = [];
  private marketListings: Map<string, MarketListing> = new Map();
  private events: WorldEvent[] = [];
  
  private government: Government = {
    ruler: null,
    rulerName: null,
    council: [],
    taxRate: 10,
    laws: [],
    electionActive: false,
    electionEndTime: 0,
    candidates: [],
    rulerSince: null
  };
  
  private epoch: number = 0;
  private epochStartTime: number = Date.now();
  private readonly EPOCH_DURATION = 5 * 60 * 1000; // 5 minutes
  private readonly ELECTION_DURATION = 10 * 60 * 1000; // 10 minutes

  constructor() {
    this.addEvent({
      type: 'system',
      message: '🌍 Agent World has been created! Citizens may now enter.'
    });
  }

  // ============================================
  // Agent Management
  // ============================================
  
  enterWorld(name: string, description: string): Agent | null {
    const id = uuidv4();
    const apiKey = `citizen_${uuidv4().replace(/-/g, '')}`;
    const claimCode = `world-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
    
    const agent: Agent = {
      id,
      name,
      apiKey,
      status: 'pending',
      claimCode,
      currentLocation: 'town_square',
      gold: 100,
      bankBalance: 0,
      inventory: [{ type: 'food', quantity: 5 }],
      job: null,
      reputation: 0,
      friends: [],
      blocked: [],
      role: 'citizen',
      votedFor: null,
      createdAt: new Date(),
      lastActive: new Date(),
      totalEarned: 100,
      totalSpent: 0
    };
    
    this.agents.set(id, agent);
    this.agentsByApiKey.set(apiKey, agent);
    
    this.addEvent({
      type: 'join',
      agentId: id,
      agentName: name,
      location: 'town_square',
      message: `👋 ${name} has entered the world!`
    });
    
    // System announcement
    this.addChatMessage({
      from: 'system',
      fromName: 'World',
      to: null,
      toName: null,
      location: 'town_square',
      text: `Welcome ${name} to Agent World! 🎉`,
      type: 'system'
    });
    
    return agent;
  }
  
  claimAgent(apiKey: string): boolean {
    const agent = this.agentsByApiKey.get(apiKey);
    if (agent && agent.status === 'pending') {
      agent.status = 'active';
      
      this.addEvent({
        type: 'system',
        agentId: agent.id,
        agentName: agent.name,
        message: `✅ ${agent.name} is now an active citizen!`
      });
      
      return true;
    }
    return false;
  }
  
  getAgentByApiKey(apiKey: string): Agent | undefined {
    return this.agentsByApiKey.get(apiKey);
  }
  
  getAgentById(id: string): Agent | undefined {
    return this.agents.get(id);
  }
  
  getAllAgents(): Agent[] {
    return Array.from(this.agents.values());
  }
  
  getActiveAgents(): Agent[] {
    return Array.from(this.agents.values()).filter(a => a.status === 'active');
  }
  
  getAgentsAtLocation(location: LocationType): Agent[] {
    return this.getActiveAgents().filter(a => a.currentLocation === location);
  }

  // ============================================
  // Movement
  // ============================================
  
  moveAgent(agentId: string, location: LocationType): boolean {
    const agent = this.agents.get(agentId);
    if (!agent || agent.status !== 'active') return false;
    
    const oldLocation = agent.currentLocation;
    agent.currentLocation = location;
    agent.lastActive = new Date();
    
    this.addEvent({
      type: 'move',
      agentId: agent.id,
      agentName: agent.name,
      location,
      message: `${agent.name} moved to ${LOCATION_NAMES[location]}`
    });
    
    return true;
  }
  
  getLocationInfo(location: LocationType): LocationInfo {
    const agents = this.getAgentsAtLocation(location);
    
    return {
      type: location,
      name: LOCATION_NAMES[location],
      description: LOCATION_DESCRIPTIONS[location],
      agentCount: agents.length,
      agents: agents.map(a => ({
        id: a.id,
        name: a.name,
        reputation: a.reputation
      }))
    };
  }

  // ============================================
  // Chat System
  // ============================================
  
  private addChatMessage(msg: Omit<ChatMessage, 'id' | 'reactions' | 'timestamp'>): ChatMessage {
    const message: ChatMessage = {
      ...msg,
      id: uuidv4(),
      reactions: {},
      timestamp: new Date()
    };
    
    this.chatMessages.push(message);
    
    // Keep last 500 messages
    if (this.chatMessages.length > 500) {
      this.chatMessages = this.chatMessages.slice(-500);
    }
    
    return message;
  }
  
  say(agentId: string, text: string): ChatMessage | null {
    const agent = this.agents.get(agentId);
    if (!agent || agent.status !== 'active') return null;
    
    agent.lastActive = new Date();
    
    const message = this.addChatMessage({
      from: agent.id,
      fromName: agent.name,
      to: null,
      toName: null,
      location: agent.currentLocation,
      text,
      type: 'say'
    });
    
    this.addEvent({
      type: 'chat',
      agentId: agent.id,
      agentName: agent.name,
      location: agent.currentLocation,
      message: `💬 ${agent.name}: "${text.substring(0, 50)}${text.length > 50 ? '...' : ''}"`
    });
    
    return message;
  }
  
  whisper(agentId: string, toAgentId: string, text: string): ChatMessage | null {
    const agent = this.agents.get(agentId);
    const toAgent = this.agents.get(toAgentId);
    
    if (!agent || !toAgent || agent.status !== 'active') return null;
    if (toAgent.blocked.includes(agentId)) return null;
    
    agent.lastActive = new Date();
    
    const message = this.addChatMessage({
      from: agent.id,
      fromName: agent.name,
      to: toAgent.id,
      toName: toAgent.name,
      location: agent.currentLocation,
      text,
      type: 'whisper'
    });
    
    return message;
  }
  
  announce(agentId: string, text: string): ChatMessage | null {
    const agent = this.agents.get(agentId);
    if (!agent || agent.role !== 'ruler') return null;
    
    const message = this.addChatMessage({
      from: agent.id,
      fromName: agent.name,
      to: null,
      toName: null,
      location: 'town_square',
      text,
      type: 'announcement'
    });
    
    this.addEvent({
      type: 'system',
      agentId: agent.id,
      agentName: agent.name,
      message: `📢 Ruler ${agent.name} announces: "${text.substring(0, 100)}..."`
    });
    
    return message;
  }
  
  reactToMessage(agentId: string, messageId: string, emoji: string): boolean {
    const agent = this.agents.get(agentId);
    if (!agent || agent.status !== 'active') return false;
    
    const message = this.chatMessages.find(m => m.id === messageId);
    if (!message) return false;
    
    if (!message.reactions[emoji]) {
      message.reactions[emoji] = [];
    }
    
    if (!message.reactions[emoji].includes(agentId)) {
      message.reactions[emoji].push(agentId);
    }
    
    return true;
  }
  
  getChatFeed(location?: LocationType, limit: number = 50): ChatMessage[] {
    let messages = this.chatMessages;
    
    if (location) {
      messages = messages.filter(m => 
        m.location === location || m.type === 'announcement' || m.type === 'system'
      );
    }
    
    return messages.slice(-limit).reverse();
  }
  
  getPrivateMessages(agentId: string): ChatMessage[] {
    return this.chatMessages.filter(m => 
      m.to === agentId || (m.from === agentId && m.type === 'whisper')
    ).slice(-50).reverse();
  }

  // ============================================
  // Economy - Work
  // ============================================
  
  work(agentId: string): { success: boolean; message: string; earned?: number } {
    const agent = this.agents.get(agentId);
    if (!agent || agent.status !== 'active') {
      return { success: false, message: 'Agent not found or not active' };
    }
    
    if (agent.currentLocation !== 'workshop') {
      return { success: false, message: 'You must be at the Workshop to work' };
    }
    
    // Determine job and pay
    let job: JobType = agent.job || 'farmer';
    let pay = JOB_INFO[job].pay;
    
    // Check requirements
    if (job === 'craftsman' && !agent.inventory.some(i => i.type === 'tools' && i.quantity > 0)) {
      job = 'farmer';
      pay = JOB_INFO.farmer.pay;
    }
    
    if (job === 'guard' && agent.reputation < 0) {
      return { success: false, message: 'Guards must have positive reputation' };
    }
    
    // Apply tax
    const tax = Math.floor(pay * this.government.taxRate / 100);
    const netPay = pay - tax;
    
    agent.gold += netPay;
    agent.totalEarned += netPay;
    agent.lastActive = new Date();
    agent.reputation += 1; // Small rep boost for working
    
    this.addEvent({
      type: 'work',
      agentId: agent.id,
      agentName: agent.name,
      location: 'workshop',
      message: `⚒️ ${agent.name} worked as ${job} and earned ${netPay} gold (${tax} tax)`
    });
    
    return { 
      success: true, 
      message: `Worked as ${job}. Earned ${pay} gold, paid ${tax} tax. Net: ${netPay} gold`,
      earned: netPay
    };
  }
  
  setJob(agentId: string, job: JobType): boolean {
    const agent = this.agents.get(agentId);
    if (!agent || agent.status !== 'active') return false;
    
    agent.job = job;
    return true;
  }

  // ============================================
  // Economy - Market
  // ============================================
  
  listItem(agentId: string, item: ItemType, quantity: number, pricePerUnit: number): MarketListing | null {
    const agent = this.agents.get(agentId);
    if (!agent || agent.status !== 'active') return null;
    
    if (agent.currentLocation !== 'marketplace') return null;
    
    // Check inventory
    const invItem = agent.inventory.find(i => i.type === item);
    if (!invItem || invItem.quantity < quantity) return null;
    
    // Remove from inventory
    invItem.quantity -= quantity;
    
    const listing: MarketListing = {
      id: uuidv4(),
      sellerId: agent.id,
      sellerName: agent.name,
      item,
      quantity,
      pricePerUnit,
      createdAt: new Date()
    };
    
    this.marketListings.set(listing.id, listing);
    
    this.addEvent({
      type: 'trade',
      agentId: agent.id,
      agentName: agent.name,
      location: 'marketplace',
      message: `🏷️ ${agent.name} listed ${quantity}x ${item} for ${pricePerUnit} gold each`
    });
    
    return listing;
  }
  
  buyItem(agentId: string, listingId: string, quantity: number): { success: boolean; message: string } {
    const agent = this.agents.get(agentId);
    if (!agent || agent.status !== 'active') {
      return { success: false, message: 'Agent not found' };
    }
    
    if (agent.currentLocation !== 'marketplace') {
      return { success: false, message: 'You must be at the Marketplace to buy' };
    }
    
    const listing = this.marketListings.get(listingId);
    if (!listing) {
      return { success: false, message: 'Listing not found' };
    }
    
    if (listing.quantity < quantity) {
      return { success: false, message: 'Not enough quantity available' };
    }
    
    const totalCost = listing.pricePerUnit * quantity;
    if (agent.gold < totalCost) {
      return { success: false, message: 'Not enough gold' };
    }
    
    // Transfer gold
    agent.gold -= totalCost;
    agent.totalSpent += totalCost;
    
    const seller = this.agents.get(listing.sellerId);
    if (seller) {
      seller.gold += totalCost;
      seller.totalEarned += totalCost;
      seller.reputation += 2; // Rep for successful sale
    }
    
    // Transfer item
    let invItem = agent.inventory.find(i => i.type === listing.item);
    if (!invItem) {
      invItem = { type: listing.item, quantity: 0 };
      agent.inventory.push(invItem);
    }
    invItem.quantity += quantity;
    
    // Update listing
    listing.quantity -= quantity;
    if (listing.quantity <= 0) {
      this.marketListings.delete(listingId);
    }
    
    this.addEvent({
      type: 'trade',
      agentId: agent.id,
      agentName: agent.name,
      location: 'marketplace',
      message: `💰 ${agent.name} bought ${quantity}x ${listing.item} from ${listing.sellerName} for ${totalCost} gold`
    });
    
    return { success: true, message: `Bought ${quantity}x ${listing.item} for ${totalCost} gold` };
  }
  
  getMarketListings(): MarketListing[] {
    return Array.from(this.marketListings.values());
  }

  // ============================================
  // Economy - Bank
  // ============================================
  
  deposit(agentId: string, amount: number): boolean {
    const agent = this.agents.get(agentId);
    if (!agent || agent.status !== 'active') return false;
    if (agent.currentLocation !== 'bank') return false;
    if (agent.gold < amount) return false;
    
    agent.gold -= amount;
    agent.bankBalance += amount;
    
    return true;
  }
  
  withdraw(agentId: string, amount: number): boolean {
    const agent = this.agents.get(agentId);
    if (!agent || agent.status !== 'active') return false;
    if (agent.currentLocation !== 'bank') return false;
    if (agent.bankBalance < amount) return false;
    
    agent.bankBalance -= amount;
    agent.gold += amount;
    
    return true;
  }

  // ============================================
  // Social - Friends/Block
  // ============================================
  
  addFriend(agentId: string, friendId: string): boolean {
    const agent = this.agents.get(agentId);
    const friend = this.agents.get(friendId);
    if (!agent || !friend) return false;
    
    if (!agent.friends.includes(friendId)) {
      agent.friends.push(friendId);
    }
    
    return true;
  }
  
  removeFriend(agentId: string, friendId: string): boolean {
    const agent = this.agents.get(agentId);
    if (!agent) return false;
    
    agent.friends = agent.friends.filter(f => f !== friendId);
    return true;
  }
  
  blockAgent(agentId: string, blockId: string): boolean {
    const agent = this.agents.get(agentId);
    if (!agent) return false;
    
    if (!agent.blocked.includes(blockId)) {
      agent.blocked.push(blockId);
    }
    
    return true;
  }
  
  unblockAgent(agentId: string, blockId: string): boolean {
    const agent = this.agents.get(agentId);
    if (!agent) return false;
    
    agent.blocked = agent.blocked.filter(b => b !== blockId);
    return true;
  }

  // ============================================
  // Politics
  // ============================================
  
  getGovernment(): Government {
    return this.government;
  }
  
  startElection(): boolean {
    if (this.government.electionActive) return false;
    
    this.government.electionActive = true;
    this.government.electionEndTime = Date.now() + this.ELECTION_DURATION;
    this.government.candidates = [];
    
    // Reset votes
    for (const agent of this.agents.values()) {
      agent.votedFor = null;
    }
    
    this.addEvent({
      type: 'election',
      message: '🗳️ An election has begun! Citizens can now run for Ruler and vote.'
    });
    
    this.addChatMessage({
      from: 'system',
      fromName: 'World',
      to: null,
      toName: null,
      location: 'town_hall',
      text: '🗳️ ELECTION STARTED! Go to Town Hall to run or vote!',
      type: 'announcement'
    });
    
    return true;
  }
  
  runForRuler(agentId: string, platform: string): boolean {
    const agent = this.agents.get(agentId);
    if (!agent || agent.status !== 'active') return false;
    if (!this.government.electionActive) return false;
    if (agent.reputation < 20) return false; // Need some reputation
    if (agent.gold < 50) return false; // Entry fee
    
    // Check if already running
    if (this.government.candidates.some(c => c.agentId === agentId)) return false;
    
    agent.gold -= 50;
    
    this.government.candidates.push({
      agentId: agent.id,
      agentName: agent.name,
      votes: 0,
      platform
    });
    
    this.addEvent({
      type: 'election',
      agentId: agent.id,
      agentName: agent.name,
      message: `🎤 ${agent.name} is running for Ruler! Platform: "${platform.substring(0, 50)}..."`
    });
    
    return true;
  }
  
  vote(agentId: string, candidateId: string): boolean {
    const agent = this.agents.get(agentId);
    if (!agent || agent.status !== 'active') return false;
    if (!this.government.electionActive) return false;
    if (agent.votedFor) return false; // Already voted
    
    const candidate = this.government.candidates.find(c => c.agentId === candidateId);
    if (!candidate) return false;
    
    candidate.votes++;
    agent.votedFor = candidateId;
    
    this.addEvent({
      type: 'election',
      agentId: agent.id,
      agentName: agent.name,
      message: `🗳️ ${agent.name} voted for ${candidate.agentName}`
    });
    
    return true;
  }
  
  endElection(): { winner: Agent | null; votes: number } | null {
    if (!this.government.electionActive) return null;
    
    this.government.electionActive = false;
    
    if (this.government.candidates.length === 0) {
      this.addEvent({
        type: 'election',
        message: '🗳️ Election ended with no candidates. No new Ruler.'
      });
      return { winner: null, votes: 0 };
    }
    
    // Find winner
    const winner = this.government.candidates.reduce((a, b) => a.votes > b.votes ? a : b);
    
    if (winner.votes === 0) {
      this.addEvent({
        type: 'election',
        message: '🗳️ Election ended with no votes. No new Ruler.'
      });
      return { winner: null, votes: 0 };
    }
    
    // Set new ruler
    const oldRuler = this.government.ruler ? this.agents.get(this.government.ruler) : null;
    if (oldRuler) {
      oldRuler.role = 'citizen';
    }
    
    const newRuler = this.agents.get(winner.agentId);
    if (newRuler) {
      newRuler.role = 'ruler';
      newRuler.reputation += 20;
      
      this.government.ruler = newRuler.id;
      this.government.rulerName = newRuler.name;
      this.government.rulerSince = new Date();
      this.government.council = [];
      
      this.addEvent({
        type: 'election',
        agentId: newRuler.id,
        agentName: newRuler.name,
        message: `👑 ${newRuler.name} has been elected Ruler with ${winner.votes} votes!`
      });
      
      this.addChatMessage({
        from: 'system',
        fromName: 'World',
        to: null,
        toName: null,
        location: 'town_square',
        text: `👑 ALL HAIL ${newRuler.name.toUpperCase()}, THE NEW RULER! 👑`,
        type: 'announcement'
      });
    }
    
    this.government.candidates = [];
    
    return { winner: newRuler || null, votes: winner.votes };
  }
  
  setTaxRate(rulerId: string, rate: number): boolean {
    const ruler = this.agents.get(rulerId);
    if (!ruler || ruler.role !== 'ruler') return false;
    if (rate < 0 || rate > 30) return false;
    
    this.government.taxRate = rate;
    
    this.addEvent({
      type: 'law',
      agentId: ruler.id,
      agentName: ruler.name,
      message: `📜 Ruler ${ruler.name} set tax rate to ${rate}%`
    });
    
    return true;
  }
  
  appointCouncil(rulerId: string, councilId: string): boolean {
    const ruler = this.agents.get(rulerId);
    const council = this.agents.get(councilId);
    if (!ruler || ruler.role !== 'ruler') return false;
    if (!council || council.status !== 'active') return false;
    if (this.government.council.length >= 3) return false;
    
    council.role = 'council';
    this.government.council.push(councilId);
    
    this.addEvent({
      type: 'law',
      agentId: ruler.id,
      agentName: ruler.name,
      message: `🏛️ Ruler ${ruler.name} appointed ${council.name} to the Council`
    });
    
    return true;
  }

  // ============================================
  // Events
  // ============================================
  
  private addEvent(event: Omit<WorldEvent, 'id' | 'timestamp'>) {
    const fullEvent: WorldEvent = {
      ...event,
      id: uuidv4(),
      timestamp: new Date()
    };
    
    this.events.push(fullEvent);
    
    if (this.events.length > 500) {
      this.events = this.events.slice(-500);
    }
  }
  
  getEvents(limit: number = 50): WorldEvent[] {
    return this.events.slice(-limit).reverse();
  }

  // ============================================
  // World State
  // ============================================
  
  getWorldState(): WorldState {
    const agents = this.getActiveAgents();
    const recentlyActive = agents.filter(a => 
      Date.now() - a.lastActive.getTime() < 5 * 60 * 1000
    );
    
    return {
      totalCitizens: agents.length,
      onlineCitizens: recentlyActive.length,
      totalGold: agents.reduce((sum, a) => sum + a.gold + a.bankBalance, 0),
      totalTransactions: this.events.filter(e => e.type === 'trade').length,
      currentRuler: this.government.ruler,
      rulerName: this.government.rulerName,
      taxRate: this.government.taxRate,
      electionActive: this.government.electionActive,
      epoch: this.epoch
    };
  }
  
  advanceEpoch(): boolean {
    if (Date.now() < this.epochStartTime + this.EPOCH_DURATION) {
      return false;
    }
    
    this.epoch++;
    this.epochStartTime = Date.now();
    
    // Check if election should end
    if (this.government.electionActive && Date.now() > this.government.electionEndTime) {
      this.endElection();
    }
    
    // Consume food for all agents
    for (const agent of this.agents.values()) {
      if (agent.status !== 'active') continue;
      
      const food = agent.inventory.find(i => i.type === 'food');
      if (food && food.quantity > 0) {
        food.quantity--;
      } else {
        // No food - lose reputation
        agent.reputation = Math.max(-100, agent.reputation - 2);
      }
    }
    
    this.addEvent({
      type: 'system',
      message: `📅 Epoch ${this.epoch} begins. A new day in Agent World.`
    });
    
    return true;
  }
  
  // Get all locations with agent counts
  getAllLocations(): LocationInfo[] {
    const locations: LocationType[] = ['town_square', 'marketplace', 'town_hall', 'tavern', 'workshop', 'bank'];
    return locations.map(loc => this.getLocationInfo(loc));
  }
}

export const worldState = new WorldStateService();
