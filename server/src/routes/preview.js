import { join } from 'path';
import { randomUUID } from 'crypto';
import { mkdir, writeFile, rm } from 'fs/promises';

const PREVIEW_DIR = join(process.cwd(), 'server', 'data', 'previews');

export function registerPreviewRoutes(app) {
  app.use('/preview', (req, res, next) => {
    // static assets are served by express.static in index.js
    next();
  });

  app.post('/api/preview', async (req, res) => {
    const { mode = 'html', content, url } = req.body ?? {};
    const id = randomUUID();
    await mkdir(PREVIEW_DIR, { recursive: true });

    if (mode === 'url' && url) {
      return res.json({ previewUrl: url, id });
    }

    if (!content) {
      return res.status(400).json({ error: 'content required for html preview' });
    }

    const html = String(content);
    const filePath = join(PREVIEW_DIR, `${id}.html`);
    await writeFile(filePath, html, 'utf8');
    return res.json({ previewUrl: `/preview/${id}.html`, id });
  });

  app.delete('/api/preview/:id', async (req, res) => {
    const { id } = req.params;
    const filePath = join(PREVIEW_DIR, `${id}.html`);
    try {
      await rm(filePath);
    } catch (error) {
      // ignore missing file
    }
    return res.json({ ok: true });
  });
}
