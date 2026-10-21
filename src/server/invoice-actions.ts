"use server";

import { notFound } from "next/navigation";
import { readInvoice } from "@/invoice-reading/read-invoice";
import type { InvoiceUploadResult } from "@/invoice-upload";
import { storeReadInvoice } from "./invoices";
import { simulationExists } from "./simulations";

export async function readUploadedInvoice(
  simulationId: string,
  formData: FormData,
): Promise<InvoiceUploadResult> {
  if (!(formData instanceof FormData)) notFound();
  const file = formData.get("invoice");
  if (!(file instanceof File) || !(await simulationExists(simulationId))) {
    notFound();
  }
  const read = await readInvoice(new Uint8Array(await file.arrayBuffer()));
  if (read.status !== "read") return { read: false };
  const invoiceId = await storeReadInvoice(simulationId, read);
  return { read: true, invoiceId, lineCount: read.lines.length };
}
