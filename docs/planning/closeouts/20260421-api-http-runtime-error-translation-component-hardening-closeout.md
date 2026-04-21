---
slice: 20260421-api-http-runtime-error-translation-component-hardening
date: 2026-04-21
last_reviewed: 2026-04-21
work_item: refactor(api)
status: Done
author: AI (GPT-5)
---

# Closeout: API HTTP runtime error translation component hardening

## Think-First Analysis

### Problem summary

The HTTP error-envelope boundary in `apps/api/src/entrypoints/http/` had gained
an explicit classifier seam, but it still lacked semantic encapsulation in four
important ways:

1. no local component guide near the code
2. no short owned-concern docblocks at module entry
3. duplicated optional-details helpers across mapper and classifier
4. no semantic architecture test locking ownership and direct-consumer rules

### Root cause

The earlier slice focused on SRP extraction and behavioral safety, but stopped
before turning the seam into a documented local component with explicit
ownership, invariants, and guardrails.

### Constraints and invariants

- `AGENTS.md`: no hidden debt, no fake compatibility shims, real validation
- `docs/guides/ai-work-protocol.md`: Slim mode is valid because the component
  hardening does not change the public caller-visible contract
- `HttpErrorEnvelope.v1` remains the canonical caller-visible contract
- `apps/api` owns transport translation, not run lifecycle semantics
- local docs under `apps/api` must stay outside forbidden code directories

### Options considered

1. leave the seam as code plus closeout only
   - Rejected: reviewers still need to reverse-engineer ownership from source.

2. document only in canonical `docs/architecture/components/api/*`
   - Rejected: helpful but still leaves no local guide near the code.

3. create a local component guide, add semantic architecture coverage, and
   tighten the internal module surface
   - Selected: best balance of proximity, traceability, and enforceable
     ownership.

### Selected option and rationale

Treat the HTTP error translation boundary as a local component inside `apps/api`
with:

- a local guide under `apps/api/docs/`
- docblocks on each owned module
- a shared helper for optional `details`
- a semantic architecture test
- links from the canonical API component home

### Rejected alternatives

- leave duplication in place because the helpers are small
- rely on review discipline instead of an architecture test
- create a compatibility barrel around the component

## Pre-Implementation Brief

- **Mode**: Slim
- **Scope**:
  - `apps/api/src/entrypoints/http/httpErrorContract.ts`
  - `apps/api/src/entrypoints/http/httpErrorReasonCatalog.ts`
  - `apps/api/src/entrypoints/http/routeParseIssue.ts`
  - `apps/api/src/entrypoints/http/httpErrorMapper.ts`
  - `apps/api/src/entrypoints/http/httpDomainErrorClassifier.ts`
  - NEW `apps/api/src/entrypoints/http/httpErrorDetails.ts`
  - NEW `apps/api/test/entrypoints/http/httpRuntimeErrorTranslation.architecture.test.ts`
  - NEW `apps/api/docs/http-runtime-error-translation-component.md`
  - `apps/api/README.md`
  - `docs/architecture/components/api/index.md`
  - `docs/architecture/components/api/api-current-to-target-architecture.md`
  - NEW this closeout file
- **Expected outcome**:
  - local component guide exists
  - module-level ownership is explicit
  - shared helper removes repetition
  - architecture test validates semantic ownership and direct consumer imports
- **Risks and mitigations**:
  - Risk: local guide drifts from canonical contract.
    Mitigation: document it explicitly as local/supporting, not canonical.
  - Risk: architecture test becomes a brittle text snapshot.
    Mitigation: assert ownership and prohibited dependencies, not formatting.
- **Out-of-scope items**:
  - caller-visible contract redesign
  - route behavior changes
  - planner/runtime component changes outside this boundary
- **Validation plan**:
  - targeted Vitest for architecture and mapper behavior
  - package TypeScript checks
  - docs sync and code-state regeneration
  - `verify:prepush`
- **Test coverage plan**:
  - architecture test for ownership/docblocks/direct imports
  - regression test for classifier behavior remains green
- **Libraries evaluated**:
  - None evaluated; local component hardening only

## Traceability

- Governing sources:
  - `AGENTS.md`
  - `docs/planning/status/governance-document-rule-inventory.md`
  - `docs/guides/ai-work-protocol.md`
  - `docs/contracts/shared/HttpErrorEnvelope.v1.md`

## Real Work Performed

- Added `httpErrorDetails.ts` as the shared helper for optional error details.
- Added owned-concern docblocks to the boundary modules:
  - `httpErrorContract.ts`
  - `httpErrorReasonCatalog.ts`
  - `routeParseIssue.ts`
  - `httpErrorMapper.ts`
  - `httpDomainErrorClassifier.ts`
- Added `httpRuntimeErrorTranslation.architecture.test.ts` to lock:
  - shared helper usage
  - direct runtime-classifier imports by route consumers
  - classifier ownership of typed runtime errors
  - mapper exclusion of runtime-domain classification and contract re-exports
- Added a local guide at `apps/api/docs/http-runtime-error-translation-component.md`
  with API, invariants, transitions, consumers, and diagrams.
- Rewrote `apps/api/README.md` to remove encoding damage and route readers to
  the local guide.
- Updated canonical API architecture docs to reference the local guide and the
  boundary split.

## Governing sources used

- `AGENTS.md`
- `docs/planning/status/governance-document-rule-inventory.md`
- `docs/guides/ai-work-protocol.md`
- `docs/contracts/shared/HttpErrorEnvelope.v1.md`

## Validation evidence

- `pnpm exec vitest run --config vitest.config.ts test/entrypoints/http/httpRuntimeErrorTranslation.architecture.test.ts`
  in `apps/api`
- `pnpm exec vitest run --config vitest.config.ts test/entrypoints/http/httpErrorTranslation.test.ts`
  in `apps/api`
- `pnpm exec tsc -p tsconfig.json --noEmit` in `apps/api`
- `pnpm exec tsc -p test/tsconfig.json --noEmit` in `apps/api`
- `pnpm docs:sync`
- `pnpm docs:status:generate`
- `pnpm verify:prepush`

## No-debt evidence

- No legacy import path was reintroduced.
- No rules or hooks were bypassed.
- No stubs or placeholders were added.

## No-stub evidence

- The new helper only centralizes existing behavior.
- The architecture test validates ownership semantics instead of mocking the
  component into a fake abstraction.
