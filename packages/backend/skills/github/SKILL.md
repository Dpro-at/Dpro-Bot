---
name: github
description: "Manage GitHub repositories, issues, and pull requests using the gh CLI"
metadata:
  agent-player:
    emoji: "🐙"
    version: "1.0.0"
    author: "Dpro"
    category: "development"
    tags: ["github", "git", "vcs", "devops"]
    triggers:
      - github
      - gh
      - repo
      - repository
      - issue
      - pr
      - "pull request"
    settings:
      - key: github_token
        type: secret
        label: "GitHub Personal Access Token"
        description: "Get from https://github.com/settings/tokens"
        required: true
      - key: default_repo
        type: string
        label: "Default Repository"
        description: "Format: owner/repo"
      - key: default_org
        type: string
        label: "Default Organization"
    requires:
      bins: ["gh"]
    install:
      - id: brew
        kind: brew
        formula: gh
        label: "Install GitHub CLI (brew)"
      - id: winget
        kind: winget
        package: "GitHub.cli"
        label: "Install GitHub CLI (winget)"
      - id: apt
        kind: apt
        package: gh
        label: "Install GitHub CLI (apt)"
---

# GitHub Skill

Interact with GitHub using the `gh` CLI. Manage repos, issues, PRs, and CI runs.

## Prerequisites

1. Install GitHub CLI: https://cli.github.com/
2. Authenticate: `gh auth login`
3. Set Personal Access Token in skill settings

## Usage

### Repositories

List your repos:
```bash
gh repo list
```

Create a new repo:
```bash
gh repo create my-project --public
```

Clone a repo:
```bash
gh repo clone owner/repo
```

View repo info:
```bash
gh repo view owner/repo
```

### Issues

List issues:
```bash
gh issue list --repo owner/repo
```

Create an issue:
```bash
gh issue create --title "Bug: Login fails" --body "Description here"
```

View an issue:
```bash
gh issue view 123 --repo owner/repo
```

Close an issue:
```bash
gh issue close 123 --repo owner/repo
```

### Pull Requests

List PRs:
```bash
gh pr list --repo owner/repo
```

Create a PR:
```bash
gh pr create --title "Add feature" --body "Description"
```

Check CI status:
```bash
gh pr checks 55 --repo owner/repo
```

Merge a PR:
```bash
gh pr merge 55 --repo owner/repo
```

### CI/CD Runs

List workflow runs:
```bash
gh run list --repo owner/repo --limit 10
```

View run details:
```bash
gh run view <run-id> --repo owner/repo
```

View failed logs:
```bash
gh run view <run-id> --repo owner/repo --log-failed
```

### API Queries

Get PR with specific fields:
```bash
gh api repos/owner/repo/pulls/55 --jq '.title, .state, .user.login'
```

JSON output with filtering:
```bash
gh issue list --repo owner/repo --json number,title --jq '.[] | "\(.number): \(.title)"'
```

## Examples

**User:** "Show my GitHub repos"

**Response:**
```
📦 Your Repositories:

1. my-project (public) ⭐ 42
2. awesome-app (private)
3. dotfiles (public) ⭐ 15
```

**User:** "Create issue: Login button not working"

**Response:**
```
🐙 Issue Created!

Title: Login button not working
Number: #42
URL: https://github.com/owner/repo/issues/42
```

**User:** "Show open PRs"

**Response:**
```
🔀 Open Pull Requests (3):

#45 - Add dark mode (feature/dark-mode) by @user1
#44 - Fix memory leak (bugfix/memory) by @user2
#43 - Update deps (chore/deps) by @dependabot
```

## Token Permissions

Required scopes:
- `repo` - Full repository access
- `read:org` - Read organization info
- `workflow` - Update GitHub Actions workflows
