"use server";

import { notFound } from "next/navigation";
import { readInvoice } from "@/invoice-reading/read-invoice";
import type { InvoiceUploadResult } from "@/invoice-upload";
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
  return read.status === "read"
    ? { read: true, lineCount: read.lines.length }
    : { read: false };
}
