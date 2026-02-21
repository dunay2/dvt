````markdown
# ADR-0000: Code generation with mandatory normative traceability

- **Status**: Accepted
- **Date**: 2026-02-14
- **Owners**: Engine / Adapters maintainers / AI

## Context

This ADR establishes that generated code and technical artifacts must include explicit, verifiable traceability back to the architecture decisions (ADRs) that justify them.

## Mandatory Requirement

All generated artifacts (code, schemas, contracts, tests, technical documentation) MUST:

1. Be directly related to at least one approved ADR.
2. Include explicit references to the ADR(s) that justify the artifact.
3. Implement the consequences and specifications derived from the referenced ADR(s).

## Work Structure

### Phase 1 — Normative Baseline Validation

- Identify applicable ADR(s) (list ADR numbers).
- Extract relevant architectural decisions and constraints.
- Verify that the planned artifact is covered by those decisions.

### Phase 2 — Generation with Traceability

For each generated artifact include traceability metadata and examples:

- File header / comments (example):

```typescript
/**
 * @file [filename]
 * @baseline ADR-[NUMBER]: [ADR title]
 * @decision [specific decision text implemented]
 * @consequence [consequence this code implements]
 * @version [contract version]
 * @date [date]
 */
```
````

- Commit messages should reference baselines, e.g.:

```
feat([component]): implement [feature]

Baseline: ADR-0005 - Contract Formalization Tooling
Decision: JSON Schema as normative form
Implements: run-events.schema.json
```

- Tests must state the ADR baseline and verify conformance to the normative artifacts.

### Phase 3 — Post-Generation Validation

- Produce a traceability manifest listing implemented ADRs and generated artifacts.
- Ensure there is no "orphaned" code without ADR association.

## Example

Request to the assistant: "Generate JSON Schema for workflow events based on ADR-0005"

Expected artifact: `schemas/run-events.schema.json` including a `baseline` section referencing `ADR-0005`.

Example manifest (excerpt):

```json
{
  "component": "RunEvents Contract",
  "version": "1.1.1",
  "generated": "2026-02-16",
  "baseline_adrs": [
    { "number": "ADR-0004", "title": "Event Sourcing Strategy" },
    { "number": "ADR-0005", "title": "Contract Formalization Tooling" }
  ]
}
```

## CI/CD Validation Rules

The pipeline MUST verify:

- Every generated file has a header with `@baseline ADR-[NUMBER]`.
- Referenced ADR numbers exist and are in `Accepted` state.
- JSON Schemas are versioned and aligned with contract version.
- Tests include conformance checks (golden vectors).
- PRs missing ADR traceability should be rejected.

## Request Format for Generation

When asking for generated artifacts, provide:

- ADR(s) baseline: [ADR numbers]
- Artifact type: [schema/code/tests/docs]
- Contract version: [semver]
- Optional constraints

The assistant should confirm the ADR baseline and version before producing artifacts, then generate files with traceability metadata and a manifest, and finally update documentation and any related graph DB artifacts.

## References

- ADR-0004: Event Sourcing Strategy
- ADR-0005: Contract Formalization Tooling

```

```
