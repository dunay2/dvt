---
title: API HTTP error translation response writer unification closeout
status: Done
owner: api
last_reviewed: 2026-04-21
planning_type: closeout
---

# API HTTP error translation response writer unification closeout

## Think-First Analysis

- Problem summary:
  The branch now has a documented public API for HTTP error translation, but
  some route consumers still serialize mapped `HttpResponseModel` values
  manually instead of using the owned serializer `sendHttpResponse`.
- Root cause:
  The component façade and the component serializer were introduced in
  different iterations. Consumer imports were unified first, but the final
  transport handoff was left partially manual.
- Constraints and invariants:
  - `AGENTS.md` requires explicit documentation, no hidden debt, and real
    validation.
  - `docs/guides/ai-work-protocol.md` allows Slim mode because this is a
    refactor without public contract changes.
  - `HttpErrorEnvelope.v1` remains the canonical caller-visible contract.
  - `httpErrorTranslation.ts` remains the public translation API.
  - `sendHttpResponse` remains the owned serializer for `HttpResponseModel`.
- Options considered:
  - leave manual serialization in place: rejected because it weakens semantic
    encapsulation and reintroduces drift.
  - create a new route helper instead of using `sendHttpResponse`: rejected for
    now because the existing serializer already owns the correct behavior.
  - unify all mapped-response writing through `sendHttpResponse` and lock it in
    an architecture test: selected because it closes the drift with minimal
    additional surface.
- Selected option and rationale:
  Reuse the existing `sendHttpResponse` serializer everywhere a route emits a
  translated `HttpResponseModel`, and extend the semantic architecture test so
  production consumers do not regress into manual serialization.
- Rejected alternatives:
  - introducing another public helper before exhausting the owned serializer
  - broad route success-path refactors unrelated to translated responses

## Pre-Implementation Brief

- Mode: Slim
- Scope:
  - selected HTTP route consumers
  - HTTP error translation architecture test
  - local/canonical docs for the component
  - this closeout
- Expected outcome:
  translated `HttpResponseModel` values are emitted through the owned
  serializer consistently across the component consumers.
- Risks and mitigations:
  - Risk: architecture assertions become overly text-fragile.
    Mitigation: assert semantic anti-patterns only where the drift exists.
  - Risk: accidental behavior change in header writing.
    Mitigation: reuse `sendHttpResponse`, which already owns header emission.
- Out-of-scope items:
  - success payload serialization
  - new route helper abstractions beyond `sendHttpResponse`
  - changes to the canonical error envelope
- Validation plan:
  - focused Vitest on architecture and behavior tests
  - package TypeScript checks
  - focused ESLint
  - markdown lint on touched docs
  - `pnpm docs:sync`
  - `pnpm docs:status:generate`
  - `pnpm verify:prepush`
- Test coverage plan:
  - architecture assertion for use of `sendHttpResponse` in translated response
    paths
  - existing behavior tests remain green to prove no contract drift
- Libraries evaluated:
  None evaluated - local refactor around an existing owned serializer.

## Traceability

- Governing sources:
  - `AGENTS.md`
  - `docs/planning/status/governance-document-rule-inventory.md`
  - `docs/guides/ai-work-protocol.md`
  - `docs/contracts/shared/HttpErrorEnvelope.v1.md`

## Real Work Performed

- Added branch-level Fowler analysis to
  `buzon/20260421-codex-fowler-branch-analysis-http-error-translation-stack.md`.
- Unified translated `HttpResponseModel` writing through `sendHttpResponse` in:
  - `apps/api/src/entrypoints/http/listRunsRoute.ts`
  - `apps/api/src/entrypoints/http/startRunRoute.ts`
- Extended `httpRuntimeErrorTranslation.architecture.test.ts` to lock:
  - use of `sendHttpResponse` for translated responses
  - absence of manual `reply.code(...).send(...)` for mapped
    `HttpResponseModel` values in the known drift cases
- Updated the local component guide and canonical API architecture overview to
  document the serializer invariant.

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
- `pnpm exec eslint --max-warnings 0 apps/api/src/entrypoints/http/listRunsRoute.ts apps/api/src/entrypoints/http/startRunRoute.ts apps/api/test/entrypoints/http/httpRuntimeErrorTranslation.architecture.test.ts`
- `pnpm docs:sync`
- `pnpm docs:status:generate`
- `pnpm exec markdownlint-cli2 apps/api/docs/http-runtime-error-translation-component.md docs/architecture/components/api/api-current-to-target-architecture.md docs/planning/closeouts/20260421-api-http-error-translation-response-writer-unification-closeout.md buzon/20260421-codex-fowler-branch-analysis-http-error-translation-stack.md --config .markdownlint-cli2.jsonc --ignore-path .markdownlintignore`
- `pnpm verify:prepush`

## No-debt evidence

- No new legacy path or compatibility layer was added.
- No rules, hooks, or checks were bypassed.
- The change reused the existing owned serializer instead of adding another
  helper layer.

## No-stub evidence

- The architecture test validates a real consumer behavior constraint.
- The code change removes manual transport writing instead of wrapping it in a
  placeholder abstraction.
