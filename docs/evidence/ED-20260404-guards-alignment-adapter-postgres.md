---
title: Alineación de guards de transición y shape-checking en run-domain y adapter-postgres
status: Accepted
date: 2026-04-04
owners:
  - @dvt/adapter-postgres
arc_level: ARC-2
breaking: false
code_refs:
  - packages/@dvt/adapter-postgres/test/PostgresStateTransitions.integration.test.ts
  - packages/@dvt/adapter-postgres/test/RunDomainStateTransitions.contract.test.ts
  - packages/@dvt/run-domain/src/applyRunEvent.ts
  - packages/@dvt/run-domain/src/transitionPolicy.ts
  - packages/@dvt/run-domain/src/errors.ts
  - packages/@dvt/run-domain/test/applyRunEvent.test.ts
evidence:
  tests:
    - pnpm test
    - pnpm verify:prepush
---

Se alinean los guards de transición y shape-checking entre run-domain y adapter-postgres, asegurando consistencia contractual y cobertura de tests de integración y contrato. Sin deuda ni stubs.
