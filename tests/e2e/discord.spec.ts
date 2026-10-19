import { test, expect, type Page } from "@playwright/test";
import { loginAsDiscord } from "./helpers";
async function loginAdmin(page: Page) {
  await loginAsDiscord(page);
  await expect(
    page.getByRole("heading", { name: "Alles für dein Team." }),
  ).toBeVisible();
}
async function loginDiscord(page: Page) {
  await page.goto("/");
  await expect(
    page.locator('input[type="email"], input[type="password"]'),
  ).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Passwort vergessen?", exact: true }),
  ).toHaveCount(0);
  await expect(page.getByText("oder mit E-Mail", { exact: true })).toHaveCount(
    0,
  );
  await page
    .getByRole("button", { name: "Mit Discord anmelden", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Dein Zugang zu Nexville." }),
  ).toBeVisible();
}
test.beforeEach(async ({ request }) => {
  await request.post("http://127.0.0.1:54329/__test/reset");
});
test("Discord button completes the local OAuth callback and keeps the user outside team data", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  await page.screenshot({
    path: "test-results/discord-login.png",
    fullPage: true,
  });
  await page
    .getByRole("button", { name: "Mit Discord anmelden", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Dein Zugang zu Nexville." }),
  ).toBeVisible();
  await expect(
    page.getByText("Discord-ID: 123456789012345678", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("navigation", { name: "Hauptnavigation" }),
  ).toHaveCount(0);
  await page
    .getByRole("button", { name: "Zugang anfragen", exact: true })
    .click();
  await expect(page.getByRole("status")).toContainText(
    "Deine Zugangsanfrage liegt der Teamverwaltung vor",
  );
  await page.reload();
  await expect(page.getByRole("status")).toContainText(
    "Deine Zugangsanfrage liegt der Teamverwaltung vor",
  );
  await page.screenshot({
    path: "test-results/discord-pending.png",
    fullPage: true,
  });
  expect(errors).toEqual([]);
});
test("administrator grants a Discord account admin rights, confirmed user can enter the workspace", async ({
  page,
  browser,
}) => {
  await loginAdmin(page);
  const pendingContext = await browser.newContext();
  const pending = await pendingContext.newPage();
  try {
    await loginDiscord(pending);
    await pending
      .getByRole("button", { name: "Zugang anfragen", exact: true })
      .click();
    await expect(pending.getByRole("status")).toContainText(
      "Deine Zugangsanfrage liegt",
    );
    await page.goto("/#/einstellungen");
    await page
      .getByRole("button", {
        name: "Zugangsanfragen aktualisieren",
        exact: true,
      })
      .click();
    await expect(page.locator(".access-requests-panel")).toContainText(
      "123456789012345678",
    );
    await page
      .getByLabel("Freigaberolle Discord Fixture", { exact: true })
      .selectOption("admin");
    page.once("dialog", (d) => d.accept());
    await page.getByRole("button", { name: "Freigeben", exact: true }).click();
    await expect(
      page
        .getByRole("status")
        .filter({ hasText: "Discord Fixture wurde als Administrator" }),
    ).toBeVisible();
    await pending
      .getByRole("button", { name: "Zugriff aktualisieren", exact: true })
      .click();
    await expect(
      pending.getByRole("heading", { name: "Alles für dein Team." }),
    ).toBeVisible();
    await pending.goto("/#/einstellungen");
    await expect(pending.locator(".access-requests-panel")).toBeVisible();
    await expect(pending.locator(".discord-account")).toContainText(
      "123456789012345678",
    );
  } finally {
    await pendingContext.close();
  }
});
test("Discord cancellation returns a German error with an available retry button", async ({
  page,
}) => {
  await page.goto("/#error=access_denied&error_description=Access+denied");
  await expect(page.getByRole("alert")).toContainText(
    "Discord-Anmeldung wurde abgebrochen",
  );
  await expect(
    page.getByRole("button", { name: "Mit Discord anmelden", exact: true }),
  ).toBeEnabled();
  expect(new URL(page.url()).hash).toBe("#/");
});

test("an account with an allowlisted verified Discord identity receives admin access without a request", async ({
  page,
}) => {
  await loginAsDiscord(page, "discord-admin@example.test");
  await expect(
    page.getByRole("heading", { name: "Alles für dein Team." }),
  ).toBeVisible();
  await page.goto("/#/einstellungen");
  await expect(page.locator(".access-requests-panel")).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Passwort ändern", exact: true }),
  ).toHaveCount(0);
  await expect(page.locator(".discord-account")).toContainText(
    "470653391094415362",
  );
  await page.reload();
  await expect(page.locator(".access-requests-panel")).toBeVisible();
});
