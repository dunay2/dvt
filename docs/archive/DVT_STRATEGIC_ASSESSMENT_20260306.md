---
title: Strategic Assessment — DVT+ as a System
status: Archived
owner: docs
last_reviewed: 2026-03-06
planning_type: archive
---

# Strategic Assessment — DVT+ as a System

## 1) Is there anything comparable?

Yes, but with important nuances. The most direct comparables:

| Tool              | Similarity                                     | Key difference                                                                           |
| ----------------- | ---------------------------------------------- | ---------------------------------------------------------------------------------------- |
| Dagster           | dbt orchestration, asset-based DAGs, event log | General-purpose; not dbt-first and not deterministic in the DVT+ sense                   |
| Prefect           | Workflow engine, retries, state store          | No content-addressed plans; no `compiledCodeRef`; no strict hexagonal boundary ownership |
| Airflow           | DAG execution, scheduler                       | Tightly coupled architecture; not event-sourced; push-style model                        |
| dbt Cloud         | dbt execution, lineage                         | Closed SaaS; not domain-orchestrable                                                     |
| Temporal (direct) | Workflow durability, compensation              | Infra-level; no domain model, no CQRS, no PlanRef ownership                              |
| Argo Workflows    | DAG execution on Kubernetes                    | Not dbt-aware; no event sourcing                                                         |

DVT+ is none of these. It is a **domain-owned orchestration layer** that uses **Temporal as an execution adapter** (not as the domain model), with specific emphasis on:

- **Reproducible determinism** (content-addressed plans)
- **Multi-tenant governance from the domain** (not from infrastructure)
- **OpenLineage as a first-class citizen**
- **Command/Query separation with an authoritative event log**

This does not exist today as a mature open-source product. It is a real niche.

---

## 2) Are you reinventing the wheel?

Partially—in the right parts. But also in some places where it was not necessary.

### Justified to reinvent

- The **WorkflowEngine** with its event model and idempotency logic. Temporal does not expose this at the domain level—you need to wrap it.
- `@dvt/planner` as a **pure deterministic function**. There is nothing equivalent for dbt with content-addressing.
- `ICompiledCodeStorage` with **SHA-256 content-addressing**. Existing artifact stores (MLflow, DVC) are ML-oriented and do not implement this model.
- The **PlanRef model** (engine receives _reference only_) is a correct and non-trivial design decision. No library provides this out of the box.

### Possible over-engineering

- `@dvt/dsl`: the current AST only supports equality. **JSONLogic**, **expr-eval**, or even a simple JSON condition evaluator would cover this in one day. A custom DSL may make sense long-term, but it is over-directed today.
- `@dvt/canonical` (JCS + SHA-256): could be replaced by `fast-json-stable-stringify` + `crypto.createHash`. ~8 lines. A custom package adds maintenance overhead.
- `TokenBucketRateLimiter` in the outbox: there are multiple mature npm libraries (e.g., **p-throttle**, **bottleneck**, **limiter**, **rate-limiter-flexible**).
- `IntentReconcilerRuntime`: the pattern is sound, but the custom scheduler could be replaced with **pg-boss** or **graphile-worker**, which already solve crash-consistency with Postgres advisory locks + job queues.

---

## 3) Does it have quality?

**6.8/10** — correct architecture, incomplete implementation, and unresolved operational risks.

### What is well done

- Excellent separation of concerns. The engine does not know Temporal; Temporal does not know dbt; the planner knows nothing about runtime. This is difficult and you achieved it.
- ADR-backed invariants are **real in code**, not just documentation. The `adapter.startRun` before `bootstrapRunTx` with compensation is correctly implemented.
- `SnapshotProjector` as a derived read model (never authoritative) is conceptually mature and correct.
- **32 ADRs with traceability** — uncommon and valuable.
- High test coverage in engine core. Golden-hash contract tests: correct pattern.

### What lowers the score

- `stepTypeConfig` is opaque (no formal schema) — **critical risk** of silent regressions.
- `getSnapshot()` with O(n) replay — not scalable beyond ~10k events without pagination.
- Multi-instance outbox without coordination — potential correctness bug in multi-pod deployments.
- The DSL is a placeholder. If someone uses it expecting a real gateway, it fails.
- UI is fully disconnected from the API — the system cannot be demonstrated end-to-end today.

---

## 4) What is it for?

The primary and most differentiated use case: **orchestrating dbt pipelines** in organizations with **governance**, **multi-tenancy**, and **auditability** requirements.

Concrete scenario:

- Company with **50+ dbt models**, multiple teams, multiple environments (dev/staging/prod)
- Needs: who ran what, with which plan version, with which outcome, and **full lineage down to column level**
- Needs: safe cancellations, retries with compensation, crash recovery without duplicates
- Needs: separation between “planning” and “execution” (human approval, gatekeeping)

DVT+ is the only system aiming to do this with **reproducible determinism** and **event sourcing**. Dagster approaches governance, but not the **PlanRef content-addressed** model.

Secondary possible use cases:

- Internal data orchestration platform for a data mesh
- Foundation for a multi-tenant dbt orchestration SaaS
- Replacement for Airflow/Prefect in compliance-driven orgs (OpenLineage + Neo4j)

---

## 5) Could you have leveraged more existing code?

Yes. Without changing the architecture, these swaps would reduce maintenance surface:

| DVT component                     | Existing library                                  | Swap effort  |
| --------------------------------- | ------------------------------------------------- | ------------ |
| `@dvt/dsl` AST evaluator          | `jsonlogic-js` or `expr-eval`                     | ~1 day       |
| `@dvt/canonical` JCS hash         | `fast-json-stable-stringify` + `node:crypto`      | ~2 hours     |
| `TokenBucketRateLimiter`          | `bottleneck` or `p-throttle`                      | ~1 day       |
| `IntentReconcilerRuntime`         | `pg-boss` or `graphile-worker`                    | ~3–5 days    |
| `ICompiledCodeStorage` S3 adapter | `@aws-sdk/client-s3` direct (thin wrapper)        | already thin |
| OpenLineage mapper                | check `@openlineage/client` availability for Node | investigate  |

What should **not** be replaced with libraries: the **WorkflowEngine**, the **event model**, and the `@dvt/planner` pipeline. That is the differentiating core.

---

## 6) How should it evolve?

### Immediate priority (Phase 1 closure — before 2026-03-31)

- **Engine API routes** — without this, workflows cannot be started externally. Most critical gap.
- **UI → API wiring** — even if minimal (health + one `startRun` call). Must be demoable end-to-end.
- **Close G4 T4-3** — `StepStarted.payload` must propagate `compiledCodeRef` from Temporal.
- **`stepTypeConfig` schema** — minimal Zod schema for existing step types to prevent silent regressions.

### Phase 1.5 (hardening — before 2026-05-31)

- Real `JwtAuthorizer` — multi-tenancy without auth is a prototype.
- Outbox coordination — Postgres advisory lock or single-writer pattern before multi-pod deployment.
- `getSnapshot()` pagination — cursor over event log, not full replay.
- Real Neo4j wiring in `TraceabilityService` — most differentiated feature, currently ~50% and cannot stay there.

### Phase 2 (product — 2026-09-30)

- Plugin runtime (sandbox) — external extensibility.
- `IArtifactStore` as a formal port — close the hexagonal gap.
- Real DSL — or adopt JSONLogic and type it properly. The gateway branching pattern matters.
- Snowflake state store adapter — enterprise Snowflake-first differentiator.
- End-to-end cost tracking — UI `CostView` exists; data model must be completed.

### Strategic direction (18 months)

The system has the foundations to become a **control plane** for dbt orchestration—not just another runner, but the layer that decides **what**, **when**, **with which version**, and **with which integrity proofs**. This is what differentiates it from Dagster and dbt Cloud.

The correct bet is: close Phase 1 quickly (end-to-end demo), then Neo4j lineage (unique feature), then auth + multi-tenancy (productizable). The DSL and plugin sandbox are Phase 2 and should not block earlier closure.

---

## Conclusion

What you are building is real, niche, and differentiated — but it is in a phase where the main risk is not architectural, but **completion**. The missing ~32% (API routes, UI wiring, auth, Neo4j) is the difference between a production system and a very well-designed prototype.
