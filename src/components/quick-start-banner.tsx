"use client";

import { useState } from "react";
import Link from "next/link";

interface QuickStartBannerProps {
  hasConnectedRepos: boolean;
  hasRules: boolean;
  hasEvents: boolean;
}

export default function QuickStartBanner({
  hasConnectedRepos,
  hasRules,
  hasEvents
}: QuickStartBannerProps) {
  const [dismissed, setDismissed] = useState(false);

  if (dismissed || (hasConnectedRepos && hasRules && hasEvents)) {
    return null;
  }

  const step1Done = hasConnectedRepos;
  const step2Done = hasRules;
  const step3Done = hasEvents;

  return (
    <div
      style={{
        background: "linear-gradient(135deg, rgba(37, 99, 235, 0.08) 0%, rgba(124, 58, 237, 0.08) 100%)",
        border: "1px solid rgba(37, 99, 235, 0.25)",
        borderRadius: "14px",
        padding: "20px 24px",
        marginBottom: "24px",
        position: "relative"
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "14px" }}>
        <div>
          <span className="eyebrow" style={{ color: "#3B82F6", fontSize: "0.75rem" }}>
            Quick Start Checklist
          </span>

          <h3 style={{ margin: "4px 0 0 0", fontSize: "1.15rem", fontWeight: 600 }}>
            Get your first GitHub automation running in &lt; 3 minutes
          </h3>
        </div>
        <button
          onClick={() => setDismissed(true)}
          style={{
            background: "none",
            border: "none",
            color: "var(--muted)",
            fontSize: "1.2rem",
            cursor: "pointer",
            padding: "2px 8px"
          }}
          title="Dismiss guide"
        >
          ×
        </button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "16px" }}>
        {/* Step 1 */}
        <div
          style={{
            background: "var(--panel-bg, rgba(255,255,255,0.03))",
            border: `1px solid ${step1Done ? "rgba(48,164,108,0.4)" : "var(--panel-border)"}`,
            borderRadius: "10px",
            padding: "14px 16px"
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
            <span style={{
              width: 22,
              height: 22,
              borderRadius: "50%",
              background: step1Done ? "rgb(48,164,108)" : "rgba(255,255,255,0.1)",
              color: "#fff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "0.75rem",
              fontWeight: 700
            }}>
              {step1Done ? "✓" : "1"}
            </span>
            <strong style={{ fontSize: "0.95rem" }}>1. Connect Repository</strong>
          </div>
          <p className="muted" style={{ fontSize: "0.82rem", margin: 0 }}>
            {step1Done ? "Connected! Webhook registered." : "Click 'Connect' on any repo in the left panel to register webhooks."}
          </p>
        </div>

        {/* Step 2 */}
        <div
          style={{
            background: "var(--panel-bg, rgba(255,255,255,0.03))",
            border: `1px solid ${step2Done ? "rgba(48,164,108,0.4)" : "var(--panel-border)"}`,
            borderRadius: "10px",
            padding: "14px 16px"
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
            <span style={{
              width: 22,
              height: 22,
              borderRadius: "50%",
              background: step2Done ? "rgb(48,164,108)" : "rgba(255,255,255,0.1)",
              color: "#fff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "0.75rem",
              fontWeight: 700
            }}>
              {step2Done ? "✓" : "2"}
            </span>
            <strong style={{ fontSize: "0.95rem" }}>2. Activate Rule</strong>
          </div>
          <p className="muted" style={{ fontSize: "0.82rem", margin: 0 }}>
            {step2Done ? "Rule active!" : "Click a 1-Click Rule Template below (e.g. Bug Auto-Tag) or create a custom rule."}
          </p>
        </div>

        {/* Step 3 */}
        <div
          style={{
            background: "var(--panel-bg, rgba(255,255,255,0.03))",
            border: `1px solid ${step3Done ? "rgba(48,164,108,0.4)" : "var(--panel-border)"}`,
            borderRadius: "10px",
            padding: "14px 16px"
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
            <span style={{
              width: 22,
              height: 22,
              borderRadius: "50%",
              background: step3Done ? "rgb(48,164,108)" : "rgba(255,255,255,0.1)",
              color: "#fff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "0.75rem",
              fontWeight: 700
            }}>
              {step3Done ? "✓" : "3"}
            </span>
            <strong style={{ fontSize: "0.95rem" }}>3. Trigger Webhook</strong>
          </div>
          <p className="muted" style={{ fontSize: "0.82rem", margin: 0 }}>
            {step3Done ? "First webhook event processed!" : "Open an issue/PR on GitHub matching your rule to see actions trigger live."}
          </p>
        </div>
      </div>
    </div>
  );
}
