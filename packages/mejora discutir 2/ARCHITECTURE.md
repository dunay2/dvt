# DVT+ NEXT — COMPLETE ARCHITECTURE SPECIFICATION (v2.0)

**Status:** Authoritative Replacement Document  
**Date:** 2026-02-23  
**Scope:** This document replaces all previous versions (v1.0, v1.1, addenda, critiques).  
**Retro-compatibility:** NONE (Hard reset, new product).

---

# 1. EXECUTIVE SUMMARY

DVT+ Next is a deterministic, engine-agnostic workflow orchestration platform with strict separation between:

- Planner → Defines WHAT will happen.
- Engine Adapter → Executes HOW it happens.
- Append Store → Authoritative state & attempt control.
- Canonical Event Model → Observability abstraction.
- DSL (v1) → Minimal deterministic gateway language.

This document defines:

- All architectural decisions (ADR included)
- All constraints (MUST / MUST NOT)
- Governance model
- DSL definition
- Canonicalization strategy
- Attempt allocation model
- Debugging model
- Performance considerations
- Execution roadmap
- Full folder tree
- Classes & Interfaces (TypeScript)
- Tests
- Scripts
- CI enforcement
- AI bootstrap prompt

This document is self-contained and normative.

---

# 2. CORE PRINCIPLES

1. Determinism is mandatory.
2. Planner owns semantics.
3. Engine adapters are execution-only.
4. Append Store is authority for attempts.
5. Canonical JSON via RFC 8785 (JCS).
6. DSL v1 is minimal and versioned.
7. Dual storage (canonical + raw opt-in).
8. No backward compatibility guaranteed.
9. CI enforcement is multi-layered.
10. Governance is explicit.

---

# 3. ADR SECTION

## ADR-001: Planner Sovereignty

Planner MUST:

- Validate input
- Validate DSL version
- Produce ExecutionPlan
- Canonicalize input
- Hash input

Engine MUST NOT:

- Compute dependencies
- Perform topological sort
- Evaluate DSL logic

---

## ADR-002: Canonicalization Standard

Standard: RFC 8785 (JCS)

Library: json-canonicalize@1.0.0 (version pinned)

Rules:

- No undefined values allowed
- Dates MUST be ISO 8601 UTC strings
- Arrays are ordered unless explicitly declared as set
- Sets sorted lexicographically before JCS

---

## ADR-003: Attempt Allocation

Append Store SHALL be sole authority for attemptNumber.

Mechanism:

- Row-level locking
- Transactional increment
- attemptId = SHA256(runId:stepId:attemptNumber)

---

## ADR-004: DSL Governance

DSL v1 supports only:

Expression grammar:
condition := identifier '=' literal

Examples:
status = 'success'
retries = 0

No AND/OR in v1.
No functions.
No IO.

---

## ADR-005: Dual Storage

Canonical events stored always.
Raw engine events optional (per tenant/workflow).

Retention default:

- Raw: 7 days
- Canonical: permanent

---

# 4. ARCHITECTURE DIAGRAM (Conceptual)

Planner -> ExecutionPlan -> Engine Adapter  
Engine -> Canonical Event -> Append Store  
Engine -> Raw Event (optional)  
Append Store -> State Store

---

# 5. PROJECT STRUCTURE

```
dvt-next/
│
├── packages/
│   ├── planner/
│   ├── engine-adapter-temporal/
│   ├── engine-adapter-conductor/
│   ├── append-store/
│   ├── contracts/
│   ├── dsl/
│   ├── canonical/
│   └── cli/
│
├── tests/
│   ├── determinism.test.ts
│   ├── attempt.test.ts
│   ├── dsl.test.ts
│   ├── canonical.test.ts
│
├── scripts/
│   ├── build.sh
│   ├── test.sh
│   ├── lint.sh
│
└── README.md
```

---

# 6. CORE TYPESCRIPT CONTRACTS

## ExecutionPlan

```ts
export interface ExecutionPlan {
  runId: string;
  steps: PlanStep[];
  metadata: {
    schemaVersion: string;
    inputHash: string;
  };
}

export interface PlanStep {
  stepId: string;
  dependsOn: string[];
  gateway?: GatewayExpressionV1;
}
```

---

## Gateway DSL v1

```ts
export interface GatewayExpressionV1 {
  left: string;
  operator: '=';
  right: string | number;
}
```

---

## Append Store Interface

```ts
export interface AttemptStore {
  nextAttempt(runId: string, stepId: string): Promise<number>;
}
```

---

## Canonical Event

```ts
export interface CanonicalEvent {
  runId: string;
  stepId: string;
  attemptId: string;
  status: 'started' | 'completed' | 'failed';
  timestamp: string;
  metadata?: Record<string, unknown>;
}
```

---

# 7. TESTS

## Determinism Test

```ts
test('planner produces same hash', () => {
  const plan1 = planner.plan(input);
  const plan2 = planner.plan(input);
  expect(plan1.metadata.inputHash).toBe(plan2.metadata.inputHash);
});
```

## Attempt Allocation Test

```ts
test('concurrent attempts increment correctly', async () => {
  const a1 = await store.nextAttempt('r1', 's1');
  const a2 = await store.nextAttempt('r1', 's1');
  expect(a2).toBe(a1 + 1);
});
```

---

# 8. CI ENFORCEMENT

Layer 1: no-restricted-imports  
Layer 2: AST rule for dependency resolution  
Layer 3: Runtime execution tests  
Layer 4: Mandatory review checklist

---

# 9. DEBUGGING STRATEGY

Trace context:
runId + stepId + attemptId

Planner debug mode:
--debug outputs canonical input + plan

Correlation tool:
CLI command:
dvt-debug --runId=<id>

---

# 10. PERFORMANCE STRATEGY

Metrics to measure:

- Canonicalization time
- Lock contention on attempt table
- Raw storage growth

Post-MVP benchmarking mandatory.

---

# 11. EXECUTION ROADMAP

Month 1–2:

- Planner basic
- Temporal adapter
- JCS adoption
- Determinism tests

Month 3–4:

- DSL v1
- Attempt store
- Canonical events

Month 5–6:

- Conductor adapter
- Dual storage
- Debugging CLI

---

# 12. DRAWBACKS

- Row-level locking may reduce throughput
- DSL v1 intentionally limited
- No backward compatibility
- Raw storage increases cost

Trade-off: Determinism > Flexibility

---

# 13. AI BOOTSTRAP PROMPT

Use the following prompt to initialize implementation:

```
You are implementing DVT+ Next strictly following the specification in DVT+ NEXT — COMPLETE ARCHITECTURE SPECIFICATION (v2.0).
You MUST:
- Enforce planner sovereignty
- Use RFC 8785 canonicalization
- Implement DSL v1 exactly as defined
- Use append-store transactional attempt allocation
- Implement determinism tests
- Generate TypeScript strict mode code
- Avoid any undocumented feature

Start by scaffolding the folder structure and implementing contracts.
```

---

# 14. FINAL DECLARATION

This document supersedes all prior design documents.

It is exhaustive, authoritative, and normative.

Implementation may begin immediately.
