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

export function registerDiscordRoutes(app) {
  app.post('/api/discord/chat', async (req, res) => {
    const { channel_id: channelId, user_id: userId, content, provider, model } = req.body;
    if (!channelId || !content) {
      return res.status(400).json({ error: 'channel_id and content are required' });
    }
    const payload = {
      chat_id: channelId,
      user_id: userId,
      provider: provider || 'together',
      model,
      messages: [
        { role: 'system', content: 'Discord bridge message' },
        { role: 'user', content },
      ],
    };
    return forwardToAgent('/chat', payload, res);
  });
}
