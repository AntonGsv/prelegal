import { describe, it, expect, vi, afterEach } from "vitest";
import { detectDocumentType, sendDocumentChat } from "./api-client";
import type { ChatMessage } from "../types/chat";

describe("api-client", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  describe("sendDocumentChat", () => {
    it("posts to the document-specific endpoint and returns the response", async () => {
      const mockResponse = {
        reply: "Hello there",
        fields: { partyA_companyName: "Acme Inc" },
      };
      const fetchMock = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => mockResponse,
      });
      vi.stubGlobal("fetch", fetchMock);

      const messages: ChatMessage[] = [{ role: "user", content: "hi" }];
      const result = await sendDocumentChat("mutual-nda", messages);

      expect(result).toEqual(mockResponse);
      const [url, options] = fetchMock.mock.calls[0];
      expect(url).toContain("/api/documents/mutual-nda/chat");
      expect(options.method).toBe("POST");
      expect(JSON.parse(options.body)).toEqual({ messages });
    });

    it("throws when the response is not ok", async () => {
      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue({ ok: false, status: 502 }),
      );
      await expect(
        sendDocumentChat("mutual-nda", [{ role: "user", content: "hi" }]),
      ).rejects.toThrow(/502/);
    });
  });

  describe("detectDocumentType", () => {
    it("posts to the detect endpoint and returns the result", async () => {
      const mockResponse = {
        reply: "Let's create your NDA",
        matchedSlug: "mutual-nda",
        suggestedSlug: null,
      };
      const fetchMock = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => mockResponse,
      });
      vi.stubGlobal("fetch", fetchMock);

      const result = await detectDocumentType([
        { role: "user", content: "I need an NDA" },
      ]);

      expect(result).toEqual(mockResponse);
      const [url] = fetchMock.mock.calls[0];
      expect(url).toContain("/api/documents/detect");
    });

    it("throws when the response is not ok", async () => {
      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue({ ok: false, status: 503 }),
      );
      await expect(
        detectDocumentType([{ role: "user", content: "hi" }]),
      ).rejects.toThrow(/503/);
    });
  });
});
