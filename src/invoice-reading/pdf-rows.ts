import { getDocumentProxy, renderPageAsImage } from "unpdf";
import { maxPixels } from "./recognition";

// Only character recognition says a word is unsure.
export type Word = { x: number; text: string; unsure?: boolean };
export type Row = { y: number; words: Word[] };
export type PdfPage = Row[];

const sameRowTolerance = 1.5;
const scanScale = 300 / 72;
const maxScannedPages = 10;

export async function readPdfRows(bytes: Uint8Array): Promise<PdfPage[]> {
  const pdf = await getDocumentProxy(bytes.slice(), { verbosity: 0 });
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

export async function renderPdfPages(bytes: Uint8Array) {
  const pdf = await getDocumentProxy(bytes.slice(), { verbosity: 0 });
  try {
    if (pdf.numPages > maxScannedPages) {
      throw new Error(`A scan of ${pdf.numPages} pages is too long to read`);
    }
    const images: Uint8Array[] = [];
    for (let number = 1; number <= pdf.numPages; number++) {
      const { width, height } = (await pdf.getPage(number)).getViewport({
        scale: scanScale,
      });
      if (width * height > maxPixels) {
        throw new Error(`Page ${number} is too large to render`);
      }
      const image = await renderPageAsImage(pdf, number, {
        canvasImport: () => import("@napi-rs/canvas"),
        scale: scanScale,
      });
      images.push(new Uint8Array(image));
    }
    return images;
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
