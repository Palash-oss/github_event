import { Octokit } from "@octokit/rest";

export function createOctokit(accessToken: string) {
  return new Octokit({ auth: accessToken });
}

export async function listAccessibleRepos(accessToken: string) {
  const octokit = createOctokit(accessToken);

  // paginate() automatically follows GitHub's Link headers until all pages are fetched
  const allRepos = await octokit.paginate(octokit.repos.listForAuthenticatedUser, {
    per_page: 100,
    affiliation: "owner,collaborator,organization_member",
    sort: "updated"
  });

  return allRepos.map((repo) => ({
    id: repo.id,
    name: repo.name,
    owner: repo.owner.login,
    fullName: repo.full_name,
    private: repo.private,
    htmlUrl: repo.html_url,
    description: repo.description ?? ""
  }));
}


export async function createOrUpdateWebhook(params: {
  accessToken: string;
  owner: string;
  repo: string;
  repoId: string;
  secret: string;
  appUrl: string;
  webhookId?: number | null;
}) {
  const octokit = createOctokit(params.accessToken);
  const config = {
    url: `${params.appUrl.replace(/\/$/, "")}/api/webhooks/github/${params.repoId}`,
    content_type: "json" as const,
    secret: params.secret,
    insecure_ssl: "0" as const
  };
  const events = ["issues", "pull_request", "push"];

  if (params.webhookId) {
    try {
      const updated = await octokit.repos.updateWebhook({
        owner: params.owner,
        repo: params.repo,
        hook_id: params.webhookId,
        config,
        events,
        active: true
      });
      return updated.data.id;
    } catch {
      // Fall through and create a fresh webhook if the old hook is gone.
    }
  }

  try {
    const created = await octokit.repos.createWebhook({
      owner: params.owner,
      repo: params.repo,
      config,
      events,
      active: true
    });

    return created.data.id;
  } catch (error: any) {
    console.warn("Failed to create webhook on GitHub (likely due to localhost/private appUrl):", error.message || error);
    // If testing on localhost, mock the webhook ID to allow local testing to continue
    if (params.appUrl.includes("localhost") || params.appUrl.includes("127.0.0.1")) {
      return Math.floor(100000 + Math.random() * 900000);
    }
    throw error;
  }
}

export async function addIssueLabels(params: {
  accessToken: string;
  owner: string;
  repo: string;
  issueNumber: number;
  labels: string[];
}) {
  const octokit = createOctokit(params.accessToken);
  await octokit.issues.addLabels({
    owner: params.owner,
    repo: params.repo,
    issue_number: params.issueNumber,
    labels: params.labels
  });
}

export async function addIssueComment(params: {
  accessToken: string;
  owner: string;
  repo: string;
  issueNumber: number;
  body: string;
}) {
  const octokit = createOctokit(params.accessToken);
  await octokit.issues.createComment({
    owner: params.owner,
    repo: params.repo,
    issue_number: params.issueNumber,
    body: params.body
  });
}