---
title: ED-20260329 MVP-C1 backend control-plane runbook
status: Accepted
date: 2026-03-29
owners:
  - docs
  - dvt-api
arc_level: ARC-1
breaking: false
code_refs:
  - docs/runbooks/backend-mvp-control-plane-runbook-20260329.md
  - docs/planning/state/agent-lane-c.yaml
  - docs/planning/proposals/mvp-backend-operability-baseline-roadmap-20260329.md
evidence:
  tests:
    - lane C MVP-C1 moved to review with explicit closure target
    - runbook defines bootstrap, diagnose, daily operations, and fallback boundaries
    - roadmap scope aligns readiness endpoint as conditional by DVT_READYZ_ENABLED flag
---

# ED-20260329 MVP-C1 backend control-plane runbook

## Decision captured

`MVP-C1` was advanced from implementation to review by shipping a minimum
operator runbook for the current backend MVP control-plane.

## What this evidence proves

1. Runbook documents current runtime command/query surface only.
2. Readiness exposure is explicit and conditional (`DVT_READYZ_ENABLED=true`).
3. Operational usage is covered for bootstrap, daily checks, and diagnosis.
4. Fallback and out-of-scope boundaries are explicit to prevent false promises.

## Validation commands

```bash
pnpm docs:workboard:generate
pnpm docs:sync
pnpm verify:prepush
```
