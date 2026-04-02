---
slice: rc-c2-preflight-and-log-triage-rollout
date: 2026-04-01
author: AI (GPT-5)
last_reviewed: 2026-04-01
---

# Closeout: RC-C2 preflight and log-first triage rollout

## Think-First Analysis

- Problem summary:
  Lane C already had a cost/efficiency review, but the operational recipe was
  split across narrative review text, contribution notes, and script comments.
- Root cause:
  no single shared entrypoint existed for diagnostics + slice checks +
  `verify:prepush` + first-red log extraction, and no structured record existed
  to prove adoption over time.
- Constraints and invariants:
  - `AGENTS.md` requires canonical governance, no hidden shortcuts, and
    `pnpm verify:prepush` in the validation baseline
  - `docs/guides/ai-work-protocol.md` requires planning updates and truthful
    closeout evidence
  - `docs/planning/state/planning-control-tower.md` requires the lane registry
    plus linked proposal/closeout surfaces to stay aligned
- Options considered:
  - keep the review as the only playbook
  - add a new standalone preflight script
  - extend `hygiene.ps1` and back it with a testable helper plus structured log
- Selected option and rationale:
  extend `hygiene.ps1` to preserve one operator entrypoint and move GitHub check
  parsing into a reusable Node helper.
- Rejected alternatives:
  - docs-only: not enough operational force
  - second script: duplicate surface and adoption drift

## Pre-Implementation Brief

- Mode: Full
- Scope:
  `scripts/hygiene.ps1`, a new `tools/ci` helper and tests, planning/docs
  surfaces for RC-C2, and the shared guide.
- Expected outcome:
  repo-ready shared preflight and log-first triage workflow exists, Lane C task
  state moves out of `queued`, and adoption can be measured truthfully.
- Risks and mitigations:
  - `gh` command variability
    - mitigated by keeping parsing in one helper and testing the classifier
  - fake closure pressure
    - mitigated by leaving the task in `review` until the 3-cycle rule is met
- Out-of-scope:
  - new CI gates
  - automatic GitHub metric harvesting
  - marking `RC-C2` done in this rollout slice
- Validation plan:
  helper unit tests, hygiene smoke runs, docs/planning regeneration, and
  `pnpm verify:prepush`

## Implementation Log

- Extended `scripts/hygiene.ps1` with:
  - `-Preflight`
  - `-SliceCommand "<command>"`
  - `-PrCheckSummary`
  - `-LogFirstTriage`
- Kept the old default diagnostic mode intact and retained `-RunSliceChecks` as
  a legacy convenience path.
- Added `tools/ci/pr-check-triage.mjs` to:
  - classify PR checks into failed/pending/successful/skipped/external
  - ignore non-GitHub Actions checks for first-failure selection
  - select the first failing GitHub Actions job deterministically
  - extract a compact failure snippet from `gh run view --log-failed`
- Added `tools/ci/pr-check-triage.test.mjs` for the helper logic.
- Hardened `scripts/hygiene.ps1` after smoke validation exposed:
  - native stderr from `git fetch` being treated as a terminating PowerShell
    error
  - `$Args` strict-mode collisions inside scriptblock closures
  - single-line `git cherry` output breaking `.Count` under strict mode
- Published the canonical operator guide:
  `docs/guides/pr-preflight-and-ci-triage.md`
- Published structured adoption tracking:
  - `docs/planning/status/ai-efficiency-adoption-log.yaml`
  - `docs/planning/status/ai-efficiency-adoption-status.md`
- Updated `RC-C2` in Lane C to `review` with evidence refs pointing to the new
  operational surfaces.

## Validation

- `node --test tools/ci/pr-check-triage.test.mjs`
  - passed
- `pnpm test:ci-tools`
  - passed
- `powershell -ExecutionPolicy Bypass -File .\scripts\hygiene.ps1 -BaseBranch main`
  - failed before the script hardening due stderr promotion inside
    `Invoke-Git`
- `powershell -ExecutionPolicy Bypass -File .\scripts\hygiene.ps1 -BaseBranch main -PrCheckSummary`
  - failed before the script hardening for the same reason
- `powershell -ExecutionPolicy Bypass -File .\scripts\hygiene.ps1 -BaseBranch main -LogFirstTriage`
  - failed before the script hardening for the same reason
- `powershell -ExecutionPolicy Bypass -File .\scripts\hygiene.ps1 -BaseBranch main -SkipFetch`
  - passed
- `powershell -ExecutionPolicy Bypass -File .\scripts\hygiene.ps1 -BaseBranch main -SkipFetch -PrCheckSummary`
  - passed; reported `No pull request found for the selected branch.`
- `powershell -ExecutionPolicy Bypass -File .\scripts\hygiene.ps1 -BaseBranch main -SkipFetch -LogFirstTriage`
  - passed; reported `No pull request found for the selected branch.`
- `powershell -ExecutionPolicy Bypass -File .\scripts\hygiene.ps1 -BaseBranch main -SkipFetch -Preflight`
  - passed
- `powershell -ExecutionPolicy Bypass -File .\scripts\hygiene.ps1 -BaseBranch main -SkipFetch -Preflight -SliceCommand "pnpm test:ci-tools"`
  - passed
- `pnpm docs:sync`
  - passed
- `pnpm docs:planning:lanes:generate`
  - passed
- `pnpm docs:workboard:generate`
  - passed
- `pnpm verify:prepush`
  - passed

Validation note:

- the default fetch path still surfaces a real local repo-state issue in this
  workspace (`cannot lock ref 'refs/remotes/origin/refactor/api-dhm-ws1-command-parser'`)
  that is outside the RC-C2 implementation slice
- RC-C2 workflow validation therefore used `-SkipFetch` for the final smoke
  commands so the new preflight/triage behavior could be verified independently
  of that existing ref-lock condition

## Current Closure State

This rollout slice is implemented, but `RC-C2` is not yet done.

The remaining closure work is operational, not structural:

- log 3 consecutive Lane C PR cycles in the YAML registry
- show `used_hygiene_preflight = true`
- show `used_verify_prepush_before_push = true`
- show `first_red_triage_mode = log_first` on any red cycle
- meet or exceed 20% round reduction against the review baseline

## Debt Introduced

- No new debt entry created.
- No rules, hooks, or checks were disabled.
- No second preflight tool was introduced.
- No fake adoption evidence or placeholder cycle data was added.
