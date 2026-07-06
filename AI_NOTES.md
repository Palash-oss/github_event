# AI Notes — GitHub Automation Bot

## Tools and Collaboration
* **Tools**: We used Next.js 14, Auth.js (GitHub Provider), Prisma ORM, Neon Postgres, Octokit REST/Webhooks, and Slack Block Kit.
* **Work Split**: The AI coding assistant structured the technical designs, implemented the client-safe components, refactored database query scopes, and integrated the Slack and GitHub API actions. The user managed Vercel deployments, configured environment variables, updated GitHub Developer applications, and verified live webhook behaviors.

---

## Key Architecture & Design Decisions
1. **JWT Sessions for Auth**: Handled authentication state using server-side JWT sessions. This avoided extra database queries and simplified token extraction for database-linked operations.
2. **Webhook Idempotency**: Verified and persisted the `deliveryId` of incoming webhooks with database-level uniqueness constraints to completely eliminate race conditions and double-delivery triggers.
3. **Background Retries & Sweeps**: Implemented individual try-catch error boundaries for external API actions (Slack messages, GitHub comments/labels). Failed actions are saved as `failed` inside `ActionLog` and can be retried securely via `/api/retry-sweep` instead of blocking the main webhook response.
4. **Lightweight Polling for Live Feed**: Polled a dedicated `/api/events` endpoint every 4 seconds on the client rather than deploying WebSockets. This keeps hosting serverless-friendly, eliminates socket connections overhead, and delivers a dynamic, live feel.

---

## Hardest Bug & Resolution
* **The Silent Client Component Crash**:
  * **Symptom**: The dashboard's bottom panels (Recent Events & Rules snapshot) suddenly disappeared and became entirely blank.
  * **Cause**: The client component (`RecentEventsList`) imported a utility function (`getEventSummary`) directly from a server-side module (`src/server/rules.ts`) containing server-only functions. Next.js silently failed to bundle the server dependencies, causing the client render tree to fail hydration and disappear.
  * **Resolution**: Moved the event details parsing logic into a shared helper `src/lib/event-utils.ts` with zero server-side imports, resolving the silent crash across the dashboard.

---

## Key Understandings and Learnings
1. **Server/Client Bundle Boundaries**: Understood how strictly Next.js isolates server modules. Client components must never import modules importing server code (Prisma/Auth) even if the imported function itself is database-free.
2. **Serverless Database Auto-Suspension**: Learned that serverless Postgres (Neon) auto-suspends inactive databases, causing initial query connection resets (`SqlState E57P01`). Appending `connect_timeout=30` makes the Prisma client resilient to cold-start wakeups.
3. **Slack Bidirectional Hook Loops**: Learned that Slack interactive messages require signature verification (`x-slack-signature` using HMAC SHA-256) on interactive callback routes to prevent security spoofing when taking actions on GitHub.
4. **Pagination for Large Accounts**: Handling API outputs from services like GitHub requires default truncation (showing only 5 items with "Show more") and pagination (`octokit.paginate()`) to support users with hundreds of repositories without breaking layouts.
