import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { expect, test, type Page } from "@playwright/test";

async function openInvoicesStep(page: Page) {
  await page.goto("/coordonnees");
  await page
    .getByLabel("Email professionnel", { exact: true })
    .fill(`claire.martin+${randomUUID()}@cabinet-tilleuls.fr`);
  await page
    .getByLabel("Nom du cabinet", { exact: true })
    .fill("Cabinet dentaire des Tilleuls");
  await page
    .getByLabel("Nom du praticien", { exact: true })
    .fill("Dr Claire Martin");
  await page.getByLabel("Téléphone", { exact: true }).fill("0472123456");
  await page
    .getByRole("checkbox", {
      name: "J'ai lu l'information sur le traitement de mes données.",
      exact: true,
    })
    .check();
  await page.getByRole("button", { name: "Continuer" }).click();
  await expect(page).toHaveURL(/\/factures$/);
}

function uploadedFile(page: Page, name: string) {
  return page.getByRole("listitem").filter({ hasText: name });
}

// Catches: a Doctor AI invoice not read, or its line count not shown next to its file.
test("a Doctor AI invoice dropped on screen 3 is read", async ({ page }) => {
  await openInvoicesStep(page);

  await page
    .getByLabel("Glissez vos factures ici, ou choisissez des fichiers")
    .setInputFiles("test-invoices/doctor-ai-fake.pdf");

  await expect(uploadedFile(page, "doctor-ai-fake.pdf")).toContainText(
    "Lue · 4 lignes",
  );
});

// Catches: a document of an unsupported supplier shown as read, or left reading forever.
test("a document that is not a Doctor AI invoice is shown as not read", async ({
  page,
}) => {
  await openInvoicesStep(page);

  await page
    .getByLabel("Glissez vos factures ici, ou choisissez des fichiers")
    .setInputFiles("test-invoices/stock-export-fake.pdf");

  await expect(uploadedFile(page, "stock-export-fake.pdf")).toContainText(
    "Non lue",
  );
});

// Catches: a sixth invoice taken in, by one choice or by a second one.
test("screen 3 takes 5 invoices at most", async ({ page }) => {
  await openInvoicesStep(page);
  const fake = readFileSync("test-invoices/doctor-ai-fake.pdf");
  const input = page.getByLabel(
    "Glissez vos factures ici, ou choisissez des fichiers",
  );

  await input.setInputFiles(
    [1, 2, 3, 4].map((n) => ({
      name: `facture-${n}.pdf`,
      mimeType: "application/pdf",
      buffer: fake,
    })),
  );
  await input.setInputFiles(
    [5, 6].map((n) => ({
      name: `facture-${n}.pdf`,
      mimeType: "application/pdf",
      buffer: fake,
    })),
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

  await page
    .getByLabel("Glissez vos factures ici, ou choisissez des fichiers")
    .setInputFiles({
      name: "trop-lourde.pdf",
      mimeType: "application/pdf",
      buffer: Buffer.alloc(11 * 1024 * 1024),
    });

  // The refusal took 0.7 s or about 7 s over 8 runs.
  await expect(uploadedFile(page, "trop-lourde.pdf")).toContainText("Non lue", {
    timeout: 15_000,
  });
});
