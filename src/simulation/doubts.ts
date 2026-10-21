import type { InvoiceLine } from "@/invoice-reading/invoice-line";
import type { ReadInvoice, TaxBasis } from "@/invoice-reading/read-invoice";

export type LineDoubt =
  { reason: "amountMismatch"; computedCents: number } | { reason: "noVatRate" };

export type CheckedInvoice = Pick<
  Extract<ReadInvoice, { status: "read" }>,
  "taxBasis" | "lines" | "otherChargesCents" | "totalCents"
>;

export function findDoubts(invoice: CheckedInvoice) {
  return {
    lines: invoice.lines.map((line) => lineDoubts(line, invoice.taxBasis)),
    total: totalDoubt(invoice),
  };
}

export function needsVerification(invoices: CheckedInvoice[]) {
  return invoices.some((invoice) => {
    const doubts = findDoubts(invoice);
    return (
      doubts.total !== undefined || doubts.lines.some((line) => line.length > 0)
    );
  });
}

function lineDoubts(line: InvoiceLine, taxBasis: TaxBasis) {
  const doubts: LineDoubt[] = [];
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

function totalDoubt({ lines, otherChargesCents, totalCents }: CheckedInvoice) {
  const addedUpCents =
    lines.reduce((sum, line) => sum + line.amountCents, 0) + otherChargesCents;
  // Each line amount may be rounded to the cent on its own.
  if (Math.abs(addedUpCents - totalCents) <= lines.length) return undefined;
  return { addedUpCents, totalCents };
}
