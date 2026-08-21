---
title: RED1.1 Planner Contracts Retirement Closeout
status: Accepted
owner: Architecture / Planner / Contracts / CI
last_reviewed: 2026-08-21
planning_type: closeout
task_ids:
  - GH-2590
---

# RED1.1 Planner Contracts Retirement Closeout

## Think-First Analysis

### Problem summary

`@dvt/planner-contracts` is an unused physical workspace that exports an
obsolete planner input vocabulary while current production code consumes the
canonical `PlannerInputEnvelopeV1` from `@dvt/contracts`.

### Root cause

The early satellite package outlived the contract-authority convergence. CI
scope and current documentation continued to model the old package, so build
and governance cost remained even after production consumers disappeared.

### Constraints and invariants

- ADR-0018: shared serializable planner contracts remain in
  `@dvt/contracts`.
- ADR-0034: packages without unique ownership must be removed after zero-ref
  proof; no forwarding package replaces them.
- ADR-0035: public planner contracts remain physically canonical in
  `@dvt/contracts`, with planner as semantic owner.
- ADR-0053: file-index and accepted fingerprint outputs must be refreshed
  together after structural deletion.
- ADR-0061: #2590 is the task lifecycle authority; Planning DB owns the
  architecture/mechanization evidence.
- No planner, API, PlanRef, hash, route, or runtime semantic change is allowed.

### Options and decision

Retaining or forwarding the package would preserve duplicate authority.
Absorbing its stale interfaces would create obsolete public or internal DTOs.
The selected option is a hard deletion with direct convergence on the already
surviving owners.

No library is applicable because the work removes an unused mechanism.

### Fowler opportunity matrix

The complete pre-implementation matrix, diagrams, allowed surfaces, test
strategy, and residual scope are recorded in the
[RED1.1 implementation plan](../proposals/mandatory/runtime-and-contracts/red1-1-planner-contracts-retirement-plan-20260821.md).

## Pre-Implementation Brief

- Mode: Slim.
- Baseline: `5784d72402652a8f68aa9cd55f2595a14b9bd64d`.
- Scope: obsolete package deletion, CI scope convergence, current architecture
  correction, generated governance refresh.
- Expected outcome: `@dvt/contracts` is the only public planner contract
  authority; `@dvt/planner` keeps only planner-owned behavior/internal types.
- Negative proof: exact-head search plus a red/green architecture guard that
  rejects the satellite package and CI scope key.
- Validation: focused CI-tool tests, contracts/planner build and tests,
  governance refresh, mechanization checks, lint/typecheck, and pre-push gate.
- Command/query impact: no product rail changes; existing CI scope queries are
  reused.
- Out of scope: public contract changes, planner algorithms, API/runtime
  behavior, crypto consolidation, and Canvas compatibility retirement.

## Normative Baseline Verification

The planned hard cut is authorized by ADR-0018 section 3/3-a, ADR-0034 sections
6.1-6.4 and Implementation Guidance, ADR-0035 Decision, ADR-0053 Decision and
Implementation Requirements, and ADR-0061 Decision. No contradiction was
found.

## Work And Validation Evidence

### Real work performed

- Deleted the unused `packages/@dvt/planner-contracts` workspace rather than
  retaining a forwarding or compatibility package.
- Removed its lockfile importer and its build/test workflow-scope entries.
- Reconciled the current implementation diagrams, shared-domain description,
  TypeScript package classification, and governed contract-root ownership.
- Added an architecture guard that rejects reintroduction of the satellite
  workspace or its CI scope key while proving that
  `PlannerInputEnvelopeV1` remains canonical in `@dvt/contracts`.
- No planner algorithm, public DTO, API route, runtime behavior, authorization
  policy, command rail, or query rail changed.

### Red/green evidence

- Red: `node --test tools/ci/planner-package-governance.test.mjs` failed on
  the newly added satellite-workspace guard while the three obsolete package
  files still existed.
- Green: the same command passed `5/5` after the hard deletion and CI scope
  convergence.

### Executed validation

- `node tools/ci/validate-policy.js tools/ci/policy/workflow-scope.json` —
  passed.
- Focused CI scope suite covering planner governance, workspace/test matrices,
  workflow scope, and package-json scope — passed `43/43`.
- `pnpm --filter @dvt/contracts build` — passed.
- `pnpm --filter @dvt/contracts test` — passed `475/475` across 49 files.
- `pnpm --filter @dvt/planner build` — passed.
- `pnpm --filter @dvt/planner typecheck` — passed.
- `pnpm --filter @dvt/planner test` — passed `99/99` across 20 files.
- `pnpm test:ci-tools` — passed `304/304` after installing the frozen lockfile
  dependency set and staging the structural deletion for Git-index tests.
- `pnpm docs:feature-mechanization:implementation` — passed with 243 Planning
  DB manifests.
- `pnpm governance:refresh` — converged after two generation passes; coverage
  reported `6261/6261`, with zero ungoverned files and zero drift.

The final `pnpm verify:prepush` gate is deliberately executed after the commit
so the pre-commit hook can normalize staged files first, as required by the
repository's Prettier rule. Its exact result belongs in the PR and task
closeout report.

## Debt And Stub Evidence

No debt entry was created. No alias, compatibility package, stub, fake success
path, placeholder, TODO/FIXME marker, bypass, disabled rule, relaxed gate, or
unfinished branch was introduced. Hooks and checks remain enabled. The only
warnings observed during the frozen install concern pre-existing missing built
CLI bins and the repository's approved-build-script policy; neither was hidden
or converted into product debt.
