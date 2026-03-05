---
title: Guide — Determinism & Replay (Planner/Engine)
status: Guide
tags: [determinism, replay, golden-vectors, idempotency]
---

# Determinism & Replay (Planner/Engine)

DVT+ is not a typical CRUD system. Determinism and replay-safety are **product requirements**.

Use this guide when changes affect:

- planner inputs/outputs (ExecutionPlan, planId hashing)
- engine execution semantics
- event emission, projection, dedup/idempotency

## 1) Determinism baseline

**Planner determinism**

- Same `PlannerInputEnvelope` → same `ExecutionPlan` → same `planId`
- Plan hashing must be based on a canonical representation (e.g., JCS canonical JSON).

**Engine determinism**

- Given the same plan and the same event stream, projected state must converge to the same snapshot.

## 2) Golden vectors (required for ARC-2/3 touching planner/engine)

Store fixtures under:

- `tests/golden/planner/*` (input envelope + expected plan core + expected planId)
- `tests/golden/engine/*` (event stream + expected run state)

## 3) Replay tests

A replay test should:

1. Run a scenario producing an event stream
2. Re-run projection from scratch using only the stream
3. Assert identical state (or identical authoritative fields and stable derived fields)

## 4) Idempotency vectors

If you rely on idempotency keys:

- include duplicates in fixtures
- assert dedup behavior and stable outcomes

## 5) ED requirements (when applicable)

In ED:

- cite golden vector paths
- describe determinism impact in 1–2 bullets
- note any canonicalization/hashing changes

References:

- JSON Canonicalization Scheme (JCS): https://www.rfc-editor.org/rfc/rfc8785
