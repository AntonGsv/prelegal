import { test, expect } from "@playwright/test";

const AUTH_USER = { id: 1, email: "founder@example.com", displayName: null };

async function mockLogin(page: import("@playwright/test").Page) {
  await page.route("**/api/auth/login", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ token: "e2e-token", user: AUTH_USER }),
    });
  });
}

async function mockRegister(page: import("@playwright/test").Page) {
  await page.route("**/api/auth/register", async (route) => {
    await route.fulfill({
      status: 201,
      contentType: "application/json",
      body: JSON.stringify({ token: "e2e-token", user: AUTH_USER }),
    });
  });
}

test.describe("Marketing landing page", () => {
  test("shows the hero and routes to sign up", async ({ page }) => {
    await page.goto("/");

    await expect(
      page.getByRole("heading", { name: /Legal documents, drafted by conversation/i }),
    ).toBeVisible();

    await page.getByTestId("hero-get-started").click();
    await expect(page).toHaveURL(/\/signup$/);
  });

  test("redirects unauthenticated dashboard visits to login", async ({ page }) => {
    // A fresh Playwright context has no session token, so the gate should bounce.
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/login/);
  });
});

test.describe("Sign in", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/login");
  });

  test("should display the sign-in page", async ({ page }) => {
    await expect(page).toHaveTitle(/Sign in/);
    await expect(page.getByRole("heading", { name: "Prelegal" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Sign in" })).toBeVisible();
    await expect(page.getByLabel("Email")).toBeVisible();
    await expect(page.getByLabel("Password")).toBeVisible();
  });

  test("should validate the form before submitting", async ({ page }) => {
    await page.getByTestId("login-submit").click();
    await expect(page.getByText("Email is required")).toBeVisible();
    await expect(page.getByText("Password is required")).toBeVisible();

    await page.getByLabel("Email").fill("not-an-email");
    await page.getByTestId("login-submit").click();
    await expect(page.getByText("Enter a valid email")).toBeVisible();
  });

  test("should sign in and navigate to the dashboard", async ({ page }) => {
    await mockLogin(page);

    await page.getByLabel("Email").fill("founder@example.com");
    await page.getByLabel("Password").fill("password123");
    await page.getByTestId("login-submit").click();

    await expect(page).toHaveURL(/\/dashboard/);
    await expect(
      page.getByRole("heading", { name: /Legal Documents Made Simple/i }),
    ).toBeVisible();

    const token = await page.evaluate(() =>
      window.localStorage.getItem("prelegal.auth.token"),
    );
    expect(token).toBe("e2e-token");
  });

  test("should link to the sign-up page", async ({ page }) => {
    await page.getByRole("link", { name: "Create an account" }).click();
    await expect(page).toHaveURL(/\/signup$/);
  });
});

test.describe("Sign up", () => {
  test("should register a new account and navigate to the dashboard", async ({
    page,
  }) => {
    await mockRegister(page);
    await page.goto("/signup");

    await page.getByLabel("Email").fill("founder@example.com");
    await page.getByLabel("Password", { exact: true }).fill("password123");
    await page.getByLabel("Confirm password").fill("password123");
    await page.getByTestId("signup-submit").click();

    await expect(page).toHaveURL(/\/dashboard/);
    const token = await page.evaluate(() =>
      window.localStorage.getItem("prelegal.auth.token"),
    );
    expect(token).toBe("e2e-token");
  });

  test("should reject mismatched passwords", async ({ page }) => {
    await page.goto("/signup");

    await page.getByLabel("Email").fill("founder@example.com");
    await page.getByLabel("Password", { exact: true }).fill("password123");
    await page.getByLabel("Confirm password").fill("different123");
    await page.getByTestId("signup-submit").click();

    await expect(page.getByText("Passwords do not match")).toBeVisible();
  });
});
