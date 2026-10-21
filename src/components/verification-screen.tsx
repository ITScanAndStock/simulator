import { amount } from "@/format";
import type { TotalDoubt } from "@/simulation/doubts";
import { LinesForm, type AddedLineView, type ReadLineView } from "./lines-form";
import { SimulationScreen } from "./simulation-screen";
import styles from "./verification-screen.module.css";

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

function totalWarning({ addedUpCents, totalCents }: TotalDoubt) {
  return `Les lignes lues font ${amount(addedUpCents)} alors que la facture totalise ${amount(totalCents)} : une ligne a peut-être été oubliée ou mal lue.`;
}

function counted(count: number, one: string, several: string) {
  const number = countWords[count - 1] ?? String(count);
  return `${number} ${count === 1 ? one : several} à vérifier`;
}

export function VerificationScreen({
  simulationId,
  readLines,
  doubtfulLines,
  totals,
  invoices,
  lines,
  added,
}: {
  simulationId: string;
  readLines: number;
  doubtfulLines: number;
  totals: (TotalDoubt & { key: string })[];
  invoices: { id: string; label: string }[];
  lines: ReadLineView[];
  added: AddedLineView[];
}) {
  const shown = lines.filter((line) => line.shown).length;

  return (
    <SimulationScreen step={3}>
      <div className={styles.heading}>
        <h1 className={styles.title}>
          {doubtfulLines > 0
            ? counted(doubtfulLines, "ligne", "lignes")
            : counted(totals.length, "facture", "factures")}
        </h1>
        <p className={styles.lead}>
          Nous avons lu{" "}
          {invoices.length === 1
            ? "votre facture"
            : `vos ${invoices.length} factures`}
          .{" "}
          {shown === 1
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
      <LinesForm
        simulationId={simulationId}
        invoices={invoices}
        initialLines={lines}
        initialAdded={added}
      />
    </SimulationScreen>
  );
}
