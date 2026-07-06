export async function sendSlackMessage(payload: string | { text: string; blocks?: any[] }) {
  const webhookUrl = process.env.SLACK_WEBHOOK_URL;
  if (!webhookUrl) {
    throw new Error("Missing SLACK_WEBHOOK_URL");
  }

  const body = typeof payload === "string" ? { text: payload } : payload;

  const response = await fetch(webhookUrl, {
    method: "POST",
    headers: {
      "content-type": "application/json"
    },
    body: JSON.stringify(body)
  });

  if (!response.ok) {
    throw new Error(`Slack webhook failed with ${response.status}`);
  }
}

export function buildSlackBlockKitMessage(
  owner: string,
  repo: string,
  eventType: string,
  payload: any
): { text: string; blocks: any[] } {
  const repoFullName = `${owner}/${repo}`;
  let fallbackText = `GitHub ${eventType} event for ${repoFullName}`;
  const blocks: any[] = [];

  if (eventType === "push") {
    const branch = payload.ref ? payload.ref.replace("refs/heads/", "") : "unknown";
    const commitMsg = payload.head_commit?.message?.split("\n")[0] ?? payload.commits?.[0]?.message?.split("\n")[0] ?? "No commit message";
    const author = payload.pusher?.name ?? payload.head_commit?.author?.username ?? "unknown";
    const repoUrl = payload.repository?.htmlUrl ?? `https://github.com/${owner}/${repo}`;

    fallbackText = `[Push] ${author} pushed to ${branch} on ${repoFullName}: "${commitMsg}"`;

    blocks.push(
      {
        type: "header",
        text: {
          type: "plain_text",
          text: `🚀 New Push to ${repoFullName}`,
          emoji: true
        }
      },
      {
        type: "section",
        fields: [
          { type: "mrkdwn", text: `*Branch:*\n\`${branch}\`` },
          { type: "mrkdwn", text: `*Committer:*\n${author}` }
        ]
      },
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: `*Latest Commit Message:*\n${commitMsg}`
        }
      },
      {
        type: "actions",
        elements: [
          {
            type: "button",
            text: {
              type: "plain_text",
              text: "View Repository",
              emoji: true
            },
            url: repoUrl,
            action_id: "view_repo"
          }
        ]
      }
    );
  } else if (eventType === "issues") {
    const action = payload.action ?? "updated";
    const title = payload.issue?.title ?? "No title";
    const number = payload.issue?.number ?? "unknown";
    const author = payload.issue?.user?.login ?? "unknown";
    const htmlUrl = payload.issue?.html_url ?? `https://github.com/${owner}/${repo}/issues`;

    fallbackText = `[Issue #${number} ${action}] ${title} by ${author} in ${repoFullName}`;

    blocks.push(
      {
        type: "header",
        text: {
          type: "plain_text",
          text: `⚠️ Issue ${action.charAt(0).toUpperCase() + action.slice(1)}`,
          emoji: true
        }
      },
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: `*Repository:* ${repoFullName}\n*Issue:* <${htmlUrl}|#${number} ${title}>\n*Author:* ${author}`
        }
      }
    );

    // Add interactive buttons if issue is opened or reopened
    if (action === "opened" || action === "reopened") {
      blocks.push({
        type: "actions",
        elements: [
          {
            type: "button",
            text: {
              type: "plain_text",
              text: "View on GitHub",
              emoji: true
            },
            url: htmlUrl,
            action_id: "view_issue_github"
          },
          {
            type: "button",
            text: {
              type: "plain_text",
              text: "Close Issue",
              emoji: true
            },
            style: "danger",
            action_id: "close_issue",
            value: `${owner}|${repo}|${number}`
          }
        ]
      });
    }
  } else if (eventType === "pull_request") {
    const action = payload.action ?? "updated";
    const title = payload.pull_request?.title ?? "No title";
    const number = payload.pull_request?.number ?? "unknown";
    const author = payload.pull_request?.user?.login ?? "unknown";
    const htmlUrl = payload.pull_request?.html_url ?? `https://github.com/${owner}/${repo}/pulls`;
    const sourceBranch = payload.pull_request?.head?.ref ?? "unknown";
    const targetBranch = payload.pull_request?.base?.ref ?? "unknown";

    fallbackText = `[PR #${number} ${action}] ${title} by ${author} in ${repoFullName}`;

    blocks.push(
      {
        type: "header",
        text: {
          type: "plain_text",
          text: `🔀 Pull Request ${action.charAt(0).toUpperCase() + action.slice(1)}`,
          emoji: true
        }
      },
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: `*Repository:* ${repoFullName}\n*PR:* <${htmlUrl}|#${number} ${title}>\n*Author:* ${author}\n*Merge:* \`${sourceBranch}\` ➜ \`${targetBranch}\``
        }
      },
      {
        type: "actions",
        elements: [
          {
            type: "button",
            text: {
              type: "plain_text",
              text: "View Pull Request",
              emoji: true
            },
            url: htmlUrl,
            action_id: "view_pr_github"
          }
        ]
      }
    );
  } else {
    // Fallback for Ping and other events
    fallbackText = `GitHub ${eventType} event for ${repoFullName}`;
    blocks.push({
      type: "section",
      text: {
        type: "mrkdwn",
        text: `📢 *GitHub ${eventType} Event*\nRepository: ${repoFullName}\nAction details: \`${payload.action ?? "None"}\``
      }
    });
  }

  return { text: fallbackText, blocks };
}