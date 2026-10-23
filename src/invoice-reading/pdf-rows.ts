import { getDocumentProxy, renderPageAsImage } from "unpdf";
import { readPdfWords, toRows, type PdfPage } from "./pdf-words";
import { maxPixels } from "./recognition";

const scanScale = 300 / 72;
const maxScannedPages = 10;

export async function readPdfRows(bytes: Uint8Array): Promise<PdfPage[]> {
  return (await readPdfWords(bytes)).map((page) => toRows(page.words));
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
