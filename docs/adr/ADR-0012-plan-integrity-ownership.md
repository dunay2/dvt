# ADR-0012 - Plan Integrity Ownership

Status: Accepted
Date: 2026-04-24
Owners: Architecture / Engine / Temporal

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
- how the adapter receives the immutable `PlanRef` approved by the engine;
- how provider runtimes revalidate fetched plan material before execution.

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

### C. Engine verifies and dispatches immutable `PlanRef` (Chosen)

Accepted because:

- one engine-side verification point exists before any adapter call;
- planner identity can be recomputed from the resolved plan core and matched to
  `planId`;
- Temporal workflow payloads stay bounded because the workflow receives a
  content-addressed pointer instead of full plan bytes;
- provider runtimes that fetch plan material must revalidate `PlanRef.sha256`
  before resolving execution segments;
- runtime behavior remains auditable from a single start-run admission proof.

### D. Engine verifies and dispatches the resolved plan object

Rejected because:

- Temporal start and continue-as-new payloads must remain bounded;
- large execution plans would couple provider start payload shape to planner
  graph size;
- the active Temporal implementation resolves bounded execution segments by
  `PlanRef` inside activities.

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
- dispatch only the verified immutable `PlanRef` plus resolved run context to
  the adapter.

MUST NOT:

- delegate the authoritative integrity proof to the adapter;
- dispatch a run before the verified plan has been materialized;
- treat adapter/runtime re-fetch as the source of truth for start-run approval.

### Adapter Responsibilities (Execution Only)

Adapters MUST:

1. receive the engine-approved immutable `PlanRef` plus resolved run context;
2. execute under the provider runtime using that `PlanRef`;
3. revalidate `PlanRef.sha256` before executing any fetched plan bytes or
   resolved execution segment;
4. apply provider-specific execution semantics and constraints;
5. emit runtime events and lifecycle transitions.

Adapters MUST NOT:

- own the authoritative fetch-and-verify responsibility for plan identity;
- create a second competing integrity authority after engine dispatch;
- execute fetched plan material when the fetched bytes differ from
  `PlanRef.sha256`.

## 5. Architectural Rationale

This decision enforces:

- one start-run admission proof before dispatch;
- clear integrity ownership at the engine lifecycle boundary;
- deterministic planner identity verification independent of adapter behavior;
- auditability of the immutable plan pointer approved for execution;
- bounded Temporal workflow payloads with fail-closed activity-time
  revalidation.

## 6. Shared Verifier Requirement

To prevent drift across call sites, use shared verifier logic in
`@dvt/plan-verifier` or equivalent centralized helpers for:

- planner-identity recomputation from plan core;
- schema and step-type validation helpers;
- canonical error emission for integrity and compatibility failures.

The engine verification path is authoritative for start-run approval. Adapters
may use verifier helpers for runtime fetch revalidation, but those checks are
not a second approval authority.

## 7. Consequences

Positive:

- single auditable proof before dispatch;
- elimination of decentralized start-run approval ownership;
- provider payloads remain bounded while runtime fetches remain fail-closed.

Negative:

- engine/application wiring now includes plan materialization;
- provider runtimes that fetch plan material need explicit hash revalidation;
- migration effort is required across engine, API composition, and adapter
  runtime tests/docs.

## 8. Acceptance Criteria

- Engine fetches and verifies the executable plan before adapter dispatch.
- `planId` is recomputed from the resolved plan core and must match planner
  identity.
- Adapter `startRun()` receives `PlanRef` and resolved run context only.
- Adapters no longer own the authoritative start-run approval responsibility.
- Temporal execution starts from the engine-approved immutable `PlanRef`.
- Temporal activity segment resolution revalidates `PlanRef.sha256` before
  execution.
- Contract and runtime tests validate the centralized behavior.
