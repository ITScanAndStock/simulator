import { describe, expect, it } from "vitest";
import type { InvoiceLine } from "@/invoice-reading/invoice-line";
import { findDoubts, needsVerification, type CheckedInvoice } from "./doubts";

function line(
  quantity: number,
  unitPriceCents: number,
  amountCents: number,
): InvoiceLine {
  return {
    reference: "REF",
    designation: "Produit",
    quantity,
    unitPriceCents,
    amountCents,
    vatRate: 20,
  };
}

function invoice(
  lines: InvoiceLine[],
  overrides: Partial<CheckedInvoice> = {},
): CheckedInvoice {
  const otherChargesCents = overrides.otherChargesCents ?? 0;
  const linesCents = lines.reduce((sum, line) => sum + line.amountCents, 0);
  return {
    taxBasis: "inclusive",
    lines,
    otherChargesCents,
    totalCents: linesCents + otherChargesCents,
    ...overrides,
  };
}

describe("findDoubts", () => {
  // Catches: a misread quantity let through, a unit price rounded to the cent taken for a
  // misreading, or a tolerance wider than half a cent per unit.
  it("doubts a line whose quantity times unit price does not give its amount", () => {
    const doubts = findDoubts(
      invoice([
        line(3, 891, 2673),
        line(2, 891, 2673),
        line(3, 333, 1000),
        line(1, 333, 334),
        line(3, 333, 1001),
      ]),
    );

    expect(doubts.lines).toEqual([
      [],
      [{ reason: "amountMismatch", computedCents: 1782 }],
      [],
      [{ reason: "amountMismatch", computedCents: 333 }],
      [{ reason: "amountMismatch", computedCents: 999 }],
    ]);
  });

  // Catches: shipping left out of the check, a missed line let through, or a tolerance
  // wider than a cent per line.
  it("doubts an invoice whose lines and charges do not add up to its total", () => {
    const lines = [line(1, 2400, 2400), line(3, 891, 2673)];

    const withShipping = findDoubts(
      invoice(lines, { otherChargesCents: 590, totalCents: 5663 }),
    );
    const lineMissed = findDoubts(invoice(lines, { totalCents: 9073 }));
    const roundedPerLine = findDoubts(invoice(lines, { totalCents: 5075 }));
    const offByMore = findDoubts(invoice(lines, { totalCents: 5076 }));
    const threeLines = findDoubts(
      invoice([...lines, line(1, 450, 450)], { totalCents: 5526 }),
    );

    expect(withShipping.total).toBeUndefined();
    expect(lineMissed.total).toEqual({ addedUpCents: 5073, totalCents: 9073 });
    expect(roundedPerLine.total).toBeUndefined();
    expect(offByMore.total).toEqual({ addedUpCents: 5073, totalCents: 5076 });
    expect(threeLines.total).toBeUndefined();
  });

  // Catches: a tax-exclusive line with no rate let through, or a tax-inclusive line
  // doubted for a rate it does not need.
  it("doubts a tax-exclusive line whose VAT rate could not be read", () => {
    const lines = [
      { ...line(1, 1000, 1000), vatRate: 5.5 },
      { ...line(1, 1000, 1000), vatRate: undefined },
    ];

    const exclusive = findDoubts(invoice(lines, { taxBasis: "exclusive" }));
    const inclusive = findDoubts(invoice(lines, { taxBasis: "inclusive" }));

    expect(exclusive.lines).toEqual([[], [{ reason: "noVatRate" }]]);
    expect(inclusive.lines).toEqual([[], []]);
  });

  // Catches: screen 4 shown for nothing, or skipped when only the invoice total is off.
  it("asks for verification only when a line or a total is doubtful", () => {
    const clean = invoice([line(3, 891, 2673)]);
    const lineOff = invoice([line(2, 891, 2673)]);
    const totalOff = invoice([line(3, 891, 2673)], { totalCents: 3000 });

    expect(needsVerification([clean, clean])).toBe(false);
    expect(needsVerification([clean, lineOff])).toBe(true);
    expect(needsVerification([totalOff, clean])).toBe(true);
  });
});
