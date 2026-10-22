import { notFound, redirect } from "next/navigation";
import { ResultScreen } from "@/components/result-screen";
import { findResult } from "@/server/invoices";
import {
  averageSavingEuros,
  calendlyUrl,
  referenceSupplier,
} from "@/server/settings";
import { findContactDetails } from "@/server/simulations";

export default async function Result({
  params,
}: PageProps<"/simulations/[id]/resultat">) {
  const { id } = await params;
  const contactDetails = await findContactDetails(id);
  if (!contactDetails) notFound();
  const result = await findResult(id);
  if (!result) redirect(`/simulations/${id}/factures`);

  return (
    <ResultScreen
      result={result}
      scanAndStockUser={contactDetails.scanAndStockUser}
      averageSavingEuros={averageSavingEuros()}
      calendlyUrl={calendlyUrl()}
      referenceSupplier={referenceSupplier()}
    />
  );
}
