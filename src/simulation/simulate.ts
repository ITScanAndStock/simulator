import type { InvoiceLine } from "@/invoice-reading/invoice-line";
import type {
  PriceLookup,
  PriceLookupResult,
} from "@/price-lookup/price-lookup";
import { isClearCorrect } from "@/straumann-group/agreement";
import { isStraumannGroupSupplier, type SupplierCode } from "@/supplier";

export type LineState =
  "compared" | "alreadyCheaper" | "toStudy" | "advisorCheck";

export type LineCorrection = {
  reference: string;
  quantity: number;
  unitPriceCents: number;
};

export type CorrectableLine = InvoiceLine & {
  correction?: LineCorrection;
  removed?: boolean;
};

export type SimulatedLine = InvoiceLine & {
  supplier: SupplierCode;
  state: LineState;
  referenceUnitPriceCents: number | undefined;
  savingCents: number | undefined;
};

export type Simulation<T extends CorrectableLine = CorrectableLine> = {
  lines: (T & SimulatedLine)[];
  totals: ReturnType<typeof totals>;
};

export async function simulate<T extends CorrectableLine>(
  invoices: { supplier: SupplierCode; lines: T[] }[],
  lookup: PriceLookup,
  settings: { suspiciousSavingPercent: number },
): Promise<Simulation<T>> {
  const lines: (T & SimulatedLine)[] = [];
  for (const invoice of invoices) {
    for (const read of invoice.lines) {
      if (read.removed) continue;
      const line = corrected(read);
      // ClearCorrect aligners are on hold: the agreement gives them no price list and no discount.
      const found: PriceLookupResult =
        isStraumannGroupSupplier(invoice.supplier) &&
        isClearCorrect(line.designation)
          ? { outcome: "unknownReference" }
          : await lookup(invoice.supplier, line.reference);
      lines.push({
        ...line,
        supplier: invoice.supplier,
        ...priced(line, found, settings),
      });
    }
  }
  return { lines, totals: totals(lines) };
}

function corrected<T extends CorrectableLine>(line: T): T {
  if (!line.correction) return line;
  const { reference, quantity, unitPriceCents } = line.correction;
  return {
    ...line,
    reference,
    quantity,
    unitPriceCents,
    amountCents: quantity * unitPriceCents,
  };
}

function priced(
  line: InvoiceLine,
  found: PriceLookupResult,
  settings: { suspiciousSavingPercent: number },
) {
  if (found.outcome === "agreement")
    return pricedAtAgreement(line, found, settings);
  if (found.outcome !== "matched") {
    return {
      state: "toStudy" as const,
      referenceUnitPriceCents: undefined,
      savingCents: undefined,
    };
  }
  const referenceUnitPriceCents = found.referenceUnitPriceCents;
  const packSizesDiffer =
    found.issuingPackQty !== undefined &&
    found.referencePackQty !== undefined &&
    found.issuingPackQty !== found.referencePackQty;
  if (packSizesDiffer) {
    return {
      state: "advisorCheck" as const,
      referenceUnitPriceCents,
      savingCents: undefined,
    };
  }
  if (referenceUnitPriceCents > line.unitPriceCents) {
    return {
      state: "alreadyCheaper" as const,
      referenceUnitPriceCents,
      savingCents: undefined,
    };
  }
  return bySaving(
    line,
    referenceUnitPriceCents,
    line.unitPriceCents - referenceUnitPriceCents,
    settings,
  );
}

// The price paid is kept when already below the CSP price; the year-end rebate comes on top.
function pricedAtAgreement(
  line: InvoiceLine,
  found: Extract<PriceLookupResult, { outcome: "agreement" }>,
  settings: { suspiciousSavingPercent: number },
) {
  const referenceUnitPriceCents = found.cspUnitPriceCents;
  const unitSavingCents =
    Math.max(line.unitPriceCents - referenceUnitPriceCents, 0) +
    found.rebateUnitCents;
  if (unitSavingCents === 0) {
    return {
      state: "alreadyCheaper" as const,
      referenceUnitPriceCents,
      savingCents: undefined,
    };
  }
  return bySaving(line, referenceUnitPriceCents, unitSavingCents, settings);
}

function bySaving(
  line: InvoiceLine,
  referenceUnitPriceCents: number,
  unitSavingCents: number,
  settings: { suspiciousSavingPercent: number },
) {
  if (
    unitSavingCents * 100 >
    settings.suspiciousSavingPercent * line.unitPriceCents
  ) {
    return {
      state: "advisorCheck" as const,
      referenceUnitPriceCents,
      savingCents: undefined,
    };
  }
  return {
    state: "compared" as const,
    referenceUnitPriceCents,
    savingCents: unitSavingCents * line.quantity,
  };
}

function totals(lines: SimulatedLine[]) {
  const compared = lines.filter((l) => l.state === "compared");
  const paid = (some: SimulatedLine[]) =>
    some.reduce((sum, l) => sum + l.unitPriceCents * l.quantity, 0);
  const paidCents = paid(compared);
  const savingCents = compared.reduce(
    (sum, l) => sum + (l.savingCents ?? 0),
    0,
  );
  const count = (state: LineState) =>
    lines.filter((l) => l.state === state).length;
  return {
    paidCents,
    productsPaidCents: paid(lines),
    withCspCents: paidCents - savingCents,
    savingCents,
    productLines: lines.length,
    comparedLines: compared.length,
    toStudyLines: count("toStudy"),
    alreadyCheaperLines: count("alreadyCheaper"),
  };
}
