---
title: Fowler analysis for AR-D-PLAN-POINTER DBT package extraction
status: Draft
owner: Codex / Architecture
date: 2026-05-14
task_id: AR-D-PLAN-POINTER
---

# Fowler Analysis For AR-D-PLAN-POINTER DBT Package Extraction

## Scope

This analysis reviews the current `AR-D-PLAN-POINTER` branch truth after the
PlanRef workflow boundary, continuation safety, capacity SLA, and DBT core
decoupling passes. It focuses on the remaining architectural drift that still
keeps the Temporal adapter package as the owner of concrete DBT plugin exports.

## Governing Sources

- `AGENTS.md`
- `docs/planning/status/governance-document-rule-inventory.md`
- `docs/guides/ai-work-protocol.md`
- `docs/architecture/command-query-rail-governance.md`
- `docs/architecture/fowler-opportunity-planning-governance.md`
- `docs/architecture/reference-architecture.md`
- `docs/adr/ADR-0003-execution-model.md`
- `docs/adr/ADR-0014-run-driven-adapter-model.md`
- `docs/adr/ADR-0046-execution-plan-definition-and-run-execution-policy-separation.md`
- `docs/architecture/components/engine/adapters/temporal/temporal-planref-workflow-boundary.md`
- `docs/architecture/components/engine/adapters/temporal/temporal-step-plugin-profile.md`
- `docs/architecture/components/engine/adapters/temporal/temporal-dbt-worker-plugin-profile.md`

## Architecture Verdict

The PlanRef workflow boundary is now aligned with mature workflow systems:
Temporal receives stable identity and compact cursor state, while bounded work
is resolved through activities. The remaining problem is package ownership, not
workflow payload shape. `@dvt/adapter-temporal` still publishes DBT-specific
symbols from its root public API, so the generic Temporal adapter package is
also the concrete DBT CLI plugin package.

Mature systems keep the orchestration adapter and concrete executor plugins in
separate packages or modules. The core adapter publishes the extension port and
runtime dispatch contract. Concrete plugins publish their manifest, runner, and
activity registry from a plugin-owned package.

## Improvements Already Achieved

- Full `ExecutionPlan` payload no longer crosses the workflow start boundary.
- Continue-as-new handoff is compact cursor state, not the full completed-step
  map.
- Segment resolution is activity-owned and validates PlanRef bytes.
- The Temporal core registry starts plugin-free by default.
- DBT runtime responsibilities are split into manifest, activity, runner,
  arguments, process, materialization, failure mapping, and helper contracts.
- The AR-D2 capacity SLA now exists as a documented and executable policy.

## Antipatterns Still Present

| Signal              | Evidence                                                                                                                          | Impact                                                                                                    |
| ------------------- | --------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| Boundary drift      | `packages/@dvt/adapter-temporal/src/index.ts` exports `DbtStepActivity`, `DbtCliPluginRunner`, and DBT manifest constants.        | Generic adapter consumers can accidentally depend on DBT as part of the core Temporal adapter surface.    |
| Duplicate semantics | Docs describe DBT as a plugin profile, but the package name still says adapter-temporal.                                          | The package boundary contradicts the component boundary.                                                  |
| Hidden authority    | API admission imports DBT executable step kinds from `@dvt/adapter-temporal`.                                                     | DBT bundle binding semantics appear to come from the adapter package rather than the DBT plugin manifest. |
| Documentation drift | `system-delivery-status.md` still says package-level plugin extraction is not complete, while AR-D2 capacity is already complete. | Remaining work is real, but the open reason is partly stale.                                              |

## Components To Group

- `packages/@dvt/adapter-temporal/src/plugins/TemporalStepPluginProfile.ts`
  stays in `@dvt/adapter-temporal` because it is the generic extension port.
- `packages/@dvt/adapter-temporal/src/plugins/TemporalStepPluginRunner.ts`
  stays in `@dvt/adapter-temporal` because it is a generic runner port.
- `packages/@dvt/adapter-temporal/src/plugins/dbt/**` moves to a DBT-owned
  package because it owns concrete DBT semantics.
- `apps/temporal-worker/src/runtime/temporalWorkerDbtProfile.ts` consumes the
  DBT package as a worker composition root.
- `apps/api/src/infrastructure/startRun/ArtifactStoreDbtProjectBundleBindingPolicy.ts`
  consumes the DBT package manifest as API admission support.

## Fowler Matrix

| Scenario                            | Opportunity         | Fowler pattern                   | DDD owner                   | Command/query rail                             | Implementation surfaces                                           | Test                                  |
| ----------------------------------- | ------------------- | -------------------------------- | --------------------------- | ---------------------------------------------- | ----------------------------------------------------------------- | ------------------------------------- |
| Worker composes DBT support         | Boundary drift      | Plugin + Gateway + Service Layer | Temporal DBT plugin profile | none - internal worker plugin composition only | `packages/@dvt/temporal-dbt-plugin/**`, `apps/temporal-worker/**` | package extraction architecture guard |
| API admission binds DBT artifacts   | Hidden authority    | Published Language / Manifest    | DBT plugin manifest         | existing start-run admission rail              | `apps/api/src/infrastructure/startRun/**`                         | package extraction architecture guard |
| Adapter root API stays generic      | Duplicate semantics | Separate Plugin from Core        | Temporal step plugin port   | none - package API governance only             | `packages/@dvt/adapter-temporal/src/index.ts`                     | package extraction architecture guard |
| Documentation matches package truth | Documentation drift | Single Source of Truth           | Runtime architecture docs   | none - documentation status only               | docs and mailbox                                                  | docs sync and architecture guard      |

## Repetitions And Drift To Fix

- DBT manifest exports are repeated as Temporal adapter exports.
- DBT ownership appears in both Temporal adapter public API and DBT profile docs.
- Active status still frames package extraction as residual risk without a
  package-level guard that prevents reintroducing DBT exports.
- Some evidence docs still point to the old in-package DBT paths; this slice
  will update current docs and leave historical evidence as historical truth.

## Selected Option

Create `@dvt/temporal-dbt-plugin` and hard-cut DBT concrete exports out of
`@dvt/adapter-temporal`. Keep only the generic plugin profile and runner ports
in the Temporal adapter package.

Rejected alternatives:

- Keep DBT under `@dvt/adapter-temporal` and rely on docs. Rejected because the
  package API remains semantically misleading.
- Add a compatibility re-export from `@dvt/adapter-temporal`. Rejected because
  the user requested hardcut and the residual drift is specifically the old
  public surface.
- Move generic plugin ports into a new third package. Rejected for this slice
  because it increases blast radius beyond the DBT package drift.

## Teaching For Future Work

The useful pattern is not just "make the core registry empty." A mature plugin
boundary has three parts: core port, plugin package, and composition root. If
the public package API still exposes the plugin, the semantic extraction is not
done.
