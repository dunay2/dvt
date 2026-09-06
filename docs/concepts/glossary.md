---
title: DVT Glossary
status: Active
owner: Docs / Architecture
last_reviewed: 2026-09-06
---

# DVT Glossary

This glossary is the repository-wide vocabulary entry point.

Use it before diving into subsystem contracts. Engine-specific normative wording
still lives in the engine glossary contract, but this page is the first shared
definition layer for readers across code, planning, operations, and review.

## Core Terms

| Term             | Meaning                                                                                                                               | Canonical follow-up                                                                    |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| DVT              | The full system described in this repository, not only the engine package.                                                            | [System Map](./system-map.md)                                                          |
| Engine           | The execution core that interprets plans, enforces invariants, and coordinates state transitions.                                     | [Architecture](../architecture/components/engine/index.md)                             |
| Planner          | The component that turns input material into an execution plan.                                                                       | [Planner Contracts](../contracts/planner/index.md)                                     |
| Adapter          | A runtime-specific implementation boundary used by the engine or adjacent services.                                                   | [Architecture](../architecture/index.md)                                               |
| Runtime          | The operational process or platform where an adapter or worker actually runs.                                                         | [Runbooks](../runbooks/index.md)                                                       |
| State Store      | The persistence boundary for run state, run events, and related consistency rules.                                                    | [Engine Contracts](../contracts/engine/index.md)                                       |
| Outbox           | The delivery boundary for external event publication. It is not the same thing as the state store.                                    | [System Delivery Status](../architecture/system-delivery-status.md)                    |
| Run              | One execution instance of a plan under a tenant and environment context.                                                              | [Engine Contracts](../contracts/engine/index.md)                                       |
| Step             | A unit of work inside a run.                                                                                                          | [Engine Contracts](../contracts/engine/index.md)                                       |
| Plan             | The executable description consumed by the engine runtime.                                                                            | [Planning Control Tower](../planning/state/planning-control-tower.md)                  |
| PlanRef          | The metadata reference that points to a plan artifact without embedding the plan bytes inline.                                        | [ADR-0012](../adr/ADR-0012-plan-integrity-ownership.md)                                |
| Artifact         | A produced or referenced output such as compiled code, manifests, or lineage payloads.                                                | [System Map](./system-map.md)                                                          |
| StepArtifactRef  | The generic, step-kind-agnostic runtime reference to a content-addressed step artifact, carrying artifact kind, digest, URI and size. | [ADR-0067](../adr/ADR-0067-canonical-artifact-authority-and-compiled-code-hard-cut.md) |
| logicalAttemptId | The logical retry or execution-attempt identifier used to distinguish run behavior from provider-specific attempt counters.           | [ADRs](../adr/index.md)                                                                |
| ADR              | A decision record that captures an accepted, proposed, or superseded architectural choice.                                            | [ADRs](../adr/index.md)                                                                |
| Risk             | An open technical or delivery concern that still requires mitigation or explicit acceptance.                                          | [Risk Register](../risk-register/index.md)                                             |
| Evidence         | Validation material proving that a high-impact change was tested or closed correctly.                                                 | [Evidence](../evidence/index.md)                                                       |
| Status           | The current implementation or delivery state of the system, which is different from the target design.                                | [System Delivery Status](../architecture/system-delivery-status.md)                    |
| Roadmap          | Planned change sequencing. It must not be confused with current implementation status.                                                | [Roadmap Of Record](../planning/roadmap/index.md)                                      |
| Canonical spec   | The governing document that defines behavior, invariants, or accepted architecture for a topic.                                       | [Canonical Doc Code Matrix](../planning/status/canonical-doc-code-matrix.md)           |
| Status doc       | The document that says what is currently true in implementation or delivery, even when the target design is different.                | [System Delivery Status](../architecture/system-delivery-status.md)                    |
| Reference-only   | Documentation that is visible and useful, but not the accepted governing source of truth for behavior.                                | [Repository Map](./repository-map.md)                                                  |
| Workspace        | A package or app unit in the monorepo, usually resolved through the pnpm workspace configuration.                                     | [Repository Map](./repository-map.md)                                                  |

## Related Normative Vocabulary

For engine-level canonical field and envelope terminology, see:

- [Glossary Contract v1](../architecture/components/engine/contracts/engine/GlossaryContract.v1.md)
