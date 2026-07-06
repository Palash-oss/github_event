/**
 * Shared event utility functions — safe to use in both Server and Client Components.
 * Does NOT import any server-only modules (prisma, next-auth, etc.)
 */

export function getEventSummary(eventType: string, rawPayload: unknown): {
  typeLabel: string;
  title: string;
  description: string;
  author: string;
} {
  const payload = (rawPayload as any) ?? {};

  if (eventType === "push") {
    const branch = payload.ref ? payload.ref.replace("refs/heads/", "") : "unknown";
    const commitsCount = payload.commits?.length ?? 0;
    const rawCommitMsg = payload.head_commit?.message ?? payload.commits?.[0]?.message ?? "";
    const commitMsg = rawCommitMsg.split("\n")[0];
    const author = payload.pusher?.name ?? payload.head_commit?.author?.username ?? "unknown";
    let modifiedFiles: string[] = [];
    if (payload.commits) {
      for (const c of payload.commits) {
        if (c.modified) modifiedFiles.push(...c.modified);
        if (c.added) modifiedFiles.push(...c.added);
        if (c.removed) modifiedFiles.push(...c.removed);
      }
    }
    modifiedFiles = Array.from(new Set(modifiedFiles));
    const filesStr = modifiedFiles.length > 0
      ? ` [${modifiedFiles.slice(0, 3).join(", ")}${modifiedFiles.length > 3 ? "..." : ""}]`
      : "";
    return {
      typeLabel: "Push",
      title: commitMsg ? `Push: "${commitMsg}"` : `Push to ${branch}`,
      description: `Pushed ${commitsCount} commit(s) to branch "${branch}"${filesStr}`,
      author
    };
  }

  if (eventType === "issues") {
    const action = payload.action ?? "updated";
    const title = payload.issue?.title ?? "";
    const number = payload.issue?.number ?? "";
    const author = payload.issue?.user?.login ?? payload.sender?.login ?? "unknown";
    return {
      typeLabel: "Issue",
      title: `Issue #${number}: ${title}`,
      description: `Issue was ${action}`,
      author
    };
  }

  if (eventType === "pull_request") {
    const action = payload.action ?? "updated";
    const title = payload.pull_request?.title ?? "";
    const number = payload.pull_request?.number ?? "";
    const author = payload.pull_request?.user?.login ?? payload.sender?.login ?? "unknown";
    return {
      typeLabel: "Pull Request",
      title: `PR #${number}: ${title}`,
      description: `Pull request was ${action}`,
      author
    };
  }

  if (eventType === "ping") {
    const zen = payload.zen ?? "active";
    const author = payload.sender?.login ?? "github";
    return {
      typeLabel: "Ping",
      title: "Webhook Connected",
      description: `GitHub Ping: "${zen}"`,
      author
    };
  }

  return {
    typeLabel: eventType,
    title: `Event: ${eventType}`,
    description: payload.action ? `Action: ${payload.action}` : "Raw webhook received",
    author: payload.sender?.login ?? "unknown"
  };
}
