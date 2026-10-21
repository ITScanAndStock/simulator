import type { ReactNode } from "react";
import type { Result } from "@/server/invoices";
import { SimulationScreen } from "./simulation-screen";
import styles from "./result-screen.module.css";

const euros = new Intl.NumberFormat("fr-FR", {
  style: "currency",
  currency: "EUR",
});
const wholeEuros = new Intl.NumberFormat("fr-FR", {
  style: "currency",
  currency: "EUR",
  maximumFractionDigits: 0,
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

function alternatives(toStudy: number) {
  if (toStudy === 0) return "";
  const target = toStudy === 1 ? "au produit" : `aux ${toStudy} produits`;
  return ` et cherche avec vous des alternatives ${target} à étudier`;
}

export function ResultScreen({
  result,
  scanAndStockUser,
  averageSavingEuros,
  calendlyUrl,
}: {
  result: Result;
  scanAndStockUser: boolean;
  averageSavingEuros: number | undefined;
  calendlyUrl: string;
}) {
  const invoices =
    result.invoices === 1 ? "votre facture" : `vos ${result.invoices} factures`;
  const savingPercent =
    result.savingCents === 0
      ? "0 %"
      : `−${oneDecimal.format((result.savingCents / result.paidCents) * 100)} %`;
  const someToStudy = result.toStudyLines > 0;
  const coveredPercent =
    result.productsPaidCents === 0
      ? 0
      : Math.floor((result.paidCents * 100) / result.productsPaidCents);

  return (
    <SimulationScreen step={4}>
      <p className={styles.trialBanner}>
        Version d&apos;essai : le prix de référence est celui de Doctor AI, en
        attendant les tarifs GACD. Les montants ne sont pas des tarifs Club
        Santé Premium.
      </p>
      {scanAndStockUser && (
        <p className={styles.message}>
          Vous utilisez déjà Scan&amp;Stock : l’adhésion Club Santé Premium vous
          donnerait accès à ces tarifs.
        </p>
      )}
      <section className={styles.saving}>
        <div aria-hidden="true" className={styles.disc} />
        <div className={styles.headline}>
          <h1 className={styles.title}>
            <span className={styles.lead}>
              Sur {invoices}, avec les tarifs Club Santé Premium, vous auriez
              payé
            </span>{" "}
            <span className={styles.amount}>
              <b>{amount(result.savingCents)}</b> <em>de moins</em>
              {someToStudy && <sup className={styles.asterisk}>*</sup>}
            </span>
          </h1>
          {averageSavingEuros !== undefined && (
            <p className={styles.average}>
              En moyenne, nos affiliés économisent{" "}
              <strong>{wholeEuros.format(averageSavingEuros)}</strong> par an
            </p>
          )}
        </div>
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
          <span className={styles.detail}>
            {coveredPercent} % du montant de vos factures
          </span>
        </Counter>
        <Counter label="À étudier" tone="toStudy">
          <span className={styles.count}>
            {products(result.toStudyLines)}
            {someToStudy && "*"}
          </span>
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
      <section className={styles.meeting}>
        <div className={styles.meetingText}>
          <strong className={styles.meetingTitle}>
            Obtenez le détail produit par produit
          </strong>
          <span className={styles.meetingDetail}>
            Un conseiller Club Santé Premium vous le présente
            {alternatives(result.toStudyLines)}.
          </span>
        </div>
        <a
          href={calendlyUrl}
          className={`primary-button ${styles.meetingLink}`}
        >
          Prendre rendez-vous avec un conseiller
        </a>
      </section>
      <div className={styles.notes}>
        <p className={styles.note}>
          Comparaison sur les prix unitaires des produits identiques, prix TTC,
          hors frais de port. Estimation non contractuelle.
        </p>
        {someToStudy && (
          <p className={styles.note}>
            * Certains produits n&apos;ont pas pu être comparés : ils ne
            figurent pas dans le catalogue Club Santé Premium, par exemple parce
            que leur fabricant les vend uniquement en direct. Ils ne sont pas
            comptés dans l&apos;économie ; un conseiller peut vous proposer une
            alternative.
          </p>
        )}
      </div>
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
