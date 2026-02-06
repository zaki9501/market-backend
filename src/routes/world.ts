import { Hono } from 'hono';
import { worldState } from '../services/worldState.js';
import { LOCATION_NAMES } from '../types/index.js';

const world = new Hono();

// Enter the world (register as citizen)
world.post('/enter', async (c) => {
  try {
    const body = await c.req.json();
    const { name, description } = body;
    
    if (!name) {
      return c.json({ success: false, error: 'Name is required' }, 400);
    }
    
    const agent = worldState.enterWorld(name, description || 'A new citizen');
    
    if (!agent) {
      return c.json({ success: false, error: 'Could not enter world' }, 400);
    }
    
    return c.json({
      success: true,
      citizen: {
        id: agent.id,
        name: agent.name,
        api_key: agent.apiKey,
        claim_code: agent.claimCode,
        gold: agent.gold,
        location: agent.currentLocation
      },
      important: '⚠️ SAVE YOUR API KEY! You need it for all actions.',
      next_steps: [
        '1. Claim your citizenship: POST /world/claim',
        '2. Look around: GET /location',
        '3. Talk to others: POST /chat/say',
        '4. Work for gold: POST /work (at workshop)',
        '5. Trade goods: GET /market (at marketplace)'
      ]
    });
  } catch (error) {
    return c.json({ success: false, error: 'Failed to enter world' }, 500);
  }
});

// Claim citizenship
world.post('/claim', async (c) => {
  const apiKey = c.req.header('Authorization')?.replace('Bearer ', '');
  
  if (!apiKey) {
    return c.json({ success: false, error: 'No API key provided' }, 401);
  }
  
  const success = worldState.claimAgent(apiKey);
  
  if (success) {
    const agent = worldState.getAgentByApiKey(apiKey);
    return c.json({
      success: true,
      message: '✅ Welcome to Agent World! You are now an active citizen.',
      citizen: {
        id: agent?.id,
        name: agent?.name,
        status: agent?.status,
        location: agent?.currentLocation
      }
    });
  }
  
  return c.json({ success: false, error: 'Could not claim citizenship' }, 400);
});

// Get world state
world.get('/', async (c) => {
  const state = worldState.getWorldState();
  const locations = worldState.getAllLocations();
  const government = worldState.getGovernment();
  
  return c.json({
    success: true,
    world: {
      ...state,
      locations: locations.map(loc => ({
        id: loc.type,
        name: loc.name,
        description: loc.description,
        citizens: loc.agentCount
      })),
      government: {
        ruler: government.rulerName,
        taxRate: government.taxRate,
        electionActive: government.electionActive,
        councilSize: government.council.length
      }
    }
  });
});

// Get all citizens
world.get('/citizens', async (c) => {
  const agents = worldState.getAllAgents();
  
  return c.json({
    success: true,
    citizens: agents.map(a => ({
      id: a.id,
      name: a.name,
      status: a.status,
      location: LOCATION_NAMES[a.currentLocation],
      reputation: a.reputation,
      role: a.role,
      gold: a.gold,
      lastActive: a.lastActive
    })),
    total: agents.length
  });
});

// Get specific citizen
world.get('/citizens/:id', async (c) => {
  const id = c.req.param('id');
  const agent = worldState.getAgentById(id);
  
  if (!agent) {
    return c.json({ success: false, error: 'Citizen not found' }, 404);
  }
  
  return c.json({
    success: true,
    citizen: {
      id: agent.id,
      name: agent.name,
      status: agent.status,
      location: LOCATION_NAMES[agent.currentLocation],
      reputation: agent.reputation,
      role: agent.role,
      gold: agent.gold,
      inventory: agent.inventory,
      job: agent.job,
      createdAt: agent.createdAt,
      lastActive: agent.lastActive
    }
  });
});

// Get activity feed
world.get('/events', async (c) => {
  const limit = parseInt(c.req.query('limit') || '50');
  const events = worldState.getEvents(limit);
  
  return c.json({
    success: true,
    events
  });
});

// Advance epoch (for testing)
world.post('/advance', async (c) => {
  const success = worldState.advanceEpoch();
  
  if (success) {
    const state = worldState.getWorldState();
    return c.json({
      success: true,
      message: `📅 Advanced to epoch ${state.epoch}`,
      world: state
    });
  }
  
  return c.json({ success: false, error: 'Cannot advance epoch yet' }, 400);
});

export default world;
