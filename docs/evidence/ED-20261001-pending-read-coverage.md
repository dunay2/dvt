---
title: Pending Read complete identity coverage evidence
status: final
date: 2026-10-01
owners:
  - '@dvt/contracts'
  - '@dvt/substrait-analysis'
  - '@dvt/web'
arc_level: ARC-2
breaking: true
code_refs:
  - packages/@dvt/contracts/src/contracts/planner/DvtSubstraitReadFieldCoverage.v1.ts
  - packages/@dvt/contracts/src/contracts/planner/DvtRelationalAuthoringDraft.v1.ts
  - packages/@dvt/substrait-analysis/src/schemaHierarchy.ts
  - apps/web/src/app/views/canvas/relational-source-occurrence/pendingSourceOccurrence.ts
evidence:
  tests:
    - pnpm --filter @dvt/contracts exec vitest run
    - pnpm --filter @dvt/contracts exec vitest run test/dvt-relational-authoring-draft.contract.test.ts
    - pnpm exec vitest run packages/@dvt/substrait-analysis/test
    - pnpm --filter dvt-api test:unit --maxWorkers=2
    - pnpm --filter @dvt/web test:unit:run
    - pnpm --filter @dvt/web test:architecture:run
    - pnpm --filter @dvt/web test:presentation:run src/app/views/canvas/CanvasRelationalTreeWorkbench src/app/views/canvas/useCanvasRelationalTreeDraftState.test.tsx src/app/views/canvas/CanvasModelEditor.navigation.test.tsx --maxWorkers=2
    - pnpm --filter @dvt/web test:e2e:native --spec cypress/e2e/canvas/canvas-pending-read-coverage.cy.ts,cypress/e2e/canvas/canvas-relational-workbench-chain-persistence.cy.ts
    - pnpm arch:deps
---

# Pending Read complete identity coverage

## Authority and rationale

[Issue #3528](https://github.com/dunay2/dvt/issues/3528), a bounded slice of #3474,
records the preimplementation diagrams, root cause, Fowler matrix and acceptance.
Governing sources: AGENTS.md, ADR-0064, command/query rail governance, Fowler
opportunity governance, the Canvas authoring draft boundary and the workspace
graph draft persistence v1 contract. Planning DB design
GH-3296-SEMANTIC-EDITOR-PRODUCT-V1 and mechanization GH-3528-PENDING-READ-COVERAGE
reuse SaveWorkspaceGraphDraft, GetWorkspaceGraphDraft and ConfigureCanvasDvtNode.
No new rail, DTO, store, migration or compatibility reader is introduced.

The pending DTO previously required merely nonempty field bindings. Physical
restore compared schema names/types but did not derive the Read schema. Missing
stable identities could survive persistence and reopen until later analysis.
One focused contracts-owned coverage policy now checks the bijection between
the saved Read schema and its bindings, including nested structs. Schema
derivation consumes the same policy; pending restore invokes existing derivation.
Presentation has no new business rule. List/map elements are not invented fields.
The policy neither derives opaque identities from positions nor mutates inputs.

## Test evidence

- RED reproduced six invalid contract cases and two physical-restore cases.
  GREEN covers missing, duplicate, out-of-range and wrong-parent bindings at both
  pending DTO and workspace envelope boundaries, for physical and producer Reads.
  Positive cases shuffle complete bindings while preserving their identities.
- Nested coverage tests include holes, orphan/cyclic parents, duplicate identity,
  primitive parents, collections and 2,000 struct levels. A cross-package guard
  requires schema derivation and persistence to agree on a nested valid/invalid
  Read. Existing schema analysis, web unit and architecture suites pass.
- API tests use the real HTTP route parser and read use case with controlled
  ports: invalid PUT never calls authorization/persistence; malformed stored
  payload yields HTTP 422 `format_error/corrupt_payload`; a complete payload
  yields HTTP 200. The stored test object is unchanged. No live DB proof is claimed.
- Native Cypress passes four cases: complete pending Read save/reopen, malformed
  response rejection, producer reordering/rename and full chain save/reopen with
  explicit preview. The new regression checks no additional writes, Preview or
  Run on rejection. Screenshots were inspected at 1200 by 680 pixels.

The native harness runs the real built web app against the existing stateful
HTTP test adapter on temporary port 4173. It is frontend transport evidence, not
live PostgreSQL, CAS durability or provider execution. No permanent 5174 server
or application database change is part of this slice.

The initial broad API run timed out in the unrelated DBT source-file snapshot
test under concurrent local load. The complete API unit suite passes with two
workers (1,258 tests), without changing the 5-second timeout or test selection. Its existing
27 conditionally skipped database/environment cases are not live DB evidence.
Initial lint/precommit findings (import order, global qualification and explicit
fixture return type) were corrected with hooks kept enabled. Final command
results, including lint, typechecks, prepush, exact base/head mechanization and
required CI, are recorded in #3528 and the implementation PR.

Ten mounted presentation tests also hit the unchanged 5-second timeout during
concurrent builds; the identical selection is rerun with two workers. The broad
fast-resolver lint additionally flags import grouping in the unchanged
`graph-dbt-model-compilation.contract.test.ts`; that file passes the canonical
type-aware lint unchanged. All package production sources and touched tests pass
the fast lint, and full web/API lint passes. No unrelated file or lint rule is
altered to mask resolver differences.

The first remote quality run rejected the new policy file's missing
`@baseline ADR-0064` traceability header. The header was added without changing
behavior; the ADR-0000 traceability gate is rerun locally before republishing.

## Compatibility and integrity

The evaluator classifies the full diff ARC-2: evidence and risk update required;
no rollout-notes or compatibility-matrix artifact required. This is a current-v1
hardcut: already incomplete saved Reads are explicitly rejected, not repaired or
silently replaced. Deploy the shared contract consumers together. Correctly
bound existing Reads remain valid; empty pending-field policy is unchanged.
Schema type admission, source provenance, authorization and revision ownership
stay with their existing boundaries.

No debt entry, stub, placeholder, fake product adapter, hidden unfinished branch,
rule relaxation or hook bypass was added. Existing controlled test ports remain
identified as tests. Remaining JOIN and withdrawn-category reachability findings
in #3474 are outside this slice.
