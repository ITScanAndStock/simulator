import pg from "pg";

const localHosts = new Set(["localhost", "127.0.0.1", "::1"]);
const lockTimeout = "5s";

function refuse(message: string): never {
  console.error(message);
  process.exit(1);
}

const connectionString = process.env.DATABASE_URL;
if (!connectionString) refuse("DATABASE_URL is not set (see README).");

let named = "";
try {
  named = decodeURIComponent(new URL(connectionString).pathname.slice(1));
} catch {
  refuse("DATABASE_URL must be a postgresql:// URL (see README).");
}
// Without a name pg falls back to PGDATABASE or the user name, which could be another local database.
if (!named) refuse("DATABASE_URL must name the database to empty.");

const client = new pg.Client({ connectionString });
if (!localHosts.has(client.host)) {
  refuse(
    `db:empty only empties a local database; DATABASE_URL points to "${client.host}".`,
  );
}

await client.connect();
try {
  await client.query("BEGIN");
  await client.query(`SET LOCAL lock_timeout = '${lockTimeout}'`);
  const { rows: tables } = await client.query<{
    schema: string;
    name: string;
  }>(
    `SELECT schemaname AS schema, tablename AS name FROM pg_tables
      WHERE schemaname = current_schema() AND tablename <> 'schema_migration'
      ORDER BY tablename`,
  );
  const {
    rows: [{ database }],
  } = await client.query<{ database: string }>(
    "SELECT current_database() AS database",
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
  if ((error as { code?: string }).code !== "55P03") throw error;
  console.error(
    `db:empty could not lock the tables within ${lockTimeout}: another transaction is using them. Nothing was emptied.`,
  );
  process.exitCode = 1;
} finally {
  await client.end();
}
