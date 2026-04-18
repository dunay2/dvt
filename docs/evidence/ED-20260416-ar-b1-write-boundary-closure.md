---
title: Close AR-B1 run-status write-boundary validation
status: Accepted
date: 2026-04-16
owners:
  - packages/@dvt/run-domain
  - packages/@dvt/engine
  - packages/@dvt/adapter-postgres
  - docs
arc_level: ARC-1
breaking: false
code_refs:
  - packages/@dvt/run-domain/src/applyRunEvent.ts
  - packages/@dvt/engine/src/state/InMemoryRunStateStore.ts
  - packages/@dvt/adapter-postgres/src/PostgresRunStateCoordinator.ts
  - docs/planning/state/agent-lane-b.yaml
  - docs/planning/closeouts/20260416-ar-b1-write-boundary-closeout.md
evidence:
  tests:
    - pnpm --filter @dvt/run-domain test -- --run test/applyRunEvent.test.ts
    - pnpm --filter @dvt/engine test -- --run test/state/InMemoryRunStateStore.appendInvariants.test.ts
    - pnpm --filter @dvt/adapter-postgres test -- --run test/smoke.test.ts
    - pnpm exec markdownlint-cli2 "docs/planning/closeouts/20260416-ar-b1-write-boundary-closeout.md" "docs/evidence/ED-20260416-ar-b1-write-boundary-closure.md" "docs/planning/state/agent-lane-b.yaml" --ignore-path .markdownlintignore --config .markdownlint-cli2.jsonc
    - pnpm docs:workboard:generate
    - pnpm docs:sync
    - pnpm verify:prepush
---

## Summary

This evidence closes `AR-B1` and `AR-B1-E` by proving the run-status
state-machine write-boundary hardening is complete and verifiable.

## Outcome

- Illegal run/step transition sequences are rejected at append time.
- Guards are represented in domain policy and wired in in-memory and Postgres
  append boundaries.
- Lane-B planning state now reflects accepted closure rather than an open gap.
