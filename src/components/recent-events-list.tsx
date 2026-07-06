"use client";

import { useEffect, useState } from "react";
import type { Prisma } from "@prisma/client";
import { getEventSummary } from "@/server/rules";
import EventDetailsExpanded from "@/components/event-details-expanded";

type EventWithRepoAndActions = Prisma.EventGetPayload<{
  include: {
    repo: true;
    actions: true;
  };
}>;

interface RecentEventsListProps {
  initialEvents: EventWithRepoAndActions[];
}

export default function RecentEventsList({ initialEvents }: RecentEventsListProps) {
  const [events, setEvents] = useState<EventWithRepoAndActions[]>(initialEvents);
  const [loading, setLoading] = useState(false);

  // Poll for new events every 4 seconds
  useEffect(() => {
    let active = true;
    const interval = setInterval(async () => {
      try {
        const response = await fetch("/api/events");
        if (!response.ok) throw new Error("Failed to poll events");
        const data = await response.json();
        
        if (active && data.events) {
          // Compare ID lists or count to update only when different
          setEvents(data.events);
        }
      } catch (error) {
        console.warn("Polling error:", error);
      }
    }, 4000);

    return () => {
      active = false;
      clearInterval(interval);
    };
  }, []);

  return (
    <div className="panel">
      <h2 style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span>Recent events</span>
        {loading && <span style={{ fontSize: "0.8rem", color: "var(--muted)", fontWeight: "normal" }}>syncing...</span>}
      </h2>
      <p className="muted" style={{ marginBottom: 20 }}>Webhooks captured in real-time. Polls active.</p>
      
      <ul className="log-list">
        {events.length === 0 ? (
          <li className="log-card">
            <div className="stack" style={{ gap: 8 }}>
              <strong>No events captured yet</strong>
              <span className="log-meta">Once a webhook arrives, it will appear here with its action log.</span>
            </div>
          </li>
        ) : (
          events.map((event) => {
            const summary = getEventSummary(event.eventType, event.payload);
            return (
              <li key={event.id} style={{ listStyle: "none" }}>
                <details className="event-details" style={{ width: "100%" }}>
                  <summary className="log-card" suppressHydrationWarning style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div className="stack" style={{ gap: 6 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <strong>{event.repo.owner}/{event.repo.name}</strong>
                        <span className="badge" style={{ padding: "2px 8px", fontSize: "10px" }}>{summary.typeLabel}</span>
                      </div>
                      <span className="log-meta" style={{ fontWeight: "600", fontSize: "0.95rem" }}>
                        {summary.title}
                      </span>
                      <span className="log-meta" style={{ fontSize: "0.82rem" }}>
                        {summary.description} · by <strong>{summary.author}</strong> · {new Date(event.receivedAt).toLocaleTimeString()}
                      </span>
                    </div>
                    <span className="badge muted" suppressHydrationWarning>{event.actions.length} actions</span>
                  </summary>
                  <EventDetailsExpanded event={event} />
                </details>
              </li>
            );
          })
        )}
      </ul>
    </div>
  );
}
