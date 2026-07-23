import { describe, expect, it } from "vitest";
import { matchesRule, getPayloadValue, buildDefaultRule, getEventSummary } from "../server/rules";

describe("Rules Engine", () => {
  describe("Issue and PR Rule Matching", () => {
    const titleRule = {
      eventType: "issues",
      matchField: "title",
      matchType: "contains",
      matchValue: "critical bug",
      actionLabel: "bug",
      actionComment: "Triaged",
      notifySlack: true
    };

    it("matches issues by title (happy path)", () => {
      const payload = {
        issue: { title: "Fix critical bug in payment handler" }
      };
      expect(matchesRule(titleRule, "issues", payload)).toBe(true);
    });

    it("matches PRs by body (happy path - equals)", () => {
      const bodyRule = {
        eventType: "pull_request",
        matchField: "body",
        matchType: "equals",
        matchValue: "ready for review",
        actionLabel: "needs-review",
        actionComment: null,
        notifySlack: false
      };
      const payload = {
        pull_request: { body: "READY FOR REVIEW" }
      };
      expect(matchesRule(bodyRule, "pull_request", payload)).toBe(true);
    });

    it("matches issues/PRs by author", () => {
      const authorRule = {
        eventType: "issues",
        matchField: "author",
        matchType: "contains",
        matchValue: "octocat",
        actionLabel: null,
        actionComment: null,
        notifySlack: true
      };
      const payload = {
        issue: { user: { login: "octocat-dev" } }
      };
      expect(matchesRule(authorRule, "issues", payload)).toBe(true);
    });

    it("edge case: handles missing or null fields without throwing", () => {
      const payload = {};
      expect(matchesRule(titleRule, "issues", payload)).toBe(false);
      expect(getPayloadValue(payload, "title")).toBe("");
      expect(getPayloadValue(payload, "body")).toBe("");
      expect(getPayloadValue(payload, "author")).toBe("");
    });

    it("edge case: malformed input with numbers instead of strings", () => {
      const payload = {
        issue: { title: 12345, body: null }
      } as any;
      expect(getPayloadValue(payload, "title")).toBe("");
      expect(matchesRule(titleRule, "issues", payload)).toBe(false);
    });
  });

  describe("Push Event Rule Matching", () => {
    const branchRule = {
      eventType: "push",
      matchField: "ref",
      matchType: "contains",
      matchValue: "main",
      actionLabel: null,
      actionComment: null,
      notifySlack: true
    };

    it("matches push by branch ref (happy path)", () => {
      const payload = {
        ref: "refs/heads/main",
        head_commit: { message: "hotfix", author: { username: "alice", name: "Alice" } }
      };
      expect(matchesRule(branchRule, "push", payload)).toBe(true);
    });

    it("matches push by committer author", () => {
      const committerRule = {
        eventType: "push",
        matchField: "author",
        matchType: "equals",
        matchValue: "alice",
        actionLabel: null,
        actionComment: null,
        notifySlack: true
      };
      const payload = {
        head_commit: { author: { username: "alice", name: "Alice" } }
      };
      expect(matchesRule(committerRule, "push", payload)).toBe(true);
    });

    it("matches push by commit message", () => {
      const msgRule = {
        eventType: "push",
        matchField: "message",
        matchType: "contains",
        matchValue: "feat:",
        actionLabel: null,
        actionComment: null,
        notifySlack: true
      };
      const payload = {
        head_commit: { message: "feat: add user profile dashboard" }
      };
      expect(matchesRule(msgRule, "push", payload)).toBe(true);
    });

    it("edge case: empty commit list or missing ref", () => {
      const payload = { commits: [] };
      expect(getPayloadValue(payload, "ref")).toBe("");
      expect(getPayloadValue(payload, "message")).toBe("");
      expect(matchesRule(branchRule, "push", payload)).toBe(false);
    });
  });

  describe("Empty Rule Sets & Fallbacks", () => {
    it("handles empty rule sets gracefully without false triggers", () => {
      const payload = { issue: { title: "Documentation update" } };
      const fallback = buildDefaultRule("issues", payload);
      expect(fallback).toBeNull();
    });

    it("triggers bug fallback when title contains 'bug' and no rules exist", () => {
      const payload = { issue: { title: "Found a critical bug in search" } };
      const fallback = buildDefaultRule("issues", payload);
      expect(fallback).not.toBeNull();
      expect(fallback?.actionLabel).toBe("bug");
    });
  });

  describe("Event Summary Generation", () => {
    it("generates structured summary for push events", () => {
      const summary = getEventSummary("push", {
        ref: "refs/heads/feature-1",
        commits: [{ message: "First commit", author: { name: "bob" }, modified: ["src/app.ts"] }],
        pusher: { name: "bob", email: "bob@example.com" }
      });
      expect(summary.typeLabel).toBe("Push");
      expect(summary.author).toBe("bob");
      expect(summary.description).toContain("feature-1");
    });
  });
});
