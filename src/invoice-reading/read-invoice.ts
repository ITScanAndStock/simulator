import { isDoctorAiInvoice, readDoctorAiInvoice } from "./doctor-ai";
import type { InvoiceLine } from "./invoice-line";
import { readPdfRows, renderPdfPages } from "./pdf-rows";
import { isImage, recognisePages } from "./recognition";

export type TaxBasis = "inclusive" | "exclusive";

// The total and the line amounts are on the tax basis of the line prices.
export type ReadInvoice =
  | {
      status: "read";
      supplier: "DoctorAI";
      recognised: boolean;
      taxBasis: TaxBasis;
      lines: InvoiceLine[];
      otherChargesCents: number;
      totalCents: number;
    }
  | { status: "unsupported" }
  | { status: "unreadable" };

export async function readInvoice(bytes: Uint8Array): Promise<ReadInvoice> {
  try {
    const { pages, recognised } = await readPages(bytes);
    if (!isDoctorAiInvoice(pages)) return { status: "unsupported" };
    return {
      status: "read",
      supplier: "DoctorAI",
      recognised,
      taxBasis: "inclusive",
      ...readDoctorAiInvoice(pages),
      otherChargesCents: 0,
    };
  } catch {
    return { status: "unreadable" };
  }
}

// A scanned PDF has no text layer: its pages are read like images.
async function readPages(bytes: Uint8Array) {
  if (isImage(bytes)) {
    return { pages: await recognisePages([bytes]), recognised: true };
  }
  const pages = await readPdfRows(bytes);
  if (pages.some((page) => page.length > 0)) {
    return { pages, recognised: false };
  }
  const images = await renderPdfPages(bytes);
  return { pages: await recognisePages(images), recognised: true };
}
