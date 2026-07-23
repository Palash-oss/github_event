import { sendSlackMessage, buildSlackBlockKitMessage } from "@/server/slack";

export async function sendMultiChannelNotifications(params: {
  owner: string;
  repo: string;
  eventType: string;
  payload: Record<string, any>;
  notifySlack: boolean;
  notifyDiscord: boolean;
  notifyTelegram: boolean;
  aiSummary?: string | null;
  aiPriority?: string | null;
}): Promise<Array<{ channel: string; status: "success" | "failed"; error?: string }>> {
  const results: Array<{ channel: string; status: "success" | "failed"; error?: string }> = [];

  const title = getEventTitle(params.eventType, params.payload);
  const priorityBadge = params.aiPriority ? `[${params.aiPriority}] ` : "";
  const summaryText = params.aiSummary ? `\n🤖 AI Summary: ${params.aiSummary}` : "";

  // 1. Slack
  if (params.notifySlack) {
    try {
      const blockMessage = buildSlackBlockKitMessage(params.owner, params.repo, params.eventType, params.payload);
      if (params.aiSummary) {
        blockMessage.blocks.unshift({
          type: "section",
          text: {
            type: "mrkdwn",
            text: `*${priorityBadge}🤖 AI Triage Summary:* ${params.aiSummary}`
          }
        });
      }
      await sendSlackMessage(blockMessage);
      results.push({ channel: "slack", status: "success" });
    } catch (err: any) {
      results.push({ channel: "slack", status: "failed", error: err?.message || "Slack notification failed" });
    }
  }

  // 2. Discord Webhook
  if (params.notifyDiscord) {
    const discordWebhookUrl = process.env.DISCORD_WEBHOOK_URL;
    if (!discordWebhookUrl) {
      results.push({ channel: "discord", status: "failed", error: "DISCORD_WEBHOOK_URL is not configured in .env" });
    } else {
      try {
        const color = params.aiPriority === "P0" ? 15158332 : params.aiPriority === "P1" ? 15105570 : 3447003;
        await fetch(discordWebhookUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            embeds: [
              {
                title: `${priorityBadge}${params.owner}/${params.repo} — ${params.eventType.toUpperCase()}`,
                description: `${title}${summaryText}`,
                color,
                timestamp: new Date().toISOString(),
                footer: { text: "GitHub Automation Bot" }
              }
            ]
          })
        });
        results.push({ channel: "discord", status: "success" });
      } catch (err: any) {
        results.push({ channel: "discord", status: "failed", error: err?.message || "Discord notification failed" });
      }
    }
  }

  // 3. Telegram Bot API
  if (params.notifyTelegram) {
    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    const chatId = process.env.TELEGRAM_CHAT_ID;
    if (!botToken || !chatId) {
      results.push({ channel: "telegram", status: "failed", error: "TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID missing" });
    } else {
      try {
        const text = `🔔 *${priorityBadge}${params.owner}/${params.repo}*\nEvent: \`${params.eventType}\`\n\n*${title}*${summaryText}`;
        await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            chat_id: chatId,
            text,
            parse_mode: "Markdown"
          })
        });
        results.push({ channel: "telegram", status: "success" });
      } catch (err: any) {
        results.push({ channel: "telegram", status: "failed", error: err?.message || "Telegram notification failed" });
      }
    }
  }

  return results;
}

function getEventTitle(eventType: string, payload: Record<string, any>): string {
  if (eventType === "issues") return `Issue #${payload.issue?.number}: ${payload.issue?.title || ""}`;
  if (eventType === "pull_request") return `PR #${payload.pull_request?.number}: ${payload.pull_request?.title || ""}`;
  if (eventType === "push") return `Push to ${payload.ref || "branch"} by ${payload.pusher?.name || "user"}`;
  return `${eventType} event triggered`;
}
