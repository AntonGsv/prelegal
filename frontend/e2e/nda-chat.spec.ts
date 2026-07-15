import { test, expect } from "@playwright/test";

const COMPLETE_FIELDS = {
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

test.describe("NDA chat", () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      window.localStorage.setItem("prelegal.auth.loggedIn", "true");
    });
  });

  test("collects details via chat and generates a PDF", async ({ page }) => {
    // Stub the AI backend so the test needs no API key and is deterministic.
    let turn = 0;
    await page.route("**/api/nda/mutual/chat", async (route) => {
      turn += 1;
      const body =
        turn === 1
          ? {
              reply: "Thanks! What is the effective date?",
              fields: {
                partyA_companyName: "Acme Inc",
                partyB_companyName: "Beta LLC",
              },
            }
          : {
              reply: "All set! Ready to generate your NDA.",
              fields: COMPLETE_FIELDS,
            };
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(body),
      });
    });

    await page.goto("/nda/mutual/create");

    // The greeting and the live document preview render on load.
    await expect(page.getByText(/put together a Mutual NDA/i)).toBeVisible();
    await expect(page.getByTestId("nda-document-preview")).toBeVisible();

    // First turn: the preview picks up the partial fields.
    await page.getByTestId("chat-input").fill("Acme Inc and Beta LLC");
    await page.getByTestId("chat-send").click();
    await expect(
      page.getByText("Thanks! What is the effective date?"),
    ).toBeVisible();
    await expect(page.getByTestId("nda-document-preview")).toContainText(
      "Acme Inc",
    );

    // Second turn: all fields arrive, enabling PDF generation.
    await page.getByTestId("chat-input").fill("Here are all the remaining details");
    await page.getByTestId("chat-send").click();
    await expect(
      page.getByText("All set! Ready to generate your NDA."),
    ).toBeVisible();

    // The generate button appears and downloading produces the NDA PDF.
    const generate = page.getByTestId("generate-pdf");
    await expect(generate).toBeVisible();

    const downloadPromise = page.waitForEvent("download");
    await generate.click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toBe("Mutual-NDA.pdf");
  });
});
