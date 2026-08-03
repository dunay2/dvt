---
title: Protected StartRun OpenTelemetry trace composition
status: Accepted
date: 2026-08-03
owners:
  - packages/@dvt/observability-otel
  - packages/@dvt/adapter-temporal
  - apps/api
arc_level: ARC-2
breaking: false
code_refs:
  - packages/@dvt/observability-otel/src/OpenTelemetryTraces.ts
  - packages/@dvt/observability-otel/src/otelTracePolicy.ts
  - packages/@dvt/adapter-temporal/src/ObservedTemporalAdapter.ts
  - apps/api/src/entrypoints/http/startRunRoute.ts
  - apps/api/src/modules/providerAdapters/createTemporalProviderAdapterFactory.ts
evidence:
  tests:
    - pnpm --filter @dvt/observability-otel test
    - pnpm --filter @dvt/observability-otel typecheck
    - pnpm --filter @dvt/adapter-temporal test
    - pnpm --filter @dvt/adapter-temporal typecheck
    - pnpm --filter dvt-api test
    - pnpm --filter dvt-api lint
    - pnpm --filter dvt-api typecheck
    - pnpm --filter dvt-api proof:start-run-otel
---

## Decision

The existing `IObservability` port remains the only observability abstraction.
Its OpenTelemetry adapter now owns SDK context propagation, bounded attribute
export, OTLP/HTTP delivery, and non-blocking exporter lifecycle behavior.

The protected StartRun HTTP boundary owns `api.startRun`; the existing engine
use case continues to own `engine.startRun`; and `ObservedTemporalAdapter` owns
`temporal.startRun` around the provider submission. The production Temporal
factory composes that decorator without changing the canonical StartRun rail or
using trace data as runtime truth.

## Evidence

The controlled integration proof exercises the real protected route,
authorization service, planner-backed use case, workflow engine, observed
Temporal decorator, and Temporal adapter with only the external identity and
Temporal client boundaries controlled. It proves exact parent-child span
relationships for an accepted request and proves an authorization rejection
cannot create engine or Temporal spans.

Adapter tests prove that unsupported attributes, request content, paths,
credentials, SQL, YAML, and exception messages are not exported. Exporter
failure cannot change a successful callback or its domain result. Existing
no-op composition remains selected when observability is disabled.
