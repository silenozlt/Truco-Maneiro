import { Client, Room } from 'colyseus.js';

function getColyseusUrl(): string {
  if (process.env.NEXT_PUBLIC_COLYSEUS_URL) {
    return process.env.NEXT_PUBLIC_COLYSEUS_URL;
  }
  // In the browser, use the same hostname the user is accessing from
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname;
    return `ws://${hostname}:3001`;
  }
  return 'ws://localhost:3001';
}

function getServerHttpUrl(): string {
  if (process.env.NEXT_PUBLIC_COLYSEUS_URL) {
    const wsUrl = process.env.NEXT_PUBLIC_COLYSEUS_URL;
    return wsUrl.replace(/^wss:/, 'https:').replace(/^ws:/, 'http:');
  }
  const hostname = typeof window !== 'undefined' ? window.location.hostname : 'localhost';
  return `http://${hostname}:3001`;
}

let client: Client | null = null;

export function getClient(): Client {
  if (!client) {
    client = new Client(getColyseusUrl());
  }
  return client;
}

export async function createRoom(playerName: string, difficulty?: string): Promise<Room> {
  const c = getClient();
  const room = await c.create('truco', { name: playerName, difficulty });
  return room;
}

export async function joinRoom(roomId: string, playerName: string, options?: { position?: number }): Promise<Room> {
  const c = getClient();
  const room = await c.joinById(roomId, { name: playerName, ...options });
  return room;
}

export async function joinAsSpectator(roomId: string): Promise<Room> {
  const c = getClient();
  const room = await c.joinById(roomId, { spectator: true });
  return room;
}

export async function getAvailableRooms() {
  const c = getClient();
  return c.getAvailableRooms('truco');
}

export async function getActiveRooms(): Promise<Array<{ roomId: string; clients: number }>> {
  try {
    const res = await fetch(`${getServerHttpUrl()}/rooms`);
    return res.json();
  } catch {
    return [];
  }
}

export async function joinTournament(playerName: string, mode: 'auto' | 'partner', avatar?: string, partnerCode?: string, myCode?: string): Promise<Room> {
  const c = getClient();
  const opts = { name: playerName, mode, avatar, partnerCode, myCode };
  // Try to join an existing waiting tournament room
  try {
    const rooms = await c.getAvailableRooms('tournament');
    const waitingRoom = rooms.find(r => (r.metadata as any)?.phase === 'waiting' && r.clients < 8);
    if (waitingRoom) {
      return await c.joinById(waitingRoom.roomId, opts);
    }
  } catch {}
  // No available room, create a new one
  return await c.create('tournament', opts);
}

export async function joinMatchRoom(roomId: string, playerName: string, position: number): Promise<Room> {
  const c = getClient();
  return await c.joinById(roomId, { name: playerName, position });
}

export async function rejoinTournamentRoom(roomId: string, playerName: string, previousId: string, avatar?: string): Promise<Room> {
  const c = getClient();
  return await c.joinById(roomId, { name: playerName, avatar, rejoin: true, previousId });
}
