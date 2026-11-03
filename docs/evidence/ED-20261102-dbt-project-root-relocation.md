---
title: Lossless dbt project root relocation
status: draft
date: 2026-11-02
owners:
  - API
  - Contracts
arc_level: ARC-2
breaking: false
code_refs:
  - packages/@dvt/contracts/src/contracts/dbt-project/DbtProjectRootRelocation.v1.ts
  - apps/api/src/application/services/dbtProjectRootRelocation/relocationPlan.ts
  - apps/api/src/application/services/dbtProjectRootRelocation/RelocateDbtProjectRootCommand.ts
  - apps/api/src/infrastructure/workspaceFiles/LocalWorkspaceRootInventory.ts
  - apps/api/src/infrastructure/canvasAuthoringAuthority/PostgresCanvasAuthoringAuthorityStore.ts
  - apps/web/src/app/views/canvas/explorer/CanvasProjectElementsExplorer.tsx
evidence:
  tests:
    - pnpm --filter @dvt/contracts test
    - pnpm --filter dvt-api test:unit
    - pnpm --filter dvt-api exec vitest run --config vitest.integration.config.ts test/integration/dbtProjectRootRelocation.integration.test.ts
    - pnpm --filter dvt-api exec tsc -p tsconfig.json --noEmit
    - pnpm --filter dvt-api exec tsc -p test/tsconfig.json --noEmit
---

# Lossless dbt Project Root Relocation

[Issue #3747](https://github.com/dunay2/dvt/issues/3747) owns delivery. Planning DB
design `GH-3747-DBT-PROJECT-ROOT-RELOCATION` and its
[prospective admission](https://github.com/dunay2/dvt/issues/3747#issuecomment-6585557351)
bound this slice. ADR-0060 governs semantic authority; the command/query and Fowler
rules govern the new location-migration intent. The complete branch evaluator
classified the diff as ARC-2: evidence, risk, lint, tests, schema validation and
contract goldens are required.

## Implemented Boundary

`PreviewDbtProjectRootRelocation` reads one persisted file owner, applies the
existing import policy, inventories every source file and returns a scoped plan
with content hashes and the current authority revision. `RelocateDbtProjectRoot`
uses the existing workspace-file write capability, CAS batch gateway and private
metadata repository. Sorted PostgreSQL authority locks serialize root changes.
The authority kind and Canvas identity remain unchanged.

The batch gateway now accepts an optional complete subtree precondition. It
rejects files added after inspection while holding its existing mutation lock.
The same bounded inventory serves preview and publication; symlinks, invalid
UTF-8, excessive traversal and oversized files fail closed. Shared HTTP scope
authorization was extracted from the existing file routes without changing their
capabilities.

A private snapshot precedes destructive file publication. Retry can finish a
proven move after database rollback. Missing or changed files produce a conflict;
the snapshot remains available rather than silently recreating a later deletion.
Completed receipts replay without rewriting later edits. Cleanup removes only
empty former source directories.

## Executed Evidence

- Contracts: 79 files, 1,012 cases passed after the case-alias refinement.
- Earlier API unit suite with isolated PostgreSQL: 249 files, 1,862 cases passed. One
  existing DuckDB recovery file, two cases, was skipped by its environment guard;
  this is not a claim that those cases ran.
- Focused application, inventory, batch and HTTP boundary: 39 cases passed.
- Authority-store PostgreSQL and protected route boundary: 20 cases passed.
- Real PostgreSQL/filesystem production composition: one integration case passed.
- API source and test TypeScript checks passed; changed API ESLint passed with
  zero warnings. The enabled pre-commit hook formatted and checked the commit.
- `pnpm validate:contracts` passed all 25 checks. `pnpm golden:validate`
  passed five paths; its existing path awaiting issue #10 remained skipped.
- A separate native dbt run after production relocation created all three fixture
  tables and returned `{client_id: 1, order_id: 10}` from the dependent model.
  This proves actual native execution, beyond parse or compilation. Its isolated
  schemas were removed after verification.

The authorized command was also applied to the actual `tenant/project/dev`
workspace. Five imported files moved from `inline_code_demo/` into the root; the
two existing source YAML files remained. All seven SHA-256 values were preserved.
The Canvas remained `ce23643b-69fa-46d0-a902-361af7582335`, now bound to `.`. The
user's SQL, including its existing text, was not normalized or repaired.

The follow-up screenshot exposed mixed folder/file ordering. The existing
`ListWorkspaceFiles` adapter now groups directories first and sorts names within
each group at every depth. Both passive explorers reuse that result without UI
sorting or CSS changes. A real-filesystem regression proves nested order, scope
isolation and unchanged bytes. Planning DB records the existing repository as
`SYS-API-LOCAL-WORKSPACE-FILES`; the
[prospective refinement](https://github.com/dunay2/dvt/issues/3747#issuecomment-6587297304)
reuses the existing query rail. The preceding prepush was stopped only in its
verified owned process tree to refreeze this user-requested revision; its partial
results are not a successful final gate.

Root-relocation plans also reject case-aliased source/destination overlaps before
publication. This avoids treating two spellings of the same Windows path as
independent files; the same conservative rule keeps plans portable.

After these refinements, the full API run reported 1,843 passing cases, 21
failures and the same two existing skips. Twenty failures were 5-second test
timeouts, including two relocation cases; one parse-reuse assertion received
`unavailable` instead of `invalid`. This run is not green and is not attributed to
the environment without further evidence. The real PostgreSQL/filesystem
integration passed again, as did both API TypeScript checks. Isolated reruns and
the final prepush outcome belong in the governing issue's final acceptance record.

Ignored local receipts and logs reside under `.dvt/project-root-3747/`. Task
completion in the governing issue records exact final Git identities and final
gate results; this document does not substitute for that acceptance.

## Project Model Navigation

The follow-up [Elements slice](https://github.com/dunay2/dvt/issues/3747#issuecomment-6588421440)
adds project model navigation through the existing scoped file and dbt graph
queries. `SYS-WEB-PROJECT-ELEMENTS-EXPLORER` owns the bounded adapter and its source
responsibility; the passive explorer owns its extension contract. No model is
copied into GraphDraft. Native selection remains local. The follow-up
[single-catalogue design](https://github.com/dunay2/dvt/issues/3747#issuecomment-6605746494)
opens the declared available model file through the existing guarded Code opener,
retaining the current Canvas route and authority. Sources and Models share one
Elements activity with independent category disclosure and delegated additions.

The focused Explorer run passed 42 cases across three suites. The eleven new
cases cover model visibility, identity deduplication, native versus external
navigation, closed-panel suppression, graph-cache reuse, rejected authority and
tenant/project/environment isolation. Web lint and TypeScript passed. The live
protected configuration read returned the persisted file Canvas binding at `.`.
The exact final prepush and native browser outcomes are recorded in GH-3747;
the preceding f2986a1b5 run was stopped for this user-requested behavior change
and is not final acceptance. The Code guide's five existing documentary source
identities were reconciled with native row CAS and read-back proved that semantic
declarations were unchanged. No Planning DB import or rebuild was performed.

## Limits

Code remains read-only. This migration does not publish a graph-authored native
model into a file-owned root, change semantic authority, or implement Git
staging/commit/push. Native publication refusals remain enforced. A filesystem and
PostgreSQL transaction do not form one atomic storage transaction: the retained
snapshot and explicit conflict behavior cover interrupted publication. Browser
Bridge returned `Transport closed`, so the live verification used the protected
API and file hashes, without desktop control or weakened browser confirmations.

The [risk record](../risk-register/dbt-project-root-relocation-20261102.md)
documents collision, recovery and deployment boundaries. No new debt, placeholder,
fake adapter, skipped hook or relaxed quality rule was introduced.
