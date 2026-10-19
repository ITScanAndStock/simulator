import { randomUUID } from "node:crypto";
import pg from "pg";

type ScratchSchema = {
  databaseUrl: string;
  schema: string;
  tables: () => Promise<string[]>;
  patientCount: () => Promise<number>;
};

export async function withScratchSchema(
  { foreignTable }: { foreignTable: boolean },
  run: (scratch: ScratchSchema) => Promise<void>,
) {
  const e2eDatabaseUrl = process.env.E2E_DATABASE_URL;
  if (!e2eDatabaseUrl) throw new Error("E2E_DATABASE_URL is not set.");
  const schema = `scratch_${randomUUID().replaceAll("-", "")}`;
  const databaseUrl = new URL(e2eDatabaseUrl);
  databaseUrl.searchParams.set("options", `-c search_path=${schema}`);
  const client = new pg.Client({ connectionString: e2eDatabaseUrl });
  await client.connect();
  let failed = false;
  try {
    await client.query(`CREATE SCHEMA ${schema}`);
    if (foreignTable) {
      await client.query(`CREATE TABLE ${schema}.patient (name text)`);
      await client.query(`INSERT INTO ${schema}.patient VALUES ('Claire')`);
    }
    await run({
      databaseUrl: databaseUrl.href,
      schema,
      tables: async () =>
        (
          await client.query<{ name: string }>(
            "SELECT tablename AS name FROM pg_tables WHERE schemaname = $1 ORDER BY tablename",
            [schema],
          )
        ).rows.map((row) => row.name),
      patientCount: async () =>
        (
          await client.query<{ count: number }>(
            `SELECT count(*)::int AS count FROM ${schema}.patient`,
          )
        ).rows[0].count,
    });
  } catch (error) {
    failed = true;
    throw error;
  } finally {
    try {
      await client.query(`DROP SCHEMA IF EXISTS ${schema} CASCADE`);
    } catch (dropError) {
      if (!failed) throw dropError;
      console.error(`Could not drop the scratch schema ${schema}:`, dropError);
    } finally {
      await client.end();
    }
  }
}
