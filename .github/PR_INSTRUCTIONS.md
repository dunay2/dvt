# PR Creation Instructions

**PR Title**: `refactor: partition WORKFLOW_ENGINE.md + separate storage/engine adapters`

**Target Branch**: `main`

**Labels**: `refactor`, `documentation`, `phase-1`

---

## 📋 Quick Start

### 1. Create PR via GitHub CLI

```bash
# Ensure you're on the correct branch
git checkout <your-partition-branch>

# Create PR
gh pr create \
  --title "refactor: partition WORKFLOW_ENGINE.md + separate storage/engine adapters" \
  --body-file .github/PR_BODY.md \
  --base main \
  --label "refactor,documentation,phase-1" \
  --assignee @me \
  --reviewer @architecture-team,@devops-team
```

### 2. Or Create PR via GitHub Web UI

1. Go to: <https://github.com/your-org/your-repo/compare>
2. Select your branch
3. Click "Create pull request"
4. Copy content from [.github/PR_BODY.md](.github/PR_BODY.md)
5. Add labels: `refactor`, `documentation`, `phase-1`
6. Add reviewers: `@architecture-team`, `@devops-team`

---

## 📚 PR Package Contents

### Core PR Materials

| File                                                     | Purpose                                               | Use Case                  |
| -------------------------------------------------------- | ----------------------------------------------------- | ------------------------- |
| [.github/PR_BODY.md](.github/PR_BODY.md)                 | Short PR description (copy into GitHub PR body)       | Initial PR creation       |
| [.github/PR_TEMPLATE.md](.github/PR_TEMPLATE.md)         | Detailed PR description (reference doc, 90+ min read) | Reviewer deep-dive        |
| [.github/MIGRATION_GUIDE.md](.github/MIGRATION_GUIDE.md) | Consumer migration guide (role-based)                 | Team onboarding           |
| [.github/ROLLBACK.md](.github/ROLLBACK.md)               | Rollback procedures (3 options)                       | Emergency response        |
| `/tmp/pr_manifest.md`                                    | Auto-generated file manifest                          | PR description attachment |

### Supporting Materials (Already Committed)

| File                                                                               | Purpose                                               |
| ---------------------------------------------------------------------------------- | ----------------------------------------------------- |
| [docs/CONTRIBUTING.md](docs/CONTRIBUTING.md)                                       | Contribution guide (Code Owners, CI gates, templates) |
| [docs/architecture/engine/VERSIONING.md](docs/architecture/engine/VERSIONING.md)   | Contract versioning policy                            |
| [.github/CODEOWNERS](.github/CODEOWNERS)                                           | Automated review routing                              |
| [.github/workflows/markdown_lint.yml](.github/workflows/markdown_lint.yml)         | 4 CI quality gates                                    |
| [.github/scripts/generate_pr_manifest.sh](.github/scripts/generate_pr_manifest.sh) | Manifest generator script                             |

---

## ✅ Pre-PR Checklist

Before creating PR, verify:

### Release governance alignment

- [ ] Release flow references align with [`release-please`](.github/workflows/release.yml) on `main`
- [ ] No manual release commit/tag instructions added in PR docs
- [ ] No manual `CHANGELOG.md` release-entry instructions added in PR docs

### Mandatory quality gates (required)

- [ ] Pre-implementation risk briefing documented (risks, impact, mitigations)
- [ ] Touched-files plan documented before coding (what, how, why)
- [ ] Business-rule decisions confirmed before implementation (or marked N/A with rationale)
- [ ] Validation evidence prepared (commands + outputs)
- [ ] Rollback path documented (safe revert strategy)

> Note: The **Temporal adapter integration (time‑skipping)** test runs automatically for PRs that touch `packages/adapter-temporal/**` or `packages/contracts/**`. The PR Quality Gate will skip that integration when unrelated files are changed to keep CI fast.

### Code Quality

- [ ] All files committed and pushed
- [ ] No merge conflicts with `main`
- [ ] Commitlint checks pass for PR commits:
  - [ ] Scope is allowed: `contracts`, `docs`, `ci`, `deps`, `release`
  - [ ] Subject uses sentence-case
  - [ ] Commit header length is `<= 100` characters
- [ ] Markdown linting passed locally:

  ```bash
  markdownlint-cli2 "docs/**/*.md"
  ```

- [ ] Internal links validated:

  ```bash
  markdown-link-check docs/architecture/engine/INDEX.md
  ```

- [ ] TypeScript blocks validated (if added code):

  ```bash
  # Extract TS blocks and validate with tsc --noEmit
  ```

### Documentation

- [ ] PR_BODY.md reviewed (copy to PR description)
- [ ] MIGRATION_GUIDE.md reviewed (link in PR)
- [ ] ROLLBACK.md reviewed (emergency procedures documented)
- [ ] File manifest generated:

  ```bash
  bash .github/scripts/generate_pr_manifest.sh > /tmp/pr_manifest.md
  ```

### Stakeholders

- [ ] Architecture team notified (Slack #architecture)
- [ ] DevOps team notified (CI/CD changes)
- [ ] SDK team notified (link migration impacts implementation guides)
- [ ] SRE team notified (runbook structure changes)

---

## 📝 PR Description Template (Copy to GitHub)

**Copy the content below into GitHub PR body**:

```markdown
[Paste content from .github/PR_BODY.md here]

---

## 📎 Attachments

- **Detailed PR description**: [PR_TEMPLATE.md](.github/PR_TEMPLATE.md) (90 min read - comprehensive testing, rationale, rollback)
- **Migration guide**: [MIGRATION_GUIDE.md](.github/MIGRATION_GUIDE.md) (role-based instructions for SDK, SRE, Docs teams)
- **Rollback procedures**: [ROLLBACK.md](.github/ROLLBACK.md) (3 options: full revert, partial, forward fix)
- **File manifest**: See comment below ↓

---

## 📊 Auto-Generated Manifest

<details>
<summary>Click to expand file manifest</summary>

[Paste content from /tmp/pr_manifest.md here]

</details>
```

---

## 🎯 Expected Review Timeline

| Stage              | Duration  | Reviewers              | Actions                               |
| ------------------ | --------- | ---------------------- | ------------------------------------- |
| **Initial Review** | 2-4 hours | @architecture-team (2) | Review structure, contracts, adapters |
| **CI/CD Review**   | 1-2 hours | @devops-team (1)       | Review workflows, CODEOWNERS          |
| **Revisions**      | 1-2 days  | Author                 | Address feedback                      |
| **Final Approval** | 1 hour    | All reviewers          | Approve + merge                       |
| **Total**          | 2-3 days  | -                      | -                                     |

---

## 📣 Communication Plan

### Pre-Merge (Announce Intent)

**Slack (#architecture, #engineering)**:

```
📢 **Heads up**: Partition WORKFLOW_ENGINE.md PR ready for review

**What**: Refactor 3,227-line monolith → 13 modular docs + CI gates

**Impact**: Link structure changes only (no semantic changes)

**Review**: https://github.com/your-org/your-repo/pull/XYZ

**ETA**: Merge target: 2026-02-13 (pending approvals)

**Questions**: Reply in thread or ping @architecture-team
```

### Post-Merge (Announce Completion)

**Slack (#engineering, #architecture)**:

```
✅ **MERGED**: Partition WORKFLOW_ENGINE.md

**What changed**:
- WORKFLOW_ENGINE.md → deprecated (90-day grace → removal: 2026-05-12)
- New navigation hub: https://github.com/.../docs/architecture/engine/INDEX.md
- 13 modular docs (contracts, adapters, ops, dev, roadmap)
- 4 CI quality gates (Markdown lint, TypeScript, links, contract structure)

**Action required**:
- 📝 Update bookmarks to INDEX.md (not WORKFLOW_ENGINE.md)
- 📖 Read migration guide: https://github.com/.../.github/MIGRATION_GUIDE.md
- 🤝 Review contribution guide: https://github.com/.../docs/CONTRIBUTING.md

**Questions**: Ping @architecture-team in #architecture
```

---

## 🆘 Troubleshooting

### Issue: CI Failing on PR

**症状**: GitHub Actions failing with Markdown lint errors

**Solution**:

```bash
# Run locally to reproduce
markdownlint-cli2 "docs/**/*.md"

# Fix errors or adjust config
vim .markdownlint.json

# Re-run
markdownlint-cli2 "docs/**/*.md"
```

### Issue: Merge Conflicts

**症状**: "This branch has conflicts that must be resolved"

**Solution**:

```bash
git checkout <your-partition-branch>
git fetch origin main
git merge origin/main

# Resolve conflicts
# Most likely files: INDEX.md, README.md, ExecutionSemantics.v1.md

git add <resolved-files>
git commit -m "chore: resolve merge conflicts with main"
git push origin <your-partition-branch>
```

### Issue: Reviewer Requested Changes

**症状**: "Changes requested" status blocking merge

**Solution**:

1. Address feedback in new commits (don't force-push, preserves review history)
2. Reply to review comments with commit SHAs
3. Re-request review: Click "Re-request review" button
4. Wait for approval

---

## 📊 Success Metrics (Track Post-Merge)

| Metric                    | Target         | How to Measure                                          |
| ------------------------- | -------------- | ------------------------------------------------------- |
| **Merge time**            | <3 days        | GitHub PR timeline                                      |
| **Revisions**             | <3 cycles      | Count of "Changes requested" → "Approved" cycles        |
| **CI failures**           | 0              | GitHub Actions status                                   |
| **Broken links (Week 1)** | <5 reports     | Slack/email support tickets                             |
| **Team adoption**         | 100% by Week 4 | Survey: "Using INDEX.md instead of WORKFLOW_ENGINE.md?" |
| **404 rate increase**     | <5%            | Web analytics (if public docs)                          |

---

## 🎉 Post-Merge Celebration

Once merged, celebrate the team effort!

**Metrics to Share**:

- 📊 **3,227 lines** → **13 modular docs** (avg 280 lines)
- 🎯 **51% reduction** in longest doc size
- ✅ **107 internal links** validated
- 🤖 **4 CI gates** protecting quality
- 📚 **2,500+ lines** of new adapter documentation

**Thank contributors**:

- Architecture team (contract design)
- DevOps team (CI/CD setup)
- Documentation team (migration guide)
- All reviewers (thorough feedback)

---

## 🧹 Post-Merge Operational Cleanup

After PR merge, execute the repository cleanup flow in this exact order:

1. Close linked issue(s) with merge reference.
2. Delete remote branch.
3. Delete local branch.
4. Switch back to `main` and sync with remote.
5. Verify clean working tree before starting next issue.

```bash
# 1) Close issue (example: #90)
gh issue close 90 --comment "Completed via merged PR #<PR_NUMBER>"

# 2) Delete remote branch
git push origin --delete <branch-name>

# 3) Delete local branch
git branch -d <branch-name>

# 4) Return to main and sync
git checkout main
git pull --ff-only origin main

# 5) Final sanity check
git status -sb
```

> Notes:
>
> - If the issue is auto-closed by PR keywords, still leave a closure comment for traceability.
> - If branch deletion fails because it is not merged, stop and resolve merge state first.

---

**Ready to create the PR? Run**:

```bash
gh pr create --body-file .github/PR_BODY.md --title "refactor: partition WORKFLOW_ENGINE.md + separate storage/engine adapters" --base main --label "refactor,documentation,phase-1"
```

**Or**: Copy [.github/PR_BODY.md](.github/PR_BODY.md) to GitHub web UI manually.

**Questions?** Ping @architecture-team in Slack #architecture.
