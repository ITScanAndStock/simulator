import { expect, test } from "@playwright/test";
import { withScratchSchema } from "./scratch-schema";
import { e2eDatabase, failureOf } from "./run-db-command";

for (const url of [
  "postgresql://u:p@db.example.com:5432/x",
  "postgresql://u:p@localhost:5432/x?host=db.example.com",
  "postgresql://u:p@localhost/x?host=localhost&host=db.example.com",
]) {
  test(`pnpm db:empty refuses a database that is not on this computer (${url})`, () => {
    const failure = failureOf("db:empty", url);

    expect(failure.status).toBe(1);
    expect(failure.stderr).toContain(
      'db:empty only empties a local database; DATABASE_URL points to "db.example.com".',
    );
  });
}

for (const url of [
  "postgresql://u:p@localhost:5432",
  "postgresql://u:p@localhost:5432/",
]) {
  test(`pnpm db:empty refuses a URL that names no database (${url})`, () => {
    const failure = failureOf("db:empty", url);

    expect(failure.status).toBe(1);
    expect(failure.stderr).toContain(
      "DATABASE_URL must name the database to empty.",
    );
  });
}

for (const url of ["postgresql://u:p@/x", "postgresql://u:p@:5432/x"]) {
  test(`pnpm db:empty refuses a URL that names no server (${url})`, () => {
    const failure = failureOf("db:empty", url);

    expect(failure.status).toBe(1);
    expect(failure.stderr).toContain(
      "DATABASE_URL must be a postgresql://user:password@host:port/database URL (see README).",
    );
  });
}

test("pnpm db:empty refuses a local database that db:migrate did not create", async () => {
  await withScratchSchema({ foreignTable: true }, async (foreign) => {
    const failure = failureOf("db:empty", foreign.databaseUrl);

    expect(failure.status).toBe(1);
    expect(failure.stderr).toContain(
      `db:empty only empties a simulator database: schema "${foreign.schema}" of database "${e2eDatabase()}" has no schema_migration table. Nothing was emptied.`,
    );
    expect(await foreign.patientCount()).toBe(1);
  });
});
