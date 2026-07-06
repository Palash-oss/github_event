import { getServerSession } from "next-auth/next";
import { redirect } from "next/navigation";
import { authOptions } from "@/server/auth";
import { prisma } from "@/server/prisma";
import { getEventSummary } from "@/server/rules";
import Link from "next/link";

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
    <main className="shell stack fade-in-section">
      <section className="hero" style={{ gridTemplateColumns: "1fr" }}>
        <div className="stack">
          <span className="eyebrow">Observability</span>
          <h1 style={{ fontSize: "clamp(2.2rem, 4vw, 3.6rem)", margin: "16px 0" }}>Logs & Event Archive</h1>
          <p className="lede">This page archives all incoming webhook payloads from GitHub (Pings, Pushes, Issues, and PRs) and lists their execution states.</p>
          <div className="actions">
            <Link className="button secondary" href="/dashboard">
              Back to Dashboard
            </Link>
          </div>
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
                <li className="log-card" key={event.id} style={{ display: "flex", flexDirection: "column", alignItems: "stretch", gap: 12 }}>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 10, justifyContent: "space-between", alignItems: "center" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <strong style={{ fontSize: "1.1rem" }}>{event.repo.owner}/{event.repo.name}</strong>
                      <span className="badge" style={{ textTransform: "capitalize", padding: "2px 8px" }}>{summary.typeLabel}</span>
                    </div>
                    <span className={`badge ${statusClass}`} style={{ fontWeight: "bold" }}>{statusLabel}</span>
                  </div>
                  
                  <div className="stack" style={{ gap: 6 }}>
                    <div style={{ fontSize: "1.05rem", fontWeight: 600 }}>{summary.title}</div>
                    <div className="log-meta">
                      {summary.description} · by <strong>{summary.author}</strong> · {event.receivedAt.toLocaleString()}
                    </div>
                  </div>

                  {event.actions.length > 0 ? (
                    <div style={{ background: "rgba(0,0,0,0.02)", padding: "12px", borderRadius: "8px", border: "1px solid var(--panel-border)", marginTop: 6 }}>
                      <strong style={{ fontSize: "0.85rem", textTransform: "uppercase", letterSpacing: "0.5px", color: "var(--text-muted)", display: "block", marginBottom: 8 }}>Executed Actions:</strong>
                      <ul className="stack" style={{ gap: 8, paddingLeft: 16 }}>
                        {event.actions.map((act) => (
                          <li key={act.id} style={{ listStyleType: "square", fontSize: "0.9rem" }}>
                            <code>{act.actionType}</code>: <span className={`badge ${act.status === "success" ? "success" : act.status === "failed" ? "warn" : "muted"}`} style={{ padding: "1px 6px", fontSize: "11px", marginLeft: 6 }}>{act.status}</span>
                            {act.attempts > 1 && <span className="muted" style={{ fontSize: "0.8rem", marginLeft: 8 }}>(Attempts: {act.attempts})</span>}
                            {act.error && (
                              <div style={{ color: "var(--danger)", background: "var(--danger-bg)", padding: "8px 12px", borderRadius: "6px", border: "1px solid rgba(229, 72, 77, 0.12)", fontSize: "0.82rem", fontFamily: "var(--font-mono)", marginTop: 4 }}>
                                {act.error}
                              </div>
                            )}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : (
                    <div style={{ fontSize: "0.85rem", color: "var(--text-muted)", fontStyle: "italic", background: "rgba(0,0,0,0.01)", padding: "8px 12px", borderRadius: "6px", border: "1px dotted var(--panel-border)" }}>
                      No rules matched this event. No write-back actions or Slack notifications were triggered.
                    </div>
                  )}
                </li>
              );
            })
          )}
        </ul>
      </section>
    </main>
  );
}