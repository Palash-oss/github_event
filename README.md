# GitHub Automation Bot SaaS

A production-grade, multi-tenant SaaS application that automates repository workflows, issue triage, code change auditing, and team notifications. Built with **Next.js 14 (App Router)**, **Auth.js**, **Prisma ORM**, **Neon Serverless Postgres**, **Stripe Subscription Billing**, **Octokit REST/Webhooks**, and **Slack Block Kit**.

---

## Key Features & Architecture

### 1. Multi-Tenant GitHub OAuth & Webhook Security
* **Authentication**: Secure sign-in via GitHub OAuth with token persistence.
* **Automated Webhooks**: Dynamically registers HMAC-signed webhooks on connected repositories.
* **Cryptographic Verification**: Validates every incoming payload using `x-hub-signature-256` with constant-time signature comparison (`crypto.timingSafeEqual`) to prevent spoofing.

### 2. Powerful Rules & Triage Engine
* **Flexible Matching**: Match events by `title`, `body`, `author`, `action`, `branch`, or custom patterns.
* **Diff-Aware Rules (`changed_files_match`)**: Inspects PR file changes to trigger rules when sensitive paths (e.g. `auth/`, `payments/`, `package.json`) are modified.
* **Multichannel Actions**: Automatically apply GitHub labels, post comments, and send notifications to Slack, Discord, or Telegram.

### 3. Stripe Subscription Billing & Feature Gating
* **Two-Tier Model**:
  * **Free Tier**: 1 connected repository, standard text-matching rules.
  * **Pro Tier ($19/mo)**: Unlimited connected repositories, advanced diff rules (`changed_files_match`), AI Triage, and cron automation.
* **Self-Serve Portals**: Integrated **Stripe Checkout** for upgrades and **Stripe Customer Portal** for plan management.
* **Graceful Downgrades**: Automatically pauses extra repositories and sets Pro rules to `disabled: true` upon subscription cancellation without deleting user data.

### 4. 1-Click Pre-Built Rule Templates & Vercel Cron
* **Dependency Alert**: Notifies when dependency files (`package.json`, `requirements.txt`, etc.) are modified.
* **Sensitive Path Review**: Flags PRs touching core authentication or payment modules.
* **Stale PR Sweeper**: Background Vercel Cron job (`/api/cron/stale-prs`) that runs daily to identify PRs inactive for 7+ days.

### 5. Real-Time Observability & Interactive Slack Integration
* **Live SSE & Polling Dashboard**: Real-time event stream (`/api/events/stream`) backed by fallback polling to display incoming webhooks without page reloads.
* **Interactive 2-Way Slack Cards**: Slack Block Kit notifications feature interactive buttons (e.g., *Close Issue*, *View on GitHub*) that route actions back to GitHub.
* **Operational Analytics**: Comprehensive health metrics, action success rates, and priority breakdown graphs.

---

## Local Development Setup

### 1. Clone & Install
```bash
npm install
```

### 2. Configure Environment Variables
Copy `.env.example` to `.env.local` and configure the required keys:

```env
# App & Auth
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your_nextauth_secret_here
APP_URL=http://localhost:3000

# Database (Neon / Postgres)
DATABASE_URL=postgresql://user:password@localhost:5432/dbname?schema=public

# GitHub OAuth
GITHUB_CLIENT_ID=your_github_client_id
GITHUB_CLIENT_SECRET=your_github_client_secret

# Stripe Billing
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_PRO_PRICE_ID=price_...

# Notifications & Automation
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/...
CRON_SECRET=your_cron_secret_here
```

### 3. Database Migration
```bash
npx prisma generate
npx prisma db push
```

### 4. Start Development Server
```bash
npm run dev
```

---

## Production Deployment (Vercel)

* **Deployment Host**: Deployed on **Vercel** (`https://github-event-b3z3.vercel.app`).
* **Database**: Hosted on **Neon Serverless Postgres** (`connect_timeout=30` enabled for cold-start resilience).
* **OAuth Callback URLs**:
  * Production: `https://github-event-b3z3.vercel.app/api/auth/callback/github`
  * Local: `http://localhost:3000/api/auth/callback/github`

---

## Testing & Verification

Run the full automated test suite (Unit, Integration, and Billing tests):

```bash
# Run Vitest test suite
npm run test

# Run TypeScript compilation check
npx tsc --noEmit
```

For step-by-step manual testing instructions for Stripe Test Mode and Webhooks, refer to the [walkthrough documentation](file:///C:/Users/Palash/.gemini/antigravity-ide/brain/62523120-4f42-4b77-b115-689a755a90ef/walkthrough.md).

---

## Architecture & Engineering Notes

* **CLAUDE.md**: Developer commands and build guidelines.
* **AI_NOTES.md**: Key architectural decisions, tenant isolation models, and performance optimizations.
