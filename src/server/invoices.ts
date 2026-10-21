import "server-only";
import type { InvoiceLine } from "@/invoice-reading/invoice-line";
import type { ReadInvoice, TaxBasis } from "@/invoice-reading/read-invoice";
import type { CheckedInvoice } from "@/simulation/doubts";
import type { Simulation } from "@/simulation/simulate";
import type { SupplierCode } from "@/supplier";
import { databasePool } from "./db";

export type StoredLine = InvoiceLine & { invoiceId: string; position: number };

export type StoredInvoice = Omit<CheckedInvoice, "lines"> & {
  id: string;
  supplier: SupplierCode;
  lines: StoredLine[];
};

export async function storeReadInvoice(
  simulationId: string,
  invoice: Extract<ReadInvoice, { status: "read" }>,
) {
  const client = await databasePool().connect();
  try {
    await client.query("BEGIN");
    const { rows } = await client.query<{ id: string }>(
      `INSERT INTO invoice (simulation_id, supplier, tax_basis, other_charges_cents, total_cents)
       VALUES ($1, $2, $3, $4, $5) RETURNING id`,
      [
        simulationId,
        invoice.supplier,
        invoice.taxBasis,
        invoice.otherChargesCents,
        invoice.totalCents,
      ],
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

// Invoices read earlier but no longer listed on screen 3 are left out of the simulation.
export async function markListedInvoices(
  simulationId: string,
  invoiceIds: string[],
) {
  await databasePool().query(
    `UPDATE invoice SET listed = id::text = ANY($2::text[]) WHERE simulation_id = $1`,
    [simulationId, invoiceIds],
  );
}

export async function findListedInvoices(simulationId: string) {
  const { rows } = await databasePool().query<{
    invoice_id: string;
    supplier: SupplierCode;
    tax_basis: TaxBasis;
    other_charges_cents: number;
    total_cents: number;
    position: number;
    reference: string;
    designation: string;
    quantity: number;
    unit_price_cents: number;
    amount_cents: number;
    vat_rate: string | null;
  }>(
    `SELECT i.id AS invoice_id, i.supplier, i.tax_basis, i.other_charges_cents, i.total_cents,
            l.position, l.reference, l.designation, l.quantity, l.unit_price_cents,
            l.amount_cents, l.vat_rate
     FROM invoice i JOIN invoice_line l ON l.invoice_id = i.id
     WHERE i.simulation_id = $1 AND i.listed
     ORDER BY i.read_at, i.id, l.position`,
    [simulationId],
  );
  const invoices = new Map<string, StoredInvoice>();
  for (const row of rows) {
    const invoice = invoices.get(row.invoice_id) ?? {
      id: row.invoice_id,
      supplier: row.supplier,
      taxBasis: row.tax_basis,
      otherChargesCents: row.other_charges_cents,
      totalCents: row.total_cents,
      lines: [],
    };
    invoice.lines.push({
      invoiceId: row.invoice_id,
      position: row.position,
      reference: row.reference,
      designation: row.designation,
      quantity: row.quantity,
      unitPriceCents: row.unit_price_cents,
      amountCents: row.amount_cents,
      vatRate: row.vat_rate === null ? undefined : Number(row.vat_rate),
    });
    invoices.set(row.invoice_id, invoice);
  }
  return [...invoices.values()];
}

export async function storeSimulation(
  simulationId: string,
  simulation: Simulation<StoredLine>,
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
    for (const line of simulation.lines) {
      await client.query(
        `UPDATE invoice_line
         SET state = $1, reference_unit_price_cents = $2, saving_cents = $3
         WHERE invoice_id = $4 AND position = $5`,
        [
          line.state,
          line.referenceUnitPriceCents,
          line.savingCents,
          line.invoiceId,
          line.position,
        ],
      );
    }
    const { totals } = simulation;
    await client.query(
      `UPDATE simulation SET
         computed_at = now(), paid_cents = $1, saving_cents = $2, product_lines = $3,
         compared_lines = $4, to_study_lines = $5, already_cheaper_lines = $6,
         products_paid_cents = $7, updated_at = now()
       WHERE id = $8`,
      [
        totals.paidCents,
        totals.savingCents,
        totals.productLines,
        totals.comparedLines,
        totals.toStudyLines,
        totals.alreadyCheaperLines,
        totals.productsPaidCents,
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

export type Result = NonNullable<Awaited<ReturnType<typeof findResult>>>;

export async function findResult(simulationId: string) {
  const { rows } = await databasePool().query<{
    paid_cents: number;
    products_paid_cents: number;
    saving_cents: number;
    product_lines: number;
    compared_lines: number;
    to_study_lines: number;
    already_cheaper_lines: number;
    invoices: number;
  }>(
    `SELECT paid_cents, products_paid_cents, saving_cents, product_lines, compared_lines,
            to_study_lines, already_cheaper_lines,
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
    productsPaidCents: row.products_paid_cents,
    savingCents: row.saving_cents,
    productLines: row.product_lines,
    comparedLines: row.compared_lines,
    toStudyLines: row.to_study_lines,
    alreadyCheaperLines: row.already_cheaper_lines,
  };
}
