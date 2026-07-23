import Link from "next/link";
import { getServerSession } from "next-auth/next";
import { redirect } from "next/navigation";
import { authOptions } from "@/server/auth";
import { prisma } from "@/server/prisma";

export const dynamic = "force-dynamic";

export default async function AnalyticsPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    redirect("/signin?callbackUrl=/dashboard/analytics");
  }

  const userId = session.user.id;

  const [totalRepos, totalEvents, totalActions, successActions, failedActions, issuesCount, prCount, pushCount, p0Count, p1Count, p2Count] = await Promise.all([
    prisma.repo.count({ where: { userId, active: true } }),
    prisma.event.count({ where: { repo: { userId } } }),
    prisma.actionLog.count({ where: { event: { repo: { userId } } } }),
    prisma.actionLog.count({ where: { event: { repo: { userId } }, status: "success" } }),
    prisma.actionLog.count({ where: { event: { repo: { userId } }, status: "failed" } }),
    prisma.event.count({ where: { repo: { userId }, eventType: "issues" } }),
    prisma.event.count({ where: { repo: { userId }, eventType: "pull_request" } }),
    prisma.event.count({ where: { repo: { userId }, eventType: "push" } }),
    prisma.event.count({ where: { repo: { userId }, aiPriority: "P0" } }),
    prisma.event.count({ where: { repo: { userId }, aiPriority: "P1" } }),
    prisma.event.count({ where: { repo: { userId }, aiPriority: "P2" } })
  ]);

  const successRate = totalActions > 0 ? Math.round((successActions / totalActions) * 100) : 100;

  return (
    <main className="shell stack fade-in-section">
      <section className="hero" style={{ gridTemplateColumns: "1fr" }}>
        <div className="stack">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span className="eyebrow">Analytics & Operational Health</span>
            <Link className="button secondary" href="/dashboard" style={{ padding: "6px 14px", fontSize: "0.85rem" }}>
              ← Back to Dashboard
            </Link>
          </div>
          <h1 style={{ fontSize: "clamp(2rem, 3.5vw, 3.2rem)", margin: "14px 0" }}>System Performance & Webhook Metrics</h1>
          <p className="lede">
            Real-time breakdown of webhook volume, downstream action success rates, AI priority distributions, and event types.
          </p>
        </div>
      </section>

      {/* Top Metric Cards */}
      <section className="grid-2" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))" }}>
        <div className="panel" style={{ textAlign: "center", padding: "24px 16px" }}>
          <span className="muted" style={{ fontSize: "0.85rem", textTransform: "uppercase", letterSpacing: "1px" }}>Total Webhook Deliveries</span>
          <h2 style={{ fontSize: "2.8rem", margin: "10px 0 0 0", color: "var(--text)" }}>{totalEvents}</h2>
        </div>

        <div className="panel" style={{ textAlign: "center", padding: "24px 16px" }}>
          <span className="muted" style={{ fontSize: "0.85rem", textTransform: "uppercase", letterSpacing: "1px" }}>Action Success Rate</span>
          <h2 style={{ fontSize: "2.8rem", margin: "10px 0 0 0", color: successRate >= 90 ? "#34c759" : "#ff9500" }}>
            {successRate}%
          </h2>
          <span className="muted" style={{ fontSize: "0.8rem" }}>{successActions} succeeded / {failedActions} failed</span>
        </div>

        <div className="panel" style={{ textAlign: "center", padding: "24px 16px" }}>
          <span className="muted" style={{ fontSize: "0.85rem", textTransform: "uppercase", letterSpacing: "1px" }}>Active Webhooks</span>
          <h2 style={{ fontSize: "2.8rem", margin: "10px 0 0 0", color: "var(--text)" }}>{totalRepos}</h2>
        </div>

        <div className="panel" style={{ textAlign: "center", padding: "24px 16px" }}>
          <span className="muted" style={{ fontSize: "0.85rem", textTransform: "uppercase", letterSpacing: "1px" }}>Downstream Actions</span>
          <h2 style={{ fontSize: "2.8rem", margin: "10px 0 0 0", color: "var(--text)" }}>{totalActions}</h2>
        </div>
      </section>

      {/* Visual Progress Breakdown */}
      <section className="grid-2">
        <div className="panel">
          <h2><span>Event Type Distribution</span></h2>
          <p className="muted" style={{ marginBottom: 20 }}>Categorized by GitHub webhook payload source.</p>
          <div className="stack" style={{ gap: 16 }}>
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6, fontSize: "0.9rem" }}>
                <span>Issues</span>
                <strong>{issuesCount} ({totalEvents > 0 ? Math.round((issuesCount / totalEvents) * 100) : 0}%)</strong>
              </div>
              <div style={{ height: 8, background: "rgba(255,255,255,0.1)", borderRadius: 4, overflow: "hidden" }}>
                <div style={{ width: `${totalEvents > 0 ? (issuesCount / totalEvents) * 100 : 0}%`, height: "100%", background: "#007aff" }} />
              </div>
            </div>

            <div>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6, fontSize: "0.9rem" }}>
                <span>Pull Requests</span>
                <strong>{prCount} ({totalEvents > 0 ? Math.round((prCount / totalEvents) * 100) : 0}%)</strong>
              </div>
              <div style={{ height: 8, background: "rgba(255,255,255,0.1)", borderRadius: 4, overflow: "hidden" }}>
                <div style={{ width: `${totalEvents > 0 ? (prCount / totalEvents) * 100 : 0}%`, height: "100%", background: "#af52de" }} />
              </div>
            </div>

            <div>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6, fontSize: "0.9rem" }}>
                <span>Pushes & Commits</span>
                <strong>{pushCount} ({totalEvents > 0 ? Math.round((pushCount / totalEvents) * 100) : 0}%)</strong>
              </div>
              <div style={{ height: 8, background: "rgba(255,255,255,0.1)", borderRadius: 4, overflow: "hidden" }}>
                <div style={{ width: `${totalEvents > 0 ? (pushCount / totalEvents) * 100 : 0}%`, height: "100%", background: "#34c759" }} />
              </div>
            </div>
          </div>
        </div>

        <div className="panel">
          <h2><span>AI Priority Ratings</span></h2>
          <p className="muted" style={{ marginBottom: 20 }}>Categorized by automated AI triage sentiment.</p>
          <div className="stack" style={{ gap: 16 }}>
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6, fontSize: "0.9rem" }}>
                <span className="badge danger">P0 — Critical / Security</span>
                <strong>{p0Count}</strong>
              </div>
              <div style={{ height: 8, background: "rgba(255,255,255,0.1)", borderRadius: 4, overflow: "hidden" }}>
                <div style={{ width: `${totalEvents > 0 ? (p0Count / totalEvents) * 100 : 0}%`, height: "100%", background: "#ff3b30" }} />
              </div>
            </div>

            <div>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6, fontSize: "0.9rem" }}>
                <span className="badge warn">P1 — High / Feature</span>
                <strong>{p1Count}</strong>
              </div>
              <div style={{ height: 8, background: "rgba(255,255,255,0.1)", borderRadius: 4, overflow: "hidden" }}>
                <div style={{ width: `${totalEvents > 0 ? (p1Count / totalEvents) * 100 : 0}%`, height: "100%", background: "#ff9500" }} />
              </div>
            </div>

            <div>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6, fontSize: "0.9rem" }}>
                <span className="badge muted">P2 — Minor / Chore</span>
                <strong>{p2Count}</strong>
              </div>
              <div style={{ height: 8, background: "rgba(255,255,255,0.1)", borderRadius: 4, overflow: "hidden" }}>
                <div style={{ width: `${totalEvents > 0 ? (p2Count / totalEvents) * 100 : 0}%`, height: "100%", background: "#8e8e93" }} />
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
