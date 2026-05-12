---
title: Fowler analysis and remediation for WE-HX-5 provider and telemetry seams
status: Accepted
owner: Codex / Architecture
last_reviewed: 2026-05-12
planning_type: analysis
---

# Fowler Analysis And Remediation For WE-HX-5 Provider And Telemetry Seams

## Scope

This mailbox record reviews the recent `WorkflowEngine` decomposition work in
the context of the full engine subsystem. The branch sequence already improved
the facade, start-run phases, runtime command path, and API composition root.
`WE-HX-5` closes the next gap: provider lookup and start-run telemetry policy
must be named seams instead of repeated lookup and instrumentation snippets.

## Fowler Architecture Analysis

The recent branch work moved the system toward Fowler's Service Layer and
Gateway patterns. The public engine facade now delegates to use cases, start-run
is split into phase services, cancel and signal behavior are separate command
paths, and the API runtime composition root has a named assembly object.

The remaining smell is cross-cutting policy leakage. Provider resolution is
still expressed as map access in several engine paths, while telemetry policy is
still embedded in the start-run application coordinator. In mature systems,
provider lookup is a gateway/resolver concern and telemetry emission is a
decorator or instrumentation policy. Those concerns can be used by application
services, but they should not become local one-off code in every service.

## Mature-System Comparison

| Concern             | Current posture                                                                        | Mature-system expectation                                                                            | WE-HX-5 remediation                                                                                       |
| ------------------- | -------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| Provider resolution | `Map.get` and helper calls appear in admission, command, signal, and enrichment paths. | One resolver seam owns provider lookup, error mapping, and target-vs-persisted provider distinction. | Add `IEngineProviderResolver` and `MapBackedEngineProviderResolver`; route engine paths through the seam. |
| Start-run telemetry | Start-run coordinator builds tags and emits logs/metrics directly.                     | Telemetry policy is a decorator/policy object so orchestration remains semantic.                     | Add `StartRunTelemetryPolicy`; coordinator delegates start and success reporting.                         |
| Architecture proof  | Existing guards prove decomposition and thinness.                                      | Fitness tests should assert semantic ownership and documentation alignment.                          | Add a semantic architecture test that checks code, docs, stories, mailbox, and owned concerns.            |
| Documentation       | WE-HX-3/4 docs mention WE-HX-5 as future work.                                         | Component docs should describe public API, invariants, transitions, consumers, and drift guards.     | Add a WE-HX-5 local component guide and scenario stories.                                                 |

## Improved Patterns

- **Service Layer:** start-run and runtime-control services remain named
  application services.
- **Gateway:** provider lookup becomes a provider resolver seam rather than a
  raw map lookup pattern.
- **Decorator / Telemetry Policy:** start-run telemetry becomes a local policy
  object that instruments orchestration without owning start-run decisions.
- **Semantic architecture fitness function:** the new architecture test checks
  ownership and drift, not only file size or barrel exports.

## Antipatterns Detected

| Antipattern              | Risk                                                                                           | Remediation                                                      |
| ------------------------ | ---------------------------------------------------------------------------------------------- | ---------------------------------------------------------------- |
| Repeated provider lookup | Divergent error behavior and hidden provider semantics across services.                        | Route lookup through `IEngineProviderResolver`.                  |
| Telemetry in coordinator | Application flow changes when instrumentation policy changes.                                  | Move start/success telemetry to `StartRunTelemetryPolicy`.       |
| Documentation drift      | Target architecture says provider and telemetry seams remain future work after implementation. | Update target docs, component guide, user stories, and closeout. |
| Structural-only tests    | A test can pass while semantic ownership drifts.                                               | Assert forbidden raw lookup and coordinator-owned telemetry.     |

## Components To Group

- `packages/@dvt/engine/src/application/providerSelection.ts`: provider
  vocabulary, adapter registry, default provider selection, and provider
  resolver seam.
- `packages/@dvt/engine/src/application/StartRunAdmissionGuard.ts`: admission
  policy orchestration that uses provider resolution but does not implement
  lookup rules.
- `packages/@dvt/engine/src/services/runControl/RunCommandService.ts` and
  `RunSignalService.ts`: runtime command and signal paths that resolve the
  persisted provider through the shared resolver.
- `packages/@dvt/engine/src/services/RunEnrichmentService.ts`: diagnostic
  enrichment path that resolves the persisted provider through the same seam.
- `packages/@dvt/engine/src/services/startRun/StartRunTelemetryPolicy.ts`:
  start-run instrumentation policy for logs, counters, histograms, and tags.

## Repetitions To Fix

- `adapters.get(provider)` appears in multiple engine paths.
- `getAdapterOrThrow` provides a second provider-resolution vocabulary outside
  `providerSelection.ts`.
- start-run started/failed metric tag construction is locally assembled in the
  coordinator even though telemetry policy is its own concern.

## Drift To Fix

- `workflow-engine-target-architecture.v1.md` still lists provider resolution
  and telemetry handling as current gaps.
- The WE-HX proposal only names `WE-HX-5` as future work and does not yet
  declare implementation surfaces, tests, symbols, or diagrams.
- Start-run telemetry lacks a component-local public API and invariant guide.

## Opportunities

- Reuse the resolver seam in future adapter registry changes before adding a
  second provider.
- Let `WE-HX-6` narrow test doubles against the resolver seam rather than
  against raw adapter maps.
- Keep telemetry policies local and narrow before promoting any shared
  observability abstraction.

## Future Lessons

- A component is not fully decomposed when collaborators exist; cross-cutting
  seams must also stop leaking into coordinators.
- Provider resolution should be a named vocabulary before the product supports
  more than one provider, because the second provider otherwise exposes every
  ad hoc lookup.
- Telemetry should diagnose decisions, not participate in them. Mature systems
  keep instrumentation failure non-blocking and localize its policy.

## ADR Decision

No new ADR is required. `WE-HX-5` applies existing decisions: ADR-0003 keeps DVT
as execution authority, ADR-0014 keeps adapters behind the provider boundary,
and ADR-0034 keeps bounded-context communication explicit. The change does not
alter a public contract, event model, provider vocabulary, or compatibility
policy.
