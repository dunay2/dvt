---
title: Governance Document And Rule Inventory
status: Review
owner: Architecture / Docs
last_reviewed: 2026-04-08
planning_type: status
---

# Governance Document And Rule Inventory

This file inventories the tracked documents and rule-bearing configuration that
currently govern how this repository is described, changed, reviewed, and
validated.

It answers four questions:

1. Which documents are canonical entry points.
2. Which documents carry explicit rules or invariants.
3. Which files enforce those rules automatically.
4. Which surfaces are informative, status-oriented, or historical rather than
   normative.

## Quick Start / Startup Card

Use this card immediately after opening the inventory. The point is to classify
the task and route yourself to the right canonical surfaces before reading the
full catalog.

| Task type       | Open next                                                                          | Deep read required when                                                                 | Minimum validation baseline                                     |
| --------------- | ---------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------- | --------------------------------------------------------------- |
| `code`          | `docs/guides/ai-work-protocol.md`, relevant ADR/contract, current status doc       | public boundary, cross-package, contract, or CI impact                                  | touched-package validation + `pnpm verify:prepush`              |
| `docs`          | `docs/index.md` or relevant docs entrypoint, `docs/guides/ai-work-protocol.md`     | governance, roadmap classification, generated-doc rules, or canonical placement changes | `pnpm docs:sync` when structure changes + `pnpm verify:prepush` |
| `planning`      | `docs/planning/state/planning-control-tower.md`, `docs/guides/ai-work-protocol.md` | sequencing, blockers, lane ownership, or canonical planning posture changes             | `pnpm docs:workboard:generate` + `pnpm verify:prepush`          |
| `contracts`     | `docs/contracts/index.md`, relevant ADRs, versioning policy                        | always                                                                                  | contract/package validation + `pnpm verify:prepush`             |
| `ci`            | `package.json`, relevant workflows, testing/CI capabilities                        | always                                                                                  | relevant CI/tool validation + `pnpm verify:prepush`             |
| `cross-cutting` | combine the route surfaces above                                                   | always                                                                                  | per-slice validation + `pnpm verify:prepush`                    |

### Startup rule in practice

1. Open this inventory.
2. Consume the startup card and classify the task.
3. Open the route-specific canonical surfaces.
4. Read the deep inventory only if the route or task risk requires it.
5. Close the slice with the route-specific validation baseline plus
   `pnpm verify:prepush`.

## Scope And Reading Rule

- This inventory covers tracked repository documents and tracked rule-bearing
  configuration files.
- It distinguishes `normative`, `operational`, `status`, `evidence`, `risk`,
  and `historical` surfaces.
- It does not treat `docs/archive/**` as active governance unless an active
  document explicitly points to it.
- It does not treat untracked local worktree files as repository governance
  sources.

## Governance Hierarchy

<!-- markdownlint-disable MD060 -->

| Layer               | Purpose                                                        | Primary sources                                                                                                                                                                                                                                                                                                                                                                              | Typical rule shape                                                            |
| ------------------- | -------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| `normative`         | Accepted decisions, invariants, contracts, compatibility rules | [ADRs](../../adr/index.md), [Contracts](../../contracts/index.md), [Contract Versioning Policy](../../architecture/components/engine/contracts/VERSIONING.md)                                                                                                                                                                                                                                | `MUST`, `MUST NOT`, compatibility, ownership, lifecycle invariants            |
| `architectural`     | Repository-wide principles and system boundaries               | [Reference Architecture](../../architecture/reference-architecture.md), [Command And Query Rail Governance](../../architecture/command-query-rail-governance.md), [Fowler Opportunity Planning Governance](../../architecture/fowler-opportunity-planning-governance.md), [Execution Model](../execution-model/dvt-execution-model.md), [Domain Language](../../concepts/domain-language.md) | architectural principles, terminology, bounded contexts, execution boundaries |
| `operational`       | How contributors and agents must work                          | [Contributing](../../CONTRIBUTING.md), [Mandatory Work System For AI](../../guides/ai-work-protocol.md), [Testing and CI Capabilities](../../guides/testing-and-ci-capabilities.md)                                                                                                                                                                                                          | process order, validation requirements, PR rules, local commands              |
| `enforcement`       | Automated gates and ownership routing                          | [CODEOWNERS](../../../.github/CODEOWNERS), [commitlint config](../../../commitlint.config.cjs), [package scripts](../../../package.json), [GitHub workflows](../../../.github/workflows/ci.yml)                                                                                                                                                                                              | automatic blocking or routing rules                                           |
| `status`            | What is true now in code or delivery                           | [Current Status](../../architecture/system-delivery-status.md), [Governance Document And Rule Inventory](./governance-document-rule-inventory.md), [Canonical Doc Code Matrix](./canonical-doc-code-matrix.md)                                                                                                                                                                               | current implementation truth, mapping, drift signals                          |
| `risk and evidence` | Residual debt and proof of validation                          | [Risk Register](../../risk-register/index.md), [Evidence](../../evidence/index.md), [Runbooks](../../runbooks/index.md)                                                                                                                                                                                                                                                                      | open risk, mitigation, proof, operational procedure                           |
| `historical`        | Archived context and prior plans                               | [Archive](../../archive/index.md), [ADR archive](../../adr/_archive/index.md)                                                                                                                                                                                                                                                                                                                | historical reference only                                                     |

<!-- markdownlint-enable MD060 -->

## Canonical Entry Points And Classification Rules

<!-- markdownlint-disable MD060 -->

| Source                                                                                                                      | Type                                 | Role                               | Key rules or classification decisions                                                                                                                                                                                                                     |
| --------------------------------------------------------------------------------------------------------------------------- | ------------------------------------ | ---------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [AGENTS.md](../../../AGENTS.md)                                                                                             | `operational-enforcement entrypoint` | Repository startup rule for agents | Startup rule for agents; includes the fixed startup sentence, closeout evidence requirements, and direct escalated `git commit`.                                                                                                                          |
| [docs/index.md](../../index.md)                                                                                             | `entrypoint`                         | Canonical documentation home       | Start by intent, not by folder guessing; do not start with engine internals by default; distinguish concepts, architecture, planning, runbooks, risk, ADRs.                                                                                               |
| [docs/DOCS_README.md](../../DOCS_README.md)                                                                                 | `operational`                        | Documentation structure baseline   | Single canonical ADR location under `docs/adr/`; `index.md` in every directory; explicit document status; unique ADR IDs; move historical material to archive; planning-derived indexes and rendered lane views are local/CI artifacts, not tracked docs. |
| [docs/concepts/domain-language.md](../../concepts/domain-language.md)                                                       | `architectural`                      | Repository naming discipline       | `DVT` is the full system; `engine` is only the execution core; do not confuse `roadmap` with `status`; do not treat local package README files as canonical by default.                                                                                   |
| [docs/concepts/glossary.md](../../concepts/glossary.md)                                                                     | `architectural`                      | Shared vocabulary                  | Canonical meanings for `run`, `plan`, `status`, `risk`, `evidence`, `workspace`, `canonical spec`, `status doc`, and `reference-only`.                                                                                                                    |
| [docs/concepts/repository-map.md](../../concepts/repository-map.md)                                                         | `status`                             | Workspace-to-doc map               | Each workspace is classified as `canonical`, `linked-local`, or `reference-only`; this page is a map, not a behavioral specification.                                                                                                                     |
| [docs/architecture/index.md](../../architecture/index.md)                                                                   | `entrypoint`                         | Architecture navigation            | Do not collapse the repository into engine-only reading; shared, frontend, and infra surfaces are first-class architecture entry points.                                                                                                                  |
| [docs/planning/state/planning-dashboard.md](../state/planning-dashboard.md)                                                 | `entrypoint`                         | Human planning dashboard           | Start here when the question is `what is active, blocked, or next`; use it to route to the workboard, open-task view, lane YAML registry, and roadmap surfaces.                                                                                           |
| [docs/architecture/reference-architecture.md](../../architecture/reference-architecture.md)                                 | `architectural`                      | Top-level principles               | Hexagonal architecture, deterministic execution, event-sourced lifecycle, explicit tenant isolation, replaceable infrastructure behind ports.                                                                                                             |
| [docs/architecture/command-query-rail-governance.md](../../architecture/command-query-rail-governance.md)                   | `architectural`                      | Repository command/query rail      | Externally observable behavior must be represented by a command or query before implementation; routes, adapters, workers, plugins, UI actions, Cypress workflows, and architecture tests implement the rail instead of inventing local semantics.        |
| [docs/architecture/fowler-opportunity-planning-governance.md](../../architecture/fowler-opportunity-planning-governance.md) | `architectural`                      | Repository Fowler planning rule    | Non-trivial behavior, boundary, workflow, adapter, route, worker, plugin, or architecture-test changes must identify root opportunities, Fowler/DDD ownership, allowed implementation surfaces, and required tests before implementation.                 |
| [docs/planning/state/planning-control-tower.md](../state/planning-control-tower.md)                                         | `entrypoint`                         | Planning navigation                | Planning routing starts from the control tower; lane YAML files are the tracked task registry; generated planning indexes and rendered lane/workboard pages are local/CI artifacts only.                                                                  |
| [docs/planning/proposals/portfolio-map-20260403.md](../proposals/portfolio-map-20260403.md)                                 | `operational`                        | Planning proposal navigation       | Proposal navigation routes through the portfolio map instead of a generated planning-proposals landing page.                                                                                                                                              |
| [docs/planning/reviews/review-status-board.md](../reviews/review-status-board.md)                                           | `operational`                        | Planning review navigation         | Active review navigation routes through the review status board instead of a generated planning-reviews landing page.                                                                                                                                     |
| [docs/planning/roadmap/index.md](../roadmap/index.md)                                                                       | `operational`                        | Roadmap-of-record classification   | Do not create parallel roadmap entry points; do not use status docs as roadmap docs; classify new roadmap-like files explicitly.                                                                                                                          |
| [docs/planning/roadmap/strategic-product-roadmap.md](../roadmap/strategic-product-roadmap.md)                               | `operational`                        | Strategic product direction        | Use this as the stable strategic overlay for why the active domains and lanes exist; do not let it become a second execution queue or a status board.                                                                                                     |
| [docs/architecture/system-delivery-status.md](../../architecture/system-delivery-status.md)                                 | `status`                             | Current implementation truth       | This is the status doc, not the canonical behavioral spec; use it with the canonical matrix, planning control tower, and roadmap surfaces.                                                                                                                |
| [docs/planning/status/canonical-doc-code-matrix.md](./canonical-doc-code-matrix.md)                                         | `status`                             | Topic-level traceability           | For each high-value topic, identify canonical spec, code paths, tests, and verification commands.                                                                                                                                                         |

<!-- markdownlint-enable MD060 -->

## Core Normative Sources

### ADR catalog

The ADR catalog is the primary decision register:

- [ADR landing page](../../adr/index.md)
- [ADR full index](../../adr/ADR-Index.md)
- [ADR implementation status](../../adr/ADR-Implementation-Status.md)

Usage rules already declared in the ADR index:

- new ADRs must use the next sequential identifier
- ADR filenames should follow `ADR-XXXX-kebab-case.md`
- the ADR index must be updated when an ADR is added, renamed, superseded, or archived

### ADR inventory

| ADR         | Status     | Governing theme                                                                                                 | Source                                                                                        |
| ----------- | ---------- | --------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| `ADR-0000`  | Accepted   | Machine-verifiable normative traceability for governed artifacts, manifests, CI coverage, and graph publication | [ADR-0000](../../adr/ADR-0000-Code-generation-with-normative-traceability-required.en.md)     |
| `ADR-0001`  | Accepted   | Temporal integration tests must build first and follow explicit lifecycle discipline                            | [ADR-0001](../../adr/ADR-0001-temporal-integration-test-policy.md)                            |
| `ADR-0002`  | Superseded | Neo4j knowledge graph as traceability repository                                                                | [ADR-0002](../../adr/ADR-0002-neo4j-knowledge-graph-context-repository.md)                    |
| `ADR-0003`  | Accepted   | Execution model sovereignty belongs to DVT+, not provider engines                                               | [ADR-0003](../../adr/ADR-0003-execution-model.md)                                             |
| `ADR-0004`  | Accepted   | Append-only event sourcing, projection separation, ordering, idempotency, tenant scoping                        | [ADR-0004](../../adr/ADR-0004-event-sourcing-strategy.md)                                     |
| `ADR-0005`  | Accepted   | Contract formalization with schemas, runtime validation, fixtures, and contract checks                          | [ADR-0005](../../adr/ADR-0005-contract-formalization-tooling.md)                              |
| `ADR-0006`  | Accepted   | Repository-authoritative contract tooling governance and required validation flow                               | [ADR-0006](../../adr/ADR-0006-contract-tooling-governance.md)                                 |
| `ADR-0007`  | Accepted   | Run cancellation semantics and event ownership                                                                  | [ADR-0007](../../adr/ADR-0007_RunCancellation.md)                                             |
| `ADR-0008`  | Accepted   | Signal idempotency key derivation                                                                               | [ADR-0008](../../adr/ADR-0008_Signal_Idempotency.md)                                          |
| `ADR-0009`  | Proposed   | Outbox publication ordering guarantees                                                                          | [ADR-0009](../../adr/ADR-0009_Outbox_Ordering.md)                                             |
| `ADR-0010`  | Approved   | Run-event envelope split, idempotency, duplicate handling, and runtime integrity                                | [ADR-0010](../../adr/ADR-0010-run-event-envelope-split.md)                                    |
| `ADR-0011`  | Approved   | `RunStarted` ownership                                                                                          | [ADR-0011](../../adr/ADR-0011-run-started-ownership.md)                                       |
| `ADR-0012`  | Accepted   | Plan integrity ownership                                                                                        | [ADR-0012](../../adr/ADR-0012-plan-integrity-ownership.md)                                    |
| `ADR-0012A` | Accepted   | Canonical plan error code strategy                                                                              | [ADR-0012A](../../adr/ADR-0012a_Canonical_Error_Code_Strategy.md)                             |
| `ADR-0013`  | Accepted   | Atomic `bootstrapRunTx` ownership and behavior                                                                  | [ADR-0013](../../adr/ADR-0013-run-state-store-bootstrapRunTx.md)                              |
| `ADR-0014`  | Accepted   | Run-driven adapter model                                                                                        | [ADR-0014](../../adr/ADR-0014-run-driven-adapter-model.md)                                    |
| `ADR-0015`  | Accepted   | `getRunStatus` read-model separation                                                                            | [ADR-0015](../../adr/ADR-0015-getRunStatus-read-model-separation.md)                          |
| `ADR-0016`  | Accepted   | `logicalAttemptId` ownership belongs to the adapter                                                             | [ADR-0016](../../adr/ADR-0016-logicalAttemptId-adapter-ownership.md)                          |
| `ADR-0017`  | Accepted   | `ExecutionPlan` schema versioning and compatibility                                                             | [ADR-0017](../../adr/ADR-0017_ExecutionPlan_Schema_Versioning.md)                             |
| `ADR-0018`  | Accepted   | Shared-kernel ownership governance for `@dvt/contracts`                                                         | [ADR-0018](../../adr/ADR-0018_Shared_Kernel_Ownership_Governance.md)                          |
| `ADR-0019`  | Accepted   | Adapter equivalence and maintenance boundary                                                                    | [ADR-0019](../../adr/ADR-0019_Adapter_Equivalence_and_Maintenance_Boundary.md)                |
| `ADR-0029`  | Accepted   | Run Maintenance Service extraction                                                                              | [ADR-0029](../../adr/ADR-0029-run-maintenance-service.md)                                     |
| `ADR-0030`  | Accepted   | Pre-dispatch intent log for `startRun` crash consistency                                                        | [ADR-0030](../../adr/ADR-0030-pre-dispatch-intent-log.md)                                     |
| `ADR-0031`  | Accepted   | Storage adapter tenant isolation strategy                                                                       | [ADR-0031](../../adr/ADR-0031-adapter-tenant-isolation.md)                                    |
| `ADR-0032`  | Accepted   | `compiledCodeRef` ownership in `StepStarted` payloads                                                           | [ADR-0032](../../adr/ADR-0032-compiledcoderef-ownership.md)                                   |
| `ADR-0033`  | Accepted   | Outbox worker sharding and fencing model                                                                        | [ADR-0033](../../adr/ADR-0033-outbox-worker-sharding-and-fencing-model.md)                    |
| `ADR-0034`  | Accepted   | Bounded context boundaries and communication rules                                                              | [ADR-0034](../../adr/ADR-0034-bounded-context-boundaries-and-communication-rules.md)          |
| `ADR-0035`  | Accepted   | Planner public contract evolution protocol and bounded review scope                                             | [ADR-0035](../../adr/ADR-0035-planner-public-contract-evolution-protocol.md)                  |
| `ADR-0036`  | Accepted   | ExecutionPlan planVersion registry and runtime admission matrix                                                 | [ADR-0036](../../adr/ADR-0036-execution-plan-planversion-registry-and-runtime-matrix.md)      |
| `ADR-0037`  | Accepted   | Run-event lifecycle archival, verification, and restore model                                                   | [ADR-0037](../../adr/ADR-0037-run-event-lifecycle-archival-verification-and-restore-model.md) |
| `ADR-0038`  | Accepted   | Delivery-buffer retention and purge policy                                                                      | [ADR-0038](../../adr/ADR-0038-delivery-buffer-retention-and-purge-policy.md)                  |

### Normative contract and execution documents

- [docs/contracts/index.md](../../contracts/index.md)
  Type: `normative entrypoint`
  Rule family: boundaries must be read by contract family: planner, shared,
  traceability, engine.
- [docs/architecture/components/engine/contracts/VERSIONING.md](../../architecture/components/engine/contracts/VERSIONING.md)
  Type: `normative`
  Rule family: pre-stable engine-runtime pack uses one live `v1` line,
  rewrites that line in place, and removes sibling active generations or
  migration companions in the same slice.
- [docs/architecture/components/engine/dev/determinism-tooling.md](../../architecture/components/engine/dev/determinism-tooling.md)
  Type: `normative-operational`
  Rule family: plans must be deterministic; determinism lint and replay checks
  are part of the engineering baseline.
- [docs/planning/execution-model/dvt-execution-model.md](../execution-model/dvt-execution-model.md)
  Type: `working normative draft`
  Rule family: core boundaries such as UI vs execution, planner vs persistence,
  state as source of truth, enrichment vs authority, idempotency, ordering, and
  status read-model rules.
- [docs/architecture/components/engine/contracts/engine/IWorkflowEngine.v1.md](../../architecture/components/engine/contracts/engine/IWorkflowEngine.v1.md)
  Type: `normative contract`
  Rule family: engine boundary, accepted inputs, lifecycle requirements, event
  emission, compatibility expectations.
- [docs/architecture/components/engine/contracts/engine/RunEvents.v1.md](../../architecture/components/engine/contracts/engine/RunEvents.v1.md)
  Type: `normative contract`
  Rule family: event envelope, `eventId`, `idempotencyKey`, ordering, duplicate
  handling, enforcement layers, and vector requirements.
- [docs/architecture/components/engine/contracts/engine/SignalsAndAuth.v1.md](../../architecture/components/engine/contracts/engine/SignalsAndAuth.v1.md)
  Type: `normative contract`
  Rule family: signal authorization, audit, rejection policy, effective role,
  tenant isolation, and persistence requirements.

### Explicit rule extracts from the foundational ADRs

| Source                                                                                    | Explicit rules already declared there                                                                                                                                                                                                                                  |
| ----------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [ADR-0000](../../adr/ADR-0000-Code-generation-with-normative-traceability-required.en.md) | Governed artifacts must carry traceability headers; contract and integration tests must include traceability; each module must generate a manifest; CI must fail if accepted ADRs have zero implementation references.                                                 |
| [ADR-0003](../../adr/ADR-0003-execution-model.md)                                         | DVT+ owns lifecycle transitions and execution invariants; adapters translate DVT+ semantics into provider APIs; provider engines must not become the semantic authority.                                                                                               |
| [ADR-0004](../../adr/ADR-0004-event-sourcing-strategy.md)                                 | Write side must use append-only event log; write and read projections remain separated; `runSeq` is strictly increasing; replay must reconstruct the same state; duplicate `(runId, idempotencyKey)` pairs must not create new records; queries must be tenant-scoped. |
| [ADR-0005](../../adr/ADR-0005-contract-formalization-tooling.md)                          | Each event contract must ship versioned schema definitions; runtime boundaries must validate payloads; contracts must ship executable fixtures; contract PRs must pass schema and vector validation.                                                                   |
| [ADR-0006](../../adr/ADR-0006-contract-tooling-governance.md)                             | Repository validation is authoritative; editor assistance is supportive only; contract semantic changes must carry ADR backing once the ADR gate is hardened.                                                                                                          |

## Operational Governance Documents

| Source                                                                                                                      | Type                      | Primary rules                                                                                                                                                                                                                                             |
| --------------------------------------------------------------------------------------------------------------------------- | ------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [AGENTS.md](../../../AGENTS.md)                                                                                             | `operational-enforcement` | Mandatory startup document for agents, including direct escalated `git commit` for the agent environment.                                                                                                                                                 |
| [docs/CONTRIBUTING.md](../../CONTRIBUTING.md)                                                                               | `operational`             | PR title must follow Conventional Commits; PR body must be long enough and carry evidence; docs contributions must pass markdown, link, TS block, and normative contract structure checks; versioning and deprecation rules apply to normative contracts. |
| [Mandatory Work System For AI](../../guides/ai-work-protocol.md)                                                            | `operational`             | AI-assisted work must follow phased workflow: existing material check, think-first analysis, pre-implementation brief, baseline ADR validation, traceable generation, relationship recording, documentation update, validation and closeout.              |
| [docs/guides/testing-and-ci-capabilities.md](../../guides/testing-and-ci-capabilities.md)                                   | `operational`             | Canonical local commands and their CI mappings are declared here; GitHub workflows remain the authoritative merge gates.                                                                                                                                  |
| [docs/architecture/atlas/engineering/engineering_playbook.md](../../architecture/atlas/engineering/engineering_playbook.md) | `operational snapshot`    | PRs should include tests, contract or ADR references for boundary changes, no package boundary violations, and docs updates when behavior changes.                                                                                                        |
| [docs/runbooks/index.md](../../runbooks/index.md)                                                                           | `operational`             | Runbook entry point for incident, recovery, and worker operation procedures.                                                                                                                                                                              |
| [docs/evidence/index.md](../../evidence/index.md)                                                                           | `evidence`                | Index of evidence docs proving closure or validation for specific changes.                                                                                                                                                                                |
| [docs/risk-register/index.md](../../risk-register/index.md)                                                                 | `risk`                    | Index of open technical and delivery risks still requiring mitigation or explicit acceptance.                                                                                                                                                             |

## Pull Request, Commit, And Review Rules

| Source                                                                        | Type          | Rules captured there                                                                                                                                                                                                                                                                                                                                  |
| ----------------------------------------------------------------------------- | ------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [.github/COMMIT_CONVENTION.md](../../../.github/COMMIT_CONVENTION.md)         | `operational` | Conventional Commits format, allowed types, recommended scopes, uppercase imperative subject, breaking-change footer semantics.                                                                                                                                                                                                                       |
| [commitlint.config.cjs](../../../commitlint.config.cjs)                       | `enforcement` | Allowed types: `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `build`, `ci`, `chore`, `revert`; allowed scopes: `engine`, `adapters`, `temporal`, `conductor`, `state-store`, `contracts`, `docs`, `ci`, `deps`, `release`, `api`, `web`; sentence-case subject; no trailing period; header max 100; blank lines before body and footer. |
| [.github/pull_request_template.md](../../../.github/pull_request_template.md) | `operational` | ARC level declaration and evidence-doc link are expected in the PR template.                                                                                                                                                                                                                                                                          |
| [.github/PR_INSTRUCTIONS.md](../../../.github/PR_INSTRUCTIONS.md)             | `operational` | Pre-PR checklist includes title/body quality gate, validation evidence, rollback path, stakeholder notification, and local preflight expectations.                                                                                                                                                                                                    |
| [.github/PR_BODY.md](../../../.github/PR_BODY.md)                             | `operational` | PR body structure and governance references used when opening PRs.                                                                                                                                                                                                                                                                                    |
| [.github/PR_TEMPLATE.md](../../../.github/PR_TEMPLATE.md)                     | `operational` | Detailed long-form PR explanation surface for reviewers.                                                                                                                                                                                                                                                                                              |
| [.github/CODEOWNERS](../../../.github/CODEOWNERS)                             | `enforcement` | Review ownership is path-based; contracts, engine, adapters, workflows, root configs, and architecture docs all have explicit owners.                                                                                                                                                                                                                 |

## Automated Enforcement Surfaces

### Root scripts and hooks

- [package.json](../../../package.json)
  Role: `command registry`
  Enforces: root commands for lint, type-check, tests, contracts, docs sync,
  docs quality, determinism, golden validation, and ADR-0000 traceability.
- [package.json `precommit`](../../../package.json)
  Role: `hook command`
  Enforces: `lint-staged` plus determinism lint before commit when hooks run
  normally.
- [package.json `verify:prepush`](../../../package.json)
  Role: `pre-push gate`
  Enforces: root type-check, planning workboard drift check, changed-markdown
  validation, and changed-file checks.
- [package.json `docs:pr:fast`](../../../package.json)
  Role: `local docs preflight`
  Enforces: local fast-path docs PR validation before push or PR creation.
- [package.json `docs:pr:full`](../../../package.json)
  Role: `local docs preflight`
  Enforces: local full-path docs PR validation before push or PR creation.
- [package.json `docs:pr:create`](../../../package.json)
  Role: `deterministic docs PR wrapper`
  Enforces: one-command local validation plus `git push` and `gh pr create`
  for docs PRs.
- [scripts/check-changed.cjs](../../../scripts/check-changed.cjs)
  Role: `changed-file gate`
  Enforces: ESLint and Prettier checks on changed files.
- [scripts/qa-artifact-check.cjs](../../../scripts/qa-artifact-check.cjs)
  Role: `QA artifact gate`
  Enforces: required structure for changed QA artifact docs in governed paths.
- [scripts/docs-pr-create.cjs](../../../scripts/docs-pr-create.cjs)
  Role: `deterministic docs PR wrapper`
  Enforces: ordered local docs validation, PR title/body validation, and the
  push/PR creation sequence.
- [scripts/docs-pr-local.cjs](../../../scripts/docs-pr-local.cjs)
  Role: `local docs PR orchestrator`
  Enforces: ordered local execution of fast/full docs PR checks and optional
  PR-title validation.
- [scripts/lint-markdown-changed.cjs](../../../scripts/lint-markdown-changed.cjs)
  Role: `markdown diff gate`
  Enforces: markdownlint-cli2 on changed Markdown files only.
- [scripts/validate-rfc2119.cjs](../../../scripts/validate-rfc2119.cjs)
  Role: `contract quality gate`
  Enforces: RFC 2119 keyword usage validation in contract docs.
- [scripts/docs-quality-check.cjs](../../../scripts/docs-quality-check.cjs)
  Role: `docs quality gate`
  Enforces: docs quality policy.
- [scripts/docs-doctor.cjs](../../../scripts/docs-doctor.cjs)
  Role: `docs hygiene gate`
  Enforces: duplicate, legacy path, and stale metadata checks.
- [scripts/docs-canonical-check.cjs](../../../scripts/docs-canonical-check.cjs)
  Role: `canonical path gate`
  Enforces: canonical docs path and legacy segment validation.
- [scripts/check-feature-mechanization.cjs](../../../scripts/check-feature-mechanization.cjs)
  Role: `feature mechanization gate`
  Enforces: feature plans with `feature-mechanization` manifests must be
  closed mechanically, including C&Q/DDD/Fowler binding, red-green cycles,
  symbol coverage, architecture guard, Cypress coverage, and closeout gates.
- [scripts/sync-docs.cjs](../../../scripts/sync-docs.cjs)
  Role: `docs generator`
  Enforces: regeneration of indexes and docs navigation surfaces.

Additional enforcement surface:

- [check-markdown-locations.cjs](../../../scripts/check-markdown-locations.cjs)
  blocks Markdown files from code directories under `apps/**` and
  `packages/**`.

### GitHub workflows

- [.github/workflows/ci.yml](../../../.github/workflows/ci.yml)
  Role: `CI - Code Quality`
  Enforces: affected-workspace detection, changed-file lint and format checks,
  affected build and type-check jobs, optional ADR-0000 traceability, and
  changed-markdown lint on PRs.
- [.github/workflows/pr-quality-gate.yml](../../../.github/workflows/pr-quality-gate.yml)
  Role: `PR Quality Gate`
  Enforces: ARC policy evaluation, docs sync and workboard drift checks, docs
  quality checks, canonical docs checks, generated status checks, optional
  workspace type-check, PR title validation, PR body minimum length, PR size
  warning, and Temporal integration routing.
- [.github/workflows/test.yml](../../../.github/workflows/test.yml)
  Role: `Test Suite`
  Enforces: affected package tests, full suite on non-PR runs, determinism
  tests, replay checks, and optional coverage.
- [.github/workflows/contracts.yml](../../../.github/workflows/contracts.yml)
  Role: `Contracts & Determinism`
  Enforces: schema compilation, determinism scan, contract compile, no-`any`
  check in contracts, golden fixture validation, and hash comparison.

## Status, Risk, Evidence, And Planning Surfaces

| Source                                                                                                | Type                 | What it governs                                                                        |
| ----------------------------------------------------------------------------------------------------- | -------------------- | -------------------------------------------------------------------------------------- |
| [docs/planning/status/governance-document-rule-inventory.md](./governance-document-rule-inventory.md) | `status entrypoint`  | Canonical planning-status entrypoint for tracked governance and route rules.           |
| `docs/planning/status/index.md`                                                                       | `derived local/CI`   | Generated planning-status landing page; do not treat as a tracked canonical doc.       |
| `docs/planning/index.md`                                                                              | `derived local/CI`   | Generated planning landing page; do not treat as a tracked canonical doc.              |
| `docs/planning/proposals/index.md`                                                                    | `derived local/CI`   | Generated proposal landing page; proposal navigation should use the portfolio map.     |
| `docs/planning/reviews/index.md`                                                                      | `derived local/CI`   | Generated review landing page; review navigation should use the review status board.   |
| `docs/planning/state/agent-lane-*.md`                                                                 | `derived local/CI`   | Rendered lane views generated from `agent-lane-*.yaml`; never edit or commit directly. |
| `docs/planning/state/execution-workboard.md`                                                          | `derived local/CI`   | Generated execution summary view derived from lane YAML.                               |
| `docs/planning/state/open-task-route.md`                                                              | `derived local/CI`   | Generated routing view derived from lane YAML.                                         |
| [docs/planning/status/generated-code-state.md](./generated-code-state.md)                             | `generated status`   | Current workspace, source, and test inventory.                                         |
| [docs/planning/status/generated-capability-coverage.md](./generated-capability-coverage.md)           | `generated status`   | Capability coverage signal.                                                            |
| [docs/planning/status/generated-spec-traceability.md](./generated-spec-traceability.md)               | `generated status`   | Generated spec traceability report.                                                    |
| [docs/planning/status/release-please-continuous.md](./release-please-continuous.md)                   | `status`             | Release process status.                                                                |
| [docs/architecture/system-delivery-status.md](../../architecture/system-delivery-status.md)           | `status`             | Current truth by layer, open follow-up work, and reading order.                        |
| [docs/planning/gaps/index.md](../gaps/index.md)                                                       | `planning reference` | Current tactical gap registers only; not the retired `G1`-`G10` program.               |
| [docs/risk-register/index.md](../../risk-register/index.md)                                           | `risk`               | Open risks that still require mitigation or acceptance.                                |
| [docs/evidence/index.md](../../evidence/index.md)                                                     | `evidence`           | Validation proof for closed or hardened work.                                          |
| [docs/runbooks/index.md](../../runbooks/index.md)                                                     | `operations`         | Runtime procedures, incident response, and worker operation guidance.                  |

## Historical And Non-Authoritative Surfaces

| Source                                                     | Type         | Handling rule                                                                              |
| ---------------------------------------------------------- | ------------ | ------------------------------------------------------------------------------------------ |
| [docs/archive/index.md](../../archive/index.md)            | `historical` | Archive is useful context but not active governance unless referenced by an active source. |
| [docs/adr/\_archive/index.md](../../adr/_archive/index.md) | `historical` | Archived ADRs are historical decisions, not current governing decisions.                   |
| [docs/adr/\_drafts/index.md](../../adr/_drafts/index.md)   | `draft`      | Draft ADRs are not accepted governance until promoted into the active ADR catalog.         |

## Consolidated Rule Set

Across the tracked repository documentation and rule-bearing config, the active
rule set can be summarized as follows:

1. One canonical source per topic, with explicit distinction between canonical
   spec, status doc, evidence, risk, roadmap, and historical archive.
2. Accepted architectural decisions live in ADRs and must remain traceable to
   code, tests, and validation artifacts.
3. Contracts are versioned by canonical major-line file, not by uncontrolled
   filename churn.
4. The execution model remains DVT-owned: lifecycle authority, invariants,
   ordering, idempotency, and tenant boundaries are not delegated to providers.
5. Externally observable behavior must be represented by a command or query in
   the owning bounded context before implementation; transports and adapters
   implement the rail rather than naming separate product semantics.
6. Non-trivial behavior, boundary, workflow, adapter, route, worker, plugin, or
   architecture-test changes must be planned through the repository Fowler
   opportunity model before implementation, including opportunities, applied
   patterns, DDD ownership, allowed surfaces, tests, and out-of-scope items.
7. Contributors and AI-assisted changes must follow think-first, evidence-based
   workflow rather than ad hoc implementation.
8. Local commands exist for lint, type-check, tests, docs checks, contracts,
   determinism, and traceability; GitHub workflows remain the authoritative
   merge gates.
9. Review routing, commit syntax, PR metadata, and many documentation quality
   rules are already codified in tracked config and workflow files.
10. Status, risk, runbook, and evidence documents are supporting governance
    surfaces; they describe current truth, residual risk, proof, and operation,
    but they do not replace normative decisions or contracts.

## Practical Reading Order

When a change is being analyzed or proposed, the current repository material
already suggests this reading order:

1. [docs/index.md](../../index.md)
2. [docs/concepts/domain-language.md](../../concepts/domain-language.md)
3. [docs/adr/index.md](../../adr/index.md)
4. [docs/contracts/index.md](../../contracts/index.md)
5. [docs/architecture/reference-architecture.md](../../architecture/reference-architecture.md)
6. [docs/architecture/command-query-rail-governance.md](../../architecture/command-query-rail-governance.md)
7. [docs/architecture/fowler-opportunity-planning-governance.md](../../architecture/fowler-opportunity-planning-governance.md)
8. [docs/planning/status/canonical-doc-code-matrix.md](./canonical-doc-code-matrix.md)
9. [docs/architecture/system-delivery-status.md](../../architecture/system-delivery-status.md)
10. [docs/CONTRIBUTING.md](../../CONTRIBUTING.md)
11. [Mandatory Work System For AI](../../guides/ai-work-protocol.md)
12. [docs/guides/testing-and-ci-capabilities.md](../../guides/testing-and-ci-capabilities.md)
