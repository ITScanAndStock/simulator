import type { InvoiceLine } from "@/invoice-reading/invoice-line";
import type { PriceLookup } from "@/price-lookup/price-lookup";
import type { SupplierCode } from "@/supplier";

const confusedCharacters = ["0O", "1IL", "5S", "8B"];
// Each variant is one more question to Coompy, asked while the invoice is being read.
const maxVariants = 16;
const maxQuestionsPerInvoice = 100;

export async function proposeReferences<L extends InvoiceLine>(
  lookup: PriceLookup,
  supplier: SupplierCode,
  lines: L[],
) {
  let questions = 0;
  const counted: PriceLookup = (asked, reference) => {
    questions++;
    return lookup(asked, reference);
  };
  const proposed: (L & { proposedReference?: string })[] = [];
  for (const line of lines) {
    if (questions >= maxQuestionsPerInvoice) {
      proposed.push(line);
      continue;
    }
    const proposedReference = await proposeReference(
      counted,
      supplier,
      line.reference,
    );
    proposed.push({ ...line, proposedReference });
  }
  return proposed;
}

export async function proposeReference(
  lookup: PriceLookup,
  supplier: SupplierCode,
  reference: string,
) {
  const found = await lookup(supplier, reference);
  if (found.outcome !== "unknownReference") return undefined;
  const variants = oneCharacterVariants(reference);
  if (variants.length > maxVariants) return undefined;
  const known: string[] = [];
  for (const variant of variants) {
    const answer = await lookup(supplier, variant);
    if (answer.outcome !== "unknownReference") known.push(variant);
  }
  return known.length === 1 ? known[0] : undefined;
}

function oneCharacterVariants(reference: string) {
  return [...reference].flatMap((character, index) => {
    const confused = confusedCharacters.find((group) =>
      group.includes(character.toUpperCase()),
    );
    if (!confused) return [];
    return [...confused]
      .filter((other) => other !== character.toUpperCase())
      .map(
        (other) =>
          reference.slice(0, index) + other + reference.slice(index + 1),
      );
  });
}
