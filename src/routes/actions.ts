import { Hono } from 'hono';
import { worldState } from '../services/worldState.js';

const actions = new Hono();

// Submit an action
actions.post('/submit', async (c) => {
  const apiKey = c.req.header('Authorization')?.replace('Bearer ', '');
  
  if (!apiKey) {
    return c.json({ success: false, error: 'No API key provided' }, 401);
  }
  
  const nation = worldState.getNationByApiKey(apiKey);
  
  if (!nation) {
    return c.json({ success: false, error: 'Nation not found' }, 404);
  }
  
  if (nation.status !== 'active') {
    return c.json({
      success: false,
      error: 'Nation not active',
      hint: nation.status === 'pending_claim' 
        ? 'Claim your nation first: POST /nations/claim'
        : 'Your nation has been defeated'
    }, 400);
  }
  
  try {
    const body = await c.req.json();
    const { action, params } = body;
    
    if (!action) {
      return c.json({
        success: false,
        error: 'Action type required',
        available_actions: {
          economic: ['harvest', 'trade', 'tax'],
          military: ['attack', 'defend', 'fortify', 'recruit'],
          diplomatic: ['propose_treaty', 'accept_treaty', 'reject_treaty', 'break_treaty'],
          governance: ['set_tax_rate']
        }
      }, 400);
    }
    
    const result = worldState.submitAction(nation.id, action, params || {});
    
    if (!result) {
      return c.json({
        success: false,
        error: 'Failed to submit action'
      }, 500);
    }
    
    return c.json({
      success: true,
      action: {
        id: result.id,
        type: result.type,
        result: result.result
      }
    });
  } catch (error) {
    return c.json({ success: false, error: 'Invalid request body' }, 400);
  }
});

// Get action history
actions.get('/history', async (c) => {
  const apiKey = c.req.header('Authorization')?.replace('Bearer ', '');
  const nation = apiKey ? worldState.getNationByApiKey(apiKey) : null;
  
  const history = worldState.getActionHistory(nation?.id);
  
  return c.json({
    success: true,
    history: history.map(a => ({
      id: a.id,
      type: a.type,
      epoch: a.epoch,
      result: a.result,
      createdAt: a.createdAt
    }))
  });
});

export default actions;

