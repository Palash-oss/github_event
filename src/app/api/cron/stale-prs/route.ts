import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/server/prisma";
import { addIssueComment, addIssueLabels, createOctokit } from "@/server/github";
import { sendSlackMessage } from "@/server/slack";

export async function GET(req: NextRequest) {
  // Verify Vercel Cron Authorization header in production if CRON_SECRET is set
  const authHeader = req.headers.get("authorization");
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized cron request" }, { status: 401 });
  }

  const STALE_DAYS = 7;
  const now = new Date();
  const cutoff = new Date(now.getTime() - STALE_DAYS * 24 * 60 * 60 * 1000);

  const activeRepos = await prisma.repo.findMany({
    where: { active: true },
    include: {
      user: true,
      rules: { where: { disabled: false } }
    }
  });

  let processedCount = 0;
  let stalePRsFound = 0;

  for (const repo of activeRepos) {
    if (!repo.user.accessToken) continue;

    try {
      const octokit = createOctokit(repo.user.accessToken);
      const { data: pullRequests } = await octokit.pulls.list({
        owner: repo.owner,
        repo: repo.name,
        state: "open",
        per_page: 100
      });

      processedCount += pullRequests.length;

      for (const pr of pullRequests) {
        const updatedAt = new Date(pr.updated_at);
        if (updatedAt < cutoff) {
          stalePRsFound++;

          // Check if repo has an active stale_pr rule or use default
          const staleRule = repo.rules.find((r) => r.actionLabel === "stale-pr" || r.matchValue === "stale");

          // 1. Post GitHub reminder comment
          try {
            await addIssueComment({
              accessToken: repo.user.accessToken,
              owner: repo.owner,
              repo: repo.name,
              issueNumber: pr.number,
              body: staleRule?.actionComment ?? `Reminder: Pull request #${pr.number} ("${pr.title}") has been open with no activity for over ${STALE_DAYS} days. Please review or update.`
            });
          } catch (e: any) {
            console.warn(`Failed to post stale PR comment on ${repo.owner}/${repo.name}#${pr.number}:`, e.message);
          }

          // 2. Add stale label
          try {
            await addIssueLabels({
              accessToken: repo.user.accessToken,
              owner: repo.owner,
              repo: repo.name,
              issueNumber: pr.number,
              labels: [staleRule?.actionLabel ?? "stale-pr"]
            });
          } catch (e: any) {
            console.warn(`Failed to add stale label on ${repo.owner}/${repo.name}#${pr.number}:`, e.message);
          }

          // 3. Send Slack notification
          if (staleRule?.notifySlack !== false) {
            try {
              await sendSlackMessage(`Stale PR Warning: <${pr.html_url}|#${pr.number} ${pr.title}> in ${repo.owner}/${repo.name} has had no activity for over ${STALE_DAYS} days.`);
            } catch (e: any) {
              console.warn(`Failed to send Slack alert for stale PR:`, e.message);
            }
          }
        }
      }
    } catch (err: any) {
      console.error(`Error processing stale PR cron for ${repo.owner}/${repo.name}:`, err.message);
    }
  }

  return NextResponse.json({
    success: true,
    reposChecked: activeRepos.length,
    prsProcessed: processedCount,
    stalePRsFound
  });
}
