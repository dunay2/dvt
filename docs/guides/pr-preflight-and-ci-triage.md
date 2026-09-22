---
title: PR Preflight And CI Triage
status: Active
owner: Product / Architecture / Delivery / Docs
last_reviewed: 2026-09-17
---

# PR Preflight And CI Triage

Operational guide for the path:

`local work -> prepush -> PR -> CI -> green`

Use this guide for implementation slices and PR-green recovery work.

## Governing Baseline

- `AGENTS.md`
- `docs/guides/ai-work-protocol.md`
- `docs/planning/status/governance-document-rule-inventory.md`
- `docs/planning/reviews/ci-and-delivery/20260330-ci-prepush-pr-process-observations.md`

## Standard Flow

1. Run local diagnostics and branch hygiene:
   - `powershell -ExecutionPolicy Bypass -File .\scripts\hygiene.ps1 -BaseBranch main`
2. Run slice validations (package-level tests/build/typecheck for touched scope).
3. Run repository gate before push:
   - `pnpm verify:prepush`
4. Push and open/update PR.
   - The pre-push hook re-enters `verify:prepush -- --hook`. When the same
     `HEAD` and local changed-file fingerprint already passed the manual gate,
     the hook skips the duplicate changed-slice run. If the tree changed, it
     runs the gate again.
5. If CI is red, use log-first triage:
   - extract failed job logs first
   - patch root cause
   - rerun only required checks

Before merging, run `pnpm docs:feature-mechanization:implementation` against the
existing local Planning DB with explicit `GIT_BASE` and `GIT_HEAD` commit SHAs
and a clean worktree. Record both SHAs, the command and result on the PR. Repeat
when either SHA changes; a cached pre-push stamp is not fresh DB evidence.
Unavailable DB or invalid comparison evidence blocks integration. This
[single-team boundary](../planning/proposals/mandatory/governance-and-docs/feature-mechanization-db-first-read-model-plan-20260605.md#single-team-validation-boundary)
is a local operator obligation, not a check independently enforced by GitHub.

## Conflict Triage And Cleanup Safety

Classify each conflicted file by its current owner and intended change before
choosing either side or resolving it manually. Do not apply a bulk side selection
without checking what it discards. After resolution, scan for conflict markers,
run the affected tests, and follow the commit and validation sequence in
`AGENTS.md` before push.

Branch diagnostics do not authorize deletion. Destructive cleanup remains an
explicit opt-in operation with the confirmation supported by `scripts/hygiene.ps1`;
never infer permission from a branch being reported as superseded.

## First-Red Triage Rule

Do not start by polling loops.

Start with failed-job extraction first, then decide the minimal rerun set.

## Generated Docs Rule In PR Flow

If the slice touches planning/docs structure or workspace structure, run required generators before push:

- `pnpm docs:sync`
- `pnpm docs:status:generate --code-state-only` (DB-free local inventory when
  workspace source sets changed)
- `pnpm docs:publish` only when the PR requires explicit DB-backed publication
  acceptance; never commit the generated publication tree

Then run `pnpm verify:prepush` again.

## RC-C2 Intake Rule (Operational Friction)

When a cycle exposes repeated friction, capture synthesis in canonical review surface:

- `docs/planning/reviews/ci-and-delivery/20260402-rc-c2-operational-friction-intake-review.md`

Use local logs only as input material (for example under `tmp/operational-logs/`).
Do not publish local logs directly under canonical `docs/planning/status/`.

## Completion Signal

A cycle is considered clean when:

- preflight ran before push
- `pnpm verify:prepush` passed
- first-red diagnosis used failed-job logs first (if red occurred)
- required planning surfaces were synchronized when applicable
