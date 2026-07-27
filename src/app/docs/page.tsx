import Link from "next/link";

export const metadata = {
  title: "Documentation — GitHub Automation Bot",
  description: "User guide and technical reference for setting up webhooks, rules, PR diff matching, and multi-channel alerts."
};

export default function DocsPage() {
  return (
    <main className="shell stack fade-in-section" style={{ maxWidth: "900px", margin: "0 auto", padding: "40px 20px" }}>
      {/* Header / Nav */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "32px" }}>
        <Link href="/" className="button secondary" style={{ padding: "6px 14px", fontSize: "0.85rem" }}>
          ← Back to Home
        </Link>
        <Link href="/dashboard" className="button primary" style={{ padding: "6px 14px", fontSize: "0.85rem" }}>
          Open Dashboard
        </Link>
      </div>

      <header className="stack" style={{ gap: 8, marginBottom: 40 }}>
        <span className="eyebrow">Documentation & User Guide</span>
        <h1 style={{ fontSize: "clamp(2rem, 3.5vw, 3rem)", margin: 0 }}>GitHub Automation Bot</h1>
        <p className="lede" style={{ marginTop: 8 }}>
          A self-serve, resilient SaaS platform that listens to GitHub webhooks, runs codebase-aware rules and AI triage, and executes write-backs or multi-channel alerts with zero duplicate processing.
        </p>
      </header>

      {/* Table of Contents */}
      <nav style={{ background: "var(--panel-bg, rgba(255,255,255,0.02))", border: "1px solid var(--panel-border)", borderRadius: 12, padding: 20, marginBottom: 40 }}>
        <strong style={{ fontSize: "0.95rem", textTransform: "uppercase", letterSpacing: "0.05em" }}>In This Guide:</strong>
        <ul style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 10, marginTop: 12, paddingLeft: 20, margin: 0 }}>
          <li><a href="#overview">1. What This Does</a></li>
          <li><a href="#connecting-repo">2. Connecting a Repository</a></li>
          <li><a href="#templates">3. 1-Click Rule Templates</a></li>
          <li><a href="#custom-rules">4. Writing Custom Rules & Diff Matching</a></li>
          <li><a href="#pricing">5. Pricing & Plan Differences</a></li>
        </ul>
      </nav>

      {/* Section 1: Overview */}
      <section id="overview" className="panel" style={{ marginBottom: 32 }}>
        <h2>1. What This Does</h2>
        <p>
          GitHub Automation Bot connects your GitHub repositories to an automated event engine. Whenever an issue is opened, a pull request is created/updated, or code is pushed to your repository, GitHub sends a secure webhook event to our platform. Our engine verifies HMAC signatures, enforces database-level idempotency to prevent duplicate processing, runs LLM AI triage, evaluates custom rules (including PR file diff matching), and executes write-back labels, comments, or Slack/Discord/Telegram notifications within seconds.
        </p>
      </section>

      {/* Section 2: Connecting a Repository */}
      <section id="connecting-repo" className="panel" style={{ marginBottom: 32 }}>
        <h2>2. Connecting a Repository</h2>
        <ol style={{ paddingLeft: 20, display: "flex", flexDirection: "column", gap: 12 }}>
          <li>
            <strong>Sign in with GitHub</strong>: Click <em>Sign in with GitHub</em> on the landing page or dashboard.
          </li>
          <li>
            <strong>Select a Repo</strong>: In the Dashboard under <em>Available Repositories</em>, locate your target repository and click <strong>Connect</strong>.
          </li>
          <li>
            <strong>Automatic Webhook Registration</strong>: The bot generates a unique per-repository HMAC secret and uses the GitHub REST API to automatically register a webhook on your repo pointing to <code>/api/webhooks/github/[repoId]</code>.
          </li>
          <li>
            <strong>Ready for Events</strong>: Once connected, a green <code>active</code> badge appears next to your repository.
          </li>
        </ol>
      </section>

      {/* Section 3: 1-Click Rule Templates */}
      <section id="templates" className="panel" style={{ marginBottom: 32 }}>
        <h2>3. 1-Click Rule Templates</h2>
        <p>
          You don&apos;t need to write raw regex or complex configurations to get started. Use our 1-click rule templates on the Dashboard:
        </p>
        <ul style={{ paddingLeft: 20, display: "flex", flexDirection: "column", gap: 10 }}>
          <li>
            <strong>Alert on new dependency added (Pro)</strong>: Matches PR changes in <code>package.json</code>, <code>requirements.txt</code>, <code>go.mod</code>, <code>Cargo.toml</code>, or <code>Gemfile</code>. Adds <code>dependency-review</code> label and posts an audit notice.
          </li>
          <li>
            <strong>Stale PR reminder</strong>: Triggers on PRs flagged as stale by our daily background sweeper, adding <code>stale-pr</code> label and sending a review reminder.
          </li>
          <li>
            <strong>Require review on sensitive paths (Pro)</strong>: Watches file modifications under <code>auth/</code>, <code>payments/</code>, <code>config/</code>, or <code>secrets/</code>, tagging PRs with <code>security-audit</code>.
          </li>
          <li>
            <strong>AI P0 Escalation (Pro)</strong>: Automatically escalates issues rated <code>P0 Critical</code> by LLM triage, adding <code>urgent-p0</code> label instantly.
          </li>
        </ul>
      </section>

      {/* Section 4: Writing Custom Rules */}
      <section id="custom-rules" className="panel" style={{ marginBottom: 32 }}>
        <h2>4. Writing Custom Rules &amp; Diff Matching</h2>
        <p>
          You can configure rules for <code>issues</code>, <code>pull_request</code>, or <code>push</code> events.
        </p>

        <h3 style={{ marginTop: 16 }}>Available Match Fields:</h3>
        <table className="table" style={{ width: "100%", margin: "12px 0" }}>
          <thead>
            <tr>
              <th>Match Field</th>
              <th>Description</th>
              <th>Example Value</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><code>title</code></td>
              <td>Issue or PR title text</td>
              <td><code>bug</code> or <code>[HOTFIX]</code></td>
            </tr>
            <tr>
              <td><code>body</code></td>
              <td>Issue or PR main body text</td>
              <td><code>reproduce</code></td>
            </tr>
            <tr>
              <td><code>author</code></td>
              <td>GitHub username of author/sender</td>
              <td><code>octocat</code></td>
            </tr>
            <tr>
              <td><code>changed_files_match</code></td>
              <td>Inspects PR file diffs via Octokit pagination (Pro)</td>
              <td><code>*.prisma</code> or <code>src/auth/*</code></td>
            </tr>
            <tr>
              <td><code>ai_priority</code></td>
              <td>Matches AI Triage rating (P0 / P1 / P2)</td>
              <td><code>P0</code></td>
            </tr>
          </tbody>
        </table>

        <h3 style={{ marginTop: 16 }}>Match Types:</h3>
        <ul>
          <li><code>contains</code>: Case-insensitive substring search.</li>
          <li><code>equals</code>: Exact string comparison.</li>
          <li><code>regex</code>: Regular expression matching (e.g. <code>(?i).*(package\.json|go\.mod)</code>).</li>
          <li><code>glob_match</code>: Wildcard file path matching across any subdirectory.</li>
        </ul>
      </section>

      {/* Section 5: Pricing & Plans */}
      <section id="pricing" className="panel" style={{ marginBottom: 32 }}>
        <h2>5. Pricing &amp; Plan Differences</h2>
        <div style={{ overflowX: "auto" }}>
          <table className="table" style={{ width: "100%", marginTop: 12 }}>
            <thead>
              <tr>
                <th>Feature</th>
                <th>Free Tier ($0/mo)</th>
                <th>Pro Tier ($19/mo)</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Connected Repositories</td>
                <td>1 repo</td>
                <td><strong>Unlimited repos</strong></td>
              </tr>
              <tr>
                <td>Basic Rules (Title/Body/Author)</td>
                <td>✓ Included</td>
                <td>✓ Included</td>
              </tr>
              <tr>
                <td>Codebase Diff Rules (<code>changed_files_match</code>)</td>
                <td>Locked</td>
                <td><strong>✓ Unlocked</strong></td>
              </tr>
              <tr>
                <td>AI Triage Priority Escalate</td>
                <td>Locked</td>
                <td><strong>✓ Unlocked</strong></td>
              </tr>
              <tr>
                <td>Regex &amp; Glob Path Matching</td>
                <td>Locked</td>
                <td><strong>✓ Unlocked</strong></td>
              </tr>
              <tr>
                <td>Multi-Channel Alerts (Slack/Discord/Telegram)</td>
                <td>✓ Included</td>
                <td><strong>✓ Included</strong></td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <div style={{ textAlign: "center", marginTop: 40 }}>
        <Link href="/dashboard" className="button primary" style={{ padding: "12px 24px", fontSize: "1rem" }}>
          Go to Dashboard &amp; Start Automating
        </Link>
      </div>
    </main>
  );
}
