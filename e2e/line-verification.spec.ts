import { expect, test } from "@playwright/test";
import { invoiceInput, openInvoicesStep, uploadedFile } from "./invoices-step";

// Catches: a doubtful line not sent to screen 4, shown without its reason, or skipping
// that does not compute with the line as read. The gloves 512-3344 are read with 2
// delivered for an amount of 3 × 8,91: against e2e/fake-coompy.mts, as read they save
// 2 × 0,91, plus 0,45 on the compresses.
test("a doubtful line is shown on screen 4 and skipping keeps it as read", async ({
  page,
}) => {
  await openInvoicesStep(page);
  await invoiceInput(page).setInputFiles(
    "test-invoices/doctor-ai-misread-quantity-fake.pdf",
  );
  await expect(
    uploadedFile(page, "doctor-ai-misread-quantity-fake.pdf"),
  ).toContainText("Lue · 4 lignes");

  await page.getByRole("button", { name: "Vérifier les lignes lues" }).click();

  await expect(page).toHaveURL(/\/simulations\/[0-9a-f-]{36}\/verification$/);
  await expect(page.getByText("Étape 3 sur 4", { exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "Une ligne à vérifier",
  );
  await expect(page.getByText(/^Nous avons lu/)).toHaveText(
    "Nous avons lu votre facture. Sur cette ligne, une erreur de lecture est probable : corrigez-la si besoin, ou passez cette étape.",
  );
  await expect(
    page.getByRole("list", { name: "Lignes lues" }).getByRole("listitem"),
  ).toHaveText(["4 lignes lues", "3 lues sans doute", "1 à vérifier"]);
  const rows = page.getByRole("row");
  await expect(rows.nth(1)).toHaveText(
    [
      "512-3344",
      "GANTS NITRILE NON POUDRES T.M (100) ACME",
      "2",
      "8,91 €",
    ].join(""),
  );
  await expect(rows.nth(2)).toHaveText(
    "À vérifierMontant incohérent : 2 × 8,91 € font 17,82 €, la facture indique 26,73 €.",
  );

  await page.getByRole("button", { name: "Passer cette étape" }).click();

  await expect(page).toHaveURL(/\/resultat$/);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "Sur votre facture, avec les tarifs Club Santé Premium, vous auriez payé 2,27 € de moins*",
  );
});

// Catches: the lines of an invoice whose total is off counted as doubtful, the invoice
// not flagged, or its lines hidden.
test("an invoice whose lines do not add up to its total is flagged on screen 4", async ({
  page,
}) => {
  await openInvoicesStep(page);
  await invoiceInput(page).setInputFiles(
    "test-invoices/doctor-ai-total-off-fake.pdf",
  );
  await expect(
    uploadedFile(page, "doctor-ai-total-off-fake.pdf"),
  ).toContainText("Lue · 4 lignes");

  await page.getByRole("button", { name: "Vérifier les lignes lues" }).click();

  await expect(page).toHaveURL(/\/verification$/);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "Une facture à vérifier",
  );
  await expect(page.getByText(/^Les lignes lues font/)).toHaveText(
    "Les lignes lues font 80,23 € alors que la facture totalise 85,00 € : une ligne a peut-être été oubliée ou mal lue.",
  );
  await expect(
    page.getByRole("list", { name: "Lignes lues" }).getByRole("listitem"),
  ).toHaveText(["4 lignes lues", "4 lues sans doute", "0 à vérifier"]);
  await expect(page.getByRole("row")).toHaveCount(5);
  await expect(page.getByText("À vérifier", { exact: true })).toHaveCount(0);
});
