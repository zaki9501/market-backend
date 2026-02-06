import { Hono } from 'hono';
import { worldState } from '../services/worldState.js';
import { LocationType, LOCATION_NAMES, LOCATION_DESCRIPTIONS } from '../types/index.js';

const citizen = new Hono();

// Get my profile
citizen.get('/me', async (c) => {
  const apiKey = c.req.header('Authorization')?.replace('Bearer ', '');
  
  if (!apiKey) {
    return c.json({ success: false, error: 'No API key provided' }, 401);
  }
  
  const agent = worldState.getAgentByApiKey(apiKey);
  
  if (!agent) {
    return c.json({ success: false, error: 'Citizen not found' }, 404);
  }
  
  return c.json({
    success: true,
    me: {
      id: agent.id,
      name: agent.name,
      status: agent.status,
      location: {
        id: agent.currentLocation,
        name: LOCATION_NAMES[agent.currentLocation]
      },
      gold: agent.gold,
      bankBalance: agent.bankBalance,
      inventory: agent.inventory,
      job: agent.job,
      reputation: agent.reputation,
      role: agent.role,
      friends: agent.friends,
      blocked: agent.blocked,
      votedFor: agent.votedFor,
      stats: {
        totalEarned: agent.totalEarned,
        totalSpent: agent.totalSpent,
        createdAt: agent.createdAt,
        lastActive: agent.lastActive
      }
    }
  });
});

// Move to a location
citizen.post('/move', async (c) => {
  const apiKey = c.req.header('Authorization')?.replace('Bearer ', '');
  
  if (!apiKey) {
    return c.json({ success: false, error: 'No API key provided' }, 401);
  }
  
  const agent = worldState.getAgentByApiKey(apiKey);
  
  if (!agent) {
    return c.json({ success: false, error: 'Citizen not found' }, 404);
  }
  
  try {
    const body = await c.req.json();
    const { location } = body;
    
    const validLocations: LocationType[] = ['town_square', 'marketplace', 'town_hall', 'tavern', 'workshop', 'bank'];
    
    if (!validLocations.includes(location)) {
      return c.json({
        success: false,
        error: 'Invalid location',
        valid_locations: validLocations.map(l => ({ id: l, name: LOCATION_NAMES[l] }))
      }, 400);
    }
    
    const typedLocation = location as LocationType;
    const success = worldState.moveAgent(agent.id, typedLocation);
    
    if (success) {
      const locationInfo = worldState.getLocationInfo(typedLocation);
      return c.json({
        success: true,
        message: `You moved to ${LOCATION_NAMES[typedLocation]}`,
        location: {
          id: typedLocation,
          name: locationInfo.name,
          description: locationInfo.description,
          citizens: locationInfo.agents
        }
      });
    }
    
    return c.json({ success: false, error: 'Could not move' }, 400);
  } catch (error) {
    return c.json({ success: false, error: 'Invalid request' }, 400);
  }
});

// Get current location info
citizen.get('/location', async (c) => {
  const apiKey = c.req.header('Authorization')?.replace('Bearer ', '');
  
  if (!apiKey) {
    return c.json({ success: false, error: 'No API key provided' }, 401);
  }
  
  const agent = worldState.getAgentByApiKey(apiKey);
  
  if (!agent) {
    return c.json({ success: false, error: 'Citizen not found' }, 404);
  }
  
  const locationInfo = worldState.getLocationInfo(agent.currentLocation);
  
  return c.json({
    success: true,
    location: {
      id: agent.currentLocation,
      name: locationInfo.name,
      description: locationInfo.description,
      citizens: locationInfo.agents
    }
  });
});

// Add friend
citizen.post('/friend', async (c) => {
  const apiKey = c.req.header('Authorization')?.replace('Bearer ', '');
  
  if (!apiKey) {
    return c.json({ success: false, error: 'No API key provided' }, 401);
  }
  
  const agent = worldState.getAgentByApiKey(apiKey);
  
  if (!agent) {
    return c.json({ success: false, error: 'Citizen not found' }, 404);
  }
  
  try {
    const body = await c.req.json();
    const { citizenId } = body;
    
    const success = worldState.addFriend(agent.id, citizenId);
    
    if (success) {
      return c.json({ success: true, message: 'Friend added' });
    }
    
    return c.json({ success: false, error: 'Could not add friend' }, 400);
  } catch (error) {
    return c.json({ success: false, error: 'Invalid request' }, 400);
  }
});

// Block citizen
citizen.post('/block', async (c) => {
  const apiKey = c.req.header('Authorization')?.replace('Bearer ', '');
  
  if (!apiKey) {
    return c.json({ success: false, error: 'No API key provided' }, 401);
  }
  
  const agent = worldState.getAgentByApiKey(apiKey);
  
  if (!agent) {
    return c.json({ success: false, error: 'Citizen not found' }, 404);
  }
  
  try {
    const body = await c.req.json();
    const { citizenId } = body;
    
    const success = worldState.blockAgent(agent.id, citizenId);
    
    if (success) {
      return c.json({ success: true, message: 'Citizen blocked' });
    }
    
    return c.json({ success: false, error: 'Could not block' }, 400);
  } catch (error) {
    return c.json({ success: false, error: 'Invalid request' }, 400);
  }
});

export default citizen;

