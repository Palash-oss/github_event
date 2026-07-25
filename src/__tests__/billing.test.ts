import { describe, expect, it, vi, beforeEach } from "vitest";
import {
  canConnectRepo,
  FREE_TIER_MAX_REPOS,
  handleGracefulDowngrade,
  handleProUpgrade,
  isProUser,
  isRuleTypeAllowed,
  PRO_ONLY_MATCH_FIELDS
} from "@/server/billing";
import { PREBUILT_RULE_TEMPLATES, getTemplateById } from "@/server/templates";
import { prisma } from "@/server/prisma";

vi.mock("@/server/prisma", () => ({
  prisma: {
    user: {
      update: vi.fn()
    },
    repo: {
      findMany: vi.fn(),
      updateMany: vi.fn()
    },
    rule: {
      updateMany: vi.fn()
    }
  }
}));

describe("Billing & Feature Gating", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("isProUser", () => {
    it("returns true when subscriptionStatus is 'active'", () => {
      expect(isProUser({ subscriptionStatus: "active" } as any)).toBe(true);
    });

    it("returns false for free, canceled, past_due, or null users", () => {
      expect(isProUser({ subscriptionStatus: "free" } as any)).toBe(false);
      expect(isProUser({ subscriptionStatus: "canceled" } as any)).toBe(false);
      expect(isProUser({ subscriptionStatus: "past_due" } as any)).toBe(false);
      expect(isProUser(null)).toBe(false);
      expect(isProUser(undefined)).toBe(false);
    });
  });

  describe("canConnectRepo", () => {
    it("allows unlimited repos for Pro users", () => {
      const proUser = { subscriptionStatus: "active" } as any;
      expect(canConnectRepo(proUser, 0)).toBe(true);
      expect(canConnectRepo(proUser, 1)).toBe(true);
      expect(canConnectRepo(proUser, 10)).toBe(true);
    });

    it("caps Free tier users at 1 repository", () => {
      const freeUser = { subscriptionStatus: "free" } as any;
      expect(canConnectRepo(freeUser, 0)).toBe(true);
      expect(canConnectRepo(freeUser, 1)).toBe(false);
      expect(canConnectRepo(freeUser, 2)).toBe(false);
    });
  });

  describe("isRuleTypeAllowed", () => {
    it("allows all rule types for Pro users", () => {
      const proUser = { subscriptionStatus: "active" } as any;
      for (const field of PRO_ONLY_MATCH_FIELDS) {
        expect(isRuleTypeAllowed(proUser, field)).toBe(true);
      }
      expect(isRuleTypeAllowed(proUser, "title")).toBe(true);
    });

    it("blocks Pro-only rule types for Free users", () => {
      const freeUser = { subscriptionStatus: "free" } as any;
      expect(isRuleTypeAllowed(freeUser, "changed_files_match")).toBe(false);
      expect(isRuleTypeAllowed(freeUser, "ai_priority")).toBe(false);
      expect(isRuleTypeAllowed(freeUser, "regex")).toBe(false);
      expect(isRuleTypeAllowed(freeUser, "glob_match")).toBe(false);
    });

    it("allows text-matching rule types for Free users", () => {
      const freeUser = { subscriptionStatus: "free" } as any;
      expect(isRuleTypeAllowed(freeUser, "title")).toBe(true);
      expect(isRuleTypeAllowed(freeUser, "body")).toBe(true);
      expect(isRuleTypeAllowed(freeUser, "author")).toBe(true);
    });
  });

  describe("handleGracefulDowngrade", () => {
    it("updates DB to canceled and disables Pro rules without deleting user data", async () => {
      const mockUserRepos = [
        {
          id: "repo-1",
          userId: "user-123",
          active: true,
          rules: [
            { id: "rule-1", matchField: "changed_files_match" },
            { id: "rule-2", matchField: "title" }
          ]
        },
        {
          id: "repo-2",
          userId: "user-123",
          active: true,
          rules: [
            { id: "rule-3", matchField: "ai_priority" }
          ]
        }
      ];

      vi.mocked(prisma.repo.findMany).mockResolvedValue(mockUserRepos as any);

      await handleGracefulDowngrade("user-123");

      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: "user-123" },
        data: { subscriptionStatus: "canceled" }
      });

      expect(prisma.rule.updateMany).toHaveBeenCalledWith({
        where: { id: { in: ["rule-1"] } },
        data: { disabled: true }
      });

      expect(prisma.rule.updateMany).toHaveBeenCalledWith({
        where: { id: { in: ["rule-3"] } },
        data: { disabled: true }
      });

      expect(prisma.repo.updateMany).toHaveBeenCalledWith({
        where: { id: { in: ["repo-2"] } },
        data: { active: false }
      });
    });
  });

  describe("handleProUpgrade", () => {
    it("updates DB to active and re-enables disabled rules", async () => {
      vi.mocked(prisma.repo.findMany).mockResolvedValue([{ id: "repo-1" }] as any);

      await handleProUpgrade("user-123", "cus_test123", "sub_test123");

      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: "user-123" },
        data: {
          subscriptionStatus: "active",
          stripeCustomerId: "cus_test123",
          stripeSubscriptionId: "sub_test123",
          stripePriceId: null,
          stripeCurrentPeriodEnd: null
        }
      });

      expect(prisma.rule.updateMany).toHaveBeenCalledWith({
        where: { repoId: { in: ["repo-1"] }, disabled: true },
        data: { disabled: false }
      });

      expect(prisma.repo.updateMany).toHaveBeenCalledWith({
        where: { id: { in: ["repo-1"] } },
        data: { active: true }
      });
    });
  });

  describe("PREBUILT_RULE_TEMPLATES", () => {
    it("contains 3 working pre-built rule templates", () => {
      expect(PREBUILT_RULE_TEMPLATES.length).toBe(3);
      expect(getTemplateById("alert_dependency_added")).toBeDefined();
      expect(getTemplateById("stale_pr_reminder")).toBeDefined();
      expect(getTemplateById("sensitive_path_review")).toBeDefined();
    });
  });
});
