import { getDocumentProxy } from "unpdf";

export type Word = { x: number; text: string };
export type Row = { y: number; words: Word[] };
export type PdfPage = Row[];

const sameRowTolerance = 1.5;

export type PlacedWord = Word & { y: number };
export type PdfWords = { width: number; height: number; words: PlacedWord[] };

export async function readPdfRows(bytes: Uint8Array): Promise<PdfPage[]> {
  return (await readPdfWords(bytes)).map((page) => toRows(page.words));
}

export async function readPdfWords(bytes: Uint8Array): Promise<PdfWords[]> {
  const pdf = await getDocumentProxy(bytes, { verbosity: 0 });
  try {
    const pages: PdfWords[] = [];
    for (let number = 1; number <= pdf.numPages; number++) {
      const page = await pdf.getPage(number);
      const { width, height } = page.getViewport({ scale: 1 });
      const { items } = await page.getTextContent();
      const words = items.flatMap((item) =>
        "str" in item && item.str.trim()
          ? [
              {
                x: item.transform[4],
                y: item.transform[5],
                text: item.str.trim(),
              },
            ]
          : [],
      );
      pages.push({ width, height, words });
    }
    return pages;
  } finally {
    await pdf.loadingTask.destroy();
  }
}

export function toRows(words: PlacedWord[]): PdfPage {
  const rows: Row[] = [];
  for (const word of [...words].sort((a, b) => b.y - a.y)) {
    const { y, ...placed } = word;
    const row = rows.find((r) => Math.abs(r.y - y) <= sameRowTolerance);
    if (row) row.words.push(placed);
    else rows.push({ y, words: [placed] });
  }
  for (const row of rows) row.words.sort((a, b) => a.x - b.x);
  return rows;
}
