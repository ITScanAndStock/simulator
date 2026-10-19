import { notFound } from "next/navigation";
import { ContactDetailsForm } from "@/components/contact-details-form";
import { SimulationScreen } from "@/components/simulation-screen";
import { findContactDetails } from "@/server/simulations";

export default async function StoredContactDetails({
  params,
}: PageProps<"/simulations/[id]/coordonnees">) {
  const { id } = await params;
  const stored = await findContactDetails(id);
  if (!stored) notFound();

  return (
    <SimulationScreen step={1}>
      <ContactDetailsForm simulationId={id} stored={stored} />
    </SimulationScreen>
  );
}
