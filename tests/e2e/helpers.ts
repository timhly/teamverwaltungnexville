import type { Page } from "@playwright/test";

// Choose a simulated provider account; production OAuth never imports this fixture.
export async function loginAsDiscord(
  page: Page,
  account = "admin@example.test",
) {
  await page.route(
    "http://127.0.0.1:54329/auth/v1/authorize?*",
    async (route) => {
      const url = new URL(route.request().url());
      url.searchParams.set("login_hint", account);
      await route.continue({ url: url.toString() });
    },
  );
  await page.goto("/");
  await page
    .getByRole("button", { name: "Mit Discord anmelden", exact: true })
    .click();
}
