---
title: API HTTP error translation public API facade closeout
status: Done
owner: api
last_reviewed: 2026-04-21
planning_type: closeout
---

# API HTTP error translation public API facade closeout

## Think-First Analysis

- Problem summary:
  The HTTP error translation boundary now behaves like a local component, but
  production consumers still depend on internal mapper/classifier modules
  directly. That weakens semantic encapsulation and keeps the component API
  implicit.
- Root cause:
  The previous hardening pass improved ownership and documentation, but it did
  not consolidate the public component surface. Route consumers still import
  internal modules because the component has no explicit public entrypoint.
- Constraints and invariants:
  - `AGENTS.md` requires doc-driven work, no hidden debt, and end-to-end
    validation.
  - `docs/guides/ai-work-protocol.md` requires think-first and
    pre-implementation brief before code changes.
  - `docs/contracts/shared/HttpErrorEnvelope.v1.md` remains the only canonical
    caller-visible error contract.
  - `httpErrorMapper.ts` must not reclaim runtime-domain classification.
  - Runtime-domain translation must remain typed and must not parse
    `error.message`.
- Options considered:
  - Keep direct imports and rely only on docs: rejected because it preserves
    implicit API shape and weak semantic encapsulation.
  - Add a plain barrel with re-exports only: rejected because it improves
    import ergonomics but not semantic ownership.
  - Add a public component API module with concern-grouped entrypoints:
    selected because it gives one public seam while preserving internal module
    ownership.
- Selected option and rationale:
  Introduce a dedicated `httpErrorTranslation.ts` public API module exporting a
  concern-grouped object. Migrate production consumers to that seam and lock it
  with a semantic architecture test.
- Rejected alternatives:
  - Full class-based object model for the component: unnecessary stateful
    ceremony for a pure translation boundary.
  - Moving all logic into one file: regresses SRP and would collapse the
    ownership gains from the previous iteration.

## Pre-Implementation Brief

- Mode: Slim
- Scope:
  Add a public API seam for the HTTP error translation component, migrate
  production consumers to it, and align docs/tests with the new encapsulation
  model.
- Touched files or paths:
  - `apps/api/src/entrypoints/http/httpErrorTranslation.ts`
  - production consumers under `apps/api/src/entrypoints/http/*`
  - component docs and architecture docs
  - HTTP error translation architecture/behavior tests
- Expected outcome:
  Production code depends on one explicit component API instead of internal
  mapper/classifier files.
- Risks and mitigations:
  - Risk: turning the new module into an ungoverned barrel.
    Mitigation: architecture test will assert concern-grouped API shape and
    retain internal module ownership.
  - Risk: doc drift between local component guide and canonical architecture
    overview.
    Mitigation: update both in the same slice and run docs sync.
- Out-of-scope items:
  - changing the caller-visible error envelope
  - changing runtime/domain semantics
  - broad route parser refactors outside this component
- Validation plan:
  - focused `vitest` for HTTP error translation tests
  - `tsc` for `apps/api` source and tests
  - focused `eslint` on touched files
  - markdown lint for touched docs
  - `pnpm docs:sync`
  - `pnpm docs:status:generate`
  - `pnpm verify:prepush`
- Test coverage plan:
  - architecture test for public API seam and consumer imports
  - behavior test through the new public API object
  - no regression to direct internal imports in production consumers
- Libraries evaluated:
  None evaluated - local encapsulation refactor inside an existing component.

## Traceability

- Governing sources:
  - `AGENTS.md`
  - `docs/planning/status/governance-document-rule-inventory.md`
  - `docs/guides/ai-work-protocol.md`
  - `docs/contracts/shared/HttpErrorEnvelope.v1.md`

## Real Work Performed

- Added `apps/api/src/entrypoints/http/httpErrorTranslation.ts` as the public
  component API grouped by semantic concern.
- Migrated production consumers away from direct imports of
  `httpErrorMapper.ts` and `httpDomainErrorClassifier.ts`:
  - admin routes
  - runtime query routes
  - authorization seams
  - plan route request resolver
  - start-run route
  - workspace graph draft routes
- Updated the behavior test to exercise the public component API rather than
  internal modules.
- Updated the local component guide and canonical API architecture overview to
  reflect the new seam.
- Added this closeout as the think-first, implementation brief, and completion
  record for the iteration.

## Governing sources used

- `AGENTS.md`
- `docs/planning/status/governance-document-rule-inventory.md`
- `docs/guides/ai-work-protocol.md`
- `docs/contracts/shared/HttpErrorEnvelope.v1.md`

## Validation evidence

- `pnpm exec vitest run --config vitest.config.ts test/entrypoints/http/httpRuntimeErrorTranslation.architecture.test.ts test/entrypoints/http/httpErrorTranslation.test.ts`
  in `apps/api`
- `pnpm exec tsc -p tsconfig.json --noEmit` in `apps/api`
- `pnpm exec tsc -p test/tsconfig.json --noEmit` in `apps/api`
- `pnpm exec eslint --max-warnings 0 ...` on the touched HTTP component files
- `pnpm exec markdownlint-cli2 ...` on the touched docs
- `pnpm docs:sync`
- `pnpm docs:status:generate`
- `pnpm verify:prepush`

## No-debt evidence

- No compatibility re-export or legacy path was added.
- No rules, hooks, or validations were bypassed.
- Internal modules remain split by concern; the public API seam did not collapse
  them into one file.

## No-stub evidence

- `httpErrorTranslation.ts` delegates to real internal translators already used
  by production code.
- The architecture test locks semantic API usage by consumers instead of
  asserting a fake thin barrel.
