import { getServerSession } from "next-auth/next";
import { redirect } from "next/navigation";
import { authOptions } from "@/server/auth";
import { prisma } from "@/server/prisma";

export const dynamic = "force-dynamic";

export default async function LogsPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    redirect("/signin?callbackUrl=/dashboard/logs");
  }

  const actionLogs = await prisma.actionLog.findMany({
    where: {
      event: {
        repo: {
          userId: session.user.id
        }
      }
    },
    include: {
      event: {
        include: {
          repo: true
        }
      }
    },
    orderBy: { createdAt: "desc" },
    take: 50
  });

  return (
    <main className="shell stack fade-in-section">
      <section className="hero" style={{ gridTemplateColumns: "1fr" }}>
        <div className="stack">
          <span className="eyebrow">Observability</span>
          <h1 style={{ fontSize: "clamp(2.2rem, 4vw, 3.6rem)", margin: "16px 0" }}>Action logs and retry state.</h1>
          <p className="lede">This is the secure ledger for downstream actions, including failures that the retry sweep will revisit.</p>
        </div>
      </section>

      <section className="panel">
        <h2>Latest action attempts</h2>
        <ul className="log-list" style={{ marginTop: 24 }}>
          {actionLogs.length === 0 ? (
            <li className="log-card">
              <div className="stack" style={{ gap: 8 }}>
                <strong>No action logs yet</strong>
                <span className="log-meta">Trigger an issue or pull request event to populate this page.</span>
              </div>
            </li>
          ) : (
            actionLogs.map((log) => (
              <li className="log-card" key={log.id} style={{ display: "flex", flexDirection: "column", alignItems: "stretch", gap: 12 }}>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 10, justifyContent: "space-between", alignItems: "center" }}>
                  <strong style={{ fontSize: "1.1rem" }}>{log.event.repo.owner}/{log.event.repo.name}</strong>
                  <span className={`badge ${log.status === "success" ? "success" : log.status === "failed" ? "warn" : "muted"}`}>{log.status}</span>
                </div>
                <div className="stack" style={{ gap: 6 }}>
                  <span className="log-meta">
                    <span className="badge" style={{ padding: "2px 8px", fontSize: "10px", marginRight: 8 }}>{log.actionType}</span>
                    attempts: <strong>{log.attempts}</strong> · {log.createdAt.toLocaleString()}
                  </span>
                  {log.error ? (
                    <div style={{ color: "var(--danger)", background: "var(--danger-bg)", padding: "10px 14px", borderRadius: "10px", border: "1px solid rgba(229, 72, 77, 0.12)", fontSize: "0.88rem", fontFamily: "var(--font-mono)", marginTop: 6 }}>
                      {log.error}
                    </div>
                  ) : null}
                </div>
              </li>
            ))
          )}
        </ul>
      </section>
    </main>
  );
}