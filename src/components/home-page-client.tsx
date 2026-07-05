"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function HomePageClient() {
  const titleText = "GitHub automation that survives duplicates, forged requests, and retries.";
  const words = titleText.split(" ");

  // Grid layout lines percentages - Spanning full screen width and full page height
  const vLines = [10, 20, 30, 40, 50, 60, 70, 80, 90];
  const hLines = [5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55, 60, 65, 70, 75, 80, 85, 90, 95];

  useEffect(() => {
    let scroll: any;
    import("locomotive-scroll").then((module) => {
      const LocomotiveScroll = module.default || module;
      try {
        scroll = new (LocomotiveScroll as any)();
      } catch (e) {
        console.error("Failed to initialize LocomotiveScroll:", e);
      }
    });

    return () => {
      if (scroll) scroll.destroy();
    };
  }, []);

  return (
    <div data-scroll-container style={{ overflow: "hidden", minHeight: "100vh", position: "relative" }}>
      {/* Background Scroll Grid ("God Grid") - Always Visible & Full Screen */}
      <div className="scroll-grid-container">
        {/* Vertical Lines */}
        {vLines.map((x, i) => (
          <div
            key={`v-${i}`}
            className="grid-line grid-line-v js-grid-line-v"
            style={{ left: `${x}%`, animationDelay: `${i * 0.04}s` }}
          />
        ))}
        {/* Horizontal Lines */}
        {hLines.map((y, i) => (
          <div
            key={`h-${i}`}
            className="grid-line grid-line-h js-grid-line-h"
            style={{ top: `${y}%`, animationDelay: `${i * 0.04}s` }}
          />
        ))}
        {/* Intersection Dots */}
        {vLines.flatMap((x, vi) =>
          hLines.map((y, hi) => (
            <div
              key={`dot-${vi}-${hi}`}
              className="grid-intersection-dot js-grid-dot"
              style={{ 
                left: `${x}%`, 
                top: `${y}%`,
                animationDelay: `${0.2 + (vi + hi) * 0.02}s`
              }}
            />
          ))
        )}
      </div>

      <main className="shell" data-scroll-section style={{ position: "relative", zIndex: 1 }}>
        
        {/* Giant Full Page Grid of Dark Black Lines */}
        <div className="page-grid">
          
          {/* Block 1: Header / Title Block */}
          <div className="grid-block grid-span-2" style={{ animationDelay: "0.4s" }}>
            <div>
              <span className="eyebrow" style={{ marginBottom: 16, animationDelay: "0.2s" }}>
                Production-Shaped Automation
              </span>
              <h2 style={{ margin: "12px 0" }}>
                {words.map((word, idx) => (
                  <span key={idx} className="word-wrap">
                    <span className="word-inner" style={{ animationDelay: `${idx * 0.02}s` }}>{word}</span>
                  </span>
                ))}
              </h2>
            </div>
            <p className="lede" style={{ marginTop: 12 }}>
              A robust Webhook handler, exponential retry sweeper, and custom mapping rules console integrated into a single, high-performance portal.
            </p>
          </div>

          {/* Block 2: Actions Block */}
          <div className="grid-block" style={{ justifyContent: "center", animationDelay: "0.45s" }}>
            <span className="eyebrow" style={{ alignSelf: "flex-start" }}>Access Panel</span>
            <div className="stack" style={{ gap: 14, width: "100%", marginTop: 24, marginBottom: 24 }}>
              <Link className="button primary" href="/dashboard" style={{ width: "100%", justifyContent: "center" }}>
                Open Dashboard
              </Link>
              <Link className="button secondary" href="/signin" style={{ width: "100%", justifyContent: "center" }}>
                Connect Repository
              </Link>
            </div>
            <p className="muted" style={{ fontSize: "0.85rem", textAlign: "center" }}>
              Sign in with GitHub Provider to authorize OAuth access scopes.
            </p>
          </div>

          {/* Block 3: Security - HMAC Verification */}
          <div className="grid-block" style={{ animationDelay: "0.5s" }}>
            <span className="eyebrow">01 / Security</span>
            <div className="stack" style={{ gap: 8 }}>
              <h3>HMAC Verification</h3>
              <p>
                Validates the X-Hub-Signature-256 header using timing-safe comparisons to isolate internal endpoints from spoofing.
              </p>
            </div>
          </div>

          {/* Block 4: Reliability - Idempotency protection */}
          <div className="grid-block" style={{ animationDelay: "0.55s" }}>
            <span className="eyebrow">02 / Integrity</span>
            <div className="stack" style={{ gap: 8 }}>
              <h3>Idempotent Ledger</h3>
              <p>
                Locks incoming X-GitHub-Delivery IDs at the database level. Filters duplicate deliveries before triggering writebacks.
              </p>
            </div>
          </div>

          {/* Block 5: Actions - Writebacks */}
          <div className="grid-block" style={{ animationDelay: "0.6s" }}>
            <span className="eyebrow">03 / Writeback</span>
            <div className="stack" style={{ gap: 8 }}>
              <h3>Automated Writebacks</h3>
              <p>
                Executes comments, labels, and issue assignments directly back to repositories using verified user Octokit REST instances.
              </p>
            </div>
          </div>

          {/* Block 6: Scheduler - Exponential Backoff */}
          <div className="grid-block" style={{ animationDelay: "0.65s" }}>
            <span className="eyebrow">04 / Sweeper</span>
            <div className="stack" style={{ gap: 8 }}>
              <h3>Retry Scheduler</h3>
              <p>
                Triggers periodic cron checks that sweeper-retry failed Slack or GitHub logs, increasing wait windows up to 5 attempts.
              </p>
            </div>
          </div>

          {/* Block 7: Custom Rules */}
          <div className="grid-block" style={{ animationDelay: "0.7s" }}>
            <span className="eyebrow">05 / Routing</span>
            <div className="stack" style={{ gap: 8 }}>
              <h3>Custom Mapping Rules</h3>
              <p>
                Binds rule matching conditions (contains/equals) dynamically to repository events directly from the user dashboard.
              </p>
            </div>
          </div>

          {/* Block 8: Secure OAuth */}
          <div className="grid-block" style={{ animationDelay: "0.75s" }}>
            <span className="eyebrow">06 / Credentials</span>
            <div className="stack" style={{ gap: 8 }}>
              <h3>Secure Credentials</h3>
              <p>
                Bridges user credentials and access tokens using secure, encrypted HTTP-only session cookies handled by Auth.js.
              </p>
            </div>
          </div>

        </div>
      </main>
    </div>
  );
}
