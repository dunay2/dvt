---
title: Server-authoritative selected dbt model analysis
status: Accepted
date: 2026-08-01
owners:
  - '@dvt/contracts'
  - dvt-api
arc_level: ARC-2
breaking: false
code_refs:
  - packages/@dvt/contracts/src/contracts/dbt-project/DbtSelectedModelAnalysis.v1.ts
  - apps/api/src/application/services/analyzeSelectedDbtModelQuery.ts
  - apps/api/src/application/services/selectedDbtModelAnalysisProjection.ts
  - apps/api/src/infrastructure/dbt/DbtCliProjectAnalyzer.ts
  - apps/api/src/infrastructure/dbt/dbtProjectSemanticEvidence.ts
  - apps/api/src/infrastructure/dbt/dbtSemanticRegionProjection.ts
  - apps/api/src/entrypoints/http/dbtSelectedModelAnalysisRoutes.ts
evidence:
  tests:
    - pnpm --filter @dvt/contracts test
    - pnpm --filter @dvt/contracts typecheck
    - pnpm --filter @dvt/contracts lint
    - pnpm --filter dvt-api test:ci
    - pnpm --filter dvt-api typecheck
    - pnpm --filter dvt-api lint
    - pnpm docs:feature-mechanization:implementation
    - pnpm verify:prepush
---

# Summary

The `AnalyzeSelectedDbtModel` query publishes an exact, deterministic analysis
of one selected dbt model from the same isolated project snapshot used by the
server-side dbt analyzer.

# Decision

- The server and installed dbt runtime remain the semantic authority.
- The read model includes exact file revisions, dbt identities, dependencies,
  diagnostics, and UTF-8 byte regions from one project content set.
- Only literal, manifest-confirmed `ref` and `source` calls are classified as
  supported semantic regions.
- Dynamic, ambiguous, comment, and statement regions are classified
  `code_only`; no browser parser or inferred rewrite path is introduced.
- The query reuses the protected workspace graph and file authorization rules
  and does not create a second graph or caller-selected project root.
- Unavailable and invalid native analysis outcomes preserve file evidence when
  a snapshot exists and otherwise fail through typed outcomes.

# Determinism

The selected-analysis identity is derived from project content revisions,
native dbt analysis, semantic evidence, selected resource identity, and active
capabilities. Observation timestamps are excluded from the identity.

# Scope boundary

This issue is a query-only semantic evidence slice. Lossless Graph-to-Code
patch application and compare-and-swap refusal belong to GitHub issue `#2100`.
