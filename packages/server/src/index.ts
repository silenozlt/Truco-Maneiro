import { Server } from '@colyseus/core';
import { WebSocketTransport } from '@colyseus/ws-transport';
import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { TrucoRoom } from './rooms/TrucoRoom';
import { TournamentLobbyRoom } from './rooms/TournamentLobbyRoom';
import { registerUser, loginUser, generateToken, verifyToken, getUserStats, saveMatch } from './auth';

const app = express();
app.use(cors());
app.use(express.json());

const httpServer = createServer(app);

const gameServer = new Server({
  transport: new WebSocketTransport({
    server: httpServer,
  }),
});

// Register rooms
gameServer.define('truco', TrucoRoom);
gameServer.define('tournament', TournamentLobbyRoom);

// Auth routes
app.post('/auth/register', async (req, res) => {
  try {
    const { username, password } = req.body;
    const user = await registerUser(username, password);
    const token = generateToken(user);
    res.json({ token, user: { id: user.id, username: user.username } });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

app.post('/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    const user = await loginUser(username, password);
    const token = generateToken(user);
    res.json({ token, user: { id: user.id, username: user.username } });
  } catch (err: any) {
    res.status(401).json({ error: err.message });
  }
});

app.get('/auth/me', (req, res) => {
  const auth = req.headers.authorization;
  if (!auth?.startsWith('Bearer ')) return res.status(401).json({ error: 'Token ausente' });
  const user = verifyToken(auth.slice(7));
  if (!user) return res.status(401).json({ error: 'Token invalido' });
  const stats = getUserStats(user.id);
  res.json({ user, stats });
});

app.post('/auth/match', (req, res) => {
  const auth = req.headers.authorization;
  if (!auth?.startsWith('Bearer ')) return res.status(401).json({ error: 'Token ausente' });
  const user = verifyToken(auth.slice(7));
  if (!user) return res.status(401).json({ error: 'Token invalido' });
  const { won, myScore, theirScore, difficulty } = req.body;
  saveMatch(user.id, won, myScore, theirScore, difficulty || 'medium');
  res.json({ ok: true });
});

// Root & Health check
app.get('/', (_req, res) => {
  res.json({ name: 'Truco Maneiro API', status: 'ok' });
});

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', rooms: gameServer.matchMaker?.stats?.local || 0 });
});

// List active tournament rooms
app.get('/tournaments', async (_req, res) => {
  try {
    const rooms = await (gameServer.matchMaker as any).query({ name: 'tournament' });
    const list = rooms.map((r: any) => ({
      roomId: r.roomId,
      clients: r.clients,
      metadata: r.metadata,
    }));
    res.json(list);
  } catch {
    res.json([]);
  }
});

// List active rooms for spectator mode
app.get('/rooms', async (_req, res) => {
  try {
    const rooms = await (gameServer.matchMaker as any).query({ name: 'truco' });
    const list = rooms.map((r: any) => ({
      roomId: r.roomId,
      clients: r.clients,
      maxClients: r.maxClients,
      metadata: r.metadata,
      locked: r.locked,
    }));
    res.json(list);
  } catch {
    res.json([]);
  }
});

const PORT = parseInt(process.env.PORT || '3001');

gameServer.listen(PORT, '0.0.0.0').then(() => {
  console.log(`🃏 Truco Mineiro server running on http://0.0.0.0:${PORT}`);
});
