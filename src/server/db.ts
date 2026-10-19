import "server-only";
import { Pool } from "pg";

// Hot reloads re-evaluate this module; keeping the pool on globalThis avoids opening a new one each time.
const globalWithPool = globalThis as typeof globalThis & {
  simulatorPool?: Pool;
};

export function databasePool(): Pool {
  if (!globalWithPool.simulatorPool) {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) throw new Error("DATABASE_URL is not set.");
    globalWithPool.simulatorPool = new Pool({ connectionString });
  }
  return globalWithPool.simulatorPool;
}
