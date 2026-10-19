import { randomUUID } from "node:crypto";
import { expect, test, type Locator, type Page } from "@playwright/test";

const dataInformationLabel =
  "J'ai lu l'information sur le traitement de mes données.";

function field(page: Page, label: string) {
  return page.getByLabel(label, { exact: true });
}

function dataInformationBox(page: Page) {
  return page.getByRole("checkbox", {
    name: dataInformationLabel,
    exact: true,
  });
}

function summary(page: Page) {
  return page
    .getByRole("alert")
    .filter({ hasText: /à corriger avant de continuer\.$/ });
}

function dataInformationToast(page: Page) {
  return page
    .getByRole("status")
    .filter({ hasText: "Information sur vos données" });
}

async function expectPointedOut(locator: Locator, message: string) {
  await expect(locator).toHaveAttribute("aria-invalid", "true");
  await expect(locator).toHaveAccessibleDescription(message);
}

async function typeInto(page: Page, label: string, value: string) {
  const input = field(page, label);
  await input.click();
  await input.clear();
  await input.pressSequentially(value);
}

async function continueOnScreen2(page: Page) {
  const before = page.url();
  await page.getByRole("button", { name: "Continuer" }).click();
  await expect(
    summary(page).or(dataInformationToast(page)).first(),
  ).toBeVisible();
  expect(page.url()).toBe(before);
}

async function fillValidly(page: Page, phone = "04 72 12 34 56") {
  const email = `claire.martin+${randomUUID()}@cabinet-tilleuls.fr`;
  await typeInto(page, "Email professionnel", email);
  await typeInto(page, "Nom du cabinet", "Cabinet dentaire des Tilleuls");
  await typeInto(page, "Nom du praticien", "Dr Claire Martin");
  await typeInto(page, "Téléphone", phone);
  return email;
}

async function continueToInvoices(page: Page) {
  await page.getByRole("button", { name: "Continuer" }).click();
  await expect(page).toHaveURL(/\/simulations\/[0-9a-f-]{36}\/factures$/);
  return new URL(page.url()).pathname.split("/")[2];
}

test.beforeEach(async ({ page }) => {
  await page.goto("/coordonnees");
});

test("an empty entry is refused, each required field pointed out with its message and the first one focused", async ({
  page,
}) => {
  await continueOnScreen2(page);

  await expectPointedOut(
    field(page, "Email professionnel"),
    "Indiquez votre email professionnel.",
  );
  await expectPointedOut(
    field(page, "Nom du cabinet"),
    "Indiquez le nom du cabinet.",
  );
  await expectPointedOut(
    field(page, "Nom du praticien"),
    "Indiquez le nom du praticien.",
  );
  await expectPointedOut(
    field(page, "Téléphone"),
    "Indiquez votre numéro de téléphone.",
  );
  await expectPointedOut(
    dataInformationBox(page),
    "Cochez cette case pour continuer.",
  );
  await expect(summary(page)).toHaveText(
    "4 champs à corriger avant de continuer.",
  );
  await expect(dataInformationToast(page)).toContainText(
    "Cochez la case « J'ai lu l'information sur le traitement de mes données » pour continuer.",
  );
  await expect(page).toHaveURL("/coordonnees");
  await expect(field(page, "Email professionnel")).toBeFocused();
});

test("badly formed values are refused by the server and every typed value and box state survives the reset", async ({
  page,
}) => {
  await typeInto(page, "Email professionnel", "contact@cabinet-exemple");
  await typeInto(page, "Nom du cabinet", "Cabinet dentaire des Tilleuls");
  await typeInto(page, "Téléphone", "04 72 00");
  const scanAndStock = page.getByRole("checkbox", {
    name: "utilisateur de Scan&Stock",
  });
  const callBack = page.getByRole("checkbox", {
    name: /^J'accepte d'être recontacté/,
  });
  await scanAndStock.click();
  await callBack.click();
  await dataInformationBox(page).click();

  await continueOnScreen2(page);

  await expectPointedOut(
    field(page, "Email professionnel"),
    "Adresse incomplète : il manque l'extension (.fr, .com…).",
  );
  await expectPointedOut(
    field(page, "Téléphone"),
    "Numéro incomplet : 10 chiffres attendus.",
  );
  await expectPointedOut(
    field(page, "Nom du praticien"),
    "Indiquez le nom du praticien.",
  );
  await expect(summary(page)).toHaveText(
    "3 champs à corriger avant de continuer.",
  );
  await expect(field(page, "Nom du cabinet")).not.toHaveAttribute(
    "aria-invalid",
  );
  await expect(dataInformationBox(page)).not.toHaveAttribute("aria-invalid");
  await expect(dataInformationToast(page)).toHaveCount(0);

  await expect(field(page, "Email professionnel")).toHaveValue(
    "contact@cabinet-exemple",
  );
  await expect(field(page, "Nom du cabinet")).toHaveValue(
    "Cabinet dentaire des Tilleuls",
  );
  await expect(field(page, "Téléphone")).toHaveValue("04 72 00");
  await expect(scanAndStock).toBeChecked();
  await expect(
    page.getByRole("checkbox", { name: "affilié Club Santé Premium" }),
  ).not.toBeChecked();
  await expect(callBack).not.toBeChecked();
  await expect(dataInformationBox(page)).toBeChecked();
});

test("a single field left to fix is counted in the singular", async ({
  page,
}) => {
  await typeInto(page, "Email professionnel", "claire.martin@cabinet.fr");
  await typeInto(page, "Nom du cabinet", "Cabinet dentaire des Tilleuls");
  await typeInto(page, "Nom du praticien", "Dr Claire Martin");
  await typeInto(page, "Téléphone", "+44 20 7946 0958");
  await dataInformationBox(page).click();

  await continueOnScreen2(page);

  await expect(summary(page)).toHaveText(
    "1 champ à corriger avant de continuer.",
  );
  await expectPointedOut(
    field(page, "Téléphone"),
    "Numéro non reconnu : indiquez un numéro français à 10 chiffres.",
  );
});

test("journey: valid contact details without an email go no further than screen 2", async ({
  page,
}) => {
  await fillValidly(page);
  await field(page, "Email professionnel").clear();
  await dataInformationBox(page).click();

  await continueOnScreen2(page);

  await expect(page).toHaveURL("/coordonnees");
  await expect(summary(page)).toHaveText(
    "1 champ à corriger avant de continuer.",
  );
  await expectPointedOut(
    field(page, "Email professionnel"),
    "Indiquez votre email professionnel.",
  );
});

test("journey: valid contact details without the data-information box go no further than screen 2", async ({
  page,
}) => {
  await fillValidly(page);

  await continueOnScreen2(page);

  await expect(page).toHaveURL("/coordonnees");
  await expect(summary(page)).toHaveCount(0);
  await expectPointedOut(
    dataInformationBox(page),
    "Cochez cette case pour continuer.",
  );
  await expect(dataInformationBox(page)).toBeFocused();
});

test("the data-information toast's link opens the data information window", async ({
  page,
}) => {
  await continueOnScreen2(page);
  const toast = dataInformationToast(page);

  await toast.getByRole("button", { name: "Lire l'information" }).click();
  const window = page.getByRole("dialog", {
    name: "Vos données et vos factures",
  });
  await expect(window).toBeVisible();
  await window.getByRole("button", { name: "J'ai compris" }).click();
  await expect(window).toBeHidden();
});

test("Fermer closes the toast, hands the focus to the data-information box, and the next refused Continuer shows it again", async ({
  page,
}) => {
  await fillValidly(page);
  await continueOnScreen2(page);
  const toast = dataInformationToast(page);
  await expect(toast).toBeVisible();

  await toast.getByRole("button", { name: "Fermer" }).focus();
  await page.keyboard.press("Enter");

  await expect(toast).toHaveCount(0);
  await expect(dataInformationBox(page)).toBeFocused();

  await page.getByRole("button", { name: "Continuer" }).click();
  await expect(toast).toBeVisible();
  await expect(page).toHaveURL("/coordonnees");
});

for (const typed of [
  "+33 4 72 12 34 56",
  "0033 4 72 12 34 56",
  "+33 (0)4 72 12 34 56",
  "+33 0472123456",
]) {
  test(`the French number "${typed}" is accepted and reopens as 0472123456`, async ({
    page,
  }) => {
    await fillValidly(page, typed);
    await dataInformationBox(page).click();

    const simulation = await continueToInvoices(page);

    await page.goto(`/simulations/${simulation}/coordonnees`);
    await expect(field(page, "Téléphone")).toHaveValue("0472123456");
  });
}

test("an address ending with a dot gets the generic message, not the missing-extension one", async ({
  page,
}) => {
  await typeInto(page, "Email professionnel", "nom@cabinet.fr.");

  await continueOnScreen2(page);

  await expectPointedOut(
    field(page, "Email professionnel"),
    "Vérifiez l'adresse : elle doit ressembler à nom@cabinet.fr.",
  );
});

test("the practice and practitioner names are stored without their surrounding spaces", async ({
  page,
}) => {
  await fillValidly(page);
  await typeInto(page, "Nom du cabinet", "  Cabinet dentaire des Tilleuls  ");
  await typeInto(page, "Nom du praticien", "  Dr Claire Martin  ");
  await dataInformationBox(page).click();

  const simulation = await continueToInvoices(page);

  await page.goto(`/simulations/${simulation}/coordonnees`);
  await expect(field(page, "Nom du cabinet")).toHaveValue(
    "Cabinet dentaire des Tilleuls",
  );
  await expect(field(page, "Nom du praticien")).toHaveValue("Dr Claire Martin");
});

test("fixing the pointed-out fields on a reopened simulation leads to that simulation's invoices step, not a new one", async ({
  page,
}) => {
  const email = await fillValidly(page);
  await dataInformationBox(page).click();
  const simulation = await continueToInvoices(page);
  await page.goto(`/simulations/${simulation}/coordonnees`);

  await typeInto(page, "Email professionnel", "contact@cabinet-exemple");
  await field(page, "Nom du praticien").clear();
  await dataInformationBox(page).click();
  await continueOnScreen2(page);
  await expect(page).toHaveURL(`/simulations/${simulation}/coordonnees`);
  await expect(summary(page)).toHaveText(
    "2 champs à corriger avant de continuer.",
  );

  await typeInto(page, "Email professionnel", email);
  await typeInto(page, "Nom du praticien", "Dr Claire Martin");
  await dataInformationBox(page).click();
  await page.getByRole("button", { name: "Continuer" }).click();

  await expect(page).toHaveURL(`/simulations/${simulation}/factures`);
});
