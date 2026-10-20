import { readFileSync } from "node:fs";
import { expect, test } from "@playwright/test";
import {
  invoiceInput,
  openInvoicesStep,
  pdfFile,
  uploadedFile,
} from "./invoices-step";

// Catches: a Doctor AI invoice not read, or its line count not shown next to its file.
test("a Doctor AI invoice dropped on screen 3 is read", async ({ page }) => {
  await openInvoicesStep(page);

  await invoiceInput(page).setInputFiles("test-invoices/doctor-ai-fake.pdf");

  await expect(uploadedFile(page, "doctor-ai-fake.pdf")).toContainText(
    "Lue · 4 lignes",
  );
});

// Catches: a document of an unsupported supplier shown as read, or left reading forever.
test("a document that is not a Doctor AI invoice is shown as not read", async ({
  page,
}) => {
  await openInvoicesStep(page);

  await invoiceInput(page).setInputFiles("test-invoices/stock-export-fake.pdf");

  await expect(uploadedFile(page, "stock-export-fake.pdf")).toContainText(
    "Non lue",
  );
});

// Catches: a sixth invoice taken in, by one choice or by a second one.
test("screen 3 takes 5 invoices at most", async ({ page }) => {
  await openInvoicesStep(page);
  const fake = readFileSync("test-invoices/doctor-ai-fake.pdf");
  const input = invoiceInput(page);

  await input.setInputFiles(
    [1, 2, 3, 4].map((n) => pdfFile(`facture-${n}.pdf`, fake)),
  );
  await input.setInputFiles(
    [5, 6].map((n) => pdfFile(`facture-${n}.pdf`, fake)),
  );

  await expect(page.getByText(/^facture-\d\.pdf$/)).toHaveText(
    [1, 2, 3, 4, 5].map((n) => `facture-${n}.pdf`),
  );
});

// Catches: files dropped on the zone ignored, or opened by the browser instead of read.
test("an invoice dragged onto the zone is read", async ({ page }) => {
  await openInvoicesStep(page);
  const bytes = [...readFileSync("test-invoices/doctor-ai-fake.pdf")];

  const dataTransfer = await page.evaluateHandle((content) => {
    const transfer = new DataTransfer();
    transfer.items.add(
      new File([new Uint8Array(content)], "glissee.pdf", {
        type: "application/pdf",
      }),
    );
    return transfer;
  }, bytes);
  await page
    .getByText("Glissez vos factures ici, ou choisissez des fichiers")
    .dispatchEvent("drop", { dataTransfer });

  await expect(uploadedFile(page, "glissee.pdf")).toContainText(
    "Lue · 4 lignes",
  );
});

// Catches: a file the server refuses left on "Lecture en cours…" forever.
test("a file too large for the server is shown as not read", async ({
  page,
}) => {
  await openInvoicesStep(page);

  await invoiceInput(page).setInputFiles(
    pdfFile("trop-lourde.pdf", Buffer.alloc(11 * 1024 * 1024)),
  );

  // The refusal took 0.7 s or about 7 s over 8 runs.
  await expect(uploadedFile(page, "trop-lourde.pdf")).toContainText("Non lue", {
    timeout: 15_000,
  });
});
