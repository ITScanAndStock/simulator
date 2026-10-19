import { expect, test } from "@playwright/test";
import { runDbEmpty } from "./run-db-empty";

function failureOf(databaseUrl: string) {
  try {
    runDbEmpty(databaseUrl);
  } catch (error) {
    return error as { status: number | null; stderr: string };
  }
  throw new Error(`pnpm db:empty accepted ${databaseUrl}`);
}

for (const url of [
  "postgresql://u:p@db.example.com:5432/x",
  "postgresql://u:p@localhost:5432/x?host=db.example.com",
  "postgresql://u:p@localhost/x?host=localhost&host=db.example.com",
]) {
  test(`pnpm db:empty refuses a database that is not on this computer (${url})`, () => {
    const failure = failureOf(url);

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
    const failure = failureOf(url);

    expect(failure.status).toBe(1);
    expect(failure.stderr).toContain(
      "DATABASE_URL must name the database to empty.",
    );
  });
}
