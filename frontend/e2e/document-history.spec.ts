import { test, expect } from "@playwright/test";

const NDA_FIELDS = {
  partyA_companyName: "Acme Inc",
  partyA_address: "1 Acme St, Springfield",
  partyA_representative: "Alice Adams",
  partyA_email: "alice@acme.com",
  partyB_companyName: "Beta LLC",
  partyB_address: "2 Beta Ave, Metropolis",
  partyB_representative: "Bob Brown",
  partyB_email: "bob@beta.com",
  effectiveDate: "2026-01-01",
  ndaTerm: "2 years",
  confidentialityTerm: "3 years",
  purpose: "Exploring a potential business partnership",
  governingLaw: "California",
  jurisdiction: "state and federal courts in San Francisco County, California",
};

const SUMMARY = {
  id: 42,
  slug: "mutual-nda",
  name: "Mutual Non-Disclosure Agreement",
  title: "Mutual NDA — Acme Inc",
  createdAt: "2026-07-01 12:00:00",
};

test.describe("document history", () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      window.localStorage.setItem("prelegal.auth.token", "e2e-token");
      window.localStorage.setItem(
        "prelegal.auth.user",
        JSON.stringify({ id: 1, email: "founder@example.com", displayName: "Founder" }),
      );
    });

    // Single-document detail (register the more specific route first).
    await page.route("**/api/documents/history/*", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ ...SUMMARY, fields: NDA_FIELDS }),
      });
    });
    // History list.
    await page.route("**/api/documents/history", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify([SUMMARY]),
      });
    });
  });

  test("lists saved documents and opens one to re-download", async ({ page }) => {
    await page.goto("/history");

    const item = page.getByTestId(`history-item-${SUMMARY.id}`);
    await expect(item).toBeVisible();
    await expect(item).toContainText("Acme Inc");

    await item.click();
    await expect(page).toHaveURL(
      /\/documents\/mutual-nda\/view\?id=42$/,
    );

    // The saved fields fill the read-only preview and the disclaimer shows.
    await expect(page.getByTestId("document-preview")).toContainText("Acme Inc");
    await expect(page.getByTestId("draft-disclaimer")).toBeVisible();

    const downloadPromise = page.waitForEvent("download");
    await page.getByTestId("download-pdf").click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toBe("Mutual-NDA.pdf");
  });

  test("shows an empty state when there are no documents", async ({ page }) => {
    await page.route("**/api/documents/history", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify([]),
      });
    });

    await page.goto("/history");
    await expect(page.getByTestId("history-empty")).toBeVisible();
  });
});
