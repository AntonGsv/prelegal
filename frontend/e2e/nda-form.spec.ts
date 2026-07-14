import { test, expect, Page } from "@playwright/test";

const TEST_DATA = {
  partyA: {
    companyName: "Acme Corporation",
    address: "123 Tech Street, San Francisco, CA 94105",
    representative: "John Smith",
    email: "john.smith@acme.com",
  },
  partyB: {
    companyName: "Beta Industries",
    address: "456 Innovation Ave, New York, NY 10001",
    representative: "Jane Doe",
    email: "jane.doe@beta.com",
  },
  terms: {
    effectiveDate: "2024-06-15",
    ndaTerm: "2 years",
    confidentialityTerm: "3 years",
    purpose:
      "Evaluating a potential business partnership and technology collaboration opportunity",
  },
  legal: {
    governingLaw: "California",
    jurisdiction: "federal or state courts in San Francisco County, California",
  },
};

async function fillPartyA(page: Page) {
  await page.fill('input[id="partyA_companyName"]', TEST_DATA.partyA.companyName);
  await page.fill('input[id="partyA_address"]', TEST_DATA.partyA.address);
  await page.fill('input[id="partyA_representative"]', TEST_DATA.partyA.representative);
  await page.fill('input[id="partyA_email"]', TEST_DATA.partyA.email);
}

async function fillPartyB(page: Page) {
  await page.fill('input[id="partyB_companyName"]', TEST_DATA.partyB.companyName);
  await page.fill('input[id="partyB_address"]', TEST_DATA.partyB.address);
  await page.fill('input[id="partyB_representative"]', TEST_DATA.partyB.representative);
  await page.fill('input[id="partyB_email"]', TEST_DATA.partyB.email);
}

async function fillTerms(page: Page) {
  await page.fill('input[id="effectiveDate"]', TEST_DATA.terms.effectiveDate);
  await page.fill('input[id="ndaTerm"]', TEST_DATA.terms.ndaTerm);
  await page.fill('input[id="confidentialityTerm"]', TEST_DATA.terms.confidentialityTerm);
  await page.fill('textarea[id="purpose"]', TEST_DATA.terms.purpose);
}

async function fillLegal(page: Page) {
  await page.selectOption('select[id="governingLaw"]', TEST_DATA.legal.governingLaw);
  await page.fill('input[id="jurisdiction"]', TEST_DATA.legal.jurisdiction);
}

async function fillCompleteForm(page: Page) {
  await fillPartyA(page);
  await fillPartyB(page);
  await fillTerms(page);
  await fillLegal(page);
}

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.setItem("prelegal.auth.loggedIn", "true");
  });
});

test.describe("NDA Form Page", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/nda/mutual/create");
  });

  test("should display page title and header", async ({ page }) => {
    await expect(page.getByRole("heading", { name: "Create Mutual NDA" })).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Create Mutual NDA" }).locator("..").getByText(/Fill in the details/)
    ).toBeVisible();
  });

  test("should display all form sections", async ({ page }) => {
    await expect(page.getByText("Agreement Terms")).toBeVisible();
    await expect(page.getByRole("heading", { name: /Party A/ })).toBeVisible();
    await expect(page.getByRole("heading", { name: /Party B/ })).toBeVisible();
    await expect(page.getByLabel("Description *")).toBeVisible();
    await expect(page.getByText("Governing Law & Jurisdiction")).toBeVisible();
  });

  test("should display preview panel", async ({ page }) => {
    await expect(page.getByText("Cover Page Preview")).toBeVisible();
  });

  test("should update preview with all form fields", async ({ page }) => {
    // This test ensures NdaPreview is inside FormProvider
    // If NdaPreview is outside FormProvider, useFormContext returns null and preview shows "Not set"

    await page.fill('input[id="partyA_companyName"]', TEST_DATA.partyA.companyName);
    await page.fill('input[id="partyB_companyName"]', TEST_DATA.partyB.companyName);
    await page.fill('input[id="ndaTerm"]', TEST_DATA.terms.ndaTerm);
    await page.fill('textarea[id="purpose"]', TEST_DATA.terms.purpose);

    // Verify preview shows actual values, NOT "Not set"
    // If "Not set" appears, it means NdaPreview is outside FormProvider
    await expect(page.locator("#nda-preview-section").getByText(TEST_DATA.partyA.companyName)).toBeVisible();
    await expect(page.locator("#nda-preview-section").getByText(TEST_DATA.partyB.companyName)).toBeVisible();
    await expect(page.locator("#nda-preview-section").getByText(TEST_DATA.terms.ndaTerm)).toBeVisible();
    await expect(page.locator("#nda-preview-section").getByText(TEST_DATA.terms.purpose)).toBeVisible();
  });

  test("should show validation errors for empty required fields", async ({ page }) => {
    // Try to submit without filling anything
    await page.getByRole("button", { name: /Generate & Download PDF/i }).click();

    // Check for validation messages - at least some should appear
    const errorCount = await page.locator("p.text-xs.text-red-500").count();
    expect(errorCount).toBeGreaterThan(0);
  });

  test("should show error for short purpose", async ({ page }) => {
    await fillPartyA(page);
    await page.fill('textarea[id="purpose"]', "short");
    await page.getByRole("button", { name: /Generate & Download PDF/i }).click();
    // Should show validation errors
    const errorCount = await page.locator("p.text-xs.text-red-500").count();
    expect(errorCount).toBeGreaterThan(0);
  });

  test("should update preview in real-time as user types", async ({ page }) => {
    // Initially show "Not set"
    await expect(page.getByText("Not set").first()).toBeVisible();

    // Fill in Party A company name
    await page.fill('input[id="partyA_companyName"]', TEST_DATA.partyA.companyName);

    // Preview should now show the company name
    await expect(page.getByText(TEST_DATA.partyA.companyName)).toBeVisible();
  });

  test("should update preview for Party B", async ({ page }) => {
    await page.fill('input[id="partyB_companyName"]', TEST_DATA.partyB.companyName);
    await expect(page.getByText(TEST_DATA.partyB.companyName)).toBeVisible();
  });

  test("should update preview for terms", async ({ page }) => {
    await page.fill('input[id="ndaTerm"]', TEST_DATA.terms.ndaTerm);
    await expect(page.getByText(TEST_DATA.terms.ndaTerm)).toBeVisible();
  });

  test("should allow selecting US state from dropdown", async ({ page }) => {
    const governingLawSelect = page.locator('select[id="governingLaw"]');
    await expect(governingLawSelect).toBeVisible();

    // Select California and verify it's selected
    await governingLawSelect.selectOption("California");
    await expect(governingLawSelect).toHaveValue("California");
  });

  test("should have working date picker", async ({ page }) => {
    const dateInput = page.locator('input[id="effectiveDate"]');
    await expect(dateInput).toHaveAttribute("type", "date");
  });

  test("should have submit button with correct text", async ({ page }) => {
    await expect(
      page.getByRole("button", { name: /Generate & Download PDF/i })
    ).toBeVisible();
  });
});

test.describe("NDA Form Submission", () => {
  test("should submit form with valid data and trigger download", async ({ page }) => {
    // Set up download interception
    const downloadPromise = page.waitForEvent("download");

    await page.goto("/nda/mutual/create");
    await fillCompleteForm(page);
    await page.getByRole("button", { name: /Generate & Download PDF/i }).click();

    // Wait for download
    const download = await downloadPromise;

    // Verify download filename
    expect(download.suggestedFilename()).toBe("Mutual-NDA.pdf");
  });

  test("should show loading state during PDF generation", async ({ page }) => {
    await page.goto("/nda/mutual/create");
    await fillCompleteForm(page);

    // Click submit and check for loading state
    await page.getByRole("button", { name: /Generate & Download PDF/i }).click();

    // Should show loading text (briefly)
    await expect(
      page.getByRole("button", { name: /Generating PDF/i })
    ).toBeVisible();
  });

  test("should allow multiple submissions", async ({ page }) => {
    await page.goto("/nda/mutual/create");
    await fillCompleteForm(page);

    // First submission
    await page.getByRole("button", { name: /Generate & Download PDF/i }).click();
    await page.waitForTimeout(600); // Wait for PDF generation

    // Form should still be accessible for second submission
    await page.getByRole("button", { name: /Generate & Download PDF/i }).click();
    await expect(
      page.getByRole("button", { name: /Generate & Download PDF/i })
    ).toBeEnabled();
  });
});

test.describe("NDA Form Accessibility", () => {
  test("should have proper label associations", async ({ page }) => {
    await page.goto("/nda/mutual/create");

    // Check that labels are properly associated
    const companyNameInput = page.locator('input[id="partyA_companyName"]');
    const label = page.locator('label[for="partyA_companyName"]');

    await expect(companyNameInput).toBeAttached();
    await expect(label).toBeVisible();
  });

  test("should have visible focus indicators", async ({ page }) => {
    await page.goto("/nda/mutual/create");

    // Tab through form fields
    await page.keyboard.press("Tab");
    const focusedElement = page.locator(":focus");
    await expect(focusedElement).toBeVisible();
  });

  test("should allow full keyboard navigation", async ({ page }) => {
    await page.goto("/nda/mutual/create");

    // Tab through several fields
    for (let i = 0; i < 10; i++) {
      await page.keyboard.press("Tab");
    }

    // Should be able to reach the submit button
    await page.keyboard.press("Tab");
    await page.keyboard.press("Tab");

    // Submit button should be reachable
    await page.keyboard.press("Enter");
  });
});
