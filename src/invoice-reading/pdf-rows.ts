import { getDocumentProxy } from "unpdf";

export type Word = { x: number; text: string };
export type Row = { y: number; words: Word[] };
export type PdfPage = Row[];

const sameRowTolerance = 1.5;

export async function readPdfRows(bytes: Uint8Array): Promise<PdfPage[]> {
  const pdf = await getDocumentProxy(bytes, { verbosity: 0 });
  try {
    const pages: PdfPage[] = [];
    for (let number = 1; number <= pdf.numPages; number++) {
      const page = await pdf.getPage(number);
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
      pages.push(toRows(words));
    }
    return pages;
  } finally {
    await pdf.loadingTask.destroy();
  }
}

function toRows(words: (Word & { y: number })[]): PdfPage {
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
