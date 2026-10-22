import "server-only";
import { Pool } from "pg";
import { databaseUrl } from "./settings";

// Hot reloads re-evaluate this module; keeping the pool on globalThis avoids opening a new one each time.
const globalWithPool = globalThis as typeof globalThis & {
  simulatorPool?: Pool;
};

export function databasePool(): Pool {
  if (!globalWithPool.simulatorPool) {
    globalWithPool.simulatorPool = new Pool({
      connectionString: databaseUrl(),
    });
  }
  return globalWithPool.simulatorPool;
}
