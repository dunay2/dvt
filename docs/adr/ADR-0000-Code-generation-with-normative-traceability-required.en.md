---
title: ADR-0000 Code Generation with Enforced Normative Traceability (Automated)
Status: Accepted
Date: 2026-02-14
Owners: Core Architecture / Engine / Adapters / AI Tooling
last_reviewed: 2026-08-28
---

# ADR-0000: Code Generation with Enforced Normative Traceability (Automated)

## 1. Context

DVT uses architecture decisions as enforceable engineering constraints, not as passive historical prose. The repository therefore needs deterministic, repository-local traceability between accepted ADRs and the governed implementation artifacts that realize them.

The mechanism must remain useful during refactoring, be machine-verifiable in CI, and avoid creating a second architecture database that can drift from source control.

## 2. Scope

Traceability applies only to governed architectural surfaces declared in `traceability.config.json`.

Typical governed surfaces include:

- contracts and public schemas;
- planner and engine code;
- provider adapters;
- security-sensitive application boundaries;
- selected API and web architectural boundaries;
- traceability tooling itself.

Pure presentation code, styling, generated output, and other non-architectural implementation details are not governed unless explicitly added to the configuration.

The configuration, not a hard-coded directory list in this ADR, owns the exact current scope.

## 3. Principles

1. **Source control is authoritative.** Traceability is derived from repository code, accepted ADRs, tests, and configuration.
2. **Policy is explicit.** Governed paths and validation requirements live in versioned configuration.
3. **Automation must be deterministic.** Re-running validation over the same repository state must produce the same result.
4. **No duplicate architecture authority.** External graph infrastructure must not become a second source of truth.
5. **Migration debt may be baselined explicitly.** A tracked issue baseline may temporarily suppress known legacy violations; new violations must not expand that baseline silently.

## 4. Decision

### 4.1 Governed in-code traceability headers

A governed non-test artifact must carry a machine-parseable traceability header compatible with the active scanner and validator. The current form is:

```typescript
/**
 * @file packages/@dvt/example/src/example.ts
 * @baseline ADR-0000: Code Generation with Enforced Normative Traceability (Automated)
 * @decision Section 4.1 — Describe the implemented decision
 * @consequence Describe the system guarantee when useful
 * @version 1.0.0
 * @date 2026-08-28
 */
```

Current enforcement is configuration-driven:

- at least one `@baseline` is required;
- referenced ADRs must exist and have `Status: Accepted`;
- non-test governed artifacts require at least one `@decision` when `requireDecision` is enabled;
- non-test governed artifacts require `@version` when `failOnMissingVersion` is enabled;
- `@consequence` remains supported but is not globally mandatory unless configuration makes it so.

Multiple `@baseline` and `@decision` entries are allowed when the implementation genuinely realizes more than one decision.

### 4.2 Test-level traceability

Tests may carry `@baseline` / `@verifies` metadata to make verification intent explicit. Tests are evidence, but the current validator intentionally does not force non-test metadata such as `@decision` or `@version` onto test files.

Contract, integration, determinism, replay, and boundary tests should reference the decisions they prove when that relationship is architecturally meaningful.

### 4.3 Deterministic manifest generation

The traceability service scans governed files and produces a machine-readable manifest from the observed headers and ADR catalog.

The manifest records repository-local relationships such as:

- component / version / repository SHA;
- accepted ADR baselines;
- implementing files;
- decision references captured from headers.

The manifest is generated, never hand-maintained.

### 4.4 Reverse ADR coverage

For the governed scan, the validator checks accepted ADR coverage and reports an accepted ADR with no implementing trace as a reverse-coverage failure.

Repository-wide migration is handled through the explicit regression baseline in `traceability.issue-baseline.json`; it is not a reason to weaken validation for newly governed work.

### 4.5 Repository-local canonical automation output

The deterministic manifest is the canonical machine-readable output of ADR-0000 automation.

ADR-0000 does **not** require Neo4j, Cypher snapshots, or publication to any external graph database. ADR-0002 explicitly retired that approach. Consumers may derive views, Mermaid diagrams, reports, or temporary graph projections from the repository-local manifest, but those projections are not architecture authority.

## 5. Current implementation

The active implementation is source-first and repository-local:

- `traceability.config.json` — governed paths and validation flags;
- `packages/@dvt/traceability-service/src/core/validator.ts` — header and reverse-coverage validation;
- `packages/@dvt/traceability-service/src/service.ts` — validate-and-build-manifest orchestration;
- `packages/@dvt/traceability-service/README.md` — supported local workflow;
- `traceability.issue-baseline.json` — explicit legacy regression baseline;
- root script `pnpm traceability:adr0` — local/CI execution entry point.

Implementation status is tracked separately in `docs/adr/adr-implementation-status.md`; this ADR defines the decision, not a duplicate status board.

## 6. Consequences

### Positive

- Architectural decisions have concrete implementation references.
- CI can detect traceability drift deterministically.
- Refactoring impact can be derived from repository-local metadata.
- No external graph service is required to understand current traceability.
- Policy evolution happens through explicit configuration rather than undocumented convention.

### Trade-offs

- Governed code carries metadata overhead.
- The repository must maintain scanner/validator compatibility with the header contract.
- Reverse coverage requires disciplined ADR lifecycle management.
- Legacy debt needs an explicit, shrinking baseline until remediation is complete.

## 7. Acceptance criteria

ADR-0000 is operational when:

- governed files are scanned according to `traceability.config.json`;
- header validation is deterministic;
- referenced ADR existence/status is validated;
- reverse coverage is checked for accepted ADRs within the governed scan;
- the traceability manifest is generated deterministically;
- CI/local commands fail on non-baselined new violations;
- no external graph database is required for correctness.

## 8. Superseded historical material

Earlier revisions of this ADR required a Neo4j architecture graph and contained duplicated draft/final sections. Those requirements are retired by ADR-0002 and must not be treated as active acceptance criteria.

Historical reasoning remains available through Git history; the active ADR intentionally contains only the current normative decision.

## References

- DVT traceability service: `packages/@dvt/traceability-service/`
- ADR-0002 — Neo4j as Central Knowledge Graph Repository (Superseded): `docs/adr/ADR-0002-neo4j-knowledge-graph-context-repository.md`
- C4 Model: https://c4model.com/
- Technical Debt: https://martinfowler.com/bliki/TechnicalDebt.html
