import { execFileSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { expect, test, type Page } from "@playwright/test";
import { runDbEmpty } from "./run-db-empty";

async function storeSimulation(page: Page) {
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
  await expect(page).toHaveURL(/\/simulations\/[0-9a-f-]{36}\/factures$/);
  return new URL(page.url()).pathname.replace(/factures$/, "coordonnees");
}

test("pnpm db:empty removes the stored simulations and keeps the database usable", async ({
  page,
}) => {
  const e2eDatabaseUrl = process.env.E2E_DATABASE_URL;
  if (!e2eDatabaseUrl) throw new Error("E2E_DATABASE_URL is not set.");
  const stored = await storeSimulation(page);
  expect((await page.goto(stored))?.status()).toBe(200);

  const output = runDbEmpty(e2eDatabaseUrl);

  const e2eDatabase = decodeURIComponent(
    new URL(e2eDatabaseUrl).pathname.slice(1),
  );
  expect(output).toContain(`Emptied database "${e2eDatabase}"`);
  expect((await page.goto(stored))?.status()).toBe(404);
  expect(
    execFileSync("pnpm", ["--silent", "db:migrate"], {
      encoding: "utf8",
      env: { ...process.env, DATABASE_URL: e2eDatabaseUrl },
    }),
  ).toContain("No pending migration.");
  const next = await storeSimulation(page);
  expect((await page.goto(next))?.status()).toBe(200);
});
