import { existsSync, readFileSync } from "node:fs";
import { parseEnv } from "node:util";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

// Only the folders of real documents: no unit test should reach the databases named there.
const localEnv = existsSync(".env.local")
  ? parseEnv(readFileSync(".env.local", "utf8"))
  : {};
for (const name of ["REAL_INVOICES_DIR", "STRAUMANN_PRICE_LISTS_DIR"]) {
  const value = localEnv[name];
  if (value && !process.env[name]) process.env[name] = value;
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
