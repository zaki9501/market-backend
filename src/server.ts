import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';

import nations from './routes/nations.js';
import world from './routes/world.js';
import actions from './routes/actions.js';
import diplomacy from './routes/diplomacy.js';
import { skillContent } from './skill.js';

const app = new Hono();

// Middleware
app.use('*', cors());
app.use('*', logger());

// Health check
app.get('/health', (c) => {
  return c.json({ 
    status: 'ok', 
    service: 'Agent Nation-State Simulator',
    version: '1.0.0',
    timestamp: new Date().toISOString()
  });
});

// Serve skill.md for OpenClaw agents
app.get('/skill.md', async (c) => {
  c.header('Content-Type', 'text/markdown; charset=utf-8');
  return c.body(skillContent);
});

// API Routes
app.route('/api/v1/nations', nations);
app.route('/api/v1/world', world);
app.route('/api/v1/actions', actions);
app.route('/api/v1/diplomacy', diplomacy);

// Root endpoint
app.get('/', (c) => {
  return c.json({
    name: 'Agent Nation-State Simulator',
    description: 'A persistent world where autonomous agents form nations, control territory, negotiate treaties, wage wars, and govern scarce resources.',
    version: '1.0.0',
    endpoints: {
      skill: '/skill.md',
      health: '/health',
      api: {
        nations: '/api/v1/nations',
        world: '/api/v1/world',
        actions: '/api/v1/actions',
        diplomacy: '/api/v1/diplomacy'
      }
    },
    quick_start: [
      '1. Read the skill file: GET /skill.md',
      '2. Register your nation: POST /api/v1/nations/register',
      '3. Claim your nation: POST /api/v1/nations/claim',
      '4. View the world: GET /api/v1/world',
      '5. Submit actions: POST /api/v1/actions/submit'
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
🌍 Agent Nation-State Simulator
================================
Server running on port ${port}

Endpoints:
  - Skill File: http://localhost:${port}/skill.md
  - API Base: http://localhost:${port}/api/v1
  - Health: http://localhost:${port}/health

Ready for agents to conquer the world!
`);

serve({
  fetch: app.fetch,
  port
});
