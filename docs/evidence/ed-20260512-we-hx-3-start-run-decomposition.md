---
title: WE-HX-3 start-run application decomposition
status: Accepted
date: 2026-05-12
owners:
  - '@dvt/engine'
arc_level: ARC-2
breaking: false
code_refs:
  - packages/@dvt/engine/src/application/StartRunApplicationService.ts
  - packages/@dvt/engine/src/services/startRun/StartRunAdmissionService.ts
  - packages/@dvt/engine/src/services/startRun/StartRunIntentService.ts
  - packages/@dvt/engine/test/architecture/startRunApplicationDecomposition.architecture.test.ts
  - packages/@dvt/engine/test/architecture/startRunApplicationDecompositionDocs.architecture.test.ts
  - packages/@dvt/engine/test/architecture/engineArchitectureTestSupport.ts
  - scripts/lib/feature-mechanization-manifest.cjs
evidence:
  tests:
    - pnpm --filter @dvt/engine test -- test/services/StartRunApplicationDecomposition.test.ts
    - pnpm --filter @dvt/engine test -- test/architecture/startRunApplicationDecomposition.architecture.test.ts
    - pnpm --filter @dvt/engine test -- test/architecture/startRunApplicationDecompositionDocs.architecture.test.ts
    - node --test scripts/feature-mechanization-manifest.test.cjs
    - pnpm docs:feature-mechanization -- --feature WE-HX-3-START-RUN-DECOMPOSITION
    - pnpm docs:feature-mechanization:implementation
    - pnpm --filter @dvt/engine test
---

# WE-HX-3 Start-Run Application Decomposition Evidence

This evidence records the ARC-2 proof for the WE-HX-3 engine decomposition
slice. The slice adds internal phase services for start-run admission and
intent creation, updates the application coordinator to delegate those phases,
and adds semantic architecture coverage to prevent drift.

The public `IWorkflowEngine` and start-run boundary contracts are unchanged.

## Hardcut Update

On 2026-05-15 the slice removed the older DHM-named active artifacts for the
same start-run decomposition. The active WE-HX-3 architecture guard now parses
structured feature mechanization data and requires a single start-run
decomposition feature identity for the `IWorkflowEngine.startRun` command rail.

## QA Hardening Update

On 2026-05-15 the slice also implemented the QA hardening plan recorded in
`buzon/20260515-codex-we-hx-3-qa-hardening-tasks.md`.

The follow-up separates semantic architecture checks from documentation-pack
completeness checks. Runtime decomposition remains guarded by
`startRunApplicationDecomposition.architecture.test.ts`; the component document
contract, diagram pack, user stories, ARC-2 evidence, risk register entry, and
closeout declaration are guarded by
`startRunApplicationDecompositionDocs.architecture.test.ts`.

Feature-mechanization parsing is now owned by
`scripts/lib/feature-mechanization-manifest.cjs`. The CLI script delegates to
that module, and `scripts/feature-mechanization-manifest.test.cjs` covers
multiple manifests, parse errors, and empty documents. Engine architecture tests
no longer import the CLI script.

The component guide declares a structured `component-doc-contract` with the
`IWorkflowEngine.startRun` command rail, public API, required semantic slots,
and diagram-pack path. The guard validates those stable keys instead of relying
on human heading text.

The feature-mechanization implementation checker was also corrected to ignore
symbols that were added and then removed within the same branch diff. That keeps
the checker aligned with the final tree and avoids requiring manifest entries
for retired brittle constants.
