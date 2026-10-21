import { notFound } from "next/navigation";
import { InvoiceDrop } from "@/components/invoice-drop";
import { SimulationScreen } from "@/components/simulation-screen";
import { maxInvoices } from "@/invoice-upload";
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
        <div className={styles.heading}>
          <h1 className={styles.title}>Déposez vos factures</h1>
          <p className={styles.lead}>
            Jusqu&apos;à {maxInvoices} factures de fournisseurs différents. Plus
            vous en déposez, plus l&apos;estimation reflète vos achats.
          </p>
          <p className={styles.note}>
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
              className={styles.noteIcon}
            >
              <circle cx="12" cy="12" r="9" />
              <path d="M12 11v5" />
              <path d="M12 8h.01" />
            </svg>
            <span>
              Tous les fournisseurs sont acceptés. La comparaison porte sur les
              produits du catalogue Club Santé Premium : ceux que certains
              fabricants vendent uniquement en direct ne peuvent pas être
              comparés, nous vous l&apos;indiquerons.
            </span>
          </p>
        </div>
        <InvoiceDrop simulationId={id} />
      </div>
    </SimulationScreen>
  );
}
