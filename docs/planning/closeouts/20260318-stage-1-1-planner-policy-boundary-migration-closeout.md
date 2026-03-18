# 2026-03-18 Stage 1.1 Planner Policy Boundary Migration Closeout

## Summary

Slice 2 was completed as a real migration, not as a vocabulary-design note.

The repository now wires the canonical planner policy vocabulary into the
planner public boundary and removes the legacy numeric planner policy shape from
the authoritative contract surface.

## Governing Sources

- `docs/planning/status/governance-document-rule-inventory.md`
- `AGENTS.md`
- `docs/adr/ADR-0018_Shared_Kernel_Ownership_Governance.md`
- `docs/adr/ADR-0035-planner-public-contract-evolution-protocol.md`
- `packages/@dvt/planner/docs/planning/Stage-1.1-Planner-Canonicalization.md`

## Real Work Performed

### Contracts

- `packages/@dvt/contracts/src/contracts/planner/ExecutionPlan.v2.ts`
  - `PlannerInputEnvelopeV2.policies` now uses `PlannerPolicyClassSet`
  - `DbtManifestRef.sha256` is now required
- `packages/@dvt/contracts/src/schemas.ts`
  - planner input schema now validates `PlannerPolicyClassSet`
  - `DbtManifestRefSchema.sha256` is required
- `packages/@dvt/contracts/src/validation.ts`
  - replaced legacy planner-policy parser with
    `parsePlannerPolicyClassSet(...)`
- `packages/@dvt/contracts/src/index.ts`
  - removed the legacy `PlannerPolicies` public re-export
- `packages/@dvt/contracts/src/contracts/planner/PlannerPolicyClassSet.v2.schema.json`
  - added canonical JSON Schema for the new planner policy class set
- `packages/@dvt/contracts/src/contracts/planner/PlannerInputEnvelopeV2.schema.json`
  - updated public JSON Schema to require `manifestRef.sha256` and reference
    `PlannerPolicyClassSet`

### Planner

- `packages/@dvt/planner/src/domain/types.ts`
  - removed duplicated `PlannerPolicies`
  - planner input now depends on `PlannerPolicyClassSet`
- `packages/@dvt/planner/src/domain/policies.ts`
  - rewrote normalization to derive internal resolved policy state from
    canonical retry/timeout/concurrency classes
- `packages/@dvt/planner/src/domain/stepFactory/dbtStepFactory.ts`
  - emits only the internal fields that were actually resolved
- `packages/@dvt/planner/src/index.ts`
  - removed legacy `PlannerPolicies` re-export

### Callers, fixtures, vectors, docs-contracts

- migrated planner fixtures/examples/tests to the canonical class vocabulary
- updated fixed vectors and deterministic hash expectation
- replaced planner-local schema docs with `PlannerPolicyClassSet` equivalents

## Breaking Change Note

The public planner boundary no longer accepts:

- `policies.stepTimeoutMs`
- `policies.retries.backoffMs`
- `policies.concurrency.maxInFlight`

Migration rule used in this slice:

- `stepTimeoutMs` -> `timeout: { kind: 'budget', maxSeconds: Math.ceil(ms / 1000) }`
- `retries.maxAttempts` -> `retry: { kind: 'at-most-N', maxAttempts }` when
  greater than `1`, otherwise `retry: { kind: 'at-most-once' }`
- `backoffMs` has no public equivalent and is intentionally removed from the
  planner boundary
- `DbtManifestRef.sha256` is required for all `manifestRef` inputs

## Validation Evidence

Commands run:

- `pnpm --filter @dvt/contracts build`
- `pnpm --filter @dvt/planner build`
- `pnpm --filter @dvt/contracts test`
- `pnpm --filter @dvt/planner test`
- `pnpm --filter @dvt/adapter-temporal build`
- `pnpm --filter @dvt/adapter-temporal test`
- `pnpm exec markdownlint-cli2 "packages/@dvt/planner/docs/planning/Stage-1.1-Planner-Canonicalization.md" "docs/planning/closeouts/20260318-stage-1-1-planner-policy-boundary-migration-closeout.md"`
- `pnpm exec tsx tools/docs/validate-planner-stage-1-1-manifest.ts`

Result at closeout time:

- all commands above passed

## No-Debt Evidence

- no quality rules were relaxed
- no hooks were bypassed
- no debt entry was added
- no compatibility bypass was left in place

## No-Stub Evidence

- no stub, placeholder, fake adapter, or fake migration path was added
- the planner boundary, schemas, parser surface, fixtures, and tests were
  migrated together
