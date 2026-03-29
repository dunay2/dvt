---
title: ED-20260329 Lane C RBAC operation-level closeout
status: Accepted
date: 2026-03-29
owners:
  - dvt-api
  - docs
arc_level: ARC-1
breaking: false
code_refs:
  - apps/api/test/integration/protectedRuntime.integration.test.ts
  - docs/runbooks/backend-mvp-control-plane-runbook-20260329.md
  - docs/planning/state/agent-lane-c.yaml
evidence:
  - operation-level action matrix is explicit in MVP runbook
  - integration negative coverage proves ACTION_NOT_GRANTED for cancel and signal action splits
---

# ED-20260329 Lane C RBAC operation-level closeout

## Decision captured

Lane C task `RBAC at operation level` is closed by locking endpoint-level
authorization boundaries and proving denied-path behavior with real
integration coverage.

## What this evidence proves

1. Operation-level permissions are explicit and documented for runtime routes.
2. `/runs/:runId/cancel` denies callers without `run:cancel`.
3. `/runs/:runId/signal` (PAUSE/RESUME path) denies callers without
   `run:signal`.
4. Runtime remains tenant-scoped and permission-based without introducing new
   feature depth.

## Validation commands

```bash
pnpm --filter dvt-api test
pnpm --filter dvt-api test:integration
pnpm verify:prepush
```
