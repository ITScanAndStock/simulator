"use server";

import { notFound, redirect } from "next/navigation";
import { coompyPriceLookup } from "@/price-lookup/coompy";
import { simulate } from "@/simulation/simulate";
import { findReadInvoices, storeSimulation } from "./invoices";
import { coompySettings, suspiciousSavingPercent } from "./settings";
import { simulationExists } from "./simulations";

export async function computeSaving(
  simulationId: string,
  invoiceIds: string[],
) {
  if (
    !Array.isArray(invoiceIds) ||
    !invoiceIds.every((id) => typeof id === "string") ||
    !(await simulationExists(simulationId))
  ) {
    notFound();
  }
  const invoices = await findReadInvoices(simulationId, invoiceIds);
  if (invoices.length === 0) redirect(`/simulations/${simulationId}/factures`);
  const simulation = await simulate(
    invoices,
    coompyPriceLookup(coompySettings()),
    { suspiciousSavingPercent: suspiciousSavingPercent() },
  );
  await storeSimulation(
    simulationId,
    invoices.flatMap((invoice) => invoice.positions),
    simulation,
  );
  redirect(`/simulations/${simulationId}/resultat`);
}
