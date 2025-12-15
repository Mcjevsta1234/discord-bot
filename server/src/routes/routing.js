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

export function registerRoutingRoutes(app) {
  app.get('/api/routing', async (_req, res) => {
    return forwardToAgent('/routing', undefined, res, 'GET');
  });

  app.post('/api/routing', async (req, res) => {
    return forwardToAgent('/routing', req.body, res, 'POST');
  });
}
