import { expect, test, type Page } from "@playwright/test";
import { invoiceInput, openInvoicesStep, uploadedFile } from "./invoices-step";

// The gloves 512-3344 are read with 2 delivered for an amount of 3 × 8,91. Against
// e2e/fake-coompy.mts, each glove saves 0,91 and each compress 0,45.
const gloves = "GANTS NITRILE NON POUDRES T.M (100) ACME";
const compresses = "COMPRESSES STERILES – 7,5X7,5CM (50)";

async function openScreen4(page: Page, invoice: string) {
  await openInvoicesStep(page);
  await invoiceInput(page).setInputFiles(`test-invoices/${invoice}`);
  await expect(uploadedFile(page, invoice)).toContainText("Lue · 4 lignes");
  await page.getByRole("button", { name: "Vérifier les lignes lues" }).click();
  await expect(page).toHaveURL(/\/simulations\/[0-9a-f-]{36}\/verification$/);
}

function line(page: Page, designation: string) {
  return page.getByRole("rowgroup").filter({ hasText: designation });
}

function savingHeading(saving: string) {
  return `Sur votre facture, avec les tarifs Club Santé Premium, vous auriez payé ${saving} de moins*`;
}

// Catches: a doubtful line not sent to screen 4, shown without its reason, or skipping
// that computes with a figure typed on screen 4 instead of the line as read.
test("a doubtful line is shown on screen 4 and skipping keeps it as read", async ({
  page,
}) => {
  await openScreen4(page, "doctor-ai-misread-quantity-fake.pdf");

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
  await expect(page.getByRole("rowgroup")).toHaveCount(2);
  const doubtful = line(page, gloves);
  await expect(doubtful.getByLabel("Référence")).toHaveValue("512-3344");
  await expect(doubtful.getByLabel("Quantité")).toHaveValue("2");
  await expect(doubtful.getByLabel("Prix unitaire payé")).toHaveValue(
    /^8,91\s€$/,
  );
  await expect(doubtful).toContainText(
    "À vérifierMontant incohérent : 2 × 8,91 € font 17,82 €, la facture indique 26,73 €.",
  );

  await doubtful.getByLabel("Quantité").fill("3");
  await page.getByRole("button", { name: "Passer cette étape" }).click();

  await expect(page).toHaveURL(/\/resultat$/);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    savingHeading("2,27 €"),
  );
});

// Catches: a correction ignored by the calculation (2,27 € instead of 3 × 0,91 + 0,45),
// or not stored with the simulation.
test("a corrected line changes the total and is stored", async ({
  page,
  browser,
}) => {
  await openScreen4(page, "doctor-ai-misread-quantity-fake.pdf");
  const verificationPath = new URL(page.url()).pathname;

  await line(page, gloves).getByLabel("Quantité").fill("3");
  await page
    .getByRole("button", { name: "Valider et calculer mon économie" })
    .click();

  await expect(page).toHaveURL(/\/resultat$/);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    savingHeading("3,18 €"),
  );
  const elsewhere = await browser.newContext();
  const reopened = await elsewhere.newPage();
  await reopened.goto(verificationPath);
  await expect(line(reopened, gloves).getByLabel("Quantité")).toHaveValue("3");
  await elsewhere.close();
});

// Catches: a removed line still counted (+0,45), an added line left out (−0,90), or the
// other lines not reachable.
test("lines can be removed, added, and the other lines looked at", async ({
  page,
}) => {
  await openScreen4(page, "doctor-ai-misread-quantity-fake.pdf");
  await line(page, gloves).getByLabel("Quantité").fill("3");

  await page
    .getByRole("button", { name: "Voir aussi les 3 autres lignes" })
    .click();
  await expect(page.getByRole("rowgroup")).toHaveCount(5);
  await line(page, compresses)
    .getByRole("button", { name: "Supprimer la ligne" })
    .click();
  await expect(line(page, compresses)).toHaveText(
    `« ${compresses} » ne sera pas comptée. Annuler`,
  );
  await page
    .getByRole("button", { name: "+ Ajouter une ligne oubliée" })
    .click();
  const added = page.getByRole("rowgroup").last();
  await added.getByLabel("Référence").fill("233-1002");
  await added.getByLabel("Désignation").fill("Compresses stériles");
  await added.getByLabel("Quantité").fill("2");
  await added.getByLabel("Prix unitaire payé").fill("4,50");
  await page
    .getByRole("button", { name: "Valider et calculer mon économie" })
    .click();

  await expect(page).toHaveURL(/\/resultat$/);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    savingHeading("3,63 €"),
  );
});

// Catches: a quantity of 0, an empty or malformed price accepted, or no message telling
// which field to fix.
test("invalid corrections are refused field by field", async ({ page }) => {
  await openScreen4(page, "doctor-ai-misread-quantity-fake.pdf");
  const doubtful = line(page, gloves);

  await doubtful.getByLabel("Quantité").fill("0");
  await doubtful.getByLabel("Prix unitaire payé").fill("8,9,1");
  await page
    .getByRole("button", { name: "Valider et calculer mon économie" })
    .click();

  await expect(page).toHaveURL(/\/verification$/);
  await expect(doubtful.getByLabel("Quantité")).toHaveAccessibleDescription(
    "La quantité doit être un nombre entier supérieur à 0.",
  );
  await expect(
    doubtful.getByLabel("Prix unitaire payé"),
  ).toHaveAccessibleDescription(
    "« 8,9,1 » n'est pas un prix : écrivez par exemple 38,50.",
  );

  await doubtful.getByLabel("Prix unitaire payé").fill("");
  await page
    .getByRole("button", { name: "Valider et calculer mon économie" })
    .click();

  await expect(
    doubtful.getByLabel("Prix unitaire payé"),
  ).toHaveAccessibleDescription("Indiquez le prix unitaire payé.");
});

// Catches: the lines of an invoice whose total is off counted as doubtful, the invoice
// not flagged, or its lines hidden.
test("an invoice whose lines do not add up to its total is flagged on screen 4", async ({
  page,
}) => {
  await openScreen4(page, "doctor-ai-total-off-fake.pdf");

  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "Une facture à vérifier",
  );
  await expect(page.getByText(/^Les lignes lues font/)).toHaveText(
    "Les lignes lues font 80,23 € alors que la facture totalise 85,00 € : une ligne a peut-être été oubliée ou mal lue.",
  );
  await expect(
    page.getByRole("list", { name: "Lignes lues" }).getByRole("listitem"),
  ).toHaveText(["4 lignes lues", "4 lues sans doute", "0 à vérifier"]);
  await expect(page.getByRole("rowgroup")).toHaveCount(5);
  await expect(page.getByText("À vérifier", { exact: true })).toHaveCount(0);
});
