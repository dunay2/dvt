ADR-0000
Code Generation with Enforced Normative Traceability (Automated)

Status: Accepted
Date: 2026-02-14
Updated: 2026-02-21
Owners: Core Architecture / Engine / Adapters / AI Tooling

1. Context

Architectural drift is inevitable unless decisions are:

Explicit

Traceable

Machine-verifiable

Continuously validated

Traditional ADRs document intent but do not enforce implementation conformance.

This leads to:

Orphaned code

Silent violations

Undetected architectural erosion

Compliance ambiguity

Refactoring fragility

For a layered, contract-driven system like DVT+, architectural integrity must be programmatically enforced.

References:

C4 Model: https://c4model.com/

Architectural erosion: https://www.oreilly.com/library/view/software-architecture-in/9781492086888/

Technical Debt: https://martinfowler.com/bliki/TechnicalDebt.html

2. Problem Statement

We require a mechanism that:

Binds implementation artifacts to accepted ADRs.

Survives refactoring and file movement.

Is machine-verifiable in CI.

Supports impact analysis.

Generates an architecture dependency graph.

Detects both:

Code without ADR

ADR without implementation

This system must not rely on manual discipline alone.

3. Scope (Important Constraint)

This requirement applies to:

Core modules

Planner

Engine

Contracts

Adapters

Security modules

Public API

Persistent models

Generated schemas

It does NOT apply to:

Pure UI presentational components

Styling

Internal utilities without architectural meaning

Tests unrelated to architectural decisions

This prevents traceability noise.

4. Decision
   4.1 Mandatory In-Code Traceability Header

Every governed artifact MUST begin with:

/\*\*

- @file packages/contracts/src/idempotency/key-builder.ts
- @baseline ADR-0010: Run Event Envelope Split
- @decision Section 3.3 — Idempotency derivation rules
- @decision Section 3.4 — Canonical serialization
- @consequence Engine retries do not alter idempotency key
- @version 1.0.0
- @date 2026-02-21
  \*/

Rules:

Multiple @baseline allowed

@decision must reference section numbers

@consequence must describe system guarantee

Version must align with contract version (if applicable)

Headers must be machine-parseable.

4.2 Test-Level Traceability

Contract and integration tests MUST include:

/\*\*

- @baseline ADR-0010
- @verifies Section 3.3
- @verifies Section 3.4
  \*/

This ensures:

Tests prove decisions

Architectural change impact is detectable

4.3 Manifest Generation (Machine-Readable)

Each module MUST generate:

{
"component": "@dvt/contracts",
"version": "1.0.0",
"generated": "2026-02-21",
"baseline_adrs": [
{
"number": "ADR-0010",
"title": "Run Event Envelope Split",
"decisions": ["Section 3.3", "Section 3.4"],
"implemented_by": [
"src/idempotency/key-builder.ts"
]
}
]
}

This manifest is generated automatically (not handwritten).

4.4 Reverse Enforcement (New)

CI MUST fail if:

An ADR in docs/adr/ with Status: Accepted
has zero implementation references in manifests.

This prevents “dead architecture”.

4.5 Architecture Graph Generation (New)

The system MUST produce:

ADR → File mapping

File → ADR mapping

ADR → ADR dependency graph (if declared)

Module-level traceability graph

Output formats:

JSON (for tooling)

Graph DB ingestion

Mermaid export (for docs)

The system MUST publish the traceability graph to Neo4j.

The graph MUST be idempotent (re-running ingestion produces the same graph state).

Nodes MUST include stable keys:

ADR.number

File.path

Module.name

Relationships MUST be deterministic and upserted, not appended.

# ADR-0000: Code Generation with Enforced Normative Traceability (Automated)

**Status:** Accepted\
**Date:** 2026-02-14\
**Updated:** 2026-02-21\
**Owners:** Core Architecture / Engine / Adapters / AI Tooling

---

## 1. Context

Architectural drift is inevitable unless decisions are:

- Explicit\
- Traceable\
- Machine-verifiable\
- Continuously validated

Traditional ADRs document intent but do not enforce implementation
conformance.

This leads to:

- Orphaned code\
- Silent violations\
- Undetected architectural erosion\
- Compliance ambiguity\
- Refactoring fragility

For a layered, contract-driven system like DVT+, architectural integrity
must be programmatically enforced.

### References

- C4 Model: https://c4model.com/\
- Architectural erosion:
  https://www.oreilly.com/library/view/software-architecture-in/9781492086888/\
- Technical Debt: https://martinfowler.com/bliki/TechnicalDebt.html

---

## 2. Problem Statement

We require a mechanism that:

1. Binds implementation artifacts to accepted ADRs.\
1. Survives refactoring and file movement.\
1. Is machine-verifiable in CI.\
1. Supports impact analysis.\
1. Generates an architecture dependency graph.\
1. Detects both:
  - Code without ADR
  - ADR without implementation

This system must not rely on manual discipline alone.

---

## 3. Scope

Applies to:

- Core modules
- Planner
- Engine
- Contracts
- Adapters
- Security modules
- Public API
- Persistent models
- Generated schemas

Does NOT apply to:

- Pure UI presentational components
- Styling
- Internal utilities without architectural meaning
- Tests unrelated to architectural decisions

This prevents traceability noise.

---

## 4. Decision

### 4.1 Mandatory In-Code Traceability Header

Every governed artifact MUST begin with:

```typescript
/**
 * @file packages/contracts/src/idempotency/key-builder.ts
 * @baseline ADR-0010: Run Event Envelope Split
 * @decision Section 3.3 — Idempotency derivation rules
 * @decision Section 3.4 — Canonical serialization
 * @consequence Engine retries do not alter idempotency key
 * @version 1.0.0
 * @date 2026-02-21
 */
```

Rules:

- Multiple `@baseline` allowed
- `@decision` must reference section numbers
- `@consequence` must describe system guarantee
- Version must align with contract version
- Headers must be machine-parseable

---

### 4.2 Test-Level Traceability

```typescript
/**
 * @baseline ADR-0010
 * @verifies Section 3.3
 * @verifies Section 3.4
 */
```

Tests serve as verifiable evidence of architectural decisions.

---

### 4.3 Manifest Generation

Each module MUST generate a machine-readable manifest:

```json
{
  "component": "@dvt/contracts",
  "version": "1.0.0",
  "generated": "2026-02-21",
  "baseline_adrs": [
    {
      "number": "ADR-0010",
      "title": "Run Event Envelope Split",
      "decisions": ["Section 3.3", "Section 3.4"],
      "implemented_by": ["src/idempotency/key-builder.ts"]
    }
  ]
}
```

---

### 4.4 Reverse Enforcement

CI MUST fail if any `Accepted` ADR has zero implementation references.

---

### 4.5 Architecture Graph Publication (Neo4j)

The system MUST publish traceability data to Neo4j.

Stable keys:

- ADR.number\
- File.path\
- Module.name

Relationships must be idempotent (MERGE, not CREATE).

Example:

```cypher
MERGE (a:ADR {number:"ADR-0010"})
MERGE (f:File {path:"packages/contracts/src/idempotency/key-builder.ts"})
MERGE (f)-[:BASELINED_ON]->(a)
```

---

## 5. Automation Requirements

Traceability without automation is ritual.

Required components:

- Header validation script
- Manifest generator
- Reverse ADR coverage validation
- CI enforcement
- Neo4j graph ingestion

---

## 6. Acceptance Criteria

ADR-0000 is complete when:

- Header validation exists
- Manifest generator exists
- Reverse ADR coverage validation exists
- CI blocks non-compliant PRs
- Neo4j graph contains `(:ADR)<-[:BASELINED_ON]-(:File)`
- Graph export works

Only then is traceability real.

Add a new “done when” item in Acceptance Criteria:

Neo4j contains (:ADR)-[:IMPLEMENTED_BY]-(:File) and (:Module)-[:CONTAINS]->(:File) for all governed files.

5. Automation (Mandatory)

Traceability without automation is ritual.

We introduce automated enforcement.

6. Automation Strategy
   6.1 Header Validation

Use:

ESLint custom rule (AST-based)

OR simple Node script (faster to implement initially)

Recommended:

Custom ESLint rule:

Detect presence of @baseline ADR-

Parse metadata

Validate format

Validate section references (optional enhancement)

Alternative initial script:

node tools/traceability/validate-headers.js

Checks:

Files under governed directories contain header

Header matches regex

ADR file exists

ADR has Status: Accepted

6.2 ADR Existence + Status Validation

Script:

Parse docs/adr/\*.md

Extract:

ADR number

Status

Build map of Accepted ADRs

Fail if:

Referenced ADR missing

ADR not Accepted

6.3 Manifest Generator

New tool:

node tools/traceability/generate-manifest.js

It:

Scans governed files

Extracts header metadata

Builds manifest JSON

Writes to:

dist/traceability-manifest.json

or /architecture/manifest.json

6.4 Reverse ADR Coverage Validator

Script:

node tools/traceability/validate-adr-coverage.js

It:

Loads Accepted ADR list

Loads manifest(s)

Verifies:

Each ADR has ≥1 implementing file

Fail if orphaned ADR.

6.5 CI Integration (GitHub Actions Example)
name: ADR Governance

on: [pull_request]


```yaml
jobs:
  governance:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - run: node tools/traceability/validate-headers.js
      - run: node tools/traceability/generate-manifest.js
      - run: node tools/traceability/validate-adr-coverage.js
```

7. Architecture Graph Generator

Now we formalize it.

7.1 Inputs

Parsed ADR documents

Parsed headers

Generated manifest

7.2 Graph Model

Nodes:

ADR

File

Module

Contract

Capability (optional future)

Plugin (optional)

Edges:

IMPLEMENTS (File → ADR)

BASELINE_OF (ADR → File)

VERIFIES (Test → ADR Section)

DEPENDS_ON (ADR → ADR)

BELONGS_TO (File → Module)

7.3 Graph Output Formats
A) JSON

For tooling.

B) Mermaid Export
C) Graph DB Ingestion

Since you already have a project tracking graph DB:

We store:

Node label: ADR

Node label: File

Edge: IMPLEMENTS

Edge: VERIFIES

This allows:

Impact radius queries

Refactoring safety checks

Architecture evolution visualization

Risk heat maps

Example Cypher (Neo4j-style):

MERGE (a:ADR {number:"ADR-0010"})
MERGE (f:File {path:"packages/contracts/src/idempotency/key-builder.ts"})
MERGE (f)-[:IMPLEMENTS]->(a) 8. Advanced Optional (Phase 2)
8.1 Impact Query Example

If ADR-0010 changes:

Query:

MATCH (a:ADR {number:"ADR-0010"})<-[:IMPLEMENTS]-(f)
RETURN f

You instantly get blast radius.

9. Consequences

Positive:

Zero silent drift

Machine-auditable architecture

Graph-driven impact analysis

Enforced boundaries

Architectural memory

Negative:

Requires tooling discipline

Slight onboarding friction

Requires AST parsing or regex reliability

Mitigations:

Auto header templates

CLI helpers

IDE snippets

Autofix ESLint rule

10. Acceptance Criteria

ADR-0000 is complete when:

Header validation script exists

Manifest generator exists

Reverse ADR coverage check exists

CI enforces governance

Graph export works

Graph DB ingestion works

Only then is traceability real.
