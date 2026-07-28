import { getServerSession } from "next-auth/next";
import { redirect } from "next/navigation";
import { authOptions } from "@/server/auth";
import { prisma } from "@/server/prisma";
import { getEventSummary } from "@/lib/event-utils";
import Link from "next/link";
import EventDetailsExpanded from "@/components/event-details-expanded";

export const dynamic = "force-dynamic";

export default async function LogsPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    redirect("/signin?callbackUrl=/dashboard/logs");
  }

  const events = await prisma.event.findMany({
    where: {
      repo: {
        userId: session.user.id
      }
    },
    include: {
      repo: true,
      actions: true
    },
    orderBy: { receivedAt: "desc" },
    take: 50
  });

  return (
    <main className="shell stack fade-in-section" style={{ position: "relative" }}>
      {/* Ambient background glowing auras */}
      <div style={{ position: "absolute", top: -60, left: -60, width: 350, height: 350, background: "radial-gradient(circle, rgba(168, 85, 247, 0.18) 0%, transparent 70%)", pointerEvents: "none", zIndex: 0 }} />
      <div style={{ position: "absolute", top: 200, right: -60, width: 350, height: 350, background: "radial-gradient(circle, rgba(99, 102, 241, 0.15) 0%, transparent 70%)", pointerEvents: "none", zIndex: 0 }} />

      <section className="hero" style={{ gridTemplateColumns: "1fr", position: "relative", zIndex: 1 }}>
        <div className="stack">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
            <span className="eyebrow">Observability</span>
            <Link className="button secondary" href="/dashboard" style={{ padding: "8px 18px", fontSize: "0.88rem", borderRadius: "10px" }}>
              ← Back to Dashboard
            </Link>
          </div>
          <h1 style={{ fontSize: "clamp(2.2rem, 4vw, 3.6rem)", margin: "16px 0", background: "linear-gradient(135deg, #FFFFFF 0%, #CBD5E1 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
            Logs & Event Archive
          </h1>
          <p className="lede">This page archives all incoming webhook payloads from GitHub (Pings, Pushes, Issues, and PRs) and lists their execution states.</p>
        </div>
      </section>

      <section className="panel">
        <h2>All Webhook Deliveries</h2>
        <p className="muted" style={{ marginBottom: 20 }}>Showing the last 50 webhook events received from GitHub. Standard webhooks with no matching rules will show 0 actions executed.</p>
        
        <ul className="log-list" style={{ marginTop: 24 }}>
          {events.length === 0 ? (
            <li className="log-card">
              <div className="stack" style={{ gap: 8 }}>
                <strong>No webhook events archived yet</strong>
                <span className="log-meta">Wait for webhooks to arrive or connect a new repo to trigger a Ping event.</span>
              </div>
            </li>
          ) : (
            events.map((event) => {
              const summary = getEventSummary(event.eventType, event.payload);
              
              // Calculate status of the actions
              let statusLabel = "no actions";
              let statusClass = "muted";
              
              if (event.actions.length > 0) {
                const hasFailed = event.actions.some(a => a.status === "failed");
                const hasRetrying = event.actions.some(a => a.status === "retrying");
                if (hasFailed) {
                  statusLabel = "failed";
                  statusClass = "warn";
                } else if (hasRetrying) {
                  statusLabel = "retrying";
                  statusClass = "muted";
                } else {
                  statusLabel = "success";
                  statusClass = "success";
                }
              }

              return (
                <li key={event.id} style={{ listStyle: "none" }}>
                  <details className="event-details" style={{ width: "100%" }}>
                    <summary className="log-card" suppressHydrationWarning style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <div className="stack" style={{ gap: 6 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <strong>{event.repo.owner}/{event.repo.name}</strong>
                          <span className="badge" style={{ textTransform: "capitalize", padding: "2px 8px" }}>{summary.typeLabel}</span>
                        </div>
                        <span className="log-meta" style={{ fontWeight: "600", fontSize: "0.95rem" }}>
                          {summary.title}
                        </span>
                        <span className="log-meta" style={{ fontSize: "0.82rem" }}>
                          {summary.description} · by <strong>{summary.author}</strong> · {event.receivedAt.toLocaleString()}
                        </span>
                      </div>
                      <span className={`badge ${statusClass}`} style={{ fontWeight: "bold" }}>{statusLabel}</span>
                    </summary>
                    <EventDetailsExpanded event={event} />
                  </details>
                </li>
              );
            })
          )}
        </ul>
      </section>
    </main>
  );
}