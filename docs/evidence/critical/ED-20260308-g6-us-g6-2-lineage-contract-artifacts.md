---
title: ED-20260308 - G6 US-G6.2 lineage contract artifacts
status: Final
date: 2026-03-08T00:00:00.000Z
owners: Traceability / Core Architecture / QA
arc_level: ARC-1
breaking: false
evidence_class: critical
policy_version: 1
code_refs:
  - docs/contracts/traceability/index.md
  - docs/contracts/traceability/facets/openlineage/index.md
  - docs/contracts/traceability/facets/openlineage/SqlJobFacet.1-0-0.schema.json
  - docs/contracts/traceability/facets/DvtDbtDetailsJobFacet.v1.schema.json
  - docs/contracts/shared/CompiledCodeRef.v1.schema.json
  - docs/planning/archive/gaps/g6/index.md
  - docs/planning/archive/gaps/g6/G6-OPENLINEAGE-CI-SCHEMA-PIN-PLAN.md
  - docs/planning/archive/gaps/GAP_EXECUTION_PLANS.md
  - docs/planning/status/canonical-doc-code-matrix.md
contracts_touched:
  - id: OpenLineage SQL Job Facet
    version: 1-0-0 vendored copy
    path: docs/contracts/traceability/facets/openlineage/SqlJobFacet.1-0-0.schema.json
  - id: CompiledCodeRef
    version: v1 shared normative schema
    path: docs/contracts/shared/CompiledCodeRef.v1.schema.json
  - id: dvt_dbt_details job facet
    version: v1 normative schema
    path: docs/contracts/traceability/facets/DvtDbtDetailsJobFacet.v1.schema.json
evidence:
  issue:
    - https://github.com/dunay2/dvt/issues/408
  tests:
    - packages/@dvt/traceability-service/test/lineage/StepStartedLineageMapper.test.ts
    - packages/@dvt/traceability-service/test/lineage/CachedRetryCompiledCodeResolver.test.ts
    - packages/@dvt/traceability-service/test/lineage/compiledCodeRef.test.ts
  docs:
    - docs/contracts/traceability/index.md
    - docs/contracts/traceability/facets/openlineage/index.md
    - docs/planning/archive/gaps/g6/index.md
    - docs/planning/archive/gaps/g6/G6-OPENLINEAGE-CI-SCHEMA-PIN-PLAN.md
    - docs/planning/status/canonical-doc-code-matrix.md
  code:
    - packages/@dvt/traceability-service/src/lineage/openlineageSchema.ts
    - packages/@dvt/traceability-service/src/lineage/types.ts
planning_refs:
  - docs/planning/archive/gaps/g6/G6-OPENLINEAGE-CI-SCHEMA-PIN-PLAN.md
  - docs/contracts/traceability/index.md
rollout:
  required: false
  notes: Documentation and contract artifact slice only. No runtime rollout action required.
compatibility:
  required: true
  matrix: >-
    Backward compatible for the emitted payload surface established in US-G6.1; this slice adds normative repo artifacts
    and doc anchors only.
---

# Evidence Doc: G6 US-G6.2 lineage contract artifacts

## What changed

- Added a canonical Zensical-visible contract home for emitted lineage facets in
  [Traceability Contracts](../../contracts/traceability/index.md).
- Vendored the pinned OpenLineage SQL job facet schema version used by the
  package as a repo-local artifact.
- Added a normative schema for the custom `dvt_dbt_details` job facet under
  repo control.
- Anchored `dvt_dbt_details.compiledCodeRef` to a self-contained mirror of the
  shared-kernel
  [CompiledCodeRef v1](../../contracts/shared/CompiledCodeRef.v1.schema.json)
  contract artifact so the schema remains offline-compilable without losing the
  shared contract linkage.
- Added a provenance page for the vendored SQL facet so source URL, artifact
  identity, and update policy are reviewable from Zensical.
- Reconnected `G6` planning and status docs so the canonical emitted facet
  source is no longer only the planning gap text.
- Updated the roadmap wording so `G6` now traces to contract-artifact work, not
  only mapper tests and schema pinning.

## Scope closed by this evidence

`US-G6.2` closes the normative artifact slice only:

- repo-local versioned contract artifacts exist for both emitted facets
- shared-kernel `CompiledCodeRef` anchoring is now explicit and reusable
- the canonical home of those artifacts is documented and navigable from Zensical
- planning and status docs now point back to that canonical contract home
- vendored OpenLineage provenance is documented for offline audit and review

This evidence does not close:

- golden mapper fixtures
- offline schema validation execution
- final CI tuple and gap closeout

Those remain in `#404`, `#407`, and `#406`.

## Verification snapshot

Executed on 2026-03-08:

- `pnpm docs:sync`
- `pnpm docs:quality:check`
- `pnpm docs:build`
- `pnpm exec markdownlint-cli2 "C:/dvt/.worktrees/g6-408/docs/**/*.md" "C:/dvt/.worktrees/g6-408/README.md" --ignore-path C:/dvt/.worktrees/g6-408/.markdownlintignore --config C:/dvt/.worktrees/g6-408/.markdownlint-cli2.jsonc`

Result:

- all commands passed locally
- `docs:quality:check` emitted the existing non-blocking language warning for
  `docs/planning/DVTplus_Roadmap.md`
- Zensical navigation now exposes the new traceability contract page and `G6`
  planning hub through the docs index structure

## Architectural notes

- The chosen canonical home for emitted lineage facet artifacts is under
  `docs/contracts/traceability/`, not inside planning docs.
- Shared-kernel structure ownership stays with `@dvt/contracts`; the lineage
  facet artifact now mirrors that contract through a repo-local shared schema
  mirror so offline validation remains self-contained.
- This keeps the normative contract in repo-controlled documentation while
  preserving a stable emitted `_schemaURL` in package code.
- Later schema validation lanes can validate offline against these local
  artifacts without reopening the emitted payload shape.
- Vendored external schemas remain reviewable because provenance and update
  rules now live next to the local artifact and do not depend on network fetches
  during CI.

## Closure statement

`US-G6.2` is satisfied when the branch containing these changes is merged,
because the emitted lineage facet surface now has repo-local normative
artifacts and a canonical docs home independent of planning prose.
