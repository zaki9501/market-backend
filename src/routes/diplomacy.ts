import { Hono } from 'hono';
import { worldState } from '../services/worldState.js';

const diplomacy = new Hono();

// Get all treaties
diplomacy.get('/treaties', async (c) => {
  const status = c.req.query('status'); // 'active', 'proposed', 'all'
  
  let treaties;
  if (status === 'active') {
    treaties = worldState.getActiveTreaties();
  } else {
    treaties = worldState.getAllTreaties();
  }
  
  const nations = worldState.getAllNations();
  
  return c.json({
    success: true,
    treaties: treaties.map(t => ({
      id: t.id,
      type: t.type,
      proposer: t.proposer,
      proposerName: nations.find(n => n.id === t.proposer)?.name,
      target: t.target,
      targetName: nations.find(n => n.id === t.target)?.name,
      status: t.status,
      terms: t.terms,
      createdAt: t.createdAt,
      expiresAt: t.expiresAt
    })),
    total: treaties.length
  });
});

// Get my treaties
diplomacy.get('/treaties/mine', async (c) => {
  const apiKey = c.req.header('Authorization')?.replace('Bearer ', '');
  
  if (!apiKey) {
    return c.json({ success: false, error: 'No API key provided' }, 401);
  }
  
  const nation = worldState.getNationByApiKey(apiKey);
  
  if (!nation) {
    return c.json({ success: false, error: 'Nation not found' }, 404);
  }
  
  const treaties = worldState.getNationTreaties(nation.id);
  const pending = worldState.getPendingTreaties(nation.id);
  const nations = worldState.getAllNations();
  
  return c.json({
    success: true,
    treaties: treaties.map(t => ({
      id: t.id,
      type: t.type,
      proposer: t.proposer,
      proposerName: nations.find(n => n.id === t.proposer)?.name,
      target: t.target,
      targetName: nations.find(n => n.id === t.target)?.name,
      status: t.status,
      terms: t.terms,
      createdAt: t.createdAt,
      expiresAt: t.expiresAt
    })),
    pending: pending.map(t => ({
      id: t.id,
      type: t.type,
      proposer: t.proposer,
      proposerName: nations.find(n => n.id === t.proposer)?.name,
      terms: t.terms,
      createdAt: t.createdAt
    }))
  });
});

// Get all wars
diplomacy.get('/wars', async (c) => {
  const wars = worldState.getAllWars();
  const nations = worldState.getAllNations();
  const regions = worldState.getAllRegions();
  
  return c.json({
    success: true,
    wars: wars.map(w => ({
      id: w.id,
      attacker: w.attacker,
      attackerName: nations.find(n => n.id === w.attacker)?.name,
      defender: w.defender,
      defenderName: nations.find(n => n.id === w.defender)?.name,
      targetRegion: w.targetRegion,
      targetRegionName: regions.find(r => r.id === w.targetRegion)?.name,
      status: w.status,
      result: w.result,
      createdAt: w.createdAt,
      resolvedAt: w.resolvedAt
    })),
    total: wars.length
  });
});

// Get active wars only
diplomacy.get('/wars/active', async (c) => {
  const wars = worldState.getActiveWars();
  const nations = worldState.getAllNations();
  const regions = worldState.getAllRegions();
  
  return c.json({
    success: true,
    wars: wars.map(w => ({
      id: w.id,
      attacker: w.attacker,
      attackerName: nations.find(n => n.id === w.attacker)?.name,
      defender: w.defender,
      defenderName: nations.find(n => n.id === w.defender)?.name,
      targetRegion: w.targetRegion,
      targetRegionName: regions.find(r => r.id === w.targetRegion)?.name,
      status: w.status,
      createdAt: w.createdAt
    })),
    total: wars.length
  });
});

export default diplomacy;

