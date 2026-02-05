import { Hono } from 'hono';
import { gameState } from '../services/gameState.js';

const game = new Hono();

// Get game info
game.get('/info', async (c) => {
  const info = gameState.getGameInfo();
  
  return c.json({
    success: true,
    game: info
  });
});

// Start game (requires at least 2 beliefs)
game.post('/start', async (c) => {
  const success = gameState.startGame();
  
  if (success) {
    return c.json({
      success: true,
      message: '🎮 The Belief Market has begun! Round 1: Seeding',
      game: gameState.getGameInfo()
    });
  }
  
  return c.json({
    success: false,
    error: 'Cannot start game',
    hint: 'Need at least 2 registered beliefs, and game must not be started'
  }, 400);
});

// Advance to next round
game.post('/advance', async (c) => {
  const success = gameState.advanceRound();
  
  if (success) {
    const info = gameState.getGameInfo();
    let message = '';
    
    switch (info.state) {
      case 'round2':
        message = '📊 Round 2: Adaptation begins! Harder conversion, new NPCs spawned.';
        break;
      case 'round3':
        message = '🔥 Round 3: Polarization! Scarce attention, high stakes.';
        break;
      case 'ended':
        message = '🏆 Game Over! Check the leaderboard for results.';
        break;
    }
    
    return c.json({
      success: true,
      message,
      game: info
    });
  }
  
  return c.json({
    success: false,
    error: 'Cannot advance round',
    hint: 'Round duration may not be complete yet'
  }, 400);
});

// Get leaderboard
game.get('/leaderboard', async (c) => {
  const leaderboard = gameState.getLeaderboard();
  
  return c.json({
    success: true,
    leaderboard
  });
});

// Persuade an NPC
game.post('/persuade', async (c) => {
  const apiKey = c.req.header('Authorization')?.replace('Bearer ', '');
  
  if (!apiKey) {
    return c.json({ success: false, error: 'No API key provided' }, 401);
  }
  
  const agent = gameState.getAgentByApiKey(apiKey);
  
  if (!agent) {
    return c.json({ success: false, error: 'Invalid API key' }, 401);
  }
  
  if (!agent.beliefId) {
    return c.json({
      success: false,
      error: 'No belief system created',
      hint: 'Create a belief first with POST /beliefs'
    }, 400);
  }
  
  const info = gameState.getGameInfo();
  if (!['round1', 'round2', 'round3'].includes(info.state)) {
    return c.json({
      success: false,
      error: 'Game not in active round',
      hint: 'Wait for the game to start or check current state'
    }, 400);
  }
  
  try {
    const body = await c.req.json();
    const { npcId, message } = body;
    
    if (npcId === undefined || !message) {
      return c.json({
        success: false,
        error: 'Missing npcId or message',
        hint: 'Provide npcId (number) and message (string)'
      }, 400);
    }
    
    const result = gameState.attemptPersuasion(agent.id, npcId, message);
    
    return c.json({
      success: true,
      persuasion: {
        converted: result.success,
        resonanceScore: result.resonance,
        cost: gameState.getPersuasionCost(),
        npcBiases: result.revealed
      },
      message: result.success 
        ? `✅ NPC #${npcId} converted to your belief!`
        : `❌ NPC #${npcId} was not convinced. Resonance: ${result.resonance}%`
    });
  } catch (error) {
    return c.json({ success: false, error: 'Persuasion failed' }, 500);
  }
});

// Get NPCs
game.get('/npcs', async (c) => {
  const filter = c.req.query('filter'); // 'neutral', 'converted', or 'all'
  
  let npcs;
  if (filter === 'neutral') {
    npcs = gameState.getNeutralNPCs();
  } else {
    npcs = gameState.getAllNPCs();
  }
  
  return c.json({
    success: true,
    npcs: npcs.map(npc => ({
      id: npc.id,
      currentBelief: npc.currentBelief,
      conviction: npc.conviction,
      // Only show biases if revealed
      biases: npc.isRevealed ? npc.biases : null
    })),
    total: npcs.length
  });
});

// Get specific NPC
game.get('/npcs/:id', async (c) => {
  const id = parseInt(c.req.param('id'));
  const npc = gameState.getNPC(id);
  
  if (!npc) {
    return c.json({ success: false, error: 'NPC not found' }, 404);
  }
  
  return c.json({
    success: true,
    npc: {
      id: npc.id,
      currentBelief: npc.currentBelief,
      conviction: npc.conviction,
      conversionRound: npc.conversionRound,
      biases: npc.isRevealed ? npc.biases : 'hidden'
    }
  });
});

// Get persuasion history
game.get('/history', async (c) => {
  const apiKey = c.req.header('Authorization')?.replace('Bearer ', '');
  const agent = apiKey ? gameState.getAgentByApiKey(apiKey) : null;
  
  const history = gameState.getPersuasionHistory(agent?.id);
  
  return c.json({
    success: true,
    history: history.slice(-50) // Last 50 attempts
  });
});

export default game;

