type RuleShape = {
  eventType: string;
  matchField: string;
  matchType: string;
  matchValue: string;
  actionLabel: string | null;
  actionComment: string | null;
  notifySlack: boolean;
};

type WebhookPayload = {
  action?: string;
  ref?: string;
  zen?: string;
  commits?: Array<{
    message: string;
    author: { name: string; username?: string };
    modified?: string[];
    added?: string[];
    removed?: string[];
  }>;
  head_commit?: {
    message: string;
    author: { username: string; name: string };
  };
  pusher?: { name: string; email: string };
  issue?: {
    title?: string;
    body?: string;
    number?: number;
    user?: { login?: string };
  };
  pull_request?: {
    title?: string;
    body?: string;
    number?: number;
    user?: { login?: string };
  };
  sender?: { login?: string };
  repository?: {
    full_name?: string;
  };
};

export function getPayloadValue(payload: WebhookPayload, field: string): string {
  if (field === "title") return stringValue(payload.issue?.title ?? payload.pull_request?.title);
  if (field === "body") return stringValue(payload.issue?.body ?? payload.pull_request?.body);
  if (field === "author") return stringValue(payload.sender?.login ?? payload.issue?.user?.login ?? payload.pull_request?.user?.login);
  return "";
}

export function matchesRule(rule: RuleShape, eventType: string, payload: WebhookPayload): boolean {
  if (rule.eventType !== eventType) return false;
  const value = getPayloadValue(payload, rule.matchField);
  const comparison = rule.matchType === "equals"
    ? value.trim().toLowerCase() === rule.matchValue.trim().toLowerCase()
    : value.toLowerCase().includes(rule.matchValue.toLowerCase());
  return comparison;
}

export function isBugFallback(eventType: string, payload: WebhookPayload): boolean {
  if (eventType !== "issues") return false;
  return getPayloadValue(payload, "title").toLowerCase().includes("bug");
}

export function renderTemplate(template: string, payload: WebhookPayload) {
  const replacements = {
    title: getPayloadValue(payload, "title"),
    body: getPayloadValue(payload, "body"),
    author: getPayloadValue(payload, "author"),
    repo: stringValue(payload.repository?.full_name),
    action: stringValue(payload.action)
  };

  return template.replace(/\{\{(title|body|author|repo|action)\}\}/g, (_, key: keyof typeof replacements) => replacements[key] || "");
}

export function getActionMessage(owner: string, repo: string, eventType: string, payload: WebhookPayload) {
  const title = getPayloadValue(payload, "title");
  const action = payload.action ?? "updated";
  return `GitHub ${eventType} event for ${owner}/${repo}: ${action}${title ? ` (${title})` : ""}`;
}

function stringValue(value: unknown) {
  return typeof value === "string" ? value : "";
}

export function buildDefaultRule(eventType: string, payload: WebhookPayload) {
  if (!isBugFallback(eventType, payload)) return null;
  return {
    eventType,
    matchField: "title",
    matchType: "contains",
    matchValue: "bug",
    actionLabel: "bug",
    actionComment: null,
    notifySlack: true
  } satisfies RuleShape;
}

export function getEventSummary(eventType: string, rawPayload: unknown): {
  typeLabel: string;
  title: string;
  description: string;
  author: string;
} {
  const payload = (rawPayload as WebhookPayload) ?? {};
  
  if (eventType === "push") {
    const branch = payload.ref ? payload.ref.replace("refs/heads/", "") : "unknown";
    const commitsCount = payload.commits?.length ?? 0;
    const rawCommitMsg = payload.head_commit?.message ?? payload.commits?.[0]?.message ?? "";
    const commitMsg = rawCommitMsg.split("\n")[0]; // Use first line of commit message
    const author = payload.pusher?.name ?? payload.head_commit?.author?.username ?? "unknown";
    
    // Find all modified files across commits
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