// Relative imports with extensions: scripts/import-price-lists.mts loads this module with plain Node.
import {
  readPdfWords,
  toRows,
  type PlacedWord,
  type Row,
} from "../invoice-reading/pdf-rows.ts";
import type { GroupRange } from "./agreement.ts";

export type PriceListRow = {
  reference: string;
  designation: string;
  range: GroupRange;
  cataloguePriceCents: number;
  vatRate?: number;
};

export const priceListFiles = {
  straumann: "catalogue_straumann.pdf",
  anthogyr: "catalogue_anthogyr.pdf",
  neodent: "catalogue_neodent.pdf",
  biomaterials: "catalogue_biomateriaux.pdf",
} as const;

export type PriceListName = keyof typeof priceListFiles;

export type PriceList = {
  list: PriceListName;
  year: number;
  rows: PriceListRow[];
};

const pricePattern = /^(\d+(?:[ .]\d{3})*),(\d{2})(?: ?€)?$/;
const referencePattern = /^[A-Z0-9][A-Z0-9._/-]*$/;
// A page number or a section label can share the row of a reference, a few points to its left.
const referenceColumnTolerance = 3;
// The lines of a designation printed on two lines sit within this distance of their reference.
const wrappedDesignationDistance = 12;

type PricedRow = { y: number; words: PlacedWord[]; prices: number[] };

export async function readPriceList(
  bytes: Uint8Array,
  list: PriceListName,
): Promise<PriceList> {
  const pages = await readPdfWords(bytes);
  const year = pages[0]?.words
    .map((word) => /\b(20\d{2})\b/.exec(word.text)?.[1])
    .find(Boolean);
  if (!year) throw new Error("No price list year on the first page.");
  const rows = new Map<string, PriceListRow>();
  for (const page of pages) {
    // A landscape page is two portrait pages printed side by side.
    const columns =
      page.width > page.height
        ? [
            page.words.filter((word) => word.x < page.width / 2),
            page.words.filter((word) => word.x >= page.width / 2),
          ]
        : [page.words];
    for (const words of columns) {
      for (const row of readColumn(words, list)) {
        if (!rows.has(row.reference)) rows.set(row.reference, row);
      }
    }
  }
  if (rows.size === 0) throw new Error(`Found no price in the ${list} list.`);
  return { list, year: Number(year), rows: [...rows.values()] };
}

function readColumn(words: PlacedWord[], list: PriceListName) {
  const lines = toRows(words).map(withPrices);
  const priced = lines.filter((line) => line.prices.length > 0);
  const referenceX = mostFrequent(
    priced.flatMap((line) =>
      line.words.slice(0, 1).map((w) => Math.round(w.x)),
    ),
  );
  return priced.flatMap((line): PriceListRow[] => {
    const cells = line.words.filter(
      (word) => word.x >= referenceX - referenceColumnTolerance,
    );
    const [reference, ...designation] = cells;
    if (!reference || !referencePattern.test(reference.text)) return [];
    const text =
      designation.map((word) => word.text).join(" ") ||
      lines
        .filter(
          (other) =>
            other.prices.length === 0 &&
            Math.abs(other.y - line.y) < wrappedDesignationDistance,
        )
        .map((other) => other.words.map((word) => word.text).join(" "))
        .join(" ");
    const taxInclusive = line.prices.at(-1)!;
    const taxExclusive =
      line.prices.length > 1 ? line.prices.at(-2) : undefined;
    return [
      {
        reference: reference.text,
        designation: text,
        range:
          list === "biomaterials" && /xenograft/i.test(text)
            ? "xenograft"
            : list,
        cataloguePriceCents: taxInclusive,
        ...(taxExclusive && {
          vatRate:
            Math.round(((taxInclusive - taxExclusive) * 1000) / taxExclusive) /
            10,
        }),
      },
    ];
  });
}

// The prices close the row; the euro sign is sometimes a word of its own.
function withPrices(row: Row): PricedRow {
  const words = row.words
    .filter((word) => word.text !== "€")
    .map((word) => ({ ...word, y: row.y }));
  const prices: number[] = [];
  while (words.length > 0) {
    const match = pricePattern.exec(words.at(-1)!.text);
    if (!match) break;
    words.pop();
    prices.unshift(
      Number(match[1].replace(/[ .]/g, "")) * 100 + Number(match[2]),
    );
  }
  return { y: row.y, words, prices };
}

function mostFrequent(values: number[]) {
  const counts = new Map<number, number>();
  for (const value of values) counts.set(value, (counts.get(value) ?? 0) + 1);
  return [...counts].sort((a, b) => b[1] - a[1] || a[0] - b[0])[0]?.[0] ?? 0;
}
