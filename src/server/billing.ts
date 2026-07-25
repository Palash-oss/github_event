import { Rule, User } from "@prisma/client";
import { prisma } from "@/server/prisma";

export const PRO_ONLY_MATCH_FIELDS = [
  "changed_files_match",
  "ai_priority",
  "regex",
  "glob_match"
];

export const FREE_TIER_MAX_REPOS = 1;

export function isProUser(user: Partial<User> | null | undefined): boolean {
  if (!user) return false;
  return user.subscriptionStatus === "active";
}

export function canConnectRepo(user: Partial<User> | null | undefined, currentRepoCount: number): boolean {
  if (isProUser(user)) return true;
  return currentRepoCount < FREE_TIER_MAX_REPOS;
}

export function isRuleTypeAllowed(user: Partial<User> | null | undefined, matchField: string): boolean {
  if (isProUser(user)) return true;
  return !PRO_ONLY_MATCH_FIELDS.includes(matchField);
}

export async function handleGracefulDowngrade(userId: string) {
  // 1. Update user subscription status in DB
  await prisma.user.update({
    where: { id: userId },
    data: {
      subscriptionStatus: "canceled"
    }
  });

  // 2. Mark all Pro-gated rules as disabled: true without deleting data
  const userRepos = await prisma.repo.findMany({
    where: { userId },
    include: { rules: true }
  });

  for (const repo of userRepos) {
    const proRuleIds = repo.rules
      .filter((rule) => PRO_ONLY_MATCH_FIELDS.includes(rule.matchField))
      .map((rule) => rule.id);

    if (proRuleIds.length > 0) {
      await prisma.rule.updateMany({
        where: { id: { in: proRuleIds } },
        data: { disabled: true }
      });
    }
  }

  // 3. Keep first connected repo active, deactivate extra repos beyond FREE_TIER_MAX_REPOS
  if (userRepos.length > FREE_TIER_MAX_REPOS) {
    const activeRepos = userRepos.filter((r) => r.active);
    if (activeRepos.length > FREE_TIER_MAX_REPOS) {
      const reposToDeactivate = activeRepos.slice(FREE_TIER_MAX_REPOS).map((r) => r.id);
      await prisma.repo.updateMany({
        where: { id: { in: reposToDeactivate } },
        data: { active: false }
      });
    }
  }
}

export async function handleProUpgrade(userId: string, stripeCustomerId: string, stripeSubscriptionId: string, stripePriceId?: string, periodEnd?: Date) {
  // 1. Update user DB status to active
  await prisma.user.update({
    where: { id: userId },
    data: {
      subscriptionStatus: "active",
      stripeCustomerId,
      stripeSubscriptionId,
      stripePriceId: stripePriceId ?? null,
      stripeCurrentPeriodEnd: periodEnd ?? null
    }
  });

  // 2. Re-enable all previously disabled rules
  const userRepos = await prisma.repo.findMany({
    where: { userId },
    select: { id: true }
  });
  const repoIds = userRepos.map((r) => r.id);

  if (repoIds.length > 0) {
    await prisma.rule.updateMany({
      where: { repoId: { in: repoIds }, disabled: true },
      data: { disabled: false }
    });

    // Reactivate user's connected repos
    await prisma.repo.updateMany({
      where: { id: { in: repoIds } },
      data: { active: true }
    });
  }
}
