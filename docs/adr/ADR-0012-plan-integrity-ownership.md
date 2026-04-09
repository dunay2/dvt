# ADR-0012 - Plan Integrity Ownership

Status: Accepted
Date: 2026-02-20 (updated: 2026-04-07)

---

## 1. Context

The repository needs one authoritative proof that the plan dispatched for
execution matches planner identity. The previous split between engine metadata
admission and adapter/runtime plan fetch created no single auditable ownership
point and left integrity drift distributed across layers.

## 2. Problem

We must define:

- where executable plan materialization occurs before dispatch;
- where planner identity (`planId`) is recomputed and verified;
- where executable-plan metadata alignment is enforced;
- how the adapter receives the exact verified plan that the engine approved.

The solution must preserve deterministic planner identity and fail closed
before adapter dispatch.

## 3. Alternatives Considered

### A. Adapter owns plan fetch + integrity

Rejected because:

- the engine dispatches without holding the proof that the plan identity is
  valid;
- verification becomes decentralized and adapter-specific;
- the start-run boundary cannot audit which plan was approved before dispatch.

### B. Engine and adapter both verify

Rejected because:

- duplicate fetch and verification create cost without solving ownership drift;
- two authoritative paths invite divergence in logic and observability;
- review and audit still have no single source of truth.

### C. Engine verifies but still dispatches only `PlanRef`

Rejected because:

- the adapter/runtime would still have to fetch the executable plan later;
- execution could still depend on a later materialization step rather than the
  exact plan object the engine approved;
- centralized ownership would remain incomplete.

### D. Engine verifies and dispatches the resolved plan (Chosen)

Accepted because:

- one engine-side verification point exists before any adapter call;
- planner identity can be recomputed from the resolved plan core and matched to
  `planId`;
- adapters execute the same verified plan object that the engine approved;
- runtime behavior becomes auditable from a single start-run boundary.

## 4. Decision

### Engine Responsibilities (Authoritative Integrity Gate)

MUST:

- validate `PlanRef` policy and required metadata;
- fetch the executable plan before adapter dispatch;
- parse the executable plan and validate metadata alignment with `PlanRef`;
- recompute planner identity from the resolved plan core and verify it matches
  `planId`;
- reject `startRun()` before adapter dispatch when any integrity or compatibility
  check fails;
- dispatch the verified `ExecutionPlan` to the adapter.

MUST NOT:

- delegate the authoritative integrity proof to the adapter;
- dispatch a run before the verified plan has been materialized;
- treat adapter/runtime re-fetch as the source of truth for plan identity.

### Adapter Responsibilities (Execution Only)

Adapters MUST:

1. receive the verified `ExecutionPlan` plus `PlanRef`;
2. execute the verified plan under the provider runtime;
3. apply provider-specific execution semantics and constraints;
4. emit runtime events and lifecycle transitions.

Adapters MUST NOT:

- own the authoritative fetch-and-verify responsibility for plan identity;
- create a second competing integrity authority after engine dispatch.

## 5. Architectural Rationale

This decision enforces:

- one start-run admission proof before dispatch;
- clear integrity ownership at the engine lifecycle boundary;
- deterministic planner identity verification independent of adapter behavior;
- auditability of the exact verified plan that enters execution.

## 6. Shared Verifier Requirement

To prevent drift across call sites, use shared verifier logic in
`@dvt/plan-verifier` or equivalent centralized helpers for:

- planner-identity recomputation from plan core;
- schema and step-type validation helpers;
- canonical error emission for integrity and compatibility failures.

The engine verification path is authoritative. Adapters may use verifier
helpers for local defensive checks, but those checks are not the source of
truth for plan identity approval.

## 7. Consequences

Positive:

- single auditable proof before dispatch;
- elimination of decentralized verification ownership;
- adapters receive the exact verified plan object to execute.

Negative:

- engine/application wiring now includes plan materialization;
- Temporal workflow input may grow because it now receives the verified plan;
- migration effort is required across engine, API composition, and adapter
  runtime tests/docs.

## 8. Acceptance Criteria

- Engine fetches and verifies the executable plan before adapter dispatch.
- `planId` is recomputed from the resolved plan core and must match planner
  identity.
- Adapters no longer own the authoritative fetch-and-verify responsibility.
- Temporal execution starts from the engine-verified plan, not a runtime
  fetch-only integrity boundary.
- Contract and runtime tests validate the centralized behavior.
