import pg from "pg";

export const localHosts = new Set(["localhost", "127.0.0.1", "::1"]);

// host is the one pg will connect to (a repeated ?host= keeps the last); database is "" when the URL names none.
export function readDatabaseUrl(connectionString: string) {
  try {
    const database = decodeURIComponent(
      new URL(connectionString).pathname.slice(1),
    );
    return { host: new pg.Client({ connectionString }).host, database };
  } catch {
    return undefined;
  }
}
