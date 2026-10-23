import pg from "pg";
import { localHosts, readDatabaseUrl } from "./database-url.mts";

const lockTimeout = "5s";

class Refusal extends Error {}

function refuse(message: string): never {
  console.error(message);
  process.exit(1);
}

const connectionString = process.env.DATABASE_URL;
if (!connectionString) refuse("DATABASE_URL is not set (see README).");

const target = readDatabaseUrl(connectionString);
if (!target) {
  refuse(
    "DATABASE_URL must be a postgresql://user:password@host:port/database URL (see README).",
  );
}
// Without a name pg falls back to PGDATABASE or the user name, which could be another local database.
if (!target.database) refuse("DATABASE_URL must name the database to empty.");
if (!localHosts.has(target.host)) {
  refuse(
    `db:empty only empties a local database; DATABASE_URL points to "${target.host}".`,
  );
}

const client = new pg.Client({ connectionString });
await client.connect();
try {
  await client.query("BEGIN");
  await client.query(`SET LOCAL lock_timeout = '${lockTimeout}'`);
  const {
    rows: [{ database, schema, simulator }],
  } = await client.query<{
    database: string;
    schema: string | null;
    simulator: boolean;
  }>(
    `SELECT current_database() AS database, current_schema() AS schema,
      EXISTS (SELECT 1 FROM pg_tables
        WHERE schemaname = current_schema() AND tablename = 'schema_migration') AS simulator`,
  );
  if (!simulator || !schema) {
    throw new Refusal(
      `db:empty only empties a simulator database: schema "${schema}" of database "${database}" has no schema_migration table. Nothing was emptied.`,
    );
  }
  // Checked before locking anything else, then pinned: ACCESS SHARE blocks a DROP of schema_migration until COMMIT.
  await client.query(
    `LOCK TABLE ${client.escapeIdentifier(schema)}.schema_migration IN ACCESS SHARE MODE`,
  );
  const { rows: tables } = await client.query<{
    schema: string;
    name: string;
  }>(
    `SELECT schemaname AS schema, tablename AS name FROM pg_tables
      WHERE schemaname = current_schema()
        AND tablename NOT IN ('schema_migration', 'group_price')
      ORDER BY tablename`,
  );
  const qualified = tables.map(
    (table) =>
      `${client.escapeIdentifier(table.schema)}.${client.escapeIdentifier(table.name)}`,
  );
  const counts: [string, number][] = [];
  if (tables.length > 0) {
    // Locked first so that no row is written between its count and the truncation.
    await client.query(
      `LOCK TABLE ${qualified.join(", ")} IN ACCESS EXCLUSIVE MODE`,
    );
    for (const [index, table] of tables.entries()) {
      const { rows } = await client.query<{ count: number }>(
        `SELECT count(*)::int AS count FROM ${qualified[index]}`,
      );
      counts.push([table.name, rows[0].count]);
    }
    await client.query(
      `TRUNCATE ${qualified.join(", ")} RESTART IDENTITY CASCADE`,
    );
  }
  await client.query("COMMIT");
  console.log(`Emptied database "${database}" on ${client.host}.`);
  for (const [name, count] of counts) {
    console.log(`  ${name}: ${count} row${count === 1 ? "" : "s"} removed`);
  }
  if (counts.length === 0) console.log("  No table to empty.");
} catch (error) {
  await client
    .query("ROLLBACK")
    .catch((rollbackError: unknown) =>
      console.error("ROLLBACK failed:", rollbackError),
    );
  if (error instanceof Refusal) {
    console.error(error.message);
  } else if ((error as { code?: string }).code === "55P03") {
    console.error(
      `db:empty could not lock the tables within ${lockTimeout}: another transaction is using them. Nothing was emptied.`,
    );
  } else {
    throw error;
  }
  process.exitCode = 1;
} finally {
  await client.end();
}
