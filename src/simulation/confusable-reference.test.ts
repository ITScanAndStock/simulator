import { describe, expect, it } from "vitest";
import type { PriceLookup } from "@/price-lookup/price-lookup";
import type { InvoiceLine } from "@/invoice-reading/invoice-line";
import { proposeReference, proposeReferences } from "./confusable-reference";

function lookupKnowing(...references: string[]) {
  const asked: string[] = [];
  const lookup: PriceLookup = async (supplier, reference) => {
    asked.push(`${supplier} ${reference}`);
    return references.includes(reference)
      ? { outcome: "absentAtReference" }
      : { outcome: "unknownReference" };
  };
  return { lookup, asked };
}

describe("proposeReference", () => {
  // Catches: one of the confused pairs left out, or a substitution made in one direction only.
  it.each([
    ["A-3O0915", "A-300915"],
    ["412-0815", "412-O815"],
    ["4I2-0815", "412-0815"],
    ["4l2-0815", "412-0815"],
    ["412-1815", "412-I815"],
    ["S12-3344", "512-3344"],
    ["512-3344", "S12-3344"],
    ["233-1B02", "233-1802"],
    ["233-1802", "233-1B02"],
  ])("proposes for %s the known reference %s", async (read, known) => {
    const { lookup, asked } = lookupKnowing(known);

    expect(await proposeReference(lookup, "DoctorAI", read)).toBe(known);
    expect(asked).toContain(`DoctorAI ${known}`);
  });

  // Catches: a proposal made for a reference the supplier already has.
  it("proposes nothing for a reference found as read", async () => {
    const { lookup } = lookupKnowing("S12-3344", "512-3344");

    expect(await proposeReference(lookup, "DoctorAI", "S12-3344")).toBe(
      undefined,
    );
  });

  // Catches: one of two near-identical references picked at random.
  it("proposes nothing when two near-identical references are known", async () => {
    const { lookup } = lookupKnowing("80", "BO");

    expect(await proposeReference(lookup, "DoctorAI", "B0")).toBe(undefined);
  });

  // Catches: a reference with no near-identical one proposed anyway.
  it("proposes nothing when no near-identical reference is known", async () => {
    const { lookup } = lookupKnowing("999-9999");

    expect(await proposeReference(lookup, "DoctorAI", "233-1001")).toBe(
      undefined,
    );
  });

  // Catches: a reference full of confusable characters sending dozens of questions to Coompy.
  it("asks nothing more for a reference with too many confusable characters", async () => {
    const { lookup, asked } = lookupKnowing("1111111111");

    expect(await proposeReference(lookup, "DoctorAI", "11111111I1")).toBe(
      undefined,
    );
    expect(asked).toEqual(["DoctorAI 11111111I1"]);
  });
});

function line(reference: string): InvoiceLine {
  return {
    reference,
    designation: "Produit",
    quantity: 1,
    unitPriceCents: 100,
    amountCents: 100,
    vatRate: 20,
    unsure: [],
  };
}

describe("proposeReferences", () => {
  // Catches: the proposal left off its line, or put on another line.
  it("proposes a reference for each line that has one", async () => {
    const { lookup } = lookupKnowing("412-0815", "512-3344");

    const lines = await proposeReferences(lookup, "DoctorAI", [
      line("412-0815"),
      line("S12-3344"),
    ]);

    expect(lines.map((l) => l.proposedReference)).toEqual([
      undefined,
      "512-3344",
    ]);
  });

  // Catches: an invoice of unknown references sending Coompy hundreds of questions.
  it("stops asking Coompy after about a hundred questions for one invoice", async () => {
    const { lookup, asked } = lookupKnowing();

    await proposeReferences(
      lookup,
      "DoctorAI",
      Array.from({ length: 20 }, () => line("1111111I")),
    );

    expect(asked).toHaveLength(6 * 17);
  });
});
