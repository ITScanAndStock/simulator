import "server-only";
import type { InvoiceLine } from "@/invoice-reading/invoice-line";
import type { Simulation } from "@/simulation/simulate";
import type { SupplierCode } from "@/supplier";
import { databasePool } from "./db";

export type StoredInvoice = {
  supplier: SupplierCode;
  lines: InvoiceLine[];
};

export async function storeReadInvoice(
  simulationId: string,
  invoice: StoredInvoice & { totalCents: number },
) {
  const client = await databasePool().connect();
  try {
    await client.query("BEGIN");
    const { rows } = await client.query<{ id: string }>(
      `INSERT INTO invoice (simulation_id, supplier, total_cents)
       VALUES ($1, $2, $3) RETURNING id`,
      [simulationId, invoice.supplier, invoice.totalCents],
    );
    for (const [position, line] of invoice.lines.entries()) {
      await client.query(
        `INSERT INTO invoice_line
           (invoice_id, position, reference, designation, quantity, unit_price_cents,
            amount_cents, vat_rate)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [
          rows[0].id,
          position,
          line.reference,
          line.designation,
          line.quantity,
          line.unitPriceCents,
          line.amountCents,
          line.vatRate,
        ],
      );
    }
    await client.query("COMMIT");
    return rows[0].id;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

// Each line keeps its invoice id and position, so that its state can be stored back on it.
export async function findReadInvoices(
  simulationId: string,
  invoiceIds: string[],
) {
  const { rows } = await databasePool().query<{
    invoice_id: string;
    supplier: SupplierCode;
    position: number;
    reference: string;
    designation: string;
    quantity: number;
    unit_price_cents: number;
    amount_cents: number;
    vat_rate: string | null;
  }>(
    `SELECT i.id AS invoice_id, i.supplier, l.position, l.reference, l.designation,
            l.quantity, l.unit_price_cents, l.amount_cents, l.vat_rate
     FROM invoice i JOIN invoice_line l ON l.invoice_id = i.id
     WHERE i.simulation_id = $1 AND i.id::text = ANY($2::text[])
     ORDER BY i.read_at, i.id, l.position`,
    [simulationId, invoiceIds],
  );
  const invoices = new Map<
    string,
    StoredInvoice & { positions: { invoiceId: string; position: number }[] }
  >();
  for (const row of rows) {
    const invoice = invoices.get(row.invoice_id) ?? {
      supplier: row.supplier,
      lines: [],
      positions: [],
    };
    invoice.lines.push({
      reference: row.reference,
      designation: row.designation,
      quantity: row.quantity,
      unitPriceCents: row.unit_price_cents,
      amountCents: row.amount_cents,
      vatRate: row.vat_rate === null ? undefined : Number(row.vat_rate),
    });
    invoice.positions.push({
      invoiceId: row.invoice_id,
      position: row.position,
    });
    invoices.set(row.invoice_id, invoice);
  }
  return [...invoices.values()];
}

export async function storeSimulation(
  simulationId: string,
  positions: { invoiceId: string; position: number }[],
  simulation: Simulation,
) {
  const client = await databasePool().connect();
  try {
    await client.query("BEGIN");
    // Invoices left out of this computation keep no state from an earlier one.
    await client.query(
      `UPDATE invoice_line
       SET state = NULL, reference_unit_price_cents = NULL, saving_cents = NULL
       WHERE invoice_id IN (SELECT id FROM invoice WHERE simulation_id = $1)`,
      [simulationId],
    );
    for (const [index, line] of simulation.lines.entries()) {
      await client.query(
        `UPDATE invoice_line
         SET state = $1, reference_unit_price_cents = $2, saving_cents = $3
         WHERE invoice_id = $4 AND position = $5`,
        [
          line.state,
          line.referenceUnitPriceCents,
          line.savingCents,
          positions[index].invoiceId,
          positions[index].position,
        ],
      );
    }
    const { totals } = simulation;
    await client.query(
      `UPDATE simulation SET
         computed_at = now(), paid_cents = $1, saving_cents = $2, product_lines = $3,
         compared_lines = $4, to_study_lines = $5, already_cheaper_lines = $6,
         updated_at = now()
       WHERE id = $7`,
      [
        totals.paidCents,
        totals.savingCents,
        totals.productLines,
        totals.comparedLines,
        totals.toStudyLines,
        totals.alreadyCheaperLines,
        simulationId,
      ],
    );
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function findResult(simulationId: string) {
  const { rows } = await databasePool().query<{
    paid_cents: number;
    saving_cents: number;
    product_lines: number;
    compared_lines: number;
    to_study_lines: number;
    already_cheaper_lines: number;
    invoices: number;
  }>(
    `SELECT paid_cents, saving_cents, product_lines, compared_lines, to_study_lines,
            already_cheaper_lines,
            (SELECT count(DISTINCT i.id)::int FROM invoice i
              JOIN invoice_line l ON l.invoice_id = i.id
              WHERE i.simulation_id = s.id AND l.state IS NOT NULL) AS invoices
     FROM simulation s WHERE id = $1 AND computed_at IS NOT NULL`,
    [simulationId],
  );
  const row = rows[0];
  if (!row) return undefined;
  return {
    invoices: row.invoices,
    paidCents: row.paid_cents,
    savingCents: row.saving_cents,
    productLines: row.product_lines,
    comparedLines: row.compared_lines,
    toStudyLines: row.to_study_lines,
    alreadyCheaperLines: row.already_cheaper_lines,
  };
}
