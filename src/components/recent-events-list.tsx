"use client";

import { useEffect, useState } from "react";
import type { Prisma } from "@prisma/client";
import { getEventSummary } from "@/lib/event-utils";

type EventWithRepoAndActions = Prisma.EventGetPayload<{
  include: {
    repo: true;
    actions: true;
  };
}> & {
  aiSummary?: string | null;
  aiPriority?: string | null;
  aiSuggestedLabel?: string | null;
};

interface RecentEventsListProps {
  initialEvents: EventWithRepoAndActions[];
}

export default function RecentEventsList({ initialEvents }: RecentEventsListProps) {
  const [events, setEvents] = useState<EventWithRepoAndActions[]>(initialEvents);
  const [isSimulating, setIsSimulating] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [sseActive, setSseActive] = useState(false);

  useEffect(() => {
    setMounted(true);

    // 1. Connect SSE Stream for real-time <50ms pushes
    let eventSource: EventSource | null = null;
    try {
      eventSource = new EventSource("/api/events/stream");
      eventSource.onopen = () => setSseActive(true);
      eventSource.onmessage = (e) => {
        try {
          const data = JSON.parse(e.data);
          if (data.events) {
            setEvents(data.events);
          }
        } catch {}
      };
      eventSource.onerror = () => {
        setSseActive(false);
        eventSource?.close();
      };
    } catch {}

    // 2. Fallback polling every 4 seconds if SSE drops
    const interval = setInterval(async () => {
      if (sseActive) return;
      try {
        const response = await fetch("/api/events");
        if (response.ok) {
          const data = await response.json();
          if (data.events) setEvents(data.events);
        }
      } catch {}
    }, 4000);

    return () => {
      clearInterval(interval);
      if (eventSource) eventSource.close();
    };
  }, [sseActive]);

  async function handleSimulate() {
    setIsSimulating(true);
    try {
      const res = await fetch("/api/events/simulate", { method: "POST" });
      if (res.ok) {
        // Trigger manual refresh
        const data = await fetch("/api/events").then(r => r.json());
        if (data.events) setEvents(data.events);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsSimulating(false);
    }
  }

  async function handleRerun(eventId: string) {
    try {
      await fetch(`/api/events/${eventId}/rerun`, { method: "POST" });
      const data = await fetch("/api/events").then(r => r.json());
      if (data.events) setEvents(data.events);
    } catch (e) {
      console.error(e);
    }
  }

  return (
    <div className="panel">
      <h2 style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span>Recent events</span>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <button
            onClick={handleSimulate}
            disabled={isSimulating}
            className="button secondary"
            style={{ padding: "4px 10px", fontSize: "0.78rem" }}
          >
            {isSimulating ? "Simulating..." : "⚡ Trigger Test Webhook"}
          </button>
          <span className="badge success" style={{ fontSize: "10px", padding: "2px 6px" }}>
            {sseActive ? "SSE Live Stream" : "Polling Stream"}
          </span>
        </div>
      </h2>
      <p className="muted" style={{ marginBottom: 20 }}>Webhooks captured in real-time with AI Triage summary.</p>
      
      <ul className="log-list">
        {events.length === 0 ? (
          <li className="log-card">
            <div className="stack" style={{ gap: 8 }}>
              <strong>No events captured yet</strong>
              <span className="log-meta">Once a webhook arrives or you click &quot;Trigger Test Webhook&quot;, it will appear here.</span>
            </div>
          </li>
        ) : (
          events.map((event) => {
            const summary = getEventSummary(event.eventType, event.payload);
            const priorityColor = event.aiPriority === "P0" ? "danger" : event.aiPriority === "P1" ? "warn" : "muted";

            return (
              <li key={event.id} style={{ listStyle: "none" }}>
                <details className="event-details" style={{ width: "100%" }}>
                  <summary className="log-card" suppressHydrationWarning style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div className="stack" style={{ gap: 6 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <strong>{event.repo.owner}/{event.repo.name}</strong>
                        <span className="badge" style={{ padding: "2px 8px", fontSize: "10px" }}>{summary.typeLabel}</span>
                        {event.aiPriority && (
                          <span className={`badge ${priorityColor}`} style={{ padding: "2px 6px", fontSize: "10px" }}>
                            {event.aiPriority}
                          </span>
                        )}
                      </div>
                      <span className="log-meta" style={{ fontWeight: "600", fontSize: "0.95rem" }}>
                        {summary.title}
                      </span>
                      {event.aiSummary && (
                        <span style={{ fontSize: "0.85rem", color: "var(--text)", fontStyle: "italic", background: "rgba(255,255,255,0.03)", padding: "4px 8px", borderRadius: "6px", width: "fit-content" }}>
                          🤖 {event.aiSummary}
                        </span>
                      )}
                      <span className="log-meta" style={{ fontSize: "0.82rem" }}>
                        {summary.description} · by <strong>{summary.author}</strong> · {mounted ? new Date(event.receivedAt).toLocaleTimeString() : ""}
                      </span>
                    </div>
                    <span className="badge muted" suppressHydrationWarning>{event.actions.length} actions</span>
                  </summary>
                  <div style={{ padding: "16px 20px", background: "rgba(28, 27, 25, 0.03)", borderRadius: 12, border: "1px solid var(--panel-border)", marginTop: 8, fontSize: "0.9rem" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                      <p className="muted" style={{ fontStyle: "italic", fontSize: "0.88rem", margin: 0 }}>
                        Expand in <a href="/dashboard/logs" style={{ color: "var(--text)", textDecoration: "underline" }}>Logs Archive</a> to see full payload.
                      </p>
                      <button
                        onClick={() => handleRerun(event.id)}
                        className="button secondary"
                        style={{ padding: "3px 8px", fontSize: "0.75rem" }}
                      >
                        🔄 Re-run Rules
                      </button>
                    </div>
                    <div style={{ marginTop: 8 }}>
                      {event.actions.length === 0 ? (
                        <span className="muted" style={{ fontSize: "0.85rem", fontStyle: "italic" }}>No rules matched this event.</span>
                      ) : (
                        <ul style={{ paddingLeft: 16, margin: 0 }}>
                          {event.actions.map((act: any) => (
                            <li key={act.id} style={{ listStyleType: "square", fontSize: "0.88rem", marginBottom: 4 }}>
                              <code>{act.actionType}</code>:{" "}
                              <span className={`badge ${act.status === "success" ? "success" : act.status === "failed" ? "warn" : "muted"}`} style={{ padding: "1px 6px", fontSize: "11px", marginLeft: 4 }}>
                                {act.status}
                              </span>
                              {act.details && (
                                <span className="muted" style={{ fontSize: "0.8rem", marginLeft: 6 }}>
                                  {act.actionType === "github_label" && `— labeled "#${(act.details as any).label ?? ""}"`}
                                  {act.actionType === "github_comment" && `— commented on #${(act.details as any).issueNumber ?? "?"}`}
                                  {act.actionType?.includes("notify") && `— ${act.actionType} delivered`}
                                </span>
                              )}
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </div>
                </details>
              </li>
            );
          })
        )}
      </ul>
    </div>
  );
}
