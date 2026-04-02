---
title: PR Preflight And CI Triage
status: Active
owner: Product / Architecture / Delivery / Docs
last_reviewed: 2026-04-02
---

# PR Preflight And CI Triage

Operational guide for the path:

`local work -> prepush -> PR -> CI -> green`

Use this guide for implementation slices and PR-green recovery work.

## Governing Baseline

- `AGENTS.md`
- `docs/guides/ai-work-protocol.md`
- `docs/planning/state/planning-control-tower.md`
- `docs/planning/reviews/20260328-lane-c-ai-efficiency-and-cost-review.md`
- `docs/planning/reviews/20260330-ci-prepush-pr-process-observations.md`

## Standard Flow

1. Run local diagnostics and branch hygiene:
   - `powershell -ExecutionPolicy Bypass -File .\scripts\hygiene.ps1 -BaseBranch main`
2. Run slice validations (package-level tests/build/typecheck for touched scope).
3. Run repository gate before push:
   - `pnpm verify:prepush`
4. Push and open/update PR.
5. If CI is red, use log-first triage:
   - extract failed job logs first
   - patch root cause
   - rerun only required checks

## First-Red Triage Rule

Do not start by polling loops.

Start with failed-job extraction first, then decide the minimal rerun set.

## Generated Docs Rule In PR Flow

If the slice touches planning/docs structure or workspace structure, run required generators before push:

- `pnpm docs:sync`
- `pnpm docs:workboard:generate` (if lane/workboard sources changed)
- `pnpm docs:status:generate` (when workspace source sets changed)

Then run `pnpm verify:prepush` again.

## RC-C2 Intake Rule (Operational Friction)

When a cycle exposes repeated friction, capture synthesis in canonical review surface:

- `docs/planning/reviews/20260402-rc-c2-operational-friction-intake-review.md`

Use local logs only as input material (for example under `tmp/operational-logs/`).
Do not publish local logs directly under canonical `docs/planning/status/`.

## Completion Signal

A cycle is considered clean when:

- preflight ran before push
- `pnpm verify:prepush` passed
- first-red diagnosis used failed-job logs first (if red occurred)
- required planning surfaces were synchronized when applicable
