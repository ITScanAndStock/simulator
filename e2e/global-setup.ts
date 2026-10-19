import { execFileSync } from "node:child_process";

export default function globalSetup() {
  execFileSync("pnpm", ["db:migrate"], {
    stdio: "inherit",
    env: { ...process.env, DATABASE_URL: process.env.E2E_DATABASE_URL },
  });
}
