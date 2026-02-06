import { Hono } from 'hono';
import { worldState } from '../services/worldState.js';
import { JobType, ItemType, JOB_INFO, ITEM_PRICES } from '../types/index.js';

const economy = new Hono();

// Work (earn gold)
economy.post('/work', async (c) => {
  const apiKey = c.req.header('Authorization')?.replace('Bearer ', '');
  
  if (!apiKey) {
    return c.json({ success: false, error: 'No API key provided' }, 401);
  }
  
  const agent = worldState.getAgentByApiKey(apiKey);
  
  if (!agent) {
    return c.json({ success: false, error: 'Citizen not found' }, 404);
  }
  
  const result = worldState.work(agent.id);
  
  return c.json({
    success: result.success,
    message: result.message,
    earned: result.earned,
    newBalance: agent.gold
  }, result.success ? 200 : 400);
});

// Set job
economy.post('/job', async (c) => {
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
    const { job } = body;
    
    const validJobs: JobType[] = ['farmer', 'craftsman', 'merchant', 'guard'];
    
    if (!validJobs.includes(job)) {
      return c.json({
        success: false,
        error: 'Invalid job',
        available_jobs: Object.entries(JOB_INFO).map(([j, info]) => ({
          id: j,
          pay: info.pay,
          requirements: info.requirements
        }))
      }, 400);
    }
    
    const typedJob = job as JobType;
    const success = worldState.setJob(agent.id, typedJob);
    
    if (success) {
      return c.json({
        success: true,
        message: `Job set to ${typedJob}`,
        job: {
          id: typedJob,
          ...JOB_INFO[typedJob]
        }
      });
    }
    
    return c.json({ success: false, error: 'Could not set job' }, 400);
  } catch (error) {
    return c.json({ success: false, error: 'Invalid request' }, 400);
  }
});

// Get market listings
economy.get('/market', async (c) => {
  const listings = worldState.getMarketListings();
  
  return c.json({
    success: true,
    listings: listings.map(l => ({
      id: l.id,
      seller: l.sellerName,
      item: l.item,
      quantity: l.quantity,
      pricePerUnit: l.pricePerUnit,
      totalPrice: l.pricePerUnit * l.quantity,
      createdAt: l.createdAt
    })),
    basePrices: ITEM_PRICES
  });
});

// List item for sale
economy.post('/market/sell', async (c) => {
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
    const { item, quantity, pricePerUnit } = body;
    
    const validItems: ItemType[] = ['food', 'tools', 'luxuries', 'land'];
    
    if (!validItems.includes(item)) {
      return c.json({
        success: false,
        error: 'Invalid item',
        valid_items: validItems
      }, 400);
    }
    
    if (!quantity || quantity < 1) {
      return c.json({ success: false, error: 'Quantity must be at least 1' }, 400);
    }
    
    if (!pricePerUnit || pricePerUnit < 1) {
      return c.json({ success: false, error: 'Price must be at least 1' }, 400);
    }
    
    const listing = worldState.listItem(agent.id, item, quantity, pricePerUnit);
    
    if (listing) {
      return c.json({
        success: true,
        message: `Listed ${quantity}x ${item} for ${pricePerUnit} gold each`,
        listing: {
          id: listing.id,
          item: listing.item,
          quantity: listing.quantity,
          pricePerUnit: listing.pricePerUnit
        }
      });
    }
    
    return c.json({ 
      success: false, 
      error: 'Could not list item',
      hint: 'Make sure you are at the Marketplace and have the item in inventory'
    }, 400);
  } catch (error) {
    return c.json({ success: false, error: 'Invalid request' }, 400);
  }
});

// Buy item from market
economy.post('/market/buy', async (c) => {
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
    const { listingId, quantity } = body;
    
    if (!listingId) {
      return c.json({ success: false, error: 'listingId is required' }, 400);
    }
    
    const result = worldState.buyItem(agent.id, listingId, quantity || 1);
    
    return c.json({
      success: result.success,
      message: result.message,
      newBalance: agent.gold
    }, result.success ? 200 : 400);
  } catch (error) {
    return c.json({ success: false, error: 'Invalid request' }, 400);
  }
});

// Bank - deposit
economy.post('/bank/deposit', async (c) => {
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
    const { amount } = body;
    
    if (!amount || amount < 1) {
      return c.json({ success: false, error: 'Amount must be at least 1' }, 400);
    }
    
    const success = worldState.deposit(agent.id, amount);
    
    if (success) {
      return c.json({
        success: true,
        message: `Deposited ${amount} gold`,
        gold: agent.gold,
        bankBalance: agent.bankBalance
      });
    }
    
    return c.json({ 
      success: false, 
      error: 'Could not deposit',
      hint: 'Make sure you are at the Bank and have enough gold'
    }, 400);
  } catch (error) {
    return c.json({ success: false, error: 'Invalid request' }, 400);
  }
});

// Bank - withdraw
economy.post('/bank/withdraw', async (c) => {
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
    const { amount } = body;
    
    if (!amount || amount < 1) {
      return c.json({ success: false, error: 'Amount must be at least 1' }, 400);
    }
    
    const success = worldState.withdraw(agent.id, amount);
    
    if (success) {
      return c.json({
        success: true,
        message: `Withdrew ${amount} gold`,
        gold: agent.gold,
        bankBalance: agent.bankBalance
      });
    }
    
    return c.json({ 
      success: false, 
      error: 'Could not withdraw',
      hint: 'Make sure you are at the Bank and have enough balance'
    }, 400);
  } catch (error) {
    return c.json({ success: false, error: 'Invalid request' }, 400);
  }
});

// Get bank balance
economy.get('/bank/balance', async (c) => {
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
    gold: agent.gold,
    bankBalance: agent.bankBalance,
    total: agent.gold + agent.bankBalance
  });
});

export default economy;

