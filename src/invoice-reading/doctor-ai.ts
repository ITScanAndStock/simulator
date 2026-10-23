import type { PdfPage, Row } from "./pdf-rows";
import type { InvoiceLine, UnsureField } from "./invoice-line";

const vatNumber = "FR40824423735";

export function isDoctorAiInvoice(pages: PdfPage[]) {
  return pages
    .flatMap((page) => page.flatMap((row) => row.words.map((w) => w.text)))
    .join("")
    .replace(/\s/g, "")
    .includes(vatNumber);
}

export function readDoctorAiInvoice(pages: PdfPage[]) {
  const lines = pages.flatMap((page) =>
    tableRows(page).flatMap((row) => {
      const line = productLine(row);
      return line ? [line] : [];
    }),
  );
  const totalCents = pages.map(netToPay).find((total) => total !== undefined);
  if (lines.length === 0 || totalCents === undefined) {
    throw new Error("No Doctor AI invoice lines found");
  }
  return { lines, totalCents };
}

// Recognition reads each word apart where the text layer groups a label or an amount.
function rowText(row: Row) {
  return row.words.map((w) => w.text).join(" ");
}

// Spaced-out barcodes above and below the table end with seven figures too.
function tableRows(page: PdfPage) {
  const header = page.findIndex((row) => rowText(row).includes("Prix Unit."));
  if (header === -1) return [];
  const end = page.findIndex((row) => rowText(row).includes("MONTANT H.T."));
  return page.slice(header + 1, end === -1 ? undefined : end);
}

// Columns after the designation: ordered, delivered, list price, discount,
// net unit price, net amount, VAT rate; then an optional transport index.
function productLine(row: Row): InvoiceLine | undefined {
  const words = [...row.words];
  if (words.length > 0 && !isNumber(words.at(-1)!.text)) words.pop();
  const figures = words.slice(-7);
  const [reference, ...designation] = words.slice(0, -7);
  if (
    designation.length === 0 ||
    figures.length < 7 ||
    !figures.every((w) => isNumber(w.text))
  ) {
    return undefined;
  }
  const [, delivered, , , unitPrice, amount, vatRate] = figures;
  const unsure: UnsureField[] = [];
  if (reference.unsure) unsure.push("reference");
  if (unitPrice.unsure) unsure.push("unitPrice");
  return {
    reference: reference.text.replace(/[–—]/g, "-"),
    designation: designation.map((w) => w.text).join(" "),
    quantity: Number(delivered.text),
    unitPriceCents: cents(unitPrice.text),
    amountCents: cents(amount.text),
    vatRate: Number(vatRate.text),
    unsure,
  };
}

function isNumber(text: string) {
  return /^\d+(\.\d+)?%?$/.test(text);
}

function cents(price: string) {
  const match = /^(\d+)\.(\d{2})$/.exec(price);
  if (!match) throw new Error(`Not a price: ${price}`);
  return Number(match[1]) * 100 + Number(match[2]);
}

function netToPay(page: PdfPage) {
  const label = page.findIndex((row) => rowText(row).includes("NET A PAYER"));
  if (label === -1) return undefined;
  for (const row of page.slice(label)) {
    const amount = /(\d+\.\d{2}) €/.exec(rowText(row));
    if (amount) return cents(amount[1]);
  }
  return undefined;
}
