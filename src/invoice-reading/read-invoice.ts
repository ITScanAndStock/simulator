import { isDoctorAiInvoice, readDoctorAiInvoice } from "./doctor-ai";
import { readPdfRows } from "./pdf-rows";

export type InvoiceLine = {
  reference: string;
  designation: string;
  quantity: number;
  unitPriceCents: number;
  amountCents: number;
  vatRate: number | undefined;
};

export type ReadInvoice =
  | {
      status: "read";
      supplier: "DoctorAI";
      lines: InvoiceLine[];
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
      ...readDoctorAiInvoice(pages),
    };
  } catch {
    return { status: "unreadable" };
  }
}
