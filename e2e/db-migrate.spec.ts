import { expect, test } from "@playwright/test";
import { withScratchSchema } from "./scratch-schema";
import { e2eDatabase, failureOf, runDbCommand } from "./run-db-command";

test("pnpm db:migrate refuses a database that holds tables but no schema_migration", async () => {
  await withScratchSchema({ foreignTable: true }, async (foreign) => {
    const failure = failureOf("db:migrate", foreign.databaseUrl);

    expect(failure.status).toBe(1);
    expect(failure.stderr).toContain(
      `db:migrate only migrates a simulator database: schema "${foreign.schema}" of database "${e2eDatabase()}" already holds tables but no schema_migration table. Nothing was migrated.`,
    );
    expect(await foreign.tables()).toEqual(["patient"]);
  });
});

test("pnpm db:migrate creates the tables in an empty database", async () => {
  await withScratchSchema({ foreignTable: false }, async (scratch) => {
    const output = runDbCommand("db:migrate", scratch.databaseUrl);

    expect(output).toMatch(/^Applied \S+\.sql$/m);
    expect(output).not.toContain("No pending migration.");
    expect(await scratch.tables()).toEqual(
      expect.arrayContaining(["schema_migration", "simulation"]),
    );
  });
});
