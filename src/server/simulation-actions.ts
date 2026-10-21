"use server";

import { notFound, redirect } from "next/navigation";
import { maxInvoices } from "@/invoice-upload";
import { coompyPriceLookup } from "@/price-lookup/coompy";
import { needsVerification } from "@/simulation/doubts";
import { simulate } from "@/simulation/simulate";
import {
  findListedInvoices,
  markListedInvoices,
  storeSimulation,
  type StoredInvoice,
} from "./invoices";
import { coompySettings, suspiciousSavingPercent } from "./settings";
import { simulationExists } from "./simulations";

export async function checkLines(simulationId: string, invoiceIds: string[]) {
  if (
    !Array.isArray(invoiceIds) ||
    invoiceIds.length > maxInvoices ||
    !invoiceIds.every((id) => typeof id === "string") ||
    !(await simulationExists(simulationId))
  ) {
    notFound();
  }
  await markListedInvoices(simulationId, invoiceIds);
  const invoices = await listedInvoicesOrRedirect(simulationId);
  if (needsVerification(invoices)) {
    redirect(`/simulations/${simulationId}/verification`);
  }
  await computeSaving(simulationId, invoices);
}

export async function skipVerification(simulationId: string) {
  if (!(await simulationExists(simulationId))) notFound();
  await computeSaving(
    simulationId,
    await listedInvoicesOrRedirect(simulationId),
  );
}

async function listedInvoicesOrRedirect(simulationId: string) {
  const invoices = await findListedInvoices(simulationId);
  if (invoices.length === 0) redirect(`/simulations/${simulationId}/factures`);
  return invoices;
}

async function computeSaving(simulationId: string, invoices: StoredInvoice[]) {
  const simulation = await simulate(
    invoices,
    coompyPriceLookup(coompySettings()),
    { suspiciousSavingPercent: suspiciousSavingPercent() },
  );
  await storeSimulation(simulationId, simulation);
  redirect(`/simulations/${simulationId}/resultat`);
}
