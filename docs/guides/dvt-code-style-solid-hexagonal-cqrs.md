---
title: DVT+ Design Guide - Boundaries, Ports, Composition, and CQRS
status: Review
owner: Architecture
last_reviewed: 2026-03-19
---

# DVT+ Design Guide

This guide explains how to design code in the DVT+ repository so it stays
consistent with the active architecture.

It is a derived design guide, not a higher-order normative source. When this
text conflicts with an accepted ADR or a canonical contract, the ADR or
contract wins.

## Purpose

Use this guide to answer these questions:

- where a concern belongs in the repository
- when a type belongs in `@dvt/contracts` versus an owner package
- how composition roots, domain packages, and adapters should relate
- how CQRS and event-sourced read-model separation apply in current code

## Governing Sources

This guide is derived from these active sources:

- [Reference Architecture](../architecture/reference-architecture.md)
- [Current Status](../architecture/system-delivery-status.md)
- [TypeScript Package Classification](../architecture/typescript-package-classification.md)
- [ADR-0003 - Execution Model](../adr/ADR-0003-execution-model.md)
- [ADR-0004 - Event Sourcing Strategy](../adr/ADR-0004-event-sourcing-strategy.md)
- [ADR-0015 - getRunStatus Read Model Separation](../adr/ADR-0015-getRunStatus-read-model-separation.md)
- [ADR-0018 - Shared Kernel Ownership Governance](../adr/ADR-0018_Shared_Kernel_Ownership_Governance.md)
- [ADR-0032 - compiledCodeRef Ownership](../adr/ADR-0032-compiledcoderef-ownership.md)
- [ADR-0034 - Bounded Context Boundaries And Communication Rules](../adr/ADR-0034-bounded-context-boundaries-and-communication-rules.md)
- [ADR-0035 - Planner Public Contract Evolution Protocol](../adr/ADR-0035-planner-public-contract-evolution-protocol.md)

## Non-Goals

This guide is not:

- a generic SOLID tutorial
- a blanket formatting or file-layout standard
- a claim that every package is fully hardened today
- a replacement for package-specific contracts, ADRs, or status docs

## Design Rules

### 1. Design From Bounded Context Ownership

DVT+ uses bounded contexts with explicit ownership.

The high-level split is:

| Context             | Primary responsibility                                 | Canonical home today                           |
| ------------------- | ------------------------------------------------------ | ---------------------------------------------- |
| Planner             | deterministic plan construction                        | `@dvt/planner`                                 |
| Execution           | run lifecycle and invariants                           | `@dvt/engine`                                  |
| State               | persistence authority for run facts                    | state adapters such as `@dvt/adapter-postgres` |
| Artifacts           | immutable plan and compiled-code storage/access        | transitional, target `@dvt/artifacts`          |
| Delivery            | outbox draining and projection/worker runtime behavior | `@dvt/delivery` plus app roots                 |
| Entry / Application | composition, transport, process startup                | `apps/api`, worker apps                        |

Rule:

- peer domain packages do not call each other's domain services directly
- composition roots orchestrate across contexts
- cross-context payloads move through refs, contracts, and messages

### 2. Distinguish Shared Contracts From Domain-Owned Ports

Do not collapse all interfaces into one bucket.

Shared serializable contracts belong in `@dvt/contracts`.
Examples:

- refs such as `PlanRef`, `EngineRunRef`, `CompiledCodeRef`
- persisted envelopes and DTOs
- schemas and validators for shared boundary shapes

Domain-owned behavior ports belong in the package that owns the need.
Examples in the current repo:

- execution-owned ports under `packages/@dvt/engine/src/ports/**`
- planner-owned ports such as `IArtifactResolver` under `packages/@dvt/planner/src/ports/**`

Rule:

- if the thing is a serializable cross-context shape, prefer `@dvt/contracts`
- if the thing expresses a domain-owned behavior dependency, keep it with the owning domain package
- adapters implement owner-defined ports; peer domains do not import each other's internals

This is the active ownership rule from ADR-0034.

### 3. Domain Packages Must Stay Infrastructure-Free

Domain packages may depend on contracts, ports, and pure support facades.
They must not import concrete runtime SDKs or infrastructure clients.

Examples of forbidden imports inside domain packages:

- `@temporalio/*`
- `pg`
- HTTP clients used as concrete adapter dependencies
- filesystem or object-store clients used as infrastructure implementations

Examples of allowed imports inside domain packages:

- `@dvt/contracts`
- domain-owned ports
- `@dvt/observability` facade
- pure utilities such as deterministic hashing or clock abstractions

A useful mechanical check is that `packages/@dvt/engine/src/**` should not import
provider SDKs or database clients directly.

### 4. Composition Roots May Use Concrete Infrastructure

Application roots and worker roots are allowed to instantiate concrete
infrastructure.

Examples that are valid in the current repository:

- `apps/api` wiring adapters, pools, auth repositories, and use cases
- `apps/outbox-worker` wiring runtime monitors, ownership gates, and `pg` pools
- worker apps wiring observability exporters and process lifecycle hooks

Rule:

- concrete clients such as `Pool`, OIDC verifiers, or provider SDK clients belong in apps or adapters
- domain packages define the graph; composition roots assemble it
- do not misclassify app-level wiring as a domain-boundary violation

### 5. CQRS Is Mandatory On The Execution Read Path

Execution is event-sourced and CQRS-oriented.

Current rule set:

- command operations change state and return identity or append results
- query operations return state without mutating the event log
- the default read path is event-log or snapshot derived, not provider-authoritative

Concrete current rule from ADR-0015:

- `getRunStatus()` must not call the provider
- `enrichRunStatus()` is the optional provider-enriched read path

This is not aspirational. It is already implemented and tested in the engine.

### 6. Event Log Is Authoritative, Providers Are Enrichment

The provider does not become the semantic source of truth for run state.

Rule:

- event log and derived snapshots are authoritative for execution state
- provider status may enrich diagnostics, but it does not override persisted state
- delivery and projection paths operate from persisted events and outbox records, not from direct provider polling

### 7. Artifacts Move By Ref, Not By Domain Coupling

Planner hands execution stable references or shared contracts, not direct
planner behavior.

Rule:

- planner constructs plans
- application code passes refs or contract-level outputs into execution
- execution consumes refs and validates them through its own boundary rules
- artifact storage concerns belong to the artifacts boundary, not to execution core

This rule is especially important while the artifact boundary is still being
hardened.

### 8. Tests Must Respect Context Boundaries Too

Package tests are real boundary surfaces.

Rule:

- domain package tests must not reintroduce forbidden peer-domain coupling
- cross-context integration tests belong in composition roots or dedicated compatibility surfaces
- adapter contract tests may use real infrastructure when needed
- domain tests should prefer in-memory or test-double implementations of the relevant ports

This does not mean every test must be colocated with source. The repository
currently uses both package-level `test/` trees and app-level `test/` trees.
Consistency with the package's existing layout is more important than one
forced layout rule.

### 9. Prefer Explicit Package Boundaries Over Folder Folklore

The active lane model and import policy are package-based, not filename-based.

Rule:

- library packages follow the internal-library lane
- Node process entrypoints follow the Node runtime lane
- runtime-sensitive libraries stay library-first unless there is a justified lane change

Do not infer architecture from a historic `tsconfig` name or an old folder
convention. Use the package classification matrix.

## Guidance For Naming And File Structure

These are guidance rules, not hard architectural laws.

Prefer:

- exported names that match their file names when practical
- interfaces prefixed with `I` for ports and service boundaries already using that convention
- explicit version suffixes for versioned contract files
- package-consistent test layout rather than global rigidity

Do not turn these preferences into false absolutes such as:

- exactly one export per file in every package
- all tests must be colocated next to source
- every interface in the repo must live in `@dvt/contracts`

Those statements are not true of the current repository and should not be used
as review blockers.

## Anti-Patterns In This Repository

### Fat Domain Roots

Symptoms:

- `WorkflowEngine` starts parsing manifests or compiled code
- planner begins owning runtime persistence or worker lifecycle behavior
- delivery code starts deciding run lifecycle semantics

### Peer-Domain Direct Imports

Symptoms:

- planner importing execution services
- execution importing planner internals
- delivery owning execution invariants

Cross-context behavior belongs in the application layer, not via direct service
calls between peer domains.

### Provider Truth Over Event Truth

Symptoms:

- `getRunStatus()` calling the provider by default
- UI status derived from provider-only data when persisted state disagrees

### Treating Contracts As A Dumping Ground

Symptoms:

- internal DTOs moved into `@dvt/contracts` just to avoid choosing an owner
- convenience helpers in shared-kernel packages with no boundary meaning

### Treating Apps As Architecture Violations

Symptoms:

- flagging `apps/api` or worker process wiring as invalid merely because they use concrete infrastructure
- confusing composition-root responsibilities with domain-package responsibilities

### Over-Rigid Review Rules That Do Not Match The Repo

Symptoms:

- rejecting code because tests are under `test/` instead of colocated
- rejecting files because they export multiple related symbols in one module
- demanding that all ports live in the shared kernel

Those review habits create noise and obscure real boundary failures.

## Current Compliance Snapshot

### Aligned Today

The repository already aligns with this guide in several important ways:

- execution domain code is infrastructure-free
- `getRunStatus()` and `enrichRunStatus()` are separated per ADR-0015
- composition roots instantiate concrete infrastructure in apps and workers
- bounded context separation is explicit in ADR-0034 and reflected in package direction
- artifact extraction has started and `@dvt/artifacts` now exists as a real package

### Partial Or Transitional Today

These areas are directionally correct but not fully uniform yet:

- artifacts boundary hardening
- planner production hardening and broader planning-layer integration
- observability validation depth
- some transitional compatibility exports and alias surfaces
- some domain-owned behavior ports still coexisting with shared-kernel serializable contracts during migration

### Not A Requirement Of This Guide

The following are not mandatory architectural rules:

- one export per file everywhere
- colocated tests everywhere
- banning all `pg` usage outside `@dvt/adapter-postgres`
- forcing all interfaces into `@dvt/contracts`

## Review Checklist

When reviewing a change, ask:

1. Which bounded context owns this concern?
2. Is this a shared serializable contract or a domain-owned behavior port?
3. Is infrastructure staying out of domain packages?
4. Is cross-context orchestration happening in an application root instead of a peer-domain import?
5. Does the read path preserve ADR-0015 separation?
6. Are tests reinforcing boundaries rather than bypassing them?
7. Does the proposed rule match the repository's current package model and status docs?

## Approval Posture

This guide is suitable as a design-review companion only if reviewers continue
to treat the cited ADRs and canonical contracts as the actual source of truth.

If a future change to the repository makes this guide drift from the accepted
ADRs, update the guide or downgrade its status rather than silently relying on
it as if it were still accurate.
