"use client";

import { createContext, useContext, useState, type ReactNode } from "react";
import { simulationSteps } from "@/simulation-steps";
import { StepBand } from "./step-band";
import styles from "./simulation-screen.module.css";

const ComputingContext = createContext<(computing: boolean) => void>(() => {});

export function useSetComputing() {
  return useContext(ComputingContext);
}

export function SimulationScreen({
  step,
  children,
}: {
  step: number;
  children: ReactNode;
}) {
  const [computing, setComputing] = useState(false);
  const shownStep = computing ? simulationSteps.length : step;

  return (
    <div className={styles.page}>
      <div className={styles.subtitleStrip}>
        <span>Simulateur d&apos;économies</span>
        <span className={styles.badge}>
          Étape {shownStep} sur {simulationSteps.length}
        </span>
      </div>
      <main className={styles.main}>
        <StepBand current={shownStep} />
        {/* Hidden rather than unmounted: a refusal brings back the screen as it was left. */}
        <div className={computing ? styles.hidden : styles.screen}>
          <ComputingContext value={setComputing}>{children}</ComputingContext>
        </div>
        {computing && <Computing />}
      </main>
    </div>
  );
}

function Computing() {
  return (
    <section aria-busy="true" className={styles.computing}>
      <h1 className={styles.computingTitle}>Nous calculons votre économie</h1>
      <div
        role="progressbar"
        aria-label="Avancement"
        className={styles.progress}
      >
        <div className={styles.progressBar} />
      </div>
      <p className={styles.computingStep}>
        Recherche des produits au catalogue Club Santé Premium et comparaison
        des prix unitaires.
      </p>
      <p className={styles.computingNote}>Gardez cette page ouverte.</p>
    </section>
  );
}
