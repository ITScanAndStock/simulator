import Link from "next/link";
import { notFound } from "next/navigation";
import { RetrySavingButton } from "@/components/retry-saving-button";
import { StatePage } from "@/components/state-page";
import { calendlyUrl } from "@/server/settings";
import { retrySaving } from "@/server/simulation-actions";
import { simulationExists } from "@/server/simulations";

export default async function UnavailablePrices({
  params,
}: PageProps<"/simulations/[id]/tarifs-indisponibles">) {
  const { id } = await params;
  if (!(await simulationExists(id))) notFound();

  return (
    <StatePage
      tone="warning"
      title="Votre simulation est enregistrée"
      message="Les tarifs Club Santé Premium ne répondent pas pour le moment. Vos factures et vos corrections sont gardées : réessayez dans quelques minutes."
      actions={
        <>
          <form action={retrySaving.bind(null, id)}>
            <RetrySavingButton />
          </form>
          <a href={calendlyUrl()} className="secondary-button">
            Prendre rendez-vous avec un conseiller
          </a>
          <Link href="/" className="secondary-button">
            Retour à l&apos;accueil
          </Link>
        </>
      }
    />
  );
}
