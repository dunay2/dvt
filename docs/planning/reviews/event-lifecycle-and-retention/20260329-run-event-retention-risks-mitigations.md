---
title: Risks And Mitigations - Run Event Retention And Archiving
status: Draft
owner: Architecture / Runtime / QA
last_reviewed: 2026-04-17
planning_type: review
---

# Risks And Mitigations

## Fowler Hard QA - DDD / SOLID

Critical review of the retention and event-archiving slice in
`outbox-worker`, using DDD and SOLID principles with a focus on risks,
mitigations, and quality controls.

## Risk 1: workload and I/O spikes

**Mitigations**

- configurable execution intervals (`DVT_RUN_EVENT_RETENTION_INTERVAL_MS`)
- bounded batch size and concurrency control
- recommended execution outside peak hours
- observability for duration and failure metrics

## Risk 2: data loss or archive corruption

**Mitigations**

- integrity verification through SHA256 checksums and manifest files
- structured logs and failure metrics
- fail-soft policy so one failed unit does not stop the full cycle
- integration tests and failure simulation

## Risk 3: unsafe production configuration

**Mitigations**

- strict validation in the env loader, including rejection of `file://` in
  production
- tests that reject unsafe configurations
- visible documentation in `.env.example` and the governing ADR set

## Risk 4: no real deletion yet, only data accumulation relief

**Mitigations**

- this slice only archives; deletion is intentionally deferred to `G5-PR2`
- monitor table growth and alert on size increase
- QA check: verify that archiving does not delete hot-store data prematurely

## Risk 5: no operational restore flow yet

**Mitigations**

- restore interfaces (`RunArchiveRestorer`) are already designed
- QA check: verify that archived data can be restored manually
- next phase: automate and test restore paths

## Risk 6: regressions or impact on the main worker

**Mitigations**

- retention runtime is fully isolated and opt-in
- integration tests cover clean startup and shutdown without interfering with
  the main worker
- QA check: validate that enabling or disabling retention does not affect event
  delivery

## Risk 7: weak observability and alerting

**Mitigations**

- structured logs and metrics for archived and failed units
- QA check: simulate failure and verify that logs and alerts are emitted
- future plan: integrate with alerting systems such as Prometheus or Sentry

## Risk 8: compliance posture not fully closed

**Mitigations**

- explicit and documented retention policies, with 90-day hot retention as the
  baseline
- QA check: verify that data is not retained beyond the configured period
- next phase: implement redaction and erasure support for GDPR-like needs

## Fowler Hard QA - DDD / SOLID Summary

- **Separated domain:** retention and archiving logic lives in
  `@dvt/state-store`, not in the worker.
- **Ports and adapters:** domain, adapter, and runtime concerns are clearly
  separated.
- **SRP:** each class has one responsibility such as scheduler, coordinator,
  exporter, or deleter.
- **Opt-in and debt-free:** the feature is opt-in with no stubs or hidden
  bypasses.
- **Test coverage:** unit and integration coverage exists for wiring, failure
  handling, and env validation.
- **Governance:** the slice aligns with ADRs and repository closeout rules for
  no debt, no stubs, and validation evidence.
