---
title: Local Changed Files Gate Hardening Plan
status: Accepted
owner: Engineering / CI Governance
last_reviewed: 2026-05-03
planning_type: proposal
---

# Local Changed Files Gate Hardening Plan

## Feature Mechanization Manifest

```feature-mechanization
version: 1
featureId: CI-LOCAL-CHANGED-FILES-GATE-HARDENING
mechanizationStatus: implemented
noHumanDecisionsRemaining: true
implementationPlan: docs/planning/proposals/mandatory/governance-and-docs/local-changed-files-gate-hardening-plan-20260503.md
componentGuides:
  - docs/architecture/components/ci-governance/local-changed-files-gate-component.md
  - docs/guides/testing-and-ci-capabilities.md
userStories:
  - docs/architecture/components/ci-governance/local-changed-files-gate-component.md
  - docs/planning/proposals/mandatory/governance-and-docs/local-changed-files-gate-hardening-plan-20260503.md
governingSources:
  - AGENTS.md
  - docs/planning/status/governance-document-rule-inventory.md
  - docs/guides/ai-work-protocol.md
  - docs/guides/testing-and-ci-capabilities.md
  - docs/architecture/command-query-rail-governance.md
  - docs/architecture/fowler-opportunity-planning-governance.md
allowedImplementationSurfaces:
  - scripts/git-local-changes.cjs
  - scripts/git-local-changes.test.cjs
  - scripts/check-changed.cjs
  - scripts/type-check-prepush.cjs
  - scripts/lint-markdown-changed.cjs
  - scripts/format-markdown-changed.cjs
  - scripts/docs-workboard-check-changed.cjs
  - scripts/fix-changed.cjs
  - scripts/qa-artifact-check.cjs
  - scripts/validate-arc-evidence-frontmatter.cjs
  - scripts/check-markdown-locations.cjs
  - scripts/check-feature-mechanization.cjs
  - scripts/check-feature-mechanization.test.cjs
  - scripts/check-governance-changed-files.cjs
  - scripts/check-governance-changed-files.test.cjs
  - scripts/generate-governance-file-component-index.cjs
  - tools/docs/check-filenames.ts
  - tools/docs/check-frontmatter.ts
  - buzon/20260503-branch-fowler-hard-qa-review.md
  - docs/architecture/components/index.md
  - docs/architecture/components/ci-governance/**
  - docs/guides/testing-and-ci-capabilities.md
  - docs/planning/proposals/mandatory/governance-and-docs/local-changed-files-gate-hardening-plan-20260503.md
  - docs/planning/proposals/portfolio-map-20260403.md
  - docs/planning/status/generated-code-state.md
  - docs/planning/status/governance-files/**
  - docs/planning/status/system-governance-file-fingerprint-baseline.yaml
  - docs/planning/status/system-governance-file-index.files.yaml
forbiddenImplementationSurfaces:
  - apps/**
  - packages/**
  - specs/**
  - .github/workflows/**
commandQueryRails:
  - name: ListLocalChangedFiles
    type: query
    dddOwner: LocalChangedFileSet
  - name: ValidateChangedFiles
    type: command
    dddOwner: ChangedFileValidationGate
  - name: SelectPrepushTypecheckScope
    type: query
    dddOwner: PrepushTypecheckScope
domainObjects:
  - name: LocalChangedFileSet
    type: read-model
    owner: CI governance
  - name: ChangedFileValidationGate
    type: policy
    owner: CI governance
  - name: PrepushTypecheckScope
    type: read-model
    owner: CI governance
fowlerSignals:
  - Duplicate change-detection logic
  - Hidden local state
  - False-positive readiness
  - Primitive git command scattering
architectureGuards:
  - node --test scripts/git-local-changes.test.cjs scripts/check-governance-changed-files.test.cjs scripts/check-feature-mechanization.test.cjs
cypressFlows:
  - not-applicable: CI governance script gate has no browser workflow.
completionGate:
  - node --test scripts/git-local-changes.test.cjs scripts/check-governance-changed-files.test.cjs scripts/check-feature-mechanization.test.cjs
  - pnpm docs:feature-mechanization:implementation
  - pnpm verify:prepush
redGreenCycles:
  - id: local-worktree-detection
    redTest: node --test scripts/git-local-changes.test.cjs
    expectedFailure: Existing changed-file gates return empty when branch diff is empty but unstaged or untracked files exist.
    patchSurfaces:
      - scripts/git-local-changes.cjs
      - scripts/check-changed.cjs
      - scripts/type-check-prepush.cjs
      - scripts/lint-markdown-changed.cjs
      - scripts/format-markdown-changed.cjs
      - scripts/docs-workboard-check-changed.cjs
      - scripts/fix-changed.cjs
      - scripts/qa-artifact-check.cjs
      - scripts/validate-arc-evidence-frontmatter.cjs
      - scripts/check-markdown-locations.cjs
      - tools/docs/check-filenames.ts
      - tools/docs/check-frontmatter.ts
    greenTest: node --test scripts/git-local-changes.test.cjs
  - id: implementation-manifest-untracked-symbols
    redTest: node --test scripts/check-feature-mechanization.test.cjs
    expectedFailure: Untracked implementation files are absent from the implementation diff and their new symbols can escape declaration.
    patchSurfaces:
      - scripts/check-feature-mechanization.cjs
      - scripts/check-feature-mechanization.test.cjs
    greenTest: node --test scripts/check-feature-mechanization.test.cjs
symbolDefaults: &ciSymbolDefaults
  dddOwner: LocalChangedFileSet
  cqRails:
    - ListLocalChangedFiles
    - ValidateChangedFiles
  fowlerSignals:
    - Duplicate change-detection logic
    - Hidden local state
    - False-positive readiness
  architectureGuard: node --test scripts/git-local-changes.test.cjs scripts/check-governance-changed-files.test.cjs scripts/check-feature-mechanization.test.cjs
  cypressCoverage: "not-applicable: CI governance script gate has no browser workflow."
  unitTests:
    - node --test scripts/git-local-changes.test.cjs scripts/check-governance-changed-files.test.cjs scripts/check-feature-mechanization.test.cjs
symbols:
  - <<: *ciSymbolDefaults
    name: toPosix
    path: scripts/git-local-changes.cjs
  - <<: *ciSymbolDefaults
    name: parseGitLines
    path: scripts/git-local-changes.cjs
  - <<: *ciSymbolDefaults
    name: defaultRunGitLines
    path: scripts/git-local-changes.cjs
  - <<: *ciSymbolDefaults
    name: safeGitLines
    path: scripts/git-local-changes.cjs
  - <<: *ciSymbolDefaults
    name: hasGitRef
    path: scripts/git-local-changes.cjs
  - <<: *ciSymbolDefaults
    name: hasUpstream
    path: scripts/git-local-changes.cjs
  - <<: *ciSymbolDefaults
    name: unique
    path: scripts/git-local-changes.cjs
  - <<: *ciSymbolDefaults
    name: resolveDiffBaseRefs
    path: scripts/git-local-changes.cjs
  - <<: *ciSymbolDefaults
    name: withPathspec
    path: scripts/git-local-changes.cjs
  - <<: *ciSymbolDefaults
    name: listLocalChangedFiles
    path: scripts/git-local-changes.cjs
  - <<: *ciSymbolDefaults
    name: toAbsoluteRepoPath
    path: scripts/git-local-changes.cjs
  - <<: *ciSymbolDefaults
    name: path
    path: scripts/git-local-changes.cjs
  - <<: *ciSymbolDefaults
    name: readLocalNameStatusDiff
    path: scripts/check-governance-changed-files.cjs
  - <<: *ciSymbolDefaults
    name: readUntrackedNameStatus
    path: scripts/check-governance-changed-files.cjs
  - <<: *ciSymbolDefaults
    name: readGitFileList
    path: scripts/generate-governance-file-component-index.cjs
  - <<: *ciSymbolDefaults
    name: getRepositoryFiles
    path: scripts/generate-governance-file-component-index.cjs
  - <<: *ciSymbolDefaults
    name: writeIfChanged
    path: scripts/generate-governance-file-component-index.cjs
  - <<: *ciSymbolDefaults
    name: repoRoot
    path: scripts/check-changed.cjs
  - <<: *ciSymbolDefaults
    name: prettierFiles
    path: scripts/check-changed.cjs
  - <<: *ciSymbolDefaults
    name: changed
    path: scripts/check-changed.cjs
  - <<: *ciSymbolDefaults
    name: existingEslintFiles
    path: scripts/check-changed.cjs
  - <<: *ciSymbolDefaults
    name: existingPrettierFiles
    path: scripts/check-changed.cjs
  - <<: *ciSymbolDefaults
    name: repoRoot
    path: scripts/type-check-prepush.cjs
  - <<: *ciSymbolDefaults
    name: path
    path: scripts/type-check-prepush.cjs
  - <<: *ciSymbolDefaults
    name: repoRoot
    path: scripts/lint-markdown-changed.cjs
  - <<: *ciSymbolDefaults
    name: repoRoot
    path: scripts/format-markdown-changed.cjs
  - <<: *ciSymbolDefaults
    name: repoRoot
    path: scripts/docs-workboard-check-changed.cjs
  - <<: *ciSymbolDefaults
    name: changedFiles
    path: scripts/docs-workboard-check-changed.cjs
  - <<: *ciSymbolDefaults
    name: path
    path: scripts/docs-workboard-check-changed.cjs
  - <<: *ciSymbolDefaults
    name: repoRoot
    path: scripts/fix-changed.cjs
  - <<: *ciSymbolDefaults
    name: changedFiles
    path: scripts/fix-changed.cjs
  - <<: *ciSymbolDefaults
    name: repoRoot
    path: scripts/qa-artifact-check.cjs
  - <<: *ciSymbolDefaults
    name: runGitLines
    path: scripts/qa-artifact-check.cjs
  - <<: *ciSymbolDefaults
    name: path
    path: scripts/qa-artifact-check.cjs
  - <<: *ciSymbolDefaults
    name: fs
    path: scripts/check-feature-mechanization.test.cjs
  - <<: *ciSymbolDefaults
    name: os
    path: scripts/check-feature-mechanization.test.cjs
  - <<: *ciSymbolDefaults
    name: path
    path: scripts/check-feature-mechanization.test.cjs
  - <<: *ciSymbolDefaults
    name: assert
    path: scripts/git-local-changes.test.cjs
  - <<: *ciSymbolDefaults
    name: test
    path: scripts/git-local-changes.test.cjs
  - <<: *ciSymbolDefaults
    name: require
    path: tools/docs/check-filenames.ts
  - <<: *ciSymbolDefaults
    name: require
    path: tools/docs/check-frontmatter.ts
testEvidence:
  - name: local changed file utility
    red: node --test scripts/git-local-changes.test.cjs
    green: node --test scripts/git-local-changes.test.cjs
    architectureGuard: node --test scripts/git-local-changes.test.cjs
    unitTests:
      - node --test scripts/git-local-changes.test.cjs
    negativeTests:
      - Branch diff empty but unstaged files exist.
      - Branch diff empty but untracked files exist.
  - name: feature implementation untracked symbols
    red: node --test scripts/check-feature-mechanization.test.cjs
    green: node --test scripts/check-feature-mechanization.test.cjs
    architectureGuard: node --test scripts/check-feature-mechanization.test.cjs
    unitTests:
      - node --test scripts/check-feature-mechanization.test.cjs
    negativeTests:
      - Untracked implementation files must be validated as added content.
```

## Root Cause

Several local gates used only `git diff origin/main...HEAD`. On a dirty
worktree with no local commit ahead of `origin/main`, that query is empty even
when unstaged and untracked files exist. The gate then reported a false skip.

## Closed Behavior

The local changed-file set is now the union of:

1. merge-base branch diff;
2. diff against the selected base ref;
3. staged tracked files;
4. unstaged tracked files;
5. untracked non-ignored files.

This makes local readiness checks fail closed before commit instead of waiting
for PR CI to discover omitted files.

## Replacement Map

| Old behavior                                           | Replacement                                                  |
| ------------------------------------------------------ | ------------------------------------------------------------ |
| Per-script `git diff origin/main...HEAD` logic         | Shared `listLocalChangedFiles()` query                       |
| Feature implementation guard ignored untracked files   | Untracked files are included and read as added content       |
| Governance changed-files gate saw only committed diffs | Local name-status diff includes worktree and untracked files |

## Invariants

- A clean branch with no worktree changes may skip changed-file-only gates.
- A dirty worktree must not skip changed-file-only gates.
- Untracked implementation files must be visible to feature mechanization.
- The fix must not relax lint, typecheck, ARC, docs, or governance rules.
