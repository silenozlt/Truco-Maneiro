import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { getDb } from './db';

const JWT_SECRET = process.env.JWT_SECRET || 'truco-mineiro-secret-dev';
const SALT_ROUNDS = 10;

export interface AuthUser {
  id: number;
  username: string;
}

export async function registerUser(username: string, password: string): Promise<AuthUser> {
  const db = getDb();
  const existing = db.prepare('SELECT id FROM users WHERE username = ?').get(username);
  if (existing) throw new Error('Usuario ja existe');

  if (username.length < 3 || username.length > 20) throw new Error('Nome deve ter 3-20 caracteres');
  if (password.length < 4) throw new Error('Senha deve ter pelo menos 4 caracteres');

  const hash = await bcrypt.hash(password, SALT_ROUNDS);
  const result = db.prepare('INSERT INTO users (username, password_hash) VALUES (?, ?)').run(username, hash);
  return { id: result.lastInsertRowid as number, username };
}

export async function loginUser(username: string, password: string): Promise<AuthUser> {
  const db = getDb();
  const user = db.prepare('SELECT id, username, password_hash FROM users WHERE username = ?').get(username) as any;
  if (!user) throw new Error('Usuario ou senha invalidos');

  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid) throw new Error('Usuario ou senha invalidos');

  return { id: user.id, username: user.username };
}

export function generateToken(user: AuthUser): string {
  return jwt.sign({ id: user.id, username: user.username }, JWT_SECRET, { expiresIn: '7d' });
}

export function verifyToken(token: string): AuthUser | null {
  try {
    return jwt.verify(token, JWT_SECRET) as AuthUser;
  } catch {
    return null;
  }
}

export function saveMatch(userId: number, won: boolean, myScore: number, theirScore: number, difficulty: string) {
  const db = getDb();
  db.prepare('INSERT INTO match_history (user_id, won, my_score, their_score, difficulty) VALUES (?, ?, ?, ?, ?)')
    .run(userId, won ? 1 : 0, myScore, theirScore, difficulty);
}

export function getUserStats(userId: number) {
  const db = getDb();
  const total = db.prepare('SELECT COUNT(*) as count FROM match_history WHERE user_id = ?').get(userId) as any;
  const wins = db.prepare('SELECT COUNT(*) as count FROM match_history WHERE user_id = ? AND won = 1').get(userId) as any;
  const recent = db.prepare('SELECT * FROM match_history WHERE user_id = ? ORDER BY played_at DESC LIMIT 20').all(userId);
  return {
    totalMatches: total.count,
    totalWins: wins.count,
    totalLosses: total.count - wins.count,
    winRate: total.count > 0 ? Math.round((wins.count / total.count) * 100) : 0,
    recentMatches: recent,
  };
}
