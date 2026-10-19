"use client";

import { useId, useRef, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import styles from "./data-information-dialog.module.css";

const sections = [
  [
    "Qui traite vos données",
    "Club Santé Premium, responsable du traitement, [adresse], [contact DPO].",
  ],
  [
    "Pourquoi",
    "Calculer votre économie et permettre à un conseiller Club Santé Premium de vous recontacter.",
  ],
  [
    "Sur quelle base",
    "Le calcul de votre économie répond à votre demande. Le rappel par un conseiller repose sur l'intérêt légitime de Club Santé Premium à présenter ses services aux professionnels de santé : vous pouvez vous y opposer en décochant la case prévue, ou à tout moment ensuite.",
  ],
  [
    "Vos factures",
    "Lues automatiquement par [outil de lecture — à définir], puis supprimées dès la lecture terminée.",
  ],
  [
    "Ce que nous gardons",
    "Votre email, le nom du cabinet, le nom du praticien, votre téléphone, les lignes vérifiées et le résultat sont transmis à l'équipe commerciale Club Santé Premium, qui les conserve selon sa [politique de confidentialité]. Le simulateur ne garde ensuite que des prix anonymes (fournisseur, produit, prix, mois), pendant [durée à fixer].",
  ],
  ["Qui les reçoit", "L'équipe commerciale Club Santé Premium."],
  [
    "Vos droits",
    "Accès, rectification, effacement et opposition à tout moment : [adresse de contact]. Réclamation possible auprès de la CNIL.",
  ],
] as const;

const noSubscription = () => () => {};

export function DataInformationDialog({ children }: { children: string }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const opener = useRef<HTMLButtonElement>(null);
  const titleId = useId();
  // A trigger sits inside a <p>, which the HTML parser closes on <dialog>, breaking hydration.
  const body = useSyncExternalStore(
    noSubscription,
    () => document.body,
    () => null,
  );

  return (
    <>
      <button
        ref={opener}
        type="button"
        className={styles.trigger}
        onClick={() => dialog.current?.showModal()}
      >
        {children}
      </button>
      {body &&
        createPortal(
          <dialog
            ref={dialog}
            aria-labelledby={titleId}
            className={styles.dialog}
            // Safari does not focus a clicked button, so the browser's own restore would land on <body>.
            onClose={() => opener.current?.focus()}
          >
            <h2 id={titleId} className={styles.title}>
              Vos données et vos factures
            </h2>
            <dl className={styles.sections}>
              {sections.map(([term, description]) => (
                <div key={term} className={styles.section}>
                  <dt className={styles.term}>{term}</dt>
                  <dd className={styles.description}>{description}</dd>
                </div>
              ))}
            </dl>
            <div className={styles.actions}>
              <button
                type="button"
                className={`primary-button ${styles.close}`}
                onClick={() => dialog.current?.close()}
              >
                J&apos;ai compris
              </button>
              <span className={styles.policy}>
                [Politique de confidentialité complète]
              </span>
            </div>
          </dialog>,
          body,
        )}
    </>
  );
}
