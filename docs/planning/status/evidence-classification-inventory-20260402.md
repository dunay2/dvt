---
title: Evidence Classification Inventory 20260402
status: Review
owner: Docs / Architecture / Delivery
last_reviewed: 2026-04-02
planning_type: status
---

# Evidence Classification Inventory 20260402

## Purpose

Phase 2 inventory pass for the evidence IA proposal. This document classifies every current
`docs/evidence/ED-*.md` artifact into exactly one `evidence_class` without moving files yet.

## Baseline

- Total evidence files classified: `48`
- Class counts: `critical=39`, `supporting=5`, `context=4`, `archive=0`
- Phase posture: metadata-only classification (`evidence_class`) with no folder moves

## Inventory Matrix

| Evidence File                                                          | Class        | Phase 3 Target Path                                                                           | Phase 2 Action         | Classification Basis                            |
| ---------------------------------------------------------------------- | ------------ | --------------------------------------------------------------------------------------------- | ---------------------- | ----------------------------------------------- |
| `ED-20260304-compiledcoderef-ownership.md`                             | `critical`   | `docs/evidence/critical/ED-20260304-compiledcoderef-ownership.md`                             | `keep-in-place-phase2` | Primary acceptance or ARC-relevant proof        |
| `ED-20260304-g3-intentstore-postgres-reconciler.md`                    | `critical`   | `docs/evidence/critical/ED-20260304-g3-intentstore-postgres-reconciler.md`                    | `keep-in-place-phase2` | Primary acceptance or ARC-relevant proof        |
| `ED-20260304-temporal-lookup-run-ref.md`                               | `critical`   | `docs/evidence/critical/ED-20260304-temporal-lookup-run-ref.md`                               | `keep-in-place-phase2` | Primary acceptance or ARC-relevant proof        |
| `ED-20260308-g6-us-g6-1-facet-contract-surface.md`                     | `critical`   | `docs/evidence/critical/ED-20260308-g6-us-g6-1-facet-contract-surface.md`                     | `keep-in-place-phase2` | Primary acceptance or ARC-relevant proof        |
| `ED-20260308-g6-us-g6-2-lineage-contract-artifacts.md`                 | `critical`   | `docs/evidence/critical/ED-20260308-g6-us-g6-2-lineage-contract-artifacts.md`                 | `keep-in-place-phase2` | Primary acceptance or ARC-relevant proof        |
| `ED-20260308-temporal-operational-close-out.md`                        | `critical`   | `docs/evidence/critical/ED-20260308-temporal-operational-close-out.md`                        | `keep-in-place-phase2` | Primary acceptance or ARC-relevant proof        |
| `ED-20260311-execution-core-assessment.md`                             | `context`    | `docs/evidence/context/ED-20260311-execution-core-assessment.md`                              | `keep-in-place-phase2` | Inventory/rationale context, not closure anchor |
| `ED-20260312-g5-canary-local-docker.md`                                | `supporting` | `docs/evidence/supporting/ED-20260312-g5-canary-local-docker.md`                              | `keep-in-place-phase2` | Validation support, not sole release gate       |
| `ED-20260312-g6-golden-schema-closeout.md`                             | `critical`   | `docs/evidence/critical/ED-20260312-g6-golden-schema-closeout.md`                             | `keep-in-place-phase2` | Primary acceptance or ARC-relevant proof        |
| `ED-20260312-g8-arch-tests-engine-wiring.md`                           | `critical`   | `docs/evidence/critical/ED-20260312-g8-arch-tests-engine-wiring.md`                           | `keep-in-place-phase2` | Primary acceptance or ARC-relevant proof        |
| `ED-20260314-g9-step-type-registry-closeout.md`                        | `critical`   | `docs/evidence/critical/ED-20260314-g9-step-type-registry-closeout.md`                        | `keep-in-place-phase2` | Primary acceptance or ARC-relevant proof        |
| `ED-20260315-adapter-postgres-phase1-items5-7.md`                      | `critical`   | `docs/evidence/critical/ED-20260315-adapter-postgres-phase1-items5-7.md`                      | `keep-in-place-phase2` | Primary acceptance or ARC-relevant proof        |
| `ED-20260315-api-modules-protected-runtime.md`                         | `critical`   | `docs/evidence/critical/ED-20260315-api-modules-protected-runtime.md`                         | `keep-in-place-phase2` | Primary acceptance or ARC-relevant proof        |
| `ED-20260315-g10-closeout.md`                                          | `critical`   | `docs/evidence/critical/ED-20260315-g10-closeout.md`                                          | `keep-in-place-phase2` | Primary acceptance or ARC-relevant proof        |
| `ED-20260315-intent-store-bug-fixes.md`                                | `critical`   | `docs/evidence/critical/ED-20260315-intent-store-bug-fixes.md`                                | `keep-in-place-phase2` | Primary acceptance or ARC-relevant proof        |
| `ED-20260316-g7-closeout.md`                                           | `critical`   | `docs/evidence/critical/ED-20260316-g7-closeout.md`                                           | `keep-in-place-phase2` | Primary acceptance or ARC-relevant proof        |
| `ED-20260316-g7-provider-ref-reconciliation.md`                        | `critical`   | `docs/evidence/critical/ED-20260316-g7-provider-ref-reconciliation.md`                        | `keep-in-place-phase2` | Primary acceptance or ARC-relevant proof        |
| `ED-20260318-stage-1-1-planner-canonicalization-boundary-contracts.md` | `critical`   | `docs/evidence/critical/ED-20260318-stage-1-1-planner-canonicalization-boundary-contracts.md` | `keep-in-place-phase2` | Primary acceptance or ARC-relevant proof        |
| `ED-20260319-planner-slice4-artifact-boundary-extraction.md`           | `critical`   | `docs/evidence/critical/ED-20260319-planner-slice4-artifact-boundary-extraction.md`           | `keep-in-place-phase2` | Primary acceptance or ARC-relevant proof        |
| `ED-20260319-ts-esm-monorepo-migration.md`                             | `supporting` | `docs/evidence/supporting/ED-20260319-ts-esm-monorepo-migration.md`                           | `keep-in-place-phase2` | Validation support, not sole release gate       |
| `ED-20260320-api-runtime-query-integration.md`                         | `critical`   | `docs/evidence/critical/ED-20260320-api-runtime-query-integration.md`                         | `keep-in-place-phase2` | Primary acceptance or ARC-relevant proof        |
| `ED-20260320-planner-r2-typed-graph-source-boundary.md`                | `critical`   | `docs/evidence/critical/ED-20260320-planner-r2-typed-graph-source-boundary.md`                | `keep-in-place-phase2` | Primary acceptance or ARC-relevant proof        |
| `ED-20260321-planner-start-run-qa-rationale.md`                        | `context`    | `docs/evidence/context/ED-20260321-planner-start-run-qa-rationale.md`                         | `keep-in-place-phase2` | Inventory/rationale context, not closure anchor |
| `ED-20260328-adapter-runtime-sonar-closeout.md`                        | `supporting` | `docs/evidence/supporting/ED-20260328-adapter-runtime-sonar-closeout.md`                      | `keep-in-place-phase2` | Validation support, not sole release gate       |
| `ED-20260328-lineage-outbox-retry-scheduling.md`                       | `critical`   | `docs/evidence/critical/ED-20260328-lineage-outbox-retry-scheduling.md`                       | `keep-in-place-phase2` | Primary acceptance or ARC-relevant proof        |
| `ED-20260328-planner-version-reset-signal-policy-wiring.md`            | `critical`   | `docs/evidence/critical/ED-20260328-planner-version-reset-signal-policy-wiring.md`            | `keep-in-place-phase2` | Primary acceptance or ARC-relevant proof        |
| `ED-20260328-rc-b5-f2-lineage-claim-timeout-race-integration.md`       | `critical`   | `docs/evidence/critical/ED-20260328-rc-b5-f2-lineage-claim-timeout-race-integration.md`       | `keep-in-place-phase2` | Primary acceptance or ARC-relevant proof        |
| `ED-20260329-lane-c-rbac-operation-level-closeout.md`                  | `critical`   | `docs/evidence/critical/ED-20260329-lane-c-rbac-operation-level-closeout.md`                  | `keep-in-place-phase2` | Primary acceptance or ARC-relevant proof        |
| `ED-20260329-mvp-backend-operability-roadmap-reset.md`                 | `context`    | `docs/evidence/context/ED-20260329-mvp-backend-operability-roadmap-reset.md`                  | `keep-in-place-phase2` | Inventory/rationale context, not closure anchor |
| `ED-20260329-mvp-c1-backend-control-plane-runbook.md`                  | `supporting` | `docs/evidence/supporting/ED-20260329-mvp-c1-backend-control-plane-runbook.md`                | `keep-in-place-phase2` | Validation support, not sole release gate       |
| `ED-20260330-lane-a-ws5-intent-log-fixture-modularization.md`          | `critical`   | `docs/evidence/critical/ED-20260330-lane-a-ws5-intent-log-fixture-modularization.md`          | `keep-in-place-phase2` | Primary acceptance or ARC-relevant proof        |
| `ED-20260330-lineage-dlq-alerting-auto-replay.md`                      | `critical`   | `docs/evidence/critical/ED-20260330-lineage-dlq-alerting-auto-replay.md`                      | `keep-in-place-phase2` | Primary acceptance or ARC-relevant proof        |
| `ED-20260330-planner-manifest-ref-cache.md`                            | `critical`   | `docs/evidence/critical/ED-20260330-planner-manifest-ref-cache.md`                            | `keep-in-place-phase2` | Primary acceptance or ARC-relevant proof        |
| `ED-20260330-retention-archive-object-store-hardening.md`              | `critical`   | `docs/evidence/critical/ED-20260330-retention-archive-object-store-hardening.md`              | `keep-in-place-phase2` | Primary acceptance or ARC-relevant proof        |
| `ED-20260330-s19f1-phase1-phase2-snapshot-work-queue.md`               | `critical`   | `docs/evidence/critical/ED-20260330-s19f1-phase1-phase2-snapshot-work-queue.md`               | `keep-in-place-phase2` | Primary acceptance or ARC-relevant proof        |
| `ED-20260330-snapshot-staleness-api-surface.md`                        | `critical`   | `docs/evidence/critical/ED-20260330-snapshot-staleness-api-surface.md`                        | `keep-in-place-phase2` | Primary acceptance or ARC-relevant proof        |
| `ED-20260330-staleness-followup-code-quality.md`                       | `supporting` | `docs/evidence/supporting/ED-20260330-staleness-followup-code-quality.md`                     | `keep-in-place-phase2` | Validation support, not sole release gate       |
| `ED-20260331-api-parse-error-coupling-inventory.md`                    | `context`    | `docs/evidence/context/ED-20260331-api-parse-error-coupling-inventory.md`                     | `keep-in-place-phase2` | Inventory/rationale context, not closure anchor |
| `ED-20260331-lane-a-ws5-b-engine-test-fixture-modularization.md`       | `critical`   | `docs/evidence/critical/ED-20260331-lane-a-ws5-b-engine-test-fixture-modularization.md`       | `keep-in-place-phase2` | Primary acceptance or ARC-relevant proof        |
| `ED-20260331-manifestref-production-path.md`                           | `critical`   | `docs/evidence/critical/ED-20260331-manifestref-production-path.md`                           | `keep-in-place-phase2` | Primary acceptance or ARC-relevant proof        |
| `ED-20260331-mvp-a1-backend-contractual-inventory.md`                  | `critical`   | `docs/evidence/critical/ED-20260331-mvp-a1-backend-contractual-inventory.md`                  | `keep-in-place-phase2` | Primary acceptance or ARC-relevant proof        |
| `ED-20260331-planner-determinism-hash-pin.md`                          | `critical`   | `docs/evidence/critical/ED-20260331-planner-determinism-hash-pin.md`                          | `keep-in-place-phase2` | Primary acceptance or ARC-relevant proof        |
| `ED-20260331-rc-c1-boundary-legacy-hardening.md`                       | `critical`   | `docs/evidence/critical/ED-20260331-rc-c1-boundary-legacy-hardening.md`                       | `keep-in-place-phase2` | Primary acceptance or ARC-relevant proof        |
| `ED-20260401-admission-telemetry-contract-and-runtime-teardown.md`     | `critical`   | `docs/evidence/critical/ED-20260401-admission-telemetry-contract-and-runtime-teardown.md`     | `keep-in-place-phase2` | Primary acceptance or ARC-relevant proof        |
| `ED-20260401-cancel-lifecycle-workflow-owned-ordering.md`              | `critical`   | `docs/evidence/critical/ED-20260401-cancel-lifecycle-workflow-owned-ordering.md`              | `keep-in-place-phase2` | Primary acceptance or ARC-relevant proof        |
| `ED-20260401-execution-plan-canonical-identity-unification.md`         | `critical`   | `docs/evidence/critical/ED-20260401-execution-plan-canonical-identity-unification.md`         | `keep-in-place-phase2` | Primary acceptance or ARC-relevant proof        |
| `ED-20260401-executionplanv2-canonical-name-phase2.md`                 | `critical`   | `docs/evidence/critical/ED-20260401-executionplanv2-canonical-name-phase2.md`                 | `keep-in-place-phase2` | Primary acceptance or ARC-relevant proof        |
| `ED-20260401-temporal-live-status-query.md`                            | `critical`   | `docs/evidence/critical/ED-20260401-temporal-live-status-query.md`                            | `keep-in-place-phase2` | Primary acceptance or ARC-relevant proof        |

## Notes

- Phase 2 keeps all files in `docs/evidence/` and only introduces class metadata.
- Phase 3 will execute controlled moves/renames according to this matrix.
- No artifact is left unclassified in this inventory pass.
