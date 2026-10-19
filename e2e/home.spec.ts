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

test("the start link opens the contact details screen", async ({ page }) => {
  await page.getByRole("link", { name: "Commencer la simulation" }).click();

  await expect(page).toHaveURL("/coordonnees");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "Où vous envoyer votre résultat ?",
  );
});

test("the home page declares an SVG icon that the server serves", async ({
  page,
  request,
}) => {
  const icon = page.locator('link[rel="icon"]');
  await expect(icon).toHaveAttribute("href", /.+/);

  const response = await request.get((await icon.getAttribute("href"))!);
  expect(response.status()).toBe(200);
  expect(response.headers()["content-type"]).toContain("image/svg+xml");
});

test.describe("on a screen wider than 1440px", () => {
  test.use({ viewport: { width: 1920, height: 1080 } });

  test("the content is at most 1440px wide and centred, the header spans the screen", async ({
    page,
  }) => {
    const main = (await page.getByRole("main").boundingBox())!;
    const header = (await page.getByRole("banner").boundingBox())!;

    expect(main.width).toBeLessThanOrEqual(1440);
    expect(Math.abs(main.x - (1920 - main.x - main.width))).toBeLessThanOrEqual(
      1,
    );
    expect(header.x).toBe(0);
    expect(header.width).toBe(1920);
  });

  test("the steps card stops growing at its mockup width", async ({ page }) => {
    const steps = (await page
      .getByRole("complementary", { name: "Votre simulation" })
      .boundingBox())!;

    expect(steps.width).toBeLessThanOrEqual(541);
  });
});

test.describe("on a 1280px screen, the width of the mockup", () => {
  test.use({ viewport: { width: 1280, height: 900 } });

  test("the title and the steps card sit where the mockup puts them", async ({
    page,
  }) => {
    const title = (await page
      .getByRole("heading", { level: 1 })
      .boundingBox())!;
    const steps = (await page
      .getByRole("complementary", { name: "Votre simulation" })
      .boundingBox())!;

    expect([title.x, title.width]).toEqual([48, 595]);
    expect([steps.x, steps.width]).toEqual([691, 541]);
  });
});
