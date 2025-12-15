import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { getDb } from '../db.js';

const JWT_SECRET = process.env.JWT_SECRET || 'change-me';

export function registerAuthRoutes(app) {
  app.post('/auth/register', async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'email and password required' });
    }
    const db = await getDb();
    const existing = db.data.users.find((user) => user.email === email);
    if (existing) {
      return res.status(409).json({ error: 'user already exists' });
    }
    const hash = await bcrypt.hash(password, 10);
    db.data.users.push({ email, hash });
    await db.write();
    return res.status(201).json({ ok: true });
  });

  app.post('/auth/login', async (req, res) => {
    const { email, password } = req.body;
    const db = await getDb();
    const user = db.data.users.find((u) => u.email === email);
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
