"use client";

import { useEffect } from "react";
import Link from "next/link";
import Canvas3DBackground from "./canvas-3d-background";

export default function HomePageClient() {
  const titleText = "GitHub automation that survives duplicates, forged requests, and retries.";
  const words = titleText.split(" ");

  // Grid layout lines percentages spanning 100% of document height
  const vLines = [10, 20, 30, 40, 50, 60, 70, 80, 90];
  const hLines = [2, 5, 8, 11, 14, 17, 20, 23, 26, 29, 32, 35, 38, 41, 44, 47, 50, 53, 56, 59, 62, 65, 68, 71, 74, 77, 80, 83, 86, 89, 92, 95, 98, 100];

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

  // 3D Card Tilt Physics Handler
  const handleCardMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const card = e.currentTarget;
    const rect = card.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    const rotateX = ((y - centerY) / centerY) * -12;
    const rotateY = ((x - centerX) / centerX) * 12;

    card.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateZ(10px)`;
    card.style.borderColor = "#FFFFFF";
    card.style.boxShadow = "0 24px 60px rgba(255, 255, 255, 0.25), 0 4px 16px rgba(0, 0, 0, 0.5)";
    card.style.background = "rgba(15, 23, 42, 0.65)";
  };

  const handleCardMouseLeave = (e: React.MouseEvent<HTMLDivElement>) => {
    const card = e.currentTarget;
    card.style.transform = "perspective(1000px) rotateX(0deg) rotateY(0deg) translateZ(0px)";
    card.style.borderColor = "rgba(255, 255, 255, 0.16)";
    card.style.boxShadow = "none";
    card.style.background = "rgba(15, 23, 42, 0.45)";
  };

  const cardGlassStyle = {
    background: "rgba(15, 23, 42, 0.2)",
    backdropFilter: "blur(6px)",
    WebkitBackdropFilter: "blur(6px)",
    borderColor: "rgba(255, 255, 255, 0.22)",
    transition: "transform 0.15s ease-out, border-color 0.3s, box-shadow 0.3s, background-color 0.3s"
  };

  return (
    <div data-scroll-container style={{ overflow: "hidden", minHeight: "100vh", position: "relative", background: "#090C15" }}>
      {/* 3D WebGL / HTML5 Physics Canvas Background */}
      <Canvas3DBackground />

      {/* Background Grid Lines */}
      <div className="scroll-grid-container" style={{ opacity: 0.35, pointerEvents: "none" }}>
        {/* Vertical Lines */}
        {vLines.map((x, i) => (
          <div
            key={`v-${i}`}
            className="grid-line grid-line-v js-grid-line-v"
            style={{ left: `${x}%`, animationDelay: `${i * 0.04}s`, background: "rgba(255, 255, 255, 0.15)" }}
          />
        ))}
        {/* Horizontal Lines */}
        {hLines.map((y, i) => (
          <div
            key={`h-${i}`}
            className="grid-line grid-line-h js-grid-line-h"
            style={{ top: `${y}%`, animationDelay: `${i * 0.04}s`, background: "rgba(255, 255, 255, 0.15)" }}
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
                animationDelay: `${0.2 + (vi + hi) * 0.02}s`,
                background: "#FFFFFF",
                boxShadow: "0 0 8px rgba(255, 255, 255, 0.9)",
                opacity: 0.9
              }}
            />
          ))
        )}
      </div>

      <main className="shell" data-scroll-section style={{ position: "relative", zIndex: 1 }}>
        
        {/* Giant Full Page Grid */}
        <div className="page-grid" style={{ borderColor: "rgba(255, 255, 255, 0.16)" }}>
          
          {/* Block 1: Header / Title Block */}
          <div 
            className="grid-block grid-span-2" 
            onMouseMove={handleCardMouseMove}
            onMouseLeave={handleCardMouseLeave}
            style={{ ...cardGlassStyle, animationDelay: "0.4s" }}
          >
            <div>
              <span className="eyebrow" style={{ marginBottom: 16, animationDelay: "0.2s" }}>
                Multi-Tenant Enterprise Engine
              </span>
              <h2 style={{ margin: "12px 0", color: "#FFFFFF" }}>
                {words.map((word, idx) => (
                  <span key={idx} className="word-wrap">
                    <span className="word-inner" style={{ animationDelay: `${idx * 0.02}s` }}>{word}</span>
                  </span>
                ))}
              </h2>
            </div>
            <p className="lede" style={{ marginTop: 12, color: "#CBD5E1" }}>
              A robust Webhook engine, LLM AI triage, codebase-aware diff rules, and automated retry sweeper integrated into a single, high-performance SaaS platform.
            </p>
          </div>

          {/* Block 2: Actions Block */}
          <div 
            className="grid-block" 
            onMouseMove={handleCardMouseMove}
            onMouseLeave={handleCardMouseLeave}
            style={{ ...cardGlassStyle, justifyContent: "center", animationDelay: "0.45s" }}
          >
            <span className="eyebrow" style={{ alignSelf: "flex-start" }}>Access Portal</span>
            <div className="stack" style={{ gap: 14, width: "100%", marginTop: 24, marginBottom: 24 }}>
              <Link className="button primary" href="/dashboard" style={{ width: "100%", justifyContent: "center" }}>
                Open Dashboard
              </Link>
              <Link className="button secondary" href="/signin" style={{ width: "100%", justifyContent: "center" }}>
                Connect Repository
              </Link>
            </div>
            <p className="muted" style={{ fontSize: "0.85rem", textAlign: "center", color: "#CBD5E1" }}>
              Sign in with GitHub OAuth to connect repositories & set up rules.
            </p>
          </div>

          {/* Block 3: Security - Per-Repo HMAC Verification */}
          <div 
            className="grid-block" 
            onMouseMove={handleCardMouseMove}
            onMouseLeave={handleCardMouseLeave}
            style={{ ...cardGlassStyle, animationDelay: "0.5s" }}
          >
            <span className="eyebrow">01 / Security</span>
            <div className="stack" style={{ gap: 8 }}>
              <h3 style={{ color: "#FFFFFF" }}>Per-Repo HMAC Isolation</h3>
              <p style={{ color: "#CBD5E1" }}>
                Generates unique per-repository webhook secrets with route-level HMAC SHA-256 signature verification for complete tenant isolation.
              </p>
            </div>
          </div>

          {/* Block 4: Codebase-Aware Diff Rules */}
          <div 
            className="grid-block" 
            onMouseMove={handleCardMouseMove}
            onMouseLeave={handleCardMouseLeave}
            style={{ ...cardGlassStyle, animationDelay: "0.55s" }}
          >
            <span className="eyebrow">02 / Codebase Awareness</span>
            <div className="stack" style={{ gap: 8 }}>
              <h3 style={{ color: "#FFFFFF" }}>PR Diff & Glob Rules</h3>
              <p style={{ color: "#CBD5E1" }}>
                Inspects changed files in Pull Requests via Octokit pagination, matching path globs like <code>src/payments/**</code> or <code>*.prisma</code>.
              </p>
            </div>
          </div>

          {/* Block 5: AI Triage & LLM Sentiment */}
          <div 
            className="grid-block" 
            onMouseMove={handleCardMouseMove}
            onMouseLeave={handleCardMouseLeave}
            style={{ ...cardGlassStyle, animationDelay: "0.6s" }}
          >
            <span className="eyebrow">03 / AI Intelligence</span>
            <div className="stack" style={{ gap: 8 }}>
              <h3 style={{ color: "#FFFFFF" }}>LLM AI Triage</h3>
              <p style={{ color: "#CBD5E1" }}>
                Automatically categorizes incoming events into <code>P0 Critical</code>, <code>P1 High</code>, or <code>P2 Minor</code> priority ratings.
              </p>
            </div>
          </div>

          {/* Block 6: Scheduler - Exponential Backoff */}
          <div 
            className="grid-block" 
            onMouseMove={handleCardMouseMove}
            onMouseLeave={handleCardMouseLeave}
            style={{ ...cardGlassStyle, animationDelay: "0.65s" }}
          >
            <span className="eyebrow">04 / Reliability</span>
            <div className="stack" style={{ gap: 8 }}>
              <h3 style={{ color: "#FFFFFF" }}>Exponential Retry & Dead-Letter</h3>
              <p style={{ color: "#CBD5E1" }}>
                Retries transient network drops with backoff and logs un-retryable 401/403/404 failures to a dead-letter log queue.
              </p>
            </div>
          </div>

          {/* Block 7: Multi-Channel Alerts */}
          <div 
            className="grid-block" 
            onMouseMove={handleCardMouseMove}
            onMouseLeave={handleCardMouseLeave}
            style={{ ...cardGlassStyle, animationDelay: "0.7s" }}
          >
            <span className="eyebrow">05 / Multi-Channel</span>
            <div className="stack" style={{ gap: 8 }}>
              <h3 style={{ color: "#FFFFFF" }}>Slack, Discord & Telegram</h3>
              <p style={{ color: "#CBD5E1" }}>
                Delivers interactive Block Kit notification cards directly to your team communication channels.
              </p>
            </div>
          </div>

          {/* Block 8: Operational Metrics */}
          <div 
            className="grid-block" 
            onMouseMove={handleCardMouseMove}
            onMouseLeave={handleCardMouseLeave}
            style={{ ...cardGlassStyle, animationDelay: "0.75s" }}
          >
            <span className="eyebrow">06 / Observability</span>
            <div className="stack" style={{ gap: 8 }}>
              <h3 style={{ color: "#FFFFFF" }}>Real-Time Metrics</h3>
              <p style={{ color: "#CBD5E1" }}>
                Provides live analytics on webhook volumes, downstream action success rates, and priority distribution graphs.
              </p>
            </div>
          </div>

        </div>
      </main>
    </div>
  );
}
