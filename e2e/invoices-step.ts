import { randomUUID } from "node:crypto";
import { expect, type Page } from "@playwright/test";

export async function openInvoicesStep(
  page: Page,
  { scanAndStockUser = false } = {},
) {
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
  if (scanAndStockUser) {
    await page
      .getByRole("checkbox", { name: "utilisateur de Scan&Stock", exact: true })
      .check();
  }
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

export function invoiceInput(page: Page) {
  return page.getByLabel(
    "Glissez vos factures ici, ou choisissez des fichiers",
  );
}

export function pdfFile(name: string, buffer: Buffer) {
  return { name, mimeType: "application/pdf", buffer };
}

export function toast(page: Page) {
  return page.getByRole("alert").filter({ has: page.getByRole("button") });
}

export async function holdServerActions(page: Page) {
  let release = () => {};
  const released = new Promise<void>((resolve) => (release = resolve));
  await page.route("**/simulations/**", async (route) => {
    if (route.request().headers()["next-action"]) await released;
    await route.fallback();
  });
  return release;
}
