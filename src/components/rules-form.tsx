"use client";

import { useState } from "react";
import type { Prisma } from "@prisma/client";

type RepoWithRules = Prisma.RepoGetPayload<{
  include: { rules: true };
}>;

interface RulesFormProps {
  connectedRepos: RepoWithRules[];
}

export default function RulesForm({ connectedRepos }: RulesFormProps) {
  const [eventType, setEventType] = useState("issues");

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

  return (
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

      <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer", width: "fit-content", marginTop: 8 }}>
        <input type="checkbox" name="notifySlack" defaultChecked suppressHydrationWarning />
        <span>Notify Slack webhook channel</span>
      </label>
      
      <button className="button primary" type="submit" disabled={connectedRepos.length === 0} suppressHydrationWarning style={{ width: "100%" }}>
        Add new rule mapping
      </button>
    </form>
  );
}
