---
title: Single operational workload V1 hard cut
status: draft
date: 2026-10-04
owners:
  - '@dvt/contracts'
  - dvt-api
  - '@dvt/temporal-dvt-postgres-plugin'
arc_level: ARC-2
breaking: true
code_refs:
  - packages/@dvt/contracts/src/contracts/planner/DvtOperationalWorkload.v1.ts
  - packages/@dvt/contracts/src/index.ts
  - apps/api/src/application/services/dvtOperationalWorkloadProjector.ts
  - apps/api/src/application/services/dvtPostgresExecutionContextBinding.ts
  - packages/@dvt/temporal-dvt-postgres-plugin/src/DvtPostgresStepActivity.ts
  - packages/@dvt/contracts/src/contracts/planner/DvtOperationalRejection.v1.ts
  - apps/web/src/app/services/api/dvtOperationalRejectionCopy.ts
  - apps/web/src/app/components/PlanPreviewModal.tsx
evidence:
  tests:
    - pnpm --filter @dvt/contracts test
    - pnpm --filter @dvt/contracts typecheck
    - pnpm --filter dvt-api typecheck
    - pnpm --filter dvt-api lint
    - pnpm --filter dvt-api test:unit test/application/services/dvtOperationalWorkloadProjector.test.ts test/application/services/RunExecutionContextBindingUseCase.dvt.test.ts test/application/services/dvtSortFetchPreview.test.ts test/application/services/dvtRepeatedSourceRun.test.ts test/application/services/dvtNInputPreview.test.ts
    - pnpm --filter dvt-api test:integration:ci test/integration/dvtProtectedPreview.integration.test.ts
    - pnpm --filter @dvt/temporal-dvt-postgres-plugin test
    - pnpm --filter @dvt/temporal-dvt-postgres-plugin typecheck
    - pnpm --filter dvt-temporal-worker typecheck
    - pnpm --filter @dvt/web test:architecture:run src/app/views/canvas/CanvasShell.architecture.test.tsx
    - pnpm --filter @dvt/web test:unit:run src/app/services/api/protectedRuntimeRejection.test.ts src/app/services/runs/runsService.test.ts src/app/services/plans/plansService.preview.test.ts
    - pnpm --filter @dvt/web test:presentation:run src/app/components/PlanPreviewModal.outcomes.test.tsx
    - pnpm --filter @dvt/web typecheck
    - pnpm --filter @dvt/web lint
    - pnpm verify:prepush
---

# Single operational workload V1 hard cut

## Governing authority

The [user-directed scope and Fowler analysis](https://github.com/dunay2/dvt/issues/2524#issuecomment-5983363139)
preceded implementation. Planning DB design `GH-2524-SINGLE-WORKLOAD-V1` supersedes
the Preview-V1/Run-V2 design. Existing `PreviewPlan`, `CompilePlan` and `StartRun`
rails, ADR-0035, ADR-0064 and ADR-0066 remain authoritative. The
[active contract](../contracts/planner/dvt-operational-workload-v1.md) owns admission
and coordinated producer/worker rollout; no migration or parallel rail is added.

## Real change

One shared V1 envelope and ownership check serve two explicit intent variants.
Run keeps its target, digest, publication policy and connection equality checks.
The API projector parses once, and the registry no longer tries V2 then falls back
to V1. The context binder and plugin admit only Run; Preview rejects before any
context resolution or provider effects. All source consumers and fixtures use V1.
The V2 source and its stale generated artifacts are removed. Historical evidence
links to the exact prior Git revision instead of a nonexistent active contract.

The root index remains a publication-only surface. Repeated complete-module
export lists are reduced; partial exports remain explicit. A TypeScript export
comparison against `origin/main` initially found 956 exports before and after:
the four retired V2/compatibility names were replaced by four Preview/Run V1
variant names. The initial i18n correction added three rejection-catalog
exports. The following user-approved descriptor refactor replaces the factory
and diagnostic-only map with named catalogs and shared message types; the index
remains exports-only.

The requested tabs separation already exists: controller decisions in
`CanvasWorkspaceModelTabs.tsx`, markup in its `.templates.tsx` and styles in
`canvasSemanticEditor.css`. The existing architecture test verifies passive
templates, no inline styles and no intrinsic controller markup. No extra layer
or duplicate stylesheet was introduced.

The [i18n review and preimplementation rationale](https://github.com/dunay2/dvt/issues/2524#issuecomment-5983629070)
and Planning DB design `GH-2524-WORKLOAD-REJECTION-I18N` add ADR-0044 as governing
authority. Binding and projection return typed causes. Existing HTTP envelopes
retain non-semantic diagnostic descriptions; Web uses EN/ES copy by cause and a
safe fallback for unknown DVT causes. Preview follows language changes without
duplicated state or effects. No new translation framework or wire version is added.
The redundant multi-workload loop and unreachable connection branches are removed.

The [typed-definition continuation](https://github.com/dunay2/dvt/issues/2524#issuecomment-5983906038)
and Planning DB design `GH-2524-TYPED-REJECTION-DEFINITIONS` replace raw cause
construction with named frozen DVT/Run definitions. `MessageDescriptor` reuses
the contract-error structure; expected rejections are values, not exceptions.
Run's string overload and bundle-message switch are removed, and its DBT
binding branches now retain distinct causes with EN/ES presentation. Existing
wire `code`/`cause`/`reason` fields remain; fixed messages need no new wire key
or parameters. No provider generalization or CI-routing change is included.

Continuation evidence: 795 contracts tests, 77 affected API tests, 78 Web service
tests and 6 rendered Preview tests pass. Descriptor tests first failed because
the catalogs did not exist, then passed. Type assertions were additionally
compiled with TypeScript (not inferred from Vitest execution). Final lint,
typecheck, mechanization and prepush outcomes are recorded on the issue for the
exact committed candidate; previous runs are not evidence for a later SHA.

## Executed evidence and limits

- TDD: three Run/publication assertions failed against the old V1; they pass
  after the hard cut. Retired V2, missing intent, mismatched output/intent and
  absent Run digest are explicit negative cases.
- Contracts: all 793 tests passed after the final Preview-intent negatives.
- API affected units: 77 passed. Protected PostgreSQL integration: 4 passed,
  persisting/replaying one, two and three Preview inputs and a Run plan.
- Plugin: 9 passed, including valid Preview and retired V2 rejection before effects.
- Tabs architecture: 10 passed. Contracts and API typechecks passed.
- Web rejection/service tests: 63 passed. Rendered Preview tests: 6 passed,
  including language changes while open and suppression of raw diagnostics.
- i18n TDD: one API cause assertion and three Web presentation assertions failed
  before implementation and pass after correction. No test branches on English
  business diagnostics; localized-copy assertions remain presentation tests.
- Traceability was regenerated with the owning generator, not manually patched.

The PostgreSQL integration used the existing test database and only its generated
UUID-scoped schema, removed by the test. No application/source data or database
was deleted. This is not a new live Temporal/browser execution claim.

The exact final gate results and commit IDs are recorded on #2524. No integration
or green pre-push result is implied by this draft evidence record. No rules were
relaxed, hooks bypassed, or stubs/compatibility aliases/debt entries introduced.

The existing [Run workload drift risk](../risk-register/quality/R-20260915-TRANSFORM-RUN-WORKLOAD-DRIFT.yaml)
now explicitly includes rejecting old formats and coordinating producer/worker
deployment. Old persisted plans must be recreated through protected Preview;
they are not silently converted or truncated.
