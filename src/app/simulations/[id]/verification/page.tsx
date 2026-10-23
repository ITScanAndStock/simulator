import { notFound, redirect } from "next/navigation";
import type { ReadLineView } from "@/components/lines-form";
import { VerificationScreen } from "@/components/verification-screen";
import { amount } from "@/format";
import { lineKey as key } from "@/line-fields";
import { findListedInvoices, type StoredLine } from "@/server/invoices";
import { simulationExists } from "@/server/simulations";
import { linesToVerify } from "@/simulation/doubts";
import { supplierNames } from "@/supplier";

function fields(line: StoredLine) {
  const shown = line.correction ?? line;
  return {
    reference: shown.reference,
    quantity: String(shown.quantity),
    unitPrice: amount(shown.unitPriceCents),
  };
}

export default async function Verification({
  params,
}: PageProps<"/simulations/[id]/verification">) {
  const { id } = await params;
  if (!(await simulationExists(id))) notFound();
  const invoices = await findListedInvoices(id);
  if (invoices.length === 0) redirect(`/simulations/${id}/factures`);
  const verification = linesToVerify(invoices);
  if (verification.lines.length === 0) redirect(`/simulations/${id}/resultat`);
  const toVerify = new Map(
    verification.lines.map(({ line, doubts }) => [key(line), doubts]),
  );

  const lines: ReadLineView[] = invoices.flatMap((invoice) =>
    invoice.lines.map((line) => ({
      ...fields(line),
      key: key(line),
      invoiceId: line.invoiceId,
      position: line.position,
      designation: line.designation,
      removed: line.removed ?? false,
      shown: toVerify.has(key(line)),
      read: {
        reference: line.reference,
        quantity: line.quantity,
        unitPriceCents: line.unitPriceCents,
        amountCents: line.amountCents,
      },
      doubts: toVerify.get(key(line)) ?? [],
    })),
  );

  return (
    <VerificationScreen
      simulationId={id}
      readLines={verification.readLines}
      doubtfulLines={verification.doubtfulLines}
      totals={verification.totals.map(({ invoice, doubt }) => ({
        key: invoice.id,
        ...doubt,
      }))}
      invoices={invoices.map((invoice, index) => ({
        id: invoice.id,
        label: `Facture ${index + 1} · ${supplierNames[invoice.supplier]}`,
      }))}
      lines={lines}
      added={invoices.flatMap((invoice) =>
        invoice.addedLines.map((line) => ({
          ...fields(line),
          key: key(line),
          invoiceId: line.invoiceId,
          designation: line.designation,
        })),
      )}
    />
  );
}
