import { ActionLog, Event, Prisma, Repo, Rule, User } from "@prisma/client";
import { addIssueComment, addIssueLabels } from "@/server/github";
import { prisma } from "@/server/prisma";
import { buildDefaultRule, getActionMessage, matchesRule, renderTemplate } from "@/server/rules";
import { sendSlackMessage } from "@/server/slack";
import { triageEvent } from "@/server/ai-triage";
import { sendMultiChannelNotifications } from "@/server/notifications";

type EventWithRelations = Event & {
  repo: Repo & { user: User; rules: Rule[] };
};

export async function processEvent(event: EventWithRelations) {
  const payload = event.payload as Record<string, any>;
  const eventType = event.eventType;

  // Run AI Triage if not already triaged
  let aiSummary = event.aiSummary;
  let aiPriority = event.aiPriority;
  let aiSuggestedLabel = event.aiSuggestedLabel;

  if (!aiSummary) {
    try {
      const triage = await triageEvent(eventType, payload);
      aiSummary = triage.summary;
      aiPriority = triage.priority;
      aiSuggestedLabel = triage.suggestedLabel;

      await prisma.event.update({
        where: { id: event.id },
        data: {
          aiSummary,
          aiPriority,
          aiSuggestedLabel
        }
      });
    } catch (e) {
      console.warn("AI Triage step failed:", e);
    }
  }

  const rules = event.repo.rules.filter((rule) => matchesRule(rule, eventType, payload));
  const fallbackRule = rules.length > 0 ? null : buildDefaultRule(eventType, payload);
  const activeRules = fallbackRule ? [fallbackRule] : rules;

  for (const rule of activeRules) {
    if (rule.actionLabel && eventType !== "push") {
      await runActionWithRetry(event, "github_label", async () => {
        const issueNumber = getIssueNumber(payload);
        if (!issueNumber) throw new Error("No issue or pull request number in payload");
        await addIssueLabels({
          accessToken: event.repo.user.accessToken,
          owner: event.repo.owner,
          repo: event.repo.name,
          issueNumber,
          labels: [rule.actionLabel as string]
        });
      }, {
        label: rule.actionLabel as string,
        issueNumber: getIssueNumber(payload)
      });
    }

    if (rule.actionComment && eventType !== "push") {
      await runActionWithRetry(event, "github_comment", async () => {
        const issueNumber = getIssueNumber(payload);
        if (!issueNumber) throw new Error("No issue or pull request number in payload");
        await addIssueComment({
          accessToken: event.repo.user.accessToken,
          owner: event.repo.owner,
          repo: event.repo.name,
          issueNumber,
          body: renderTemplate(rule.actionComment as string, payload)
        });
      }, {
        comment: renderTemplate(rule.actionComment as string, payload),
        issueNumber: getIssueNumber(payload)
      });
    }

    const notifyDiscord = (rule as any).notifyDiscord ?? false;
    const notifyTelegram = (rule as any).notifyTelegram ?? false;

    if (rule.notifySlack || notifyDiscord || notifyTelegram) {
      const results = await sendMultiChannelNotifications({
        owner: event.repo.owner,
        repo: event.repo.name,
        eventType: event.eventType,
        payload,
        notifySlack: rule.notifySlack,
        notifyDiscord,
        notifyTelegram,
        aiSummary,
        aiPriority
      });

      for (const res of results) {
        const isSuccess = res.status === "success";
        const status = isSuccess ? "success" : (isPermanentErrorMessage(res.error) ? "dead_letter" : "failed");
        await prisma.actionLog.create({
          data: {
            eventId: event.id,
            actionType: `${res.channel}_notify`,
            status,
            error: res.error,
            details: { message: isSuccess ? `Delivered to ${res.channel}` : `Failed to deliver to ${res.channel}` }
          }
        });
      }
    }
  }
}

export async function retryActionLog(actionLog: ActionLog & { event: EventWithRelations }) {
  if (actionLog.attempts >= 5) {
    await prisma.actionLog.update({
      where: { id: actionLog.id },
      data: { status: "dead_letter", error: "Dead letter: Maximum retry attempts reached (5)" }
    });
    return false;
  }

  const nextAttempts = actionLog.attempts + 1;
  await prisma.actionLog.update({
    where: { id: actionLog.id },
    data: {
      attempts: nextAttempts,
      status: "retrying",
      error: null
    }
  });

  try {
    await retrySingleAction(actionLog);
    await prisma.actionLog.update({
      where: { id: actionLog.id },
      data: { status: "success", error: null }
    });
    return true;
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : "Unknown error";
    const isPermanent = isPermanentErrorMessage(errorMsg) || nextAttempts >= 5;
    const finalStatus = isPermanent ? "dead_letter" : "failed";

    await prisma.actionLog.update({
      where: { id: actionLog.id },
      data: { status: finalStatus, error: errorMsg }
    });
    return false;
  }
}

async function retrySingleAction(actionLog: ActionLog & { event: EventWithRelations }) {
  const payload = actionLog.event.payload as Record<string, any>;
  const details = (actionLog.details as Prisma.JsonObject | null) ?? {};

  if (actionLog.actionType === "github_label") {
    const label = typeof details.label === "string" ? details.label : null;
    const issueNumber = typeof details.issueNumber === "number" ? details.issueNumber : getIssueNumber(payload);
    if (!label || !issueNumber) throw new Error("Missing retry metadata for label action");
    await addIssueLabels({
      accessToken: actionLog.event.repo.user.accessToken,
      owner: actionLog.event.repo.owner,
      repo: actionLog.event.repo.name,
      issueNumber,
      labels: [label]
    });
    return;
  }

  if (actionLog.actionType === "github_comment") {
    const comment = typeof details.comment === "string" ? details.comment : null;
    const issueNumber = typeof details.issueNumber === "number" ? details.issueNumber : getIssueNumber(payload);
    if (!comment || !issueNumber) throw new Error("Missing retry metadata for comment action");
    await addIssueComment({
      accessToken: actionLog.event.repo.user.accessToken,
      owner: actionLog.event.repo.owner,
      repo: actionLog.event.repo.name,
      issueNumber,
      body: comment
    });
    return;
  }

  if (actionLog.actionType === "slack_notify") {
    const message = typeof details.message === "string" ? details.message : getActionMessage(actionLog.event.repo.owner, actionLog.event.repo.name, actionLog.event.eventType, payload);
    await sendSlackMessage(message);
    return;
  }

  throw new Error(`Unsupported action type: ${actionLog.actionType}`);
}

export async function runActionWithRetry(
  event: EventWithRelations,
  actionType: string,
  runner: () => Promise<void>,
  details?: Record<string, unknown>,
  maxInFlightRetries = 2
) {
  let attempt = 0;
  let lastError: unknown = null;

  while (attempt <= maxInFlightRetries) {
    try {
      await runner();
      await prisma.actionLog.create({
        data: {
          eventId: event.id,
          actionType,
          status: "success",
          details: details ? (details as Prisma.InputJsonValue) : undefined
        }
      });
      return;
    } catch (error) {
      lastError = error;
      const errorMsg = error instanceof Error ? error.message : "Unknown error";
      
      // If permanent error, do not retry in-flight; break immediately to log dead_letter or failure
      if (isPermanentErrorMessage(errorMsg)) {
        break;
      }

      attempt++;
      if (attempt <= maxInFlightRetries) {
        // Exponential backoff: 200ms, 400ms
        const backoffMs = 200 * Math.pow(2, attempt - 1);
        await new Promise((resolve) => setTimeout(resolve, backoffMs));
      }
    }
  }

  const finalErrorMsg = lastError instanceof Error ? lastError.message : "Unknown error";
  const isPermanent = isPermanentErrorMessage(finalErrorMsg);

  await prisma.actionLog.create({
    data: {
      eventId: event.id,
      actionType,
      status: isPermanent ? "dead_letter" : "failed",
      details: details ? (details as Prisma.InputJsonValue) : undefined,
      error: finalErrorMsg
    }
  });
}

export function isPermanentErrorMessage(errorMsg: string | undefined | null): boolean {
  if (!errorMsg) return false;
  const msg = errorMsg.toLowerCase();
  return (
    msg.includes("401") ||
    msg.includes("403") ||
    msg.includes("404") ||
    msg.includes("bad credentials") ||
    msg.includes("unauthorized") ||
    msg.includes("no issue or pull request number") ||
    msg.includes("missing retry metadata")
  );
}

function getIssueNumber(payload: Record<string, any>) {
  return payload.issue?.number ?? payload.pull_request?.number ?? null;
}