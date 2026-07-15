import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import {
  detectDocumentType,
  getDocument,
  listDocuments,
  loginUser,
  registerUser,
  saveDocument,
  sendDocumentChat,
} from "./api-client";
import { setSession } from "./auth-storage";
import type { ChatMessage } from "../types/chat";

function mockFetchOnce(body: unknown, ok = true, status = 200) {
  const fetchMock = vi.fn().mockResolvedValue({
    ok,
    status,
    json: async () => body,
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

describe("api-client", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

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

  describe("auth endpoints", () => {
    it("registers without attaching an auth header", async () => {
      const fetchMock = mockFetchOnce({
        token: "t",
        user: { id: 1, email: "a@b.com", displayName: null },
      });

      const result = await registerUser("a@b.com", "longenough", "Jane");

      expect(result.token).toBe("t");
      const [url, options] = fetchMock.mock.calls[0];
      expect(url).toContain("/api/auth/register");
      expect(JSON.parse(options.body)).toEqual({
        email: "a@b.com",
        password: "longenough",
        displayName: "Jane",
      });
      expect(options.headers.Authorization).toBeUndefined();
    });

    it("logs in and returns the token + user", async () => {
      const fetchMock = mockFetchOnce({
        token: "tok",
        user: { id: 2, email: "c@d.com", displayName: "C" },
      });

      const result = await loginUser("c@d.com", "secret123");

      expect(result.user.email).toBe("c@d.com");
      expect(fetchMock.mock.calls[0][0]).toContain("/api/auth/login");
    });

    it("surfaces the backend error detail message", async () => {
      mockFetchOnce({ detail: "An account with this email already exists" }, false, 409);

      await expect(registerUser("a@b.com", "longenough")).rejects.toThrow(
        /already exists/,
      );
    });
  });

  describe("document history endpoints", () => {
    it("attaches the bearer token when signed in", async () => {
      setSession("my-token", { id: 1, email: "a@b.com", displayName: null });
      const fetchMock = mockFetchOnce([]);

      await listDocuments();

      const [url, options] = fetchMock.mock.calls[0];
      expect(url).toContain("/api/documents/history");
      expect(options.headers.Authorization).toBe("Bearer my-token");
    });

    it("posts the slug and fields when saving", async () => {
      setSession("my-token", { id: 1, email: "a@b.com", displayName: null });
      const fetchMock = mockFetchOnce({
        id: 5,
        slug: "mutual-nda",
        name: "Mutual Non-Disclosure Agreement",
        title: "Mutual NDA — Acme",
        createdAt: "2026-01-01 00:00:00",
        fields: { partyA_companyName: "Acme" },
      });

      const result = await saveDocument("mutual-nda", { partyA_companyName: "Acme" });

      expect(result.id).toBe(5);
      const [url, options] = fetchMock.mock.calls[0];
      expect(url).toContain("/api/documents/history");
      expect(options.method).toBe("POST");
      expect(JSON.parse(options.body)).toEqual({
        slug: "mutual-nda",
        fields: { partyA_companyName: "Acme" },
        title: undefined,
      });
    });

    it("fetches a single document by id", async () => {
      setSession("my-token", { id: 1, email: "a@b.com", displayName: null });
      const fetchMock = mockFetchOnce({
        id: 7,
        slug: "mutual-nda",
        name: "Mutual Non-Disclosure Agreement",
        title: "Mutual NDA",
        createdAt: null,
        fields: {},
      });

      const result = await getDocument(7);

      expect(result.id).toBe(7);
      expect(fetchMock.mock.calls[0][0]).toContain("/api/documents/history/7");
    });
  });
});
