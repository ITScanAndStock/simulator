import { simulationSteps } from "@/simulation-steps";
import styles from "./step-band.module.css";

export function StepBand({ current }: { current: number }) {
  return (
    <div className={styles.band}>
      <div aria-hidden="true" className={styles.decor} />
      <ol aria-label="Étapes de la simulation" className={styles.steps}>
        {simulationSteps.map((step, index) => {
          const number = index + 1;
          if (number < current) {
            return (
              <li key={step} className={styles.step}>
                <span className={styles.doneNumber}>
                  <span className={styles.visuallyHidden}>Terminée : </span>
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <path d="M5 12.5l4.5 4.5L19 7.5" />
                  </svg>
                </span>
                <span className={styles.doneLabel}>{step}</span>
              </li>
            );
          }
          if (number === current) {
            return (
              <li key={step} aria-current="step" className={styles.step}>
                <span className={styles.currentNumber}>{number}</span>
                <div className={styles.currentText}>
                  <strong className={styles.currentLabel}>{step}</strong>
                  <span className={styles.currentState}>En cours</span>
                </div>
              </li>
            );
          }
          return (
            <li key={step} className={styles.step}>
              <span className={styles.number}>{number}</span>
              <span className={styles.label}>{step}</span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
