const STATS_KEY = 'truco-stats';

export interface MatchRecord {
  date: string;
  won: boolean;
  myScore: number;
  theirScore: number;
  difficulty: string;
  trucosCalledByMe: number;
  trucosCalledByOpponent: number;
  trucosAccepted: number;
  trucosRan: number;
}

export interface PlayerStats {
  matches: MatchRecord[];
  totalWins: number;
  totalLosses: number;
  totalTrucosCalled: number;
  totalTrucosAccepted: number;
  totalTrucosRan: number;
}

function getDefaultStats(): PlayerStats {
  return {
    matches: [],
    totalWins: 0,
    totalLosses: 0,
    totalTrucosCalled: 0,
    totalTrucosAccepted: 0,
    totalTrucosRan: 0,
  };
}

export function loadStats(): PlayerStats {
  if (typeof window === 'undefined') return getDefaultStats();
  try {
    const raw = localStorage.getItem(STATS_KEY);
    if (!raw) return getDefaultStats();
    return JSON.parse(raw);
  } catch {
    return getDefaultStats();
  }
}

export function saveStats(stats: PlayerStats): void {
  if (typeof window === 'undefined') return;
  // Keep only last 50 matches
  if (stats.matches.length > 50) {
    stats.matches = stats.matches.slice(-50);
  }
  localStorage.setItem(STATS_KEY, JSON.stringify(stats));
}

export function recordMatch(record: MatchRecord): void {
  const stats = loadStats();
  stats.matches.push(record);
  if (record.won) {
    stats.totalWins++;
  } else {
    stats.totalLosses++;
  }
  stats.totalTrucosCalled += record.trucosCalledByMe;
  stats.totalTrucosAccepted += record.trucosAccepted;
  stats.totalTrucosRan += record.trucosRan;
  saveStats(stats);
}

export function getWinRate(stats: PlayerStats): number {
  const total = stats.totalWins + stats.totalLosses;
  if (total === 0) return 0;
  return Math.round((stats.totalWins / total) * 100);
}

export function getRecentForm(stats: PlayerStats, count = 5): boolean[] {
  return stats.matches.slice(-count).map(m => m.won);
}

export function clearStats(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(STATS_KEY);
}
