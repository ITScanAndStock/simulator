import { readFileSync } from "node:fs";
import { expect, test } from "@playwright/test";
import {
  holdServerActions,
  invoiceInput,
  openInvoicesStep,
  pdfFile,
  toast,
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

// Catches: a sixth invoice taken in, by one choice or by a second one, or refused silently.
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
  await expect(toast(page)).toHaveText([
    "5 factures au plus« facture-6.pdf » n'a pas été ajoutée : vous avez déjà déposé 5 factures.",
  ]);
});

// Catches: a file of another type sent for reading, or taking one of the 5 places.
test("a file that is not a PDF is refused", async ({ page }) => {
  await openInvoicesStep(page);
  const fake = readFileSync("test-invoices/doctor-ai-fake.pdf");

  await invoiceInput(page).setInputFiles([
    { name: "facture.docx", mimeType: "application/msword", buffer: fake },
    ...[1, 2, 3, 4, 5].map((n) => pdfFile(`facture-${n}.pdf`, fake)),
  ]);

  await expect(toast(page)).toHaveText([
    "Format non accepté« facture.docx » n'est pas accepté : déposez un PDF.",
  ]);
  await expect(page.getByText(/^facture-\d\.pdf$/)).toHaveCount(5);
  await expect(uploadedFile(page, "facture.docx")).toHaveCount(0);
});

// Catches: an error toast that cannot be closed.
test("an error toast closes", async ({ page }) => {
  await openInvoicesStep(page);
  await invoiceInput(page).setInputFiles({
    name: "facture.txt",
    mimeType: "text/plain",
    buffer: Buffer.from("facture"),
  });
  await expect(toast(page)).toHaveCount(1);

  await toast(page).getByRole("button", { name: "Fermer" }).click();

  await expect(toast(page)).toHaveCount(0);
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

// Catches: a file over the maximum sent to the server, which refuses it only past 10 MB
// and after up to 7 s, one exactly at the maximum refused, or the default maximum (4 Mo)
// kept instead of the setting.
test("a file over the maximum size is refused before sending", async ({
  page,
}) => {
  await openInvoicesStep(page);
  await expect(page.getByText(/au plus/).first()).toHaveText(
    "PDF · 3 Mo au plus · 5 factures au plus",
  );
  await invoiceInput(page).setInputFiles([
    pdfFile("trop-lourde.pdf", Buffer.alloc(3 * 1024 * 1024 + 1)),
    pdfFile("juste-assez.pdf", Buffer.alloc(3 * 1024 * 1024)),
  ]);

  await expect(toast(page)).toHaveText([
    "Fichier trop lourd« trop-lourde.pdf » dépasse 3 Mo : compressez-le.",
  ]);
  await expect(uploadedFile(page, "trop-lourde.pdf")).toHaveCount(0);
  await expect(uploadedFile(page, "juste-assez.pdf")).toHaveCount(1);
});

// Catches: no word when nothing could be read, or the message shown while an invoice is
// still being read or kept once one is read.
test("screen 3 says when no invoice could be read", async ({ page }) => {
  await openInvoicesStep(page);
  const noneReadable = page.getByRole("alert").filter({
    hasText: "Aucune facture n'a pu être lue",
  });

  await invoiceInput(page).setInputFiles("test-invoices/stock-export-fake.pdf");

  await expect(noneReadable).toHaveText(
    "Aucune facture n'a pu être lueNous ne pouvons pas calculer votre économie sans au moins une facture lisible. Essayez un PDF envoyé par votre fournisseur.",
  );
  const release = await holdServerActions(page);
  await invoiceInput(page).setInputFiles("test-invoices/doctor-ai-fake.pdf");
  await expect(uploadedFile(page, "doctor-ai-fake.pdf")).toContainText(
    "Lecture en cours…",
  );
  await expect(noneReadable).toHaveCount(0);
  release();
  await expect(uploadedFile(page, "doctor-ai-fake.pdf")).toContainText(
    "Lue · 4 lignes",
  );
  await expect(noneReadable).toHaveCount(0);
});

// Catches: a removed file still listed, or still holding one of the 5 places.
test("a listed file can be removed", async ({ page }) => {
  await openInvoicesStep(page);
  const fake = readFileSync("test-invoices/doctor-ai-fake.pdf");
  await invoiceInput(page).setInputFiles(
    [1, 2, 3, 4, 5].map((n) => pdfFile(`facture-${n}.pdf`, fake)),
  );

  await page.getByRole("button", { name: "Retirer facture-2.pdf" }).click();
  await invoiceInput(page).setInputFiles(pdfFile("facture-6.pdf", fake));

  await expect(page.getByText(/^facture-\d\.pdf$/)).toHaveText(
    [1, 3, 4, 5, 6].map((n) => `facture-${n}.pdf`),
  );
  await expect(toast(page)).toHaveCount(0);
});
