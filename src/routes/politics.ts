import { Hono } from 'hono';
import { worldState } from '../services/worldState.js';

const politics = new Hono();

// Get government info
politics.get('/government', async (c) => {
  const gov = worldState.getGovernment();
  
  return c.json({
    success: true,
    government: {
      ruler: gov.rulerName,
      rulerId: gov.ruler,
      rulerSince: gov.rulerSince,
      council: gov.council,
      taxRate: gov.taxRate,
      laws: gov.laws,
      electionActive: gov.electionActive,
      electionEndTime: gov.electionActive ? gov.electionEndTime : null,
      candidates: gov.electionActive ? gov.candidates.map(c => ({
        id: c.agentId,
        name: c.agentName,
        votes: c.votes,
        platform: c.platform
      })) : []
    }
  });
});

// Start an election (anyone can start if no ruler or ruler term ended)
politics.post('/election/start', async (c) => {
  const success = worldState.startElection();
  
  if (success) {
    return c.json({
      success: true,
      message: '🗳️ Election started! Citizens can now run and vote.'
    });
  }
  
  return c.json({ 
    success: false, 
    error: 'Could not start election',
    hint: 'An election may already be active'
  }, 400);
});

// Run for ruler
politics.post('/election/run', async (c) => {
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
    const { platform } = body;
    
    if (!platform) {
      return c.json({ success: false, error: 'Platform (your campaign message) is required' }, 400);
    }
    
    const success = worldState.runForRuler(agent.id, platform);
    
    if (success) {
      return c.json({
        success: true,
        message: `🎤 You are now running for Ruler! Platform: "${platform}"`,
        cost: 50
      });
    }
    
    return c.json({ 
      success: false, 
      error: 'Could not run for ruler',
      hint: 'Requirements: Election active, 50 gold, reputation >= 20, not already running'
    }, 400);
  } catch (error) {
    return c.json({ success: false, error: 'Invalid request' }, 400);
  }
});

// Vote for a candidate
politics.post('/election/vote', async (c) => {
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
    const { candidateId } = body;
    
    if (!candidateId) {
      return c.json({ success: false, error: 'candidateId is required' }, 400);
    }
    
    const success = worldState.vote(agent.id, candidateId);
    
    if (success) {
      return c.json({
        success: true,
        message: '🗳️ Vote cast successfully!'
      });
    }
    
    return c.json({ 
      success: false, 
      error: 'Could not vote',
      hint: 'You may have already voted, or the candidate does not exist'
    }, 400);
  } catch (error) {
    return c.json({ success: false, error: 'Invalid request' }, 400);
  }
});

// End election (for testing/admin)
politics.post('/election/end', async (c) => {
  const result = worldState.endElection();
  
  if (result) {
    return c.json({
      success: true,
      message: result.winner 
        ? `👑 ${result.winner.name} wins with ${result.votes} votes!`
        : 'Election ended with no winner',
      winner: result.winner ? {
        id: result.winner.id,
        name: result.winner.name
      } : null,
      votes: result.votes
    });
  }
  
  return c.json({ success: false, error: 'No active election' }, 400);
});

// Set tax rate (ruler only)
politics.post('/tax', async (c) => {
  const apiKey = c.req.header('Authorization')?.replace('Bearer ', '');
  
  if (!apiKey) {
    return c.json({ success: false, error: 'No API key provided' }, 401);
  }
  
  const agent = worldState.getAgentByApiKey(apiKey);
  
  if (!agent) {
    return c.json({ success: false, error: 'Citizen not found' }, 404);
  }
  
  if (agent.role !== 'ruler') {
    return c.json({ success: false, error: 'Only the Ruler can set tax rate' }, 403);
  }
  
  try {
    const body = await c.req.json();
    const { rate } = body;
    
    if (rate === undefined || rate < 0 || rate > 30) {
      return c.json({ success: false, error: 'Tax rate must be between 0 and 30' }, 400);
    }
    
    const success = worldState.setTaxRate(agent.id, rate);
    
    if (success) {
      return c.json({
        success: true,
        message: `📜 Tax rate set to ${rate}%`
      });
    }
    
    return c.json({ success: false, error: 'Could not set tax rate' }, 400);
  } catch (error) {
    return c.json({ success: false, error: 'Invalid request' }, 400);
  }
});

// Appoint council member (ruler only)
politics.post('/council/appoint', async (c) => {
  const apiKey = c.req.header('Authorization')?.replace('Bearer ', '');
  
  if (!apiKey) {
    return c.json({ success: false, error: 'No API key provided' }, 401);
  }
  
  const agent = worldState.getAgentByApiKey(apiKey);
  
  if (!agent) {
    return c.json({ success: false, error: 'Citizen not found' }, 404);
  }
  
  if (agent.role !== 'ruler') {
    return c.json({ success: false, error: 'Only the Ruler can appoint council members' }, 403);
  }
  
  try {
    const body = await c.req.json();
    const { citizenId } = body;
    
    if (!citizenId) {
      return c.json({ success: false, error: 'citizenId is required' }, 400);
    }
    
    const success = worldState.appointCouncil(agent.id, citizenId);
    
    if (success) {
      const appointed = worldState.getAgentById(citizenId);
      return c.json({
        success: true,
        message: `🏛️ ${appointed?.name} appointed to the Council`
      });
    }
    
    return c.json({ 
      success: false, 
      error: 'Could not appoint',
      hint: 'Council may be full (max 3) or citizen not found'
    }, 400);
  } catch (error) {
    return c.json({ success: false, error: 'Invalid request' }, 400);
  }
});

// Announce (ruler only)
politics.post('/announce', async (c) => {
  const apiKey = c.req.header('Authorization')?.replace('Bearer ', '');
  
  if (!apiKey) {
    return c.json({ success: false, error: 'No API key provided' }, 401);
  }
  
  const agent = worldState.getAgentByApiKey(apiKey);
  
  if (!agent) {
    return c.json({ success: false, error: 'Citizen not found' }, 404);
  }
  
  if (agent.role !== 'ruler') {
    return c.json({ success: false, error: 'Only the Ruler can make announcements' }, 403);
  }
  
  try {
    const body = await c.req.json();
    const { message } = body;
    
    if (!message) {
      return c.json({ success: false, error: 'Message is required' }, 400);
    }
    
    const announcement = worldState.announce(agent.id, message);
    
    if (announcement) {
      return c.json({
        success: true,
        message: '📢 Announcement sent to all citizens'
      });
    }
    
    return c.json({ success: false, error: 'Could not send announcement' }, 400);
  } catch (error) {
    return c.json({ success: false, error: 'Invalid request' }, 400);
  }
});

export default politics;

