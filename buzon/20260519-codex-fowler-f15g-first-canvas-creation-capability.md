---
title: Fowler analysis for first Canvas creation capability semantic closure
status: Draft
date: 2026-05-19
owner: Codex
---

# Fowler Analysis: First Canvas Creation Capability

## Scope

This analysis covers the branch work merged through:

- `fix(web): Fix Canvas workbench menu and template actions (#1286)`
- `fix(web): Enable first Canvas template creation (#1287)`

The work sits in the Canvas entry screen, shell/workbench boundary, and first
Canvas document creation path. It reuses the existing
`CreateCanvasDocumentCommand` rail through `/workspace/graph/draft`.

## Mature-System Comparison

Mature workbench systems keep global navigation, route-local commands, and
domain mutations in separate ownership layers:

- the shell owns global navigation and route family posture;
- the route owns local command placement and empty states;
- a presentation model owns copy and visual semantics;
- an application command owns persistence;
- a policy owns whether a command can be exposed.

The merged branch moved DVT closer to that posture. The top bar no longer owns
Canvas route commands, Admin and Plugins stay discoverable through the shell
menu, first-canvas template copy is locale-aware, and the first document is
persisted through `CreateCanvasDocumentCommand` instead of a UI shortcut.

## Improved Patterns

| Area                      | Improvement                                               | Fowler / DDD reading                  |
| ------------------------- | --------------------------------------------------------- | ------------------------------------- |
| Top bar                   | Canvas commands moved out of persistent chrome            | Move Method, Presentation Model       |
| First-canvas copy         | Template titles and descriptions resolved through a model | Presentation Model                    |
| First-canvas persistence  | Template selection uses the existing draft command rail   | Command, Gateway                      |
| First-canvas availability | Creation no longer depends on `canEditEdges`              | Policy Object, semantic encapsulation |
| Browser proof             | Cypress validates menu reachability and first-canvas save | Semantic Fitness Function             |

## Remaining Antipattern

The branch fixed the observed bug but left one narrow repetition risk:

`useCanvasDraftLifecycle.ts` still owns the boolean expression for
`canCreateCanvasDocument`.

That is a small form of primitive obsession and feature envy. The route needs a
named capability, not a repeated compound condition about draft query shape,
missing records, and write posture. If a later edit copies that condition into
the host cycle, controller, or shell builder, the system can drift back toward
mixed command and graph mutation semantics.

## Grouping Opportunity

Group first-canvas creation availability under a local Canvas document creation
capability component:

- `canvasCreateCanvasDocumentAvailability.ts`
  - owns the boolean policy for exposing the create-first command;
  - depends on draft read posture and persistence permission;
  - does not inspect graph edit permission;
  - does not perform the command.

Consumers remain:

- `useCanvasDraftLifecycle.ts` as lifecycle composer;
- `canvasControllerViewModel.ts` as view-model projector;
- `canvasHostCycleState.ts` as route-state DTO derivation;
- `CanvasPlaygroundHost` as command constructor.

## Drift

| Drift    | Current state                                                            | Fix                                        |
| -------- | ------------------------------------------------------------------------ | ------------------------------------------ |
| Code     | `canCreateCanvasDocument` rule is inline in lifecycle hook               | Extract policy object                      |
| Docs     | Startup guide names the invariant but not the local capability API       | Add component guide                        |
| Tests    | Cypress and host-cycle tests prove symptom, but not the policy owner     | Add pure policy TDD and architecture guard |
| Planning | F15E/F15F cover the symptom and screen, not the final capability closure | Add F15G governed plan                     |

## Teaching For Future Work

- Do not reuse graph mutation permissions for document lifecycle transitions.
- A route capability should be named as a domain decision before being passed
  through builders.
- A Cypress proof should be paired with a local policy test; browser proof alone
  is too late in the feedback loop.
- Component docs should describe owned concerns and consumers for small policy
  modules, not only large React components.

## Applied Patterns

- **Policy Object:** `deriveCanCreateCanvasDocument` owns the create-first
  availability rule.
- **Semantic Encapsulation:** callers ask for first-canvas availability instead
  of rebuilding query-condition logic.
- **Semantic Fitness Function:** an architecture test checks that lifecycle code
  imports the policy and does not inline the condition.

## ADR Decision

No ADR is required. The work does not change a cross-system contract, backend
authority, persistence model, or public compatibility rule. It closes local
frontend semantic drift around an already accepted command rail.
