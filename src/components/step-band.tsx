import { simulationSteps } from "@/simulation-steps";
import styles from "./step-band.module.css";

export function StepBand() {
  return (
    <div className={styles.band}>
      <div aria-hidden="true" className={styles.decor} />
      <ol aria-label="Étapes de la simulation" className={styles.steps}>
        {simulationSteps.map((step, index) =>
          index === 0 ? (
            <li key={step} aria-current="step" className={styles.step}>
              <span className={styles.currentNumber}>{index + 1}</span>
              <div className={styles.currentText}>
                <strong className={styles.currentLabel}>{step}</strong>
                <span className={styles.currentState}>En cours</span>
              </div>
            </li>
          ) : (
            <li key={step} className={styles.step}>
              <span className={styles.number}>{index + 1}</span>
              <span className={styles.label}>{step}</span>
            </li>
          ),
        )}
      </ol>
    </div>
  );
}
