import { readFileSync } from "node:fs";
import { expect, test, type Page } from "@playwright/test";
import { e2eReferenceSupplier, fakeCoompyPort } from "./fake-coompy-settings";
import {
  invoiceInput,
  openInvoicesStep,
  pdfFile,
  uploadedFile,
} from "./invoices-step";

// Against e2e/fake-coompy.mts: 512-3344 (3 × 8,91 for 8,00) and 233-1002 compared,
// 412-0815 already cheaper, 233-1001 unknown.
async function expectResult(page: Page) {
  await expect(page.getByText("Étape 4 sur 4", { exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "Sur votre facture, avec les tarifs Club Santé Premium, vous auriez payé 3,18 € de moins*",
  );
  await expect(page.getByText(/^En moyenne/)).toHaveText(
    "En moyenne, nos affiliés économisent 31 200 € par an",
  );
  const totals = page.getByRole("definition");
  await expect(totals).toHaveText(["31,23 €", "28,05 €", "−10,2 %"]);
  const compared = page.getByRole("group", { name: "Comparées" });
  await expect(compared).toContainText("2 lignes sur 4");
  await expect(compared).toContainText("38 % du montant de vos factures");
  await expect(page.getByRole("group", { name: "À étudier" })).toContainText(
    "1 produit",
  );
  await expect(
    page.getByRole("group", { name: "Déjà moins cher" }),
  ).toContainText("1 produit");
  await expect(
    page.getByRole("link", { name: "Prendre rendez-vous avec un conseiller" }),
  ).toHaveAttribute("href", "https://calendly.example/e2e");
  await expect(page.getByText(/Vous utilisez déjà Scan&Stock/)).toHaveCount(0);
}

// Catches: a line counted in the wrong state, the saving taken on one unit, a dearer
// reference price counted as a negative saving, an unknown line kept in the paid total,
// or the average figure and Calendly link not taken from the server settings.
test("a read invoice leads to its saving on screen 5", async ({ page }) => {
  await openInvoicesStep(page);
  await invoiceInput(page).setInputFiles("test-invoices/doctor-ai-fake.pdf");
  await expect(uploadedFile(page, "doctor-ai-fake.pdf")).toContainText(
    "Lue · 4 lignes",
  );

  await page.getByRole("button", { name: "Vérifier les lignes lues" }).click();

  await expect(page).toHaveURL(/\/simulations\/[0-9a-f-]{36}\/resultat$/);
  await expectResult(page);
});

// Catches: a result computed in the browser and lost, instead of stored with the simulation.
test("the result of a simulation is stored", async ({ page, browser }) => {
  await openInvoicesStep(page);
  await invoiceInput(page).setInputFiles("test-invoices/doctor-ai-fake.pdf");
  await expect(uploadedFile(page, "doctor-ai-fake.pdf")).toContainText(
    "Lue · 4 lignes",
  );
  await page.getByRole("button", { name: "Vérifier les lignes lues" }).click();
  await expect(page).toHaveURL(/\/resultat$/);

  const elsewhere = await browser.newContext();
  const reopened = await elsewhere.newPage();
  await reopened.goto(new URL(page.url()).pathname);

  await expectResult(reopened);
  await elsewhere.close();
});

// Catches: an invoice read before leaving screen 3, and no longer listed, counted again.
test("only the invoices listed on screen 3 are counted", async ({ page }) => {
  await openInvoicesStep(page);
  await invoiceInput(page).setInputFiles("test-invoices/doctor-ai-fake.pdf");
  await expect(uploadedFile(page, "doctor-ai-fake.pdf")).toContainText(
    "Lue · 4 lignes",
  );
  await page.getByRole("link", { name: "Retour" }).click();
  await page.getByRole("button", { name: "Continuer" }).click();
  await expect(page).toHaveURL(/\/factures$/);
  await invoiceInput(page).setInputFiles("test-invoices/doctor-ai-fake.pdf");
  await expect(uploadedFile(page, "doctor-ai-fake.pdf")).toContainText(
    "Lue · 4 lignes",
  );

  await page.getByRole("button", { name: "Vérifier les lignes lues" }).click();

  await expect(page).toHaveURL(/\/resultat$/);
  await expectResult(page);
});

// Catches: an invoice removed from screen 3 counted in the saving (6,36 € instead of 3,18 €).
test("an invoice removed from screen 3 is not counted", async ({ page }) => {
  await openInvoicesStep(page);
  const fake = readFileSync("test-invoices/doctor-ai-fake.pdf");
  await invoiceInput(page).setInputFiles([
    pdfFile("facture-1.pdf", fake),
    pdfFile("facture-2.pdf", fake),
  ]);
  await expect(uploadedFile(page, "facture-2.pdf")).toContainText(
    "Lue · 4 lignes",
  );

  await page.getByRole("button", { name: "Retirer facture-2.pdf" }).click();
  await page.getByRole("button", { name: "Vérifier les lignes lues" }).click();

  await expect(page).toHaveURL(/\/resultat$/);
  await expectResult(page);
});

// Catches: the status declared on screen 2 lost before screen 5.
test("screen 5 speaks to a declared Scan&Stock user", async ({ page }) => {
  await openInvoicesStep(page, { scanAndStockUser: true });
  await invoiceInput(page).setInputFiles("test-invoices/doctor-ai-fake.pdf");
  await expect(uploadedFile(page, "doctor-ai-fake.pdf")).toContainText(
    "Lue · 4 lignes",
  );

  await page.getByRole("button", { name: "Vérifier les lignes lues" }).click();

  await expect(page).toHaveURL(/\/resultat$/);
  await expect(
    page.getByText(
      "Vous utilisez déjà Scan&Stock : l’adhésion Club Santé Premium vous donnerait accès à ces tarifs.",
    ),
  ).toBeVisible();
});

// Catches: a reference supplier written in the code instead of read from the settings,
// or the Doctor AI trial banner shown for another reference.
test("Coompy is asked for the reference supplier of the settings", async ({
  page,
  request,
}) => {
  await openInvoicesStep(page);
  await invoiceInput(page).setInputFiles("test-invoices/doctor-ai-fake.pdf");
  await expect(uploadedFile(page, "doctor-ai-fake.pdf")).toContainText(
    "Lue · 4 lignes",
  );
  await page.getByRole("button", { name: "Vérifier les lignes lues" }).click();
  await expect(page).toHaveURL(/\/resultat$/);

  await expect(page.getByText(/^Version d'essai/)).toHaveCount(0);
  const asked: string[][] = await (
    await request.get(`http://127.0.0.1:${fakeCoompyPort}/requests`)
  ).json();
  expect(asked.length).toBeGreaterThan(0);
  for (const providers of asked)
    expect(providers).toContain(e2eReferenceSupplier);
});
