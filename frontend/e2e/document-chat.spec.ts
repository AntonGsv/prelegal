import { test, expect } from "@playwright/test";

const NDA_COMPLETE = {
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

test.describe("document chat", () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      window.localStorage.setItem("prelegal.auth.loggedIn", "true");
    });
  });

  test("collects NDA details via chat and generates the PDF", async ({ page }) => {
    let turn = 0;
    await page.route("**/api/documents/mutual-nda/chat", async (route) => {
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
              reply: "All set! Ready to generate your document.",
              fields: NDA_COMPLETE,
            };
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(body),
      });
    });

    await page.goto("/documents/mutual-nda/create");

    await expect(page.getByText(/put together a Mutual NDA/i)).toBeVisible();
    await expect(page.getByTestId("document-preview")).toBeVisible();

    await page.getByTestId("chat-input").fill("Acme Inc and Beta LLC");
    await page.getByTestId("chat-send").click();
    await expect(
      page.getByText("Thanks! What is the effective date?"),
    ).toBeVisible();
    await expect(page.getByTestId("document-preview")).toContainText("Acme Inc");

    await page.getByTestId("chat-input").fill("Here are all the remaining details");
    await page.getByTestId("chat-send").click();
    await expect(
      page.getByText("All set! Ready to generate your document."),
    ).toBeVisible();

    const generate = page.getByTestId("generate-pdf");
    await expect(generate).toBeVisible();

    const downloadPromise = page.waitForEvent("download");
    await generate.click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toBe("Mutual-NDA.pdf");
  });

  test("works for a second document type (Pilot Agreement)", async ({ page }) => {
    await page.route("**/api/documents/pilot-agreement/chat", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          reply: "Got the provider name.",
          fields: { partyA_companyName: "Acme Inc" },
        }),
      });
    });

    await page.goto("/documents/pilot-agreement/create");

    await expect(page.getByText(/put together a Pilot Agreement/i)).toBeVisible();
    await expect(page.getByTestId("document-preview")).toContainText(
      "Pilot Agreement",
    );

    await page.getByTestId("chat-input").fill("The provider is Acme Inc");
    await page.getByTestId("chat-send").click();
    await expect(page.getByTestId("document-preview")).toContainText("Acme Inc");
  });

  test("legacy NDA route redirects to the new document route", async ({ page }) => {
    await page.goto("/nda/mutual/create");
    await expect(page).toHaveURL(/\/documents\/mutual-nda\/create$/);
  });
});
