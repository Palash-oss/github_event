# GitHub Automation Bot

Production-shaped GitHub automation bot built with Next.js 14, Auth.js, Prisma, Octokit, Slack notifications, and a retry sweep for failed downstream actions.

## What it does

- GitHub OAuth sign-in with server-side session checks.
- Repo connect flow that creates a GitHub webhook per repo.
- Webhook ingestion with `deliveryId` idempotency and signature verification.
- Rule-driven actions for labels, comments, and Slack notifications.
- Retry sweep for failed action logs.
- Dashboard pages for connected repos and action logs.

## Local setup

1. Copy `.env.example` to `.env.local`.
2. Fill in `DATABASE_URL`, GitHub OAuth values, `NEXTAUTH_SECRET`, `APP_URL`, and `SLACK_WEBHOOK_URL`.
3. Install dependencies with `npm install`.
4. Run `npm run prisma:generate` and `npm run prisma:migrate`.
5. Start the app with `npm run dev`.

Prisma commands are wrapped so they automatically load `.env.local` from the project root.

## Environment variables

- `NEXTAUTH_URL` - public app URL for Auth.js.
- `NEXTAUTH_SECRET` - Auth.js secret.
- `APP_URL` - public app URL used to build webhook callbacks.
- `DATABASE_URL` - Postgres connection string.
- `GITHUB_CLIENT_ID` - GitHub OAuth App client ID.
- `GITHUB_CLIENT_SECRET` - GitHub OAuth App client secret.
- `SLACK_WEBHOOK_URL` - Slack incoming webhook URL.
- `CRON_SECRET` - optional fallback secret for retry sweep requests.

## Deployment order

1. Create Neon Postgres and set `DATABASE_URL`.
2. Create the GitHub OAuth App and set callback URLs to the deployed Vercel domain plus `/api/auth/callback/github`.
3. Deploy to Vercel and set `APP_URL` and Auth env vars there.
4. Add the Slack incoming webhook URL in Vercel environment variables.

## Notes

- `CLAUDE.md` is preserved in the repo as the build prompt used for this project.
- The hardcoded bug rule is present as a fallback until configurable rules are added.
- The codebase now uses `src/app` for routes and pages, and `src/server` for backend logic and shared server helpers.
