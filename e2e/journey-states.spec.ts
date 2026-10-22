import { randomUUID } from "node:crypto";
import { expect, test, type Page } from "@playwright/test";
import pg from "pg";
import {
  holdServerActions,
  invoiceInput,
  openInvoicesStep,
  uploadedFile,
} from "./invoices-step";

const computing = "Nous calculons votre économie";

async function expectComputing(page: Page) {
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(computing);
  await expect(page.getByText("Étape 4 sur 4", { exact: true })).toBeVisible();
  await expect(page.getByRole("progressbar")).toBeVisible();
}

// Catches: a file being read shown as done, or the calculation allowed before it is read.
test("screen 3 shows an invoice being read", async ({ page }) => {
  await openInvoicesStep(page);
  const release = await holdServerActions(page);

  await invoiceInput(page).setInputFiles("test-invoices/doctor-ai-fake.pdf");

  await expect(uploadedFile(page, "doctor-ai-fake.pdf")).toContainText(
    "Lecture en cours…",
  );
  await expect(
    page.getByRole("button", { name: "Vérifier les lignes lues" }),
  ).toBeDisabled();
  release();
  await expect(uploadedFile(page, "doctor-ai-fake.pdf")).toContainText(
    "Lue · 4 lignes",
  );
});

// Catches: screen 3 left as it was while the saving is computed, as if the click did nothing.
test("the calculation launched from screen 3 shows its progress", async ({
  page,
}) => {
  await openInvoicesStep(page);
  await invoiceInput(page).setInputFiles("test-invoices/doctor-ai-fake.pdf");
  await expect(uploadedFile(page, "doctor-ai-fake.pdf")).toContainText(
    "Lue · 4 lignes",
  );
  const release = await holdServerActions(page);

  await page.getByRole("button", { name: "Vérifier les lignes lues" }).click();

  await expectComputing(page);
  release();
  await expect(page).toHaveURL(/\/resultat$/);
});

// Catches: the calculation shown on the way to screen 4, as if the lines to verify were skipped.
test("the way to screen 4 does not show the calculation", async ({ page }) => {
  await openInvoicesStep(page);
  await invoiceInput(page).setInputFiles(
    "test-invoices/doctor-ai-misread-quantity-fake.pdf",
  );
  await expect(
    uploadedFile(page, "doctor-ai-misread-quantity-fake.pdf"),
  ).toContainText("Lue · 4 lignes");
  const release = await holdServerActions(page);

  await page.getByRole("button", { name: "Vérifier les lignes lues" }).click();

  await expect(page.getByRole("progressbar")).toHaveCount(0);
  await expect(page.getByText("Étape 2 sur 4", { exact: true })).toBeVisible();
  release();
  await expect(page).toHaveURL(/\/verification$/);
});

// Catches: screen 4 left as it was while the saving is computed.
test("the calculation launched from screen 4 shows its progress", async ({
  page,
}) => {
  await openInvoicesStep(page);
  await invoiceInput(page).setInputFiles(
    "test-invoices/doctor-ai-misread-quantity-fake.pdf",
  );
  await page.getByRole("button", { name: "Vérifier les lignes lues" }).click();
  await expect(page).toHaveURL(/\/verification$/);
  const release = await holdServerActions(page);

  await page
    .getByRole("button", { name: "Valider et calculer mon économie" })
    .click();

  await expectComputing(page);
  release();
  await expect(page).toHaveURL(/\/resultat$/);
});

async function openScreen4(page: Page) {
  await openInvoicesStep(page);
  await invoiceInput(page).setInputFiles(
    "test-invoices/doctor-ai-misread-quantity-fake.pdf",
  );
  await page.getByRole("button", { name: "Vérifier les lignes lues" }).click();
  await expect(page).toHaveURL(/\/verification$/);
}

// Catches: a Coompy failure shown as the error 500 page, or retrying with the line as read
// instead of its correction (2,27 € instead of 0,45 €, the gloves being unknown once corrected).
test("Coompy not answering shows the prices unavailable state", async ({
  page,
}) => {
  await openScreen4(page);
  await page
    .getByRole("rowgroup")
    .filter({ hasText: "GANTS NITRILE" })
    .getByLabel("Référence")
    .fill(`PANNE-${randomUUID().slice(0, 8)}`);

  await page
    .getByRole("button", { name: "Valider et calculer mon économie" })
    .click();

  await expect(page).toHaveURL(/\/tarifs-indisponibles$/);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "Votre simulation est enregistrée",
  );
  await expect(page.getByText(/^Les tarifs/)).toHaveText(
    "Les tarifs Club Santé Premium ne répondent pas pour le moment. Vos factures et vos corrections sont gardées : réessayez dans quelques minutes.",
  );
  await expect(
    page.getByRole("link", { name: "Prendre rendez-vous avec un conseiller" }),
  ).toHaveAttribute("href", "https://calendly.example/e2e");
  await page.getByRole("button", { name: "Réessayer" }).click();
  await expect(page).toHaveURL(/\/resultat$/);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "Sur votre facture, avec les tarifs Club Santé Premium, vous auriez payé 0,45 € de moins*",
  );
});

// Catches: an unexpected failure left as a blank page or as Next's bare error screen.
test("an unexpected failure shows the error 500 page", async ({ page }) => {
  await openInvoicesStep(page);
  await invoiceInput(page).setInputFiles("test-invoices/doctor-ai-fake.pdf");
  await expect(uploadedFile(page, "doctor-ai-fake.pdf")).toContainText(
    "Lue · 4 lignes",
  );
  const simulationId = new URL(page.url()).pathname.split("/")[2];

  await withSimulationUpdatesRefused(simulationId, async () => {
    await page
      .getByRole("button", { name: "Vérifier les lignes lues" })
      .click();

    await expect(page.getByRole("heading", { level: 1 })).toHaveText(
      "Un problème est survenu de notre côté",
    );
  });
  await expect(page.getByText(/^Code de l'incident/)).toHaveText(
    /^Code de l'incident à donner au support : \S+$/,
  );
  await expect(
    page.getByRole("link", { name: "Retour à l'accueil" }),
  ).toHaveAttribute("href", "/");
});

// The database refuses to update this simulation only, as a failing database would.
async function withSimulationUpdatesRefused(
  simulationId: string,
  run: () => Promise<void>,
) {
  const client = new pg.Client({
    connectionString: process.env.E2E_DATABASE_URL,
  });
  await client.connect();
  const name = `e2e_refuse_${simulationId.replaceAll("-", "")}`;
  try {
    await client.query(
      `CREATE FUNCTION ${name}() RETURNS trigger LANGUAGE plpgsql AS
       $$ BEGIN RAISE EXCEPTION 'refused by the journey test'; END $$`,
    );
    await client.query(
      `CREATE TRIGGER ${name} BEFORE UPDATE ON simulation FOR EACH ROW
       WHEN (OLD.id = '${simulationId}') EXECUTE FUNCTION ${name}()`,
    );
    await run();
  } finally {
    await client.query(`DROP FUNCTION IF EXISTS ${name}() CASCADE`);
    await client.end();
  }
}
