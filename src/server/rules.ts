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