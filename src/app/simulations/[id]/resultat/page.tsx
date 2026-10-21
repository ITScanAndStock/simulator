import type { ReactNode } from "react";
import { notFound, redirect } from "next/navigation";
import { SimulationScreen } from "@/components/simulation-screen";
import { findResult } from "@/server/invoices";
import { simulationExists } from "@/server/simulations";
import styles from "./page.module.css";

const euros = new Intl.NumberFormat("fr-FR", {
  style: "currency",
  currency: "EUR",
});
const oneDecimal = new Intl.NumberFormat("fr-FR", {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

function amount(cents: number) {
  return euros.format(cents / 100);
}

function products(count: number) {
  return `${count} ${count === 1 ? "produit" : "produits"}`;
}

export default async function Result({
  params,
}: PageProps<"/simulations/[id]/resultat">) {
  const { id } = await params;
  if (!(await simulationExists(id))) notFound();
  const result = await findResult(id);
  if (!result) redirect(`/simulations/${id}/factures`);

  const invoices =
    result.invoices === 1 ? "votre facture" : `vos ${result.invoices} factures`;
  const savingPercent =
    result.savingCents === 0
      ? "0 %"
      : `−${oneDecimal.format((result.savingCents / result.paidCents) * 100)} %`;

  return (
    <SimulationScreen step={4}>
      <section className={styles.saving}>
        <div aria-hidden="true" className={styles.disc} />
        <h1 className={styles.headline}>
          <span className={styles.lead}>
            Sur {invoices}, avec les tarifs Club Santé Premium, vous auriez payé
          </span>{" "}
          <span className={styles.amount}>
            <b>{amount(result.savingCents)}</b> <em>de moins</em>
          </span>
        </h1>
        <dl className={styles.totals}>
          <div className={styles.total}>
            <dt>Vous avez payé</dt>
            <dd>{amount(result.paidCents)}</dd>
          </div>
          <div className={styles.total}>
            <dt>Avec Club Santé Premium</dt>
            <dd>{amount(result.paidCents - result.savingCents)}</dd>
          </div>
          <div className={`${styles.total} ${styles.savingTotal}`}>
            <dt>Économie</dt>
            <dd>{savingPercent}</dd>
          </div>
        </dl>
      </section>
      <section className={styles.counters}>
        <Counter label="Comparées" tone="compared">
          <span className={`${styles.count} ${styles.comparedCount}`}>
            {result.comparedLines}{" "}
            {result.comparedLines === 1 ? "ligne" : "lignes"} sur{" "}
            {result.productLines}
          </span>
        </Counter>
        <Counter label="À étudier" tone="toStudy">
          <span className={styles.count}>{products(result.toStudyLines)}</span>
          <span className={styles.detail}>
            Absents du catalogue Club Santé Premium : un expert peut vous
            proposer une alternative
          </span>
        </Counter>
        <Counter label="Déjà moins cher" tone="alreadyCheaper">
          <span className={styles.count}>
            {products(result.alreadyCheaperLines)}
          </span>
          <span className={styles.detail}>
            Moins cher chez votre fournisseur actuel
          </span>
        </Counter>
      </section>
    </SimulationScreen>
  );
}

function Counter({
  label,
  tone,
  children,
}: {
  label: string;
  tone: "compared" | "toStudy" | "alreadyCheaper";
  children: ReactNode;
}) {
  const labelId = `counter-${tone}`;
  return (
    <div role="group" aria-labelledby={labelId} className={styles.counter}>
      <span id={labelId} className={`${styles.tag} ${styles[tone]}`}>
        {label}
      </span>
      {children}
    </div>
  );
}
