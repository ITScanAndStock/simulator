import { expect, test, type Locator } from "@playwright/test";

function safelyDecoded(url: string) {
  try {
    return decodeURIComponent(url.replaceAll("+", " "));
  } catch {
    return url;
  }
}

test.beforeEach(async ({ page }) => {
  await page.goto("/coordonnees");
});

test("the contact details screen asks where to send the result", async ({
  page,
}) => {
  // textContent keeps the non-breaking space that toHaveText would normalise away.
  await expect(page.getByRole("heading", { level: 1 })).toHaveJSProperty(
    "textContent",
    "Où vous envoyer votre résultat ?",
  );
  await expect(page.getByText("Étape 1 sur 4", { exact: true })).toBeVisible();
});

test("the step band shows the four steps with the first one current", async ({
  page,
}) => {
  const steps = page
    .getByRole("list", { name: "Étapes de la simulation" })
    .getByRole("listitem");

  await expect(steps).toHaveText([
    /Vos coordonnées\s*En cours$/,
    /Dépôt des factures$/,
    /Vérification des lignes$/,
    /Votre économie$/,
  ]);
  await expect(steps.nth(0)).toHaveAttribute("aria-current", "step");
  for (const index of [1, 2, 3]) {
    await expect(steps.nth(index)).not.toHaveAttribute("aria-current");
  }
});

test("each contact field is named by its label and typed for autofill", async ({
  page,
}) => {
  const fields = [
    ["Email professionnel", "email", "email"],
    ["Nom du cabinet", "text", "organization"],
    ["Nom du praticien", "text", "name"],
    ["Téléphone", "tel", "tel"],
  ] as const;

  for (const [label, type, autocomplete] of fields) {
    const field = page.getByLabel(label, { exact: true });
    await expect(field).toHaveAttribute("type", type);
    await expect(field).toHaveAttribute("autocomplete", autocomplete);
  }
});

test("the declared statuses offer only the Scan&Stock use, unticked", async ({
  page,
}) => {
  const statuses = page.getByRole("group", {
    name: "Vous êtes déjà… (facultatif)",
  });

  await expect(statuses.getByRole("checkbox")).toHaveCount(1);
  await expect(
    statuses.getByRole("checkbox", { name: "utilisateur de Scan&Stock" }),
  ).not.toBeChecked();
});

test("the data box starts unticked and the call-back box starts ticked", async ({
  page,
}) => {
  await expect(
    page.getByRole("checkbox", {
      name: "J'ai lu l'information sur le traitement de mes données.",
      exact: true,
    }),
  ).not.toBeChecked();
  await expect(
    page.getByRole("checkbox", {
      name: "J'accepte d'être recontacté par un conseiller Club Santé Premium au sujet de ma simulation.",
      exact: true,
    }),
  ).toBeChecked();
});

test("the consent boxes are reached with Tab and toggled with Space", async ({
  page,
}) => {
  const dataBox = page.getByRole("checkbox", {
    name: "J'ai lu l'information sur le traitement de mes données.",
    exact: true,
  });
  const callBackBox = page.getByRole("checkbox", {
    name: /^J'accepte d'être recontacté/,
  });

  await page.getByLabel("Téléphone", { exact: true }).focus();
  await page.keyboard.press("Tab");
  await expect(
    page.getByRole("checkbox", { name: "utilisateur de Scan&Stock" }),
  ).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(dataBox).toBeFocused();
  await expect(dataBox).not.toBeChecked();
  await page.keyboard.press("Space");
  await expect(dataBox).toBeChecked();

  await page.keyboard.press("Tab");
  await expect(
    page.getByRole("button", { name: "Lire l'information" }),
  ).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(callBackBox).toBeFocused();
  await expect(callBackBox).toBeChecked();
  await page.keyboard.press("Space");
  await expect(callBackBox).not.toBeChecked();
});

function runningAnimations(checkbox: Locator) {
  return checkbox.evaluate(
    (input) =>
      input
        .parentElement!.getAnimations({ subtree: true })
        .filter((animation) => animation.playState === "running").length,
  );
}

function recordKeyframeStart(checkbox: Locator) {
  return checkbox.evaluate((input) => {
    const wrapper = input.parentElement!;
    wrapper.addEventListener(
      "animationstart",
      () => (wrapper.dataset.keyframesStarted = "true"),
      { once: true },
    );
  });
}

test("a ticked box plays its activation once, then stays still", async ({
  page,
}) => {
  const dataBox = page.getByRole("checkbox", {
    name: "J'ai lu l'information sur le traitement de mes données.",
    exact: true,
  });

  await recordKeyframeStart(dataBox);
  await dataBox.click();
  await expect(dataBox).toBeChecked();
  await expect(dataBox.locator("..")).toHaveAttribute(
    "data-keyframes-started",
    "true",
  );

  await expect.poll(() => runningAnimations(dataBox)).toBe(0);
});

test("the call-back box, ticked on arrival, settles after its activation", async ({
  page,
}) => {
  const callBackBox = page.getByRole("checkbox", {
    name: /^J'accepte d'être recontacté/,
  });

  await expect(callBackBox).toBeChecked();
  await expect.poll(() => runningAnimations(callBackBox)).toBe(0);
});

test("Retour goes back to the home page", async ({ page }) => {
  await page.getByRole("link", { name: "Retour" }).click();

  await expect(page).toHaveURL("/");
  await expect(
    page.getByRole("link", { name: "Commencer la simulation" }),
  ).toBeVisible();
});

test("Continuer keeps the typed contact details out of every URL", async ({
  page,
}) => {
  const typed = [
    ["Email professionnel", "claire.martin@cabinet-tilleuls.fr"],
    ["Nom du cabinet", "Cabinet Tilleuls"],
    ["Nom du praticien", "Claire Martin"],
    ["Téléphone", "0472123456"],
  ] as const;
  for (const [label, value] of typed) {
    await page.getByLabel(label, { exact: true }).fill(value);
  }
  await page
    .getByRole("checkbox", {
      name: "J'ai lu l'information sur le traitement de mes données.",
      exact: true,
    })
    .check();
  const requested: string[] = [];
  page.on("request", (request) => requested.push(request.url()));

  await page.getByRole("button", { name: "Continuer" }).click();
  await expect(page).toHaveURL(/\/simulations\/[^/]+\/factures$/);

  expect(requested.length).toBeGreaterThan(0);
  for (const url of requested) {
    const decoded = safelyDecoded(url);
    for (const [, value] of typed) {
      expect(url).not.toContain(value);
      expect(decoded).not.toContain(value);
    }
  }
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
});
