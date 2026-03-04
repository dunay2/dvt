---
title: Guide — Observability (Logs, Metrics, Traces, OTel)
status: Guide
tags: [observability, logging, metrics, tracing, otel]
---

# Observability (Logs, Metrics, Traces, OTel)

Use this guide when changes affect:

- logging/error handling
- performance or latency
- distributed workflows (engine/adapters)

## 1) Structured logs

- Prefer JSON logs in services
- Include correlation IDs: `runId`, `traceId`, `spanId`, `tenantId` (where applicable)
- Never log secrets/PII

## 2) Metrics: RED / USE

- RED method (services): Rate, Errors, Duration
  - https://www.weave.works/blog/the-red-method-key-metrics-for-microservices-architecture/
- USE method (resources): Utilization, Saturation, Errors
  - https://www.brendangregg.com/usemethod.html

## 3) Distributed tracing (OpenTelemetry)

Baseline:

- instrument boundaries (API, engine steps, adapter calls)
- propagate context

Reference:

- OpenTelemetry: https://opentelemetry.io/

## 4) Verification

- Unit tests for logger shape (when strict)
- Integration tests for correlation propagation (when needed)
- ED includes “what signals changed” (1–3 bullets)
