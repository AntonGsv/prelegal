import { describe, it, expect, vi, afterEach } from "vitest";
import { sendNdaChat } from "./api-client";
import type { ChatMessage } from "../types/chat";

describe("sendNdaChat", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("posts the conversation and returns the parsed response", async () => {
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
    const result = await sendNdaChat(messages);

    expect(result).toEqual(mockResponse);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, options] = fetchMock.mock.calls[0];
    expect(url).toContain("/api/nda/mutual/chat");
    expect(options.method).toBe("POST");
    expect(options.headers).toMatchObject({ "Content-Type": "application/json" });
    expect(JSON.parse(options.body)).toEqual({ messages });
  });

  it("throws when the response is not ok", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: false, status: 502 }),
    );

    await expect(
      sendNdaChat([{ role: "user", content: "hi" }]),
    ).rejects.toThrow(/502/);
  });
});
