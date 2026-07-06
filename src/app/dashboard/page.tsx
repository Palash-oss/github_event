import Link from "next/link";
import { getServerSession } from "next-auth/next";
import { redirect } from "next/navigation";
import type { Prisma } from "@prisma/client";
import { authOptions } from "@/server/auth";
import { prisma } from "@/server/prisma";
import AvailableRepos from "@/components/available-repos";
import { getEventSummary } from "@/lib/event-utils";
import EventDetailsExpanded from "@/components/event-details-expanded";
import RulesForm from "@/components/rules-form";
import RecentEventsList from "@/components/recent-events-list";

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

  // Serialize dates to prevent Next.js Server-Client boundary serialization errors
  const serializedRecentEvents = JSON.parse(JSON.stringify(recentEvents));
  const serializedConnectedRepos = JSON.parse(JSON.stringify(connectedRepos));

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
        <RecentEventsList initialEvents={serializedRecentEvents} />

        <div className="panel">
          <h2>
            <span>Rules snapshot</span>
          </h2>
          <p className="muted" style={{ marginBottom: 20 }}>Configure rule mappings. Unmatched webhooks fallback to default triggers.</p>
          
          <RulesForm connectedRepos={serializedConnectedRepos} />

          <div style={{ overflowX: "auto", width: "100%", WebkitOverflowScrolling: "touch" }}>
            <table className="table" style={{ width: "100%", minWidth: "500px" }}>
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
        </div>
      </section>
    </main>
  );
}