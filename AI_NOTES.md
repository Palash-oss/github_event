# AI Notes

## Tools and Collaboration
* **Tools**: We used Next.js 14, Auth.js (GitHub Provider), Prisma ORM, Neon Postgres, Octokit REST/Webhooks, and Tailwind/Vanilla CSS.
* **Work Split**: I (the AI) suggested technical designs, wrote code, handled database integrations, and built the visual parser and UI layout fixes. The user verified deployments, tested the webhooks manually, and requested critical UX improvements for event-level details and responsiveness.

## Key Architecture & Design Decisions
1. **JWT Sessions for Auth**: Used JWT sessions instead of database-backed sessions. This allowed storing GitHub OAuth access tokens directly on the `User` table without cluttering the database schema with the full Auth.js adapter tables.
2. **Database-Level Idempotency**: Verified and stored GitHub `deliveryId` in the `Event` table with a unique constraint. If GitHub delivers the same webhook twice, the database uniqueness constraint safely rejects the second attempt at the persistence layer, defending against race conditions.
3. **Timed/Queued Retries**: Wrapped downstream external calls (GitHub comment/label writes, Slack notifications) in individual try-catch blocks logging to `ActionLog`. If one fails, the webhook route still responds with `200 OK` instantly, and the retry sweeper route (`/api/retry-sweep`) picks up failures in the background using backoff.
4. **Rich Visualizer for Events**: Swapped the simple JSON payload display for a parser (`EventDetailsExpanded`) that automatically details branches, commits, colored file status badges (Added/Modified/Removed) for pushes, and merged branches/additions/deletions for pull requests.
5. **Per-Repo Webhook Endpoint Scoping (`/api/webhooks/github/[repoId]`)**:
   * *Why*: Global webhook endpoints looking up repositories via `findFirst({ where: { owner, name } })` introduce a severe multi-tenant vulnerability because `Repo` permits `@@unique([userId, owner, name])` (allowing different users to connect the same repository). Route-scoping webhooks with `/api/webhooks/github/[repoId]` guarantees 100% tenant isolation and instant, unambiguous secret lookup.
   * *Fallback Security*: Legacy `/api/webhooks/github` was updated to retrieve all candidate repos matching `owner/name` and iterate over their unique secrets until a matching signature is found, preventing cross-tenant data leakage.
6. **In-Flight Exponential Backoff & Dead-Letter Queue**:
   * *Why*: Differentiating transient errors (HTTP 429 rate limit, 500/502/503 server errors) from permanent errors (HTTP 401 Bad Credentials, 403 Forbidden, 404 Not Found). Transient errors use exponential backoff both in-flight and during background retry sweeps (up to 5 attempts). Permanent errors or exhausted retries are tagged as `dead_letter` in `ActionLog` to prevent infinite loops and ensure full observability.
7. **Sliding-Window Webhook Rate Limiting**:
   * *Why*: Added an in-memory sliding window rate limiter (100 requests per 60 seconds per `repoId`) returning `429 Too Many Requests` to prevent webhook event floods or accidental loops.
8. **AI Priority, Regex & Glob Pattern Smart Rules**:
   * *Why*: Basic string matching (`title contains "x"`) is provided for free by GitHub Actions. Adding AI Priority (`ai_priority`), Regular Expressions (`regex`), and Path Wildcards (`glob_match`) enables self-serve capabilities that GitHub Actions cannot do natively without custom YAML scripts—such as auto-escalating AI-triaged `P0` critical issues or watching file pattern changes (`*.prisma`, `src/auth/*`).
   * *Resilience*: Invalid regex strings input by users are safely handled via `try/catch` blocks in `matchesRule()`, returning `false` rather than crashing the background webhook event processor.
9. **Codebase-Aware Diff Rule (`changed_files_match`) & Paginated Octokit Fetching**:
   * *Why*: PR webhook payloads do not include complete file lists for large PRs. We added `getPullRequestChangedFiles()` in `github.ts` using `octokit.paginate(octokit.pulls.listFiles, { per_page: 100 })` to ensure PRs with 100+ files are completely retrieved without missing changed files or breaking memory boundaries.
   * *Conditional API Fetching*: Octokit changed-files API is called ONLY if a `changed_files_match` rule actually exists for that repository, preserving rate limits and minimizing network overhead.
10. **Full Feature Accessibility & Billing Gating Removal**:
    * *Unlocked Platform*: Removed all Stripe subscription gating and tier limits. All features—including unlimited connected repositories, codebase PR diff rules (`changed_files_match`), AI Triage (`ai_priority`), regular expressions, wildcards, 1-click templates, and multi-channel notifications—are 100% unlocked and freely accessible for all users out of the box.

11. **1-Click Pre-Built Rule Templates & Vercel Cron for Stale PRs**:
    * *Templates*: Added 3 instant rule templates (`Alert on new dependency added`, `Stale PR reminder`, `Require review on sensitive paths`) allowing users to activate working automation without configuring raw regex or globs.
    * *Vercel Cron*: Created `/api/cron/stale-prs` running daily via `vercel.json` (`0 0 * * *`) that queries active repos using Octokit to detect PRs open with no activity for 7+ days, posting GitHub reminder comments and Slack alerts.
12. **Multi-Channel Notification Engine & 100% Unit Test Suite Coverage**:
    * *Multi-Channel Notifications*: Integrated optional Discord embed webhooks (`notifyDiscord`) and Telegram Markdown bot alerts (`notifyTelegram`) alongside Slack Block Kit cards. Downstream notifications process independently with per-channel success/failure logging in `ActionLog`.
    * *100% Comprehensive Unit Test Coverage*: Expanded Vitest suite to cover all modules across 7 test files (`rules.test.ts`, `triage.test.ts`, `notifications.test.ts`, `billing.test.ts`, `stripe.test.ts`, `analytics.test.ts`, `webhook.test.ts`), enforcing strict boundary checks and failure resilience.
13. **Week 4 Launch Preparation, User Documentation (/docs), Fast Landing Page & Friction Removal**:
    * *User Documentation Page (/docs)*: Built a dedicated, user-facing `/docs` page detailing platform architecture, GitHub OAuth & webhook registration, 1-click rule templates, custom diff matching (`changed_files_match`), and pricing tiers.
    * *Fast Landing Page*: Built a lightweight, mobile-responsive landing page (`/`) featuring core value props, 3 feature highlights, visual demo card, Free vs Pro pricing table, and GitHub OAuth call-to-action.
    * *Frictionless Onboarding*: Introduced a 3-step Quick Start Checklist banner on the dashboard guiding first-time users from connecting repos to firing webhooks in under 3 minutes.
    * *Empty & Error State Audit*: Replaced blank screens with actionable guidance cards across repository lists, rule snapshots, delivery feeds, and logs archives.

## Hardest Bug & Resolution
* **Timing & Webhook Activation Gap**: The user reported that a commit push and an issue they created did not show up in the logs. After querying the database records and GitHub API webhook delivery logs, we discovered that both events occurred *minutes before* the user finished connecting their repository (which creates the webhook). We resolved this by explaining that webhooks are not retroactive and that the user needed to trigger a new event.
* **Empty Logs Archive & UI Container Breakouts**: The logs archive page was originally only loading `ActionLog` entries, meaning if webhooks didn't match any active rules, the archive page looked completely blank/broken. Additionally, when raw JSON payloads were expanded, they broke out of their responsive flex column boxes on the dashboard. We fixed this by rewriting the logs archive to load all webhook `Event` entries (displaying them as collapsible cards) and restricting text wrapping and overflow-x scroll boundaries on code blocks.

## Future Improvements
* **WebSocket Live Stream**: Use WebSockets or Server-Sent Events (SSE) to push new webhook deliveries to the dashboard instantly without manual page refreshes.
* **Granular Rules Editor**: Support advanced rule conjunctions (e.g., matching BOTH title and author) and custom action scripting.
