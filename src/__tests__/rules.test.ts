import { describe, expect, it } from "vitest";
import { matchesRule, getPayloadValue, buildDefaultRule, getEventSummary, matchGlob, matchesChangedFiles } from "../server/rules";

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

  describe("Codebase-Aware Diff Rule: changed_files_match", () => {
    const prRule = {
      eventType: "pull_request",
      matchField: "changed_files_match",
      matchType: "glob_match",
      matchValue: "src/payments/**",
      actionLabel: "payments-team",
      actionComment: "Attention @payments-team: Payment code modified.",
      notifySlack: true
    };

    it("1. Exact file path match (package.json)", () => {
      const exactRule = {
        eventType: "pull_request",
        matchField: "changed_files_match",
        matchType: "equals",
        matchValue: "package.json",
        actionLabel: "dependencies",
        actionComment: null,
        notifySlack: true
      };
      const prFiles = ["src/app.ts", "package.json", "README.md"];
      expect(matchesRule(exactRule, "pull_request", {}, undefined, prFiles)).toBe(true);
    });

    it("2. Glob/wildcard match (src/payments/**, *.env)", () => {
      const prFiles1 = ["src/payments/v2/checkout/stripe.ts", "README.md"];
      expect(matchesRule(prRule, "pull_request", {}, undefined, prFiles1)).toBe(true);

      const envRule = {
        eventType: "pull_request",
        matchField: "changed_files_match",
        matchType: "glob_match",
        matchValue: "*.env",
        actionLabel: "secrets",
        actionComment: null,
        notifySlack: true
      };
      const prFiles2 = ["config/production.env", "src/index.ts"];
      expect(matchesRule(envRule, "pull_request", {}, undefined, prFiles2)).toBe(true);
    });

    it("3. No match when files fall outside the pattern", () => {
      const prFiles = ["src/auth/login.ts", "src/components/button.tsx", "docs/index.md"];
      expect(matchesRule(prRule, "pull_request", {}, undefined, prFiles)).toBe(false);
    });

    it("4. Empty changed-files list (e.g. PR with no file changes)", () => {
      expect(matchesRule(prRule, "pull_request", {}, undefined, [])).toBe(false);
      expect(matchesChangedFiles("src/payments/**", [])).toBe(false);
    });

    it("5. Very large PR (150+ changed files) doesn't break matching", () => {
      const largePRFiles: string[] = [];
      for (let i = 0; i < 150; i++) {
        largePRFiles.push(`src/modules/module_${i}/index.ts`);
      }
      largePRFiles.push("src/payments/stripe-provider.ts"); // 151st file

      expect(matchesRule(prRule, "pull_request", {}, undefined, largePRFiles)).toBe(true);
    });

    it("6. Malformed/unusual glob patterns don't crash matcher (safe no-op)", () => {
      const badGlobRule = {
        eventType: "pull_request",
        matchField: "changed_files_match",
        matchType: "glob_match",
        matchValue: "[unclosed-bracket-pattern-(((",
        actionLabel: "invalid",
        actionComment: null,
        notifySlack: false
      };
      const prFiles = ["src/payments/stripe.ts"];
      expect(matchesRule(badGlobRule, "pull_request", {}, undefined, prFiles)).toBe(false);
    });
  });

  describe("Smarter Rule Engine: AI Priority, Regex & Glob Matching", () => {
    const aiPriorityRule = {
      eventType: "issues",
      matchField: "ai_priority",
      matchType: "equals",
      matchValue: "P0",
      actionLabel: "urgent-p0",
      actionComment: "Critical priority flagged",
      notifySlack: true
    };

    it("matches AI Priority P0 (happy path)", () => {
      const payload = { issue: { title: "Fatal crash in production database" } };
      expect(matchesRule(aiPriorityRule, "issues", payload, "P0")).toBe(true);
    });

    it("does not match when AI priority is P2", () => {
      const payload = { issue: { title: "Typo in README" } };
      expect(matchesRule(aiPriorityRule, "issues", payload, "P2")).toBe(false);
    });

    it("edge case: handles un-triaged or missing AI priority gracefully", () => {
      const payload = {};
      expect(matchesRule(aiPriorityRule, "issues", payload, undefined)).toBe(false);
    });

    it("matches Title by Regex pattern (happy path)", () => {
      const regexRule = {
        eventType: "issues",
        matchField: "title",
        matchType: "regex",
        matchValue: "CVE-\\d{4}-\\d+",
        actionLabel: "security",
        actionComment: null,
        notifySlack: true
      };
      const payload = { issue: { title: "Vulnerability CVE-2026-9999 reported" } };
      expect(matchesRule(regexRule, "issues", payload)).toBe(true);
    });

    it("edge case: malformed regex pattern handles gracefully without throwing", () => {
      const badRegexRule = {
        eventType: "issues",
        matchField: "title",
        matchType: "regex",
        matchValue: "[unclosed-character-class",
        actionLabel: "bad",
        actionComment: null,
        notifySlack: false
      };
      const payload = { issue: { title: "Some issue title" } };
      expect(matchesRule(badRegexRule, "issues", payload)).toBe(false);
    });

    it("matches Push modified files by Glob pattern (happy path)", () => {
      const globRule = {
        eventType: "push",
        matchField: "modified_files",
        matchType: "glob_match",
        matchValue: "*.prisma",
        actionLabel: null,
        actionComment: null,
        notifySlack: true
      };
      const payload = {
        ref: "refs/heads/main",
        commits: [
          { message: "update DB schema", modified: ["prisma/schema.prisma"] }
        ]
      };
      expect(matchesRule(globRule, "push", payload)).toBe(true);
    });

    it("glob utility matches nested wildcard paths correctly", () => {
      expect(matchGlob("src/auth/*", "src/auth/login.ts")).toBe(true);
      expect(matchGlob("*.ts", "src/server/rules.ts")).toBe(true);
      expect(matchGlob("**/schema.prisma", "prisma/schema.prisma")).toBe(true);
      expect(matchGlob("*.prisma", "src/utils.js")).toBe(false);
    });

    it("edge case: empty modified files list does not trigger glob rules", () => {
      const globRule = {
        eventType: "push",
        matchField: "modified_files",
        matchType: "glob_match",
        matchValue: "*.prisma",
        actionLabel: null,
        actionComment: null,
        notifySlack: true
      };
      const payload = { commits: [] };
      expect(matchesRule(globRule, "push", payload)).toBe(false);
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
