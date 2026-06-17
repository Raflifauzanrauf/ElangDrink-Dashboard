import { Pool } from "pg";
import path from "path";
import { runner } from "node-pg-migrate";

let pool: Pool;

export async function initDb(): Promise<void> {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL environment variable is required");
  }
  pool = new Pool({ connectionString });

  await (runner as any)({
    dbClient: pool,
    dir: path.join(__dirname, "../migrations"),
    direction: "up",
    migrationsTable: "pgmigrations",
  });

  console.log("Database connected and migrations applied");
}

export function getDb(): Pool {
  return pool;
}

export async function dbRun(sql: string, params: any[] = []): Promise<void> {
  try {
    await pool.query(sql, params);
  } catch {}
}

export async function isDbEmpty(table: string): Promise<boolean> {
  try {
    const result = await pool.query(`SELECT COUNT(*)::int as cnt FROM ${table}`);
    return parseInt(result.rows[0].cnt, 10) === 0;
  } catch {
    return true;
  }
}

export async function truncateTables(): Promise<void> {
  const tables = ["notifications", "audit_logs", "proposals", "currencies", "users", "roles", "permissions"];
  for (const t of tables) {
    try { await pool.query(`DELETE FROM ${t}`); } catch {}
  }
}
