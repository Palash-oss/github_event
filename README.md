# GitHub Automation Bot 🤖

A production-grade, highly responsive GitHub automation bot built with **Next.js 14 (App Router)**, **Auth.js**, **Prisma ORM**, **Neon serverless Postgres**, **Octokit REST/Webhooks**, and **Slack Block Kit**.

---

## 🚀 Key Features

1. **GitHub OAuth & Repository Connector**: Secure sign-in. Automatically sets up webhooks (`issues`, `pull_request`, `push` events) with custom secret signatures on your repositories.
2. **Dynamic Rules Engine**: Configure custom rules on your dashboard:
   * **Issues/PRs**: Match on title, body, author, or event action (e.g., `opened`, `closed`, `labeled`). Triggers auto-tagging labels, posting comments, and Slack messages.
   * **Push Events**: Match on commit message, target branch (ref), or committer username. Triggers Slack notifications.
3. **Interactive Slack Block Kit Messages**: Slack notifications are styled as visually premium cards with contextual buttons (*Close Issue*, *View on GitHub*, *View Repository*) that handle live click events and perform actions back on GitHub.
4. **Real-Time Live Dashboard**: A Client Component that polls the database every 4 seconds to instantly slide in new incoming webhook deliveries and their status without reloading the page.
5. **Smart Repos Panel**: Automatically handles large accounts with a compact view (5 items by default), custom pagination toggles, private/public badges, and total repo count dynamically fetched from GitHub.
6. **Detailed Delivery Logs**: Collapsible log cards detail exactly what occurred, separating successful actions, retry sweeps, errors, and displaying a helpful placeholder for events with no matching rules.

---

## 🛠️ Local Setup

1. **Clone & Install**:
   ```bash
   npm install
   ```

2. **Configure Environment**:
   Copy `.env.example` to `.env.local` and fill in:
   ```env
   NEXTAUTH_URL=http://localhost:3000
   NEXTAUTH_SECRET=your_nextauth_secret
   APP_URL=http://localhost:3000
   DATABASE_URL=postgresql://your_db_credentials
   GITHUB_CLIENT_ID=your_github_client_id
   GITHUB_CLIENT_SECRET=your_github_client_secret
   SLACK_WEBHOOK_URL=your_slack_webhook_url
   CRON_SECRET=your_cron_secret
   ```

3. **Database Migration**:
   ```bash
   npm run prisma:generate
   # Apply migrations to your Postgres instance
   npx prisma db push
   ```

4. **Start Dev Server**:
   ```bash
   npm run dev
   ```

---

## 📦 Deployment

* **Hosting**: Deployed on **Vercel** (`https://github-event-bztr3.vercel.app`).
* **Database**: Hosted on **Neon Serverless Postgres** with auto-suspend protection (`connect_timeout=30` added to prevent cold-start disconnect warnings).
* **GitHub OAuth App**: Configured on GitHub Developer Settings with homepage and authorization callback pointing to:
  * Deployed: `https://github-event-bztr3.vercel.app/api/auth/callback/github`
  * Local: `http://localhost:3000/api/auth/callback/github`

---

## 🧪 How to Test It

For full testing instructions and a demo walkthrough script, please refer to the auto-generated **DEMO_VIDEO_GUIDE.md** in the project root.

1. **Login**: Go to your deployment or localhost, click **Sign in with GitHub**.
2. **Connect**: Connect a repository (e.g., `Palash-oss/DLRL`). The bot will register the webhook.
3. **Create Rule**: In the dashboard, configure a rule matching `issues` when the `title` contains `bug`. Set the action label to `bug` and write an action comment.
4. **Trigger**: Go to your GitHub repository and open a new issue with "bug" in the title.
5. **Verify**:
   * Watch the live dashboard feed slide in the new delivery.
   * Verify the label `bug` and your comment are auto-applied on GitHub within 3 seconds.
   * Check your Slack channel for the interactive block card.

---

## 🤖 AI Context & Instruction Files

* **CLAUDE.md**: Build instructions, commands, and rules used to guide the pair-programming assistant.
* **AI_NOTES.md**: Key architectural decisions, hard bugs solved (such as solving silent client-side component crashes from importing server modules), and future roadmap.
* *Note: No `.cursorrules` or `AGENTS.md` configurations were used during development.*
