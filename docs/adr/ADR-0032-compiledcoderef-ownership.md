# ADR-0032 — compiledCodeRef Ownership: Reference in StepStarted Payload

- **Status**: Superseded by [ADR-0067](./ADR-0067-canonical-artifact-authority-and-compiled-code-hard-cut.md)
- **Date**: 2026-03-04
- **Superseded**: 2026-09-05
- **Owners**: Engine Domain / Planner / Traceability

## Historical decision

ADR-0032 introduced a compiled-code-specific reference carried through Planner
step configuration and `StepStarted.payload`, backed by a dedicated
`ICompiledCodeStorage` writer family and compiled-code readers in traceability.
Its purpose was to keep SQL bytes out of the event log while allowing
OpenLineage SQL facet construction and audit/forensic access.

The selected historical flow was conceptually:

```text
dbt compiled SQL
  -> Planner upload via ICompiledCodeStorage
  -> stepTypeConfig.compiledCodeRef
  -> Temporal StepStarted.payload.compiledCodeRef
  -> traceability compiled-code resolver/cache/readers
  -> OpenLineage SqlJobFacet
```

The original decision also required content-addressed SHA-256 identity,
reference-only event payloads, fail-open lineage when SQL could not be resolved,
and no inline large SQL payload in `run_events`.

## Why it was superseded

By 2026-09-05 the repository had a generic content-addressed artifact authority
in `@dvt/artifacts`, a generic runtime `StepArtifactRef`, and generic artifact
read/integrity behavior. Keeping the ADR-0032 family alongside those mechanisms
created duplicate publication, reference, read and integrity authority across
Artifacts, Planner, Contracts, Temporal and Traceability.

[ADR-0067](./ADR-0067-canonical-artifact-authority-and-compiled-code-hard-cut.md)
therefore hard-cuts the compiled-code-specific model instead of preserving a
compatibility layer.

## Historical evidence preserved

The following principles from ADR-0032 remain historically relevant but are now
implemented through the generic artifact boundary:

- event logs should contain references rather than large artifact payloads;
- immutable artifact identity should be content-addressed and integrity checked;
- lineage may fail open when optional artifact content is unavailable;
- SQL lineage may be derived from verified artifact bytes.

The following ADR-0032 mechanisms are **not active architecture**:

- `CompiledCodeRef`;
- `ICompiledCodeStorage`;
- Planner compiled-code upload/enrichment;
- Temporal compiled-code payload projection;
- compiled-code-specific traceability readers, cache or resolver;
- compatibility fallbacks for old payloads.

For current authority, use ADR-0067 and the executable contracts/code it
references.
