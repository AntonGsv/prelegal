import { test, expect } from "@playwright/test";

test.describe("Login-gated entry flow", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/login");
  });

  test("should display the login page", async ({ page }) => {
    await expect(page).toHaveTitle(/Sign in/);
    await expect(page.getByRole("heading", { name: "Prelegal" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Sign in" })).toBeVisible();
    await expect(page.getByLabel("Email")).toBeVisible();
  });

  test("should validate email before continuing", async ({ page }) => {
    await page.getByTestId("login-submit").click();
    await expect(page.locator("form [role='alert']")).toContainText("Email is required");

    await page.getByLabel("Email").fill("not-an-email");
    await page.getByTestId("login-submit").click();
    await expect(page.locator("form [role='alert']")).toContainText("Enter a valid email");
  });

  test("should store the fake login flag and navigate to dashboard", async ({ page }) => {
    await page.getByLabel("Email").fill("founder@example.com");
    await page.getByTestId("login-submit").click();

    await expect(page).toHaveURL(/\/dashboard/);
    await expect(page.getByRole("heading", { name: /Legal Documents Made Simple/i })).toBeVisible();

    const loggedIn = await page.evaluate(() =>
      window.localStorage.getItem("prelegal.auth.loggedIn")
    );
    expect(loggedIn).toBe("true");
  });

  test("should redirect unauthenticated root visits to login", async ({ page }) => {
    await page.evaluate(() => window.localStorage.clear());
    await page.goto("/");
    await expect(page).toHaveURL(/\/login/);
  });
});

test.describe("Dashboard", () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      window.localStorage.setItem("prelegal.auth.loggedIn", "true");
    });
    await page.goto("/dashboard");
  });

  test("should show the document gallery and freeform finder", async ({ page }) => {
    await expect(page.getByRole("heading", { name: /Legal Documents Made Simple/i })).toBeVisible();
    await expect(page.getByTestId("document-gallery")).toBeVisible();
    await expect(page.getByTestId("finder-input")).toBeVisible();
    await expect(page.getByTestId("doc-card-mutual-nda")).toBeVisible();
  });

  test("should navigate to a document creation page from the gallery", async ({ page }) => {
    await page.getByTestId("doc-card-mutual-nda").click();
    await expect(page).toHaveURL(/\/documents\/mutual-nda\/create/);
  });

  test("should sign out and return to login", async ({ page }) => {
    await page.getByTestId("sign-out").click();
    await expect(page).toHaveURL(/\/login/);

    const loggedIn = await page.evaluate(() =>
      window.localStorage.getItem("prelegal.auth.loggedIn")
    );
    expect(loggedIn).toBeNull();
  });
});
