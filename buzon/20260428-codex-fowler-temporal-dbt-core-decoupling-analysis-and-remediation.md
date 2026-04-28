---
title: Fowler analysis and remediation for Temporal DBT core decoupling
status: Accepted
owner: Codex / Architecture
last_reviewed: 2026-04-28
planning_type: analysis
---

# Fowler Analysis And Remediation For Temporal DBT Core Decoupling

## Scope

This note records the Fowler review and remediation of DBT ownership in the
Temporal adapter activity boundary. It follows the AR-D-PLAN-POINTER QA review
finding that DBT step kinds were still part of the default Temporal activity
registry.

## Problem

The Temporal adapter core had two mixed responsibilities:

- generic workflow activity dispatch;
- DBT-specific runtime composition.

That shape made DBT the default path instead of an optional worker profile. It
also made overrides less powerful because DBT-supported step kinds were
reserved by the core registry.

## Fowler Reading

SRP was violated because `activityFactory.ts`, `activityTypes.ts`, and
`stepActivityDispatcher.ts` knew too much about one executor family.

Hexagonal boundaries were too soft because a provider adapter package was
acting both as Temporal translation boundary and DBT execution profile.

Tell, Don't Ask was weakened because core dispatch asked about DBT kind
ownership instead of receiving a composed registry from the runtime profile.

Fail-fast behavior was present inside DBT execution, but the default registry
made DBT available even when the worker intended to run without DBT support.

## Comparison With Mature Runtime Systems

Mature workflow runtimes normally keep provider orchestration, worker image
composition, and executor plugins separate:

- workflow code owns deterministic orchestration;
- activity dispatch owns generic step routing;
- worker profiles install the executable capabilities available in that worker
  image;
- executor plugins own their own runtime dependencies and failure modes.

The corrected DVT shape now matches that direction for the core dispatcher:
the Temporal core registry starts empty and the worker composes the DBT
registry only when the DBT profile is enabled.

## Antipatterns Detected

- Default plugin: DBT was registered by default in a generic Temporal registry.
- Reserved override: DBT step kinds could not be replaced by composition-time
  overrides.
- Dependency leakage: `ActivityDeps` carried DBT-specific dependencies that
  generic activity execution did not need.
- Doc drift: status and risk docs still described the older built-in coupling
  without distinguishing core-registry coupling from package-level plugin
  coupling.

## Patterns Applied

- Plugin registry composition: `createDbtStepActivityRegistry(...)` returns the
  DBT step-kind registry explicitly.
- Plugin profile composition: `TemporalStepPluginProfile` and
  `composeTemporalStepPluginRegistries(...)` compose executor profiles without
  naming DBT in generic dispatch.
- Plugin manifest ownership: `dbtPluginManifest.ts` owns the
  Temporal-supported DBT subset and the DBT step-kind to CLI-command map. This
  is not the complete DBT CLI capability set.
- Composition root ownership: `apps/temporal-worker` wires DBT only when
  `DVT_TEMPORAL_DBT_ENABLED=true`.
- Plugin-free core: `createDefaultStepActivityRegistry()` starts empty.
- Engine plugin neutrality: engine admission now consumes generic
  `pluginRequirements`; DBT artifact validation lives in API infrastructure.
- Semantic fitness test: `dbt-core-decoupling.architecture.test.ts` checks core
  imports, owned concerns, registry posture, engine DBT absence, and the local
  DBT profile guide.
- Component guide: `temporal-dbt-worker-plugin-profile.md` records public API,
  invariants, transitions, consumers, diagrams, and drift guards.

## Repetitions Fixed

- DBT runtime dependencies were removed from generic `ActivityDeps` and now
  live in `DbtStepActivityDeps`.
- Integration helpers no longer rebuild DBT through base activity deps; they
  return explicit `stepActivitiesByKind`.
- Worker runtime no longer constructs DBT reader/runner objects when DBT mode
  is disabled.
- DBT step-kind and CLI mapping literals are no longer repeated across runner,
  activity, and tests; the DBT plugin manifest owns them.
- Engine tests no longer use DBT fixtures to prove generic plugin admission;
  they use an example plugin and a SQL-shaped negative path.

## Drift Fixed

- The Fowler QA review now marks the core DBT boundary finding closed.
- The DBT coupling risk now describes the narrower residual risk: package-level
  plugin/CLI extraction.
- The Temporal worker runbook now documents the worker-profile boundary.
- System status and reference architecture now distinguish core registry
  decoupling from remaining package-level plugin ownership.
- Evidence/risk material now distinguishes `TEMPORAL_DBT_PLUGIN_STEP_KINDS` as
  the supported Temporal DBT plugin subset, not the universe of DBT operations.

## Follow-Up Review Correction

The later review corrected an important modeling mistake: moving
`DBT_STEP_KINDS` into a shared contract-style catalog would still make DBT a
core concept. The corrected design treats DBT like a future SQL plugin:

- generic engine and Temporal composition primitives know only plugin IDs,
  step-kind claims, and plugin contexts;
- DBT owns its manifest inside the DBT plugin surface;
- API infrastructure registers the DBT artifact binding policy for production
  ingress;
- adapter-temporal tests prove a SQL-shaped plugin can compose through the same
  registry seam;
- architecture tests fail if DBT vocabulary re-enters engine source or generic
  plugin composition.

## Residual Opportunities

- Move DBT plugin implementation and CLI hosting into a dedicated plugin
  package or worker-profile package once multiple executor profiles exist.
- Make workflow artifact interpretation generic enough that
  `dbt.compiled-sql` is not a Temporal adapter package concern.
- Add a broader plugin conformance suite when a second real executor plugin is
  introduced.

## Evidence

- `packages/@dvt/adapter-temporal/src/activities/stepActivityDispatcher.ts`
- `packages/@dvt/adapter-temporal/src/plugins/dbt/DbtStepActivity.ts`
- `apps/temporal-worker/src/runtime/createTemporalWorkerRuntime.ts`
- `packages/@dvt/adapter-temporal/test/dbt-core-decoupling.architecture.test.ts`
- `packages/@dvt/adapter-temporal/test/activities.test.ts`
- `apps/temporal-worker/test/runtime/createTemporalWorkerRuntime.test.ts`
- `docs/architecture/components/engine/adapters/temporal/temporal-dbt-worker-plugin-profile.md`

Validation commands are recorded in
`docs/evidence/ed-20260427-temporal-planref-qa1-readiness.md`.
