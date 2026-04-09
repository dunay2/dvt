---
slice: s1-manifestref-production-path
date: 2026-03-31
author: AI (GPT-5)
last_reviewed: 2026-03-31
---

# Closeout: S1 manifestRef production path

## Think-First Analysis

- Problem summary:
  the canonical production planner input `manifestRef` is accepted by the
  public boundary but is not composed end-to-end in `apps/api`, so documented
  caller input can fail with planner `INVALID_INPUT` or opaque runtime errors.
- Root cause:
  `PlannerFacade` already owns `manifestRef` resolution through
  `IArtifactResolver`, but `buildProtectedRuntimeModule` instantiates it
  without a concrete resolver and `PlannerBackedStartRunUseCase` does not
  translate predictable resolver failures into the existing `plan_rejected`
  surface.
- Constraints and invariants (ADRs: ADR-0003, ADR-0034, ADR-0035):
  - planner domain logic must remain IO-free and deterministic
  - infrastructure access belongs behind ports and adapters
  - `PlannerFacade` is the public planner application boundary
  - public planner-boundary semantics must stay coherent with
    `PlannerInputEnvelopeV2`
- Options considered:
  - move `manifestRef` dereference into `Planner`
  - add API-local manifest normalization logic independent from planner
  - complete the missing resolver composition at the application boundary and
    share manifest normalization through a stable planner export
- Selected option and rationale:
  keep `Planner` pure, keep `PlannerFacade` as the resolver-owning boundary,
  add a concrete API resolver, and map predictable resolver failures to the
  existing `plan_rejected` result. This fixes the live path without weakening
  the planner boundary.
- Rejected alternatives:
  - planner-domain IO: violates the hexagonal boundary and determinism posture
  - duplicated manifest normalization in `apps/api`: creates semantic drift
    between inline manifest and `manifestRef` paths

## Pre-Implementation Brief

- Mode: Full
- Scope:
  `packages/@dvt/planner/**`, `apps/api/**`, ARC evidence/risk docs, generated
  docs status, and this closeout.
- Touched files or paths:
  planner public exports and tests, API runtime composition, a new planner
  infrastructure adapter in `apps/api`, unit tests, integration tests, and ARC
  evidence/risk surfaces.
- Expected outcome:
  `manifestRef` becomes the real planner path in protected runtime, inline
  manifest and artifact-backed manifest share one canonical normalization rule,
  and caller-fixable resolver failures return deterministic `422 plan_rejected`
  responses.
- Risks and mitigations:
  - risk: change leaks IO concerns into the planner core
    mitigation: keep resolver injection at `PlannerFacade` only
  - risk: resolver failures become opaque `500`s or ad hoc statuses
    mitigation: map only typed predictable failures into existing
    `plan_rejected / REJECTED`
  - risk: test coverage misses production composition
    mitigation: cover helper, resolver, use case mapping, facade integration,
    and protected runtime integration
- Out-of-scope items:
  - changing `PlannerInputEnvelopeV2`
  - adding new manifest bucket env vars
  - moving `IArtifactResolver` out of `@dvt/planner`
- Validation plan:
  `arc-check`, planner build/test, API typecheck/test/integration/arch, docs
  sync/status generation, and `verify:prepush`
- Test coverage plan:
  add negative tests for unsupported scheme, file scheme in production,
  artifact missing, sha mismatch, invalid manifest payload, predictable
  rejection mapping in `PlannerBackedStartRunUseCase`, and a real
  `manifestRef` planner/runtime integration path
- Libraries evaluated:
  None evaluated; existing AWS SDK usage in-repo is sufficient for the S3
  adapter

## Traceability (Full mode only)

- Baseline ADRs (verified in Phase 3):
  ADR-0003, ADR-0034, ADR-0035
- Canonical contract:
  `packages/@dvt/contracts/src/contracts/planner/ExecutionPlan.v2.ts`
- Generated artifacts:
  planner helper export, API manifest resolver, ARC evidence/risk update,
  tests, docs indexes/status, and this closeout

## Implementation Log

- Added `derivePlannerGraphSourceFromManifest(...)` in
  `packages/@dvt/planner/src/application/derivePlannerGraphSourceFromManifest.ts`
  and routed `PlannerFacade` manifest normalization through it.
- Exported the helper from `@dvt/planner` so runtime consumers can normalize
  resolved manifest payloads without duplicating planner semantics.
- Added `ManifestArtifactResolutionError` in
  `apps/api/src/application/errors/ManifestArtifactResolutionError.ts` with the
  stable failure kinds:
  - `unsupported_scheme`
  - `file_scheme_prohibited`
  - `artifact_not_found`
  - `integrity_mismatch`
  - `invalid_manifest_payload`
- Added `ManifestArtifactResolver` in
  `apps/api/src/infrastructure/planner/ManifestArtifactResolver.ts`.
  - supports `s3://bucket/key` in every environment
  - supports `file://` only when `NODE_ENV !== 'production'`
  - verifies SHA-256 on raw bytes before parsing JSON
  - converts manifest payloads through the shared planner helper
- Updated `PlannerBackedStartRunUseCase` to catch only typed predictable
  manifest resolution failures and map them to `plan_rejected / REJECTED` with
  stable cause tokens.
- Wired `buildProtectedRuntimeModule` to instantiate `PlannerFacade` with the
  concrete resolver.
- Moved `@dvt/planner` into `apps/api` runtime dependencies and added
  `@aws-sdk/client-s3`.
- Added tests for:
  - planner helper export
  - resolver file/S3 success and negative paths
  - `PlannerBackedStartRunUseCase` rejection mapping
  - real planner integration via `manifestRef`
  - protected runtime integration coverage for `manifestRef` success and SHA
    mismatch
- Added ARC evidence and risk artifacts for this slice.
- Repaired a pre-existing ARC evidence frontmatter issue in
  `docs/evidence/context/ED-20260311-execution-core-assessment.md` so the full evidence
  validator passes again.

## Validation

- `pnpm docs:sync`
  - Passed
- `pnpm docs:workboard:generate`
  - Passed
- `pnpm docs:status:generate`
  - Passed
- `pnpm --filter @dvt/planner build`
  - Passed
- `pnpm --filter @dvt/planner test`
  - Passed
- `pnpm --filter dvt-api typecheck`
  - Passed
- `pnpm --filter dvt-api test`
  - Passed
- `pnpm --filter dvt-api test:integration`
  - Passed
  - `plannerEngineContract.test.ts` passed
  - `protectedRuntime.integration.test.ts` skipped cleanly because
    `DVT_PG_URL` / `DATABASE_URL` were absent in this workspace
- `pnpm --filter dvt-api test:arch`
  - Passed
- `pnpm lint:md`
  - Passed
- `pnpm docs:arc:evidence:check`
  - Passed after fixing the pre-existing `ED-20260311` empty `evidence.tests`
    array
- `GIT_BASE=origin/main GIT_HEAD=HEAD node tools/ci/arc-check.mjs`
  - Passed
  - reported `ARC-0` because the local unstaged diff is not used by that script,
    but ARC-2 evidence/risk artifacts were still persisted because the slice
    touches `packages/@dvt/planner/**`
- `pnpm verify:prepush`
  - Passed

## Debt Introduced

- No new debt entry created.
- No rules, hooks, or checks were disabled.
- No compatibility shim, placeholder, or fake adapter was introduced.
- No planner-domain IO was added.
