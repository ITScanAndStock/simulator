import { readFile } from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { realInvoicesExpected } from "../../test-invoices/real/expected";
import { readInvoice } from "./read-invoice";

const folder = process.env.REAL_INVOICES_DIR;

describe.skipIf(!folder)("readInvoice on the real invoices", () => {
  // Catches: a layout of a real invoice that the fake ones do not reproduce.
  it.each(Object.entries(realInvoicesExpected))(
    "reads %s",
    async (name, expected) => {
      const bytes = new Uint8Array(await readFile(path.join(folder!, name)));

      expect(await readInvoice(bytes)).toEqual(expected);
    },
    30_000,
  );
});
