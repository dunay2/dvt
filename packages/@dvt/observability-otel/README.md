# @dvt/observability-otel

OpenTelemetry SDK adapter for the `IObservability` port.

- Exports governed traces through OTLP/HTTP while keeping the public
  `IObservability` port provider-neutral.
- Applies metric label cardinality validation from `@dvt/observability`.
- Propagates active parent spans across asynchronous application boundaries.
- Exports only the bounded trace-attribute vocabulary owned by this adapter;
  request bodies, SQL, YAML, paths, tokens, credentials, and secret references
  are not trace attributes.
- Treats exporter and collector failures as non-blocking diagnostics.
- Emits structured JSON logs in local/runtime compositions.
- Propagates ambient `withContext()` values, including run diagnostic fields,
  into structured logs when a log entry does not provide an explicit context.
- Exposes `OtelObservability` from the package root entrypoint.

The API composition selects this adapter when `OBS_ENABLED=true` and reads:

- `OTEL_EXPORTER_OTLP_ENDPOINT`
- `OTEL_SERVICE_NAME`
- `OTEL_RESOURCE_ATTRIBUTES` (optional)

`OTEL_EXPORTER_OTLP_ENDPOINT` may be either an OTLP base endpoint or the full
`/v1/traces` URL. `forceFlush()` and `shutdown()` are available on the concrete
adapter for controlled proof and process-lifecycle composition.

References:

- OpenTelemetry JS: https://opentelemetry.io/docs/languages/js/
- OTLP spec: https://opentelemetry.io/docs/specs/otlp/
