---
title: ED-20260319 - Planner Slice 4 — Artifact Boundary Extraction
status: Final
date: 2026-03-19
owners: Core Architecture / Planner / Artifacts
arc_level: ARC-1
breaking: false
policy_version: 1
code_refs:
  - packages/@dvt/artifacts/src/index.ts
  - packages/@dvt/artifacts/src/ports/ICompiledCodeStorage.ts
  - packages/@dvt/artifacts/src/compiledCode/sha256.ts
  - packages/@dvt/artifacts/src/compiledCode/attachCompiledCodeRefs.ts
  - packages/@dvt/artifacts/src/compiledCode/adapters/S3CompiledCodeStorage.ts
  - packages/@dvt/artifacts/src/compiledCode/adapters/MinioCompiledCodeStorage.ts
  - packages/@dvt/artifacts/src/compiledCode/adapters/FileSystemCompiledCodeStorage.ts
  - packages/@dvt/artifacts/src/compiledCode/adapters/InMemoryCompiledCodeStorage.ts
  - packages/@dvt/artifacts/src/compiledCode/adapters/NoopCompiledCodeStorage.ts
  - packages/@dvt/planner/src/index.ts
  - packages/@dvt/planner/src/ports/ICompiledCodeStorage.ts
contracts_touched:
  - id: ICompiledCodeStorage
    version: moved (non-breaking — re-exported from @dvt/planner for compatibility)
    path: packages/@dvt/artifacts/src/ports/ICompiledCodeStorage.ts
evidence:
  tests:
    - packages/@dvt/planner/test/compiledCode/attachCompiledCodeRefs.test.ts
    - packages/@dvt/planner/test/compiledCode/sha256.test.ts
    - packages/@dvt/planner/test/compiledCode/InMemoryCompiledCodeStorage.test.ts
    - packages/@dvt/planner/test/compiledCode/FileSystemCompiledCodeStorage.test.ts
  code:
    - packages/@dvt/artifacts/src/compiledCode/attachCompiledCodeRefs.ts
    - packages/@dvt/artifacts/src/compiledCode/sha256.ts
    - packages/@dvt/artifacts/src/ports/ICompiledCodeStorage.ts
    - packages/@dvt/planner/src/index.ts
risk_update:
  required: false
  notes: No API surface change — @dvt/planner re-exports from @dvt/artifacts. Downstream import paths unchanged.
rollout:
  required: false
  notes: Transitional re-exports in @dvt/planner/src/index.ts preserve backward compatibility.
compatibility:
  required: true
  matrix: |
    - Imports from @dvt/planner root: unchanged (re-exported via compatibility bridge).
    - Direct imports from @dvt/planner/src/compiledCode/*: BREAKING — these were internal paths.
      No external callers documented. Migrate to @dvt/artifacts.
    - New canonical import path: @dvt/artifacts.
---

## Evidence Doc: Planner Slice 4 — Artifact Boundary Extraction

### What changed

Slice 4 extracts the compiled-code storage concern from `@dvt/planner` into
`@dvt/artifacts` — the first real owner package for the artifact bounded context
(ADR-0034).

**New package: `@dvt/artifacts`**

Created `packages/@dvt/artifacts` with:

- `ICompiledCodeStorage` — artifact write-side port (moved from planner ports)
- `computeSha256` — artifact integrity helper (moved from planner compiledCode)
- `attachCompiledCodeRefs` — post-plan enrichment function (moved from planner compiledCode)
- `AttachCompiledCodeRefsOptions` — options type for the above
- `S3CompiledCodeStorage`, `MinioCompiledCodeStorage`, `FileSystemCompiledCodeStorage`,
  `InMemoryCompiledCodeStorage`, `NoopCompiledCodeStorage` — concrete storage adapters

**Planner changes**

- `packages/@dvt/planner/src/compiledCode/` directory removed entirely.
- `packages/@dvt/planner/src/ports/ICompiledCodeStorage.ts` replaced with a
  transitional re-export bridge pointing to `@dvt/artifacts`.
- `packages/@dvt/planner/src/index.ts` — artifact section now re-exports from
  `@dvt/artifacts` (compatibility bridge, marked for removal once direct consumers
  migrate).
- `@dvt/artifacts: workspace:*` added to planner dependencies.
- `@aws-sdk/client-s3` removed from planner dependencies (now in `@dvt/artifacts`).

### Architectural justification

`ICompiledCodeStorage` is NOT a planner port. Unlike `IArtifactResolver` (which
the `PlannerFacade` uses during plan construction), `ICompiledCodeStorage` is never
touched by the planner core. It is only consumed by `attachCompiledCodeRefs` and
the concrete adapters — all artifact-context code.

Moving it to `@dvt/artifacts` keeps the dependency graph acyclic:

```
@dvt/artifacts → @dvt/contracts
@dvt/planner   → @dvt/contracts
@dvt/planner   → @dvt/artifacts   (re-export only, no implementation dep)
```

### Import path migration used in `attachCompiledCodeRefs`

`DBT_MODEL` and `DBT_TEST` step-kind constants were previously imported from
the planner-internal `domain/types.ts`. In `@dvt/artifacts` they are sourced
from the canonical `KNOWN_STEP_KINDS` in `@dvt/contracts`, eliminating the
cross-package internal import.

### Validation gates

All of the following passed after the change:

```
pnpm --filter @dvt/contracts build   ✓
pnpm --filter @dvt/artifacts build   ✓
pnpm --filter @dvt/planner build     ✓
pnpm --filter @dvt/planner test      ✓  55/55 tests
pnpm docs:gov                        ✓  0 errors, 0 warnings
pnpm docs:gov:locations              ✓  OK
```

### Exit criteria satisfied

- Compiled-code storage and attachment logic have a real owner package (`@dvt/artifacts`).
- `@dvt/planner` root no longer acts as canonical import home for artifact logic
  (it re-exports from `@dvt/artifacts` as a transitional bridge).
- Compatibility re-exports are explicitly marked transitional in planner index.ts.
- Docs and canonical references updated (`canonical-doc-code-matrix.md`,
  `ED-20260304-compiledcoderef-ownership.md`).
- Planner remains facade-first; contract authority unchanged.
