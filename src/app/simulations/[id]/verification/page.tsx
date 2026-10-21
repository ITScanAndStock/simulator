import { notFound, redirect } from "next/navigation";
import { VerificationScreen } from "@/components/verification-screen";
import { findListedInvoices } from "@/server/invoices";
import { simulationExists } from "@/server/simulations";
import { linesToVerify } from "@/simulation/doubts";

export default async function Verification({
  params,
}: PageProps<"/simulations/[id]/verification">) {
  const { id } = await params;
  if (!(await simulationExists(id))) notFound();
  const invoices = await findListedInvoices(id);
  if (invoices.length === 0) redirect(`/simulations/${id}/factures`);
  const verification = linesToVerify(invoices);
  if (verification.lines.length === 0) redirect(`/simulations/${id}/resultat`);

  return (
    <VerificationScreen
      simulationId={id}
      invoiceCount={invoices.length}
      readLines={verification.readLines}
      doubtfulLines={verification.doubtfulLines}
      totals={verification.totals.map(({ invoice, doubt }) => ({
        key: invoice.id,
        ...doubt,
      }))}
      lines={verification.lines.map(({ line, doubts }) => ({
        ...line,
        key: `${line.invoiceId}-${line.position}`,
        doubts,
      }))}
    />
  );
}
