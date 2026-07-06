import type { Prisma } from "@prisma/client";

type EventWithActions = Prisma.EventGetPayload<{
  include: {
    actions: true;
  };
}>;

interface EventDetailsExpandedProps {
  event: EventWithActions;
}

export default function EventDetailsExpanded({ event }: EventDetailsExpandedProps) {
  const payload = (event.payload as Record<string, any>) ?? {};
  const eventType = event.eventType;

  // 1. Render Specific Payload Details based on Event Type
  const renderDetails = () => {
    if (eventType === "push") {
      const branch = payload.ref ? payload.ref.replace("refs/heads/", "") : "unknown";
      const commits = payload.commits ?? [];
      
      // Accumulate modified, added, removed files
      const added: string[] = [];
      const modified: string[] = [];
      const removed: string[] = [];

      for (const commit of commits) {
        if (commit.added) added.push(...commit.added);
        if (commit.modified) modified.push(...commit.modified);
        if (commit.removed) removed.push(...commit.removed);
      }

      // Unique files
      const uniqueAdded = Array.from(new Set(added));
      const uniqueModified = Array.from(new Set(modified));
      const uniqueRemoved = Array.from(new Set(removed));
      const totalChanges = uniqueAdded.length + uniqueModified.length + uniqueRemoved.length;

      return (
        <div className="stack" style={{ gap: 16 }}>
          <div>
            <strong style={{ display: "block", marginBottom: 6, fontSize: "0.95rem" }}>Push Metadata:</strong>
            <div style={{ fontSize: "0.9rem", color: "var(--muted)" }}>
              Target Branch: <code style={{ color: "var(--text)" }}>{branch}</code> · 
              Total Commits: <strong style={{ color: "var(--text)" }}>{commits.length}</strong>
            </div>
          </div>

          {commits.length > 0 && (
            <div>
              <strong style={{ display: "block", marginBottom: 8, fontSize: "0.95rem" }}>Commits in this Push:</strong>
              <div className="stack" style={{ gap: 8 }}>
                {commits.map((commit: any, idx: number) => (
                  <div key={commit.id || idx} className="commit-item">
                    <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 6, marginBottom: 4 }}>
                      <strong style={{ fontSize: "0.85rem", color: "var(--text)" }}>{commit.message.split("\n")[0]}</strong>
                      <code style={{ fontSize: "0.75rem", color: "var(--muted)" }}>{commit.id?.slice(0, 7)}</code>
                    </div>
                    <span className="log-meta" style={{ fontSize: "0.78rem" }}>
                      by <strong>{commit.author?.name || commit.author?.username}</strong>
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {totalChanges > 0 ? (
            <div>
              <strong style={{ display: "block", marginBottom: 6, fontSize: "0.95rem" }}>Modified Files ({totalChanges}):</strong>
              <ul className="file-list">
                {uniqueAdded.map(file => (
                  <li key={`add-${file}`} className="file-item">
                    <span className="file-badge added">Added</span>
                    <span>{file}</span>
                  </li>
                ))}
                {uniqueModified.map(file => (
                  <li key={`mod-${file}`} className="file-item">
                    <span className="file-badge modified">Modified</span>
                    <span>{file}</span>
                  </li>
                ))}
                {uniqueRemoved.map(file => (
                  <li key={`rem-${file}`} className="file-item">
                    <span className="file-badge removed">Removed</span>
                    <span>{file}</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <span className="muted" style={{ fontStyle: "italic", fontSize: "0.85rem" }}>No file modifications reported in payload.</span>
          )}
        </div>
      );
    }

    if (eventType === "issues") {
      const issue = payload.issue ?? {};
      const action = payload.action ?? "updated";
      const author = issue.user?.login ?? "unknown";

      return (
        <div className="stack" style={{ gap: 16 }}>
          <div>
            <strong style={{ display: "block", marginBottom: 6, fontSize: "0.95rem" }}>Issue Details:</strong>
            <div style={{ fontSize: "0.9rem", color: "var(--muted)", marginBottom: 8 }}>
              Number: <strong style={{ color: "var(--text)" }}>#{issue.number}</strong> · 
              Action: <span className="badge muted" style={{ textTransform: "capitalize", padding: "1px 8px", fontSize: "11px" }}>{action}</span> · 
              Author: <strong style={{ color: "var(--text)" }}>{author}</strong>
            </div>
            {issue.body ? (
              <div style={{ background: "var(--bg)", border: "1px solid var(--panel-border)", padding: "12px 16px", borderRadius: "10px", fontSize: "0.88rem", lineHeight: "1.5", color: "var(--text)", whiteSpace: "pre-wrap", wordBreak: "break-word", marginTop: 8 }}>
                {issue.body}
              </div>
            ) : (
              <span className="muted" style={{ fontStyle: "italic", fontSize: "0.85rem" }}>No description provided.</span>
            )}
          </div>
        </div>
      );
    }

    if (eventType === "pull_request") {
      const pr = payload.pull_request ?? {};
      const action = payload.action ?? "updated";
      const author = pr.user?.login ?? "unknown";
      const sourceBranch = pr.head?.ref ?? "unknown";
      const targetBranch = pr.base?.ref ?? "unknown";

      return (
        <div className="stack" style={{ gap: 16 }}>
          <div>
            <strong style={{ display: "block", marginBottom: 6, fontSize: "0.95rem" }}>Pull Request Details:</strong>
            <div style={{ fontSize: "0.9rem", color: "var(--muted)", marginBottom: 8 }}>
              Number: <strong style={{ color: "var(--text)" }}>#{pr.number}</strong> · 
              Action: <span className="badge muted" style={{ textTransform: "capitalize", padding: "1px 8px", fontSize: "11px" }}>{action}</span> · 
              Author: <strong style={{ color: "var(--text)" }}>{author}</strong>
            </div>
            <div style={{ fontSize: "0.85rem", color: "var(--muted)", marginBottom: 12 }}>
              Merge: <code style={{ color: "var(--text)" }}>{sourceBranch}</code> into <code style={{ color: "var(--text)" }}>{targetBranch}</code>
            </div>
            {pr.changed_files !== undefined && (
              <div style={{ fontSize: "0.85rem", color: "var(--muted)", marginBottom: 12 }}>
                Files changed: <strong style={{ color: "var(--text)" }}>{pr.changed_files}</strong> · 
                Additions: <span style={{ color: "var(--success)", fontWeight: "bold" }}>+{pr.additions}</span> · 
                Deletions: <span style={{ color: "var(--danger)", fontWeight: "bold" }}>-{pr.deletions}</span>
              </div>
            )}
            {pr.body ? (
              <div style={{ background: "var(--bg)", border: "1px solid var(--panel-border)", padding: "12px 16px", borderRadius: "10px", fontSize: "0.88rem", lineHeight: "1.5", color: "var(--text)", whiteSpace: "pre-wrap", wordBreak: "break-word", marginTop: 8 }}>
                {pr.body}
              </div>
            ) : (
              <span className="muted" style={{ fontStyle: "italic", fontSize: "0.85rem" }}>No description provided.</span>
            )}
          </div>
        </div>
      );
    }

    if (eventType === "ping") {
      const zen = payload.zen ?? "Keep it simple.";
      return (
        <div>
          <strong style={{ display: "block", marginBottom: 6, fontSize: "0.95rem" }}>Ping Message (GitHub Zen):</strong>
          <blockquote style={{ margin: 0, padding: "8px 16px", borderLeft: "4px solid var(--accent-dark)", fontStyle: "italic", color: "var(--muted)", background: "rgba(0,0,0,0.01)" }}>
            &quot;{zen}&quot;
          </blockquote>
        </div>
      );
    }

    return (
      <span className="muted" style={{ fontStyle: "italic" }}>No parsed visualizer available for event type: {eventType}</span>
    );
  };

  return (
    <div className="event-expanded-content" style={{ marginTop: 12, padding: "20px", background: "rgba(28, 27, 25, 0.03)", borderRadius: 12, border: "1px solid var(--panel-border)", fontSize: "0.9rem" }}>
      <div className="stack" style={{ gap: 20 }}>
        
        {/* 1. Parsed Event Details */}
        <div>
          {renderDetails()}
        </div>

        {/* 2. Action Logs */}
        <div style={{ borderTop: "1px solid var(--panel-border)", paddingTop: 16 }}>
          <strong style={{ display: "block", marginBottom: 12, fontSize: "0.95rem" }}>Automation Actions:</strong>
          {event.actions.length === 0 ? (
            <div style={{ background: "rgba(0,0,0,0.02)", border: "1px dashed var(--panel-border)", borderRadius: 10, padding: "16px 20px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                <span style={{ fontSize: "1.2rem" }}>💤</span>
                <strong style={{ fontSize: "0.92rem" }}>No automation triggered</strong>
              </div>
              <p className="muted" style={{ fontSize: "0.85rem", lineHeight: 1.6, margin: 0 }}>
                This webhook was received and stored, but no rule in your rules engine matched it.
                The event type was <code style={{ background: "var(--bg)", padding: "1px 6px", borderRadius: 4 }}>{event.eventType}</code>.
              </p>
              <p className="muted" style={{ fontSize: "0.82rem", lineHeight: 1.6, margin: "8px 0 0" }}>
                ➡ To automate actions for this event, go to your dashboard and add a new rule under <strong>Rules snapshot</strong>.
              </p>
            </div>
          ) : (
            <div className="stack" style={{ gap: 10 }}>
              {event.actions.map((act) => {
                const ctx = (act.details as Record<string, any>) ?? {};
                const isSuccess = act.status === "success";
                const isFailed = act.status === "failed";

                // Build a human-readable description of what the action did
                let actionDescription: string | null = null;
                if (act.actionType === "github_label") {
                  actionDescription = isSuccess
                    ? `Added label "${ctx.label ?? "unknown"}" to issue/PR #${ctx.issueNumber ?? "?"} on GitHub.`
                    : `Tried to add label "${ctx.label ?? "unknown"}" but it failed.`;
                } else if (act.actionType === "github_comment") {
                  actionDescription = isSuccess
                    ? `Posted a comment on issue/PR #${ctx.issueNumber ?? "?"}: "${String(ctx.comment ?? "").slice(0, 80)}${String(ctx.comment ?? "").length > 80 ? "…" : ""}"` 
                    : `Tried to post a comment on issue/PR #${ctx.issueNumber ?? "?"} but it failed.`;
                } else if (act.actionType === "slack_notify") {
                  actionDescription = isSuccess
                    ? `Sent a Slack Block Kit notification: "${String(ctx.message ?? "").slice(0, 80)}${String(ctx.message ?? "").length > 80 ? "…" : ""}"` 
                    : `Tried to notify Slack but the webhook delivery failed.`;
                }

                return (
                  <div key={act.id} style={{ background: isSuccess ? "rgba(48, 164, 108, 0.06)" : isFailed ? "rgba(229, 72, 77, 0.06)" : "rgba(0,0,0,0.02)", border: `1px solid ${isSuccess ? "rgba(48,164,108,0.2)" : isFailed ? "rgba(229,72,77,0.2)" : "var(--panel-border)"}`, borderRadius: 10, padding: "12px 16px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8, marginBottom: actionDescription ? 8 : 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span style={{ fontSize: "1rem" }}>
                          {act.actionType === "github_label" ? "🏷️" : act.actionType === "github_comment" ? "💬" : act.actionType === "slack_notify" ? "📣" : "⚙️"}
                        </span>
                        <code style={{ fontSize: "0.85rem" }}>{act.actionType}</code>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span className={`badge ${isSuccess ? "success" : isFailed ? "warn" : "muted"}`} style={{ padding: "2px 8px", fontSize: "11px" }}>
                          {act.status}
                        </span>
                        {act.attempts > 1 && <span className="muted" style={{ fontSize: "0.78rem" }}>({act.attempts} attempts)</span>}
                      </div>
                    </div>
                    {actionDescription && (
                      <p style={{ margin: 0, fontSize: "0.85rem", color: "var(--text)", lineHeight: 1.5 }}>{actionDescription}</p>
                    )}
                    {act.error && (
                      <div style={{ color: "var(--danger)", background: "var(--danger-bg)", padding: "8px 12px", borderRadius: 6, border: "1px solid rgba(229, 72, 77, 0.12)", fontSize: "0.82rem", fontFamily: "var(--font-mono)", marginTop: 8 }}>
                        {act.error}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* 3. Raw Webhook Payload (Collapsible & Auto-wrapping so it never overflows) */}
        <div style={{ borderTop: "1px solid var(--panel-border)", paddingTop: 16 }}>
          <details style={{ width: "100%" }}>
            <summary style={{ cursor: "pointer", color: "var(--muted)", fontSize: "0.82rem", outline: "none", fontWeight: 600 }}>
              View Raw Webhook JSON Payload
            </summary>
            <div style={{ marginTop: 8 }}>
              <pre style={{ margin: 0, padding: 16, background: "var(--bg)", border: "1px solid var(--panel-border)", borderRadius: 8, overflow: "auto", maxHeight: "250px", fontSize: "0.8rem" }}>
                <code>{JSON.stringify(event.payload, null, 2)}</code>
              </pre>
            </div>
          </details>
        </div>

      </div>
    </div>
  );
}
