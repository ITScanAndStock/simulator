import Link from "next/link";
import { notFound } from "next/navigation";
import { SimulationScreen } from "@/components/simulation-screen";
import { simulationExists } from "@/server/simulations";
import styles from "./page.module.css";

export default async function Invoices({
  params,
}: PageProps<"/simulations/[id]/factures">) {
  const { id } = await params;
  if (!(await simulationExists(id))) notFound();

  return (
    <SimulationScreen step={2}>
      <div className={styles.content}>
        <h1 className={styles.title}>Déposez vos factures</h1>
        <Link href={`/simulations/${id}/coordonnees`} className={styles.back}>
          Retour
        </Link>
      </div>
    </SimulationScreen>
  );
}
