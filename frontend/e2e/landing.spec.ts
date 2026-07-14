import { test, expect } from "@playwright/test";

test.describe("Landing Page", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
  });

  test("should display the page title", async ({ page }) => {
    await expect(page).toHaveTitle(/Prelegal/);
  });

  test("should show hero section with headline", async ({ page }) => {
    const headline = page.getByRole("heading", {
      name: /Legal Documents Made Simple/i,
    });
    await expect(headline).toBeVisible();
  });

  test("should display feature cards", async ({ page }) => {
    await expect(page.getByText("Fill in Details")).toBeVisible();
    await expect(page.getByText("Preview Document")).toBeVisible();
    await expect(page.getByText("Download PDF")).toBeVisible();
  });

  test("should have navigation header", async ({ page }) => {
    await expect(page.getByRole("heading", { name: "Prelegal" })).toBeVisible();
  });

  test("should have Get Started button", async ({ page }) => {
    const getStartedButton = page.getByRole("link", { name: /Get Started/i });
    await expect(getStartedButton).toBeVisible();
  });

  test("should have Create NDA button in nav", async ({ page }) => {
    const createButton = page.getByRole("button", { name: /Create NDA/i });
    await expect(createButton).toBeVisible();
  });

  test("should navigate to NDA creation page when clicking Get Started", async ({
    page,
  }) => {
    await page.getByRole("link", { name: /Get Started/i }).click();
    await expect(page).toHaveURL(/\/nda\/mutual\/create/);
  });

  test("should navigate to NDA creation page when clicking Create NDA", async ({
    page,
  }) => {
    await page.getByRole("button", { name: /Create NDA/i }).click();
    await expect(page).toHaveURL(/\/nda\/mutual\/create/);
  });

  test("should show CommonPaper attribution", async ({ page }) => {
    await expect(page.getByText(/CommonPaper/i)).toBeVisible();
  });

  test("should be accessible", async ({ page }) => {
    await expect(page.getByRole("main")).toBeVisible();
  });
});
