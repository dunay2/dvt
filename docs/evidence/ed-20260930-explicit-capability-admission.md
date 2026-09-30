---
title: Explicit capability admission without inferred target or exposure
status: Draft
date: 2026-09-30
owners:
  - '@dvt/contracts'
  - web
arc_level: ARC-2
breaking: false
code_refs:
  - packages/@dvt/contracts/src/contracts/planner/DvtSubstraitSupportedCapabilities.v1.ts
  - apps/web/src/app/views/canvas/canvasRelationalOperationChoices.ts
evidence:
  tests:
    - packages/@dvt/contracts/test/dvt-substrait-capability-admission.contract.test.ts
    - packages/@dvt/contracts/test/dvt-substrait-admission-types.contract.test.ts
    - apps/web/src/app/views/canvas/canvasRelationalOperationChoices.capabilities.test.ts
    - apps/web/cypress/e2e/canvas/canvas-relational-operation-menu.cy.ts
---

# Explicit Capability Admission

## Authority and scope

[#3485](https://github.com/dunay2/dvt/issues/3485) and its
[preimplementation plan](https://github.com/dunay2/dvt/issues/3485#issuecomment-5914256508)
govern the bounded hard cut. Governing sources are `AGENTS.md`, ADR-0064,
command/query rail governance, Fowler governance, the standard-first admission
plan and `.arc-policy.yaml`. Planning DB design
`GH-3485-EXPLICIT-CAPABILITY-ADMISSION` references existing
`ConfigureCanvasDvtNode` and `ProjectCanvasRelationalTree` rails. No new rail or
application database operation is introduced.

## Root cause and correction

The internal builder supplied `mapped` and `exposed` when a contributor omitted
the postures. The final strict schema could not reject evidence fabricated by
that builder. Every group now explicitly names target IDs/statuses and visual
posture; unexposed groups also name their rationale. Existing mandatory proof
references supply evidence, not status defaults. The current strict schema
remains the validation owner.

Web reconstructed semantic identities from message/selector tuples and checked
only supported-profile. It now references opaque catalog IDs and independently
checks semantic admission, exposure and PostgreSQL conformance. Operand/schema
availability remains in Web. Mapping enables authoring, not execution or a
provider-accepted claim. No public wire shape, version, registry or compatibility
facade is added.

## Red/green evidence

Before the fix, the real TypeScript compiler accepted both missing-posture group
probes (two unused `@ts-expect-error` diagnostics). Nine Web tests failed:
identity reconstruction occurred 16 times, absent/unexposed posture still offered
actions, and missing/unavailable targets were ignored. After the fix the compiler
rejects omissions, and all those Web checks pass. Additional schema cases reject
empty/duplicate targets and missing evidence or rationale.

The canonical serialized catalog equals the pre-change `main@ee66b4d` baseline:
SHA-256 `f36095bf7065f4bf342e57895b9c0d58de8d76161b0c46943abcc3993a0fed88`.
It still contains 68 entries, 57 semantically admitted and 55 visually exposed.
Structured/nested remains unavailable and unexposed. Operation ordering and the
existing actions are preserved; unrelated candidates do not create new actions.

## Validation

- Contracts package: 69 files / 703 tests passed, including schema-sync and
  catalog canonicalization.
- Web operation choices, menu model and composition contracts: 6 files / 150
  tests passed.
- Web menu/composition presentation: 7 files / 30 tests passed.
- Native Cypress operation-menu flow: 4 tests passed. The original expectation
  that Filter needed a selected producer was stale since #3436. It now checks
  pending placement, absent Input and cancellation with no semantic writes;
  keyboard/search/focus checks remain. The added pending-placement case uses
  explicit selection, not an assumption about fuzzy search ordering.
- Contracts and Web typechecks passed.
- Scoped ESLint and `pnpm arch:deps` passed. Initial lint diagnostics in the new
  tests were corrected without changing the rules.
- The committed complete diff classifies ARC-2, requiring this evidence and the
  existing capability risk update; rollout/compatibility artifacts are not routed.
- `pnpm validate:contracts` passed 25 checks; its pre-existing absent glossary is
  not counted as validated. `pnpm golden:validate` passed implemented hash cases;
  its two deprecated entries and one unimplemented retry skip are not provider proof.

Final presentation/browser results, hook-normalized prepush, exact base/head
mechanization and required remote checks are recorded on the issue and PR. The
browser flow uses the existing fixture-backed API: it proves menu interaction,
not live provider execution. Runtime ownership/unknown-outcome P0s remain separate.

## No debt and limits

No tests removed, rules relaxed, hooks bypassed, stubs or fallback success paths
added. No application data accessed. No Planning DB import/rebuild performed;
only bounded architecture/rail registration and normal governed checks are used.
The existing risk records an enduring evidence-maintenance obligation, not new
approved debt. This cut does not claim to solve #2678, #2679 or #3483.
