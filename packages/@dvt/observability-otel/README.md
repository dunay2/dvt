# @dvt/observability-otel

Adapter package for the `IObservability` port and future OpenTelemetry SDK
binding.

- Keeps the public OTel-oriented composition seam stable while the concrete SDK
  exporter remains scaffolded.
- Applies metric label cardinality validation from `@dvt/observability`.
- Emits structured JSON logs in local/runtime compositions.
- Propagates ambient `withContext()` values, including run diagnostic fields,
  into structured logs when a log entry does not provide an explicit context.
- Exposes `OtelObservability` from the package root entrypoint.

This package is a scaffold: wire it in your DI container and reserve these env
vars for the future SDK-backed exporter:

- `OTEL_EXPORTER_OTLP_ENDPOINT`
- `OTEL_SERVICE_NAME`
- `OTEL_RESOURCE_ATTRIBUTES` (optional)

References:

- OpenTelemetry JS: https://opentelemetry.io/docs/languages/js/
- OTLP spec: https://opentelemetry.io/docs/specs/otlp/
