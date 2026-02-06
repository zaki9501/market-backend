import { Hono } from 'hono';
import { worldState } from '../services/worldState.js';

const world = new Hono();

// Get world state
world.get('/', async (c) => {
  const state = worldState.getWorldState();
  const regions = worldState.getAllRegions();
  const nations = worldState.getAllNations();
  
  return c.json({
    success: true,
    world: {
      ...state,
      regions: regions.map(r => ({
        id: r.id,
        name: r.name,
        owner: r.ownerNation,
        ownerName: r.ownerNation ? nations.find(n => n.id === r.ownerNation)?.name : null,
        terrain: r.terrain,
        resources: r.resources,
        population: r.population,
        defenseLevel: r.defenseLevel,
        adjacentRegions: r.adjacentRegions
      }))
    }
  });
});

// Get all regions
world.get('/regions', async (c) => {
  const regions = worldState.getAllRegions();
  const nations = worldState.getAllNations();
  
  return c.json({
    success: true,
    regions: regions.map(r => ({
      id: r.id,
      name: r.name,
      owner: r.ownerNation,
      ownerName: r.ownerNation ? nations.find(n => n.id === r.ownerNation)?.name : null,
      terrain: r.terrain,
      resources: r.resources,
      population: r.population,
      defenseLevel: r.defenseLevel,
      adjacentRegions: r.adjacentRegions
    })),
    total: regions.length
  });
});

// Get unclaimed regions
world.get('/regions/unclaimed', async (c) => {
  const regions = worldState.getUnclaimedRegions();
  
  return c.json({
    success: true,
    regions: regions.map(r => ({
      id: r.id,
      name: r.name,
      terrain: r.terrain,
      resources: r.resources,
      population: r.population,
      defenseLevel: r.defenseLevel,
      adjacentRegions: r.adjacentRegions
    })),
    total: regions.length
  });
});

// Get specific region
world.get('/regions/:id', async (c) => {
  const id = c.req.param('id');
  const region = worldState.getRegion(id);
  
  if (!region) {
    return c.json({ success: false, error: 'Region not found' }, 404);
  }
  
  const owner = region.ownerNation ? worldState.getNationById(region.ownerNation) : null;
  
  return c.json({
    success: true,
    region: {
      id: region.id,
      name: region.name,
      owner: region.ownerNation,
      ownerName: owner?.name || null,
      terrain: region.terrain,
      resources: region.resources,
      population: region.population,
      defenseLevel: region.defenseLevel,
      adjacentRegions: region.adjacentRegions,
      lastHarvested: region.lastHarvested
    }
  });
});

// Get leaderboard
world.get('/leaderboard', async (c) => {
  const leaderboard = worldState.getLeaderboard();
  
  return c.json({
    success: true,
    leaderboard
  });
});

// Get world events feed
world.get('/events', async (c) => {
  const limit = parseInt(c.req.query('limit') || '50');
  const events = worldState.getEvents(limit);
  
  return c.json({
    success: true,
    events
  });
});

// Advance epoch (for testing/admin)
world.post('/advance-epoch', async (c) => {
  const success = worldState.advanceEpoch();
  
  if (success) {
    const state = worldState.getWorldState();
    return c.json({
      success: true,
      message: `📅 Advanced to epoch ${state.epoch}`,
      world: state
    });
  }
  
  return c.json({
    success: false,
    error: 'Cannot advance epoch yet',
    hint: 'Epoch duration not complete'
  }, 400);
});

export default world;

