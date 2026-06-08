---
title: Contracts Workspace Gap Report
status: Draft
owner: Architecture / Contracts
workspace: '@dvt/contracts'
date: 2026-06-07
last_reviewed: 2026-06-07
planning_type: review
---

# Contracts Workspace Gap Report

## Workspace

- Workspace key: `contracts`
- Package: `@dvt/contracts`
- Path: `packages/@dvt/contracts/**`
- Scope source: `tools/ci/scope-config.mjs` and `tools/ci/policy/workflow-scope.json`

## Evidence used

- `package.json`
- `docs/planning/status/generated-capability-coverage.md`
- `packages/@dvt/contracts/package.json`
- `packages/@dvt/contracts/src/index.ts`
- `packages/@dvt/contracts/test/schema-sync.test.ts`
- root `package.json` contract scripts
- search result for `specs/contracts`

## Current state summary

`@dvt/contracts` is not empty or merely aspirational. It exposes engine,
planner, workflow graph authoring, transformation, policy, artifact, and runtime
boundary types from `src/index.ts`. The package has build, typecheck, generic
Vitest, and schema sync verification scripts. The root repository also contains
contract-oriented validation commands for generated index, RFC2119 wording,
glossary use, references, idempotency vectors, executable examples, and golden
paths.

However, the generated capability coverage still marks the contract capability
below the rest of the core stack because `contracts specs exist` is reported as
missing. That is the first hard gap to close.

## What is missing

### C-01 — Canonical `specs/contracts` surface is absent or not generated

The repo has root scripts that assume a `specs/contracts` index can be generated
and checked, but the generated capability coverage reports `contracts specs
exist` as `no`.

**Why it matters**

- The TypeScript package is acting as the implementation source, but external
  consumers need a stable spec/index surface.
- Generated README/index checks are less useful if the target spec directory is
  missing.
- Contract review becomes code-reading instead of contract-reading.

**Required next step**

Create or restore the canonical `specs/contracts` surface with generated
inventory grouped by contract family:

- engine/runtime contracts
- planner contracts
- workspace graph authoring contracts
- transformation flow contracts
- artifact contracts
- policy contracts
- API-facing request/response contracts

### C-02 — Contract family ownership is not visible enough from the public index

`src/index.ts` exports many families, but the public surface is broad and dense.
There is no immediate family-level report that tells a reviewer who owns each
contract, whether it is stable, deprecated, experimental, or internal to a
workspace.

**Why it matters**

- A broad barrel export can hide accidental public API expansion.
- Workspaces may start consuming types that should have remained internal to a
  specific bounded context.
- Versioning decisions become hard because all exports look equally public.

**Required next step**

Add a contract public-surface matrix with these columns:

- exported symbol
- source file
- contract family
- owning bounded context
- public/internal status
- current version
- compatibility promise
- consumers
- validation command
- negative fixtures

### C-03 — Schema sync is strong but too narrow

`schema-sync.test.ts` proves sync between hand-maintained JSON schemas and Zod
schemas for planner policy and planner input envelope fixtures. The test includes
positive and negative fixtures, including legacy manifest/nodes rejection.

**Why it matters**

- The pattern is correct, but it covers only a subset of exported contract
  families.
- Contracts outside that subset can drift between TypeScript, Zod, JSON Schema,
  docs, examples, and API usage.

**Required next step**

Extend schema sync coverage by family. Minimum candidates:

- `ExecutionPlan.v1`
- `WorkspaceGraphAuthoringDraft.v1`
- `WorkspaceGraphAuthoringCommand.v1`
- `WorkspaceGraphDraft.v1`
- `TransformationFlowDesignGraph.v1`
- `TransformationFlowCompiler.v1`
- `RunStateVocabulary.v1`
- `StartRunBoundary.v1`

### C-04 — Negative compatibility fixtures are not visible as a package-level gate

The current schema sync test uses known-valid and known-invalid fixtures. That is
good, but the package lacks an explicit compatibility regression suite named at
the contract-family level.

**Why it matters**

- Breaking changes can pass if they do not touch the limited schema sync fixture
  set.
- Consumers need examples of old/new payload behavior.
- The package needs to distinguish intentional contract rejection from accidental
  schema drift.

**Required next step**

Create fixtures under a governed location such as:

```text
packages/@dvt/contracts/test/fixtures/<family>/<version>/{valid,invalid}/...
```

Then add tests that prove:

- current version accepts current valid fixtures
- current version rejects invalid fixtures
- deprecated legacy forms fail with canonical reason codes
- compatibility-supported older versions remain accepted where policy allows it

### C-05 — Runtime/API contract publication is incomplete

The API architecture document states that the backend route surface exists but
the frontend-facing runtime contract is not yet canonically published in one
artifact. That affects `@dvt/contracts` because the package should be the stable
handoff point where feasible.

**Why it matters**

- `apps/web` can consume API response shapes indirectly through query functions,
  local mappers, or test fixtures instead of one canonical contract.
- Route-level behavior can drift from frontend expectations.

**Required next step**

Produce a frontend-facing runtime contract bundle covering:

- session/runtime capabilities
- workspace context
- workspace graph draft read/save
- plans preview/import/compile
- runs list/detail/events
- start/cancel/signal run
- warehouse source import
- plugins/capabilities

### C-06 — Contract validation exists but is scattered at root level

Root `package.json` has multiple contract validation commands. The package itself
only exposes build, typecheck, test, and schema verify. This split is workable,
but it makes package-local readiness unclear.

**Why it matters**

- A contributor changing only `packages/@dvt/contracts` may not know which root
  validations are mandatory.
- CI can route correctly, but human/operator workflow is less clear.

**Required next step**

Add a local `README.md` or package-local script documentation mapping:

- local package gates
- root contract gates
- when to run each gate
- required ARC/evidence/risk updates for contract changes

## Fowler/DDD diagnosis

### Smells

- **Hidden authority**: contract truth is split across TypeScript, Zod, JSON
  schemas, generated indexes, docs, and package consumers.
- **Parallel representations**: planner and API behavior can be represented in
  package code, route mappers, web query code, and docs.
- **Shotgun surgery risk**: a contract change may require updates across API,
  web, planner, engine, adapters, docs, specs, examples, and golden paths.
- **Spec drift**: generated capability coverage already detects that the spec
  surface is not complete.

### Bounded-context posture

`@dvt/contracts` should remain a shared kernel with strict admission rules. It
must not become a dumping ground for app-local DTOs. Every exported symbol should
be owned by a bounded context and have an explicit lifecycle state.

## Recommended remediation order

1. **C-01:** Restore/create `specs/contracts` and make the generated index real.
2. **C-02:** Generate public surface matrix from `src/index.ts`.
3. **C-03:** Expand schema sync to the highest-risk exported contract families.
4. **C-05:** Publish frontend-facing runtime contract bundle before deeper web/API
   flow work.
5. **C-04:** Add compatibility fixtures by family.
6. **C-06:** Add package-local contributor guide mapping all contract gates.

## Candidate validation commands

```bash
pnpm --filter @dvt/contracts build
pnpm --filter @dvt/contracts typecheck
pnpm --filter @dvt/contracts test
pnpm --filter @dvt/contracts schema:verify
pnpm contracts:index:check
pnpm contracts:rfc2119:validate
pnpm contracts:glossary:validate
pnpm contracts:references:validate
pnpm contracts:idempotency:validate
pnpm contracts:examples:validate
pnpm validate:contracts
pnpm golden:validate
pnpm verify:prepush
```

## Closeout

This report identifies missing contract governance and publication surfaces. It
has not changed contract code. The next implementation slice should be small:
start with a generated/read-only public contract surface matrix, not with broad
schema migration.
