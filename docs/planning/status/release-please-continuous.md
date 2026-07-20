---
title: Release Please Continuous Mode Status
status: Active
owner: docs
last_reviewed: 2026-07-19
planning_type: status
---

# Release Please Continuous Mode Status

Date: 2026-07-19
Status: Enabled for repository releases on `push` to `main`

## Context

`release-please` is configured in `.github/workflows/release.yml` to run only on
`push` to `main`. The privileged generator has no branch-selectable manual
dispatch surface.

Repository Actions workflow permissions were also updated on 2026-03-08 so GitHub Actions can create and update the release PR automatically.

## Current Decision

- Continuous release PR / tag automation is enabled for the repository.
- Automatic npm publication is explicitly disabled for now.
- The workflow no longer passes the deprecated `package-name` input to `googleapis/release-please-action@v4`.
- Release Please owns changelog, tag, and release-PR generation only.
- `.github/workflows/release-candidate-integrity.yml` is the sole coordinator
  of the required `Release candidate integrity` context. Trusted publisher jobs
  open and complete that check on the exact PR head SHA, while a separate
  read-only job inspects immutable candidate Git objects without installing or
  executing candidate code.
- The default-branch ruleset requires both the ordinary product quality
  aggregator and the exact release-candidate check with strict branch freshness.

Current workflow shape:

```yaml
on:
  push:
    branches: [main]
```

## Why npm publication stays disabled

- The current workflow targets the root package `dvt`, but this repository is a monorepo with mixed `private` and public package settings.
- The only package currently marked non-private under `packages/@dvt/*` is `@dvt/cli`, and it still depends on workspace-local packages that are private.
- Enabling publish now would automate an unresolved packaging decision instead of a stable release process.

## Done Criteria

- `release.yml` runs on `push` to `main`.
- A release PR is created or updated automatically after merges to `main`.
- Product PRs are squash-merged so each PR contributes one release identity.
- GitHub-generated changelog notes and the candidate integrity query reject
  duplicate logical entries and stale or incoherent release trees.
- npm publication remains disabled until the publishable artifact strategy is formalized.
- `tools/ci/workflow-pattern-parity.test.mjs` parses the workflow structure and
  guards the separation between privileged generation, trusted candidate
  assessment, and ordinary product CI.

## Next Decision Required

Choose one explicit release model before re-enabling publication:

1. Repository releases only:
   `release-please` manages changelog, tags, and GitHub releases for the monorepo root.
2. Package releases:
   choose the actual publishable package, fix package boundaries and dependencies, then enable scoped publication for that package only.

## Residual Risks

- Release PR generation still depends on Conventional Commit PR titles.
- Version bumps at the root package may still be semantically correct for repo releases but should not be confused with a validated npm package release.
