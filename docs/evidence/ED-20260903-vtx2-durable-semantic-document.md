---
title: VTX2 durable semantic document evidence
status: Accepted
date: 2026-09-03
owners:
  - contracts
  - api
  - web
planning_type: evidence
arc_level: ARC-2
breaking: false
code_refs:
  - packages/@dvt/contracts/src/contracts/planner/DvtSubstraitSemanticDocument.v1.ts
  - packages/@dvt/contracts/src/contracts/planner/DvtSubstraitPlanBinary.v1.ts
  - packages/@dvt/contracts/src/contracts/planner/WorkspaceGraphAuthoringDraft.v1.ts
  - apps/api/test/integration/workspaceGraphDraftSemanticPersistence.test.ts
evidence:
  tests:
    - pnpm --filter @dvt/contracts test
    - pnpm --filter @dvt/contracts typecheck
    - pnpm --filter @dvt/web typecheck
    - pnpm --filter dvt-api typecheck
    - pnpm --filter dvt-api exec vitest run --config vitest.integration.config.ts test/integration/workspaceGraphDraftSemanticPersistence.test.ts
    - pnpm docs:feature-mechanization:implementation -- --feature VTX2-DURABLE-SEMANTIC-DOCUMENT-2655
    - pnpm verify:prepush
---

# VTX2 durable semantic document evidence

## Scope

Issue #2655 makes the typed Substrait document durable through the existing
workspace graph draft command/query rails and PostgreSQL JSONB/CAS store. The
canonical aggregate now admits Transform authoring metadata only when its pinned
profile, protobuf bytes, digest, sidecar binding and stable DVT identities agree.

## Behavioral proof

Contract tests reject corrupt protobuf, forged digest, unsupported profile,
duplicate identities and legacy visual authority. The PostgreSQL integration proof
saves through `SaveWorkspaceGraphDraft`, reloads through `GetWorkspaceGraphDraft`,
compares the exact document and stable relation/field IDs, rejects a stale CAS and
returns `corrupt_payload` for tampered stored bytes even when their SHA is recomputed.

The test dependencies fail if project files are read or written. This proves the
existing graph-draft store remains the sole persistence authority; no SQL, VTX1,
project-file or secondary-store fallback was introduced.

## Structure and compatibility

The former multi-reason profile module was split into profile coordinates, semantic
document validation and binary decoding modules. Each changed production or test
module remains below 200 lines. Transform drafts without authored semantic metadata
remain editable; once that metadata exists, validation is fail-closed.
