import { readdirSync, readFileSync } from "node:fs";
import { expect, test } from "@playwright/test";
import {
  invoiceInput,
  openInvoicesStep,
  pdfFile,
  uploadedFile,
} from "./invoices-step";

function serverTemporaryFiles() {
  return readdirSync(process.env.E2E_SERVER_TMPDIR!, { recursive: true });
}

for (const { title, file, outcome } of [
  {
    title: "a read",
    file: pdfFile("lue.pdf", readFileSync("test-invoices/doctor-ai-fake.pdf")),
    outcome: "Lue · 4 lignes",
  },
  {
    title: "a failed read",
    file: pdfFile("abimee.pdf", Buffer.from("%PDF-1.4 cut")),
    outcome: "Non lue",
  },
]) {
  // Catches: the invoice written to a temporary file and kept, or deleted only when the reading succeeds.
  test(`no invoice file remains on the server after ${title}`, async ({
    page,
  }) => {
    await openInvoicesStep(page);
    const before = serverTemporaryFiles();

    await invoiceInput(page).setInputFiles(file);
    await expect(uploadedFile(page, file.name)).toContainText(outcome);

    expect(serverTemporaryFiles()).toEqual(before);
  });
}
