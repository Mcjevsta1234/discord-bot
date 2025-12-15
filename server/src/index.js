import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { createServer } from 'http';
import { WebSocketServer } from 'ws';
import { join } from 'path';
import { existsSync, mkdirSync } from 'fs';
import { registerAuthRoutes } from './routes/auth.js';
import { registerChatRoutes } from './routes/chat.js';
import { registerProviderRoutes } from './routes/providers.js';
import { registerRoutingRoutes } from './routes/routing.js';
import { registerPreviewRoutes } from './routes/preview.js';
import { registerDiscordRoutes } from './routes/discord.js';

const app = express();
app.use(cors({ origin: true, credentials: true }));
app.use(express.json());
app.use(cookieParser());

const previewDir = join(process.cwd(), 'server', 'data', 'previews');
if (!existsSync(previewDir)) {
  mkdirSync(previewDir, { recursive: true });
}
app.use('/preview', express.static(previewDir));

registerAuthRoutes(app);
registerChatRoutes(app);
registerProviderRoutes(app);
registerRoutingRoutes(app);
registerPreviewRoutes(app);
registerDiscordRoutes(app);

const httpServer = createServer(app);
const wss = new WebSocketServer({ server: httpServer, path: '/ws' });

wss.on('connection', (socket) => {
  socket.send(JSON.stringify({ type: 'status', payload: 'connected to gateway' }));
});

const port = process.env.PORT || 4000;
httpServer.listen(port, () => {
  console.log(`[server] listening on ${port}`);
});
