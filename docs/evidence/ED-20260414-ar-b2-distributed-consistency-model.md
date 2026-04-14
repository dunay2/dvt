---
title: Publish the DVT distributed consistency model
status: Accepted
date: 2026-04-14
owners:
  - docs
  - apps/api
  - packages/@dvt/engine
  - packages/@dvt/adapter-postgres
  - apps/outbox-worker
arc_level: ARC-1
breaking: false
code_refs:
  - docs/architecture/system/distributed-consistency-model.md
  - docs/runbooks/backend-mvp-control-plane-runbook-20260329.md
  - docs/runbooks/outbox-worker-g5.md
  - docs/planning/state/agent-lane-b.yaml
evidence:
  tests:
    - pnpm exec markdownlint-cli2 "docs/architecture/system/distributed-consistency-model.md" "docs/planning/closeouts/20260414-ar-b2-distributed-consistency-model-closeout.md" "docs/evidence/ED-20260414-ar-b2-distributed-consistency-model.md" "docs/runbooks/backend-mvp-control-plane-runbook-20260329.md" "docs/runbooks/outbox-worker-g5.md" "docs/planning/state/domain-status-board.md" "docs/architecture/system-delivery-status.md" --ignore-path .markdownlintignore --config .markdownlint-cli2.jsonc
    - pnpm docs:workboard:generate
    - pnpm docs:sync
    - pnpm verify:prepush
---

## Summary

This slice closes `AR-B2` by publishing one canonical architecture document for
the DVT distributed consistency model.

Before this change, the system already implemented the right pieces:

- DVT-owned lifecycle semantics in the engine;
- append-only event authority in Postgres;
- atomic bootstrap and append-plus-outbox transactions;
- caller-visible snapshot freshness classification;
- provider-live enrichment separated from canonical reads;
- standalone outbox delivery ownership and monitoring.

What was missing was one place that said which subsystem is authoritative while
cross-domain windows are open.

## Resolution

The new architecture page maps the shipped consistency domains and windows for:

1. `startRun` on both estimated-ref and non-estimated paths;
2. event append versus caller-visible snapshot freshness;
3. canonical snapshot versus provider-live enrichment;
4. outbox enqueue, claim, delivery, retry, and dead-letter;
5. orphan intent detection and reconciliation.

Each window now names the current threshold source, failure mode, and operator
runbook route.

## Operational outcome

- Operators now have one canonical answer for "what is authoritative right now?"
- The repo now states the external delivery guarantee as at-least-once instead
  of leaving that to code archaeology.
- Non-goals are explicit: no global linearizability, no cross-domain atomic
  commit, no exactly-once downstream delivery, and no rollback of already-run
  external effects.
