import initSqlJs, { Database as SqlJsDatabase } from "sql.js";
import fs from "fs";
import path from "path";

const DB_PATH = path.join(__dirname, "..", "data", "elangdrink.db");
let db: SqlJsDatabase;
let isMemoryDb = false;

export async function initDb(dbPath?: string): Promise<void> {
  const SQL = await initSqlJs();
  const actualPath = dbPath || DB_PATH;
  isMemoryDb = actualPath === ":memory:";
  if (isMemoryDb) {
    db = new SQL.Database();
  } else if (fs.existsSync(actualPath)) {
    const buffer = fs.readFileSync(actualPath);
    db = new SQL.Database(buffer);
  } else {
    db = new SQL.Database();
    const dir = path.dirname(actualPath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  }
  db.run("PRAGMA foreign_keys = ON");
  createTables();
}

function createTables(): void {
  db.run(`CREATE TABLE IF NOT EXISTS permissions (
    id TEXT PRIMARY KEY, code TEXT NOT NULL UNIQUE, name TEXT NOT NULL,
    module TEXT NOT NULL DEFAULT '', description TEXT DEFAULT ''
  )`);
  db.run(`CREATE TABLE IF NOT EXISTS roles (
    id TEXT PRIMARY KEY, name TEXT NOT NULL UNIQUE, description TEXT DEFAULT '',
    permissions TEXT NOT NULL DEFAULT '[]', createdAt TEXT NOT NULL, updatedAt TEXT NOT NULL
  )`);
  db.run(`CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY, email TEXT NOT NULL UNIQUE, password TEXT DEFAULT '',
    name TEXT NOT NULL, role TEXT NOT NULL, roleId TEXT NOT NULL,
    avatar TEXT DEFAULT '', createdAt TEXT NOT NULL, updatedAt TEXT NOT NULL,
    FOREIGN KEY (roleId) REFERENCES roles(id)
  )`);
  db.run(`CREATE TABLE IF NOT EXISTS currencies (
    id TEXT PRIMARY KEY, code TEXT NOT NULL UNIQUE, name TEXT NOT NULL,
    symbol TEXT DEFAULT '', exchangeRate REAL NOT NULL DEFAULT 1,
    isBase INTEGER NOT NULL DEFAULT 0, createdAt TEXT NOT NULL, updatedAt TEXT NOT NULL
  )`);
  db.run(`CREATE TABLE IF NOT EXISTS proposals (
    id TEXT PRIMARY KEY, userId TEXT NOT NULL, userEmail TEXT NOT NULL,
    proposalCode TEXT NOT NULL UNIQUE, date TEXT NOT NULL, division TEXT NOT NULL,
    currency TEXT NOT NULL, totalAmount REAL NOT NULL DEFAULT 0,
    description TEXT DEFAULT '', pdfFile TEXT DEFAULT '',
    type TEXT NOT NULL DEFAULT 'financial', step INTEGER NOT NULL DEFAULT 2,
    status TEXT NOT NULL DEFAULT 'active', createdAt TEXT NOT NULL, updatedAt TEXT NOT NULL,
    FOREIGN KEY (userId) REFERENCES users(id)
  )`);
  db.run(`CREATE TABLE IF NOT EXISTS audit_logs (
    id TEXT PRIMARY KEY, userId TEXT NOT NULL, userEmail TEXT NOT NULL,
    action TEXT NOT NULL, module TEXT NOT NULL, resourceId TEXT DEFAULT '',
    details TEXT DEFAULT '', ip TEXT DEFAULT '', timestamp TEXT NOT NULL,
    FOREIGN KEY (userId) REFERENCES users(id)
  )`);
  db.run(`CREATE TABLE IF NOT EXISTS notifications (
    id TEXT PRIMARY KEY, userId TEXT NOT NULL, title TEXT NOT NULL,
    message TEXT NOT NULL, type TEXT NOT NULL DEFAULT 'info',
    read INTEGER NOT NULL DEFAULT 0, link TEXT DEFAULT '', createdAt TEXT NOT NULL,
    FOREIGN KEY (userId) REFERENCES users(id)
  )`);
}

export function saveDb(): void {
  if (isMemoryDb) return;
  const data = db.export();
  fs.writeFileSync(DB_PATH, Buffer.from(data));
}

export function getDb(): SqlJsDatabase {
  return db;
}

export function isDbEmpty(table: string): boolean {
  const result = db.exec(`SELECT COUNT(*) as cnt FROM ${table}`);
  return result.length === 0 || result[0].values[0][0] === 0;
}

export function dbRun(sql: string, params: any[] = []): void {
  db.run(sql, params);
  saveDb();
}

export { DB_PATH };
