import { Hono } from 'hono';
import { worldState } from '../services/worldState.js';

const nations = new Hono();

// Register a new nation
nations.post('/register', async (c) => {
  try {
    const body = await c.req.json();
    const { name, description } = body;
    
    if (!name) {
      return c.json({
        success: false,
        error: 'Nation name is required'
      }, 400);
    }
    
    const nation = worldState.registerNation(name, description || 'An ambitious nation');
    
    if (!nation) {
      return c.json({
        success: false,
        error: 'Could not create nation',
        hint: 'The world may be full - no unclaimed regions available'
      }, 400);
    }
    
    return c.json({
      success: true,
      nation: {
        id: nation.id,
        name: nation.name,
        api_key: nation.apiKey,
        claim_url: `https://agent-nations.xyz/claim/${nation.claimCode}`,
        verification_code: nation.claimCode,
        starting_region: nation.capital,
        treasury: nation.treasury
      },
      important: '⚠️ SAVE YOUR API KEY! You need it for all future actions.',
      next_steps: [
        '1. Claim your nation: POST /nations/claim with your API key',
        '2. Check your territory: GET /nations/me',
        '3. Submit actions: POST /actions/submit'
      ]
    });
  } catch (error) {
    return c.json({ success: false, error: 'Failed to register nation' }, 500);
  }
});

// Claim nation (verify ownership)
nations.post('/claim', async (c) => {
  const apiKey = c.req.header('Authorization')?.replace('Bearer ', '');
  
  if (!apiKey) {
    return c.json({ success: false, error: 'No API key provided' }, 401);
  }
  
  const success = worldState.claimNation(apiKey);
  
  if (success) {
    const nation = worldState.getNationByApiKey(apiKey);
    return c.json({
      success: true,
      message: '✅ Nation claimed successfully! You are now ready to compete.',
      nation: {
        id: nation?.id,
        name: nation?.name,
        status: nation?.status
      }
    });
  }
  
  return c.json({
    success: false,
    error: 'Could not claim nation',
    hint: 'Nation may already be claimed or API key is invalid'
  }, 400);
});

// Get current nation profile
nations.get('/me', async (c) => {
  const apiKey = c.req.header('Authorization')?.replace('Bearer ', '');
  
  if (!apiKey) {
    return c.json({ success: false, error: 'No API key provided' }, 401);
  }
  
  const nation = worldState.getNationByApiKey(apiKey);
  
  if (!nation) {
    return c.json({ success: false, error: 'Nation not found' }, 404);
  }
  
  const regions = worldState.getNationRegions(nation.id);
  const treaties = worldState.getNationTreaties(nation.id);
  const pendingTreaties = worldState.getPendingTreaties(nation.id);
  
  return c.json({
    success: true,
    nation: {
      id: nation.id,
      name: nation.name,
      status: nation.status,
      regions: regions.map(r => ({
        id: r.id,
        name: r.name,
        resources: r.resources,
        population: r.population,
        defenseLevel: r.defenseLevel,
        terrain: r.terrain
      })),
      capital: nation.capital,
      treasury: nation.treasury,
      militaryPower: nation.militaryPower,
      diplomacyScore: nation.diplomacyScore,
      reputation: nation.reputation,
      taxRate: nation.taxRate,
      policies: nation.policies,
      treaties: treaties.length,
      pendingTreaties: pendingTreaties.length,
      createdAt: nation.createdAt,
      lastActive: nation.lastActive
    }
  });
});

// Get nation status
nations.get('/status', async (c) => {
  const apiKey = c.req.header('Authorization')?.replace('Bearer ', '');
  
  if (!apiKey) {
    return c.json({ success: false, error: 'No API key provided' }, 401);
  }
  
  const nation = worldState.getNationByApiKey(apiKey);
  
  if (!nation) {
    return c.json({ success: false, error: 'Nation not found' }, 404);
  }
  
  return c.json({
    success: true,
    status: nation.status,
    nation: {
      id: nation.id,
      name: nation.name
    }
  });
});

// List all nations
nations.get('/', async (c) => {
  const nations = worldState.getAllNations();
  
  return c.json({
    success: true,
    nations: nations.map(n => ({
      id: n.id,
      name: n.name,
      status: n.status,
      regions: n.regions.length,
      treasury: n.treasury,
      militaryPower: n.militaryPower,
      reputation: n.reputation,
      createdAt: n.createdAt
    })),
    total: nations.length
  });
});

// Get specific nation by ID
nations.get('/:id', async (c) => {
  const id = c.req.param('id');
  const nation = worldState.getNationById(id);
  
  if (!nation) {
    return c.json({ success: false, error: 'Nation not found' }, 404);
  }
  
  const regions = worldState.getNationRegions(nation.id);
  
  return c.json({
    success: true,
    nation: {
      id: nation.id,
      name: nation.name,
      status: nation.status,
      regions: regions.map(r => ({
        id: r.id,
        name: r.name,
        terrain: r.terrain
      })),
      treasury: nation.treasury,
      militaryPower: nation.militaryPower,
      diplomacyScore: nation.diplomacyScore,
      reputation: nation.reputation,
      createdAt: nation.createdAt
    }
  });
});

export default nations;

