import type { ReactNode } from "react";
import { simulationSteps } from "@/simulation-steps";
import { StepBand } from "./step-band";
import styles from "./simulation-screen.module.css";

export function SimulationScreen({
  step,
  children,
}: {
  step: number;
  children: ReactNode;
}) {
  return (
    <div className={styles.page}>
      <div className={styles.subtitleStrip}>
        <span>Simulateur d&apos;économies</span>
        <span className={styles.badge}>
          Étape {step} sur {simulationSteps.length}
        </span>
      </div>
      <main className={styles.main}>
        <StepBand current={step} />
        {children}
      </main>
    </div>
  );
}
