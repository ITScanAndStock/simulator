import { randomUUID } from "node:crypto";
import { expect, test, type Page } from "@playwright/test";

type ContactDetails = {
  email: string;
  practice: string;
  practitioner: string;
  phone: string;
  cspMember: boolean;
  scanAndStockUser: boolean;
  callBack: boolean;
};

const textFields = [
  ["Email professionnel", "email"],
  ["Nom du cabinet", "practice"],
  ["Nom du praticien", "practitioner"],
  ["Téléphone", "phone"],
] as const;

function someContactDetails(
  statuses: Pick<ContactDetails, "cspMember" | "scanAndStockUser" | "callBack">,
): ContactDetails {
  return {
    email: `claire.martin+${randomUUID()}@cabinet-tilleuls.fr`,
    practice: "Cabinet dentaire des Tilleuls",
    practitioner: "Dr Claire Martin",
    phone: "0472123456",
    ...statuses,
  };
}

function boxes(page: Page) {
  return {
    cspMember: page.getByRole("checkbox", {
      name: "affilié Club Santé Premium",
    }),
    scanAndStockUser: page.getByRole("checkbox", {
      name: "utilisateur de Scan&Stock",
    }),
    callBack: page.getByRole("checkbox", {
      name: /^J'accepte d'être recontacté/,
    }),
    dataInformationRead: page.getByRole("checkbox", {
      name: "J'ai lu l'information sur le traitement de mes données.",
      exact: true,
    }),
  };
}

async function fill(page: Page, details: ContactDetails) {
  for (const [label, key] of textFields) {
    await page.getByLabel(label, { exact: true }).fill(details[key]);
  }
  const { cspMember, scanAndStockUser, callBack, dataInformationRead } =
    boxes(page);
  await cspMember.setChecked(details.cspMember);
  await scanAndStockUser.setChecked(details.scanAndStockUser);
  await callBack.setChecked(details.callBack);
  await dataInformationRead.check();
}

async function continueToInvoices(page: Page) {
  await page.getByRole("button", { name: "Continuer" }).click();
  await expect(page).toHaveURL(
    /^http:\/\/[^/]+\/simulations\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\/factures$/,
  );
  return new URL(page.url()).pathname.split("/")[2];
}

async function expectPrefilled(page: Page, details: ContactDetails) {
  for (const [label, key] of textFields) {
    await expect(page.getByLabel(label, { exact: true })).toHaveValue(
      details[key],
    );
  }
  const { cspMember, scanAndStockUser, callBack, dataInformationRead } =
    boxes(page);
  await expect(cspMember).toBeChecked({ checked: details.cspMember });
  await expect(scanAndStockUser).toBeChecked({
    checked: details.scanAndStockUser,
  });
  await expect(callBack).toBeChecked({ checked: details.callBack });
  await expect(dataInformationRead).toBeChecked();
}

test("Continuer leads to the invoices step of a new simulation", async ({
  page,
}) => {
  await page.goto("/coordonnees");
  await fill(
    page,
    someContactDetails({
      cspMember: false,
      scanAndStockUser: true,
      callBack: false,
    }),
  );

  await continueToInvoices(page);

  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "Déposez vos factures",
  );
  await expect(page.getByText("Étape 2 sur 4", { exact: true })).toBeVisible();
  const steps = page
    .getByRole("list", { name: "Étapes de la simulation" })
    .getByRole("listitem");
  await expect(steps).toHaveText([
    /Terminée : Vos coordonnées$/,
    /Dépôt des factures\s*En cours$/,
    /Vérification des lignes$/,
    /Votre économie$/,
  ]);
  await expect(steps.nth(1)).toHaveAttribute("aria-current", "step");
  for (const index of [0, 2, 3]) {
    await expect(steps.nth(index)).not.toHaveAttribute("aria-current");
  }
});

// Each case differs box by box from the defaults and from the other case, so values kept only in the
// browser, a status in the wrong column or a call-back default over a stored "no" leave a box wrong.
for (const statuses of [
  { cspMember: false, scanAndStockUser: true, callBack: false },
  { cspMember: true, scanAndStockUser: false, callBack: true },
]) {
  test(`a new browser finds the stored contact details pre-filled (${JSON.stringify(statuses)})`, async ({
    page,
    browser,
  }) => {
    const details = someContactDetails(statuses);
    await page.goto("/coordonnees");
    await fill(page, details);
    const simulation = await continueToInvoices(page);

    const elsewhere = await browser.newContext();
    const reopened = await elsewhere.newPage();
    await reopened.goto(`/simulations/${simulation}/coordonnees`);

    await expectPrefilled(reopened, details);
    await elsewhere.close();
  });
}

test("Retour on the invoices step goes back to this simulation's contact details", async ({
  page,
}) => {
  const details = someContactDetails({
    cspMember: false,
    scanAndStockUser: true,
    callBack: false,
  });
  await page.goto("/coordonnees");
  await fill(page, details);
  const simulation = await continueToInvoices(page);

  await page.getByRole("link", { name: "Retour" }).click();

  await expect(page).toHaveURL(`/simulations/${simulation}/coordonnees`);
  await expectPrefilled(page, details);
});

test("Continuer on a reopened simulation updates it instead of starting another one", async ({
  page,
  browser,
}) => {
  const details = someContactDetails({
    cspMember: false,
    scanAndStockUser: true,
    callBack: false,
  });
  await page.goto("/coordonnees");
  await fill(page, details);
  const simulation = await continueToInvoices(page);

  await page.goto(`/simulations/${simulation}/coordonnees`);
  const changed = {
    ...details,
    practice: "Centre dentaire du Parc",
    cspMember: true,
  };
  await page
    .getByLabel("Nom du cabinet", { exact: true })
    .fill(changed.practice);
  await boxes(page).cspMember.check();
  expect(await continueToInvoices(page)).toBe(simulation);

  const elsewhere = await browser.newContext();
  const reopened = await elsewhere.newPage();
  await reopened.goto(`/simulations/${simulation}/coordonnees`);
  await expectPrefilled(reopened, changed);
  await elsewhere.close();
});

test("browser Back from the invoices step skips the submitted contact details screen", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("link", { name: "Commencer la simulation" }).click();
  await expect(page).toHaveURL("/coordonnees");
  await fill(
    page,
    someContactDetails({
      cspMember: false,
      scanAndStockUser: true,
      callBack: false,
    }),
  );
  await continueToInvoices(page);

  await page.goBack();

  await expect(page).toHaveURL("/");
  await expect(
    page.getByRole("link", { name: "Commencer la simulation" }),
  ).toBeVisible();
});

test("after a change and browser Back, Retour shows the changed contact details", async ({
  page,
}) => {
  const details = someContactDetails({
    cspMember: false,
    scanAndStockUser: true,
    callBack: false,
  });
  await page.goto("/coordonnees");
  await fill(page, details);
  const simulation = await continueToInvoices(page);
  await page.getByRole("link", { name: "Retour" }).click();
  await expectPrefilled(page, details);

  const changed = { ...details, practice: "Centre dentaire du Parc" };
  await page
    .getByLabel("Nom du cabinet", { exact: true })
    .fill(changed.practice);
  await continueToInvoices(page);
  await page.goBack();
  await expect(page).toHaveURL(`/simulations/${simulation}/factures`);
  await page.getByRole("link", { name: "Retour" }).click();

  await expect(page).toHaveURL(`/simulations/${simulation}/coordonnees`);
  await expectPrefilled(page, changed);
});

for (const step of ["coordonnees", "factures"]) {
  for (const [kind, id] of [
    ["an unknown", randomUUID()],
    ["a malformed", "pas-une-simulation"],
  ]) {
    test(`/simulations/<${kind} id>/${step} answers 404`, async ({ page }) => {
      const response = await page.goto(`/simulations/${id}/${step}`);

      expect(response?.status()).toBe(404);
    });
  }
}
