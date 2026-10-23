"use server";

import { notFound, redirect } from "next/navigation";
import { maxInvoices } from "@/invoice-upload";
import {
  hasControlCharacter,
  lineKey,
  maxDesignationLength,
  parseLineFields,
  type LineFieldErrors,
  type LineFields,
} from "@/line-fields";
import {
  PricesUnavailable,
  unavailableOnFailure,
} from "@/price-lookup/price-lookup";
import { needsVerification } from "@/simulation/doubts";
import { simulate } from "@/simulation/simulate";
import {
  clearCorrections,
  findListedInvoices,
  markListedInvoices,
  storeCorrections,
  storeSimulation,
  type Corrections,
  type StoredInvoice,
} from "./invoices";
import { priceLookup } from "./price-lookup";
import { suspiciousSavingPercent } from "./settings";
import { simulationExists } from "./simulations";

export type LinesSubmission = {
  lines: (LineFields & {
    invoiceId: string;
    position: number;
    removed: boolean;
    changed: boolean;
  })[];
  added: (LineFields & {
    key: string;
    invoiceId: string;
    designation: string;
  })[];
};

export type LinesRefusal = { errors: Record<string, LineFieldErrors> };

const maxReadLines = maxInvoices * 1000;
const maxAddedLines = 20;
const maxFieldLength = 100;

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
  // Corrections made on an earlier visit to screen 4 would count unseen.
  await clearCorrections(simulationId);
  return computeSaving(
    simulationId,
    await listedInvoicesOrRedirect(simulationId),
  );
}

export async function validateLines(
  simulationId: string,
  submission: LinesSubmission,
): Promise<LinesRefusal> {
  if (!isSubmission(submission) || !(await simulationExists(simulationId))) {
    notFound();
  }
  const invoices = await listedInvoicesOrRedirect(simulationId);
  const readLines = new Map(
    invoices.flatMap((invoice) =>
      invoice.lines.map((line) => [lineKey(line), line] as const),
    ),
  );
  const invoiceIds = new Set(invoices.map((invoice) => invoice.id));
  const errors: Record<string, LineFieldErrors> = {};
  const corrections: Corrections = { lines: [], added: [] };
  for (const submitted of submission.lines) {
    const read = readLines.get(lineKey(submitted));
    if (!read) notFound();
    if (submitted.removed) {
      corrections.lines.push({ ...read, removed: true, correction: undefined });
      continue;
    }
    if (!submitted.changed) {
      corrections.lines.push({
        ...read,
        removed: false,
        correction: read.correction,
      });
      continue;
    }
    const parsed = parseLineFields(submitted);
    if ("errors" in parsed) {
      errors[lineKey(submitted)] = parsed.errors;
      continue;
    }
    const { correction } = parsed;
    const unchanged =
      correction.reference === read.reference &&
      correction.quantity === read.quantity &&
      correction.unitPriceCents === read.unitPriceCents;
    corrections.lines.push({
      ...read,
      removed: false,
      correction: unchanged ? undefined : correction,
    });
  }
  for (const submitted of submission.added) {
    if (!invoiceIds.has(submitted.invoiceId)) notFound();
    const parsed = parseLineFields(submitted);
    if ("errors" in parsed) {
      errors[submitted.key] = parsed.errors;
      continue;
    }
    corrections.added.push({
      ...parsed.correction,
      invoiceId: submitted.invoiceId,
      designation: submitted.designation.trim(),
    });
  }
  if (Object.keys(errors).length > 0) return { errors };
  await storeCorrections(simulationId, corrections);
  return computeSaving(
    simulationId,
    await listedInvoicesOrRedirect(simulationId),
  );
}

export async function skipVerification(simulationId: string) {
  if (!(await simulationExists(simulationId))) notFound();
  await clearCorrections(simulationId);
  await computeSaving(
    simulationId,
    await listedInvoicesOrRedirect(simulationId),
  );
}

export async function retrySaving(simulationId: string) {
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

async function computeSaving(
  simulationId: string,
  invoices: StoredInvoice[],
): Promise<never> {
  let simulation;
  try {
    simulation = await simulate(
      invoices.map((invoice) => ({
        ...invoice,
        lines: [...invoice.lines, ...invoice.addedLines],
      })),
      // Asked by the implant volume question (ticket 24); until then no rebate.
      unavailableOnFailure(priceLookup({ implantsPerYear: undefined })),
      { suspiciousSavingPercent: suspiciousSavingPercent() },
    );
  } catch (error) {
    if (!(error instanceof PricesUnavailable)) throw error;
    console.error(error);
    redirect(`/simulations/${simulationId}/tarifs-indisponibles`);
  }
  await storeSimulation(simulationId, simulation);
  redirect(`/simulations/${simulationId}/resultat`);
}

// Bound arguments come from the browser as any JSON value, whatever their type says.
function isSubmission(value: unknown): value is LinesSubmission {
  if (typeof value !== "object" || value === null) return false;
  const { lines, added } = value as Record<string, unknown>;
  return (
    Array.isArray(lines) &&
    lines.length <= maxReadLines &&
    lines.every(
      (line) =>
        hasLineFields(line) &&
        typeof line.invoiceId === "string" &&
        Number.isSafeInteger(line.position) &&
        typeof line.removed === "boolean" &&
        typeof line.changed === "boolean",
    ) &&
    Array.isArray(added) &&
    added.length <= maxAddedLines &&
    added.every(
      (line) =>
        hasLineFields(line) &&
        typeof line.key === "string" &&
        typeof line.invoiceId === "string" &&
        typeof line.designation === "string" &&
        line.designation.length <= maxDesignationLength &&
        !hasControlCharacter(line.designation),
    )
  );
}

function hasLineFields(value: unknown): value is Record<string, unknown> {
  if (typeof value !== "object" || value === null) return false;
  const { reference, quantity, unitPrice } = value as Record<string, unknown>;
  return [reference, quantity, unitPrice].every(
    (field) => typeof field === "string" && field.length <= maxFieldLength,
  );
}
