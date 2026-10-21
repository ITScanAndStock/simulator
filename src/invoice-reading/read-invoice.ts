import { isDoctorAiInvoice, readDoctorAiInvoice } from "./doctor-ai";
import type { InvoiceLine } from "./invoice-line";
import { readPdfRows } from "./pdf-rows";

export type TaxBasis = "inclusive" | "exclusive";

// The total and the line amounts are on the tax basis of the line prices.
export type ReadInvoice =
  | {
      status: "read";
      supplier: "DoctorAI";
      taxBasis: TaxBasis;
      lines: InvoiceLine[];
      otherChargesCents: number;
      totalCents: number;
    }
  | { status: "unsupported" }
  | { status: "unreadable" };

export async function readInvoice(bytes: Uint8Array): Promise<ReadInvoice> {
  try {
    const pages = await readPdfRows(bytes);
    if (!isDoctorAiInvoice(pages)) return { status: "unsupported" };
    return {
      status: "read",
      supplier: "DoctorAI",
      taxBasis: "inclusive",
      ...readDoctorAiInvoice(pages),
      otherChargesCents: 0,
    };
  } catch {
    return { status: "unreadable" };
  }
}
