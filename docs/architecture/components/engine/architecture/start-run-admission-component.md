---
title: Start-Run Admission Component
status: Active
owner: Architecture / Engine
last_reviewed: 2026-04-29
planning_type: architecture
---

# Start-Run Admission Component

## Owned Concern

The start-run admission component owns pre-dispatch admission orchestration for
engine start-run requests. It coordinates access policy, state-store
preconditions, provider adapter resolution, capability validation, and optional
run-execution-context admission.

It does not own HTTP parsing, plan compilation, provider execution, lifecycle
event persistence, or plugin runtime execution.

Scenario coverage is tracked in
[Start-Run Admission User Stories](start-run-admission-component.md#section-start-run-admission-user-stories).

## Public API

- `IStartRunAdmissionService`
  Internal start-run phase seam consumed by `StartRunApplicationService`.
  Exposes `admit(request)` and returns the provider adapter plus verified plan
  artifact before intent creation and provider dispatch.
- `StartRunAdmissionGuard`
  Application guard used by start-run and recovery flows before provider
  handoff.
- `StartRunAdmissionGuardDeps`
  Dependency object for access policy, read-only state-store port, provider
  adapter registry, optional run-execution-context resolver, and optional
  binding policy.
- `assertStartRunAllowed(planRef, context)`
  Validates tenant/run preconditions and rate limits before deeper execution
  policy checks.
- `assertPreparedRunAllowed(planRef, context)`
  Revalidates access, plan, schema, run identity, and rate limits for a recovery
  child already atomically prepared by the state store. It requires the child
  metadata to exist and does not create a second recovery attempt.
- `resolveAdapter(context)`
  Resolves the provider adapter selected by the run context or fails closed
  when the adapter is not registered.
- `assertExecutionPolicyAllowed(admission)`
  Validates adapter capabilities and delegates run-execution-context admission
  through a named request object.
- `RunExecutionContextAdmissionRequest`
  Named request object carrying `plan`, `planRef`, `executionPolicy`, and
  `context` into `RunExecutionContextAdmissionPolicy`.
- `RunExecutionContextAdmissionPolicy`
  Policy object that validates run-execution-context reference alignment,
  tenant/project/environment alignment, plugin context requirements, and plugin
  compatibility fingerprints.

## Invariants

- Start-run admission is pre-dispatch. It must run before provider handoff.
- Prepared recovery admission must preserve the same fail-closed policy while
  accepting only an existing, identity-matched recovery child.
- `StartRunApplicationService` depends on `IStartRunAdmissionService`, not on
  the concrete admission construction graph.
- `StartRunAdmissionService` owns scoped plan-ref conversion and plan integrity
  validation for the start-run command.
- The guard coordinates admission policies; it must not execute provider work.
- State-store precondition reads go through `IRunStateStoreRead`.
- Adapter resolution must fail closed with `AdapterNotRegisteredError`.
- Capability validation stays provider-port based, not plugin-specific.
- Run-execution-context validation must use
  `RunExecutionContextAdmissionRequest`; positional argument trains are not
  allowed at this boundary.
- Plugin requirements are selected by step kind, but engine source must remain
  plugin-name agnostic.
- Tenant, project, environment, plan id, plan version, plan hash, and target
  adapter must align before plugin context checks pass.
- Plugin compatibility fingerprint checks remain optional but fail closed when
  a policy expects a fingerprint and the resolved context cannot prove it.

## Transitions

```mermaid
stateDiagram-v2
  [*] --> ReceivedStartRun
  ReceivedStartRun --> PreconditionsRejected: access or state precondition fails
  ReceivedStartRun --> AdapterRejected: adapter not registered
  ReceivedStartRun --> CapabilityRejected: adapter lacks required capability
  ReceivedStartRun --> RunContextRejected: runExecutionContextRef or plugin context invalid
  ReceivedStartRun --> Admitted: all admission policies pass
  PreconditionsRejected --> [*]
  AdapterRejected --> [*]
  CapabilityRejected --> [*]
  RunContextRejected --> [*]
  Admitted --> ProviderHandoff
  ProviderHandoff --> [*]
```

## Consumers

- `StartRunApplicationService` consumes `IStartRunAdmissionService` before
  creating the start-run intent.
- `StartRunAdmissionService` uses the guard before provider dispatch.
- `RecoverRunApplicationService` uses the same admission vocabulary for
  recovery posture where applicable.
- API composition supplies configured adapters and optional
  run-execution-context infrastructure.
- `RunExecutionContextAdmissionPolicy` consumes the named admission request.
- Engine tests consume fixture builders to prove acceptance, provenance,
  plugin requirements, and compatibility paths.

## Diagrams

```mermaid
flowchart LR
  Api["API / application use case"] --> Admission["IStartRunAdmissionService"]
  Admission --> Guard["StartRunAdmissionGuard"]
  Admission --> Integrity["IPlanIntegrityValidator"]
  Admission --> PlanReader["IStoredPlanArtifactReader"]
  Guard --> Access["IRunAccessPolicy"]
  Guard --> State["IRunStateStoreRead"]
  Guard --> Adapters["Map<provider, IProviderAdapter>"]
  Guard --> Capabilities["StartRunValidationPolicy"]
  Guard --> ContextPolicy["RunExecutionContextAdmissionPolicy"]
  ContextPolicy --> Resolver["IRunExecutionContextResolver"]
  ContextPolicy --> Binding["IRunExecutionContextBindingPolicy"]
  Guard --> Provider["Provider handoff"]
```

```mermaid
sequenceDiagram
  participant UseCase as StartRunApplicationService
  participant Admission as IStartRunAdmissionService
  participant Guard as StartRunAdmissionGuard
  participant Integrity as IPlanIntegrityValidator
  participant PlanReader as IStoredPlanArtifactReader
  participant Capabilities as StartRunValidationPolicy
  participant Context as RunExecutionContextAdmissionPolicy
  participant Resolver as IRunExecutionContextResolver
  participant Adapter as IProviderAdapter

  UseCase->>Admission: admit({ planRef, resolvedContext })
  Admission->>Guard: assertStartRunAllowed(planRef, context)
  Admission->>Guard: resolveAdapter(context)
  Guard-->>Admission: adapter
  Admission->>Integrity: fetchAndValidate(scopedPlanRef, planReader)
  Integrity->>PlanReader: fetchStoredPlanArtifactForValidation(...)
  Integrity-->>Admission: verified plan + execution policy
  Admission->>Guard: assertExecutionPolicyAllowed(admission)
  Guard->>Capabilities: validateCapabilitiesOrThrow(policy, adapter)
  Guard->>Context: assertAllowed({ plan, planRef, executionPolicy, context })
  Context->>Resolver: resolve(runExecutionContextRef)
  Context-->>Guard: admitted or rejected
  Admission-->>UseCase: adapter + verified artifact
  UseCase->>Adapter: provider handoff
```

## Fowler Reading

- **Application Controller**:
  `StartRunAdmissionGuard` coordinates the start-run admission workflow.
- **Policy Object**:
  `RunExecutionContextAdmissionPolicy` owns context alignment and plugin
  context rules.
- **Parameter Object**:
  `RunExecutionContextAdmissionRequest` names the admission inputs and prevents
  primitive argument ordering drift.
- **Gateway**:
  `IRunExecutionContextResolver` hides the run-execution-context storage
  adapter.
- **Hexagonal Port**:
  `IProviderAdapter` and `IRunStateStoreRead` keep provider and persistence
  infrastructure outside application admission semantics.

## Drift Guards

- `tools/ci/static-analysis-followup-branch-architecture.test.mjs` checks this
  guide, the owned-concern docblocks, and the named admission request object.
- `packages/@dvt/engine/test/services/RunExecutionContextAdmissionPolicy.*.test.ts`
  validates acceptance, provenance, plugin requirements, and compatibility
  behavior.
- `packages/@dvt/engine/test/services/RunExecutionContextAdmissionPolicy.srp.architecture.test.ts`
  keeps the test suites split by responsibility.

<a id="section-start-run-admission-user-stories"></a>

## Start-Run Admission User Stories

### Purpose

This document captures the user-facing and architecture-facing scenarios for
the start-run admission component touched by the static-analysis follow-up
branch.

It complements the component guide:

- [Start-Run Admission Component](start-run-admission-component.md)

### User Stories

#### US-START-RUN-001: admit a run only after context policy passes

As an operator starting a run, I want admission to succeed only after the
execution context policy validates the plan, plan reference, run reference, and
execution target, so unsafe runs cannot start through partial context.

Acceptance criteria:

- Given a valid `RunExecutionContextAdmissionRequest`, when
  `StartRunAdmissionGuard` evaluates the request, then start-run admission may
  proceed to the adapter.
- Given missing plan, planRef, runRef, or execution target, when admission is
  evaluated, then the policy denies the request before adapter dispatch.
- Given admission is denied, then no adapter start is invoked.

#### US-START-RUN-002: keep policy input semantic

As an engine maintainer, I want `RunExecutionContextAdmissionRequest` to be a
named request object, so callers cannot silently swap positional values or
recreate the same policy with different call semantics.

Acceptance criteria:

- Given engine code calls `RunExecutionContextAdmissionPolicy.assertAllowed`,
  when arguments are supplied, then they are supplied through the named request
  object.
- Given a future change attempts positional policy arguments, then the
  branch-level architecture guard fails.
- Given the policy remains generic, then adapter-specific requirements stay in
  adapter policy and capability validation.

#### US-START-RUN-003: preserve degraded capability visibility

As an operator, I want admission failures to remain explainable when capability
or provider requirements are missing, so the platform reports why the run did
not start instead of creating a hidden no-op.

Acceptance criteria:

- Given provider requirements are unavailable, when admission is evaluated,
  then the failure is represented as an admission denial.
- Given access or execution target checks fail, then the denial remains before
  adapter dispatch.
- Given health or capability state changes, then start-run admission does not
  bypass the single policy boundary.

#### US-START-RUN-004: validate semantic architecture drift

As an architect, I want the branch-level architecture guard to validate start
run admission semantics, so future cleanup cannot collapse the named policy
request or remove owned-concern documentation.

Acceptance criteria:

- Given the branch architecture guard runs, when it reads engine admission
  source, then it finds the owned-concern docblock at module start.
- Given the guard reads policy source, then it finds
  `RunExecutionContextAdmissionRequest`.
- Given the guard reads docs, then public API, invariants, transitions,
  consumers, diagrams, and these user stories exist.

### Negative Scenarios

- Missing context data must fail closed before adapter start.
- Positional policy arguments are rejected by architecture tests.
- Adapter-specific checks must not be duplicated inside the generic execution
  context policy.
- Documentation drift is a test failure when the component guide or story doc
  no longer describes public API and invariants.

### Given / When / Then Coverage

- Given a complete run context, When start-run admission evaluates it, Then the
  adapter may be resolved and invoked.
- Given required context is absent, When start-run admission evaluates it, Then
  the denial happens before provider handoff.
- Given policy call shape drifts, When the branch semantic guard runs, Then it
  fails on the missing named request object.

### Scenario Coverage Matrix

- `US-START-RUN-001`: valid context admission.
  Primary implementation: `StartRunAdmissionGuard.ts`.
  Primary tests: `RunExecutionContextAdmissionPolicy.acceptance.test.ts`.
- `US-START-RUN-002`: named policy request.
  Primary implementation: `RunExecutionContextAdmissionPolicy.ts`.
  Primary tests:
  `RunExecutionContextAdmissionPolicy.srp.architecture.test.ts`.
- `US-START-RUN-003`: degraded admission denial.
  Primary implementation: `StartRunAdmissionGuard.ts`.
  Primary tests: `RunExecutionContextAdmissionPolicy.provenance.test.ts`.
- `US-START-RUN-004`: semantic drift guard.
  Primary implementation: `static-analysis-followup-branch-architecture`.
  Primary tests: `static-analysis-followup-branch-architecture.test.mjs`.

### TDD Traceability

```mermaid
flowchart LR
  Stories["Start-run stories"] --> Guard["Branch semantic guard"]
  Guard --> Guide["Start-run component guide"]
  Guard --> Code["StartRunAdmissionGuard and policy"]
  Code --> Tests["Engine policy tests"]
  Tests --> Prepush["verify:prepush"]
```

Red case for this follow-up:

- the branch semantic guard required the start-run user-story document;
- the document did not exist;
- the guard failed before implementation.

Green case for this follow-up:

- add this story document;
- link it through component indexes and branch review material;
- rerun the guard and pre-push validation.

> Acceptance scope status: Active. Owner: Engine / Architecture.
