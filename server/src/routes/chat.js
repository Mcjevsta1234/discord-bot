const AGENT_URL = process.env.AGENT_URL || 'http://localhost:5001';

async function forwardToAgent(path, payload, res, method = 'POST') {
  try {
    const response = await fetch(`${AGENT_URL}${path}`, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: method === 'GET' ? undefined : JSON.stringify(payload ?? {}),
    });
    const data = await response.json();
    if (!response.ok) {
      return res.status(response.status).json({ error: data.detail || 'agent error' });
    }
    return res.json(data);
  } catch (error) {
    console.error('[server] agent proxy failed', error);
    return res.status(500).json({ error: 'agent unavailable' });
  }
}

export function registerChatRoutes(app) {
  app.get('/api/models', async (_req, res) => {
    return forwardToAgent('/models', undefined, res, 'GET');
  });

  app.post('/api/chat', async (req, res) => {
    const payload = req.body;
    return forwardToAgent('/chat', payload, res);
  });

  // Legacy demo chat list
  const demoChats = [
    { id: 'alpha', title: 'Home automation plan', lastMessage: 'Queued thermostat update' },
    { id: 'beta', title: 'Code refactor', lastMessage: 'Running tests with sandbox' },
  ];

  app.get('/chats', (_req, res) => {
    res.json({ chats: demoChats });
  });

  app.post('/chats/:id/message', (req, res) => {
    const { id } = req.params;
    const { content } = req.body;
    if (!content) {
      return res.status(400).json({ error: 'content required' });
    }
    const chat = demoChats.find((c) => c.id === id);
    if (!chat) {
      return res.status(404).json({ error: 'chat not found' });
    }
    chat.lastMessage = content;
    res.json({ ok: true, message: { role: 'user', content } });
  });
}
