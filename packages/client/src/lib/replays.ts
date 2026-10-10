const REPLAYS_KEY = 'truco-replays';

export interface ReplayAction {
  ts: number;
  action: string;
  playerId?: string;
  data?: any;
}

export interface SavedReplay {
  id: string;
  date: string;
  actions: ReplayAction[];
  startTime: number;
}

export function loadReplays(): SavedReplay[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(REPLAYS_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export function saveReplay(actions: ReplayAction[], startTime: number): string {
  const replays = loadReplays();
  const id = `r-${Date.now().toString(36)}`;
  replays.push({ id, date: new Date().toISOString(), actions, startTime });
  // Keep last 10 replays
  if (replays.length > 10) replays.splice(0, replays.length - 10);
  if (typeof window !== 'undefined') {
    localStorage.setItem(REPLAYS_KEY, JSON.stringify(replays));
  }
  return id;
}

export function getReplay(id: string): SavedReplay | undefined {
  return loadReplays().find(r => r.id === id);
}

export function deleteReplay(id: string): void {
  const replays = loadReplays().filter(r => r.id !== id);
  if (typeof window !== 'undefined') {
    localStorage.setItem(REPLAYS_KEY, JSON.stringify(replays));
  }
}
