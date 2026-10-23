import { cpSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { expect, test } from "@playwright/test";
import {
  e2eDatabaseUrl,
  failureOf,
  fakePriceLists,
  groupPricesOf,
  runDbCommand,
} from "./run-db-command";

function pricesOf(reference: string) {
  return groupPricesOf(e2eDatabaseUrl(), reference);
}

// Catches: a second import refused or added to the first, a price list skipped, or a lookup that folds case.
test("pnpm price-lists:import replaces the group prices with those of the four price lists", async () => {
  runDbCommand("price-lists:import", e2eDatabaseUrl(), fakePriceLists);
  const output = runDbCommand(
    "price-lists:import",
    e2eDatabaseUrl(),
    fakePriceLists,
  );

  expect(output).toContain("straumann: 6 references (price list 2031)");
  expect(output).toContain("anthogyr: 5 references (price list 2031)");
  expect(output).toContain("neodent: 3 references (price list 2031)");
  expect(output).toContain("biomaterials: 4 references (price list 2031)");
  expect(await pricesOf("091.0008S")).toEqual([
    { list: "straumann", range: "straumann", cataloguePriceCents: 48000 },
  ]);
  expect(await pricesOf("S1-9210-025")).toEqual([
    { list: "biomaterials", range: "xenograft", cataloguePriceCents: 8440 },
  ]);
  // Exact match: the lookup does not fold case or trim.
  expect(await pricesOf("091.0008s")).toEqual([]);
  expect(await pricesOf(" 091.0008S")).toEqual([]);
});

// Catches: the group prices emptied by an import that stops halfway.
test("pnpm price-lists:import keeps the imported prices when a price list is missing", async () => {
  runDbCommand("price-lists:import", e2eDatabaseUrl(), fakePriceLists);
  const incomplete = mkdtempSync(path.join(tmpdir(), "price-lists-"));
  try {
    cpSync("test-price-lists", incomplete, { recursive: true });
    rmSync(path.join(incomplete, "catalogue_neodent.pdf"));

    const failure = failureOf("price-lists:import", e2eDatabaseUrl(), {
      STRAUMANN_PRICE_LISTS_DIR: incomplete,
    });

    expect(failure.status).toBe(1);
    expect(failure.stderr).toContain("catalogue_neodent.pdf");
    expect(await pricesOf("190.943")).toHaveLength(1);
  } finally {
    rmSync(incomplete, { recursive: true });
  }
});
