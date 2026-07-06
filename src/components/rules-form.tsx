"use client";

import { useState, useRef } from "react";
import type { Prisma } from "@prisma/client";

type RepoWithRules = Prisma.RepoGetPayload<{
  include: { rules: true };
}>;

interface RulesFormProps {
  connectedRepos: RepoWithRules[];
}

export default function RulesForm({ connectedRepos }: RulesFormProps) {
  const [eventType, setEventType] = useState("issues");
  const [status, setStatus] = useState<"idle" | "saving" | "success" | "error">("idle");
  const [message, setMessage] = useState("");
  const formRef = useRef<HTMLFormElement>(null);

  // Determine available match fields based on event type
  const getMatchFields = () => {
    if (eventType === "push") {
      return [
        { value: "message", label: "commit message" },
        { value: "ref", label: "branch (ref)" },
        { value: "author", label: "committer username" }
      ];
    }
    return [
      { value: "title", label: "title" },
      { value: "body", label: "body text" },
      { value: "author", label: "author username" },
      { value: "action", label: "action (opened / closed / labeled)" }
    ];
  };

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus("saving");
    setMessage("");

    const form = e.currentTarget;
    const formData = new FormData(form);

    try {
      const res = await fetch("/api/rules", {
        method: "POST",
        body: formData
      });

      if (res.ok) {
        setStatus("success");
        setMessage("✅ Rule saved! It will now automatically match incoming webhooks.");
        formRef.current?.reset();
        // Auto-dismiss after 4s and reload to show the new rule
        setTimeout(() => {
          setStatus("idle");
          setMessage("");
          window.location.reload();
        }, 3000);
      } else {
        const data = await res.json().catch(() => ({}));
        setStatus("error");
        setMessage(`❌ Failed to save rule: ${data.error ?? res.statusText}`);
      }
    } catch (err) {
      setStatus("error");
      setMessage("❌ Network error — make sure you are signed in and try again.");
    }
  }

  return (
    <form ref={formRef} onSubmit={handleSubmit} className="stack" style={{ marginBottom: 24 }}>
      {/* Status banner */}
      {status !== "idle" && (
        <div style={{
          padding: "12px 16px",
          borderRadius: 10,
          border: `1px solid ${status === "success" ? "rgba(48,164,108,0.3)" : status === "error" ? "rgba(229,72,77,0.3)" : "var(--panel-border)"}`,
          background: status === "success" ? "rgba(48,164,108,0.08)" : status === "error" ? "rgba(229,72,77,0.08)" : "rgba(0,0,0,0.02)",
          fontSize: "0.9rem",
          fontWeight: 500,
          color: status === "success" ? "rgb(48,164,108)" : status === "error" ? "rgb(229,72,77)" : "var(--text)"
        }}>
          {status === "saving" ? "⏳ Saving rule..." : message}
        </div>
      )}

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
          <select 
            name="eventType" 
            value={eventType} 
            onChange={(e) => setEventType(e.target.value)}
            suppressHydrationWarning
          >
            <option value="issues">issues</option>
            <option value="pull_request">pull_request</option>
            <option value="push">push</option>
          </select>
        </label>
        
        <label>
          Match field
          <select name="matchField" key={eventType} defaultValue={getMatchFields()[0].value} suppressHydrationWarning>
            {getMatchFields().map((field) => (
              <option key={field.value} value={field.value}>
                {field.label}
              </option>
            ))}
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
          <input 
            name="matchValue" 
            placeholder={
              eventType === "push" ? "release" 
              : "bug / closed / opened / Palash-oss"
            } 
            required 
            suppressHydrationWarning 
          />
        </label>
        
        <label style={{ opacity: eventType === "push" ? 0.5 : 1 }}>
          Action label
          <input 
            name="actionLabel" 
            placeholder={eventType === "push" ? "Not applicable" : "bug"} 
            disabled={eventType === "push"}
            suppressHydrationWarning 
          />
        </label>
        
        <label className="grid-span-2" style={{ opacity: eventType === "push" ? 0.5 : 1 }}>
          Action comment template
          <input 
            name="actionComment" 
            placeholder={eventType === "push" ? "Not applicable for push events" : "Thanks for the report, {{author}}"} 
            disabled={eventType === "push"}
            suppressHydrationWarning 
          />
        </label>
      </div>

      {eventType === "push" && (
        <div style={{ fontSize: "0.82rem", color: "var(--muted)", fontStyle: "italic", background: "rgba(0,0,0,0.01)", padding: "10px 14px", borderRadius: "8px", border: "1px dotted var(--panel-border)", marginTop: -8 }}>
          ℹ️ <strong>Note</strong>: Push events only support Slack notifications (write-back labels and comments will be skipped because push commits are not tied to a single issue/PR).
        </div>
      )}

      {eventType !== "push" && (
        <div style={{ fontSize: "0.82rem", color: "var(--muted)", background: "rgba(0,0,0,0.01)", padding: "10px 14px", borderRadius: "8px", border: "1px dotted var(--panel-border)", marginTop: -8 }}>
          💡 <strong>Tip</strong>: Match field <code>action</code> = <code>closed</code> to trigger actions when a developer resolves an issue. Match field <code>action</code> = <code>opened</code> to trigger when a new issue is reported.
        </div>
      )}

      <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer", width: "fit-content", marginTop: 8 }}>
        <input type="checkbox" name="notifySlack" defaultChecked suppressHydrationWarning />
        <span>Notify Slack webhook channel</span>
      </label>

      <button type="submit" className="btn" disabled={status === "saving"} style={{ opacity: status === "saving" ? 0.6 : 1, cursor: status === "saving" ? "not-allowed" : "pointer" }}>
        {status === "saving" ? "Saving…" : "Save rule"}
      </button>
    </form>
  );
}
