import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { triageEvent } from "@/server/ai-triage";

describe("AI Triage Module", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv };
    delete process.env.GROQ_API_KEY;
    delete process.env.GEMINI_API_KEY;
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("handles events with missing body text gracefully", async () => {
    const result = await triageEvent("issues", {});
    expect(result.priority).toBe("P2");
    expect(result.suggestedLabel).toBe("triage");
    expect(result.summary).toContain("ISSUES event received with no detailed body text.");
  });

  it("categorizes critical security and crash issues as P0", async () => {
    const result = await triageEvent("issues", {
      issue: {
        title: "Fatal crash vulnerability on checkout endpoint",
        body: "The server crashes when exploited with invalid security tokens."
      }
    });

    expect(result.priority).toBe("P0");
    expect(result.suggestedLabel).toBe("security");
    expect(result.summary).toContain("High priority critical item detected");
  });

  it("categorizes bug reports as P1", async () => {
    const result = await triageEvent("issues", {
      issue: {
        title: "Navbar alignment bug on mobile devices",
        body: "When screen width is below 600px, logo overlaps with navigation link."
      }
    });

    expect(result.priority).toBe("P1");
    expect(result.suggestedLabel).toBe("bug");
    expect(result.summary).toContain("Bug report or fix identified");
  });

  it("categorizes feature requests as P1 with enhancement label", async () => {
    const result = await triageEvent("issues", {
      issue: {
        title: "Add support for dark mode toggle",
        body: "Allow users to switch between dark and light themes dynamically."
      }
    });

    expect(result.priority).toBe("P1");
    expect(result.suggestedLabel).toBe("enhancement");
    expect(result.summary).toContain("New feature request or enhancement");
  });

  it("categorizes documentation and chores as P2", async () => {
    const result = await triageEvent("pull_request", {
      pull_request: {
        title: "Update README with installation instructions",
        body: "Correcting typo in setup section."
      }
    });

    expect(result.priority).toBe("P2");
    expect(result.suggestedLabel).toBe("documentation");
  });

  it("extracts details properly from push events", async () => {
    const result = await triageEvent("push", {
      ref: "refs/heads/main",
      commits: [
        { message: "bug: resolve memory leak in worker thread" }
      ]
    });

    expect(result.priority).toBe("P1");
    expect(result.suggestedLabel).toBe("bug");
  });

  it("calls Groq API when GROQ_API_KEY is present and parses JSON response", async () => {
    process.env.GROQ_API_KEY = "mock_groq_key";
    
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        choices: [
          {
            message: {
              content: JSON.stringify({
                summary: "AI summary of critical vulnerability",
                priority: "P0",
                suggestedLabel: "security"
              })
            }
          }
        ]
      })
    } as Response);

    const result = await triageEvent("issues", {
      issue: { title: "SQL Injection found", body: "Discovered flaw in query parser" }
    });

    expect(result.priority).toBe("P0");
    expect(result.summary).toBe("AI summary of critical vulnerability");
    expect(result.suggestedLabel).toBe("security");
  });

  it("falls back to heuristics if Groq API fails", async () => {
    process.env.GROQ_API_KEY = "mock_groq_key";

    global.fetch = vi.fn().mockRejectedValueOnce(new Error("Network timeout"));

    const result = await triageEvent("issues", {
      issue: { title: "Update README comments", body: "Correcting typo in setup section." }
    });

    expect(result.priority).toBe("P2");
    expect(result.suggestedLabel).toBe("documentation");
  });
});
