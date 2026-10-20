import { randomUUID } from "node:crypto";
import { expect, type Page } from "@playwright/test";

export async function openInvoicesStep(page: Page) {
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

export function uploadedFile(page: Page, name: string) {
  return page.getByRole("listitem").filter({ hasText: name });
}
