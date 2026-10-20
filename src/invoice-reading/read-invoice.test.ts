import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import { doctorAiFakeExpected } from "../../test-invoices/doctor-ai-fake.expected";
import { readInvoice } from "./read-invoice";

async function testInvoice(name: string) {
  return new Uint8Array(await readFile(`test-invoices/${name}`));
}

describe("readInvoice", () => {
  // Catches: the list price taken for the price paid, a two-part designation cut short,
  // the spaced-out barcode read as a line, the en dash kept in references.
  it("reads the lines and the total of a Doctor AI invoice", async () => {
    const read = await readInvoice(await testInvoice("doctor-ai-fake.pdf"));

    expect(read).toEqual(doctorAiFakeExpected);
  });

  // Catches: a supplier recognised from its name alone, which a stock export also prints.
  it("does not take a document that only names Doctor AI for its invoice", async () => {
    const read = await readInvoice(await testInvoice("stock-export-fake.pdf"));

    expect(read).toEqual({ status: "unsupported" });
  });

  // Catches: a damaged file that throws out of the reading instead of being reported.
  it("reports a file that is not a readable PDF", async () => {
    const read = await readInvoice(new TextEncoder().encode("%PDF-1.4 cut"));

    expect(read).toEqual({ status: "unreadable" });
  });

  // Catches: a Doctor AI document whose lines cannot be found throwing out of the reading.
  it("reports a Doctor AI document in which no line can be read", async () => {
    const read = await readInvoice(
      await testInvoice("doctor-ai-without-lines-fake.pdf"),
    );

    expect(read).toEqual({ status: "unreadable" });
  });
});
