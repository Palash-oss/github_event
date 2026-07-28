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
    <main className="shell stack fade-in-section" style={{ position: "relative" }}>
      {/* Ambient background glowing auras */}
      <div style={{ position: "absolute", top: -60, left: -60, width: 350, height: 350, background: "radial-gradient(circle, rgba(99, 102, 241, 0.18) 0%, transparent 70%)", pointerEvents: "none", zIndex: 0 }} />
      <div style={{ position: "absolute", top: 200, right: -60, width: 350, height: 350, background: "radial-gradient(circle, rgba(16, 185, 129, 0.15) 0%, transparent 70%)", pointerEvents: "none", zIndex: 0 }} />

      <section className="hero" style={{ gridTemplateColumns: "1fr", position: "relative", zIndex: 1 }}>
        <div className="stack">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
            <span className="eyebrow">Analytics & Operational Health</span>
            <Link className="button secondary" href="/dashboard" style={{ padding: "8px 18px", fontSize: "0.88rem", borderRadius: "10px" }}>
              ← Back to Dashboard
            </Link>
          </div>
          <h1 style={{ fontSize: "clamp(2.2rem, 4vw, 3.6rem)", margin: "16px 0", background: "linear-gradient(135deg, #FFFFFF 0%, #CBD5E1 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
            System Performance & Webhook Metrics
          </h1>
          <p className="lede">
            Real-time breakdown of webhook volume, downstream action success rates, AI priority distributions, and event types.
          </p>
        </div>
      </section>

      {/* Top Glowing Metric Cards */}
      <section className="grid-2" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(230px, 1fr))", gap: 20, position: "relative", zIndex: 1 }}>
        <div className="panel" style={{ padding: "28px 24px", position: "relative", overflow: "hidden", background: "rgba(15, 23, 42, 0.75)", border: "1px solid rgba(99, 102, 241, 0.3)", boxShadow: "0 8px 32px rgba(99, 102, 241, 0.15)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <span className="muted" style={{ fontSize: "0.78rem", textTransform: "uppercase", letterSpacing: "1.2px", fontWeight: 600 }}>Total Webhook Deliveries</span>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#818CF8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
          </div>
          <h2 style={{ fontSize: "3rem", fontWeight: 700, margin: 0, background: "linear-gradient(135deg, #818CF8 0%, #6366F1 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
            {totalEvents}
          </h2>
          <span className="muted" style={{ fontSize: "0.8rem", marginTop: 8, display: "block" }}>Captured & Logged</span>
        </div>

        <div className="panel" style={{ padding: "28px 24px", position: "relative", overflow: "hidden", background: "rgba(15, 23, 42, 0.75)", border: `1px solid ${successRate >= 90 ? "rgba(16, 185, 129, 0.4)" : "rgba(245, 158, 11, 0.4)"}`, boxShadow: `0 8px 32px ${successRate >= 90 ? "rgba(16, 185, 129, 0.15)" : "rgba(245, 158, 11, 0.15)"}` }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <span className="muted" style={{ fontSize: "0.78rem", textTransform: "uppercase", letterSpacing: "1.2px", fontWeight: 600 }}>Action Success Rate</span>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#10B981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>
          </div>
          <h2 style={{ fontSize: "3rem", fontWeight: 700, margin: 0, color: successRate >= 90 ? "#10B981" : "#F59E0B", textShadow: `0 0 20px ${successRate >= 90 ? "rgba(16, 185, 129, 0.4)" : "rgba(245, 158, 11, 0.4)"}` }}>
            {successRate}%
          </h2>
          <span className="muted" style={{ fontSize: "0.8rem", marginTop: 8, display: "block" }}>{successActions} succeeded / {failedActions} failed</span>
        </div>

        <div className="panel" style={{ padding: "28px 24px", position: "relative", overflow: "hidden", background: "rgba(15, 23, 42, 0.75)", border: "1px solid rgba(168, 85, 247, 0.3)", boxShadow: "0 8px 32px rgba(168, 85, 247, 0.15)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <span className="muted" style={{ fontSize: "0.78rem", textTransform: "uppercase", letterSpacing: "1.2px", fontWeight: 600 }}>Active Webhooks</span>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#A855F7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
          </div>
          <h2 style={{ fontSize: "3rem", fontWeight: 700, margin: 0, background: "linear-gradient(135deg, #C084FC 0%, #A855F7 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
            {totalRepos}
          </h2>
          <span className="muted" style={{ fontSize: "0.8rem", marginTop: 8, display: "block" }}>Connected Repositories</span>
        </div>

        <div className="panel" style={{ padding: "28px 24px", position: "relative", overflow: "hidden", background: "rgba(15, 23, 42, 0.75)", border: "1px solid rgba(56, 189, 248, 0.3)", boxShadow: "0 8px 32px rgba(56, 189, 248, 0.15)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <span className="muted" style={{ fontSize: "0.78rem", textTransform: "uppercase", letterSpacing: "1.2px", fontWeight: 600 }}>Downstream Actions</span>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#38BDF8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="4" width="16" height="16" rx="2" ry="2"/><rect x="9" y="9" width="6" height="6"/><line x1="9" y1="1" x2="9" y2="4"/><line x1="15" y1="1" x2="15" y2="4"/><line x1="9" y1="20" x2="9" y2="23"/><line x1="15" y1="20" x2="15" y2="23"/><line x1="20" y1="9" x2="23" y2="9"/><line x1="20" y1="14" x2="23" y2="14"/><line x1="1" y1="9" x2="4" y2="9"/><line x1="1" y1="14" x2="4" y2="14"/></svg>
          </div>
          <h2 style={{ fontSize: "3rem", fontWeight: 700, margin: 0, background: "linear-gradient(135deg, #38BDF8 0%, #0284C7 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
            {totalActions}
          </h2>
          <span className="muted" style={{ fontSize: "0.8rem", marginTop: 8, display: "block" }}>Executed Rules</span>
        </div>
      </section>

      {/* Visual Progress Breakdown */}
      <section className="grid-2" style={{ position: "relative", zIndex: 1, gap: 24 }}>
        <div className="panel" style={{ padding: 32, background: "rgba(15, 23, 42, 0.8)", border: "1px solid var(--panel-border)" }}>
          <h2><span>Event Type Distribution</span></h2>
          <p className="muted" style={{ marginBottom: 24 }}>Categorized by GitHub webhook payload source.</p>
          <div className="stack" style={{ gap: 20 }}>
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8, fontSize: "0.92rem" }}>
                <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ width: 10, height: 10, borderRadius: "50%", background: "#6366F1", boxShadow: "0 0 10px #6366F1" }} />
                  <strong>Issues</strong>
                </span>
                <strong>{issuesCount} ({totalEvents > 0 ? Math.round((issuesCount / totalEvents) * 100) : 0}%)</strong>
              </div>
              <div style={{ height: 10, background: "rgba(255,255,255,0.08)", borderRadius: 999, overflow: "hidden", padding: 2 }}>
                <div style={{ width: `${totalEvents > 0 ? (issuesCount / totalEvents) * 100 : 0}%`, height: "100%", background: "linear-gradient(90deg, #6366F1, #818CF8)", borderRadius: 999, boxShadow: "0 0 12px rgba(99, 102, 241, 0.6)", transition: "width 0.6s cubic-bezier(0.16, 1, 0.3, 1)" }} />
              </div>
            </div>

            <div>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8, fontSize: "0.92rem" }}>
                <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ width: 10, height: 10, borderRadius: "50%", background: "#A855F7", boxShadow: "0 0 10px #A855F7" }} />
                  <strong>Pull Requests</strong>
                </span>
                <strong>{prCount} ({totalEvents > 0 ? Math.round((prCount / totalEvents) * 100) : 0}%)</strong>
              </div>
              <div style={{ height: 10, background: "rgba(255,255,255,0.08)", borderRadius: 999, overflow: "hidden", padding: 2 }}>
                <div style={{ width: `${totalEvents > 0 ? (prCount / totalEvents) * 100 : 0}%`, height: "100%", background: "linear-gradient(90deg, #A855F7, #C084FC)", borderRadius: 999, boxShadow: "0 0 12px rgba(168, 85, 247, 0.6)", transition: "width 0.6s cubic-bezier(0.16, 1, 0.3, 1)" }} />
              </div>
            </div>

            <div>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8, fontSize: "0.92rem" }}>
                <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ width: 10, height: 10, borderRadius: "50%", background: "#10B981", boxShadow: "0 0 10px #10B981" }} />
                  <strong>Pushes & Commits</strong>
                </span>
                <strong>{pushCount} ({totalEvents > 0 ? Math.round((pushCount / totalEvents) * 100) : 0}%)</strong>
              </div>
              <div style={{ height: 10, background: "rgba(255,255,255,0.08)", borderRadius: 999, overflow: "hidden", padding: 2 }}>
                <div style={{ width: `${totalEvents > 0 ? (pushCount / totalEvents) * 100 : 0}%`, height: "100%", background: "linear-gradient(90deg, #10B981, #34D399)", borderRadius: 999, boxShadow: "0 0 12px rgba(16, 185, 129, 0.6)", transition: "width 0.6s cubic-bezier(0.16, 1, 0.3, 1)" }} />
              </div>
            </div>
          </div>
        </div>

        <div className="panel" style={{ padding: 32, background: "rgba(15, 23, 42, 0.8)", border: "1px solid var(--panel-border)" }}>
          <h2><span>AI Priority Ratings</span></h2>
          <p className="muted" style={{ marginBottom: 24 }}>Categorized by automated AI triage sentiment.</p>
          <div className="stack" style={{ gap: 20 }}>
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8, fontSize: "0.92rem" }}>
                <span className="badge danger" style={{ boxShadow: "0 0 12px rgba(244, 63, 94, 0.3)" }}>P0 — Critical / Security</span>
                <strong>{p0Count}</strong>
              </div>
              <div style={{ height: 10, background: "rgba(255,255,255,0.08)", borderRadius: 999, overflow: "hidden", padding: 2 }}>
                <div style={{ width: `${totalEvents > 0 ? (p0Count / totalEvents) * 100 : 0}%`, height: "100%", background: "linear-gradient(90deg, #F43F5E, #FB7185)", borderRadius: 999, boxShadow: "0 0 12px rgba(244, 63, 94, 0.6)", transition: "width 0.6s cubic-bezier(0.16, 1, 0.3, 1)" }} />
              </div>
            </div>

            <div>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8, fontSize: "0.92rem" }}>
                <span className="badge warn" style={{ boxShadow: "0 0 12px rgba(245, 158, 11, 0.3)" }}>P1 — High / Feature</span>
                <strong>{p1Count}</strong>
              </div>
              <div style={{ height: 10, background: "rgba(255,255,255,0.08)", borderRadius: 999, overflow: "hidden", padding: 2 }}>
                <div style={{ width: `${totalEvents > 0 ? (p1Count / totalEvents) * 100 : 0}%`, height: "100%", background: "linear-gradient(90deg, #F59E0B, #FBBF24)", borderRadius: 999, boxShadow: "0 0 12px rgba(245, 158, 11, 0.6)", transition: "width 0.6s cubic-bezier(0.16, 1, 0.3, 1)" }} />
              </div>
            </div>

            <div>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8, fontSize: "0.92rem" }}>
                <span className="badge muted">P2 — Minor / Chore</span>
                <strong>{p2Count}</strong>
              </div>
              <div style={{ height: 10, background: "rgba(255,255,255,0.08)", borderRadius: 999, overflow: "hidden", padding: 2 }}>
                <div style={{ width: `${totalEvents > 0 ? (p2Count / totalEvents) * 100 : 0}%`, height: "100%", background: "linear-gradient(90deg, #94A3B8, #CBD5E1)", borderRadius: 999, boxShadow: "0 0 12px rgba(148, 163, 184, 0.4)", transition: "width 0.6s cubic-bezier(0.16, 1, 0.3, 1)" }} />
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
