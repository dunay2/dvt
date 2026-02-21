# Next Issues Templates

<!--
Status: template
Last-updated: 2026-02-21
Owner: dunay2
-->

This document provides ready-to-use issue templates for the next implementation phases.

---

## Issue A: Runtime Validation at API Boundaries

```markdown
# feat(validation): add runtime validation at API boundaries

## Description

Integrate runtime validators at all API entry points to validate input payloads before processing.

## Goals

- Add validation wrappers to workflow-engine adapter methods.
- Validate REST boundary payloads where applicable.
- Return structured error payloads on validation failures.
- Document runtime validation behavior.

## Acceptance Criteria

- [ ] API methods validate execution plan inputs.
- [ ] API methods validate validation-report outputs.
- [ ] Validation errors return structured `400 Bad Request` responses.
- [ ] Tests cover valid and invalid payload scenarios.
- [ ] Documentation includes validation examples.

## Suggested Files

- `packages/@dvt/contracts/src/`
- `packages/@dvt/engine/src/`
- `packages/@dvt/engine/test/`

## Labels

- `enhancement`
- `contracts`
- `validation`
```

---

## Issue B: Schema Generation and API Docs

```markdown
# docs(schemas): generate JSON Schema and API docs from contract definitions

## Description

Generate machine-readable schemas and API documentation from canonical contract sources.

## Goals

- Generate JSON schema artifacts.
- Publish API reference documentation.
- Keep generated artifacts synchronized in CI.

## Acceptance Criteria

- [ ] Add codegen script for schema generation.
- [ ] Generated schema artifacts are committed under a canonical docs location.
- [ ] CI checks fail when generated artifacts are out of sync.
- [ ] Documentation explains the codegen workflow.

## Labels

- `documentation`
- `codegen`
- `contracts`
```

---

## Issue C: Adapter Completion (Temporal / Conductor)

```markdown
# feat(adapters): complete adapter implementation and parity checks

## Description

Complete adapter behavior and verify parity against contract and determinism expectations.

## Goals

- Finalize adapter behavior for supported signals and run lifecycle.
- Ensure contract conformance under deterministic test scenarios.
- Add adapter-focused integration tests.

## Acceptance Criteria

- [ ] Adapter implementation passes contract-focused tests.
- [ ] Signal handling coverage exists for required signals.
- [ ] Determinism checks pass for baseline golden paths.

## Labels

- `adapter`
- `critical`
- `testing`
```

---

## Issue D: Golden Paths Expansion

```markdown
# test(contracts): expand golden-path fixtures and determinism checks

## Description

Expand the golden-path fixture set and strengthen deterministic hash verification.

## Goals

- Add additional representative workflow plans.
- Add fixtures and expected outcomes.
- Keep baseline hashes synchronized and reviewed.

## Acceptance Criteria

- [ ] Add new plans under `packages/@dvt/engine/test/contracts/plans/`.
- [ ] Add/refresh fixtures under `packages/@dvt/engine/test/contracts/fixtures/`.
- [ ] Validate with `pnpm validate:contracts` and `pnpm golden:validate`.
- [ ] Update `.golden/hashes.json` only with intentional baseline changes.

## Labels

- `testing`
- `contracts`
- `golden-paths`
```

---

## Recommended Execution Order

1. Runtime validation boundaries
2. Adapter completion and parity
3. Golden-path expansion
4. Schema/API documentation generation

---

**Last updated**: 2026-02-13
