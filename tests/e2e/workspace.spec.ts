import { test, expect, type Page } from "@playwright/test";

async function login(page: Page, email = "admin@example.test") {
  await page.goto("/");
  await page.getByLabel("E-Mail-Adresse", { exact: true }).fill(email);
  await page.getByLabel("Passwort", { exact: true }).fill("test-password-123");
  await page.getByRole("button", { name: "Anmelden", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Alles für dein Team." }),
  ).toBeVisible();
}
async function closeDialog(page: Page) {
  await page
    .getByRole("button", { name: "Dialog schließen", exact: true })
    .click();
}
test.beforeEach(async ({ request }) => {
  await request.post("http://127.0.0.1:54329/__test/reset");
});

test("Nexville dashboard, navigation, responsive widths and light mode", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await login(page);
  await page.screenshot({
    path: "test-results/nexville-desktop.png",
    fullPage: true,
  });
  await expect(
    page.getByRole("link", { name: /Aktive Teammitglieder/ }),
  ).toContainText("09");
  for (const route of [
    "/mitglieder",
    "/rollen",
    "/besprechungen",
    "/verwarnungen",
    "/wuensche",
    "/verlauf",
    "/backups",
    "/einstellungen",
  ]) {
    await page.goto(`/#${route}`);
    await expect(page.locator("h1")).toBeVisible();
  }
  await page.goto("/#/");
  await page
    .getByRole("button", { name: "Light Mode aktivieren", exact: true })
    .click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  await page.screenshot({
    path: "test-results/nexville-light.png",
    fullPage: true,
  });
  await page
    .getByRole("button", { name: "Dark Mode aktivieren", exact: true })
    .click();
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(
    page.getByRole("button", { name: "Navigation öffnen", exact: true }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: "test-results/nexville-mobile.png",
    fullPage: true,
  });
  await page
    .getByRole("button", { name: "Navigation öffnen", exact: true })
    .click();
  await page
    .getByRole("navigation", { name: "Hauptnavigation" })
    .last()
    .getByRole("link", { name: "Teammitglieder" })
    .click();
  await expect(page.locator("h1")).toContainText("Teammitglieder");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  expect(errors).toEqual([]);
});

test("creates a member with multiple roles, autosaves and preserves changes after reload", async ({
  page,
}) => {
  await login(page);
  await page.goto("/#/mitglieder");
  await page
    .getByRole("button", { name: "Mitglied hinzufügen", exact: true })
    .click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Benutzername", { exact: true }).fill("Testmitglied");
  await dialog.getByLabel("Supporter", { exact: true }).check();
  await dialog.getByLabel("Unternehmensverwaltung", { exact: true }).check();
  await dialog
    .getByLabel("Eintrittsdatum (optional)", { exact: true })
    .fill("2026-10-19");
  await dialog
    .getByRole("button", { name: "Mitglied hinzufügen", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Testmitglied", exact: true }).first(),
  ).toBeVisible();
  const info = page.getByRole("textbox", { name: /^Informationen / });
  await info.fill("Dauerhaft gespeicherte interne Information");
  await info.blur();
  await expect(
    page.locator(".sync-status button").filter({ hasText: /^Gespeichert$/ }),
  ).toBeVisible();
  await closeDialog(page);
  await page.reload();
  await expect(
    page.getByRole("button", { name: "Testmitglied", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Testmitglied", exact: true }).click();
  await expect(
    page.getByRole("textbox", { name: /^Informationen / }),
  ).toHaveValue("Dauerhaft gespeicherte interne Information");
  await expect(page.getByLabel("Supporter", { exact: true })).toBeChecked();
  await expect(
    page.getByLabel("Unternehmensverwaltung", { exact: true }),
  ).toBeChecked();
});

test("meeting agendas, individual attendance, copies and historical snapshots", async ({
  page,
}) => {
  await login(page);
  await page.goto("/#/besprechungen");
  await page
    .getByRole("button", { name: "Besprechung planen", exact: true })
    .click();
  await page.getByLabel("Titel", { exact: true }).fill("Nexville Teamsitzung");
  await page
    .getByLabel("Datum & Uhrzeit (Europe/Berlin)", { exact: true })
    .fill("2026-11-03T20:00");
  await page
    .getByRole("button", { name: "Besprechung erstellen", exact: true })
    .click();
  await expect(page.locator(".topic-row")).toHaveCount(13);
  await page
    .getByRole("textbox", { name: /^Thema 1 / })
    .fill("Supportabläufe besprechen");
  await page.getByRole("textbox", { name: /^Thema 1 / }).blur();
  await page
    .getByLabel("Anwesenheit ApX", { exact: true })
    .selectOption("present");
  await expect(
    page.locator(".sync-status button").filter({ hasText: /^Gespeichert$/ }),
  ).toBeVisible();
  await page.reload();
  await expect(page.getByRole("textbox", { name: /^Thema 1 / })).toHaveValue(
    "Supportabläufe besprechen",
  );
  await expect(page.getByLabel("Anwesenheit ApX", { exact: true })).toHaveValue(
    "present",
  );
  await page.getByRole("button", { name: "Kopieren", exact: true }).click();
  await page
    .getByRole("dialog")
    .getByLabel("Neuer Termin (Europe/Berlin)", { exact: true })
    .fill("2026-11-10T20:00");
  await page
    .getByRole("button", { name: "Kopie erstellen", exact: true })
    .click();
  await expect(page.locator(".meeting-overview h2")).toContainText("(Kopie)");
  await expect(page.locator(".topic-row")).toHaveCount(13);
  await expect(page.getByRole("textbox", { name: /^Thema 1 / })).toHaveValue(
    "Supportabläufe besprechen",
  );
  await expect(page.getByLabel("Anwesenheit ApX", { exact: true })).toHaveValue(
    "open",
  );
});

test("warning dates and wish status are saved in the backend", async ({
  page,
}) => {
  await login(page);
  await page.goto("/#/verwarnungen");
  await page
    .getByRole("button", { name: "Verwarnung eintragen", exact: true })
    .click();
  await page
    .getByLabel("Mitglied", { exact: true })
    .selectOption({ label: "HAZE" });
  await page.getByLabel("Verwarnungsstufe", { exact: true }).selectOption("2");
  await page
    .getByLabel("Grund", { exact: true })
    .fill("Dokumentierter Testgrund");
  await page.getByLabel("Startdatum", { exact: true }).fill("2026-01-01");
  await page
    .getByLabel("Ablaufdatum (optional)", { exact: true })
    .fill("2099-12-31");
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Verwarnung eintragen", exact: true })
    .click();
  await expect(
    page.getByText("Dokumentierter Testgrund", { exact: true }),
  ).toBeVisible();
  await page.reload();
  await expect(
    page.getByText("Dokumentierter Testgrund", { exact: true }),
  ).toBeVisible();
  await page.goto("/#/wuensche");
  await page
    .getByRole("button", { name: "Wunsch hinzufügen", exact: true })
    .click();
  await page.getByLabel("Titel", { exact: true }).fill("Gemeinsamer Teamabend");
  await page
    .getByLabel("Beschreibung", { exact: true })
    .fill("Ein regelmäßiger Austausch abseits des Supports.");
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Wunsch hinzufügen", exact: true })
    .click();
  await page
    .getByRole("dialog")
    .getByLabel("Status", { exact: true })
    .selectOption("progress");
  await expect(
    page.locator(".sync-status button").filter({ hasText: /^Gespeichert$/ }),
  ).toBeVisible();
  await closeDialog(page);
  await page.reload();
  await expect(
    page.getByText("Gemeinsamer Teamabend", { exact: true }),
  ).toBeVisible();
  await expect(page.locator(".wish-card")).toContainText("In Bearbeitung");
});

test("reader cannot edit and the database refuses manipulated writes", async ({
  page,
  request,
}) => {
  await login(page, "viewer@example.test");
  await page.goto("/#/mitglieder");
  await expect(
    page.getByRole("button", { name: "Mitglied hinzufügen", exact: true }),
  ).toHaveCount(0);
  await page.getByRole("button", { name: "ApX", exact: true }).click();
  await expect(
    page.getByRole("textbox", { name: /^Benutzername / }),
  ).toBeDisabled();
  const token = await request.post("http://127.0.0.1:54329/auth/v1/token", {
    data: { email: "viewer@example.test", password: "test-password-123" },
  });
  const auth = await token.json();
  const health = await request.get("http://127.0.0.1:54329/__test/health");
  const { team } = await health.json();
  const response = await request.post(
    "http://127.0.0.1:54329/rest/v1/rpc/mutate",
    {
      headers: { Authorization: `Bearer ${auth.access_token}` },
      data: {
        p_team: team,
        p_table: "team_members",
        p_id: crypto.randomUUID(),
        p_expected: 0,
        p_patch: { name: "Unauthorized" },
        p_operation: crypto.randomUUID(),
        p_delete: false,
      },
    },
  );
  expect(response.ok()).toBe(false);
  expect((await response.json()).code).toBe("42501");
});

test("offline outbox survives reload and synchronizes without losing drafts", async ({
  page,
}) => {
  page.on("dialog", (dialog) => dialog.accept());
  await login(page);
  await page.goto("/#/mitglieder");
  await page.getByRole("button", { name: "ApX", exact: true }).click();
  await page.route("**/rest/v1/rpc/mutate", (route) => route.abort());
  const input = page.getByRole("textbox", { name: /^Informationen / });
  await input.fill("Entwurf nach Verbindungsabbruch");
  await input.blur();
  await expect(
    page.locator(".sync-status button").filter({ hasText: /^Speicherfehler$/ }),
  ).toBeVisible();
  await page.reload();
  await expect(
    page.getByRole("textbox", { name: /^Informationen / }),
  ).toHaveValue("Entwurf nach Verbindungsabbruch");
  await closeDialog(page);
  await page.unroute("**/rest/v1/rpc/mutate");
  await page
    .locator(".sync-status button")
    .filter({ hasText: /^Speicherfehler$/ })
    .click();
  await page
    .getByRole("button", {
      name: "Synchronisierung erneut versuchen",
      exact: true,
    })
    .click();
  await expect(
    page.getByRole("dialog", { name: "Speicherung & Synchronisierung" }),
  ).toContainText("Keine ausstehenden Änderungen");
  await closeDialog(page);
  await page.reload();
  await page.getByRole("button", { name: "ApX", exact: true }).click();
  await expect(
    page.getByRole("textbox", { name: /^Informationen / }),
  ).toHaveValue("Entwurf nach Verbindungsabbruch");
});

test("exact Nexville rank order and all five extras are offered separately", async ({
  page,
}) => {
  await login(page);
  await page.goto("/#/rollen");
  await expect(page.locator("tbody tr td:nth-child(2) strong")).toHaveText([
    "Projektleitung",
    "Management",
    "Administration",
    "Senior Moderator",
    "Moderator",
    "Senior Supporter",
    "Supporter",
    "Test Supporter",
  ]);
  await page.getByLabel("Rollenart filtern").selectOption("extra");
  await expect(page.locator("tbody tr td:nth-child(2) strong")).toHaveText([
    "Fraktionsverwaltung",
    "Unternehmensverwaltung",
    "Eventverwaltung",
    "Supportleitung",
    "Teamleitung",
  ]);
  await page.goto("/#/mitglieder");
  await expect(page.locator("tbody tr .member-name strong").first()).toHaveText(
    "ApX",
  );
  await expect(page.locator("tbody tr .member-name strong").nth(1)).toHaveText(
    "Soon",
  );
  await page
    .getByRole("button", { name: "Mitglied hinzufügen", exact: true })
    .click();
  await expect(
    page.locator(".role-picker-group").first().getByRole("checkbox"),
  ).toHaveCount(8);
  await expect(
    page.locator(".role-picker-group").nth(1).getByRole("checkbox"),
  ).toHaveCount(5);
});

test("immediate reload before the autosave delay retains the text draft", async ({
  page,
}) => {
  page.on("dialog", (dialog) => dialog.accept());
  await login(page);
  await page.goto("/#/mitglieder");
  await page.getByRole("button", { name: "ApX", exact: true }).click();
  await page
    .getByRole("textbox", { name: /^Informationen / })
    .fill("Sofort gesicherter Textentwurf");
  // Cancel timer execution by reloading directly; the synchronously persisted draft remains.
  await page.reload();
  await expect(
    page.getByRole("textbox", { name: /^Informationen / }),
  ).toHaveValue("Sofort gesicherter Textentwurf");
  await expect(page.locator(".sync-status button")).toHaveText("Gespeichert");
  await page.reload();
  await expect(
    page.getByRole("textbox", { name: /^Informationen / }),
  ).toHaveValue("Sofort gesicherter Textentwurf");
});

test("a concurrent server edit opens a conflict instead of being overwritten", async ({
  page,
  request,
}) => {
  await login(page);
  await page.goto("/#/mitglieder");
  await page.getByRole("button", { name: "ApX", exact: true }).click();
  const memberId = new URL(page.url()).hash.split("mitglied=")[1];
  const authResponse = await request.post(
    "http://127.0.0.1:54329/auth/v1/token",
    { data: { email: "admin@example.test", password: "test-password-123" } },
  );
  const auth = await authResponse.json();
  const health = await request.get("http://127.0.0.1:54329/__test/health");
  const { team } = await health.json();
  const changed = await request.post(
    "http://127.0.0.1:54329/rest/v1/rpc/mutate",
    {
      headers: { Authorization: `Bearer ${auth.access_token}` },
      data: {
        p_team: team,
        p_table: "team_members",
        p_id: memberId,
        p_expected: 1,
        p_patch: { info: "Änderung durch zweite Person" },
        p_operation: crypto.randomUUID(),
        p_delete: false,
      },
    },
  );
  expect(changed.ok()).toBe(true);
  await page
    .getByRole("textbox", { name: /^Informationen / })
    .fill("Mein konkurrierender Entwurf");
  await page.getByRole("textbox", { name: /^Informationen / }).blur();
  await expect(
    page.getByRole("dialog", { name: "Speicherung & Synchronisierung" }),
  ).toBeVisible();
  await expect(
    page.getByRole("dialog", { name: "Speicherung & Synchronisierung" }),
  ).toContainText("Konflikt");
  page.once("dialog", (d) => d.accept());
  await page
    .getByRole("button", { name: "Serverfassung übernehmen", exact: true })
    .click();
  await closeDialog(page);
  await expect(
    page.getByRole("textbox", { name: /^Informationen / }),
  ).toHaveValue("Änderung durch zweite Person");
});
