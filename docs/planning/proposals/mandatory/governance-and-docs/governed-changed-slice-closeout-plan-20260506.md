---
title: Governed Changed Slice Closeout Plan
status: Accepted
owner: Engineering / CI Governance / Docs
last_reviewed: 2026-05-06
planning_type: proposal
---

# Governed Changed Slice Closeout Plan

## Summary

This slice adds a small closeout helper so governed local changes do not rely on
an agent or contributor remembering the generated-doc, governance-hash,
workboard, diff-check, conflict-marker, and prepush sequence by hand.

The helper does not relax any gate. It runs the existing gates in a deterministic
order and records the planned sequence before execution.

`pnpm pr:closeout` layers the final PR lifecycle on top of that posture. It
keeps the commit step behind the repository commit helper and normal hooks,
then runs a single full pre-push gate after hook-managed formatting has settled
the index.

## Governing Sources

- `AGENTS.md`
- `docs/planning/status/governance-document-rule-inventory.md`
- `docs/guides/ai-work-protocol.md`
- `docs/guides/testing-and-ci-capabilities.md`
- `docs/architecture/command-query-rail-governance.md`
- `docs/architecture/fowler-opportunity-planning-governance.md`
- `docs/planning/state/planning-control-tower.md`

## Scope

In scope:

- add `pnpm closeout:changed`;
- add `pnpm pr:closeout` as the final PR closeout rail;
- plan generators from the local changed-file set;
- run `docs:sync`, workboard generation, governance regeneration,
  unstaged and staged `git diff --check`, conflict-marker scan, and
  `pnpm verify:prepush`;
- run commit-helper, normal hooks, one final `pnpm verify:prepush`, and
  optional push in a mechanically enforced order;
- register the closeout helper regression test in the prepush gate;
- add a runbook entry documenting usage and the untracked-doc caveat;
- prove the planner with `node --test scripts/closeout-changed.test.cjs`.

Out of scope:

- changing the semantics of existing verification commands;
- bypassing hooks or checks;
- creating PRs;
- modifying apps, packages, contracts, adapters, or workflows.

## Design Notes

`pnpm closeout:changed --dry-run` prints the changed files and planned steps.
`pnpm closeout:changed` executes them.

The governance regeneration block includes a final file-component and
fingerprint stabilization pass because some generated governance artifacts are
inputs to later governance outputs. The helper makes that fixed ordering
explicit instead of relying on memory.

## Feature Mechanization Manifest

```feature-mechanization
version: 1
featureId: GOVERNED-CHANGED-SLICE-CLOSEOUT
mechanizationStatus: implemented
noHumanDecisionsRemaining: true
implementationPlan: docs/planning/proposals/mandatory/governance-and-docs/governed-changed-slice-closeout-plan-20260506.md
componentGuides:
  - docs/runbooks/governed-changed-slice-closeout-20260506.md
userStories:
  - docs/runbooks/governed-changed-slice-closeout-20260506.md
  - docs/planning/proposals/mandatory/governance-and-docs/governed-changed-slice-closeout-plan-20260506.md
governingSources:
  - AGENTS.md
  - docs/planning/status/governance-document-rule-inventory.md
  - docs/guides/ai-work-protocol.md
  - docs/guides/testing-and-ci-capabilities.md
  - docs/architecture/command-query-rail-governance.md
  - docs/architecture/fowler-opportunity-planning-governance.md
allowedImplementationSurfaces:
  - package.json
  - scripts/closeout-changed.cjs
  - scripts/closeout-changed.test.cjs
  - scripts/pr-closeout.cjs
  - scripts/pr-closeout.test.cjs
  - docs/runbooks/governed-changed-slice-closeout-20260506.md
  - docs/runbooks/index.md
  - docs/guides/testing-and-ci-capabilities.md
  - docs/planning/proposals/mandatory/governance-and-docs/governed-changed-slice-closeout-plan-20260506.md
  - docs/planning/proposals/index.md
  - docs/planning/index.md
  - docs/planning/status/**
  - docs/.manifest.json
forbiddenImplementationSurfaces:
  - apps/**
  - packages/**
  - specs/**
  - .github/workflows/**
commandQueryRails:
  - name: BuildChangedSliceCloseoutPlan
    type: query
    dddOwner: ChangedSliceCloseoutPlan
  - name: RunChangedSliceCloseout
    type: command
    dddOwner: ChangedSliceCloseoutGate
  - name: ScanChangedFilesForConflictMarkers
    type: query
    dddOwner: ChangedTextFileSet
  - name: BuildPrCloseoutPlan
    type: query
    dddOwner: PrCloseoutPlan
  - name: RunPrCloseout
    type: command
    dddOwner: PrCloseoutGate
domainObjects:
  - name: ChangedSliceCloseoutPlan
    type: read-model
    owner: CI governance
  - name: ChangedSliceCloseoutGate
    type: policy
    owner: CI governance
  - name: ChangedTextFileSet
    type: read-model
    owner: CI governance
  - name: PrCloseoutPlan
    type: read-model
    owner: CI governance
  - name: PrCloseoutGate
    type: policy
    owner: CI governance
fowlerSignals:
  - Scripted Process
  - Single Source of Truth
  - Explicit Gate
  - Fail Fast
architectureGuards:
  - node --test scripts/closeout-changed.test.cjs
  - pnpm docs:feature-mechanization:implementation
cypressFlows:
  - not-applicable: CI governance helper has no browser workflow.
completionGate:
  - node --test scripts/closeout-changed.test.cjs
  - node --test scripts/pr-closeout.test.cjs
  - pnpm test:closeout-changed
  - pnpm test:pr-closeout
  - pnpm closeout:changed
  - pnpm pr:closeout chore ci "Mechanize PR closeout rail" --stage-all --dry-run
  - pnpm verify:prepush
redGreenCycles:
  - id: closeout-plan-contract
    redTest: node --test scripts/closeout-changed.test.cjs
    expectedFailure: closeout helper module does not exist yet.
    patchSurfaces:
      - scripts/closeout-changed.cjs
      - scripts/closeout-changed.test.cjs
      - package.json
    greenTest: node --test scripts/closeout-changed.test.cjs
  - id: governance-stabilization-pass
    redTest: pnpm closeout:changed
    expectedFailure: a single governance generation pass can leave file/component indexes stale.
    patchSurfaces:
      - scripts/closeout-changed.cjs
      - scripts/closeout-changed.test.cjs
      - docs/runbooks/governed-changed-slice-closeout-20260506.md
    greenTest: pnpm closeout:changed
  - id: pr-closeout-rail-order
    redTest: node --test scripts/pr-closeout.test.cjs
    expectedFailure: no PR closeout rail exists to enforce commit before the
      final pre-push gate.
    patchSurfaces:
      - scripts/pr-closeout.cjs
      - scripts/pr-closeout.test.cjs
      - package.json
    greenTest: node --test scripts/pr-closeout.test.cjs
  - id: pr-closeout-commit-argv
    redTest: node --test scripts/pr-closeout.test.cjs
    expectedFailure: Windows shell execution can split a commit subject with
      spaces before it reaches the commit helper.
    patchSurfaces:
      - scripts/pr-closeout.cjs
      - scripts/pr-closeout.test.cjs
    greenTest: node --test scripts/pr-closeout.test.cjs
  - id: pr-closeout-staged-prep-guard
    redTest: node --test scripts/pr-closeout.test.cjs
    expectedFailure: staged-files mode can omit generated outputs left
      unstaged by prep commands before commit.
    patchSurfaces:
      - scripts/pr-closeout.cjs
      - scripts/pr-closeout.test.cjs
      - docs/runbooks/governed-changed-slice-closeout-20260506.md
      - docs/guides/testing-and-ci-capabilities.md
    greenTest: node --test scripts/pr-closeout.test.cjs
  - id: pr-closeout-windows-pnpm-launcher
    redTest: pnpm pr:closeout chore ci "Guard staged PR closeout outputs" --stage-all --dry-run
    expectedFailure: Windows cannot reliably spawn pnpm.cmd with shell false
      in the agent execution environment.
    patchSurfaces:
      - scripts/pr-closeout.cjs
      - scripts/pr-closeout.test.cjs
    greenTest: node -e "const {runCommand}=require('./scripts/pr-closeout.cjs'); runCommand({id:'pnpm-version',command:'pnpm',args:['--version']});"
symbolDefaults: &closeoutSymbolDefaults
  dddOwner: ChangedSliceCloseoutGate
  cqRails:
    - BuildChangedSliceCloseoutPlan
    - RunChangedSliceCloseout
    - ScanChangedFilesForConflictMarkers
  fowlerSignals:
    - Scripted Process
    - Explicit Gate
    - Fail Fast
  architectureGuard: node --test scripts/closeout-changed.test.cjs
  cypressCoverage: "not-applicable: CI governance helper has no browser workflow."
  unitTests:
    - node --test scripts/closeout-changed.test.cjs
prSymbolDefaults: &prCloseoutSymbolDefaults
  dddOwner: PrCloseoutGate
  cqRails:
    - BuildPrCloseoutPlan
    - RunPrCloseout
  fowlerSignals:
    - Scripted Process
    - Explicit Gate
    - Fail Fast
  architectureGuard: node --test scripts/pr-closeout.test.cjs
  cypressCoverage: "not-applicable: CI governance helper has no browser workflow."
  unitTests:
    - node --test scripts/pr-closeout.test.cjs
symbols:
  - <<: *closeoutSymbolDefaults
    name: fs
    path: scripts/closeout-changed.cjs
  - <<: *closeoutSymbolDefaults
    name: path
    path: scripts/closeout-changed.cjs
  - <<: *closeoutSymbolDefaults
    name: repoRoot
    path: scripts/closeout-changed.cjs
  - <<: *closeoutSymbolDefaults
    name: GOVERNANCE_REGEN_STEPS
    path: scripts/closeout-changed.cjs
  - <<: *closeoutSymbolDefaults
    name: GOVERNANCE_STABILIZE_STEPS
    path: scripts/closeout-changed.cjs
  - <<: *closeoutSymbolDefaults
    name: normalizeChangedFiles
    path: scripts/closeout-changed.cjs
  - <<: *closeoutSymbolDefaults
    name: hasDocsChange
    path: scripts/closeout-changed.cjs
  - <<: *closeoutSymbolDefaults
    name: hasLaneRegistryChange
    path: scripts/closeout-changed.cjs
  - <<: *closeoutSymbolDefaults
    name: hasWorkspaceSourceChange
    path: scripts/closeout-changed.cjs
  - <<: *closeoutSymbolDefaults
    name: pushStepOnce
    path: scripts/closeout-changed.cjs
  - <<: *closeoutSymbolDefaults
    name: listCloseoutChangedFiles
    path: scripts/closeout-changed.cjs
  - <<: *closeoutSymbolDefaults
    name: buildCloseoutPlan
    path: scripts/closeout-changed.cjs
  - <<: *closeoutSymbolDefaults
    name: commandLabel
    path: scripts/closeout-changed.cjs
  - <<: *closeoutSymbolDefaults
    name: isProbablyText
    path: scripts/closeout-changed.cjs
  - <<: *closeoutSymbolDefaults
    name: readChangedTextFiles
    path: scripts/closeout-changed.cjs
  - <<: *closeoutSymbolDefaults
    name: assertNoConflictMarkers
    path: scripts/closeout-changed.cjs
  - <<: *closeoutSymbolDefaults
    name: runCommand
    path: scripts/closeout-changed.cjs
  - <<: *closeoutSymbolDefaults
    name: executeCloseoutPlan
    path: scripts/closeout-changed.cjs
  - <<: *closeoutSymbolDefaults
    name: parseArgs
    path: scripts/closeout-changed.cjs
  - <<: *closeoutSymbolDefaults
    name: main
    path: scripts/closeout-changed.cjs
  - <<: *closeoutSymbolDefaults
    name: assert
    path: scripts/closeout-changed.test.cjs
  - <<: *closeoutSymbolDefaults
    name: fs
    path: scripts/closeout-changed.test.cjs
  - <<: *closeoutSymbolDefaults
    name: os
    path: scripts/closeout-changed.test.cjs
  - <<: *closeoutSymbolDefaults
    name: path
    path: scripts/closeout-changed.test.cjs
  - <<: *closeoutSymbolDefaults
    name: test
    path: scripts/closeout-changed.test.cjs
  - <<: *prCloseoutSymbolDefaults
    name: fs
    path: scripts/pr-closeout.cjs
  - <<: *prCloseoutSymbolDefaults
    name: path
    path: scripts/pr-closeout.cjs
  - <<: *prCloseoutSymbolDefaults
    name: repoRoot
    path: scripts/pr-closeout.cjs
  - <<: *prCloseoutSymbolDefaults
    name: normalizeChangedFiles
    path: scripts/pr-closeout.cjs
  - <<: *prCloseoutSymbolDefaults
    name: hasDocsChange
    path: scripts/pr-closeout.cjs
  - <<: *prCloseoutSymbolDefaults
    name: hasWorkspaceSourceChange
    path: scripts/pr-closeout.cjs
  - <<: *prCloseoutSymbolDefaults
    name: hasGovernanceRefreshChange
    path: scripts/pr-closeout.cjs
  - <<: *prCloseoutSymbolDefaults
    name: pushStepOnce
    path: scripts/pr-closeout.cjs
  - <<: *prCloseoutSymbolDefaults
    name: quoteLabelArg
    path: scripts/pr-closeout.cjs
  - <<: *prCloseoutSymbolDefaults
    name: commandLabel
    path: scripts/pr-closeout.cjs
  - <<: *prCloseoutSymbolDefaults
    name: commitArgs
    path: scripts/pr-closeout.cjs
  - <<: *prCloseoutSymbolDefaults
    name: buildPrCloseoutPlan
    path: scripts/pr-closeout.cjs
  - <<: *prCloseoutSymbolDefaults
    name: resolveExecutable
    path: scripts/pr-closeout.cjs
  - <<: *prCloseoutSymbolDefaults
    name: resolvePnpmCliPath
    path: scripts/pr-closeout.cjs
  - <<: *prCloseoutSymbolDefaults
    name: resolveCommandInvocation
    path: scripts/pr-closeout.cjs
  - <<: *prCloseoutSymbolDefaults
    name: listPrCloseoutUnstagedFiles
    path: scripts/pr-closeout.cjs
  - <<: *prCloseoutSymbolDefaults
    name: assertNoUnstagedChanges
    path: scripts/pr-closeout.cjs
  - <<: *prCloseoutSymbolDefaults
    name: runCommand
    path: scripts/pr-closeout.cjs
  - <<: *prCloseoutSymbolDefaults
    name: executePrCloseoutPlan
    path: scripts/pr-closeout.cjs
  - <<: *prCloseoutSymbolDefaults
    name: defaultRunGitLines
    path: scripts/pr-closeout.cjs
  - <<: *prCloseoutSymbolDefaults
    name: listPrCloseoutChangedFiles
    path: scripts/pr-closeout.cjs
  - <<: *prCloseoutSymbolDefaults
    name: listPrCloseoutStagedFiles
    path: scripts/pr-closeout.cjs
  - <<: *prCloseoutSymbolDefaults
    name: parseArgs
    path: scripts/pr-closeout.cjs
  - <<: *prCloseoutSymbolDefaults
    name: printUsage
    path: scripts/pr-closeout.cjs
  - <<: *prCloseoutSymbolDefaults
    name: main
    path: scripts/pr-closeout.cjs
  - <<: *prCloseoutSymbolDefaults
    name: test
    path: scripts/pr-closeout.test.cjs
  - <<: *prCloseoutSymbolDefaults
    name: assert
    path: scripts/pr-closeout.test.cjs
  - <<: *prCloseoutSymbolDefaults
    name: fs
    path: scripts/pr-closeout.test.cjs
  - <<: *prCloseoutSymbolDefaults
    name: path
    path: scripts/pr-closeout.test.cjs
  - <<: *prCloseoutSymbolDefaults
    name: buildPrCloseoutPlan
    path: scripts/pr-closeout.test.cjs
  - <<: *prCloseoutSymbolDefaults
    name: commandLabel
    path: scripts/pr-closeout.test.cjs
  - <<: *prCloseoutSymbolDefaults
    name: executePrCloseoutPlan
    path: scripts/pr-closeout.test.cjs
  - <<: *prCloseoutSymbolDefaults
    name: parseArgs
    path: scripts/pr-closeout.test.cjs
  - <<: *prCloseoutSymbolDefaults
    name: resolveCommandInvocation
    path: scripts/pr-closeout.test.cjs
  - <<: *prCloseoutSymbolDefaults
    name: stepIds
    path: scripts/pr-closeout.test.cjs
  - <<: *prCloseoutSymbolDefaults
    name: indexOf
    path: scripts/pr-closeout.test.cjs
  - <<: *prCloseoutSymbolDefaults
    name: commit
    path: scripts/pr-closeout.test.cjs
```
