---
title: ROADMAP-G5_OUTBOX_WORKER v4
status: Draft
owner: architecture
last_reviewed: 2026-03-08
---

# ROADMAP-G5_OUTBOX_WORKER v4

## G5.1 — Extraction and standalone runtime MVP

Deliver:

- new package `packages/@dvt/outbox-worker`,
- extracted contracts,
- standalone runtime with `run()`,
- PostgreSQL polling store adapter,
- `p-limit`-based bounded concurrency,
- metrics and health endpoints,
- migration wrapper for old worker.

Acceptance:

- canary topic runs only on standalone worker,
- no same-topic dual-active ownership,
- crash-window duplicate delivery test passes.

## G5.2 — Ordering lanes

Deliver:

- lane lease table,
- lane claim queries,
- serial processing inside lane,
- lane metrics,
- topic ordering configuration.

Acceptance:

- same lane never processes concurrently on two workers,
- sequence order preserved within a lane in integration tests.

## G5.3 — Operational hardening

Deliver:

- full retry/backoff policy,
- dead-letter tooling,
- lag dashboards,
- wake-up source via `LISTEN/NOTIFY`,
- security hardening and least-privilege deployment.

Acceptance:

- worker remains healthy across transient DB interruptions,
- lag metrics and health semantics are documented and operational.

## G5.4 — CDC shadow path

Deliver:

- topic delivery mode registry,
- CDC shadow validation for selected topic,
- comparison tooling for count/lag/key preservation,
- explicit cutover runbook.

Acceptance:

- one topic can run polling live + CDC shadow without production duplicate side
  effects,
- topic ownership switch is reversible and observable.
