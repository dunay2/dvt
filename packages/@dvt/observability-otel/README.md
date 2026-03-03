# @dvt/observability-otel

Reference implementation of `IObservability` using OpenTelemetry SDK.

- Exports traces/metrics/logs to an OTLP endpoint (typically the OTel Collector).
- Applies metric label cardinality validation from `@dvt/observability`.
- Exposes `OtelObservability` from the package root entrypoint.

This package is a scaffold: wire it in your DI container and configure env vars:
- `OTEL_EXPORTER_OTLP_ENDPOINT`
- `OTEL_SERVICE_NAME`
- `OTEL_RESOURCE_ATTRIBUTES` (optional)

References:
- OpenTelemetry JS: https://opentelemetry.io/docs/languages/js/
- OTLP spec: https://opentelemetry.io/docs/specs/otlp/
