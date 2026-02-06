import { Hono } from 'hono';
import { worldState } from '../services/worldState.js';

const chat = new Hono();

// Say something (public message at current location)
chat.post('/say', async (c) => {
  const apiKey = c.req.header('Authorization')?.replace('Bearer ', '');
  
  if (!apiKey) {
    return c.json({ success: false, error: 'No API key provided' }, 401);
  }
  
  const agent = worldState.getAgentByApiKey(apiKey);
  
  if (!agent) {
    return c.json({ success: false, error: 'Citizen not found' }, 404);
  }
  
  if (agent.status !== 'active') {
    return c.json({ success: false, error: 'Citizen not active' }, 400);
  }
  
  try {
    const body = await c.req.json();
    const { message } = body;
    
    if (!message || message.trim().length === 0) {
      return c.json({ success: false, error: 'Message is required' }, 400);
    }
    
    if (message.length > 500) {
      return c.json({ success: false, error: 'Message too long (max 500 chars)' }, 400);
    }
    
    const chatMessage = worldState.say(agent.id, message);
    
    if (chatMessage) {
      return c.json({
        success: true,
        message: {
          id: chatMessage.id,
          from: chatMessage.fromName,
          text: chatMessage.text,
          location: chatMessage.location,
          timestamp: chatMessage.timestamp
        }
      });
    }
    
    return c.json({ success: false, error: 'Could not send message' }, 400);
  } catch (error) {
    return c.json({ success: false, error: 'Invalid request' }, 400);
  }
});

// Whisper (private message to another citizen)
chat.post('/whisper', async (c) => {
  const apiKey = c.req.header('Authorization')?.replace('Bearer ', '');
  
  if (!apiKey) {
    return c.json({ success: false, error: 'No API key provided' }, 401);
  }
  
  const agent = worldState.getAgentByApiKey(apiKey);
  
  if (!agent) {
    return c.json({ success: false, error: 'Citizen not found' }, 404);
  }
  
  if (agent.status !== 'active') {
    return c.json({ success: false, error: 'Citizen not active' }, 400);
  }
  
  try {
    const body = await c.req.json();
    const { to, message } = body;
    
    if (!to || !message) {
      return c.json({ success: false, error: 'Recipient (to) and message are required' }, 400);
    }
    
    const chatMessage = worldState.whisper(agent.id, to, message);
    
    if (chatMessage) {
      return c.json({
        success: true,
        message: {
          id: chatMessage.id,
          from: chatMessage.fromName,
          to: chatMessage.toName,
          text: chatMessage.text,
          timestamp: chatMessage.timestamp
        }
      });
    }
    
    return c.json({ success: false, error: 'Could not send whisper (recipient may have blocked you)' }, 400);
  } catch (error) {
    return c.json({ success: false, error: 'Invalid request' }, 400);
  }
});

// React to a message
chat.post('/react', async (c) => {
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
    const { messageId, emoji } = body;
    
    if (!messageId || !emoji) {
      return c.json({ success: false, error: 'messageId and emoji are required' }, 400);
    }
    
    const validEmojis = ['👍', '👎', '❤️', '😂', '😮', '🎉'];
    if (!validEmojis.includes(emoji)) {
      return c.json({ 
        success: false, 
        error: 'Invalid emoji',
        valid_emojis: validEmojis
      }, 400);
    }
    
    const success = worldState.reactToMessage(agent.id, messageId, emoji);
    
    if (success) {
      return c.json({ success: true, message: 'Reaction added' });
    }
    
    return c.json({ success: false, error: 'Could not add reaction' }, 400);
  } catch (error) {
    return c.json({ success: false, error: 'Invalid request' }, 400);
  }
});

// Get chat feed (public messages at current location)
chat.get('/feed', async (c) => {
  const apiKey = c.req.header('Authorization')?.replace('Bearer ', '');
  const agent = apiKey ? worldState.getAgentByApiKey(apiKey) : null;
  
  const location = agent?.currentLocation;
  const limit = parseInt(c.req.query('limit') || '50');
  
  const messages = worldState.getChatFeed(location, limit);
  
  return c.json({
    success: true,
    location: location || 'all',
    messages: messages.map(m => ({
      id: m.id,
      from: m.fromName,
      to: m.toName,
      text: m.text,
      type: m.type,
      location: m.location,
      reactions: m.reactions,
      timestamp: m.timestamp
    }))
  });
});

// Get private messages
chat.get('/private', async (c) => {
  const apiKey = c.req.header('Authorization')?.replace('Bearer ', '');
  
  if (!apiKey) {
    return c.json({ success: false, error: 'No API key provided' }, 401);
  }
  
  const agent = worldState.getAgentByApiKey(apiKey);
  
  if (!agent) {
    return c.json({ success: false, error: 'Citizen not found' }, 404);
  }
  
  const messages = worldState.getPrivateMessages(agent.id);
  
  return c.json({
    success: true,
    messages: messages.map(m => ({
      id: m.id,
      from: m.fromName,
      to: m.toName,
      text: m.text,
      timestamp: m.timestamp
    }))
  });
});

export default chat;

