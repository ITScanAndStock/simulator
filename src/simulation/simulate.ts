import type { InvoiceLine } from "@/invoice-reading/invoice-line";
import type {
  PriceLookup,
  PriceLookupResult,
} from "@/price-lookup/price-lookup";
import type { SupplierCode } from "@/supplier";

export type LineState =
  "compared" | "alreadyCheaper" | "toStudy" | "advisorCheck";

export type SimulatedLine = InvoiceLine & {
  supplier: SupplierCode;
  state: LineState;
  referenceUnitPriceCents: number | undefined;
  savingCents: number | undefined;
};

export type Simulation = Awaited<ReturnType<typeof simulate>>;

export async function simulate(
  invoices: { supplier: SupplierCode; lines: InvoiceLine[] }[],
  lookup: PriceLookup,
  settings: { suspiciousSavingPercent: number },
) {
  const lines: SimulatedLine[] = [];
  for (const invoice of invoices) {
    for (const line of invoice.lines) {
      const found = await lookup(invoice.supplier, line.reference);
      lines.push({
        ...line,
        supplier: invoice.supplier,
        ...priced(line, found, settings),
      });
    }
  }
  return { lines, totals: totals(lines) };
}

function priced(
  line: InvoiceLine,
  found: PriceLookupResult,
  settings: { suspiciousSavingPercent: number },
) {
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
  const unitSavingCents = line.unitPriceCents - referenceUnitPriceCents;
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
  const paidCents = compared.reduce(
    (sum, l) => sum + l.unitPriceCents * l.quantity,
    0,
  );
  const savingCents = compared.reduce(
    (sum, l) => sum + (l.savingCents ?? 0),
    0,
  );
  const count = (state: LineState) =>
    lines.filter((l) => l.state === state).length;
  return {
    paidCents,
    withCspCents: paidCents - savingCents,
    savingCents,
    productLines: lines.length,
    comparedLines: compared.length,
    toStudyLines: count("toStudy"),
    alreadyCheaperLines: count("alreadyCheaper"),
  };
}
