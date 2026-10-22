import { existsSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { defineConfig, devices } from "@playwright/test";
import {
  e2eReferenceSupplier,
  fakeCoompyPort,
} from "./e2e/fake-coompy-settings";
import { localHosts, readDatabaseUrl } from "./scripts/database-url.mts";

const port = 3100;
// The server listens on 127.0.0.1 only; "localhost" may resolve to ::1 first.
const origin = `http://127.0.0.1:${port}`;

if (existsSync(".env.local")) process.loadEnvFile(".env.local");
// Set once by the runner; workers load this file again and must see the same folder.
process.env.E2E_SERVER_TMPDIR ??= mkdtempSync(
  path.join(tmpdir(), "simulator-e2e-server-"),
);
const e2eDatabaseUrl = process.env.E2E_DATABASE_URL;
if (!e2eDatabaseUrl) {
  throw new Error(
    "E2E_DATABASE_URL is not set: the journey tests need their own database (see README).",
  );
}
const e2eTarget = databaseTarget(e2eDatabaseUrl, "E2E_DATABASE_URL");
if (!localHosts.has(e2eTarget.host)) {
  throw new Error(
    `E2E_DATABASE_URL must point to a database on this computer; it points to "${e2eTarget.host}".`,
  );
}
// Compared by name alone: host, port and options have too many spellings for the same server.
if (
  process.env.DATABASE_URL &&
  databaseTarget(process.env.DATABASE_URL, "DATABASE_URL").database ===
    e2eTarget.database
) {
  throw new Error(
    "E2E_DATABASE_URL must name another database than DATABASE_URL: the journey tests would write to the local database.",
  );
}

function databaseTarget(connectionString: string, variable: string) {
  const target = readDatabaseUrl(connectionString);
  if (!target?.database) {
    throw new Error(
      `${variable} must be a postgresql://user:password@host:port/database URL.`,
    );
  }
  return target;
}

export default defineConfig({
  testDir: "./e2e",
  globalSetup: "./e2e/global-setup.ts",
  forbidOnly: !!process.env.CI,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL: origin,
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
  webServer: [
    {
      command: `FAKE_COOMPY_PORT=${fakeCoompyPort} node e2e/fake-coompy.mts`,
      url: `http://127.0.0.1:${fakeCoompyPort}/`,
      reuseExistingServer: false,
    },
    {
      command: `pnpm build && TMPDIR=${process.env.E2E_SERVER_TMPDIR} pnpm start --port ${port}`,
      url: origin,
      env: {
        NEXT_DIST_DIR: ".next-e2e",
        APP_ENV: "test",
        REFERENCE_SUPPLIER: e2eReferenceSupplier,
        DATABASE_URL: e2eDatabaseUrl,
        COOMPY_API_URL: `http://127.0.0.1:${fakeCoompyPort}/api`,
        COOMPY_TOKEN_URL: `http://127.0.0.1:${fakeCoompyPort}/token`,
        COOMPY_CLIENT_ID: "e2e",
        COOMPY_CLIENT_SECRET: "e2e-secret",
        AVERAGE_SAVING_EUROS: "31200",
        CALENDLY_URL: "https://calendly.example/e2e",
        MAX_INVOICE_MEGABYTES: "3",
      },
      reuseExistingServer: false,
      timeout: 180_000,
    },
  ],
});
