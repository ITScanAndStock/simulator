import { notFound, redirect } from "next/navigation";
import { ResultScreen } from "@/components/result-screen";
import { findResult } from "@/server/invoices";
import { simulationExists } from "@/server/simulations";

export default async function Result({
  params,
}: PageProps<"/simulations/[id]/resultat">) {
  const { id } = await params;
  if (!(await simulationExists(id))) notFound();
  const result = await findResult(id);
  if (!result) redirect(`/simulations/${id}/factures`);

  return <ResultScreen result={result} />;
}
