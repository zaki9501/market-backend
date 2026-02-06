import { 
  Region, Nation, Treaty, War, Action, WorldEvent, WorldState, 
  LeaderboardEntry, Resources, TerrainType, TreatyType 
} from '../types/index.js';
import { v4 as uuidv4 } from 'uuid';

// ============================================
// World State Service - Agent Nation-State Simulator
// ============================================

// Region name generator
const REGION_NAMES = [
  'Plains of Abundance', 'Iron Mountains', 'Golden Delta', 'Frozen Wastes',
  'Emerald Forest', 'Crimson Desert', 'Azure Coast', 'Shadow Valley',
  'Thunder Peaks', 'Silk Road', 'Dragon\'s Spine', 'Merchant Bay',
  'Whispering Woods', 'Salt Flats', 'Obsidian Cliffs', 'Jade Gardens',
  'Storm Islands', 'Copper Hills', 'Silver Lake', 'Amber Fields'
];

class WorldStateService {
  private regions: Map<string, Region> = new Map();
  private nations: Map<string, Nation> = new Map();
  private nationsByApiKey: Map<string, Nation> = new Map();
  private treaties: Map<string, Treaty> = new Map();
  private wars: Map<string, War> = new Map();
  private actions: Action[] = [];
  private events: WorldEvent[] = [];
  
  private epoch: number = 0;
  private epochStartTime: number = 0;
  private readonly EPOCH_DURATION = 10 * 60 * 1000; // 10 minutes
  
  constructor() {
    this.initializeWorld();
  }

  // ============================================
  // World Initialization
  // ============================================
  
  private initializeWorld() {
    // Create 20 regions with varied resources
    const terrains: TerrainType[] = ['plains', 'mountains', 'coastal', 'desert', 'forest'];
    
    for (let i = 0; i < 20; i++) {
      const terrain = terrains[i % 5];
      const region = this.createRegion(i, terrain);
      this.regions.set(region.id, region);
    }
    
    // Set up adjacencies (simple grid-like connections)
    const regionIds = Array.from(this.regions.keys());
    regionIds.forEach((id, index) => {
      const region = this.regions.get(id)!;
      const adjacents: string[] = [];
      
      // Connect to neighbors (wrap around for interesting topology)
      if (index > 0) adjacents.push(regionIds[index - 1]);
      if (index < regionIds.length - 1) adjacents.push(regionIds[index + 1]);
      if (index >= 4) adjacents.push(regionIds[index - 4]);
      if (index < regionIds.length - 4) adjacents.push(regionIds[index + 4]);
      
      region.adjacentRegions = adjacents;
    });
    
    this.epochStartTime = Date.now();
    
    this.addEvent({
      type: 'system',
      message: '🌍 The world has been created! 20 regions await conquest. Nations may now enter.'
    });
  }
  
  private createRegion(index: number, terrain: TerrainType): Region {
    // Resource distribution based on terrain
    const baseResources: Record<TerrainType, Resources> = {
      plains: { energy: 30, food: 80, gold: 40, minerals: 20 },
      mountains: { energy: 50, food: 20, gold: 30, minerals: 90 },
      coastal: { energy: 40, food: 60, gold: 80, minerals: 30 },
      desert: { energy: 90, food: 10, gold: 50, minerals: 60 },
      forest: { energy: 60, food: 70, gold: 20, minerals: 40 }
    };
    
    const base = baseResources[terrain];
    
    // Add some randomness
    const randomize = (val: number) => Math.min(100, Math.max(0, val + Math.floor(Math.random() * 30) - 15));
    
    return {
      id: `region_${index}`,
      name: REGION_NAMES[index] || `Region ${index}`,
      ownerNation: null,
      resources: {
        energy: randomize(base.energy),
        food: randomize(base.food),
        gold: randomize(base.gold),
        minerals: randomize(base.minerals)
      },
      population: Math.floor(Math.random() * 500) + 200,
      defenseLevel: Math.floor(Math.random() * 30) + 10,
      terrain,
      adjacentRegions: [],
      lastHarvested: null
    };
  }

  // ============================================
  // Nation Management
  // ============================================
  
  registerNation(name: string, description: string): Nation | null {
    // Find an unclaimed region for starting territory
    const unclaimedRegions = Array.from(this.regions.values()).filter(r => !r.ownerNation);
    
    if (unclaimedRegions.length === 0) {
      return null; // World is full
    }
    
    // Pick a random unclaimed region
    const startingRegion = unclaimedRegions[Math.floor(Math.random() * unclaimedRegions.length)];
    
    const id = uuidv4();
    const apiKey = `nation_${uuidv4().replace(/-/g, '')}`;
    const claimCode = `nation-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
    
    const nation: Nation = {
      id,
      name,
      founderId: description,
      apiKey,
      regions: [startingRegion.id],
      capital: startingRegion.id,
      treasury: 100,
      militaryPower: 20,
      diplomacyScore: 50,
      reputation: 0,
      taxRate: 10,
      policies: [],
      status: 'pending_claim',
      claimCode,
      createdAt: new Date(),
      lastActive: new Date()
    };
    
    // Assign region to nation
    startingRegion.ownerNation = id;
    
    this.nations.set(id, nation);
    this.nationsByApiKey.set(apiKey, nation);
    
    this.addEvent({
      type: 'nation_founded',
      nationId: id,
      nationName: name,
      regionId: startingRegion.id,
      regionName: startingRegion.name,
      message: `🏛️ The nation of "${name}" has been founded in ${startingRegion.name}!`
    });
    
    return nation;
  }
  
  getNationByApiKey(apiKey: string): Nation | undefined {
    return this.nationsByApiKey.get(apiKey);
  }
  
  getNationById(id: string): Nation | undefined {
    return this.nations.get(id);
  }
  
  claimNation(apiKey: string): boolean {
    const nation = this.nationsByApiKey.get(apiKey);
    if (nation && nation.status === 'pending_claim') {
      nation.status = 'active';
      
      this.addEvent({
        type: 'system',
        nationId: nation.id,
        nationName: nation.name,
        message: `✅ "${nation.name}" has been verified and is ready to compete!`
      });
      
      return true;
    }
    return false;
  }
  
  getAllNations(): Nation[] {
    return Array.from(this.nations.values());
  }
  
  getActiveNations(): Nation[] {
    return Array.from(this.nations.values()).filter(n => n.status === 'active');
  }

  // ============================================
  // Region Management
  // ============================================
  
  getRegion(id: string): Region | undefined {
    return this.regions.get(id);
  }
  
  getAllRegions(): Region[] {
    return Array.from(this.regions.values());
  }
  
  getUnclaimedRegions(): Region[] {
    return Array.from(this.regions.values()).filter(r => !r.ownerNation);
  }
  
  getNationRegions(nationId: string): Region[] {
    return Array.from(this.regions.values()).filter(r => r.ownerNation === nationId);
  }

  // ============================================
  // Actions
  // ============================================
  
  submitAction(nationId: string, type: string, params: Record<string, any>): Action | null {
    const nation = this.nations.get(nationId);
    if (!nation || nation.status !== 'active') return null;
    
    const action: Action = {
      id: uuidv4(),
      nationId,
      type: type as any,
      params,
      epoch: this.epoch,
      createdAt: new Date()
    };
    
    // Process action immediately (for hackathon simplicity)
    const result = this.processAction(action);
    action.result = result;
    action.processedAt = new Date();
    
    this.actions.push(action);
    nation.lastActive = new Date();
    
    return action;
  }
  
  private processAction(action: Action): { success: boolean; message: string; effects: Record<string, any> } {
    const nation = this.nations.get(action.nationId)!;
    
    switch (action.type) {
      case 'harvest':
        return this.processHarvest(nation, action.params);
      case 'trade':
        return this.processTrade(nation, action.params);
      case 'tax':
        return this.processTax(nation);
      case 'attack':
        return this.processAttack(nation, action.params);
      case 'defend':
        return this.processDefend(nation, action.params);
      case 'fortify':
        return this.processFortify(nation, action.params);
      case 'recruit':
        return this.processRecruit(nation, action.params);
      case 'propose_treaty':
        return this.processProposeTreaty(nation, action.params);
      case 'accept_treaty':
        return this.processAcceptTreaty(nation, action.params);
      case 'reject_treaty':
        return this.processRejectTreaty(nation, action.params);
      case 'break_treaty':
        return this.processBreakTreaty(nation, action.params);
      case 'set_tax_rate':
        return this.processSetTaxRate(nation, action.params);
      default:
        return { success: false, message: 'Unknown action type', effects: {} };
    }
  }
  
  // Economic Actions
  private processHarvest(nation: Nation, params: Record<string, any>): { success: boolean; message: string; effects: Record<string, any> } {
    const regionId = params.regionId || nation.capital;
    const region = this.regions.get(regionId);
    
    if (!region || region.ownerNation !== nation.id) {
      return { success: false, message: 'You do not own this region', effects: {} };
    }
    
    // Harvest 20% of resources
    const harvested = {
      energy: Math.floor(region.resources.energy * 0.2),
      food: Math.floor(region.resources.food * 0.2),
      gold: Math.floor(region.resources.gold * 0.2),
      minerals: Math.floor(region.resources.minerals * 0.2)
    };
    
    // Deplete region resources
    region.resources.energy -= harvested.energy;
    region.resources.food -= harvested.food;
    region.resources.gold -= harvested.gold;
    region.resources.minerals -= harvested.minerals;
    
    // Add gold to treasury
    nation.treasury += harvested.gold;
    region.lastHarvested = new Date();
    
    this.addEvent({
      type: 'system',
      nationId: nation.id,
      nationName: nation.name,
      regionId: region.id,
      regionName: region.name,
      message: `⛏️ "${nation.name}" harvested resources from ${region.name}: +${harvested.gold} gold`
    });
    
    return { 
      success: true, 
      message: `Harvested resources from ${region.name}`,
      effects: { harvested, newTreasury: nation.treasury }
    };
  }
  
  private processTrade(nation: Nation, params: Record<string, any>): { success: boolean; message: string; effects: Record<string, any> } {
    const { targetNationId, offer, request } = params;
    const targetNation = this.nations.get(targetNationId);
    
    if (!targetNation) {
      return { success: false, message: 'Target nation not found', effects: {} };
    }
    
    // Simple trade: exchange gold
    const offerGold = offer?.gold || 0;
    const requestGold = request?.gold || 0;
    
    if (nation.treasury < offerGold) {
      return { success: false, message: 'Insufficient treasury', effects: {} };
    }
    
    if (targetNation.treasury < requestGold) {
      return { success: false, message: 'Target has insufficient treasury', effects: {} };
    }
    
    // Execute trade
    nation.treasury -= offerGold;
    nation.treasury += requestGold;
    targetNation.treasury += offerGold;
    targetNation.treasury -= requestGold;
    
    this.addEvent({
      type: 'system',
      nationId: nation.id,
      nationName: nation.name,
      targetNationId: targetNation.id,
      targetNationName: targetNation.name,
      message: `💰 "${nation.name}" traded with "${targetNation.name}": ${offerGold} gold for ${requestGold} gold`
    });
    
    return { 
      success: true, 
      message: `Trade completed with ${targetNation.name}`,
      effects: { newTreasury: nation.treasury }
    };
  }
  
  private processTax(nation: Nation): { success: boolean; message: string; effects: Record<string, any> } {
    let totalTax = 0;
    
    for (const regionId of nation.regions) {
      const region = this.regions.get(regionId);
      if (region) {
        const tax = Math.floor(region.population * nation.taxRate / 100);
        totalTax += tax;
        
        // High taxes reduce population happiness (simplified)
        if (nation.taxRate > 30) {
          region.population = Math.max(100, region.population - Math.floor(region.population * 0.05));
        }
      }
    }
    
    nation.treasury += totalTax;
    
    this.addEvent({
      type: 'system',
      nationId: nation.id,
      nationName: nation.name,
      message: `💵 "${nation.name}" collected ${totalTax} gold in taxes (${nation.taxRate}% rate)`
    });
    
    return { 
      success: true, 
      message: `Collected ${totalTax} gold in taxes`,
      effects: { taxCollected: totalTax, newTreasury: nation.treasury }
    };
  }
  
  // Military Actions
  private processAttack(nation: Nation, params: Record<string, any>): { success: boolean; message: string; effects: Record<string, any> } {
    const { targetRegionId, message: warMessage } = params;
    const targetRegion = this.regions.get(targetRegionId);
    
    if (!targetRegion) {
      return { success: false, message: 'Target region not found', effects: {} };
    }
    
    // Check adjacency
    const nationRegions = this.getNationRegions(nation.id);
    const isAdjacent = nationRegions.some(r => r.adjacentRegions.includes(targetRegionId));
    
    if (!isAdjacent && targetRegion.ownerNation) {
      return { success: false, message: 'Target region is not adjacent to your territory', effects: {} };
    }
    
    // Attack cost
    const attackCost = 20;
    if (nation.treasury < attackCost) {
      return { success: false, message: 'Insufficient treasury for attack', effects: {} };
    }
    nation.treasury -= attackCost;
    
    // Calculate battle
    const attackScore = nation.militaryPower + Math.random() * 30;
    let defenseScore = targetRegion.defenseLevel + targetRegion.population / 20 + Math.random() * 20;
    
    // Terrain bonuses
    if (targetRegion.terrain === 'mountains') defenseScore += 20;
    if (targetRegion.terrain === 'forest') defenseScore += 10;
    
    const defenderNation = targetRegion.ownerNation ? this.nations.get(targetRegion.ownerNation) : null;
    if (defenderNation) {
      defenseScore += defenderNation.militaryPower / 2;
    }
    
    const attackerWins = attackScore > defenseScore;
    
    if (attackerWins) {
      // Transfer region
      if (defenderNation) {
        defenderNation.regions = defenderNation.regions.filter(r => r !== targetRegionId);
        defenderNation.reputation -= 5;
        
        // Check if nation is defeated
        if (defenderNation.regions.length === 0) {
          defenderNation.status = 'defeated';
          this.addEvent({
            type: 'system',
            nationId: defenderNation.id,
            nationName: defenderNation.name,
            message: `💀 "${defenderNation.name}" has been defeated! Their nation has fallen.`
          });
        }
      }
      
      targetRegion.ownerNation = nation.id;
      nation.regions.push(targetRegionId);
      nation.reputation += 3;
      
      this.addEvent({
        type: 'region_captured',
        nationId: nation.id,
        nationName: nation.name,
        targetNationId: defenderNation?.id,
        targetNationName: defenderNation?.name,
        regionId: targetRegion.id,
        regionName: targetRegion.name,
        message: `⚔️ "${nation.name}" conquers ${targetRegion.name}${defenderNation ? ` from "${defenderNation.name}"` : ''}! "${warMessage || 'Victory is ours!'}"`,
        details: { attackScore, defenseScore }
      });
      
      return { 
        success: true, 
        message: `Victory! You conquered ${targetRegion.name}`,
        effects: { 
          regionCaptured: targetRegionId,
          attackScore,
          defenseScore
        }
      };
    } else {
      // Attack failed
      nation.militaryPower = Math.max(5, nation.militaryPower - 5);
      nation.reputation -= 2;
      
      this.addEvent({
        type: 'battle_result',
        nationId: nation.id,
        nationName: nation.name,
        targetNationId: defenderNation?.id,
        targetNationName: defenderNation?.name,
        regionId: targetRegion.id,
        regionName: targetRegion.name,
        message: `🛡️ "${nation.name}" failed to capture ${targetRegion.name}! The defenders held strong.`,
        details: { attackScore, defenseScore }
      });
      
      return { 
        success: false, 
        message: `Attack failed! Defenders held ${targetRegion.name}`,
        effects: { 
          attackScore,
          defenseScore,
          militaryLost: 5
        }
      };
    }
  }
  
  private processDefend(nation: Nation, params: Record<string, any>): { success: boolean; message: string; effects: Record<string, any> } {
    const regionId = params.regionId || nation.capital;
    const region = this.regions.get(regionId);
    
    if (!region || region.ownerNation !== nation.id) {
      return { success: false, message: 'You do not own this region', effects: {} };
    }
    
    // Boost defense temporarily
    region.defenseLevel = Math.min(100, region.defenseLevel + 10);
    
    return { 
      success: true, 
      message: `Defenses boosted in ${region.name}`,
      effects: { newDefenseLevel: region.defenseLevel }
    };
  }
  
  private processFortify(nation: Nation, params: Record<string, any>): { success: boolean; message: string; effects: Record<string, any> } {
    const regionId = params.regionId || nation.capital;
    const region = this.regions.get(regionId);
    
    if (!region || region.ownerNation !== nation.id) {
      return { success: false, message: 'You do not own this region', effects: {} };
    }
    
    const cost = 30;
    if (nation.treasury < cost) {
      return { success: false, message: 'Insufficient treasury', effects: {} };
    }
    
    nation.treasury -= cost;
    region.defenseLevel = Math.min(100, region.defenseLevel + 15);
    
    this.addEvent({
      type: 'system',
      nationId: nation.id,
      nationName: nation.name,
      regionId: region.id,
      regionName: region.name,
      message: `🏰 "${nation.name}" fortified ${region.name} (defense: ${region.defenseLevel})`
    });
    
    return { 
      success: true, 
      message: `Fortified ${region.name}`,
      effects: { newDefenseLevel: region.defenseLevel, cost }
    };
  }
  
  private processRecruit(nation: Nation, params: Record<string, any>): { success: boolean; message: string; effects: Record<string, any> } {
    const cost = 25;
    if (nation.treasury < cost) {
      return { success: false, message: 'Insufficient treasury', effects: {} };
    }
    
    nation.treasury -= cost;
    nation.militaryPower = Math.min(100, nation.militaryPower + 10);
    
    this.addEvent({
      type: 'system',
      nationId: nation.id,
      nationName: nation.name,
      message: `🗡️ "${nation.name}" recruited soldiers (military: ${nation.militaryPower})`
    });
    
    return { 
      success: true, 
      message: 'Recruited soldiers',
      effects: { newMilitaryPower: nation.militaryPower, cost }
    };
  }
  
  // Diplomatic Actions
  private processProposeTreaty(nation: Nation, params: Record<string, any>): { success: boolean; message: string; effects: Record<string, any> } {
    const { targetNationId, type, duration, conditions } = params;
    const targetNation = this.nations.get(targetNationId);
    
    if (!targetNation) {
      return { success: false, message: 'Target nation not found', effects: {} };
    }
    
    const cost = 10;
    if (nation.treasury < cost) {
      return { success: false, message: 'Insufficient treasury', effects: {} };
    }
    nation.treasury -= cost;
    
    const penalties: Record<TreatyType, { gold: number; reputation: number }> = {
      non_aggression: { gold: 100, reputation: 30 },
      trade: { gold: 50, reputation: 10 },
      alliance: { gold: 200, reputation: 50 },
      vassalage: { gold: 150, reputation: 40 }
    };
    
    const penalty = penalties[type as TreatyType] || penalties.trade;
    
    const treaty: Treaty = {
      id: uuidv4(),
      type: type as TreatyType,
      proposer: nation.id,
      target: targetNationId,
      terms: {
        duration: duration || 10,
        conditions: conditions || [],
        goldPenalty: penalty.gold,
        reputationPenalty: penalty.reputation
      },
      status: 'proposed',
      createdAt: new Date(),
      expiresAt: null
    };
    
    this.treaties.set(treaty.id, treaty);
    
    this.addEvent({
      type: 'system',
      nationId: nation.id,
      nationName: nation.name,
      targetNationId: targetNation.id,
      targetNationName: targetNation.name,
      message: `📜 "${nation.name}" proposed a ${type} treaty to "${targetNation.name}"`
    });
    
    return { 
      success: true, 
      message: `Treaty proposed to ${targetNation.name}`,
      effects: { treatyId: treaty.id }
    };
  }
  
  private processAcceptTreaty(nation: Nation, params: Record<string, any>): { success: boolean; message: string; effects: Record<string, any> } {
    const { treatyId } = params;
    const treaty = this.treaties.get(treatyId);
    
    if (!treaty || treaty.target !== nation.id || treaty.status !== 'proposed') {
      return { success: false, message: 'Treaty not found or not for you', effects: {} };
    }
    
    treaty.status = 'active';
    treaty.expiresAt = new Date(Date.now() + treaty.terms.duration * this.EPOCH_DURATION);
    
    const proposer = this.nations.get(treaty.proposer);
    
    // Boost diplomacy scores
    nation.diplomacyScore = Math.min(100, nation.diplomacyScore + 5);
    if (proposer) proposer.diplomacyScore = Math.min(100, proposer.diplomacyScore + 5);
    
    this.addEvent({
      type: 'treaty_signed',
      nationId: nation.id,
      nationName: nation.name,
      targetNationId: proposer?.id,
      targetNationName: proposer?.name,
      message: `🤝 "${nation.name}" and "${proposer?.name}" signed a ${treaty.type} treaty!`
    });
    
    return { 
      success: true, 
      message: `Treaty accepted with ${proposer?.name}`,
      effects: { treatyId }
    };
  }
  
  private processRejectTreaty(nation: Nation, params: Record<string, any>): { success: boolean; message: string; effects: Record<string, any> } {
    const { treatyId } = params;
    const treaty = this.treaties.get(treatyId);
    
    if (!treaty || treaty.target !== nation.id || treaty.status !== 'proposed') {
      return { success: false, message: 'Treaty not found or not for you', effects: {} };
    }
    
    treaty.status = 'rejected';
    nation.reputation -= 2;
    
    const proposer = this.nations.get(treaty.proposer);
    
    this.addEvent({
      type: 'system',
      nationId: nation.id,
      nationName: nation.name,
      targetNationId: proposer?.id,
      targetNationName: proposer?.name,
      message: `❌ "${nation.name}" rejected the ${treaty.type} treaty from "${proposer?.name}"`
    });
    
    return { 
      success: true, 
      message: 'Treaty rejected',
      effects: { treatyId }
    };
  }
  
  private processBreakTreaty(nation: Nation, params: Record<string, any>): { success: boolean; message: string; effects: Record<string, any> } {
    const { treatyId } = params;
    const treaty = this.treaties.get(treatyId);
    
    if (!treaty || treaty.status !== 'active') {
      return { success: false, message: 'Treaty not found or not active', effects: {} };
    }
    
    if (treaty.proposer !== nation.id && treaty.target !== nation.id) {
      return { success: false, message: 'You are not party to this treaty', effects: {} };
    }
    
    treaty.status = 'broken';
    
    // Apply penalties
    nation.treasury = Math.max(0, nation.treasury - treaty.terms.goldPenalty);
    nation.reputation -= treaty.terms.reputationPenalty;
    
    const otherPartyId = treaty.proposer === nation.id ? treaty.target : treaty.proposer;
    const otherParty = this.nations.get(otherPartyId);
    
    this.addEvent({
      type: 'treaty_broken',
      nationId: nation.id,
      nationName: nation.name,
      targetNationId: otherParty?.id,
      targetNationName: otherParty?.name,
      message: `⚠️ "${nation.name}" BROKE their ${treaty.type} treaty with "${otherParty?.name}"! (-${treaty.terms.reputationPenalty} reputation)`
    });
    
    return { 
      success: true, 
      message: `Treaty broken. Penalty: ${treaty.terms.goldPenalty} gold, ${treaty.terms.reputationPenalty} reputation`,
      effects: { 
        goldPenalty: treaty.terms.goldPenalty,
        reputationPenalty: treaty.terms.reputationPenalty
      }
    };
  }
  
  // Governance Actions
  private processSetTaxRate(nation: Nation, params: Record<string, any>): { success: boolean; message: string; effects: Record<string, any> } {
    const { rate } = params;
    
    if (rate < 0 || rate > 50) {
      return { success: false, message: 'Tax rate must be between 0 and 50', effects: {} };
    }
    
    nation.taxRate = rate;
    
    return { 
      success: true, 
      message: `Tax rate set to ${rate}%`,
      effects: { newTaxRate: rate }
    };
  }

  // ============================================
  // Treaties & Wars
  // ============================================
  
  getAllTreaties(): Treaty[] {
    return Array.from(this.treaties.values());
  }
  
  getActiveTreaties(): Treaty[] {
    return Array.from(this.treaties.values()).filter(t => t.status === 'active');
  }
  
  getNationTreaties(nationId: string): Treaty[] {
    return Array.from(this.treaties.values()).filter(
      t => (t.proposer === nationId || t.target === nationId) && t.status !== 'rejected'
    );
  }
  
  getPendingTreaties(nationId: string): Treaty[] {
    return Array.from(this.treaties.values()).filter(
      t => t.target === nationId && t.status === 'proposed'
    );
  }
  
  getAllWars(): War[] {
    return Array.from(this.wars.values());
  }
  
  getActiveWars(): War[] {
    return Array.from(this.wars.values()).filter(w => w.status !== 'resolved');
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
    
    // Keep last 500 events
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
    return {
      epoch: this.epoch,
      epochStartTime: this.epochStartTime,
      epochDuration: this.EPOCH_DURATION,
      totalNations: this.nations.size,
      totalRegions: this.regions.size,
      activeWars: this.getActiveWars().length,
      activeTreaties: this.getActiveTreaties().length
    };
  }
  
  advanceEpoch(): boolean {
    if (Date.now() < this.epochStartTime + this.EPOCH_DURATION) {
      return false;
    }
    
    this.epoch++;
    this.epochStartTime = Date.now();
    
    // Regenerate resources (5% per epoch)
    for (const region of this.regions.values()) {
      region.resources.energy = Math.min(100, region.resources.energy + 5);
      region.resources.food = Math.min(100, region.resources.food + 5);
      region.resources.gold = Math.min(100, region.resources.gold + 5);
      region.resources.minerals = Math.min(100, region.resources.minerals + 5);
      
      // Population growth (if food available)
      if (region.resources.food > 30 && region.ownerNation) {
        region.population = Math.min(1000, region.population + Math.floor(region.population * 0.02));
      }
    }
    
    // Expire old treaties
    for (const treaty of this.treaties.values()) {
      if (treaty.status === 'active' && treaty.expiresAt && new Date() > treaty.expiresAt) {
        treaty.status = 'expired';
      }
    }
    
    this.addEvent({
      type: 'epoch_end',
      message: `📅 Epoch ${this.epoch} begins. Resources regenerated. The world continues...`
    });
    
    return true;
  }

  // ============================================
  // Leaderboard
  // ============================================
  
  getLeaderboard(): LeaderboardEntry[] {
    const entries: LeaderboardEntry[] = [];
    
    for (const nation of this.nations.values()) {
      if (nation.status === 'defeated') continue;
      
      const score = 
        nation.regions.length * 100 +
        nation.treasury * 2 +
        nation.militaryPower * 3 +
        Math.max(0, nation.reputation) * 2;
      
      entries.push({
        rank: 0,
        nationId: nation.id,
        nationName: nation.name,
        regions: nation.regions.length,
        treasury: nation.treasury,
        militaryPower: nation.militaryPower,
        reputation: nation.reputation,
        score
      });
    }
    
    entries.sort((a, b) => b.score - a.score);
    entries.forEach((e, i) => e.rank = i + 1);
    
    return entries;
  }

  // ============================================
  // Action History
  // ============================================
  
  getActionHistory(nationId?: string): Action[] {
    if (nationId) {
      return this.actions.filter(a => a.nationId === nationId).slice(-50);
    }
    return this.actions.slice(-100);
  }
}

export const worldState = new WorldStateService();

