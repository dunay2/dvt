---
title: ADR-0044 - Structured contracts error metadata and non-semantic messages
status: Accepted
owner: Architecture / Contracts / Engine
last_reviewed: 2026-04-03
---

# ADR-0044 - Structured contracts error metadata and non-semantic messages

## Status

Accepted.

## Context

`@dvt/contracts` is the shared-kernel publication surface for cross-package
serializable contracts and selected shared errors under `ADR-0018`.

Before this change, `@dvt/contracts` error handling had two problems:

1. multiple public errors still relied on hardcoded English `Error.message`
   text
2. a local cleanup attempt started to replace human-readable messages with
   message-key strings inside `Error.message`

Both models are unsafe.

- Hardcoded text invites semantic branching on English prose.
- Replacing `message` with `messageKey` preserves stringly semantics and breaks
  consumers that legitimately expect operator-readable diagnostics.

The repo already has a stronger pattern in `@dvt/engine`: stable semantic
metadata is carried separately from presentation via `code`, `messageKey`, and
`messageParams`.

`@dvt/contracts` needs the same discipline so shared-kernel consumers stop
depending on exception text as the contract of record.

## Decision

### 1. Public contracts errors expose structured metadata

Public `@dvt/contracts` errors MUST expose:

- `code`
- `messageKey`
- `messageParams`
- `message`

`message` remains present for diagnostics, logs, and operator visibility, but
it is not the semantic source of truth.

### 2. `Error.message` is diagnostic only

Consumers MUST NOT:

- branch on `Error.message`
- parse `Error.message`
- assert semantic behavior from English text

Consumers MUST instead branch on:

- `instanceof`
- `code`
- `messageKey`
- `messageParams`

### 3. Validation payloads are structured contracts

`ValidationErrorResponse` is a structured boundary contract and MUST include:

- `statusCode`
- `error`
- `code`
- `messageKey`
- `messageParams`
- `message`
- `details`

For validation responses:

- top-level semantics live in `code`, `messageKey`, and `messageParams`
- `details[].message` is diagnostic text only
- callers must use stable machine fields such as `details[].path` and
  `details[].code` for logic

### 4. Breaking rollout is explicit

This is a breaking shared-kernel change.

The migration rule is:

1. change `@dvt/contracts` to the structured error model
2. update all direct in-repo consumers in the same slice
3. remove tests or control flow that still depend on raw message text

Compatibility shims that preserve semantic dependence on `message` are out of
scope.

### 5. `@dvt/contracts` aligns with the engine error pattern

This ADR aligns `@dvt/contracts` with the engine-side pattern established in
the `DvtError` hierarchy:

- semantic metadata is explicit
- presentation is separate
- tests assert typed fields rather than prose

This ADR does not require the engine package to change its own existing message
rendering behavior in the same slice. It only requires `@dvt/contracts`
consumers to stop treating message text as semantic.

## Consequences

### Positive

- Shared-kernel error semantics become explicit and machine-readable.
- Cross-package tests stop failing because of message wording drift.
- Validation responses are safer for APIs, CLI tooling, and adapter consumers.
- The repo no longer encourages `messageKey`-in-`message` as a false-structured
  pattern.

### Trade-offs

- This is a breaking change for any consumer still asserting or parsing
  `Error.message`.
- The rollout requires coordinated updates across contracts, engine, planner,
  artifacts, and adapter tests.
- Operator-visible strings still need maintenance, but they are no longer
  semantic contract data.

## References

- [ADR-0005-contract-formalization-tooling.md](ADR-0005-contract-formalization-tooling.md)
- [ADR-0006-contract-tooling-governance.md](ADR-0006-contract-tooling-governance.md)
- [ADR-0018_Shared_Kernel_Ownership_Governance.md](ADR-0018_Shared_Kernel_Ownership_Governance.md)
