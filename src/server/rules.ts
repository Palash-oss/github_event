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
  aiPriority?: string;
  commits?: Array<{
    message?: string;
    author?: { name?: string; username?: string };
    modified?: string[];
    added?: string[];
    removed?: string[];
  }>;
  head_commit?: {
    message?: string;
    author?: { username?: string; name?: string };
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

export function getPayloadValue(payload: WebhookPayload, field: string, aiPriority?: string): string {
  if (field === "ai_priority") return stringValue(aiPriority || payload.aiPriority);
  if (field === "title") return stringValue(payload.issue?.title ?? payload.pull_request?.title);
  if (field === "body") return stringValue(payload.issue?.body ?? payload.pull_request?.body);
  if (field === "author") {
    return stringValue(
      payload.sender?.login ?? 
      payload.issue?.user?.login ?? 
      payload.pull_request?.user?.login ?? 
      payload.pusher?.name ?? 
      payload.head_commit?.author?.username
    );
  }
  if (field === "action") return stringValue(payload.action);
  if (field === "message") return stringValue(payload.head_commit?.message ?? payload.commits?.[0]?.message);
  if (field === "ref") return stringValue(payload.ref);
  if (field === "modified_files") {
    const files: string[] = [];
    if (payload.commits) {
      for (const c of payload.commits) {
        if (c.modified) files.push(...c.modified);
        if (c.added) files.push(...c.added);
        if (c.removed) files.push(...c.removed);
      }
    }
    return Array.from(new Set(files)).join(" ");
  }
  return "";
}

export function matchesRule(
  rule: RuleShape,
  eventType: string,
  payload: WebhookPayload,
  aiPriority?: string,
  prFiles?: string[]
): boolean {
  if (rule.eventType !== eventType) return false;

  if (rule.matchField === "changed_files_match") {
    let files = prFiles;
    if (!files || files.length === 0) {
      const filesStr = getPayloadValue(payload, "modified_files");
      files = filesStr ? filesStr.split(" ").filter(Boolean) : [];
    }
    return matchesChangedFiles(rule.matchValue, files);
  }

  const value = getPayloadValue(payload, rule.matchField, aiPriority);

  if (rule.matchType === "equals") {
    return value.trim().toLowerCase() === rule.matchValue.trim().toLowerCase();
  }

  if (rule.matchType === "contains") {
    return value.toLowerCase().includes(rule.matchValue.trim().toLowerCase());
  }

  if (rule.matchType === "regex") {
    try {
      const regex = new RegExp(rule.matchValue.trim(), "i");
      return regex.test(value);
    } catch {
      // Return false safely if user inputs invalid regex syntax
      return false;
    }
  }

  if (rule.matchType === "glob_match") {
    const filesList = rule.matchField === "modified_files" 
      ? value.split(" ").filter(Boolean)
      : [value];

    if (filesList.length === 0) return false;

    return filesList.some((filePath) => matchGlob(rule.matchValue.trim(), filePath));
  }

  return false;
}

export function matchesChangedFiles(pattern: string, filePaths: string[]): boolean {
  if (!pattern || !filePaths || filePaths.length === 0) return false;
  return filePaths.some((filePath) => matchGlob(pattern.trim(), filePath));
}

export function matchGlob(pattern: string, filePath: string): boolean {
  try {
    const p = pattern.trim().toLowerCase();
    const f = filePath.trim().toLowerCase();

    if (p === f) return true;

    // Handle extension globs like *.ts, *.prisma across any subdirectory
    if (p.startsWith("*.") && !p.includes("/")) {
      const ext = p.slice(1);
      return f.endsWith(ext);
    }

    const regexString = "^" + p
      .replace(/[.+^${}()|[\]\\]/g, "\\$&")
      .replace(/\*\*/g, ".*")
      .replace(/(?<!\.)\*/g, ".*")
      + "$";

    const regex = new RegExp(regexString, "i");
    return regex.test(f) || f.includes(p.replace(/\*/g, ""));
  } catch {
    return false;
  }
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