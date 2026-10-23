"use server";

import { notFound } from "next/navigation";
import { readInvoice, type ReadInvoice } from "@/invoice-reading/read-invoice";
import type { InvoiceUploadResult } from "@/invoice-upload";
import { proposeReferences } from "@/simulation/confusable-reference";
import { needsVerification } from "@/simulation/doubts";
import { storeReadInvoice } from "./invoices";
import { priceLookup } from "./price-lookup";
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
  // Only recognition confuses characters.
  const checked = read.recognised
    ? { ...read, lines: await withProposals(read) }
    : read;
  const invoiceId = await storeReadInvoice(simulationId, checked);
  return {
    read: true,
    invoiceId,
    lineCount: checked.lines.length,
    toVerify: needsVerification([checked]),
  };
}

// Without the price lookup no reference is proposed: the computation then finds it out of reach, or the
// line as read.
async function withProposals(
  invoice: Extract<ReadInvoice, { status: "read" }>,
) {
  try {
    return await proposeReferences(
      priceLookup({ implantsPerYear: undefined }),
      invoice.supplier,
      invoice.lines,
    );
  } catch (error) {
    console.error(error);
    return invoice.lines;
  }
}
