import { describe, expect, it } from "vitest";
import type { InvoiceLine } from "@/invoice-reading/invoice-line";
import type {
  PriceLookup,
  PriceLookupResult,
} from "@/price-lookup/price-lookup";
import { simulate } from "./simulate";

const settings = { suspiciousSavingPercent: 50 };

function line(
  reference: string,
  quantity: number,
  unitPriceCents: number,
): InvoiceLine {
  return {
    reference,
    designation: `Produit ${reference}`,
    quantity,
    unitPriceCents,
    amountCents: quantity * unitPriceCents,
    vatRate: 20,
  };
}

function matched(
  referenceUnitPriceCents: number,
  packs: { issuing?: number; reference?: number } = {},
): PriceLookupResult {
  return {
    outcome: "matched",
    productId: 1,
    referenceUnitPriceCents,
    issuingPackQty: packs.issuing,
    referencePackQty: packs.reference,
  };
}

// Answers by reference, and only for Dentaltix: a lookup asked for another supplier finds nothing.
function fakeLookup(answers: Record<string, PriceLookupResult>): PriceLookup {
  return async (supplier, reference) =>
    (supplier === "Dentaltix" && answers[reference]) || {
      outcome: "unknownReference",
    };
}

function dentaltixInvoice(...lines: InvoiceLine[]) {
  return { supplier: "Dentaltix" as const, lines };
}

describe("simulate", () => {
  // Catches: the saving computed on one unit, or on the line amount against the unit price.
  it("compares a matched line and counts its saving", async () => {
    const simulation = await simulate(
      [dentaltixInvoice(line("DTX-1", 3, 1200))],
      fakeLookup({ "DTX-1": matched(1000) }),
      settings,
    );

    expect(simulation.lines.map((l) => [l.state, l.savingCents])).toEqual([
      ["compared", 600],
    ]);
    expect(simulation.totals).toMatchObject({
      paidCents: 3600,
      withCspCents: 3000,
      savingCents: 600,
    });
  });

  // Catches: an unmatched line counted in the paid total, or a guessed price for an ambiguous one.
  it("leaves unknown, ambiguous and reference-absent lines to study, outside the totals", async () => {
    const simulation = await simulate(
      [
        dentaltixInvoice(
          line("DTX-1", 1, 1000),
          line("UNKNOWN", 2, 5000),
          line("TWICE", 1, 7000),
          line("NO-DOCTOR-AI", 1, 9000),
        ),
      ],
      fakeLookup({
        "DTX-1": matched(900),
        TWICE: { outcome: "ambiguous" },
        "NO-DOCTOR-AI": { outcome: "absentAtReference" },
      }),
      settings,
    );

    expect(simulation.lines.map((l) => l.state)).toEqual([
      "compared",
      "toStudy",
      "toStudy",
      "toStudy",
    ]);
    expect(simulation.totals).toMatchObject({
      paidCents: 1000,
      withCspCents: 900,
      savingCents: 100,
      productLines: 4,
      comparedLines: 1,
      toStudyLines: 3,
    });
  });

  // Catches: a dearer reference counted as a negative saving, or an equal price taken out of the comparison.
  it("shows a line already cheaper at the supplier outside the totals", async () => {
    const simulation = await simulate(
      [
        dentaltixInvoice(
          line("DEARER", 2, 1000),
          line("SAME", 1, 800),
          line("DTX-1", 1, 1000),
        ),
      ],
      fakeLookup({
        DEARER: matched(1200),
        SAME: matched(800),
        "DTX-1": matched(900),
      }),
      settings,
    );

    expect(simulation.lines.map((l) => [l.state, l.savingCents])).toEqual([
      ["alreadyCheaper", undefined],
      ["compared", 0],
      ["compared", 100],
    ]);
    expect(simulation.totals).toMatchObject({
      paidCents: 1800,
      savingCents: 100,
      comparedLines: 2,
      alreadyCheaperLines: 1,
    });
  });

  // Catches: the threshold read as "at or above", a held-back line kept in the total,
  // or a threshold fixed in the code instead of taken from the settings.
  it("holds back for an advisor a saving above the threshold", async () => {
    const invoices = [
      dentaltixInvoice(line("HALF", 1, 1000), line("OVER-HALF", 2, 1001)),
    ];
    const lookup = fakeLookup({
      HALF: matched(500),
      "OVER-HALF": matched(500),
    });

    const simulation = await simulate(invoices, lookup, settings);
    const raised = await simulate(invoices, lookup, {
      suspiciousSavingPercent: 60,
    });

    expect(simulation.lines.map((l) => l.state)).toEqual([
      "compared",
      "advisorCheck",
    ]);
    expect(simulation.totals).toMatchObject({
      paidCents: 1000,
      savingCents: 500,
      comparedLines: 1,
    });
    expect(raised.lines.map((l) => l.state)).toEqual(["compared", "compared"]);
  });

  // Catches: differing pack sizes compared as if they were the same product, the check
  // run when one size is unknown, or "already cheaper" winning over the advisor.
  it("holds back for an advisor a line whose pack sizes differ", async () => {
    const simulation = await simulate(
      [
        dentaltixInvoice(
          line("BOX-OF-10", 1, 1000),
          line("DEARER-BOX", 1, 1000),
          line("SAME-BOX", 1, 1000),
          line("UNKNOWN-BOX", 1, 1000),
        ),
      ],
      fakeLookup({
        "BOX-OF-10": matched(900, { issuing: 10, reference: 1 }),
        "DEARER-BOX": matched(1500, { issuing: 1, reference: 10 }),
        "SAME-BOX": matched(900, { issuing: 10, reference: 10 }),
        "UNKNOWN-BOX": matched(900, { issuing: 10 }),
      }),
      settings,
    );

    expect(simulation.lines.map((l) => l.state)).toEqual([
      "advisorCheck",
      "advisorCheck",
      "compared",
      "compared",
    ]);
  });

  // Catches: the covered share taken over the compared lines alone, or leaving out a line
  // to study, already cheaper or held back for an advisor from the spending it covers.
  it("totals the paid amount of every product line, compared or not", async () => {
    const simulation = await simulate(
      [
        dentaltixInvoice(
          line("DTX-1", 3, 1200),
          line("UNKNOWN", 2, 5000),
          line("DEARER", 1, 800),
          line("OVER-HALF", 1, 1000),
        ),
      ],
      fakeLookup({
        "DTX-1": matched(1000),
        DEARER: matched(900),
        "OVER-HALF": matched(100),
      }),
      settings,
    );

    expect(simulation.lines.map((l) => l.state)).toEqual([
      "compared",
      "toStudy",
      "alreadyCheaper",
      "advisorCheck",
    ]);
    expect(simulation.totals).toMatchObject({
      paidCents: 3600,
      productsPaidCents: 15400,
    });
  });

  // Catches: every line looked up at the first invoice's supplier, or a second invoice left out.
  it("looks up each line at the supplier of its own invoice", async () => {
    const simulation = await simulate(
      [
        { supplier: "Megadental", lines: [line("DTX-1", 1, 1000)] },
        dentaltixInvoice(line("DTX-1", 1, 1000)),
      ],
      fakeLookup({ "DTX-1": matched(900) }),
      settings,
    );

    expect(simulation.lines.map((l) => [l.supplier, l.state])).toEqual([
      ["Megadental", "toStudy"],
      ["Dentaltix", "compared"],
    ]);
  });
});
