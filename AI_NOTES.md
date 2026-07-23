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

## Hardest Bug & Resolution
* **Timing & Webhook Activation Gap**: The user reported that a commit push and an issue they created did not show up in the logs. After querying the database records and GitHub API webhook delivery logs, we discovered that both events occurred *minutes before* the user finished connecting their repository (which creates the webhook). We resolved this by explaining that webhooks are not retroactive and that the user needed to trigger a new event.
* **Empty Logs Archive & UI Container Breakouts**: The logs archive page was originally only loading `ActionLog` entries, meaning if webhooks didn't match any active rules, the archive page looked completely blank/broken. Additionally, when raw JSON payloads were expanded, they broke out of their responsive flex column boxes on the dashboard. We fixed this by rewriting the logs archive to load all webhook `Event` entries (displaying them as collapsible cards) and restricting text wrapping and overflow-x scroll boundaries on code blocks.

## Future Improvements
* **WebSocket Live Stream**: Use WebSockets or Server-Sent Events (SSE) to push new webhook deliveries to the dashboard instantly without manual page refreshes.
* **Granular Rules Editor**: Support advanced rule conjunctions (e.g., matching BOTH title and author) and custom action scripting.
