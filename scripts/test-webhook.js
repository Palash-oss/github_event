const { loadEnvConfig } = require("@next/env");
// Load env files (.env.local, .env) before initializing Prisma Client
loadEnvConfig(process.cwd());

const { PrismaClient } = require("@prisma/client");
const crypto = require("crypto");

async function testWebhook() {
  const prisma = new PrismaClient();
  const repo = await prisma.repo.findFirst({
    where: { active: true }
  });

  if (!repo) {
    console.error("No active connected repository found in database. Please connect a repo in the dashboard first!");
    process.exit(1);
  }

  console.log(`Found active connected repository: ${repo.owner}/${repo.name}`);

  const eventType = process.argv[2] ?? "issues";
  const deliveryId = crypto.randomUUID();
  
  const payload = eventType === "pull_request" ? {
    action: "opened",
    pull_request: {
      number: 101,
      title: "Fix database connection leaks",
      body: "This PR resolves a critical backend issue by closing stale prisma connections.",
      user: { login: "test-developer" }
    },
    repository: {
      full_name: `${repo.owner}/${repo.name}`,
      owner: { login: repo.owner },
      name: repo.name
    }
  } : eventType === "push" ? {
    ref: "refs/heads/main",
    before: "0000000000000000000000000000000000000000",
    after: "7700a16772c4ec4d96a75f850772d1f970e7e4a1",
    commits: [
      {
        id: "7700a16772c4ec4d96a75f850772d1f970e7e4a1",
        message: "Update dashboard layout styling and remove empty space",
        timestamp: new Date().toISOString(),
        author: { name: "Palash-oss", username: "Palash-oss" }
      }
    ],
    repository: {
      full_name: `${repo.owner}/${repo.name}`,
      owner: { login: repo.owner },
      name: repo.name
    }
  } : {
    action: "opened",
    issue: {
      number: 42,
      title: "Critical bug in authentication process",
      body: "The authentication process sometimes throws a 500 error on redirect.",
      user: { login: "test-developer" }
    },
    repository: {
      full_name: `${repo.owner}/${repo.name}`,
      owner: { login: repo.owner },
      name: repo.name
    }
  };

  const bodyText = JSON.stringify(payload);
  const signature = "sha256=" + crypto
    .createHmac("sha256", repo.webhookSecret)
    .update(bodyText)
    .digest("hex");

  console.log(`Sending simulated GitHub '${eventType}' webhook to localhost:3000...`);
  
  try {
    const response = await fetch("http://localhost:3000/api/webhooks/github", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-github-delivery": deliveryId,
        "x-github-event": eventType,
        "x-hub-signature-256": signature
      },
      body: bodyText
    });

    const status = response.status;
    const data = await response.json();
    console.log(`Response Status: ${status}`);
    console.log("Response Body:", JSON.stringify(data, null, 2));

    if (status === 200) {
      console.log("\nSuccess! Webhook payload ingested, authenticated, and processed successfully.");
      console.log("Check your dashboard or logs archive to see the new event and its action logs!");
    } else {
      console.error("\nFailed to process webhook. See error output above.");
    }
  } catch (error) {
    console.error("Failed to connect to the dev server. Make sure 'npm run dev' is running on port 3000!", error);
  } finally {
    await prisma.$disconnect();
  }
}

testWebhook();
