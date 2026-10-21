import Link from "next/link";
import { amount } from "@/format";
import type { InvoiceLine } from "@/invoice-reading/invoice-line";
import type { LineDoubt, TotalDoubt } from "@/simulation/doubts";
import { skipVerification } from "@/server/simulation-actions";
import { SimulationScreen } from "./simulation-screen";
import styles from "./verification-screen.module.css";

export type LineToVerify = InvoiceLine & { key: string; doubts: LineDoubt[] };

const countWords = [
  "Une",
  "Deux",
  "Trois",
  "Quatre",
  "Cinq",
  "Six",
  "Sept",
  "Huit",
  "Neuf",
  "Dix",
];

function reason(line: LineToVerify, doubt: LineDoubt) {
  if (doubt.reason === "noVatRate") {
    return "Prix hors taxes sans taux de TVA lisible.";
  }
  return `Montant incohérent : ${line.quantity} × ${amount(line.unitPriceCents)} font ${amount(doubt.computedCents)}, la facture indique ${amount(line.amountCents)}.`;
}

function totalWarning({ addedUpCents, totalCents }: TotalDoubt) {
  return `Les lignes lues font ${amount(addedUpCents)} alors que la facture totalise ${amount(totalCents)} : une ligne a peut-être été oubliée ou mal lue.`;
}

function counted(count: number, one: string, several: string) {
  const number = countWords[count - 1] ?? String(count);
  return `${number} ${count === 1 ? one : several} à vérifier`;
}

export function VerificationScreen({
  simulationId,
  invoiceCount,
  readLines,
  doubtfulLines,
  totals,
  lines,
}: {
  simulationId: string;
  invoiceCount: number;
  readLines: number;
  doubtfulLines: number;
  totals: (TotalDoubt & { key: string })[];
  lines: LineToVerify[];
}) {
  const invoices =
    invoiceCount === 1 ? "votre facture" : `vos ${invoiceCount} factures`;

  return (
    <SimulationScreen step={3}>
      <div className={styles.heading}>
        <h1 className={styles.title}>
          {doubtfulLines > 0
            ? counted(doubtfulLines, "ligne", "lignes")
            : counted(totals.length, "facture", "factures")}
        </h1>
        <p className={styles.lead}>
          Nous avons lu {invoices}.{" "}
          {lines.length === 1
            ? "Sur cette ligne, une erreur de lecture est probable : corrigez-la si besoin, ou passez cette étape."
            : "Sur ces lignes, une erreur de lecture est probable : corrigez-les si besoin, ou passez cette étape."}
        </p>
      </div>
      <ul aria-label="Lignes lues" className={styles.chips}>
        <li className={styles.readChip}>{readLines} lignes lues</li>
        <li className={styles.sureChip}>
          {readLines - doubtfulLines} lues sans doute
        </li>
        <li className={styles.doubtChip}>{doubtfulLines} à vérifier</li>
      </ul>
      {totals.map((doubt) => (
        <p key={doubt.key} className={styles.warning}>
          {totalWarning(doubt)}
        </p>
      ))}
      <table className={styles.table}>
        <thead>
          <tr>
            <th className={styles.referenceColumn}>Référence</th>
            <th>Désignation</th>
            <th className={styles.quantityColumn}>Quantité</th>
            <th className={styles.priceColumn}>Prix unitaire payé</th>
          </tr>
        </thead>
        {lines.map((line) => (
          <tbody key={line.key} className={styles.line}>
            <tr>
              <td>{line.reference}</td>
              <td>{line.designation}</td>
              <td>{line.quantity}</td>
              <td>{amount(line.unitPriceCents)}</td>
            </tr>
            {line.doubts.length > 0 && (
              <tr>
                <td colSpan={4} className={styles.reasons}>
                  <span className={styles.badge}>À vérifier</span>
                  {line.doubts.map((doubt) => reason(line, doubt)).join(" ")}
                </td>
              </tr>
            )}
          </tbody>
        ))}
      </table>
      <form
        action={skipVerification.bind(null, simulationId)}
        className={styles.actions}
      >
        <div className={styles.buttons}>
          <button type="submit" className={styles.secondaryButton}>
            Passer cette étape
          </button>
          <Link
            href={`/simulations/${simulationId}/factures`}
            className={styles.back}
          >
            Retour
          </Link>
        </div>
        <span className={styles.hint}>
          Si vous passez cette étape, l&apos;économie est calculée avec les
          lignes telles que nous les avons lues.
        </span>
      </form>
    </SimulationScreen>
  );
}
