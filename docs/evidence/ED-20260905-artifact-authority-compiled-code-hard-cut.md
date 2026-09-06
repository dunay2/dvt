---
title: Canonical artifact authority and compiled-code hard cut
status: Accepted
date: 2026-09-05
owners:
  - '@dvt/artifacts'
  - '@dvt/contracts'
  - '@dvt/planner'
  - '@dvt/adapter-temporal'
  - '@dvt/traceability-service'
arc_level: ARC-2
breaking: true
code_refs:
  - packages/@dvt/contracts/src/contracts/engine/RunStateVocabulary.v1.ts
  - packages/@dvt/artifacts/src/contentAddressed/S3ContentAddressedArtifactStore.ts
  - packages/@dvt/artifacts/src/runtime/readVerifiedArtifactBytes.ts
  - packages/@dvt/adapter-temporal/src/workflows/workflowArtifactHelpers.ts
  - packages/@dvt/traceability-service/src/lineage/mapper/StepStartedLineageMapper.ts
  - apps/web/src/app/views/runs/RunWorkspaceStateView.tsx
  - docs/adr/ADR-0067-canonical-artifact-authority-and-compiled-code-hard-cut.md
evidence:
  tests:
    - pnpm --filter @dvt/contracts build
    - pnpm --filter @dvt/contracts typecheck
    - pnpm --filter @dvt/contracts test
    - pnpm --filter @dvt/artifacts build
    - pnpm --filter @dvt/artifacts typecheck
    - pnpm --filter @dvt/artifacts test
    - pnpm --filter @dvt/planner build
    - pnpm --filter @dvt/planner typecheck
    - pnpm --filter @dvt/planner test
    - pnpm --filter @dvt/adapter-temporal build
    - pnpm --filter @dvt/adapter-temporal typecheck
    - pnpm --filter @dvt/adapter-temporal test
    - pnpm --filter @dvt/traceability-service build
    - pnpm --filter @dvt/traceability-service typecheck
    - pnpm --filter @dvt/traceability-service test
    - pnpm test:ci-tools
    - pnpm verify:prepush
---

# Canonical artifact authority and compiled-code hard cut

## Governing decision

Issues #2661, #2669 and #2667 are one atomic HARD CUT. `IContentAddressedArtifactStore`, the generic `StepArtifactRef` contract, and the generic artifact read/integrity path are the surviving authorities.

The removed compiled-code-specific storage, reference and lineage-reader families were classified as **DUPLICATE AUTHORITY** rather than legitimate specialization.

## Source-first baseline

Implementation was reconciled against `main@e7dd9b77debaeba279a6d9b68297a50b25d91043`, current tests/composition, `AGENTS.md`, the three owner issues, open PR overlap, and Planning DB architecture/component queries.

## Hard cut

The change removes the specific compiled-code storage port/adapters, Planner bridges/publication behavior, `CompiledCodeRef` contract/schema/event branches, Temporal projection compatibility, and traceability cache/reader/retry-resolver subsystem. Lineage now reads immutable artifacts through the canonical verified artifact reader.

No alias, forwarding export, deprecated wrapper, dual-read/write path, compatibility adapter or renamed compiled-code reference is retained.

Generic artifact contracts with independent live consumers, such as project-bundle references, are not compiled-code compatibility surfaces and remain governed by their existing owners.

## Operational compatibility boundary

This is a breaking wire/history cut. Temporal histories or persisted event payloads whose successful replay/interpretation depends on the removed `CompiledCodeRef` shape are outside the supported compatibility horizon after deployment. The supported operational procedure is to drain or complete incompatible in-flight histories before rollout; rollback is a full PR revert, not a compatibility branch.

## Validation evidence

The commands listed in frontmatter are the mandatory closeout matrix for this PR. This evidence document does not claim a command passed until the corresponding GitHub Actions/validation result is green on the final PR head.

The final hard-cut gate must additionally prove zero productive/public occurrences of:

- `ICompiledCodeStorage`
- `CompiledCodeStorage`
- `CompiledCodeRef`
- `attachCompiledCodeRefs`
- `InMemoryCompiledCodeCache`
- `CompositeCompiledCodeReader`
- `FileUriCompiledCodeReader`
- `InMemoryCompiledCodeReader`
- `CachedRetryCompiledCodeResolver`

Historical ADR/evidence text may retain the retired names only when explicitly marked historical/superseded.
