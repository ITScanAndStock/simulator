import { execFileSync } from "node:child_process";

export function runDbEmpty(databaseUrl: string) {
  return execFileSync("pnpm", ["--silent", "db:empty"], {
    encoding: "utf8",
    stdio: "pipe",
    env: { ...process.env, DATABASE_URL: databaseUrl },
  });
}
