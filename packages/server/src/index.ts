import { Server } from '@colyseus/core';
import { WebSocketTransport } from '@colyseus/ws-transport';
import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { TrucoRoom } from './rooms/TrucoRoom';

const app = express();
app.use(cors());
app.use(express.json());

const httpServer = createServer(app);

const gameServer = new Server({
  transport: new WebSocketTransport({
    server: httpServer,
  }),
});

// Register room
gameServer.define('truco', TrucoRoom);

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', rooms: gameServer.matchMaker?.stats?.local || 0 });
});

const PORT = parseInt(process.env.PORT || '3001');

gameServer.listen(PORT, '0.0.0.0').then(() => {
  console.log(`🃏 Truco Mineiro server running on http://0.0.0.0:${PORT}`);
});
