---
title: Architecture Surface Inventory 2026-04-02
status: Active
owner: Architecture / Docs / Delivery
last_reviewed: 2026-04-09
---

# Architecture Surface Inventory 2026-04-02

This inventory classifies the active repository-wide architecture documents by
truth level so readers can distinguish principle, current implementation truth,
supporting context, and historical snapshots.

This is a governance and navigation artifact. It does not replace the canonical
architecture or status sources it classifies.

## Canonical Reading Path

Use this order for repository-wide architecture questions:

1. [Reference Architecture](reference-architecture.md)
2. [System Delivery Status](system-delivery-status.md)
3. [System Architecture](system/index.md)
4. [Subsystem Architecture](subsystems/index.md)
5. [Canonical Doc Code Matrix](../planning/status/canonical-doc-code-matrix.md)
6. [DVT System Map](../concepts/system-map.md)

Then read supporting surfaces only if the question needs more structure,
history, domain-specific navigation, or a component-level map.

## Classification Rules

- `canonical`: normative or primary architecture source for the topic
- `status`: current implementation truth surface
- `supporting`: useful active context, diagram, or navigation aid
- `historical`: dated snapshot or draft retained for reference, not authority

## Repository-Wide Architecture Surface Inventory

| Surface                                                                      | Classification | Role                                                                    | Current handling                                                                      |
| ---------------------------------------------------------------------------- | -------------- | ----------------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| [Reference Architecture](reference-architecture.md)                          | `canonical`    | top-level architectural principles and bounded-context posture          | keep as the architecture principle source                                             |
| [System Delivery Status](system-delivery-status.md)                          | `status`       | current implementation truth and delivery posture                       | keep as the implementation truth source                                               |
| [System Architecture](system/index.md)                                       | `supporting`   | system-to-subsystem navigation entrypoint                               | keep as the top-level composition view                                                |
| [Subsystem Architecture](subsystems/index.md)                                | `supporting`   | flow-oriented subsystem catalog and routing surface                     | keep as the active subsystem entrypoint                                               |
| [Canonical Doc Code Matrix](../planning/status/canonical-doc-code-matrix.md) | `status`       | doc -> code -> test -> command traceability for architecture claims     | keep as the verification companion                                                    |
| [DVT System Map](../concepts/system-map.md)                                  | `supporting`   | conceptual orientation map                                              | keep as the first mental-model companion                                              |
| [Architecture Index](index.md)                                               | `supporting`   | architecture navigation entrypoint                                      | keep, but route readers to canonical, status, system, and subsystem sources first     |
| [DVT System Architecture](system-overview.md)                                | `supporting`   | broad integrated narrative and diagrams                                 | keep as a supporting overview with explicit non-canonical handling                    |
| [DVT Component Map](component-map.md)                                        | `supporting`   | current component and dependency map with queued deltas                 | keep as a real current-state supporting map grounded in code and the workboard        |
| [DVT Domain Map](domain-map.md)                                              | `supporting`   | current bounded-context map with interaction rules                      | keep as a real supporting domain map grounded in current ownership                    |
| [Architecture Component Surfaces](components/index.md)                       | `supporting`   | canonical catalog for component homes                                   | keep as the component catalog entrypoint; one component, one active home              |
| [Execution subsystem compatibility pack](engine/index.md)                    | `supporting`   | execution-specific subsystem context and longer-form runtime narratives | keep during migration, but do not treat it as the engine component home               |
| [Frontend subsystem compatibility pack](frontend/index.md)                   | `supporting`   | frontend workbench flow and UX subsystem narratives                     | keep during migration, but do not treat it as the frontend component home             |
| [Engine Roadmap](engine/roadmap/engine-phases.md)                            | `supporting`   | execution-subsystem delivery projection and sequencing                  | keep as the active engine roadmap; do not let it compete with repo-wide roadmap truth |
| [TypeScript Package Classification](typescript-package-classification.md)    | `supporting`   | package taxonomy and workspace structure aid                            | keep as supporting classification                                                     |
| [Architecture Atlas](atlas/architecture/architecture_atlas.md)               | `historical`   | dated code snapshot from 2026-03-06                                     | keep as historical snapshot only                                                      |

## Planning-Adjacent Architecture Surfaces

These files talk about architecture, but they live under planning and must not
compete with the canonical architecture sources above.

| Surface                                                                                                                                                                                                     | Classification | Role                                                           | Current handling                                                      |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------- | -------------------------------------------------------------- | --------------------------------------------------------------------- |
| [Planning Execution Model Index](../planning/execution-model/index.md)                                                                                                                                      | `historical`   | draft working area for execution-model notes                   | keep only as non-canonical working area until archived or rewritten   |
| [Domain - Execution Runtime](../planning/domains/execution-runtime.md)                                                                                                                                      | `supporting`   | planning-domain navigation for runtime work                    | truth-corrected; keep as planning context, not architecture authority |
| [Domain - Event Lifecycle And Retention](../planning/domains/event-lifecycle-and-retention.md)                                                                                                              | `supporting`   | planning-domain navigation for archival/retention work         | truth-corrected; keep as planning context, not architecture authority |
| [Domain Cohesion Refactor Plan](../planning/archive/proposals/domain-cohesion-refactor-plan.md) and [Domain Cohesion Refactor Subplans](../planning/archive/proposals/domain-cohesion-refactor-subplans.md) | `historical`   | superseded refactor draft pack from the pre-lane planning wave | archived on 2026-04-08; do not cite as current execution authority    |

## Confirmed Drift Closed In This Pass

- [Architecture Component Surfaces](components/index.md) now enforces the
  component-home rule explicitly.
- [System Architecture](system/index.md) and
  [Subsystem Architecture](subsystems/index.md) now separate system,
  subsystem, and component navigation instead of mixing those levels.
- [web component](components/web/index.md) is now the single active frontend
  component home; the old `web-app` alias was removed from the active tree.
- The top-level `engine/` and `frontend/` packs are now described as subsystem
  compatibility packs instead of second component homes.

## Wave 1 Outcome

Wave 1 is complete when:

- the repository has an explicit architecture surface inventory;
- the canonical reading path is published;
- planning execution-model drafts are explicitly classified as non-canonical;
- future cleanup can target known drift without debating source authority first.

## Wave 3 Outcome

Wave 3 is complete when:

- supporting architecture maps explicitly identify themselves as non-canonical;
- readers are routed back to reference architecture and current status before
  using supporting diagrams;
- overlapping maps remain available for orientation without competing with the
  truth sources.

## Wave 4 Outcome

Wave 4 is complete when:

- the `docs/architecture/components/**` subtree has an explicit entrypoint;
- component entry pages describe current responsibilities and queued deltas;
- older deep-dive component notes stay accessible only as supporting detail
  beneath those current entry pages.
