import type { InvoiceLine, UnsureField } from "@/invoice-reading/invoice-line";
import type { ReadInvoice, TaxBasis } from "@/invoice-reading/read-invoice";

export type LineDoubt =
  | { reason: "amountMismatch"; computedCents: number }
  | { reason: "noVatRate" }
  | { reason: "unsureReading"; field: UnsureField }
  | { reason: "confusableReference"; proposedReference: string };

export type CheckedLine = InvoiceLine & { proposedReference?: string };

export type TotalDoubt = { addedUpCents: number; totalCents: number };

export type CheckedInvoice = Pick<
  Extract<ReadInvoice, { status: "read" }>,
  "taxBasis" | "otherChargesCents" | "totalCents"
> & { lines: CheckedLine[] };

export function findDoubts(invoice: CheckedInvoice) {
  return {
    lines: invoice.lines.map((line) => lineDoubts(line, invoice.taxBasis)),
    total: totalDoubt(invoice),
  };
}

export function needsVerification(invoices: CheckedInvoice[]) {
  return invoices.some((invoice) => hasDoubts(findDoubts(invoice)));
}

export function linesToVerify<I extends CheckedInvoice>(invoices: I[]) {
  const lines: { line: I["lines"][number]; doubts: LineDoubt[] }[] = [];
  const totals: { invoice: I; doubt: TotalDoubt }[] = [];
  for (const invoice of invoices) {
    const doubts = findDoubts(invoice);
    if (!hasDoubts(doubts)) continue;
    if (doubts.total) totals.push({ invoice, doubt: doubts.total });
    for (const [index, line] of invoice.lines.entries()) {
      // A total that does not add up may come from any line of its invoice.
      if (doubts.total || doubts.lines[index].length > 0) {
        lines.push({ line, doubts: doubts.lines[index] });
      }
    }
  }
  return {
    lines,
    totals,
    readLines: invoices.reduce((sum, invoice) => sum + invoice.lines.length, 0),
    doubtfulLines: lines.filter(({ doubts }) => doubts.length > 0).length,
  };
}

function hasDoubts(doubts: ReturnType<typeof findDoubts>) {
  return (
    doubts.total !== undefined || doubts.lines.some((line) => line.length > 0)
  );
}

function lineDoubts(line: CheckedLine, taxBasis: TaxBasis) {
  const doubts: LineDoubt[] = line.unsure.map((field) => ({
    reason: "unsureReading",
    field,
  }));
  if (line.proposedReference !== undefined) {
    doubts.push({
      reason: "confusableReference",
      proposedReference: line.proposedReference,
    });
  }
  const computedCents = line.quantity * line.unitPriceCents;
  // A unit price rounded to the cent may be off by half a cent on each unit.
  if (2 * Math.abs(computedCents - line.amountCents) > line.quantity) {
    doubts.push({ reason: "amountMismatch", computedCents });
  }
  if (taxBasis === "exclusive" && line.vatRate === undefined) {
    doubts.push({ reason: "noVatRate" });
  }
  return doubts;
}

function totalDoubt({
  lines,
  otherChargesCents,
  totalCents,
}: CheckedInvoice): TotalDoubt | undefined {
  const addedUpCents =
    lines.reduce((sum, line) => sum + line.amountCents, 0) + otherChargesCents;
  // Each line amount may be rounded to the cent on its own.
  if (Math.abs(addedUpCents - totalCents) <= lines.length) return undefined;
  return { addedUpCents, totalCents };
}
