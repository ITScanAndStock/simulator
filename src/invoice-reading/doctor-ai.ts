import type { PdfPage, Row } from "./pdf-rows";
import type { InvoiceLine } from "./invoice-line";

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

function hasWord(row: Row, text: string) {
  return row.words.some((w) => w.text === text);
}

// Spaced-out barcodes above and below the table end with seven figures too.
function tableRows(page: PdfPage) {
  const header = page.findIndex((row) => hasWord(row, "Prix Unit."));
  if (header === -1) return [];
  const end = page.findIndex((row) => hasWord(row, "MONTANT H.T."));
  return page.slice(header + 1, end === -1 ? undefined : end);
}

// Columns after the designation: ordered, delivered, list price, discount,
// net unit price, net amount, VAT rate; then an optional transport index.
function productLine(row: Row): InvoiceLine | undefined {
  const texts = row.words.map((w) => w.text);
  if (texts.length > 0 && !isNumber(texts.at(-1)!)) texts.pop();
  const figures = texts.slice(-7);
  const [reference, ...designation] = texts.slice(0, -7);
  if (
    designation.length === 0 ||
    figures.length < 7 ||
    !figures.every(isNumber)
  ) {
    return undefined;
  }
  const [, delivered, , , unitPrice, amount, vatRate] = figures;
  return {
    reference: reference.replace(/–/g, "-"),
    designation: designation.join(" "),
    quantity: Number(delivered),
    unitPriceCents: cents(unitPrice),
    amountCents: cents(amount),
    vatRate: Number(vatRate),
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
  const label = page.findIndex((row) => hasWord(row, "NET A PAYER"));
  if (label === -1) return undefined;
  for (const row of page.slice(label)) {
    const amount = row.words.find((w) => /^\d+\.\d{2} €$/.test(w.text));
    if (amount) return cents(amount.text.replace(" €", ""));
  }
  return undefined;
}
