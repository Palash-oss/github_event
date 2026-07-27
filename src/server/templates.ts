export interface RuleTemplate {
  id: string;
  name: string;
  description: string;
  eventType: string;
  matchField: string;
  matchType: string;
  matchValue: string;
  actionLabel: string;
  actionComment: string;
  notifySlack: boolean;
  isProOnly: boolean;
}

export const PREBUILT_RULE_TEMPLATES: RuleTemplate[] = [
  {
    id: "alert_dependency_added",
    name: "Alert on new dependency added",
    description: "Detects when package.json, requirements.txt, go.mod, Cargo.toml, or Gemfile is modified in a PR.",
    eventType: "pull_request",
    matchField: "changed_files_match",
    matchType: "regex",
    matchValue: "(?i).*(package\\.json|requirements\\.txt|go\\.mod|Cargo\\.toml|Gemfile)",
    actionLabel: "dependency-review",
    actionComment: "Attention @dev-team: Dependency manifest changed in this PR. Please verify license & vulnerability audit.",
    notifySlack: true,
    isProOnly: true
  },
  {
    id: "stale_pr_reminder",
    name: "Stale PR reminder",
    description: "Tracks open PRs with no activity for N days via daily scheduled cron sweep.",
    eventType: "pull_request",
    matchField: "title_contains",
    matchType: "equals",
    matchValue: "stale",
    actionLabel: "stale-pr",
    actionComment: "Reminder: This pull request has had no activity for over 7 days. Please review or close if no longer needed.",
    notifySlack: true,
    isProOnly: false
  },
  {
    id: "sensitive_path_review",
    name: "Require review on sensitive paths",
    description: "Triggers security review whenever auth, payments, or secrets paths are modified in a PR.",
    eventType: "pull_request",
    matchField: "changed_files_match",
    matchType: "regex",
    matchValue: "(?i).*(auth|payments|security|config|secrets)/.*",
    actionLabel: "security-audit",
    actionComment: "Attention @security-team: Sensitive path modified in this PR. Require explicit approval before merge.",
    notifySlack: true,
    isProOnly: true
  }
];

export function getTemplateById(id: string): RuleTemplate | undefined {
  return PREBUILT_RULE_TEMPLATES.find((t) => t.id === id);
}
