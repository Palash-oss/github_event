# GitHub Automation Bot — Master Build Prompt

> **How to use this file:** Paste the entire thing as your first message to Claude Code
> (or drop it in the repo root as `CLAUDE.md` and start Claude Code inside the repo — it
> auto-reads it). Keep it in your final submission unmodified — it *is* one of the
> required deliverables ("your AI context/instruction files, exactly as you used them").
>
> Work in the phases below **in order**, and actually run/click/test after each phase.
> You need real bugs and real decisions to write an honest `AI_NOTES.md` — if you just
> let the agent run to the end unsupervised, you'll have nothing true to say about the
> "hardest bug" section, and that's the part they read most closely.

---

## 0. Role and ground rules for the AI agent

You are acting as a senior full-stack engineer pairing with me to build and deploy a
**production-shaped** (not toy) GitHub automation bot for a take-home assignment. Read
this whole file before writing code. Rules:

1. **Never invent secrets.** When you need a GitHub OAuth Client ID/Secret, a webhook
   signing secret, a Slack Incoming Webhook URL, a database connection string, or an AI
   API key, **stop and ask me** for it, or ask me to generate it and paste it into
   `.env.local`. Never hardcode a plausible-looking placeholder and pretend it's real.
2. **Never commit secrets.** Everything sensitive goes in `.env.local` (gitignored) with
   a matching entry in `.env.example` set to an empty/placeholder value.
3. **Work in small, testable increments.** After each phase below, tell me exactly what
   to click/run/curl to verify it actually works before moving on. Don't silently batch
   five phases together.
4. **Prefer boring and correct over clever.** This will be graded on reliability under
   unhappy paths (duplicate webhooks, downstream failures, forged requests), not on
   architectural sophistication.
5. **Everything must run on free tiers with no credit card anywhere.** If a step seems to
   require billing info, stop and flag it — don't proceed.
6. **Explain non-obvious decisions in 1-2 sentences as you make them** so I can restate
   them in my own words later for `AI_NOTES.md`. I need to actually understand this repo,
   not just own it on paper.

---

## 1. Locked-in tech stack (don't relitigate this — pick these and move)

| Concern | Choice | Why |
|---|---|---|
| Framework | **Next.js 14 (App Router) + TypeScript** | One deployable app for front end, API routes, and webhook endpoint. Free-tier friendly on Vercel. |
| Auth | **Auth.js (NextAuth) with GitHub provider** | Handles OAuth + session cookies correctly out of the box; avoids hand-rolled CSRF bugs. |
| Database | **Postgres via Neon (free, no card) + Prisma ORM** | Prisma gives migrations + type safety; Neon's free tier is generous and serverless-friendly. |
| GitHub API | **Octokit (`@octokit/rest`, `@octokit/webhooks`)** | Official SDK; `@octokit/webhooks` has built-in signature verification. |
| Notifications | **Slack Incoming Webhook URL** | Zero OAuth complexity for the core requirement. (Telegram BotFather as an optional second channel if time allows.) |
| Hosting | **Vercel (free tier)** | Public HTTPS URL immediately, trivial env var management, has Cron for the retry sweeper. |
| AI stretch | **Groq API (free tier, no card)**, Llama 3.1/3.3 8B or similar | Fast, generous free limits, simple REST call. Gemini via AI Studio is an equally fine substitute. |

If you (the agent) think a substitution is truly warranted, say so explicitly and ask —
don't silently swap something.

---

## 2. Data model (start here — put this in `prisma/schema.prisma`)

```prisma
model User {
  id            String   @id @default(cuid())
  githubId      String   @unique
  username      String
  accessToken   String   // GitHub OAuth token, repo scope — never log this, never send to client
  createdAt     DateTime @default(now())
  repos         Repo[]
}

model Repo {
  id            String   @id @default(cuid())
  userId        String
  user          User     @relation(fields: [userId], references: [id])
  owner         String
  name          String
  webhookId     Int?     // GitHub's webhook ID, so we can manage/delete it later
  webhookSecret String   // per-repo random secret, used to verify signatures
  active        Boolean  @default(true)
  rules         Rule[]
  events        Event[]
  @@unique([userId, owner, name])
}

model Rule {
  id          String   @id @default(cuid())
  repoId      String
  repo        Repo     @relation(fields: [repoId], references: [id])
  eventType   String   // "issues", "pull_request"
  matchField  String   // "title", "body", "author"
  matchType   String   // "contains", "equals"
  matchValue  String
  actionLabel String?  // GitHub label to add
  actionComment String? // comment body template
  notifySlack Boolean  @default(true)
  createdAt   DateTime @default(now())
}

model Event {
  id          String   @id @default(cuid())
  deliveryId  String   @unique // GitHub's X-GitHub-Delivery header — THE idempotency key
  repoId      String
  repo        Repo     @relation(fields: [repoId], references: [id])
  eventType   String
  action      String?  // "opened", "closed", etc from payload
  payload     Json
  receivedAt  DateTime @default(now())
  actions     ActionLog[]
}

model ActionLog {
  id         String   @id @default(cuid())
  eventId    String
  event      Event    @relation(fields: [eventId], references: [id])
  actionType String   // "github_label", "github_comment", "slack_notify"
  status     String   // "success", "failed", "retrying"
  attempts   Int      @default(1)
  error      String?
  createdAt  DateTime @default(now())
}
```

This schema alone encodes most of the "quality bar": `deliveryId @unique` is your
replay/duplicate defense, and `ActionLog` is your observability + retry ledger.

---

## 3. Build phases (work in this order; each ends with a manual test)

### Phase 0 — Skeleton & deploy (~2-4h)
- `npx create-next-app` with TypeScript, App Router.
- Prisma + Neon connected; `prisma migrate dev` runs clean.
- Push to a new GitHub repo, connect to Vercel, confirm a public URL loads a placeholder page.
- **Test:** the deployed URL is reachable and shows something. Do this before any real feature — a working deploy pipeline on day one saves you from a last-hour scramble.

### Phase 1 — GitHub OAuth + dashboard shell (~4-6h)
- Register a GitHub OAuth App (ask me for the callback URL confirmation — it must be the **Vercel URL**, not localhost, once deployed; for local dev you'll want a second OAuth app or use a tunnel).
- Auth.js GitHub provider; store `githubId`, `username`, `accessToken` on first sign-in.
- `/dashboard` route, redirect-to-login if unauthenticated.
- List the signed-in user's repos (`GET /user/repos` via Octokit) with a "Connect" button.
- **Test:** sign in with a real GitHub account, see your own repo list.

### Phase 2 — Webhook wiring (~6-10h)
- On "Connect repo": generate a random per-repo `webhookSecret`, call Octokit to create a
  webhook on that repo (`POST /repos/{owner}/{repo}/hooks`) pointed at
  `https://<your-domain>/api/webhooks/github`, subscribed to at least `issues` and
  `pull_request`. Store `webhookId` + secret in the `Repo` row.
- Build `/api/webhooks/github`:
  1. Verify `X-Hub-Signature-256` against the repo's stored secret using a timing-safe
     HMAC compare. Reject (401) anything that doesn't match — **this is your forged-request defense.**
  2. Read `X-GitHub-Delivery` and try to insert an `Event` row with that as the unique
     `deliveryId`. If it already exists, return 200 immediately and do nothing else —
     **this is your duplicate-delivery defense.**
  3. Respond 200 fast, then process the event (see Phase 3).
- **Test:** use GitHub's "Redeliver" button on a webhook to confirm redelivery is a no-op, and hand-edit a request with a wrong signature (or just change one byte) to confirm it's rejected.

### Phase 3 — Bot actions (~4-6h)
- Start with one hardcoded rule ("if issue title contains `bug`, add label `bug` +
  Slack-notify") to get the pipeline proven, then wire it to the `Rule` table.
- GitHub write-back: Octokit `issues.addLabels` or `issues.createComment`.
- Slack: `fetch()` a POST to the Incoming Webhook URL with a short message.
- Every action attempt writes an `ActionLog` row (`success`/`failed` + error message).
- **Test:** open a real issue with "bug" in the title on your connected repo, watch the label appear and a Slack message land within seconds.

### Phase 4 — Reliability hardening (~4-6h)
- Wrap each downstream call (GitHub write, Slack post) in try/catch; on failure, log
  `ActionLog.status = "failed"` with the error, don't crash the request.
- Add a Vercel Cron job (e.g. every 5 min) hitting `/api/retry-sweep`: find `ActionLog`
  rows with `status = "failed"` and `attempts < 5`, retry them, increment `attempts`,
  use simple exponential backoff based on `attempts`.
- **Test:** temporarily break your Slack URL (typo it), trigger an event, confirm it
  logs a failure instead of losing the event, fix the URL, confirm the cron sweep
  eventually delivers it.

### Phase 5 — Stretch goals (remaining time, pick based on what's left)
Roughly in order of effort-to-payoff:
1. **Configurable rules UI** — simple form on the dashboard to create/edit `Rule` rows (match field/type/value, label, Slack toggle). This is the highest-value stretch goal since it's explicitly called out.
2. **AI triage** — on event ingest, call Groq with the issue/PR title+body, prompt it to return JSON `{summary, suggestedLabel, priority}`, show that in the dashboard and Slack message. Keep the prompt strict about JSON-only output and wrap the parse in try/catch.
3. **GitHub App instead of OAuth App** — JWT signed with a private key, exchanged for installation tokens. Bigger lift; only attempt if Phases 0-4 are solid and tested.
4. **Multi-repo support** — mostly already there if `Repo` is per-user from the start; make sure the dashboard actually lets you connect a second repo and filters events per repo.
5. **Observability page** — a `/dashboard/logs` view of `ActionLog` failures/retries over time.

### Phase 6 — Docs & submission (~2-3h)
- `README.md`: what it does, local setup, full env var list, `.env.example`, exactly how you deployed (Vercel project + Neon + GitHub OAuth app + Slack app, in that order).
- `AI_NOTES.md` (~1 page): tools used, 2-3 decisions you made yourself and why, the hardest bug the AI caused and how you caught/fixed it, what you'd add with more time, optionally one short illuminating prompt excerpt.
- Confirm `CLAUDE.md` (this file, as actually used/edited) is committed.
- Re-verify the live URL end-to-end one final time, ideally from a fresh browser/incognito session, including sign-in.

---

## 4. Security checklist (go through this explicitly before calling it done)

- [ ] Webhook signature verified with timing-safe compare, on every request, before any DB write.
- [ ] `deliveryId` uniqueness enforced at the DB level (not just checked in application code — race conditions between concurrent redeliveries are real).
- [ ] No secret (OAuth client secret, webhook secret, Slack URL, AI API key, DB connection string) appears in: committed files, client-side bundles, or log output.
- [ ] Dashboard routes actually check session server-side, not just hide UI client-side.
- [ ] `.env.example` has every variable name your app needs, with empty/dummy values.

## 5. Deliverables checklist (map back to the assignment doc)

- [ ] Public deployed URL, works when opened cold.
- [ ] GitHub sign-in + repo connect.
- [ ] Webhook endpoint handling ≥2 event types, recorded in DB.
- [ ] At least one write-back action (label or comment).
- [ ] Slack notification on configured events.
- [ ] Dashboard behind login showing event log + actions taken.
- [ ] `README.md`, `.env.example`, `AI_NOTES.md`, `CLAUDE.md` (this file) all in the repo.
- [ ] Demo repo / test instructions for the reviewer.

---

**Agent: start at Phase 0 now.** Ask me for anything you need (GitHub OAuth credentials,
Neon connection string, Slack webhook URL, Groq API key if we get to the AI stretch)
rather than guessing. Confirm each phase works before starting the next.
