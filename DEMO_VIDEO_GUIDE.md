# Demo Video Recording Guide & Script

Use this step-by-step script to record a premium 3-5 minute walkthrough video of your GitHub Automation Bot project.

---

## 🛠️ Video Prep Checklist
1. **Resolution**: Record at 1080p, full screen.
2. **Setup Tabs**: Have the following tabs open in your browser:
   * **Tab 1**: Your deployed Vercel Dashboard (`https://github-event-bztr3.vercel.app/dashboard`)
   * **Tab 2**: Your test GitHub repository (`Palash-oss/DLRL`)
   * **Tab 3**: Your Slack channel (where notifications are sent)
3. **Pre-created Rules**: Clean up any old rules or connected repos so you start with a clean slate (or just one connected repo).

---

## 🎙️ Video Script & Scene Guide

### Part 1: Intro & Dashboard Shell (0:00 - 0:45)
* **Visual**: Show the home page / sign-in screen, then click "Sign in with GitHub" to log in. Show the Dashboard.
* **Script**:
  > *"Hi everyone, today I'm going to demonstrate my GitHub Automation Bot. It's a web application built using Next.js, Prisma ORM, Neon serverless Postgres, and Auth.js.*
  >
  > *Once signed in securely via GitHub OAuth, we land on this fully responsive dashboard. Here you can see my connected repositories on the right, and the available repositories from my GitHub account on the left.*
  >
  > *To keep the list clean for users with many repositories, we have built-in pagination. You can toggle 'Show more' to see all repositories, or collapse them back, keeping the layout clean and organized."*

---

### Part 2: Configuring a Rule (0:45 - 1:45)
* **Visual**: Scroll down to the **Rules snapshot** section. Start filling out the form.
* **Script**:
  > *"Let's set up a new automation rule. Under the Rules Snapshot panel, we can select any of our connected repositories. We support matching rules for Issues, Pull Requests, and Push events.*
  >
  > *For issues, we can match on the Title, Body, Author, or even the Action type (like when an issue is closed, opened, or labeled). Let's select 'issues', set the match field to 'title', match type to 'contains', and value to 'bug'.*
  >
  > *For actions, we'll auto-tag the issue on GitHub with the label 'bug', post a comment that says 'Auto-tagged as bug! Thanks @{{author}}', and check 'Notify Slack'.*
  >
  > *Watch the save button as I click it — it uses asynchronous fetch with live feedback, showing saving state and a success banner before auto-refreshing the dashboard to update our rules list."*

---

### Part 3: Live Webhook & Real-Time Feed (1:45 - 3:00)
* **Visual**: 
  1. Go to GitHub (`Palash-oss/DLRL/issues/new`).
  2. Create an issue titled: `bug: dashboard layout issue`. Submit it.
  3. **Crucial**: Switch back to the Vercel Dashboard tab immediately and wait.
* **Script**:
  > *"Now let's test this in real-time. I'll head over to my test repository on GitHub and open a new issue titled 'bug: dashboard layout issue'.*
  >
  > *Once I submit it, GitHub sends a webhook to our serverless endpoint. On the dashboard, we have a background polling engine running. Without reloading the page, watch the Recent Events feed..."* 
  > *(Wait 2-4 seconds for the card to slide in)*
  > *"...and there it is! The event was captured, showing the repo name, issue title, author, and actions count.*
  >
  > *If we go back to the GitHub issue page, we can see the bot has already automatically applied the 'bug' label and commented on our behalf in under 3 seconds! And if we check Slack, our Block Kit message with interactive buttons has arrived."*

---

### Part 4: Interactive Logs & Action Deep-Dive (3:00 - 4:00)
* **Visual**: Click "Open Logs Archive" or navigate to `/dashboard/logs`. Expand the issue event we just created, then expand an older event with no matched rules.
* **Script**:
  > *"Finally, let's look at the Logs Archive. This page shows our complete webhook history. If we expand our newly triggered issue event, we can see a beautiful breakdown of the automation actions that were executed: the GitHub label write, the comment post, and the Slack notification, complete with status and retry attempts.*
  >
  > *If an incoming event doesn't match any rules—like this ping event here—the system shows a clean 'No automation triggered' card, giving helpful tips to developers on how to configure a matching rule to handle it.*
  >
  > *Everything is fully responsive and behaves perfectly across mobile and desktop. Thanks for watching!"*
