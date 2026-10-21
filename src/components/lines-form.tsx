"use client";

import Link from "next/link";
import { useRef, useState, useTransition, type ReactNode } from "react";
import { amount } from "@/format";
import {
  maxDesignationLength,
  maxReferenceLength,
  parseLineFields,
  type LineFieldErrors,
  type LineFields,
} from "@/line-fields";
import type { LineDoubt } from "@/simulation/doubts";
import { skipVerification, validateLines } from "@/server/simulation-actions";
import styles from "./verification-screen.module.css";

export type ReadLineView = LineFields & {
  key: string;
  invoiceId: string;
  position: number;
  designation: string;
  removed: boolean;
  shown: boolean;
  read: { quantity: number; unitPriceCents: number; amountCents: number };
  doubts: LineDoubt[];
};

export type AddedLineView = LineFields & {
  key: string;
  invoiceId: string;
  designation: string;
};

const fieldNames = ["reference", "quantity", "unitPrice"] as const;

function reason(read: ReadLineView["read"], doubt: LineDoubt) {
  if (doubt.reason === "noVatRate") {
    return "Prix hors taxes sans taux de TVA lisible.";
  }
  return `Montant incohérent : ${read.quantity} × ${amount(read.unitPriceCents)} font ${amount(doubt.computedCents)}, la facture indique ${amount(read.amountCents)}.`;
}

function changeOne<T extends { key: string }>(key: string, change: Partial<T>) {
  return (current: T[]) =>
    current.map((line) => (line.key === key ? { ...line, ...change } : line));
}

export function LinesForm({
  simulationId,
  invoices,
  initialLines,
  initialAdded,
}: {
  simulationId: string;
  invoices: { id: string; label: string }[];
  initialLines: ReadLineView[];
  initialAdded: AddedLineView[];
}) {
  const [lines, setLines] = useState(initialLines);
  const [added, setAdded] = useState(initialAdded);
  const [othersShown, setOthersShown] = useState(false);
  const [errors, setErrors] = useState<Record<string, LineFieldErrors>>({});
  const [pending, startTransition] = useTransition();
  const nextAdded = useRef(0);
  const initial = new Map(initialLines.map((line) => [line.key, line]));
  const others = lines.filter((line) => !line.shown).length;
  const visible = lines.filter((line) => line.shown || othersShown);

  function changed(line: ReadLineView) {
    const before = initial.get(line.key)!;
    return fieldNames.some((field) => line[field] !== before[field]);
  }

  function show(found: Record<string, LineFieldErrors>) {
    setErrors(found);
    if (lines.some((line) => !line.shown && found[line.key])) {
      setOthersShown(true);
    }
  }

  function addLine() {
    setAdded((current) => [
      ...current,
      {
        key: `new-${nextAdded.current++}`,
        invoiceId: invoices[0].id,
        reference: "",
        designation: "",
        quantity: "",
        unitPrice: "",
      },
    ]);
  }

  function validate() {
    const found: Record<string, LineFieldErrors> = {};
    const checked = [
      ...lines.filter((line) => !line.removed && changed(line)),
      ...added,
    ];
    for (const line of checked) {
      const parsed = parseLineFields(line);
      if ("errors" in parsed) found[line.key] = parsed.errors;
    }
    show(found);
    if (Object.keys(found).length > 0) return;
    startTransition(async () => {
      const refusal = await validateLines(simulationId, {
        lines: lines.map((line) => ({
          invoiceId: line.invoiceId,
          position: line.position,
          reference: line.reference,
          quantity: line.quantity,
          unitPrice: line.unitPrice,
          removed: line.removed,
          changed: changed(line),
        })),
        added: added.map((line) => ({
          key: line.key,
          invoiceId: line.invoiceId,
          reference: line.reference,
          designation: line.designation,
          quantity: line.quantity,
          unitPrice: line.unitPrice,
        })),
      });
      // State set after an await leaves the transition unless wrapped again.
      startTransition(() => show(refusal.errors));
    });
  }

  return (
    <form
      className={styles.form}
      onSubmit={(event) => {
        event.preventDefault();
        validate();
      }}
    >
      <table className={styles.table}>
        <thead>
          <tr>
            <th className={styles.referenceColumn}>Référence</th>
            <th>Désignation</th>
            <th className={styles.quantityColumn}>Quantité</th>
            <th className={styles.priceColumn}>Prix unitaire payé</th>
            <th className={styles.actionsColumn}>
              <span className={styles.visuallyHidden}>Actions</span>
            </th>
          </tr>
        </thead>
        {visible.map((line) =>
          line.removed ? (
            <tbody key={line.key} className={styles.line}>
              <tr>
                <td colSpan={5} className={styles.removed}>
                  « {line.designation} » ne sera pas comptée.{" "}
                  <button
                    type="button"
                    className={styles.linkButton}
                    onClick={() =>
                      setLines(
                        changeOne<ReadLineView>(line.key, { removed: false }),
                      )
                    }
                  >
                    Annuler
                  </button>
                </td>
              </tr>
            </tbody>
          ) : (
            <LineRow
              key={line.key}
              line={line}
              errors={errors[line.key]}
              designation={line.designation}
              onChange={(change) =>
                setLines(changeOne<ReadLineView>(line.key, change))
              }
              onRemove={() =>
                setLines(changeOne<ReadLineView>(line.key, { removed: true }))
              }
            >
              {line.doubts.length > 0 && (
                <tr>
                  <td colSpan={5} className={styles.reasons}>
                    <span className={styles.badge}>À vérifier</span>
                    {line.doubts
                      .map((doubt) => reason(line.read, doubt))
                      .join(" ")}
                  </td>
                </tr>
              )}
            </LineRow>
          ),
        )}
        {added.map((line) => (
          <LineRow
            key={line.key}
            line={line}
            errors={errors[line.key]}
            designation={
              <div className={styles.addedDesignation}>
                <input
                  aria-label="Désignation"
                  className={styles.input}
                  value={line.designation}
                  maxLength={maxDesignationLength}
                  onChange={(event) =>
                    setAdded(
                      changeOne<AddedLineView>(line.key, {
                        designation: event.target.value,
                      }),
                    )
                  }
                />
                {invoices.length > 1 && (
                  <select
                    aria-label="Facture"
                    className={styles.input}
                    value={line.invoiceId}
                    onChange={(event) =>
                      setAdded(
                        changeOne<AddedLineView>(line.key, {
                          invoiceId: event.target.value,
                        }),
                      )
                    }
                  >
                    {invoices.map((invoice) => (
                      <option key={invoice.id} value={invoice.id}>
                        {invoice.label}
                      </option>
                    ))}
                  </select>
                )}
              </div>
            }
            onChange={(change) =>
              setAdded(changeOne<AddedLineView>(line.key, change))
            }
            onRemove={() =>
              setAdded((current) =>
                current.filter((other) => other.key !== line.key),
              )
            }
          />
        ))}
      </table>
      <div className={styles.tableActions}>
        <button type="button" className={styles.addButton} onClick={addLine}>
          + Ajouter une ligne oubliée
        </button>
        {others > 0 && (
          <button
            type="button"
            className={styles.linkButton}
            onClick={() => setOthersShown((shown) => !shown)}
          >
            {othersShown
              ? "Masquer les autres lignes"
              : `Voir aussi ${others === 1 ? "l'autre ligne" : `les ${others} autres lignes`}`}
          </button>
        )}
      </div>
      <div className={styles.actions}>
        <div className={styles.buttons}>
          <button type="submit" className="primary-button" disabled={pending}>
            Valider et calculer mon économie
          </button>
          <button
            type="button"
            className={styles.secondaryButton}
            disabled={pending}
            onClick={() =>
              startTransition(() => skipVerification(simulationId))
            }
          >
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
      </div>
    </form>
  );
}

function LineRow({
  line,
  errors,
  designation,
  onChange,
  onRemove,
  children,
}: {
  line: LineFields & { key: string };
  errors: LineFieldErrors | undefined;
  designation: ReactNode;
  onChange: (change: Partial<LineFields>) => void;
  onRemove: () => void;
  children?: ReactNode;
}) {
  function input(
    field: keyof LineFields,
    label: string,
    options: { maxLength?: number; inputMode?: "numeric" | "decimal" } = {},
  ) {
    const error = errors?.[field];
    return (
      <input
        aria-label={label}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${line.key}-${field}-error` : undefined}
        className={styles.input}
        value={line[field]}
        onChange={(event) => onChange({ [field]: event.target.value })}
        {...options}
      />
    );
  }
  const messages = fieldNames.filter((field) => errors?.[field]);

  return (
    <tbody className={styles.line}>
      <tr>
        <td>
          {input("reference", "Référence", { maxLength: maxReferenceLength })}
        </td>
        <td>{designation}</td>
        <td>{input("quantity", "Quantité", { inputMode: "numeric" })}</td>
        <td>
          {input("unitPrice", "Prix unitaire payé", { inputMode: "decimal" })}
        </td>
        <td>
          <button
            type="button"
            aria-label="Supprimer la ligne"
            className={styles.removeButton}
            onClick={onRemove}
          >
            ×
          </button>
        </td>
      </tr>
      {messages.length > 0 && (
        <tr>
          <td colSpan={5} className={styles.errors}>
            {messages.map((field) => (
              <span key={field} id={`${line.key}-${field}-error`}>
                {errors?.[field]}
              </span>
            ))}
          </td>
        </tr>
      )}
      {children}
    </tbody>
  );
}
