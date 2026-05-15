---
title: Release Please Continuous Mode Status
status: Active
owner: docs
last_reviewed: 2026-03-08
planning_type: status
---

# Release Please Continuous Mode Status

Date: 2026-03-08  
Status: Enabled for repository releases on `push` to `main`

## Context

`release-please` is now configured in `.github/workflows/release.yml` to run automatically on `push` to `main`, while keeping `workflow_dispatch` available for manual execution.

Repository Actions workflow permissions were also updated on 2026-03-08 so GitHub Actions can create and update the release PR automatically.

## Current Decision

- Continuous release PR / tag automation is enabled for the repository.
- Automatic npm publication is explicitly disabled for now.
- The workflow no longer passes the deprecated `package-name` input to `googleapis/release-please-action@v4`.
- `release.yml` intentionally remains action-only: it does not check out the
  repository, install Node, install pnpm, or run repository scripts because the
  current release step delegates changelog, tag, and release-PR generation to
  `googleapis/release-please-action`.
- If the release workflow later needs repository-local tooling, generated
  artifacts, package builds, or publish commands, it must add `actions/checkout`
  and the shared `.github/actions/setup-node-pnpm` action in the same slice.

Current workflow shape:

```yaml
on:
  push:
    branches: [main]
  workflow_dispatch:
```

## Why npm publication stays disabled

- The current workflow targets the root package `dvt`, but this repository is a monorepo with mixed `private` and public package settings.
- The only package currently marked non-private under `packages/@dvt/*` is `@dvt/cli`, and it still depends on workspace-local packages that are private.
- Enabling publish now would automate an unresolved packaging decision instead of a stable release process.

## Done Criteria

- `release.yml` runs on `push` to `main`.
- A release PR is created or updated automatically after merges to `main`.
- npm publication remains disabled until the publishable artifact strategy is formalized.
- `tools/ci/workflow-pattern-parity.test.mjs` guards the current action-only
  release workflow posture so setup drift is explicit instead of accidental.

## Next Decision Required

Choose one explicit release model before re-enabling publication:

1. Repository releases only:
   `release-please` manages changelog, tags, and GitHub releases for the monorepo root.
2. Package releases:
   choose the actual publishable package, fix package boundaries and dependencies, then enable scoped publication for that package only.

## Residual Risks

- Release PR noise if commits stop following Conventional Commits consistently.
- Version bumps at the root package may still be semantically correct for repo releases but should not be confused with a validated npm package release.
