---
title: Intent reconciler runtime composition user stories
status: Draft
owner: API / Engine / Architecture
last_reviewed: 2026-05-12
planning_type: architecture
---

# Intent Reconciler Runtime Composition User Stories

## US-DHM-WS2-001: Preserve ordered runtime startup

As an operator, I need the intent reconciler runtime to start in a predictable
order so migrations, adapters, maintenance reconciliation, and worker startup do
not race each other.

Acceptance criteria:
config resolution precedes store creation, store migration precedes adapter
resolution, adapter resolution precedes maintenance service creation, and worker
creation precedes handle publication.

## US-DHM-WS2-002: Keep concrete bindings in the API composition root

As an engine maintainer, I need concrete Postgres and provider adapter
construction to stay in `apps/api` so `@dvt/engine` remains a port-driven
runtime package.

Acceptance criteria:
the runtime composition object binds Postgres stores and provider adapters;
engine services receive ports and do not read environment values for this path.

## US-DHM-WS2-003: Preserve fail-closed runtime behavior

As an operator, I need disabled, unavailable, or unsupported reconciler runtime
configuration to fail closed rather than publish a partially wired background
worker.

Acceptance criteria:
disabled runtime and missing database URL return `null`, unsupported provider
names throw, and an empty adapter map throws
`INTENT_RECONCILER_NO_PROVIDER_ADAPTERS`.

## Negative Scenarios

- No background worker starts when the runtime is disabled.
- No runtime handle is published before adapters and maintenance service exist.
- No provider-specific runtime behavior is moved into `@dvt/engine`.

## Scenario Coverage Matrix

| Story            | Implementation surface                                       | Validation                                                                     |
| ---------------- | ------------------------------------------------------------ | ------------------------------------------------------------------------------ |
| `US-DHM-WS2-001` | `IntentReconcilerRuntimeComposition`                         | `intentReconcilerRuntimeComposition.architecture.test.ts`                      |
| `US-DHM-WS2-002` | `intentReconcilerRuntime.ts`                                 | `intentReconcilerRuntimeComposition.architecture.test.ts`, `dvt-api` typecheck |
| `US-DHM-WS2-003` | `createIntentReconcilerRuntime` and existing bootstrap tests | `server.test.ts`, `intentReconcilerRuntimeComposition.architecture.test.ts`    |
