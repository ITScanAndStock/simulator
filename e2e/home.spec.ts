import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.goto("/");
});

test("the home page asks what the practice would pay with Club Santé Premium", async ({
  page,
}) => {
  // textContent keeps the non-breaking space that toHaveText would normalise away.
  await expect(page.getByRole("heading", { level: 1 })).toHaveJSProperty(
    "textContent",
    "Combien paieriez-vous vos consommables avec Club Santé Premium\u00a0?",
  );
});

test("the home page lists the four simulation steps in order", async ({
  page,
}) => {
  const steps = page
    .getByRole("complementary", { name: "Votre simulation" })
    .getByRole("list", { name: "Étapes de la simulation" })
    .getByRole("listitem");

  await expect(steps).toHaveText([
    /Vos coordonnées$/,
    /Dépôt des factures$/,
    /Vérification des lignes$/,
    /Votre économie$/,
  ]);
});

test("the start link points to the contact details screen", async ({
  page,
}) => {
  await expect(
    page.getByRole("link", { name: "Commencer la simulation" }),
  ).toHaveAttribute("href", "/coordonnees");
});
