"use client";

import React, { useState } from "react";

interface BillingPanelProps {
  subscriptionStatus: string;
  connectedRepoCount: number;
}

export default function BillingPanel({ subscriptionStatus, connectedRepoCount }: BillingPanelProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const isPro = subscriptionStatus === "active";

  const handleUpgrade = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/stripe/checkout", { method: "POST" });
      const data = await res.json();

      if (!res.ok || !data.url) {
        throw new Error(data.error || "Failed to create checkout session");
      }

      window.location.href = data.url;
    } catch (err: any) {
      setError(err.message || "Failed to launch Stripe Checkout");
      setLoading(false);
    }
  };

  const handleManagePortal = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/stripe/portal", { method: "POST" });
      const data = await res.json();

      if (!res.ok || !data.url) {
        throw new Error(data.error || "Failed to create portal session");
      }

      window.location.href = data.url;
    } catch (err: any) {
      setError(err.message || "Failed to open Stripe Customer Portal");
      setLoading(false);
    }
  };

  return (
    <div className="panel stack" style={{ gap: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <span className="eyebrow">Subscription & Billing</span>
          <h3 style={{ margin: "4px 0 0", color: "#FFFFFF" }}>
            {isPro ? "Pro Subscription" : "Free Plan"}
          </h3>
        </div>
        <span className={`badge ${isPro ? "success" : "muted"}`} style={{ padding: "4px 10px", fontSize: "0.82rem" }}>
          {isPro ? "ACTIVE PRO" : "FREE TIER"}
        </span>
      </div>

      <p className="muted" style={{ fontSize: "0.88rem", margin: 0 }}>
        {isPro
          ? "You have unlocked unlimited repository connections, diff-based rules (changed_files_match), AI Triage, and 1-click rule templates."
          : "Free Tier includes 1 connected repository and standard text-matching rules. Upgrade to Pro ($19/mo) for unlimited repos and codebase diff rules."}
      </p>

      <div style={{ display: "flex", alignItems: "center", gap: 12, background: "rgba(255, 255, 255, 0.03)", padding: "10px 14px", borderRadius: 8, border: "1px solid var(--panel-border)" }}>
        <strong style={{ fontSize: "0.85rem", color: "#FFFFFF" }}>Connected Repositories:</strong>
        <span className="badge" style={{ fontSize: "0.8rem", background: isPro ? "rgba(99, 102, 241, 0.2)" : "rgba(255, 255, 255, 0.1)", color: "#FFFFFF" }}>
          {connectedRepoCount} / {isPro ? "Unlimited" : "1 Max (Free Tier)"}
        </span>
      </div>

      {error && (
        <div style={{ color: "#F43F5E", fontSize: "0.82rem", background: "rgba(244, 63, 94, 0.1)", padding: "8px 12px", borderRadius: 6 }}>
          {error}
        </div>
      )}

      <div style={{ display: "flex", gap: 12, marginTop: 4 }}>
        {!isPro ? (
          <button
            type="button"
            onClick={handleUpgrade}
            disabled={loading}
            className="button primary"
            style={{ fontSize: "0.85rem", padding: "8px 16px" }}
          >
            {loading ? "Redirecting to Stripe..." : "Upgrade to Pro ($19/mo)"}
          </button>
        ) : (
          <button
            type="button"
            onClick={handleManagePortal}
            disabled={loading}
            className="button secondary"
            style={{ fontSize: "0.85rem", padding: "8px 16px" }}
          >
            {loading ? "Opening Portal..." : "Manage Subscription (Stripe Portal)"}
          </button>
        )}
      </div>
    </div>
  );
}
