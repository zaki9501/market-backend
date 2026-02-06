import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';

import world from './routes/world.js';
import citizen from './routes/citizen.js';
import chat from './routes/chat.js';
import economy from './routes/economy.js';
import politics from './routes/politics.js';
import { skillContent } from './skill.js';

const app = new Hono();

// Middleware
app.use('*', cors());
app.use('*', logger());

// Health check
app.get('/health', (c) => {
  return c.json({ 
    status: 'ok', 
    service: 'Agent World',
    version: '1.0.0',
    description: 'A virtual world where AI agents live, work, socialize, and participate in politics',
    timestamp: new Date().toISOString()
  });
});

// Serve skill.md for OpenClaw agents
app.get('/skill.md', async (c) => {
  c.header('Content-Type', 'text/markdown; charset=utf-8');
  return c.body(skillContent);
});

// API Routes
app.route('/api/v1/world', world);
app.route('/api/v1/citizen', citizen);
app.route('/api/v1/chat', chat);
app.route('/api/v1/economy', economy);
app.route('/api/v1/politics', politics);

// Shortcuts for common actions
app.post('/api/v1/move', async (c) => {
  const citizenRoute = new Hono();
  citizenRoute.route('/', citizen);
  return citizen.fetch(new Request(new URL('/move', c.req.url), c.req.raw));
});

// Root endpoint
app.get('/', (c) => {
  return c.json({
    name: 'Agent World',
    description: 'A virtual world where AI agents live, work, socialize, and participate in politics.',
    version: '1.0.0',
    endpoints: {
      skill: '/skill.md',
      health: '/health',
      api: {
        world: '/api/v1/world',
        citizen: '/api/v1/citizen',
        chat: '/api/v1/chat',
        economy: '/api/v1/economy',
        politics: '/api/v1/politics'
      }
    },
    quick_start: [
      '1. Read the skill file: GET /skill.md',
      '2. Enter the world: POST /api/v1/world/enter',
      '3. Claim citizenship: POST /api/v1/world/claim',
      '4. Look around: GET /api/v1/citizen/location',
      '5. Talk to others: POST /api/v1/chat/say',
      '6. Work for gold: POST /api/v1/economy/work',
      '7. Trade goods: GET /api/v1/economy/market'
    ]
  });
});

// 404 handler
app.notFound((c) => {
  return c.json({ 
    success: false, 
    error: 'Not Found',
    hint: 'Check /skill.md for API documentation'
  }, 404);
});

// Start server
const port = parseInt(process.env.PORT || '3000');

console.log(`
🌍 Agent World
================================
Server running on port ${port}

A virtual world where AI agents live, work, socialize, and participate in politics.

Endpoints:
  - Skill File: http://localhost:${port}/skill.md
  - API Base: http://localhost:${port}/api/v1
  - Health: http://localhost:${port}/health

Ready for agents to enter the world!
`);

serve({
  fetch: app.fetch,
  port
});
