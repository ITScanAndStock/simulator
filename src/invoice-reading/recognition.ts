import path from "node:path";
import french from "@tesseract.js-data/fra";
import { createWorker, OEM, PSM } from "tesseract.js";
import type { PdfPage, Row } from "./pdf-words";

// Under ADR 0004's lowest confidence of a word read right on the real scan.
const minConfidence = 80;

// An A4 page at 300 dpi has 8,7 million pixels; a small file can claim hundreds of millions.
export const maxPixels = 40_000_000;

// The package points at its model for the legacy engine; ADR 0004 measured the LSTM one next to it.
const langPath = path.join(path.dirname(french.langPath), "4.0.0_best_int");

// Each reading holds a few hundred megabytes: readings wait for one another.
let queue: Promise<unknown> = Promise.resolve();

export function isImage(bytes: Uint8Array) {
  return isPng(bytes) || isJpeg(bytes);
}

export function recognisePages(images: Uint8Array[]) {
  const reading = queue.then(() => recognise(images));
  queue = reading.catch(() => undefined);
  return reading;
}

async function recognise(images: Uint8Array[]) {
  for (const image of images) {
    const size = imageSize(image);
    if (!size || size.width * size.height > maxPixels) {
      throw new Error("The image is too large to read, or its size is unknown");
    }
  }
  const worker = await createWorker("fra", OEM.LSTM_ONLY, {
    langPath,
    gzip: true,
    cacheMethod: "none",
  });
  try {
    // Sparse text: the default page layout analysis drops whole table rows.
    await worker.setParameters({ tessedit_pageseg_mode: PSM.SPARSE_TEXT });
    const pages: PdfPage[] = [];
    for (const image of images) {
      const { data } = await worker.recognize(
        Buffer.from(image),
        {},
        { blocks: true },
      );
      const words = (data.blocks ?? []).flatMap((block) =>
        block.paragraphs.flatMap((paragraph) =>
          paragraph.lines.flatMap((line) => line.words),
        ),
      );
      pages.push(toRows(words));
    }
    return pages;
  } finally {
    await worker.terminate();
  }
}

function isPng(bytes: Uint8Array) {
  const signature = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
  return signature.every((byte, index) => bytes[index] === byte);
}

function isJpeg(bytes: Uint8Array) {
  return bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
}

function imageSize(bytes: Uint8Array) {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  if (isPng(bytes) && bytes.length >= 24) {
    return { width: view.getUint32(16), height: view.getUint32(20) };
  }
  if (!isJpeg(bytes)) return undefined;
  let offset = 2;
  while (offset + 9 <= bytes.length && bytes[offset] === 0xff) {
    const marker = bytes[offset + 1];
    const isFrame =
      marker >= 0xc0 && marker <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marker);
    if (isFrame) {
      return {
        width: view.getUint16(offset + 7),
        height: view.getUint16(offset + 5),
      };
    }
    offset += 2 + view.getUint16(offset + 2);
  }
  return undefined;
}

type RecognisedWord = {
  text: string;
  confidence: number;
  bbox: { x0: number; y0: number; x1: number; y1: number };
};

// Words of one row share a vertical band; a scan has no exact baseline to compare.
function toRows(words: RecognisedWord[]): PdfPage {
  const rows: (Row & { middle: number; height: number })[] = [];
  const middle = (word: RecognisedWord) => (word.bbox.y0 + word.bbox.y1) / 2;
  for (const word of [...words].sort((a, b) => middle(a) - middle(b))) {
    const placed = {
      x: word.bbox.x0,
      text: word.text,
      unsure: word.confidence < minConfidence,
    };
    const row = rows.find(
      (r) => Math.abs(r.middle - middle(word)) <= r.height / 2,
    );
    if (row) row.words.push(placed);
    else
      rows.push({
        y: -middle(word),
        middle: middle(word),
        height: word.bbox.y1 - word.bbox.y0,
        words: [placed],
      });
  }
  return rows.map(({ y, words: placed }) => ({
    y,
    words: placed.sort((a, b) => a.x - b.x),
  }));
}
