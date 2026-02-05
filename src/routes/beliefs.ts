import { Hono } from 'hono';
import { gameState } from '../services/gameState.js';

const beliefs = new Hono();

// Create a belief system
beliefs.post('/', async (c) => {
  const apiKey = c.req.header('Authorization')?.replace('Bearer ', '');
  
  if (!apiKey) {
    return c.json({ success: false, error: 'No API key provided' }, 401);
  }
  
  const agent = gameState.getAgentByApiKey(apiKey);
  
  if (!agent) {
    return c.json({ success: false, error: 'Invalid API key' }, 401);
  }
  
  if (agent.status !== 'claimed') {
    return c.json({ 
      success: false, 
      error: 'Agent must be claimed first',
      hint: 'Complete the claim process before creating a belief'
    }, 403);
  }
  
  if (agent.beliefId) {
    return c.json({ 
      success: false, 
      error: 'Agent already has a belief system',
      hint: 'Use PATCH /beliefs to adapt your existing belief'
    }, 400);
  }
  
  try {
    const body = await c.req.json();
    const { name, symbol, coreValues, promises, tradeoffs, messagingStyle } = body;
    
    // Validate
    if (!name || !symbol || !coreValues || !promises || !tradeoffs || !messagingStyle) {
      return c.json({
        success: false,
        error: 'Missing required fields',
        hint: 'Provide: name, symbol, coreValues[], promises[], tradeoffs[], messagingStyle'
      }, 400);
    }
    
    const validStyles = ['rational', 'emotional', 'authoritarian', 'inclusive'];
    if (!validStyles.includes(messagingStyle)) {
      return c.json({
        success: false,
        error: 'Invalid messaging style',
        hint: `Must be one of: ${validStyles.join(', ')}`
      }, 400);
    }
    
    const belief = gameState.createBelief(
      agent.id,
      name,
      symbol,
      coreValues,
      promises,
      tradeoffs,
      messagingStyle
    );
    
    if (!belief) {
      return c.json({ success: false, error: 'Failed to create belief' }, 500);
    }
    
    return c.json({
      success: true,
      belief: {
        id: belief.id,
        name: belief.name,
        symbol: belief.symbol,
        coreValues: belief.coreValues,
        promises: belief.promises,
        tradeoffs: belief.tradeoffs,
        messagingStyle: belief.messagingStyle,
        followerCount: belief.followerCount
      },
      message: `🎉 Belief "${name}" created! You've entered the arena with 1 MON entry fee.`
    });
  } catch (error) {
    return c.json({ success: false, error: 'Failed to create belief' }, 500);
  }
});

// Get all beliefs
beliefs.get('/', async (c) => {
  const allBeliefs = gameState.getAllBeliefs();
  
  return c.json({
    success: true,
    beliefs: allBeliefs.map(b => ({
      id: b.id,
      name: b.name,
      symbol: b.symbol,
      coreValues: b.coreValues,
      messagingStyle: b.messagingStyle,
      followerCount: b.followerCount
    }))
  });
});

// Get specific belief
beliefs.get('/:id', async (c) => {
  const id = c.req.param('id');
  const belief = gameState.getBelief(id);
  
  if (!belief) {
    return c.json({ success: false, error: 'Belief not found' }, 404);
  }
  
  const followers = gameState.getFollowersOf(id);
  
  return c.json({
    success: true,
    belief: {
      id: belief.id,
      name: belief.name,
      symbol: belief.symbol,
      coreValues: belief.coreValues,
      promises: belief.promises,
      tradeoffs: belief.tradeoffs,
      messagingStyle: belief.messagingStyle,
      followerCount: belief.followerCount,
      followers: followers.map(f => ({
        id: f.id,
        conviction: f.conviction,
        conversionRound: f.conversionRound
      }))
    }
  });
});

// Adapt belief
beliefs.patch('/:id', async (c) => {
  const apiKey = c.req.header('Authorization')?.replace('Bearer ', '');
  
  if (!apiKey) {
    return c.json({ success: false, error: 'No API key provided' }, 401);
  }
  
  const agent = gameState.getAgentByApiKey(apiKey);
  
  if (!agent) {
    return c.json({ success: false, error: 'Invalid API key' }, 401);
  }
  
  const id = c.req.param('id');
  const belief = gameState.getBelief(id);
  
  if (!belief) {
    return c.json({ success: false, error: 'Belief not found' }, 404);
  }
  
  if (belief.founderId !== agent.id) {
    return c.json({ success: false, error: 'Not your belief to adapt' }, 403);
  }
  
  try {
    const body = await c.req.json();
    const { coreValues, promises, tradeoffs, messagingStyle } = body;
    
    const updated = gameState.adaptBelief(id, {
      ...(coreValues && { coreValues }),
      ...(promises && { promises }),
      ...(tradeoffs && { tradeoffs }),
      ...(messagingStyle && { messagingStyle })
    });
    
    if (!updated) {
      return c.json({ success: false, error: 'Failed to adapt belief' }, 500);
    }
    
    return c.json({
      success: true,
      belief: updated,
      message: '🔄 Belief adapted! Your followers may react to the changes.'
    });
  } catch (error) {
    return c.json({ success: false, error: 'Failed to adapt belief' }, 500);
  }
});

export default beliefs;

