---
title: Custom Policy Namespace Freeze User Stories
status: Accepted
owner: Architecture / Planner / Contracts
last_reviewed: 2026-05-13
---

# Custom Policy Namespace Freeze User Stories

## Story 1 - Contributor Avoids Speculative Growth

As a planner contributor, I need the custom policy namespace registry to state
that it is frozen so that I do not add registry behavior before a real consumer
exists.

Acceptance criteria:

- The planner port docblock says the seam is frozen compatibility surface.
- The component guide says reactivation requires a real consumer and
  ADR-backed reactivation.
- Architecture tests fail if registration, validation, or implementation
  methods are added while frozen.

## Story 2 - Contracts Consumer Keeps Source Compatibility

As a package consuming planner contract vocabulary, I need exported custom
policy namespace DTOs to remain source-compatible so that AR-A4 does not create
an unnecessary breaking contract change.

Acceptance criteria:

- `CustomPolicyNamespaceEntry`, `CustomPolicyMap`, rejection codes, schema
  validator, and validation error vocabulary remain exported from
  `@dvt/contracts`.
- The contracts docblock says the vocabulary is retained for compatibility, not
  active runtime behavior.

## Story 3 - Future Product Owner Reactivates Deliberately

As a future product owner with a concrete custom policy use case, I need a
documented reactivation path so that the seam can become active only with the
right ownership, command/query rail, and negative tests.

Acceptance criteria:

- Reactivation requires a real consumer.
- Reactivation requires ADR or mandatory proposal coverage.
- Reactivation updates component docs, architecture tests, ARC evidence, and
  risk records in the same slice.
