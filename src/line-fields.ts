import type { LineCorrection } from "@/simulation/simulate";

export type LineFields = {
  reference: string;
  quantity: string;
  unitPrice: string;
};

export type LineFieldErrors = Partial<Record<keyof LineFields, string>>;

export const maxReferenceLength = 64;
export const maxDesignationLength = 200;
const maxQuantity = 10_000;
// Line amounts are stored as int4 cents.
const maxAmountCents = 100_000_000;
const controlCharacter = /[\u0000-\u001f\u007f]/;

const wholeNumber = new Intl.NumberFormat("fr-FR");

export function lineKey(line: { invoiceId: string; position: number }) {
  return `${line.invoiceId}-${line.position}`;
}

export function hasControlCharacter(text: string) {
  return controlCharacter.test(text);
}

export function parseLineFields(
  fields: LineFields,
): { correction: LineCorrection } | { errors: LineFieldErrors } {
  const errors: LineFieldErrors = {};
  const reference = fields.reference.trim();
  if (reference === "") errors.reference = "Indiquez la référence.";
  else if (hasControlCharacter(reference)) {
    errors.reference = "La référence contient un caractère non valide.";
  } else if (reference.length > maxReferenceLength) {
    errors.reference = `La référence ne peut pas dépasser ${maxReferenceLength} caractères.`;
  }
  const quantityText = fields.quantity.trim();
  const quantity = Number(quantityText);
  if (!/^\d+$/.test(quantityText) || quantity === 0) {
    errors.quantity = "La quantité doit être un nombre entier supérieur à 0.";
  } else if (quantity > maxQuantity) {
    errors.quantity = `La quantité ne peut pas dépasser ${wholeNumber.format(maxQuantity)}.`;
  }
  const priceText = fields.unitPrice.replace(/[\s€]/g, "");
  const price = /^(\d+)(?:[.,](\d{1,2}))?$/.exec(priceText);
  const unitPriceCents = price
    ? Number(price[1]) * 100 + Number((price[2] ?? "").padEnd(2, "0"))
    : undefined;
  if (priceText === "") errors.unitPrice = "Indiquez le prix unitaire payé.";
  else if (unitPriceCents === undefined) {
    errors.unitPrice = `« ${fields.unitPrice.trim()} » n'est pas un prix : écrivez par exemple 38,50.`;
  } else if (!errors.quantity && quantity * unitPriceCents > maxAmountCents) {
    errors.unitPrice = `Le montant de la ligne ne peut pas dépasser ${wholeNumber.format(maxAmountCents / 100)} €.`;
  }
  if (Object.keys(errors).length > 0 || unitPriceCents === undefined) {
    return { errors };
  }
  return { correction: { reference, quantity, unitPriceCents } };
}
