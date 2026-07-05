import Link from "next/link";
import { getServerSession } from "next-auth/next";
import { redirect } from "next/navigation";
import type { Prisma } from "@prisma/client";
import { authOptions } from "@/server/auth";
import { prisma } from "@/server/prisma";
import AvailableRepos from "@/components/available-repos";

export const dynamic = "force-dynamic";

type ConnectedRepo = Prisma.RepoGetPayload<{
  include: {
    rules: true;
    events: {
      include: {
        actions: true;
      };
    };
  };
}>;

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    redirect("/signin?callbackUrl=/dashboard");
  }

  const user = await prisma.user.findUnique({ where: { id: session.user.id } });
  if (!user) {
    redirect("/signin?callbackUrl=/dashboard");
  }

  const [connectedRepos, recentEvents] = await Promise.all([
    prisma.repo.findMany({
      where: { userId: user.id },
      include: {
        rules: true,
        events: {
          orderBy: { receivedAt: "desc" },
          take: 5,
          include: { actions: true }
        }
      }
    }) as Promise<ConnectedRepo[]>,
    prisma.event.findMany({
      where: { repo: { userId: user.id } },
      orderBy: { receivedAt: "desc" },
      take: 8,
      include: {
        repo: true,
        actions: true
      }
    })
  ]);

  const connectedRepoKeys = connectedRepos.map((repo) => `${repo.owner}/${repo.name}`);

  return (
    <main className="shell stack fade-in-section">
      <section className="hero" style={{ gridTemplateColumns: "1fr" }}>
        <div className="stack">
          <span className="eyebrow">Dashboard</span>
          <h1 style={{ fontSize: "clamp(2.2rem, 4vw, 3.6rem)", margin: "16px 0" }}>Connected repos, incoming events, and action logs.</h1>
          <p className="lede">
            Signed in as <strong>{user.username}</strong>. Connect a repository below to configure the webhook, then watch issues and pull requests flow through the rules engine.
          </p>
          <div className="actions">
            <Link className="button secondary" href="/dashboard/logs">
              Open Logs Archive
            </Link>
          </div>
        </div>
      </section>

      <section className="grid-2">
        <AvailableRepos connectedRepoKeys={connectedRepoKeys} />

        <div className="panel">
          <h2>
            <span>Connected repos</span>
          </h2>
          <p className="muted" style={{ marginBottom: 20 }}>Currently active webhooks receiving event feeds.</p>
          <ul className="list">
            {connectedRepos.length === 0 ? (
              <li className="repo-card">
                <div className="stack" style={{ gap: 8 }}>
                  <strong>No repo connected yet</strong>
                  <span className="repo-meta">Use the list on the left to create the first webhook.</span>
                </div>
              </li>
            ) : (
              connectedRepos.map((repo) => (
                <li key={repo.id} className="repo-card" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div className="stack" style={{ gap: 8 }}>
                    <strong style={{ fontSize: "1.1rem" }}>{repo.owner}/{repo.name}</strong>
                    <span className="repo-meta">Webhook {repo.webhookId ? `#${repo.webhookId}` : "pending"} · {repo.rules.length} rules · {repo.events.length} recent events</span>
                    <span className="badge success badge-active" style={{ width: "fit-content" }}>active</span>
                  </div>
                  <form action="/api/repos/connect" method="post">
                    <input type="hidden" name="intent" value="disconnect" />
                    <input type="hidden" name="owner" value={repo.owner} />
                    <input type="hidden" name="name" value={repo.name} />
                    <button className="button secondary" type="submit" suppressHydrationWarning style={{ padding: "8px 14px", borderRadius: "8px", fontSize: "0.85rem", border: "1px solid var(--danger, #ff3b30)", color: "var(--danger, #ff3b30)" }}>
                      Disconnect
                    </button>
                  </form>
                </li>
              ))
            )}
          </ul>
        </div>
      </section>

      <section className="grid-2">
        <div className="panel">
          <h2>
            <span>Recent events</span>
          </h2>
          <p className="muted" style={{ marginBottom: 20 }}>Webhooks captured and stored with signature and replay verification.</p>
          <ul className="log-list">
            {recentEvents.length === 0 ? (
              <li className="log-card">
                <div className="stack" style={{ gap: 8 }}>
                  <strong>No events captured yet</strong>
                  <span className="log-meta">Once a webhook arrives, it will appear here with its action log.</span>
                </div>
              </li>
            ) : (
              recentEvents.map((event) => (
                <li key={event.id} style={{ listStyle: "none" }}>
                  <details className="event-details" style={{ width: "100%" }}>
                    <summary className="log-card" suppressHydrationWarning>
                      <div className="stack" style={{ gap: 6 }}>
                        <strong>{event.repo.owner}/{event.repo.name}</strong>
                        <span className="log-meta">
                          <span className="badge" style={{ padding: "2px 8px", fontSize: "10px", marginRight: 6 }}>{event.eventType}</span>
                          <code>{event.action ?? "no-action"}</code> · {event.receivedAt.toLocaleTimeString()}
                        </span>
                      </div>
                      <span className="badge muted" suppressHydrationWarning>{event.actions.length} actions</span>
                    </summary>
                    <div className="event-expanded-content" style={{ marginTop: 12, padding: "20px", background: "rgba(28, 27, 25, 0.03)", borderRadius: 12, border: "1px solid var(--panel-border)", fontSize: "0.9rem" }}>
                      <div className="stack" style={{ gap: 16 }}>
                        <div>
                          <strong style={{ display: "block", marginBottom: 8 }}>Action Execution Log:</strong>
                          {event.actions.length === 0 ? (
                            <span className="muted">No actions were matched or executed.</span>
                          ) : (
                            <ul className="stack" style={{ gap: 8, paddingLeft: 20 }}>
                              {event.actions.map((act) => (
                                <li key={act.id} style={{ listStyleType: "square" }}>
                                  <code>{act.actionType}</code>: <span style={{ color: act.status === "success" ? "var(--success, #34c759)" : "var(--danger, #ff3b30)", fontWeight: "bold" }}>{act.status}</span>
                                  {act.error && <code style={{ display: "block", color: "var(--danger, #ff3b30)", marginTop: 4, background: "rgba(255,59,48,0.05)", padding: "6px 12px", borderRadius: 6 }}>Error: {act.error}</code>}
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>
                        <div>
                          <strong style={{ display: "block", marginBottom: 8 }}>Raw Webhook Payload:</strong>
                          <pre style={{ margin: 0, padding: 16, background: "var(--bg)", border: "1px solid var(--panel-border)", borderRadius: 8, overflow: "auto", maxHeight: "250px", fontSize: "0.82rem" }}>
                            <code>{JSON.stringify(event.payload, null, 2)}</code>
                          </pre>
                        </div>
                      </div>
                    </div>
                  </details>
                </li>
              ))
            )}
          </ul>
        </div>

        <div className="panel">
          <h2>
            <span>Rules snapshot</span>
          </h2>
          <p className="muted" style={{ marginBottom: 20 }}>Configure rule mappings. Unmatched webhooks fallback to default triggers.</p>
          
          <form action="/api/rules" method="post" className="stack" style={{ marginBottom: 24 }}>
            <div className="field-grid">
              <label>
                Repository
                <select name="repoId" required defaultValue={connectedRepos[0]?.id ?? ""} suppressHydrationWarning>
                  <option value="" disabled>
                    Choose a repo
                  </option>
                  {connectedRepos.map((repo) => (
                    <option key={repo.id} value={repo.id}>
                      {repo.owner}/{repo.name}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Event type
                <select name="eventType" defaultValue="issues" suppressHydrationWarning>
                  <option value="issues">issues</option>
                  <option value="pull_request">pull_request</option>
                </select>
              </label>
              <label>
                Match field
                <select name="matchField" defaultValue="title" suppressHydrationWarning>
                  <option value="title">title</option>
                  <option value="body">body</option>
                  <option value="author">author</option>
                </select>
              </label>
              <label>
                Match type
                <select name="matchType" defaultValue="contains" suppressHydrationWarning>
                  <option value="contains">contains</option>
                  <option value="equals">equals</option>
                </select>
              </label>
              <label>
                Match value
                <input name="matchValue" placeholder="bug" required suppressHydrationWarning />
              </label>
              <label>
                Action label
                <input name="actionLabel" placeholder="bug" suppressHydrationWarning />
              </label>
              <label>
                Action comment template
                <input name="actionComment" placeholder="Thanks for the report, {{author}}" suppressHydrationWarning />
              </label>
            </div>
            <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer", width: "fit-content", marginTop: 8 }}>
              <input type="checkbox" name="notifySlack" defaultChecked suppressHydrationWarning />
              <span>Notify Slack webhook channel</span>
            </label>
            <button className="button primary" type="submit" disabled={connectedRepos.length === 0} suppressHydrationWarning style={{ width: "100%" }}>
              Add new rule mapping
            </button>
          </form>

          <table className="table">
            <thead>
              <tr>
                <th>Repo</th>
                <th>Rule condition</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {connectedRepos.flatMap((repo) =>
                repo.rules.map((rule) => (
                  <tr key={rule.id}>
                    <td><strong>{repo.owner}/{repo.name}</strong></td>
                    <td style={{ fontSize: "0.9rem" }}>
                      <span className="badge" style={{ marginRight: 6 }}>{rule.eventType}</span>
                      <code>{rule.matchField} {rule.matchType} &quot;{rule.matchValue}&quot;</code>
                    </td>
                    <td>
                      <form action="/api/rules" method="post">
                        <input type="hidden" name="intent" value="delete" />
                        <input type="hidden" name="repoId" value={repo.id} />
                        <input type="hidden" name="ruleId" value={rule.id} />
                        <button className="button secondary" type="submit" suppressHydrationWarning style={{ padding: "6px 12px", borderRadius: "8px", fontSize: "0.8rem" }}>Delete</button>
                      </form>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}