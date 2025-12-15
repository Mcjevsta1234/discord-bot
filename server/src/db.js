import { JSONFilePreset } from 'lowdb/node';
import { join } from 'path';

const dbPromise = JSONFilePreset(join(process.cwd(), 'server', 'data', 'db.json'), {
  users: [],
  providers: [],
});

export async function getDb() {
  const db = await dbPromise;
  return db;
}
