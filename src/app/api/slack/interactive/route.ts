import { createHmac, timingSafeEqual } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/server/prisma";
import { createOctokit } from "@/server/github";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const rawBodyText = await request.text();
  
  // 1. Verify Slack Request Signature (if SLACK_SIGNING_SECRET is configured)
  const slackSigningSecret = process.env.SLACK_SIGNING_SECRET;
  if (slackSigningSecret) {
    const timestamp = request.headers.get("x-slack-request-timestamp");
    const signature = request.headers.get("x-slack-signature");
    
    if (!timestamp || !signature) {
      return NextResponse.json({ error: "Missing Slack signature headers" }, { status: 400 });
    }
    
    // Protect against replay attacks (5 minute window)
    const fiveMinutesAgo = Math.floor(Date.now() / 1000) - 60 * 5;
    if (parseInt(timestamp) < fiveMinutesAgo) {
      return NextResponse.json({ error: "Request expired" }, { status: 400 });
    }
    
    const sigBaseString = `v0:${timestamp}:${rawBodyText}`;
    const expectedSignature = `v0=${createHmac("sha256", slackSigningSecret)
      .update(sigBaseString)
      .digest("hex")}`;
      
    if (!compareSignatures(signature, expectedSignature)) {
      return NextResponse.json({ error: "Invalid Slack signature" }, { status: 401 });
    }
  }

  // 2. Parse URL encoded body payload
  const params = new URLSearchParams(rawBodyText);
  const payloadString = params.get("payload");
  if (!payloadString) {
    return NextResponse.json({ error: "Missing payload parameter" }, { status: 400 });
  }

  let payload: any;
  try {
    payload = JSON.parse(payloadString);
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
  }

  const action = payload.actions?.[0];
  if (!action) {
    return NextResponse.json({ ok: true });
  }

  const actionId = action.action_id;
  const username = payload.user?.name ?? "unknown user";

  // 3. Process Interactivity Action
  if (actionId === "close_issue") {
    const actionValue = action.value; // formatted as "owner|repo|number"
    if (!actionValue) {
      return NextResponse.json({ error: "Missing action value" }, { status: 400 });
    }

    const [owner, name, issueNumberStr] = actionValue.split("|");
    const issueNumber = parseInt(issueNumberStr);
    
    if (!owner || !name || isNaN(issueNumber)) {
      return NextResponse.json({ error: "Invalid action value format" }, { status: 400 });
    }

    // Load active repo to get the user's accessToken
    const repo = await prisma.repo.findFirst({
      where: { owner, name, active: true },
      include: { user: true }
    });

    if (!repo || !repo.user?.accessToken) {
      return NextResponse.json({ error: "Repository or accessToken not found" }, { status: 404 });
    }

    try {
      // Call GitHub API to close the issue
      const octokit = createOctokit(repo.user.accessToken);
      await octokit.issues.update({
        owner,
        repo: name,
        issue_number: issueNumber,
        state: "closed"
      });
      
      // Update original Slack message to confirm the action
      const originalMessageBlocks = payload.message?.blocks ?? [];
      const updatedBlocks = originalMessageBlocks.map((block: any) => {
        // Replace actions section with a resolved text status
        if (block.type === "actions") {
          return {
            type: "section",
            text: {
              type: "mrkdwn",
              text: `✅ *Resolved:* Issue closed from Slack by *@${username}*`
            }
          };
        }
        return block;
      });

      return NextResponse.json({
        text: payload.message?.text ?? "Issue Closed",
        blocks: updatedBlocks,
        replace_original: true
      });
      
    } catch (error: any) {
      console.error("Failed to close issue via Slack interactive action:", error.message || error);
      // Return ephemeral message or message with warning
      return NextResponse.json({
        text: `❌ Failed to close issue: ${error.message || "Unknown GitHub error"}`
      });
    }
  }

  return NextResponse.json({ ok: true });
}

function compareSignatures(received: string, expected: string) {
  const receivedBuffer = Buffer.from(received);
  const expectedBuffer = Buffer.from(expected);
  if (receivedBuffer.length !== expectedBuffer.length) return false;
  return timingSafeEqual(receivedBuffer, expectedBuffer);
}
