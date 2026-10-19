import { readdir, readFile } from "node:fs/promises";
import pg from "pg";

const migrationsDirectory = new URL("../db/migrations/", import.meta.url);

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error("DATABASE_URL is not set (see README).");
  process.exit(1);
}

const files = (await readdir(migrationsDirectory))
  .filter((file) => file.endsWith(".sql"))
  .sort();

const client = new pg.Client({ connectionString });
await client.connect();
try {
  await client.query("BEGIN");
  // Taken before anything else so that two first runs at once cannot both create the table or apply a file.
  await client.query(
    "SELECT pg_advisory_xact_lock(hashtext('simulator schema_migration'))",
  );
  await client.query(
    `CREATE TABLE IF NOT EXISTS schema_migration (
      name text PRIMARY KEY,
      applied_at timestamptz NOT NULL DEFAULT now()
    )`,
  );
  const { rows } = await client.query<{ name: string }>(
    "SELECT name FROM schema_migration",
  );
  const applied = new Set(rows.map((row) => row.name));
  const pending = files.filter((file) => !applied.has(file));
  for (const file of pending) {
    await client.query(
      await readFile(new URL(file, migrationsDirectory), "utf8"),
    );
    await client.query("INSERT INTO schema_migration (name) VALUES ($1)", [
      file,
    ]);
    console.log(`Applied ${file}`);
  }
  await client.query("COMMIT");
  if (pending.length === 0) console.log("No pending migration.");
} catch (error) {
  await client
    .query("ROLLBACK")
    .catch((rollbackError: unknown) =>
      console.error("ROLLBACK failed:", rollbackError),
    );
  throw error;
} finally {
  await client.end();
}
