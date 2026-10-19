import Link from "next/link";
import { DataInformationDialog } from "@/components/data-information-dialog";
import { simulationSteps } from "@/simulation-steps";
import styles from "./page.module.css";

const guarantees = [
  "Gratuit · environ 3 minutes",
  "Vos factures sont supprimées dès leur lecture",
  "Seuls des prix anonymes sont conservés",
];

export default function Home() {
  return (
    <div className={styles.page}>
      <div className={styles.band}>Simulateur d&apos;économies</div>
      <main className={styles.main}>
        <div className={styles.intro}>
          <span className={styles.tag}>Simulateur gratuit</span>
          <h1 className={styles.title}>
            Combien paieriez-vous vos consommables{" "}
            <em>
              avec <b>Club Santé Premium</b>
            </em>
            &nbsp;?
          </h1>
          <p className={styles.lead}>
            Déposez une ou plusieurs factures de vos fournisseurs actuels. Nous
            retrouvons les mêmes produits et calculons ce que vous auriez payé
            au tarif négocié Club Santé Premium.
          </p>
          <div className={styles.start}>
            <Link href="/coordonnees" className="primary-button">
              Commencer la simulation
            </Link>
            <span className={styles.startNote}>
              Gratuit · environ 3 minutes
            </span>
          </div>
          <p className={styles.privacy}>
            Vos factures sont supprimées dès leur lecture. Votre simulation est
            transmise à l&apos;équipe Club Santé Premium ; nous ne gardons
            ensuite que des prix anonymes.{" "}
            <DataInformationDialog>
              Comment nous traitons vos données
            </DataInformationDialog>
          </p>
        </div>
        <aside
          aria-labelledby="simulation-steps-title"
          className={styles.summary}
        >
          <div aria-hidden="true" className={styles.summaryDecor} />
          <h2 id="simulation-steps-title" className={styles.summaryTitle}>
            Votre simulation
          </h2>
          <ol aria-label="Étapes de la simulation" className={styles.steps}>
            {simulationSteps.map((step, index) => (
              <li key={step} className={styles.step}>
                <span aria-hidden="true" className={styles.stepNumber}>
                  {index + 1}
                </span>
                <span className={styles.stepLabel}>{step}</span>
              </li>
            ))}
          </ol>
          <div className={styles.divider} />
          <ul className={styles.guarantees}>
            {guarantees.map((guarantee) => (
              <li key={guarantee} className={styles.guarantee}>
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.4"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                  className={styles.check}
                >
                  <path d="M5 12.5l4.5 4.5L19 7.5" />
                </svg>
                <span>{guarantee}</span>
              </li>
            ))}
          </ul>
        </aside>
      </main>
      <footer className={styles.footer}>
        <DataInformationDialog>Données personnelles</DataInformationDialog>
        <span>[Mentions légales]</span>
        <span>[Conditions d&apos;utilisation]</span>
      </footer>
    </div>
  );
}
