---
slice: tf-e2-protected-runtime-dev-auth-alignment
date: 2026-04-22
lane: E
task_id: TF-E2-A, TF-E2-E
mode: Full
status: In progress
author: AI (Codex)
last_reviewed: 2026-04-22
---

# TF-E2 protected-runtime dev-auth alignment closeout

## Phase 1. Think-First Analysis

### Problem summary

Canvas authoring is now hard-cut to the protected
`/workspace/graph/draft` boundary, but the canonical local dev stack does not
yet provide the auth posture that boundary requires.

The observed runtime symptom is:

- the Canvas route boots in `api` mode
- the browser attempts `GET /workspace/graph/draft`
- `apps/api` has not registered that route because local OIDC posture is absent
- the route therefore fails on `404` before any real authoring path can work

Even if the route were registered, the current web client still does not attach
an `Authorization: Bearer ...` header, so protected draft reads and writes
would remain blocked.

### Root cause

The root cause is a split local bootstrap story:

- `scripts/run-dev-stack.cjs` bootstraps local Postgres readiness but not local
  OIDC posture
- `apps/web/src/app/services/api/createApiClient.ts` injects workspace scope
  headers only; it has no governed bearer-token seam
- protected runtime authorization also depends on seeded principal grants in
  `${schema}.principal_grants`, which the local dev stack does not currently
  establish

This leaves the hard-cut Canvas route pointing at a real protected backend
boundary that local startup cannot actually satisfy.

### Constraints and invariants

- `AGENTS.md`: no mock fallback, no hidden debt, no fake success path, docs and
  validation must move with the code.
- `docs/guides/ai-work-protocol.md`: this is a `Full` slice because it changes
  runtime startup posture, dev workflow, frontend/backend integration wiring,
  tests, and documentation.
- `docs/planning/reviews/architecture-and-governance/20260422-canvas-runtime-truth-hardcut-review.md`:
  active Canvas authoring must either talk to protected runtime truth or fail
  closed.
- `docs/architecture/components/web/frontend-backend-contract-mvp-e1-20260404.md`:
  protected runtime routes require OIDC and bearer auth; auth failures must be
  surfaced as auth posture, not disguised as route absence.
- `docs/runbooks/backend-mvp-control-plane-runbook-20260329.md`: protected
  routes require `OIDC_JWKS_URI`, `OIDC_ISSUER`, `OIDC_AUDIENCE`, valid bearer
  tokens, and scope/action grants.
- `docs/runbooks/workspace-graph-draft-protected-boundary-20260416.md`:
  `GET` and `PUT /workspace/graph/draft` are authoritative and must not fall
  back to synthetic startup truth.

### Options considered

- reintroduce frontend fallback or mock-backed startup for Canvas authoring
- teach the local dev stack to bootstrap real protected-runtime auth posture
  and teach the web client to send a governed bearer token when configured

### Selected option and rationale

Bootstrap local protected-runtime auth for `pnpm dev:app` and add a canonical
bearer-token seam to `createApiClient`.

That fixes the real integration boundary instead of weakening the route or
reopening legacy startup behavior.

## Phase 2. Pre-Implementation Brief

- Mode: `Full`
- Scope:
  - `scripts/run-dev-stack.cjs`
  - `scripts/run-dev-stack.test.cjs`
  - new local dev-auth bootstrap helper(s)
  - `apps/api/scripts/**` for local JWKS/token bootstrap
  - `apps/web/src/app/services/api/createApiClient.ts`
  - new focused web API-client tests
  - backend/frontend runbooks for local protected runtime posture
- Expected outcome:
  - `pnpm dev:app` can register protected runtime routes locally without manual
    OIDC setup
  - the web client sends a bearer token when the coordinated stack provides one
  - local principal grants allow draft read/write for the default workspace
    scope
  - Canvas authoring talks to the real protected draft boundary instead of
    failing on missing route registration
- Risks and mitigations:
  - risk: dev-only auth bootstrap leaks into non-dev posture
    mitigation: bootstrap only when OIDC env is otherwise absent and keep the
    bearer seam explicit
  - risk: auth route registers but authorization still fails with `403`
    mitigation: seed the canonical principal grant during coordinated startup
  - risk: web auth injection becomes an implicit hidden feature
    mitigation: use one explicit env-backed bearer seam and document it
- Out of scope:
  - product login or full frontend auth UX
  - non-Canvas route redesign
  - reintroducing mock or snapshot-backed authoring fallback

## Phase 3. Normative Baseline Verification

Verified against the governing baseline:

- the hard-cut review requires truthful fail-closed posture instead of legacy
  compatibility
- the backend/frontend contract already classifies these endpoints as protected
  and OIDC-gated
- the control-plane runbook already defines the required env posture and auth
  semantics

## Phase 4. Traceability And Artifact Recording

- Governing review and contracts:
  - `docs/planning/reviews/architecture-and-governance/20260422-canvas-runtime-truth-hardcut-review.md`
  - `docs/architecture/components/web/frontend-backend-contract-mvp-e1-20260404.md`
  - `docs/runbooks/backend-mvp-control-plane-runbook-20260329.md`
  - `docs/runbooks/workspace-graph-draft-protected-boundary-20260416.md`
- Primary code artifacts:
  - `scripts/run-dev-stack.cjs`
  - local dev-auth helper module(s)
  - `apps/api/scripts/dev-protected-runtime-auth.mjs`
  - `apps/web/src/app/services/api/createApiClient.ts`
- Proof anchors:
  - `scripts/run-dev-stack.test.cjs`
  - focused web API-client header tests
  - live local smoke checks against `/workspace/graph/draft`

## Phase 5. Documentation Update

This slice must update the local-operability docs so the repository states the
real branch truth:

- `pnpm dev:app` bootstraps the protected runtime posture needed by Canvas
  authoring
- web bearer injection is explicit and env-backed
- local protected-runtime failures are diagnosed as auth/bootstrap problems, not
  as product fallback scenarios

## Implementation Summary

- added `scripts/run-dev-stack.auth.cjs` as the local protected-runtime auth
  bootstrap seam for the coordinated stack
- updated `scripts/run-dev-stack.cjs` so startup order is now:
  - bootstrap Postgres if needed
  - bootstrap local OIDC when absent
  - start API
  - wait for health and DB readiness
  - seed principal grants for the default workspace scope
  - start web with the injected bearer token
- added explicit frontend bearer resolution through
  `apps/web/src/app/services/api/apiAuthConfig.ts`
- updated `createApiClient.ts` so protected-runtime calls attach
  `Authorization: Bearer ...` when the coordinated stack provides a bearer token
- updated the backend control-plane runbook with the new local dev auth posture
  and triage order

## Validation

- `node --test scripts/run-dev-stack.auth.test.cjs scripts/run-dev-stack.test.cjs`
- `pnpm --filter @dvt/web exec vitest run --config vitest.config.ts src/app/services/api/createApiClient.test.ts`
- `pnpm exec eslint --max-warnings 0 scripts/run-dev-stack.cjs scripts/run-dev-stack.auth.cjs apps/web/src/app/services/api/createApiClient.ts apps/web/src/app/services/api/apiAuthConfig.ts apps/web/src/app/services/api/createApiClient.test.ts`
- `pnpm --filter @dvt/web typecheck`
- `pnpm exec markdownlint-cli2 docs/planning/closeouts/20260422-tf-e2-protected-runtime-dev-auth-alignment-closeout.md docs/runbooks/backend-mvp-control-plane-runbook-20260329.md`
- live smoke on alternate ports:
  - coordinated stack booted with protected runtime routes registered
  - `GET http://127.0.0.1:3010/workspace/graph/draft?tenantId=tenant&projectId=project&environmentId=dev`
    returned `401` instead of `404`, proving the route is mounted and the
    previous missing-OIDC failure is gone

## Residuals

- this slice does not add product login or a frontend auth UX
- live browser proof that Canvas can persist authoring end to end still belongs
  to the dedicated TF-E2 Cypress lane
