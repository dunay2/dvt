# Technical Debt Register (Iterative)

> Document control
>
> - Version: `v1.2.0`
> - Status: `active`
> - Last updated (UTC): `2026-02-17`
> - Owner: `Engineering / AI Delivery Governance`
> - Mandatory cadence: **every iteration**

## Purpose

Maintain a living, auditable, and prioritized technical debt register to reduce operational risk, improve maintainability, and prevent important debt from being excluded from the delivery cycle.

## Mandatory rule per iteration

In **every iteration** (issue/PR change or implementation cycle), the team MUST:

1. Review the current register state.
2. Update entries impacted by the iteration changes.
3. Record newly identified debt (if any).
4. Explicitly record `no new debt` when no new entries are identified.

## Iteration update workflow

### 1) Iteration start

- Review the active debt table.
- Confirm which entries remain open and their priority.
- Check whether any debt is blocking the current scope.

### 2) During implementation

- If new debt appears, create an entry immediately with `id`, `risk`, `plan`, and `owner`.
- If an existing debt item changes in scope/risk, update it immediately.

### 3) Iteration close

- Update `status`, `last review (UTC)`, and `evidence` (issue/PR/file).
- Move resolved entries to `closed` (do not delete history).
- Add one row to the iteration history.

## Register conventions

- `id`: `TD-0001`, `TD-0002`, ...
- `type`: `code | test | docs | infra | process`
- `risk`: `Low | Medium | High`
- `effort`: `Low | Medium | High`
- `status`: `open | planned | in-progress | blocked | closed`

## New entry template

| id      | title | type | area | detected_at_utc | risk | effort | status | owner | mitigation plan | objective | evidence | last review (UTC) |
| ------- | ----- | ---- | ---- | --------------- | ---- | ------ | ------ | ----- | --------------- | --------- | -------- | ----------------- |
| TD-XXXX |       |      |      |                 |      |        | open   |       |                 |           |          |                   |

## Active technical debt register

| id      | title                                                                                                    | type    | area                                         | detected_at_utc | risk   | effort | status  | owner                                 | mitigation plan                                                                                                                                   | objective                                                                | evidence                                                                                                                                                                                                                                         | last review (UTC) |
| ------- | -------------------------------------------------------------------------------------------------------- | ------- | -------------------------------------------- | --------------- | ------ | ------ | ------- | ------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------- |
| TD-0001 | Formalize mandatory iterative debt-register updates in core process docs                                 | process | docs/guides                                  | 2026-02-17      | Medium | Low    | closed  | Engineering / AI Governance           | Integrate the register into process documents and the documentation index.                                                                        | Standardize governance                                                   | `docs/guides/AI_ISSUE_RESOLUTION_PLAYBOOK.md`, `docs/INDEX.md`                                                                                                                                                                                   | 2026-02-17        |
| TD-0002 | Engine public API still exports Temporal/Conductor stub adapters                                         | code    | packages/engine/src                          | 2026-02-17      | High   | Medium | open    | Engine maintainers                    | Remove stub exports from the public entrypoint (or move to explicit test-only exports); keep only production-capable adapters in default API.     | Prevent accidental runtime use of non-functional adapters                | `packages/engine/src/index.ts`, `packages/engine/src/adapters/temporal/TemporalAdapterStub.ts`, `packages/engine/src/adapters/conductor/ConductorAdapterStub.ts`, `docs/planning/ISSUE_5_TEMPORAL_ADAPTER_STATUS_AND_IMPLEMENTATION_PROPOSAL.md` | 2026-02-17        |
| TD-0003 | Retry signal flow (`RETRY_STEP` / `RETRY_RUN`) remains NotImplemented across engine and Temporal adapter | code    | packages/engine + packages/adapter-temporal  | 2026-02-17      | Medium | High   | planned | Engine + Temporal adapter maintainers | Implement deterministic retry semantics end-to-end (engine mapping, adapter handling, tests, and contract alignment).                             | Close Phase-2 functional gap in control signals                          | `packages/engine/src/core/WorkflowEngine.ts`, `packages/adapter-temporal/src/TemporalAdapter.ts`, `docs/architecture/engine/adapters/temporal/EnginePolicies.md`                                                                                 | 2026-02-17        |
| TD-0004 | Legacy adapter package still active in workspace and contains unresolved TODO-based test setup           | test    | packages/adapters-legacy                     | 2026-02-17      | Medium | Medium | open    | Platform maintainers                  | Decide legacy end-state (archive/remove/migrate), then move any remaining useful tests to active packages and close TODOs.                        | Reduce confusion and split-brain test maintenance                        | `packages/adapters-legacy/README.md`, `packages/adapters-legacy/test/setup.ts`                                                                                                                                                                   | 2026-02-17        |
| TD-0005 | Empty root `test/` placeholder still exists despite cleanup recommendation                               | repo    | root                                         | 2026-02-17      | Low    | Low    | open    | Repo maintainers                      | Remove empty root placeholder and verify CI/scripts/docs no longer reference it.                                                                  | Complete monorepo structure cleanup                                      | `docs/REPO_STRUCTURE_SUMMARY.md`, root `test/` directory (empty)                                                                                                                                                                                 | 2026-02-17        |
| TD-0006 | DAG dependency field (`dependsOn`) initially implemented only in adapter-local plan typing               | code    | packages/adapter-temporal + shared contracts | 2026-02-17      | Medium | Medium | closed  | Contracts + Temporal maintainers      | Promote `dependsOn` to canonical shared plan contract and propagate validation/docs across engine and adapters.                                   | Avoid contract drift between workflow interpreter and shared plan schema | `packages/adapter-temporal/src/engine-types.ts`, `packages/adapter-temporal/src/workflows/RunPlanWorkflow.ts`, `packages/engine/src/contracts/executionPlan.ts`, `packages/engine/src/adapters/mock/MockAdapter.ts`                              | 2026-02-17        |
| TD-0007 | Lint debt backlog remains open in legacy and adapter side-paths                                          | process | packages/adapters-legacy + adapter-postgres  | 2026-02-17      | Medium | Medium | open    | Platform maintainers                  | Resolve by explicit route batches and closure criteria (`eslint --max-warnings 0` per target scope), or archive legacy scope with owner sign-off. | Replace vague lint-debt tracking with auditable execution batches        | `docs/status/IMPLEMENTATION_SUMMARY.md`, `packages/adapters-legacy/**`, `packages/adapter-postgres/**`, `packages/engine/legacy-top-level-engine/**`                                                                                             | 2026-02-17        |
| TD-0008 | Documentation/path normalization tracked as generic note without concrete file list                      | docs    | docs/\*                                      | 2026-02-17      | Low    | Medium | open    | Documentation maintainers             | Maintain explicit normalization queue by file path and update status each iteration until closed.                                                 | Ensure documentation debt is actionable and verifiable                   | `docs/status/IMPLEMENTATION_SUMMARY.md`, `docs/REPO_STRUCTURE_SUMMARY.md`, `docs/planning/ISSUE_5_TEMPORAL_ADAPTER_STATUS_AND_IMPLEMENTATION_PROPOSAL.md`, `docs/knowledge/ROADMAP_AND_ISSUES_MAP.md`, `docs/INDEX.md`                           | 2026-02-17        |

## Iteration history

| date_utc   | iteration   | summary                                                                                                                            | evidence                                                                                                                                                                                                 |
| ---------- | ----------- | ---------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 2026-02-17 | bootstrap   | Created the technical debt register and defined mandatory iterative update flow.                                                   | `docs/guides/TECHNICAL_DEBT_REGISTER.md`, `docs/INDEX.md`                                                                                                                                                |
| 2026-02-17 | iteration-1 | Integrated register governance into the playbook; updated TD-0001 and recorded no additional debt.                                 | `docs/guides/AI_ISSUE_RESOLUTION_PLAYBOOK.md`                                                                                                                                                            |
| 2026-02-17 | iteration-2 | Repository audit completed; added TD-0002..TD-0005 for stub exports, retry gap, legacy adapter area, and root placeholder cleanup. | `packages/engine/src/index.ts`, `packages/engine/src/core/WorkflowEngine.ts`, `packages/adapter-temporal/src/TemporalAdapter.ts`, `packages/adapters-legacy/README.md`, `docs/REPO_STRUCTURE_SUMMARY.md` |
| 2026-02-17 | iteration-3 | Added deterministic DAG-layer scheduler slice for `#15`; recorded new debt TD-0006 for shared-contract alignment of `dependsOn`.   | `packages/adapter-temporal/src/workflows/RunPlanWorkflow.ts`, `packages/adapter-temporal/src/engine-types.ts`, `packages/engine/src/contracts/executionPlan.ts`                                          |
| 2026-02-17 | iteration-4 | Promoted `dependsOn` to shared engine execution plan contract and aligned mock adapter/test coverage; closed TD-0006.              | `packages/engine/src/contracts/executionPlan.ts`, `packages/engine/src/adapters/mock/MockAdapter.ts`, `packages/engine/test/contracts/engine.test.ts`                                                    |
| 2026-02-17 | iteration-5 | Converted vague debt statements into explicit tracked entries TD-0007 (lint backlog routes) and TD-0008 (docs/path queue by file). | `docs/status/IMPLEMENTATION_SUMMARY.md`, `docs/guides/TECHNICAL_DEBT_REGISTER.md`                                                                                                                        |
