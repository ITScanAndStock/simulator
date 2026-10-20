import { existsSync, readFileSync } from "node:fs";
import { parseEnv } from "node:util";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

// Only the real-invoice folder: no unit test should reach the databases named there.
if (existsSync(".env.local")) {
  process.env.REAL_INVOICES_DIR ??= parseEnv(
    readFileSync(".env.local", "utf8"),
  ).REAL_INVOICES_DIR;
}

export default defineConfig({
  plugins: [react()],
  resolve: {
    tsconfigPaths: true,
  },
  test: {
    projects: [
      {
        extends: true,
        test: {
          name: "node",
          environment: "node",
          include: ["src/**/*.test.ts"],
        },
      },
      {
        extends: true,
        test: {
          name: "dom",
          environment: "jsdom",
          include: ["src/**/*.test.tsx"],
          setupFiles: ["./vitest.setup.ts"],
        },
      },
    ],
  },
});
