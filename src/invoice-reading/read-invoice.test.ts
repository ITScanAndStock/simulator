import { readFile } from "node:fs/promises";
import { createCanvas } from "@napi-rs/canvas";
import { describe, expect, it } from "vitest";
import { doctorAiFakeExpected } from "../../test-invoices/doctor-ai-fake.expected";
import {
  doctorAiPhotoFakeExpected,
  doctorAiScannedFakeExpected,
} from "../../test-invoices/doctor-ai-scanned-fake.expected";
import { readInvoice } from "./read-invoice";

async function testInvoice(name: string) {
  return new Uint8Array(await readFile(`test-invoices/${name}`));
}

function emptyPdf(mediaBox: string) {
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    `<< /Type /Page /Parent 2 0 R /MediaBox ${mediaBox} >>`,
  ];
  let pdf = "%PDF-1.4\n";
  const offsets = objects.map((body, index) => {
    const offset = pdf.length;
    pdf += `${index + 1} 0 obj\n${body}\nendobj\n`;
    return offset;
  });
  const xref = pdf.length;
  pdf += `xref\n0 4\n0000000000 65535 f \n${offsets
    .map((offset) => `${String(offset).padStart(10, "0")} 00000 n \n`)
    .join("")}trailer\n<< /Size 4 /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  return new TextEncoder().encode(pdf);
}

describe("readInvoice", () => {
  // Catches: the list price taken for the price paid, a two-part designation cut short,
  // the spaced-out barcode read as a line, the en dash kept in references.
  it("reads the lines and the total of a Doctor AI invoice", async () => {
    const read = await readInvoice(await testInvoice("doctor-ai-fake.pdf"));

    expect(read).toEqual(doctorAiFakeExpected);
  });

  // Catches: a PDF without text layer left unread, a doubtful reference or price not flagged,
  // a flag put on a word read with confidence, a letter read in a reference turned into a figure.
  it("reads a scanned PDF through character recognition and flags its doubtful words", async () => {
    const read = await readInvoice(
      await testInvoice("doctor-ai-scanned-fake.pdf"),
    );

    expect(read).toEqual(doctorAiScannedFakeExpected);
  }, 30_000);

  // Catches: an image refused or read as a PDF, one of the two image formats left out.
  it.each(["doctor-ai-photo-fake.jpg", "doctor-ai-photo-fake.png"])(
    "reads the image %s through character recognition",
    async (name) => {
      const read = await readInvoice(await testInvoice(name));

      expect(read).toEqual(doctorAiPhotoFakeExpected);
    },
    30_000,
  );

  // Catches: an image whose pixels would take gigabytes to read sent to recognition anyway.
  it("does not read an image of more than 40 million pixels", async () => {
    const image = await createCanvas(6400, 6400).encode("png");

    expect(await readInvoice(new Uint8Array(image))).toEqual({
      status: "unreadable",
    });
  }, 30_000);

  // Catches: a page drawn far larger than any invoice rendered at 300 dpi anyway.
  it("does not render a scanned page of more than 40 million pixels", async () => {
    const page = emptyPdf("[0 0 1600 1600]");

    expect(await readInvoice(page)).toEqual({ status: "unreadable" });
  }, 30_000);

  // Catches: a supplier recognised from its name alone, which a stock export also prints.
  it("does not take a document that only names Doctor AI for its invoice", async () => {
    const read = await readInvoice(await testInvoice("stock-export-fake.pdf"));

    expect(read).toEqual({ status: "unsupported" });
  });

  // Catches: a damaged file that throws out of the reading instead of being reported.
  it("reports a file that is not a readable PDF", async () => {
    const read = await readInvoice(new TextEncoder().encode("%PDF-1.4 cut"));

    expect(read).toEqual({ status: "unreadable" });
  });

  // Catches: a Doctor AI document whose lines cannot be found throwing out of the reading.
  it("reports a Doctor AI document in which no line can be read", async () => {
    const read = await readInvoice(
      await testInvoice("doctor-ai-without-lines-fake.pdf"),
    );

    expect(read).toEqual({ status: "unreadable" });
  });
});
