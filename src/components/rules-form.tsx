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
  const [matchType, setMatchType] = useState("contains");
  const [status, setStatus] = useState<"idle" | "saving" | "success" | "error">("idle");
  const [message, setMessage] = useState("");
  const formRef = useRef<HTMLFormElement>(null);

  // Determine available match fields based on event type
  const getMatchFields = () => {
    if (eventType === "push") {
      return [
        { value: "message", label: "commit message" },
        { value: "ref", label: "branch (ref)" },
        { value: "author", label: "committer username" },
        { value: "changed_files_match", label: "changed_files_match (file path glob)" },
        { value: "modified_files", label: "modified files path" },
        { value: "ai_priority", label: "AI Priority (P0 / P1 / P2)" }
      ];
    }
    return [
      { value: "title", label: "title" },
      { value: "body", label: "body text" },
      { value: "author", label: "author username" },
      { value: "action", label: "action (opened / closed / labeled)" },
      { value: "changed_files_match", label: "changed_files_match (file path glob)" },
      { value: "ai_priority", label: "AI Priority (P0 / P1 / P2)" },
      { value: "modified_files", label: "modified files path" }
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
        setMessage("Rule saved successfully! It will now automatically match incoming webhooks.");
        formRef.current?.reset();
        setTimeout(() => {
          setStatus("idle");
          setMessage("");
          window.location.reload();
        }, 3000);
      } else {
        const data = await res.json().catch(() => ({}));
        setStatus("error");
        setMessage(`Failed to save rule: ${data.error ?? res.statusText}`);
      }
    } catch (err) {
      setStatus("error");
      setMessage("Network error — make sure you are signed in and try again.");
    }
  }

  const [matchValue, setMatchValue] = useState("");
  const [actionLabel, setActionLabel] = useState("");
  const [actionComment, setActionComment] = useState("");

  const applyPreset = (preset: "ai_p0" | "regex_jira" | "glob_db" | "bug") => {
    if (preset === "ai_p0") {
      setEventType("issues");
      setMatchType("equals");
      setMatchValue("P0");
      setActionLabel("urgent-p0");
      setActionComment("AI Triage assessed this item as P0 Critical. Escalating immediately.");
    } else if (preset === "regex_jira") {
      setEventType("issues");
      setMatchType("regex");
      setMatchValue("CVE-\\d+|JIRA-\\d+");
      setActionLabel("security-tracked");
      setActionComment("Ticket reference detected in issue: {{title}}.");
    } else if (preset === "glob_db") {
      setEventType("push");
      setMatchType("glob_match");
      setMatchValue("*.prisma");
      setActionLabel("");
      setActionComment("");
    } else if (preset === "bug") {
      setEventType("issues");
      setMatchType("contains");
      setMatchValue("bug");
      setActionLabel("bug");
      setActionComment("Thanks for reporting this bug, {{author}}! Our team is investigating.");
    }
  };

  return (
    <form ref={formRef} onSubmit={handleSubmit} className="stack" style={{ marginBottom: 24 }}>
      {/* 1-Click Preset Rule Templates */}
      <div className="stack" style={{ gap: 8 }}>
        <span className="eyebrow" style={{ fontSize: "0.75rem" }}>Smart Rule Presets</span>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button type="button" onClick={() => applyPreset("ai_p0")} className="button secondary" style={{ padding: "4px 10px", fontSize: "0.8rem" }}>
            AI P0 Critical Escalation
          </button>
          <button type="button" onClick={() => applyPreset("regex_jira")} className="button secondary" style={{ padding: "4px 10px", fontSize: "0.8rem" }}>
            Regex Ticket / CVE Pattern
          </button>
          <button type="button" onClick={() => applyPreset("glob_db")} className="button secondary" style={{ padding: "4px 10px", fontSize: "0.8rem" }}>
            Glob DB Schema Watch (*.prisma)
          </button>
          <button type="button" onClick={() => applyPreset("bug")} className="button secondary" style={{ padding: "4px 10px", fontSize: "0.8rem" }}>
            Auto-Label Bugs
          </button>
        </div>
      </div>

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
          <select 
            name="matchType" 
            value={matchType}
            onChange={(e) => setMatchType(e.target.value)}
            suppressHydrationWarning
          >
            <option value="contains">contains (substring)</option>
            <option value="equals">equals (exact)</option>
            <option value="regex">regex (regular expression)</option>
            <option value="glob_match">glob_match (wildcard paths)</option>
          </select>
        </label>
        
        <label>
          Match value
          <input 
            name="matchValue" 
            value={matchValue}
            onChange={(e) => setMatchValue(e.target.value)}
            placeholder={
              matchType === "regex" ? "CVE-\\d+|JIRA-\\d+" :
              matchType === "glob_match" ? "*.prisma or src/auth/*" :
              "P0 / bug / main"
            } 
            required 
            suppressHydrationWarning 
          />
        </label>
        
        <label style={{ opacity: eventType === "push" ? 0.5 : 1 }}>
          Action label
          <input 
            name="actionLabel" 
            value={actionLabel}
            onChange={(e) => setActionLabel(e.target.value)}
            placeholder={eventType === "push" ? "Not applicable" : "urgent-p0"} 
            disabled={eventType === "push"}
            suppressHydrationWarning 
          />
        </label>
        
        <label className="grid-span-2" style={{ opacity: eventType === "push" ? 0.5 : 1 }}>
          Action comment template
          <input 
            name="actionComment" 
            value={actionComment}
            onChange={(e) => setActionComment(e.target.value)}
            placeholder={eventType === "push" ? "Not applicable for push events" : "Thanks for the report, {{author}}"} 
            disabled={eventType === "push"}
            suppressHydrationWarning 
          />
        </label>
      </div>

      {eventType === "push" && (
        <div style={{ fontSize: "0.82rem", color: "var(--muted)", fontStyle: "italic", background: "rgba(0,0,0,0.01)", padding: "10px 14px", borderRadius: "8px", border: "1px dotted var(--panel-border)", marginTop: -8 }}>
          <strong>Note</strong>: Push events trigger Slack notifications (GitHub label/comment write-backs are skipped because pushes are not tied to a single issue/PR).
        </div>
      )}

      {eventType !== "push" && (
        <div style={{ fontSize: "0.82rem", color: "var(--muted)", background: "rgba(0,0,0,0.01)", padding: "10px 14px", borderRadius: "8px", border: "1px dotted var(--panel-border)", marginTop: -8 }}>
          <strong>Tip</strong>: Select <strong>AI Priority (P0 / P1 / P2)</strong> to trigger actions based on AI Triage assessment, or select <strong>regex</strong> for pattern matching like <code>CVE-\d+</code>.
        </div>
      )}

      <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginTop: 8 }}>
        <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
          <input type="checkbox" name="notifySlack" defaultChecked suppressHydrationWarning />
          <span>Slack</span>
        </label>
        <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
          <input type="checkbox" name="notifyDiscord" suppressHydrationWarning />
          <span>Discord</span>
        </label>
        <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
          <input type="checkbox" name="notifyTelegram" suppressHydrationWarning />
          <span>Telegram</span>
        </label>
      </div>

      <button type="submit" className="button primary" disabled={status === "saving"} style={{ opacity: status === "saving" ? 0.6 : 1, cursor: status === "saving" ? "not-allowed" : "pointer", marginTop: 12 }}>
        {status === "saving" ? "Saving…" : "Save rule"}
      </button>
    </form>
  );
}
