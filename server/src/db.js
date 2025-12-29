import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

export function openDb({ dataDir }) {
  ensureDir(dataDir);
  const dbPath = path.join(dataDir, "app.sqlite");
  const db = new Database(dbPath);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");

  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      phone TEXT NOT NULL UNIQUE,
      created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS kv (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS push_subscriptions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      endpoint TEXT NOT NULL,
      p256dh TEXT NOT NULL,
      auth TEXT NOT NULL,
      subscription_json TEXT NOT NULL,
      updated_at INTEGER NOT NULL,
      UNIQUE(user_id, endpoint),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS requests (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      type TEXT NOT NULL,
      phone TEXT NOT NULL,
      fio TEXT NOT NULL,
      address TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      accepted_at INTEGER NOT NULL,
      push_sent_at INTEGER,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );
  `);

  return db;
}

