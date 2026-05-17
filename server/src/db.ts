import Database from 'better-sqlite3'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const DB_PATH = path.resolve(__dirname, '..', 'data', 'jieqi.db')

const db = new Database(DB_PATH)
db.pragma('journal_mode = WAL')

export interface UserRow {
  id: number
  username: string
  password_hash: string
  email: string | null
  is_vip: number
  created_at: string
}

export function initDb(): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id           INTEGER PRIMARY KEY AUTOINCREMENT,
      username     TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      email        TEXT,
      is_vip       INTEGER NOT NULL DEFAULT 0,
      created_at   TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS games (
      id             INTEGER PRIMARY KEY AUTOINCREMENT,
      room_code      TEXT,
      player_red_id  INTEGER REFERENCES users(id),
      player_black_id INTEGER REFERENCES users(id),
      winner_id      INTEGER REFERENCES users(id),
      result         TEXT,
      move_count     INTEGER DEFAULT 0,
      played_at      TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `)
}

export function findUserByUsername(username: string): UserRow | undefined {
  return db.prepare('SELECT * FROM users WHERE username = ?').get(username) as UserRow | undefined
}

export function findUserById(id: number): UserRow | undefined {
  return db.prepare('SELECT * FROM users WHERE id = ?').get(id) as UserRow | undefined
}

export function createUser(username: string, hash: string, email: string | null, isVip: boolean): UserRow {
  const stmt = db.prepare('INSERT INTO users (username, password_hash, email, is_vip) VALUES (?, ?, ?, ?)')
  const result = stmt.run(username, hash, email, isVip ? 1 : 0)
  return findUserById(result.lastInsertRowid as number)!
}

export function recordGame(redId: number, blackId: number, winnerId?: number, result?: string, roomCode?: string): void {
  db.prepare(
    'INSERT INTO games (room_code, player_red_id, player_black_id, winner_id, result) VALUES (?, ?, ?, ?, ?)'
  ).run(roomCode ?? null, redId, blackId, winnerId ?? null, result ?? null)
}

initDb()
