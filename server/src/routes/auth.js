import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const users = new Map();
const JWT_SECRET = process.env.JWT_SECRET || 'change-me';

export function registerAuthRoutes(app) {
  app.post('/auth/register', async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'email and password required' });
    }
    if (users.has(email)) {
      return res.status(409).json({ error: 'user already exists' });
    }
    const hash = await bcrypt.hash(password, 10);
    users.set(email, { email, hash });
    return res.status(201).json({ ok: true });
  });

  app.post('/auth/login', async (req, res) => {
    const { email, password } = req.body;
    const user = users.get(email);
    if (!user) {
      return res.status(401).json({ error: 'invalid credentials' });
    }
    const valid = await bcrypt.compare(password, user.hash);
    if (!valid) {
      return res.status(401).json({ error: 'invalid credentials' });
    }
    const token = jwt.sign({ sub: email }, JWT_SECRET, { expiresIn: '2h' });
    res.cookie('token', token, { httpOnly: true, sameSite: 'lax' });
    return res.json({ ok: true });
  });
}
