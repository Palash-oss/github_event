import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET } from "@/app/api/analytics/route";

vi.mock("next-auth/next", () => ({
  getServerSession: vi.fn()
}));

vi.mock("@/server/prisma", () => ({
  prisma: {
    repo: {
      count: vi.fn()
    },
    event: {
      count: vi.fn()
    },
    actionLog: {
      count: vi.fn()
    }
  }
}));

import { getServerSession } from "next-auth/next";
import { prisma } from "@/server/prisma";

describe("Analytics API Endpoint", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 Unauthorized if user is not logged in", async () => {
    vi.mocked(getServerSession).mockResolvedValueOnce(null);

    const res = await GET();
    const data = await res.json();

    expect(res.status).toBe(401);
    expect(data.error).toBe("Unauthorized");
  });

  it("returns calculated analytics metrics for authenticated user", async () => {
    vi.mocked(getServerSession).mockResolvedValueOnce({
      user: { id: "user_123" }
    } as any);

    vi.mocked(prisma.repo.count).mockResolvedValueOnce(3);
    vi.mocked(prisma.event.count)
      .mockResolvedValueOnce(25) // totalEvents
      .mockResolvedValueOnce(10) // issuesCount
      .mockResolvedValueOnce(12) // prCount
      .mockResolvedValueOnce(3)  // pushCount
      .mockResolvedValueOnce(2)  // P0
      .mockResolvedValueOnce(5)  // P1
      .mockResolvedValueOnce(18); // P2

    vi.mocked(prisma.actionLog.count)
      .mockResolvedValueOnce(20) // totalActions
      .mockResolvedValueOnce(18) // successfulActions
      .mockResolvedValueOnce(2);  // failedActions

    const res = await GET();
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.metrics).toBeDefined();
    expect(data.metrics.totalRepos).toBe(3);
    expect(data.metrics.totalEvents).toBe(25);
    expect(data.metrics.totalActions).toBe(20);
    expect(data.metrics.successfulActions).toBe(18);
    expect(data.metrics.failedActions).toBe(2);
    expect(data.metrics.successRate).toBe(90); // (18/20) * 100
    expect(data.metrics.eventTypeBreakdown).toEqual({
      issues: 10,
      pull_request: 12,
      push: 3
    });
    expect(data.metrics.priorityBreakdown).toEqual({
      P0: 2,
      P1: 5,
      P2: 18
    });
  });
});
