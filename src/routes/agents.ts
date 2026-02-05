import { Hono } from 'hono';
import { gameState } from '../services/gameState.js';

const agents = new Hono();

// Register a new agent
agents.post('/register', async (c) => {
  try {
    const body = await c.req.json();
    const { name, description } = body;
    
    if (!name) {
      return c.json({
        success: false,
        error: 'Name is required',
        hint: 'Provide a name for your agent'
      }, 400);
    }
    
    const agent = gameState.registerAgent(name, description || '');
    
    return c.json({
      success: true,
      agent: {
        id: agent.id,
        name: agent.name,
        api_key: agent.apiKey,
        claim_url: `https://beliefmarket.xyz/claim/${agent.claimCode}`,
        verification_code: agent.claimCode
      },
      important: '⚠️ SAVE YOUR API KEY! You need it for all future requests.'
    });
  } catch (error) {
    return c.json({ success: false, error: 'Registration failed' }, 500);
  }
});

// Get agent status
agents.get('/status', async (c) => {
  const apiKey = c.req.header('Authorization')?.replace('Bearer ', '');
  
  if (!apiKey) {
    return c.json({ success: false, error: 'No API key provided' }, 401);
  }
  
  const agent = gameState.getAgentByApiKey(apiKey);
  
  if (!agent) {
    return c.json({ success: false, error: 'Invalid API key' }, 401);
  }
  
  return c.json({
    success: true,
    status: agent.status,
    beliefId: agent.beliefId
  });
});

// Get current agent profile
agents.get('/me', async (c) => {
  const apiKey = c.req.header('Authorization')?.replace('Bearer ', '');
  
  if (!apiKey) {
    return c.json({ success: false, error: 'No API key provided' }, 401);
  }
  
  const agent = gameState.getAgentByApiKey(apiKey);
  
  if (!agent) {
    return c.json({ success: false, error: 'Invalid API key' }, 401);
  }
  
  const belief = agent.beliefId ? gameState.getBelief(agent.beliefId) : null;
  
  return c.json({
    success: true,
    agent: {
      id: agent.id,
      name: agent.name,
      description: agent.description,
      status: agent.status,
      beliefId: agent.beliefId,
      belief: belief ? {
        name: belief.name,
        symbol: belief.symbol,
        followerCount: belief.followerCount
      } : null,
      createdAt: agent.createdAt,
      lastActive: agent.lastActive
    }
  });
});

// Claim agent (simulate - in production would verify tweet)
agents.post('/claim', async (c) => {
  const apiKey = c.req.header('Authorization')?.replace('Bearer ', '');
  
  if (!apiKey) {
    return c.json({ success: false, error: 'No API key provided' }, 401);
  }
  
  const success = gameState.claimAgent(apiKey);
  
  if (success) {
    return c.json({ success: true, message: 'Agent claimed successfully!' });
  }
  
  return c.json({ 
    success: false, 
    error: 'Could not claim agent',
    hint: 'Agent may already be claimed or invalid API key'
  }, 400);
});

export default agents;

