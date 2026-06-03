---
title: Web Mock Runtime Hardcut User Stories
status: Implemented
owner: Web / API / Architecture
last_reviewed: 2026-05-10
planning_type: architecture
---

# Web Mock Runtime Hardcut User Stories

## Stories

1. As an operator using the web shell, I want protected routes to depend on API
   session and workspace context so that the browser cannot silently bypass
   backend authority.
2. As a developer writing a view test, I want explicit app service doubles so
   that tests can use representative data without teaching product composition
   a mock runtime mode.
3. As an architect reviewing web/API drift, I want a semantic architecture guard
   so that mock runtime semantics cannot re-enter the product rail.
4. As a maintainer adding a missing backend rail later, I want the existing API
   port to fail closed until the backend rail exists so that no frontend mock
   fills the semantic gap.
5. As an architect reviewing a hardcut module, I want an `Owned concern:`
   docblock at the module boundary so that each file declares its semantic
   ownership before implementation details.
6. As a maintainer reading component docs, I want product behavior described as
   API-only and fixture behavior described as test-only so that docs do not
   preserve retired runtime choices.
7. As a test author, I want fixture-backed doubles to live under
   `apps/web/src/testing` so that representative data cannot be mistaken for
   product truth.

## Acceptance Scenarios

| Scenario                | Given                         | When                         | Then                          |
| ----------------------- | ----------------------------- | ---------------------------- | ----------------------------- |
| Product route startup   | API-mode web shell            | Protected route renders      | Session/context API resolves  |
| Missing rail            | API workspace capability port | Backend route is absent      | Port returns unavailable      |
| View test               | Test needs fixture data       | Harness renders a view       | Doubles are injected          |
| Product/runtime drift   | Product composition changes   | Architecture test runs       | Mock import is rejected       |
| Semantic docblock drift | Hardcut module changes        | Architecture test runs       | Missing ownership fails       |
| Documentation drift     | Hardcut docs change           | Architecture test runs       | Retired runtime wording fails |
| Test-double containment | Fixture data changes          | Product build imports source | Product import is rejected    |
