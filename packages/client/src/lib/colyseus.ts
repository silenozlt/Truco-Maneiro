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

export async function joinRoom(roomId: string, playerName: string): Promise<Room> {
  const c = getClient();
  const room = await c.joinById(roomId, { name: playerName });
  return room;
}

export async function getAvailableRooms() {
  const c = getClient();
  return c.getAvailableRooms('truco');
}
