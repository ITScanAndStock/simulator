import { expect, test, type Page } from "@playwright/test";

const sections = [
  "Qui traite vos données",
  "Pourquoi",
  "Sur quelle base",
  "Vos factures",
  "Ce que nous gardons",
  "Qui les reçoit",
  "Vos droits",
];

function dataInformation(page: Page) {
  return page.getByRole("dialog", { name: "Vos données et vos factures" });
}

test("Lire l'information opens the data information window with its seven sections", async ({
  page,
}) => {
  await page.goto("/coordonnees");
  await page.getByRole("button", { name: "Lire l'information" }).click();

  const dialog = dataInformation(page);
  await expect(dialog).toBeVisible();
  await expect(
    dialog.getByRole("heading", {
      level: 2,
      name: "Vos données et vos factures",
    }),
  ).toBeVisible();
  await expect(dialog.getByRole("term")).toHaveText(sections);
});

test("J'ai compris closes the window and gives the focus back to its opener", async ({
  page,
}) => {
  await page.goto("/coordonnees");
  const opener = page.getByRole("button", { name: "Lire l'information" });
  await opener.click();
  const dialog = dataInformation(page);
  await expect(dialog).toBeVisible();

  await dialog.getByRole("button", { name: "J'ai compris" }).click();

  await expect(dialog).toBeHidden();
  await expect(opener).toBeFocused();
});

test("Escape closes the window and gives the focus back to its opener", async ({
  page,
}) => {
  await page.goto("/coordonnees");
  const opener = page.getByRole("button", { name: "Lire l'information" });
  await opener.focus();
  await page.keyboard.press("Enter");
  const dialog = dataInformation(page);
  await expect(dialog).toBeVisible();

  await page.keyboard.press("Escape");

  await expect(dialog).toBeHidden();
  await expect(opener).toBeFocused();
});

test("the focus goes back to the opener even when clicking it did not focus it", async ({
  page,
}) => {
  // Safari does not focus a button on click; cancelling mousedown reproduces that in Chromium.
  await page.addInitScript(() =>
    document.addEventListener("mousedown", (event) => event.preventDefault(), {
      capture: true,
    }),
  );
  await page.goto("/coordonnees");
  const opener = page.getByRole("button", { name: "Lire l'information" });
  await opener.click();
  await expect(opener).not.toBeFocused();
  const dialog = dataInformation(page);
  await expect(dialog).toBeVisible();

  await page.keyboard.press("Escape");

  await expect(dialog).toBeHidden();
  await expect(opener).toBeFocused();
});

test("reading the window does not tick the box saying it was read", async ({
  page,
}) => {
  await page.goto("/coordonnees");
  const dataBox = page.getByRole("checkbox", {
    name: "J'ai lu l'information sur le traitement de mes données.",
    exact: true,
  });
  await expect(dataBox).not.toBeChecked();

  await page.getByRole("button", { name: "Lire l'information" }).click();
  const dialog = dataInformation(page);
  await expect(dialog).toBeVisible();
  await dialog.getByRole("button", { name: "J'ai compris" }).click();
  await expect(dialog).toBeHidden();

  await expect(dataBox).not.toBeChecked();
});

test("while the window is open, each Tab press stays in it or leaves for the browser, never the page behind", async ({
  page,
}) => {
  await page.goto("/coordonnees");
  await page.getByRole("button", { name: "Lire l'information" }).click();
  const dialog = dataInformation(page);
  await expect(dialog).toBeVisible();
  const close = dialog.getByRole("button", { name: "J'ai compris" });
  await expect(close).toBeFocused();

  for (let press = 0; press < 12; press++) {
    await page.keyboard.press("Tab");
    expect(
      // After the last control Chromium hands the focus to its own toolbar: the page then has no focus at all.
      await dialog.evaluate(
        (element) =>
          element.contains(document.activeElement) || !document.hasFocus(),
      ),
    ).toBe(true);
  }
});

for (const opener of [
  "Comment nous traitons vos données",
  "Données personnelles",
]) {
  test(`${opener} opens the data information window from the home page`, async ({
    page,
  }) => {
    await page.goto("/");
    await page.getByRole("button", { name: opener }).click();

    const dialog = dataInformation(page);
    await expect(dialog).toBeVisible();
    await expect(dialog.getByRole("term")).toHaveText(sections);
  });
}

for (const [path, opener] of [
  ["/", "Comment nous traitons vos données"],
  ["/coordonnees", "Lire l'information"],
]) {
  test(`${path} opens the data information window without a console error`, async ({
    page,
  }) => {
    const errors: string[] = [];
    page.on("console", (message) => {
      if (message.type() === "error") errors.push(message.text());
    });
    page.on("pageerror", (error) => errors.push(error.message));

    await page.goto(path);
    await page.getByRole("button", { name: opener }).click();
    await expect(dataInformation(page)).toBeVisible();

    expect(errors).toEqual([]);
  });
}
