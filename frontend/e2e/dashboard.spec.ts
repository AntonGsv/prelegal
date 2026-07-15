import { test, expect } from "@playwright/test";

test.describe("dashboard", () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      window.localStorage.setItem("prelegal.auth.token", "e2e-token");
      window.localStorage.setItem(
        "prelegal.auth.user",
        JSON.stringify({ id: 1, email: "founder@example.com", displayName: "Founder" }),
      );
    });
  });

  test("shows the document gallery and navigates to a document's chat", async ({
    page,
  }) => {
    await page.goto("/dashboard");

    await expect(page.getByTestId("document-gallery")).toBeVisible();
    // Every supported document appears as a card.
    await expect(page.getByTestId("doc-card-mutual-nda")).toBeVisible();
    await expect(page.getByTestId("doc-card-dpa")).toBeVisible();

    await page.getByTestId("doc-card-mutual-nda").click();
    await expect(page).toHaveURL(/\/documents\/mutual-nda\/create$/);
    await expect(page.getByText(/put together a Mutual NDA/i)).toBeVisible();
  });

  test("freeform finder routes a matched request to the document chat", async ({
    page,
  }) => {
    await page.route("**/api/documents/detect", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          reply: "Great — let's create your NDA.",
          matchedSlug: "mutual-nda",
          suggestedSlug: null,
        }),
      });
    });

    await page.goto("/dashboard");
    await page.getByTestId("finder-input").fill("protect confidential info");
    await page.getByTestId("finder-submit").click();

    await expect(page).toHaveURL(/\/documents\/mutual-nda\/create$/);
  });

  test("freeform finder suggests the closest doc for an unsupported request", async ({
    page,
  }) => {
    await page.route("**/api/documents/detect", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          reply:
            "We can't generate an employment contract, but a Professional Services Agreement is the closest we offer.",
          matchedSlug: null,
          suggestedSlug: "psa",
        }),
      });
    });

    await page.goto("/dashboard");
    await page.getByTestId("finder-input").fill("an employment contract");
    await page.getByTestId("finder-submit").click();

    await expect(page.getByTestId("finder-suggestion")).toContainText(
      /closest we offer/i,
    );
    await page.getByTestId("finder-suggested-link").click();
    await expect(page).toHaveURL(/\/documents\/psa\/create$/);
  });

  test("opens the account menu and signs out", async ({ page }) => {
    await page.goto("/dashboard");

    await page.getByTestId("account-menu").click();
    await page.getByTestId("sign-out").click();

    await expect(page).toHaveURL(/\/login/);
    const token = await page.evaluate(() =>
      window.localStorage.getItem("prelegal.auth.token"),
    );
    expect(token).toBeNull();
  });

  test("navigates to the document history page from the account menu", async ({
    page,
  }) => {
    await page.route("**/api/documents/history", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify([]),
      });
    });

    await page.goto("/dashboard");
    await page.getByTestId("account-menu").click();
    await page.getByTestId("nav-history").click();

    await expect(page).toHaveURL(/\/history$/);
    await expect(page.getByTestId("history-empty")).toBeVisible();
  });
});
