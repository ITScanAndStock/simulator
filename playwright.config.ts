import { existsSync } from "node:fs";
import { defineConfig, devices } from "@playwright/test";

const port = 3100;

if (existsSync(".env.local")) process.loadEnvFile(".env.local");
const e2eDatabaseUrl = process.env.E2E_DATABASE_URL;
if (!e2eDatabaseUrl) {
  throw new Error(
    "E2E_DATABASE_URL is not set: the journey tests need their own database (see README).",
  );
}
const e2eDatabase = databaseName(e2eDatabaseUrl, "E2E_DATABASE_URL");
// Compared by name alone: host, port and options have too many spellings for the same server.
if (
  process.env.DATABASE_URL &&
  databaseName(process.env.DATABASE_URL, "DATABASE_URL") === e2eDatabase
) {
  throw new Error(
    "E2E_DATABASE_URL must name another database than DATABASE_URL: the journey tests would write to the local database.",
  );
}

function databaseName(connectionString: string, variable: string) {
  let name = "";
  try {
    name = decodeURIComponent(new URL(connectionString).pathname.slice(1));
  } catch {}
  if (!name) {
    throw new Error(
      `${variable} must be a postgresql:// URL naming its database.`,
    );
  }
  return name;
}

export default defineConfig({
  testDir: "./e2e",
  globalSetup: "./e2e/global-setup.ts",
  forbidOnly: !!process.env.CI,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL: `http://localhost:${port}`,
    trace: "retain-on-failure",
  },
  // db:empty wipes the whole e2e database, so it runs alone once every other test has finished.
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
      testIgnore: "db-empty.spec.ts",
    },
    {
      name: "db-empty",
      use: { ...devices["Desktop Chrome"] },
      testMatch: "db-empty.spec.ts",
      dependencies: ["chromium"],
    },
  ],
  webServer: {
    command: `pnpm build && pnpm start --port ${port}`,
    url: `http://localhost:${port}`,
    env: { NEXT_DIST_DIR: ".next-e2e", DATABASE_URL: e2eDatabaseUrl },
    reuseExistingServer: false,
    timeout: 180_000,
  },
});
