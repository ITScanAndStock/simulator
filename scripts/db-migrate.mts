import { readdir, readFile } from "node:fs/promises";
import pg from "pg";

const migrationsDirectory = new URL("../db/migrations/", import.meta.url);

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error("DATABASE_URL is not set (see README).");
  process.exit(1);
}

class Refusal extends Error {}

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
  const {
    rows: [{ database, schema, foreign }],
  } = await client.query<{
    database: string;
    schema: string | null;
    foreign: boolean;
  }>(
    `SELECT current_database() AS database, current_schema() AS schema,
      NOT EXISTS (SELECT 1 FROM pg_tables
          WHERE schemaname = current_schema() AND tablename = 'schema_migration')
        AND EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = current_schema()) AS foreign`,
  );
  if (foreign) {
    throw new Refusal(
      `db:migrate only migrates a simulator database: schema "${schema}" of database "${database}" already holds tables but no schema_migration table. Nothing was migrated.`,
    );
  }
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
  if (!(error instanceof Refusal)) throw error;
  console.error(error.message);
  process.exitCode = 1;
} finally {
  await client.end();
}
