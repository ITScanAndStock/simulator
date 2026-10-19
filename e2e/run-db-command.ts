import { execFileSync } from "node:child_process";
import { readDatabaseUrl } from "../scripts/database-url.mts";

type DbCommand = "db:empty" | "db:migrate";

export function runDbCommand(command: DbCommand, databaseUrl: string) {
  return execFileSync("pnpm", ["--silent", command], {
    encoding: "utf8",
    stdio: "pipe",
    env: { ...process.env, DATABASE_URL: databaseUrl },
  });
}

export function failureOf(command: DbCommand, databaseUrl: string) {
  try {
    runDbCommand(command, databaseUrl);
  } catch (error) {
    return error as { status: number | null; stderr: string };
  }
  throw new Error(`pnpm ${command} accepted ${describe(databaseUrl)}`);
}

// Never the URL itself: scratch URLs carry the E2E_DATABASE_URL password.
function describe(databaseUrl: string) {
  const target = readDatabaseUrl(databaseUrl);
  if (!target) return "a URL it should not parse";
  const options = new URL(databaseUrl).searchParams.get("options");
  return `database "${target.database}" on "${target.host}"${options ? ` (${options})` : ""}`;
}

export function e2eDatabase() {
  const database = readDatabaseUrl(
    process.env.E2E_DATABASE_URL ?? "",
  )?.database;
  if (!database) throw new Error("E2E_DATABASE_URL must name its database.");
  return database;
}
