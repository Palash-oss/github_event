import { ActionLog, Event, Prisma, Repo, Rule, User } from "@prisma/client";
import { addIssueComment, addIssueLabels } from "@/server/github";
import { prisma } from "@/server/prisma";
import { buildDefaultRule, getActionMessage, matchesRule, renderTemplate } from "@/server/rules";
import { sendSlackMessage } from "@/server/slack";

type EventWithRelations = Event & {
  repo: Repo & { user: User; rules: Rule[] };
};

export async function processEvent(event: EventWithRelations) {
  const payload = event.payload as Record<string, any>;
  const eventType = event.eventType;
  const rules = event.repo.rules.filter((rule) => matchesRule(rule, eventType, payload));
  const fallbackRule = rules.length > 0 ? null : buildDefaultRule(eventType, payload);
  const activeRules = fallbackRule ? [fallbackRule] : rules;

  for (const rule of activeRules) {
    if (rule.actionLabel) {
      await runAction(event, "github_label", async () => {
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

    if (rule.actionComment) {
      await runAction(event, "github_comment", async () => {
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

    if (rule.notifySlack) {
      const message = getActionMessage(event.repo.owner, event.repo.name, event.eventType, payload);
      await runAction(event, "slack_notify", async () => {
        await sendSlackMessage(message);
      }, { message });
    }
  }
}

export async function retryActionLog(actionLog: ActionLog & { event: EventWithRelations }) {
  await prisma.actionLog.update({
    where: { id: actionLog.id },
    data: {
      attempts: { increment: 1 },
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
    await prisma.actionLog.update({
      where: { id: actionLog.id },
      data: { status: "failed", error: error instanceof Error ? error.message : "Unknown error" }
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

async function runAction(
  event: EventWithRelations,
  actionType: string,
  runner: () => Promise<void>,
  details?: Record<string, unknown>
) {
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
  } catch (error) {
    await prisma.actionLog.create({
      data: {
        eventId: event.id,
        actionType,
        status: "failed",
        details: details ? (details as Prisma.InputJsonValue) : undefined,
        error: error instanceof Error ? error.message : "Unknown error"
      }
    });
  }
}

function getIssueNumber(payload: Record<string, any>) {
  return payload.issue?.number ?? payload.pull_request?.number ?? null;
}