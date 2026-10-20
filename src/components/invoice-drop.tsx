"use client";

import { startTransition, useRef, useState, type DragEvent } from "react";
import { maxInvoices, type InvoiceReadOutcome } from "@/invoice-upload";
import { readUploadedInvoice } from "@/server/invoice-actions";
import styles from "./invoice-drop.module.css";

type Upload = { id: number; name: string; outcome?: InvoiceReadOutcome };

export function InvoiceDrop({ simulationId }: { simulationId: string }) {
  const [uploads, setUploads] = useState<Upload[]>([]);
  const nextId = useRef(0);

  function add(files: FileList | null) {
    const accepted = [...(files ?? [])]
      .slice(0, Math.max(maxInvoices - uploads.length, 0))
      .map((file) => ({ id: nextId.current++, file }));
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
          (): InvoiceReadOutcome => ({ read: false }),
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

  function drop(event: DragEvent) {
    event.preventDefault();
    add(event.dataTransfer.files);
  }

  return (
    <div className={styles.drop}>
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
          PDF · {maxInvoices} factures au plus
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
      {/* Mounted while empty: a live region added with its content is often not announced. */}
      <ul className={styles.files} aria-live="polite">
        {uploads.map((upload) => (
          <li key={upload.id} className={styles.file}>
            <span className={styles.name}>{upload.name}</span>
            <Outcome outcome={upload.outcome} />
          </li>
        ))}
      </ul>
    </div>
  );
}

function Outcome({ outcome }: { outcome?: InvoiceReadOutcome }) {
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
