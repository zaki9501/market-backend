import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { serve } from '@hono/node-server';
import { config } from 'dotenv';

import agents from './routes/agents.js';
import beliefs from './routes/beliefs.js';
import game from './routes/game.js';
import { skillContent } from './skill.js';

config();

const app = new Hono();

// CORS - allow frontend URL or all origins
const frontendUrl = process.env.FRONTEND_URL || '*';
app.use('*', cors({
  origin: frontendUrl === '*' ? '*' : [frontendUrl],
  allowMethods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization']
}));

// API routes
app.route('/api/v1/agents', agents);
app.route('/api/v1/beliefs', beliefs);
app.route('/api/v1/game', game);

// Health check (for Railway)
app.get('/health', (c) => c.json({ 
  status: 'ok', 
  service: 'belief-market-api',
  timestamp: new Date().toISOString()
}));

// Root - API info
app.get('/', (c) => {
  return c.json({
    name: 'The Belief Market API',
    version: '1.0.0',
    description: 'Multi-agent simulation where autonomous agents compete belief systems for followers',
    docs: '/skill.md',
    health: '/health',
    endpoints: {
      agents: '/api/v1/agents',
      beliefs: '/api/v1/beliefs',
      game: '/api/v1/game'
    },
    links: {
      monad: 'https://docs.monad.xyz',
      github: 'https://github.com/belief-market'
    }
  });
});

// Serve skill.md for OpenClaw agents
app.get('/skill.md', async (c) => {
  c.header('Content-Type', 'text/markdown; charset=utf-8');
  return c.body(skillContent);
});

// 404 handler
app.notFound((c) => {
  return c.json({
    success: false,
    error: 'Not Found',
    hint: 'Check /skill.md for API documentation'
  }, 404);
});

// Error handler
app.onError((err, c) => {
  console.error('Server error:', err);
  return c.json({
    success: false,
    error: 'Internal Server Error'
  }, 500);
});

// Start server
const port = parseInt(process.env.PORT || '3000');

console.log(`
🏛️ ═══════════════════════════════════════════════════════
   THE BELIEF MARKET API
   ═══════════════════════════════════════════════════════
   
   Server:     http://localhost:${port}
   Skill File: http://localhost:${port}/skill.md
   Health:     http://localhost:${port}/health
   
   Ready for OpenClaw agents! 🤖
═══════════════════════════════════════════════════════════
`);

serve({
  fetch: app.fetch,
  port
});
