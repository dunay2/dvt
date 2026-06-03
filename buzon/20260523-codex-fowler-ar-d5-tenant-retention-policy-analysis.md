# Fowler architecture analysis - AR-D5 tenant retention policy

## Scope

This pass reviews the branch work around `ConfigureRunEventRetentionPolicy` in
the context of the runtime archive lifecycle, the Postgres state-store adapter,
and the outbox worker runtime composition.

## Fowler reading

The branch improves a previous primitive policy value by turning retention into
a policy object with a deployment default and tenant-specific overrides. In
Fowler terms, the main improvement is **Replace Primitive with Policy Object**:
`hotRetentionDays` no longer carries every retention rule alone, and the
state-store owns `resolveTenantHotRetentionDays` as the intention-revealing
operation.

The Postgres adapter remains a **Gateway**. It reads rows, applies the policy,
and writes archive-unit state, but the tenant-specific rule name lives in the
state-store lifecycle policy rather than inside SQL or worker configuration.

The outbox worker environment parser is **Configuration as Code**. It parses
operator input and rejects malformed values, but it does not decide archive
eligibility.

## Mature-system comparison

Mature archival systems normally separate:

- policy definition from worker configuration;
- eligibility calculation from physical export;
- archive-unit identity from tenant policy decisions;
- evidence and risk posture from implementation claims.

AR-D5 now matches that shape for the first tenant-retention increment. It keeps
ADR-0037's archive-unit key stable and refuses partial exports under an existing
unit key. That is conservative, but it avoids hidden authority and stranded hot
rows.

## Improved patterns

- `RunEventRetentionPolicy` is the named lifecycle policy owner.
- `resolveTenantHotRetentionDays` is the single semantic lookup.
- `PostgresRunArchiveStore` applies policy per tenant while preserving full-unit
  export.
- `dvt-outbox-worker` parses override syntax without owning archive semantics.
- Component docs and user stories now describe the same rail and invariants as
  the code.

## Antipatterns detected

- **Test-only confidence**: behavior tests proved policy resolution and adapter
  eligibility, but there was no architecture guard binding policy, env parsing,
  adapter semantics, docs, evidence, and risk.
- **Documentation drift**: the component guide used `State Transitions` while
  local component guides elsewhere use `Transitions`; the stories were readable
  but not mechanically addressable by IDs.
- **Semantic encapsulation gap**: AR-D5 source modules lacked top-level owned
  concern docblocks, making future ownership drift harder to catch.

## Repetitions and drift fixed

- Added owned-concern docblocks to the state-store policy, Postgres adapter, and
  outbox worker env parser modules.
- Added a semantic architecture test:
  `PostgresRunEventRetentionPolicy.architecture.test.ts`.
- Updated component docs with `Public API`, `Invariants`, `Transitions`,
  `Consumers`, and `Diagrams`.
- Added explicit user-story IDs `US-RER-001` through `US-RER-005`.
- Tied evidence and risk text to `ConfigureRunEventRetentionPolicy`.

## Components worth grouping

The current grouping is appropriate for this slice:

- `packages/@dvt/state-store/src/lifecycle/archiveRuntime.ts`: policy object,
  ports, and lifecycle contracts.
- `packages/@dvt/adapter-postgres/src/PostgresRunArchiveStore.ts`: Postgres
  gateway for eligibility and archive-unit state transitions.
- `apps/outbox-worker/src/plugins/env.ts`: deployment configuration parser.
- `apps/outbox-worker/src/runtime/buildRunEventRetentionRuntime.ts`: runtime
  composition handoff.

If this grows, the next mature grouping would extract a smaller
`runEventRetentionPolicy.ts` module from `archiveRuntime.ts`, but this branch
does not need that split yet.

## Teachings for future work

- Tenant policy changes should start with the policy object and only then wire
  worker config and adapter use.
- If a physical lifecycle unit can contain multiple tenants, fail closed rather
  than creating partial export semantics without a new archive-unit identity.
- Architecture tests should validate semantic alignment, not only import shape
  or barrel thinness.
- Evidence and risk docs should name the same command/query rail as the plan.

## Opportunities left

- Consider per-tier bucket-count or tenant-bucket isolation strategy if shared
  units delay short-retention tenants too often.
- Consider extracting `RunEventRetentionPolicy` into a focused module if
  `archiveRuntime.ts` continues growing.
- Consider recording effective resolved policy in archive telemetry for
  operator explainability.

No ADR is required for this pass. The accepted ADR-0037 archive-unit identity is
unchanged, and this work reinforces rather than changes the existing lifecycle
architecture.
