"use client";

import Link from "next/link";
import { startTransition, useRef, useState, type DragEvent } from "react";
import { maxInvoices, type InvoiceUploadResult } from "@/invoice-upload";
import { readUploadedInvoice } from "@/server/invoice-actions";
import { checkLines } from "@/server/simulation-actions";
import styles from "./invoice-drop.module.css";
import { CrossIcon } from "./icons";
import { useSetComputing } from "./simulation-screen";
import { Toasts, type Toast } from "./toasts";

type Upload = { id: number; name: string; outcome?: InvoiceUploadResult };

function isPdf(file: File) {
  return file.type === "application/pdf" || /\.pdf$/i.test(file.name);
}

export function InvoiceDrop({
  simulationId,
  maxMegabytes,
}: {
  simulationId: string;
  maxMegabytes: number;
}) {
  const [uploads, setUploads] = useState<Upload[]>([]);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const nextId = useRef(0);
  const setComputing = useSetComputing();

  function refusal(title: string, message: string): Toast {
    return { id: nextId.current++, title, message };
  }

  function add(files: FileList | null) {
    const accepted: { id: number; file: File }[] = [];
    const refused: Toast[] = [];
    for (const file of files ?? []) {
      if (!isPdf(file)) {
        refused.push(
          refusal(
            "Format non accepté",
            `« ${file.name} » n'est pas accepté : déposez un PDF.`,
          ),
        );
      } else if (file.size > maxMegabytes * 1024 * 1024) {
        refused.push(
          refusal(
            "Fichier trop lourd",
            `« ${file.name} » dépasse ${maxMegabytes} Mo : compressez-le.`,
          ),
        );
      } else if (uploads.length + accepted.length >= maxInvoices) {
        refused.push(
          refusal(
            `${maxInvoices} factures au plus`,
            `« ${file.name} » n'a pas été ajoutée : vous avez déjà déposé ${maxInvoices} factures.`,
          ),
        );
      } else {
        accepted.push({ id: nextId.current++, file });
      }
    }
    setToasts((current) => [...current, ...refused]);
    setUploads((current) => [
      ...current,
      ...accepted.map(({ id, file }) => ({ id, name: file.name })),
    ]);
    for (const { id, file } of accepted) {
      const formData = new FormData();
      formData.set("invoice", file);
      startTransition(async () => {
        // A refused request (body over the size limit, server error) must still end the reading.
        const outcome = await readUploadedInvoice(simulationId, formData).catch(
          (): InvoiceUploadResult => ({ read: false }),
        );
        // State set after an await leaves the transition unless wrapped again.
        startTransition(() =>
          setUploads((current) =>
            current.map((upload) =>
              upload.id === id ? { ...upload, outcome } : upload,
            ),
          ),
        );
      });
    }
  }

  const invoiceIds = uploads.flatMap((upload) =>
    upload.outcome?.read ? [upload.outcome.invoiceId] : [],
  );
  const allRead = uploads.every((upload) => upload.outcome);
  // Lines to verify lead to screen 4, where nothing is computed yet.
  const toVerify = uploads.some(
    ({ outcome }) => outcome?.read && outcome.toVerify,
  );
  const readyToCompute = invoiceIds.length > 0 && allRead;
  const noneReadable = uploads.length > 0 && allRead && invoiceIds.length === 0;

  function drop(event: DragEvent) {
    event.preventDefault();
    add(event.dataTransfer.files);
  }

  return (
    <div className={styles.drop}>
      <Toasts
        toasts={toasts}
        onClose={(id) =>
          setToasts((current) => current.filter((toast) => toast.id !== id))
        }
      />
      <label
        htmlFor="fichiers"
        className={styles.zone}
        onDragOver={(event) => event.preventDefault()}
        onDrop={drop}
      >
        <svg
          width="40"
          height="40"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
          className={styles.icon}
        >
          <path d="M12 16V4" />
          <path d="M7 9l5-5 5 5" />
          <path d="M4 16v3a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-3" />
        </svg>
        <span className={styles.call}>
          Glissez vos factures ici, ou choisissez des fichiers
        </span>
        <span className={styles.hint}>
          PDF · {maxMegabytes} Mo au plus · {maxInvoices} factures au plus
        </span>
        <input
          id="fichiers"
          type="file"
          accept="application/pdf"
          multiple
          className={styles.input}
          onChange={(event) => {
            add(event.target.files);
            event.target.value = "";
          }}
        />
      </label>
      {noneReadable && (
        <div role="alert" className={styles.noneReadable}>
          <strong>Aucune facture n&apos;a pu être lue</strong>
          <span>
            Nous ne pouvons pas calculer votre économie sans au moins une
            facture lisible. Essayez un PDF envoyé par votre fournisseur.
          </span>
        </div>
      )}
      {/* Mounted while empty: a live region added with its content is often not announced. */}
      <ul className={styles.files} aria-live="polite">
        {uploads.map((upload) => (
          <li key={upload.id} className={styles.file}>
            <span className={styles.name}>{upload.name}</span>
            <Outcome outcome={upload.outcome} />
            <button
              type="button"
              aria-label={`Retirer ${upload.name}`}
              className={styles.remove}
              onClick={() =>
                setUploads((current) =>
                  current.filter(({ id }) => id !== upload.id),
                )
              }
            >
              <CrossIcon />
            </button>
          </li>
        ))}
      </ul>
      <form
        action={checkLines.bind(null, simulationId, invoiceIds)}
        onSubmit={() => setComputing(!toVerify)}
        className={styles.actions}
      >
        <button
          type="submit"
          className="primary-button"
          disabled={!readyToCompute}
        >
          Vérifier les lignes lues
        </button>
        <Link
          href={`/simulations/${simulationId}/coordonnees`}
          className={styles.back}
        >
          Retour
        </Link>
      </form>
    </div>
  );
}

function Outcome({ outcome }: { outcome?: InvoiceUploadResult }) {
  if (!outcome)
    return <span className={styles.pending}>Lecture en cours…</span>;
  if (!outcome.read) return <span className={styles.pending}>Non lue</span>;
  const lines = outcome.lineCount === 1 ? "ligne" : "lignes";
  return (
    <span className={styles.read}>
      Lue · {outcome.lineCount} {lines}
    </span>
  );
}
