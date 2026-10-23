import { execFileSync } from "node:child_process";
import pg from "pg";
import { readDatabaseUrl } from "../scripts/database-url.mts";
import { findGroupPrices } from "../src/straumann-group/price-list-store.ts";

type DbCommand = "db:empty" | "db:migrate" | "price-lists:import";

export function runDbCommand(
  command: DbCommand,
  databaseUrl: string,
  env: Record<string, string> = {},
) {
  return execFileSync("pnpm", ["--silent", command], {
    encoding: "utf8",
    stdio: "pipe",
    env: { ...process.env, DATABASE_URL: databaseUrl, ...env },
  });
}

export function failureOf(
  command: DbCommand,
  databaseUrl: string,
  env: Record<string, string> = {},
) {
  try {
    runDbCommand(command, databaseUrl, env);
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

export const fakePriceLists = { STRAUMANN_PRICE_LISTS_DIR: "test-price-lists" };

export function e2eDatabaseUrl() {
  const url = process.env.E2E_DATABASE_URL;
  if (!url) throw new Error("E2E_DATABASE_URL is not set.");
  return url;
}

export function e2eDatabase() {
  const database = readDatabaseUrl(
    process.env.E2E_DATABASE_URL ?? "",
  )?.database;
  if (!database) throw new Error("E2E_DATABASE_URL must name its database.");
  return database;
}

export async function groupPricesOf(databaseUrl: string, reference: string) {
  const client = new pg.Client({ connectionString: databaseUrl });
  await client.connect();
  try {
    return await findGroupPrices(client, reference);
  } finally {
    await client.end();
  }
}
