---
title: Plan Store Records User Stories
status: Review
owner: Contracts / Artifacts / Adapter Postgres
last_reviewed: 2026-05-09
---

# Plan Store Records User Stories

## Command/Query Coverage

| Story        | Rail(s)                                          | Covered scenario                                                    |
| ------------ | ------------------------------------------------ | ------------------------------------------------------------------- |
| `US-PSR-001` | `PS-C01`, `PS-C02`                               | Store an artifact and create the scoped plan record.                |
| `US-PSR-002` | `PS-C01`, `PS-Q01`                               | Reject records whose canonical ownership does not match the scope.  |
| `US-PSR-003` | `PS-Q02`, `PS-Q08`                               | Resolve and materialize by `ScopedPlanRef`.                         |
| `US-PSR-004` | `PS-C02`, `PS-Q01`                               | Keep same content-derived plan id isolated across tenants.          |
| `US-PSR-005` | `PS-C03`, `PS-Q03`                               | Record and query scoped adapter executability.                      |
| `US-PSR-006` | `PS-C04`, `PS-Q04`                               | Record and query admission links under the scoped plan record.      |
| `US-PSR-007` | `PS-C05`, `PS-Q05`                               | Supersede a plan without crossing tenant/project/environment scope. |
| `US-PSR-008` | `PS-C06`, `PS-Q01`                               | Archive a scoped plan record with auditable timestamp evidence.     |
| `US-PSR-009` | `PS-C02`                                         | Fail fast when legacy backfill lacks canonical ownership.           |
| `US-PSR-010` | `PS-C07`, `PS-C08`, `PS-Q06`, `PS-Q07`, `PS-Q08` | Guard scoped validation and runtime materialization semantics.      |

## US-PSR-001 Create Scoped Plan Record

As a runtime operator, I want a plan record created with
`tenantId`, `projectId`, `environmentId`, and `planId` so that tenant-owned
evidence cannot be resolved by content hash alone.

Given a missing scope tuple, validation rejects the record.

## US-PSR-002 Validate Canonical Ownership

As an auditor, I want top-level scope fields to match
`canonicalPlanJson.metadata.ownership` so that the persisted record cannot claim
another tenant's plan.

Given a mismatched canonical ownership tuple, validation rejects the record.

## US-PSR-003 Resolve By Scoped Plan Ref

As an API evidence reader, I want `ScopedPlanRef` to combine scope and plan ref
metadata so that a URI/hash match is not enough to cross tenant boundaries.

## US-PSR-004 Support Shared Content Hash Across Tenants

As a platform operator, I want two tenants to reuse the same content-derived
plan id while keeping separate record state.

Given two tenants share the same content-derived plan id, each tenant resolves
only its own `PlanRecord`.

## US-PSR-005 Record Adapter Executability

As a runtime adapter owner, I want executability state stored under the same
scope tuple as the plan record so that adapter readiness cannot leak across
tenants.

## US-PSR-006 Record Admission Link

As a run auditor, I want a run admission link to reference the scoped plan
record so that admitted runs are traceable to tenant-owned evidence.

Given an admission link references another tenant, the database foreign key
rejects it.

## US-PSR-007 Supersede Plan Record

As a planner maintainer, I want supersession to be scoped so that replacing a
plan in one tenant does not mutate another tenant's record with the same plan
id.

## US-PSR-008 Archive Plan Record

As an operations maintainer, I want archiving to require scope and
`archivedAtIso` so that retention transitions remain tenant-local and
auditable.

## US-PSR-009 Backfill Legacy Stored Plans

As a migration operator, I want backfill to fail fast when stored canonical
plans lack ownership so that unscoped historical rows do not become ambiguous
tenant records.

## US-PSR-010 Guard Architecture Drift

As an architecture reviewer, I want a semantic architecture test to reject
naked `planId` record APIs, missing docs, missing owned-concern docblocks, and
unscoped SQL keys.

Given the retired lifecycle contract source reappears, the architecture test
fails because S08 publishes artifact validation vocabulary through
`StoredPlanArtifactValidationRecord`, not `PlanValidationLifecycle.v1`.
