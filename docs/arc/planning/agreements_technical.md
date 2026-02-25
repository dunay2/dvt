# DVT+ — Conversation Agreements (Technical)

Date: 2026-02-25

This document summarizes the **agreements reached in this conversation** about the Divination (Oracle) subsystem and the decision to build on **OpenLineage/Marquez**.

---

## 1) Product rule: the Oracle must never go silent

- The UI must **always** show an estimate, even with zero historical runs.
- The Oracle must always expose **provenance**:
  - `source` (what produced the estimate)
  - `confidence`
  - human-readable `explain[]` and `caveats[]`

Rationale: avoiding the cold-start trap: _no history → silence → empty UI → user frustration → product death_.

---

## 2) Oracle sources (hybrid strategy)

The Oracle combines multiple sources, chosen deterministically:

- **Portent**: tenant-local execution history (highest confidence when enough runs exist)
- **Eco**: anonymized cross-tenant aggregates (only with privacy guardrails)
- **Structural**: plan/graph priors derived from stored plans (even if never executed)
- **Augury**: heuristics from node kind + structural complexity
- **Simulation**: Monte Carlo / theoretical distributions (last resort)

The Oracle must label the source in the response and never misrepresent an estimate as “measured”.

---

## 3) Deterministic source selection & blending

- Source selection and blending rules must be **deterministic**: same inputs → same output.
- Blending must be constrained to avoid weaker signals overwriting stronger signals.
- The Oracle contract is **generic** (not dbt-coupled), based on a minimal node descriptor (kind + structural features).

---

## 4) Cross-tenant Eco (privacy constraints)

If Eco (cross-tenant learning) is enabled:

- Must enforce **k-anonymity** thresholds (do not return results for small buckets).
- Must use **bucketing** (engine/warehouse class, size class, etc.) to avoid correlation leakage.
- Only return **aggregates** (percentiles / moments), never raw per-tenant histories.

---

## 5) “Learning” approach

- “Learning” is driven by **execution observations**, not by table row counts.
- Learning must be operable:
  - versioned contracts
  - reproducible datasets/training artifacts (if ML is introduced)
  - rollback capability
- If ML is introduced, prefer **quantile prediction** for p10/p50/p90 and keep strong governance.

---

## 6) Build on Open Source — Path B selected

We selected:

- **B**: OpenLineage/Marquez + your Oracle (no dbt UI coupling)

Meaning:

- **OpenLineage** provides a standard event/lineage format (jobs, datasets, runs, facets).
- **Marquez** provides a reference backend/UI for lineage and run inspection.
- DVT+ retains IP and control over:
  - planner determinism and plan integrity
  - execution semantics (engine)
  - oracle estimation & confidence semantics
  - multi-tenant governance and privacy rules

References:

- OpenLineage: https://openlineage.io/
- OpenLineage facets spec: https://openlineage.io/docs/spec/facets/
- Marquez: https://github.com/MarquezProject/marquez

---

## 7) Module impact (KEEP vs ADAPT) based on your packages tree

### KEEP (core, not replaced by Marquez)

- `@dvt/planner`
- `@dvt/plan-verifier`
- `@dvt/plan-interpreter`
- `@dvt/engine`
- `@dvt/state-store`
- `@dvt/contracts`
- `@dvt/canonical`

### ADAPT (no removal; add adapters)

- `@dvt/adapter-temporal`: keep; emit OpenLineage from runs
- `@dvt/adapter-postgres`: keep; add oracle learning-store tables if needed
- `@dvt/divination`: keep; consume observations from OpenLineage and/or internal store
- `@dvt/cli`: extend with dev/test commands for emitting events and validating pipeline
- `frontend`: keep; avoid duplicating lineage viewer—link/bridge to Marquez, focus UI on plan/oracle/run control

---

## 8) `traceability-service` is governance, not lineage (confirmed)

Based on the code you provided (`validateAndPublish` scanning trace headers, ADR catalog validation, reverse coverage, deterministic manifest building, and graph publication):

- This module enforces **normative traceability** in CI.
- It does **not** overlap with OpenLineage/Marquez lineage.

Agreement: keep it as a core governance module.

---

## 9) Next artifacts to add (agreed direction)

- Define a **DVT OpenLineage Profile v1** (required facets, naming, versioning) under `@dvt/contracts`.
- Implement adapters:
  - `@dvt/adapter-openlineage` (emitter)
  - `@dvt/adapter-marquez` (publisher/client)
- Add an ADR documenting the **Dual Graph Strategy**:
  - governance graph (files/modules↔ADRs) vs operational lineage graph (jobs/datasets/runs)
  - link via stable IDs (namespace/name/profile version), avoid premature store unification.

---
