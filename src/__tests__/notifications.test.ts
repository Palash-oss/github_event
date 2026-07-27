import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { sendMultiChannelNotifications } from "@/server/notifications";

vi.mock("@/server/slack", () => ({
  sendSlackMessage: vi.fn().mockResolvedValue(true),
  buildSlackBlockKitMessage: vi.fn().mockReturnValue({ blocks: [] })
}));

describe("Multi-Channel Notifications", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("dispatches Slack notification successfully when notifySlack is true", async () => {
    const results = await sendMultiChannelNotifications({
      owner: "Palash-oss",
      repo: "DLRL",
      eventType: "issues",
      payload: { issue: { number: 42, title: "Test issue" } },
      notifySlack: true,
      notifyDiscord: false,
      notifyTelegram: false,
      aiSummary: "P0 issue detected",
      aiPriority: "P0"
    });

    expect(results).toHaveLength(1);
    expect(results[0]).toEqual({ channel: "slack", status: "success" });
  });

  it("fails Discord notification when DISCORD_WEBHOOK_URL is missing", async () => {
    delete process.env.DISCORD_WEBHOOK_URL;

    const results = await sendMultiChannelNotifications({
      owner: "Palash-oss",
      repo: "DLRL",
      eventType: "pull_request",
      payload: { pull_request: { number: 12, title: "Feature PR" } },
      notifySlack: false,
      notifyDiscord: true,
      notifyTelegram: false
    });

    expect(results).toHaveLength(1);
    expect(results[0].channel).toBe("discord");
    expect(results[0].status).toBe("failed");
    expect(results[0].error).toContain("DISCORD_WEBHOOK_URL is not configured");
  });

  it("dispatches Discord webhook embed when DISCORD_WEBHOOK_URL is set", async () => {
    process.env.DISCORD_WEBHOOK_URL = "https://discord.com/api/webhooks/123/abc";

    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => ({})
    } as Response);

    const results = await sendMultiChannelNotifications({
      owner: "Palash-oss",
      repo: "DLRL",
      eventType: "issues",
      payload: { issue: { number: 10, title: "Critical crash" } },
      notifySlack: false,
      notifyDiscord: true,
      notifyTelegram: false,
      aiPriority: "P0",
      aiSummary: "Server error"
    });

    expect(results).toHaveLength(1);
    expect(results[0]).toEqual({ channel: "discord", status: "success" });
    expect(global.fetch).toHaveBeenCalledWith(
      "https://discord.com/api/webhooks/123/abc",
      expect.objectContaining({
        method: "POST",
        headers: { "Content-Type": "application/json" }
      })
    );
  });

  it("fails Telegram notification when TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID is missing", async () => {
    delete process.env.TELEGRAM_BOT_TOKEN;
    delete process.env.TELEGRAM_CHAT_ID;

    const results = await sendMultiChannelNotifications({
      owner: "Palash-oss",
      repo: "DLRL",
      eventType: "push",
      payload: { ref: "refs/heads/main", pusher: { name: "palash" } },
      notifySlack: false,
      notifyDiscord: false,
      notifyTelegram: true
    });

    expect(results).toHaveLength(1);
    expect(results[0].channel).toBe("telegram");
    expect(results[0].status).toBe("failed");
    expect(results[0].error).toContain("TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID missing");
  });

  it("dispatches Telegram notification when bot token and chat ID are configured", async () => {
    process.env.TELEGRAM_BOT_TOKEN = "123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11";
    process.env.TELEGRAM_CHAT_ID = "-100123456789";

    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => ({ ok: true })
    } as Response);

    const results = await sendMultiChannelNotifications({
      owner: "Palash-oss",
      repo: "DLRL",
      eventType: "issues",
      payload: { issue: { number: 5, title: "Bug in auth" } },
      notifySlack: false,
      notifyDiscord: false,
      notifyTelegram: true,
      aiPriority: "P1"
    });

    expect(results).toHaveLength(1);
    expect(results[0]).toEqual({ channel: "telegram", status: "success" });
    expect(global.fetch).toHaveBeenCalledWith(
      "https://api.telegram.org/bot123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11/sendMessage",
      expect.objectContaining({
        method: "POST"
      })
    );
  });
});
