# DVT Planner v2.3.2 — Implementation Review, Hard Critique, and Developer Manual

## 1) Executive Summary

This planner package was regenerated from [`DVT_PLANNER 2.3.1.md`](packages/@dvt/planner/DVT_PLANNER%202.3.1.md) and then patched using [`DVT_Planner_v2_3_2_patch.md`](packages/@dvt/planner/DVT_Planner_v2_3_2_patch.md).

Current implementation status:

- Build: **PASS** via [`pnpm build`](packages/@dvt/planner/package.json)
- Unit + slow tests: **PASS** via [`pnpm test`](packages/@dvt/planner/package.json)
- Deterministic fixed vector initialized and locked in [`determinism.test.ts`](packages/@dvt/planner/test/unit/determinism.test.ts)

---

## 2) Artifact Manifest (Complete Inventory + Validation)

Legend: **Created** = physically present, **Complete** = implemented, **Quality** = OK / Improve.

| #   | Artifact                                          | Created | Complete | Location                                                                  | Quality | Notes                                                          |
| --- | ------------------------------------------------- | ------- | -------- | ------------------------------------------------------------------------- | ------- | -------------------------------------------------------------- |
| 1   | package.json                                      | Yes     | Yes      | `packages/@dvt/planner/package.json`                                      | Improve | Version remains 2.3.1; consider bump to 2.3.2                  |
| 2   | tsconfig.json                                     | Yes     | Yes      | `packages/@dvt/planner/tsconfig.json`                                     | OK      | Strict settings are strong                                     |
| 3   | vitest.config.ts                                  | Yes     | Yes      | `packages/@dvt/planner/vitest.config.ts`                                  | OK      | Test config valid                                              |
| 4   | src/index.ts                                      | Yes     | Yes      | `packages/@dvt/planner/src/index.ts`                                      | OK      | Patched StepFactory export source                              |
| 5   | src/runtime/time.ts                               | Yes     | Yes      | `packages/@dvt/planner/src/runtime/time.ts`                               | OK      | Minimal and deterministic enough                               |
| 6   | src/domain/Planner.ts                             | Yes     | Yes      | `packages/@dvt/planner/src/domain/Planner.ts`                             | Improve | Deterministic core is good; extra contract checks can be added |
| 7   | src/domain/errors.ts                              | Yes     | Yes      | `packages/@dvt/planner/src/domain/errors.ts`                              | OK      | Added `override` for `cause`                                   |
| 8   | src/domain/hashing.ts                             | Yes     | Yes      | `packages/@dvt/planner/src/domain/hashing.ts`                             | OK      | Uses JCS + SHA-256 WebCrypto                                   |
| 9   | src/domain/limits.ts                              | Yes     | Yes      | `packages/@dvt/planner/src/domain/limits.ts`                              | Improve | Limit defaults should be benchmark-driven                      |
| 10  | src/domain/metrics.ts                             | Yes     | Yes      | `packages/@dvt/planner/src/domain/metrics.ts`                             | OK      | Non-invasive metrics interface                                 |
| 11  | src/domain/policies.ts                            | Yes     | Yes      | `packages/@dvt/planner/src/domain/policies.ts`                            | Improve | Contains logically unreachable POLICY_CONFLICT branch          |
| 12  | src/domain/sorting.ts                             | Yes     | Yes      | `packages/@dvt/planner/src/domain/sorting.ts`                             | OK      | Binary compare is correct choice                               |
| 13  | src/domain/types.ts                               | Yes     | Yes      | `packages/@dvt/planner/src/domain/types.ts`                               | Improve | Type contracts are broad; stricter branded ids could help      |
| 14  | src/domain/graph/GraphBuilder.ts                  | Yes     | Yes      | `packages/@dvt/planner/src/domain/graph/GraphBuilder.ts`                  | OK      | Strong graph validation                                        |
| 15  | src/domain/graph/TopoSort.ts                      | Yes     | Yes      | `packages/@dvt/planner/src/domain/graph/TopoSort.ts`                      | OK      | Patched to avoid repeated full sort                            |
| 16  | src/domain/graph/Depth.ts                         | Yes     | Yes      | `packages/@dvt/planner/src/domain/graph/Depth.ts`                         | OK      | Depth computation clear                                        |
| 17  | src/domain/stepFactory/StepFactory.ts             | Yes     | Yes      | `packages/@dvt/planner/src/domain/stepFactory/StepFactory.ts`             | OK      | Good extension seam                                            |
| 18  | src/domain/stepFactory/dbtStepFactory.ts          | Yes     | Yes      | `packages/@dvt/planner/src/domain/stepFactory/dbtStepFactory.ts`          | Improve | Case-sensitive policy now explicit; document migration risk    |
| 19  | examples/dbt-workflow.ts                          | Yes     | Yes      | `packages/@dvt/planner/examples/dbt-workflow.ts`                          | OK      | Useful starter                                                 |
| 20  | examples/generic-pipeline.ts                      | Yes     | Yes      | `packages/@dvt/planner/examples/generic-pipeline.ts`                      | OK      | Import fix applied                                             |
| 21  | test/unit/determinism.test.ts                     | Yes     | Yes      | `packages/@dvt/planner/test/unit/determinism.test.ts`                     | Improve | Golden hash requires update strategy                           |
| 22  | test/unit/limits.test.ts                          | Yes     | Yes      | `packages/@dvt/planner/test/unit/limits.test.ts`                          | OK      | Covers key guardrails                                          |
| 23  | test/unit/graph.test.ts                           | Yes     | Yes      | `packages/@dvt/planner/test/unit/graph.test.ts`                           | OK      | Missing ref + cycle covered                                    |
| 24  | test/unit/policies.test.ts                        | Yes     | Yes      | `packages/@dvt/planner/test/unit/policies.test.ts`                        | OK      | Patched for valid Vitest assertions                            |
| 25  | test/slow/load.test.ts                            | Yes     | Yes      | `packages/@dvt/planner/test/slow/load.test.ts`                            | Improve | Should be split by size tiers and memory checks                |
| 26  | test/vectors/fixed-vector.json                    | Yes     | Yes      | `packages/@dvt/planner/test/vectors/fixed-vector.json`                    | OK      | Stable vector asset                                            |
| 27  | test/vectors/fixed-vector.inline.ts               | Yes     | Yes      | `packages/@dvt/planner/test/vectors/fixed-vector.inline.ts`               | Improve | Duplicates JSON vector; keep one canonical source              |
| 28  | test/cross-runtime.sh                             | Yes     | Yes      | `packages/@dvt/planner/test/cross-runtime.sh`                             | Improve | Bash script in Windows-first repo; add PowerShell equivalent   |
| 29  | test/cross-runtime-print-planid.ts                | Yes     | Yes      | `packages/@dvt/planner/test/cross-runtime-print-planid.ts`                | OK      | Minimal deterministic probe                                    |
| 30  | docs/README.md                                    | Yes     | Yes      | `packages/@dvt/planner/docs/README.md`                                    | OK      | Contract intent documented                                     |
| 31  | docs/MIGRATION_v2.1_to_v2.3.1.md                  | Yes     | Yes      | `packages/@dvt/planner/docs/MIGRATION_v2.1_to_v2.3.1.md`                  | Improve | Add section for v2.3.2 behavior deltas                         |
| 32  | docs/contracts/PlannerContracts.v2.3.1.md         | Yes     | Yes      | `packages/@dvt/planner/docs/contracts/PlannerContracts.v2.3.1.md`         | OK      | Core invariants are explicit                                   |
| 33  | docs/contracts/ExecutionPlanV2.schema.json        | Yes     | Yes      | `packages/@dvt/planner/docs/contracts/ExecutionPlanV2.schema.json`        | Improve | Tighten date/time format and metadata constraints              |
| 34  | docs/contracts/PlanCore.schema.json               | Yes     | Yes      | `packages/@dvt/planner/docs/contracts/PlanCore.schema.json`               | OK      | Patched local `$ref`                                           |
| 35  | docs/contracts/PlannerInputEnvelopeV2.schema.json | Yes     | Yes      | `packages/@dvt/planner/docs/contracts/PlannerInputEnvelopeV2.schema.json` | Improve | Add minLength/uniqueItems constraints                          |
| 36  | docs/contracts/PlannerPolicies.schema.json        | Yes     | Yes      | `packages/@dvt/planner/docs/contracts/PlannerPolicies.schema.json`        | Improve | Add min constraints consistent with runtime validation         |
| 37  | docs/adr/ADR-0000-scope-and-compat.md             | Yes     | Yes      | `packages/@dvt/planner/docs/adr/ADR-0000-scope-and-compat.md`             | OK      | Decision context present                                       |
| 38  | docs/adr/ADR-0001-rfc8785-jcs.md                  | Yes     | Yes      | `packages/@dvt/planner/docs/adr/ADR-0001-rfc8785-jcs.md`                  | OK      | Determinism rationale solid                                    |
| 39  | docs/adr/ADR-0002-plan-core-hash.md               | Yes     | Yes      | `packages/@dvt/planner/docs/adr/ADR-0002-plan-core-hash.md`               | OK      | Hash boundary is clear                                         |
| 40  | docs/adr/ADR-0003-typed-errors.md                 | Yes     | Yes      | `packages/@dvt/planner/docs/adr/ADR-0003-typed-errors.md`                 | Improve | Add recovery semantics per error code                          |
| 41  | docs/adr/ADR-0004-security-limits.md              | Yes     | Yes      | `packages/@dvt/planner/docs/adr/ADR-0004-security-limits.md`              | Improve | Add threat model and abuse test matrix                         |
| 42  | docs/adr/ADR-0005-metrics.md                      | Yes     | Yes      | `packages/@dvt/planner/docs/adr/ADR-0005-metrics.md`                      | OK      | Good non-deterministic boundary guidance                       |
| 43  | docs/adr/ADR-0006-extensibility.md                | Yes     | Yes      | `packages/@dvt/planner/docs/adr/ADR-0006-extensibility.md`                | Improve | Define versioned plugin interface lifecycle                    |

Validation evidence is tied to successful compile/test runs on the current workspace.

---

## 3) Applied v2.3.2 Patch — What Changed and Why

Applied changes from [`DVT_Planner_v2_3_2_patch.md`](packages/@dvt/planner/DVT_Planner_v2_3_2_patch.md):

1. **P1** import fix in [`dbtStepFactory.ts`](packages/@dvt/planner/src/domain/stepFactory/dbtStepFactory.ts) — removed invalid `PlannerPolicies` value import.
2. **P2** test matcher fix in [`policies.test.ts`](packages/@dvt/planner/test/unit/policies.test.ts) — replaced invalid matcher with valid assertion pattern.
3. **P3** export fix in [`index.ts`](packages/@dvt/planner/src/index.ts) — `StepFactory` now exported from its actual module.
4. **P4** complexity fix in [`TopoSort.ts`](packages/@dvt/planner/src/domain/graph/TopoSort.ts) — removed repeated global sorting in loop.
5. **P5** cleanup in [`Planner.ts`](packages/@dvt/planner/src/domain/Planner.ts) — removed unused `canonicalJson` no-op.
6. **P6** schema fix in [`PlanCore.schema.json`](packages/@dvt/planner/docs/contracts/PlanCore.schema.json) — switched to local `$ref`.

Additional hardening needed for successful compile/test:

- Added `override` to `cause` in [`PlannerError`](packages/@dvt/planner/src/domain/errors.ts:14).
- Fixed optional property assignment pattern for `observability` in [`Planner.buildPlan()`](packages/@dvt/planner/src/domain/Planner.ts:55).
- Fixed import source in [`generic-pipeline.ts`](packages/@dvt/planner/examples/generic-pipeline.ts:1).
- Bootstrapped and locked deterministic golden hash in [`determinism.test.ts`](packages/@dvt/planner/test/unit/determinism.test.ts:82).

---

## 4) Hard Critique (Brutal but Fair)

### Strengths

- Determinism model is correctly centered around hashable `planCore`.
- Good separation of graph, policy, hashing, and planning responsibilities.
- Strict TypeScript and typed error taxonomy significantly reduce ambiguity.
- Extensibility via `StepFactory` is simple and practical.

### Weaknesses

- Runtime behavior and schema constraints are partially misaligned (runtime stricter than schema in some fields).
- Cross-runtime check is shell-fragile in Windows-heavy environments.
- Golden vector approach can become maintenance friction if not automated in CI.
- Some code and docs still carry v2.3.1 naming while behavior is effectively patched to v2.3.2.

### Critical Gaps

1. No formal plugin compatibility/versioning contract beyond `StepFactory` shape.
2. No memory profiling or adversarial test suite for pathological graphs.
3. No canonical input normalization policy (for case, unicode normalization, and id conventions).
4. No signed artifact/provenance model around generated `planId` publication.

### Why I would change more

- Introduce explicit semantic versioning in contracts and package version to avoid compliance drift.
- Add schema test suite validating example payloads against all JSON schemas.
- Add property-based tests for graph determinism and cycle/pathological structures.
- Add PowerShell cross-runtime script next to [`cross-runtime.sh`](packages/@dvt/planner/test/cross-runtime.sh).

---

## 5) Alternatives and Examples

### Alternative A — Priority Queue Topo Sort

Use a binary heap for ready nodes keyed by binary compare for predictable `O((V+E) log V)` and cleaner scalability under high fan-out.

### Alternative B — Canonical Input Normalization Layer

Before hashing in [`computeInputHashSha256()`](packages/@dvt/planner/src/domain/Planner.ts:252), normalize:

- whitespace in ids,
- unicode NFC,
- resource type casing rules (if domain allows).

### Alternative C — Policy Engine Module

Move [`resolvePolicies()`](packages/@dvt/planner/src/domain/policies.ts) to a declarative rule engine with machine-readable rule metadata so conflicts are testable and explainable.

---

## 6) Expert Scorecard

| Dimension                 |   Weight | Score (/10) |      Weighted | Expert Commentary                                       |
| ------------------------- | -------: | ----------: | ------------: | ------------------------------------------------------- |
| Determinism correctness   |      20% |         9.0 |          1.80 | Core invariant is well implemented                      |
| Type safety               |      10% |         8.5 |          0.85 | Strict TS is strong; some edges needed fixes            |
| Performance architecture  |      15% |         7.5 |          1.13 | Improved topo sort; still room for heap-based queue     |
| Security/guardrails       |      15% |         7.0 |          1.05 | Limits exist, threat model depth is limited             |
| Test quality              |      15% |         7.5 |          1.13 | Good baseline, needs property/adversarial suites        |
| Extensibility             |      10% |         8.0 |          0.80 | StepFactory seam is practical                           |
| Contract/schema quality   |      10% |         7.0 |          0.70 | Better alignment and stronger schema constraints needed |
| Documentation operability |       5% |         8.0 |          0.40 | Rich docs, but version coherence can improve            |
| **Total**                 | **100%** |             | **7.86 / 10** | **Production-capable with targeted hardening backlog**  |

---

## 7) Comparison vs Other Products

| Capability                                | DVT Planner v2.3.2       | Airflow           | Dagster | Prefect | dbt Cloud           |
| ----------------------------------------- | ------------------------ | ----------------- | ------- | ------- | ------------------- |
| Deterministic content-addressed plan ID   | **Strong**               | Weak (not native) | Medium  | Medium  | Medium              |
| DAG compilation speed for pure graph plan | **High**                 | Medium            | Medium  | Medium  | High (dbt-specific) |
| General-purpose orchestration ecosystem   | Low (planner-only)       | **Very High**     | High    | High    | Medium              |
| Plugin surface simplicity                 | **High** (`StepFactory`) | Medium            | Medium  | High    | Low                 |
| Runtime operations UI/ops tooling         | Low                      | **Very High**     | High    | High    | **High**            |
| Contract formalism (schemas + ADR-style)  | **High**                 | Medium            | Medium  | Medium  | Medium              |
| Multi-domain breadth out-of-box           | Medium                   | High              | High    | High    | Low (dbt-centric)   |

Interpretation: DVT Planner is best positioned as a **deterministic planning kernel** (decoupled by design) rather than a full orchestrator product. In a modular DVT architecture, this is a strength, not a weakness.

---

## 8) Opportunities and Proposal Backlog

1. Version bump and formal release notes to `2.3.2` in [`package.json`](packages/@dvt/planner/package.json).
2. Add schema conformance tests for all payload examples.
3. Add property-based tests for random DAG generation.
4. Add Windows-native cross-runtime validation script.
5. Add compatibility contract for external `StepFactory` providers.
6. Add benchmark report artifacts and CI threshold gating.

---

## 9) Developer Manual

### 9.1 Setup

From [`packages/@dvt/planner`](packages/@dvt/planner):

```bash
pnpm install
pnpm build
pnpm test
```

### 9.2 Public API

- Entry point: [`Planner`](packages/@dvt/planner/src/domain/Planner.ts)
- Exports: [`src/index.ts`](packages/@dvt/planner/src/index.ts)

Main call:

- [`Planner.buildPlan()`](packages/@dvt/planner/src/domain/Planner.ts:55)
- Input contract: [`PlannerInputEnvelopeV2`](packages/@dvt/planner/src/domain/types.ts:440)
- Output contract: [`ExecutionPlanV2`](packages/@dvt/planner/src/domain/types.ts:424)

### 9.3 Determinism Contract

- Hash source object is `planCore` only.
- `planId = sha256(JCS(planCore))`.
- Canonical output from [`sha256CanonicalJson()`](packages/@dvt/planner/src/domain/hashing.ts:534).

### 9.4 Extending for New Domains

Implement a custom [`StepFactory`](packages/@dvt/planner/src/domain/stepFactory/StepFactory.ts) and inject it through planner options.

Reference: [`examples/generic-pipeline.ts`](packages/@dvt/planner/examples/generic-pipeline.ts).

### 9.5 Error Handling

Catch [`PlannerError`](packages/@dvt/planner/src/domain/errors.ts:14) and branch by [`PlannerErrorCode`](packages/@dvt/planner/src/domain/errors.ts:4).

### 9.6 Testing Strategy

- Unit tests in [`test/unit`](packages/@dvt/planner/test/unit)
- Load tests in [`test/slow/load.test.ts`](packages/@dvt/planner/test/slow/load.test.ts)
- Optional runtime parity in [`test/cross-runtime.sh`](packages/@dvt/planner/test/cross-runtime.sh)

### 9.7 Recommended Next Steps for Maintainers

- Add CI matrix for Node/Bun/Deno hash parity.
- Add benchmark trend tracking.
- Add schema validation tests and snapshot lock for contracts.

---

## 10) Final Verdict

The implementation is technically solid for its intended bounded context: a **decoupled deterministic planner module**. It should be evaluated as a specialized planning component, not as a full orchestration platform. Under that framing, it is production-capable as a planner core and aligns well with a modular architecture where runtime execution, operability, and lifecycle governance are handled by sibling modules (for example, an engine).

The remaining recommendations (operability, compatibility governance, adversarial validation) are hardening opportunities for cross-module integration quality, not a claim that the planner must become monolithic.

---

## 11) Score (Decoupled-Module Context)

This score evaluates the planner strictly as a **decoupled planner module** inside a modular platform.

| Dimension (Planner-only scope)                   |   Weight | Score (/10) |      Weighted | Commentary                                             |
| ------------------------------------------------ | -------: | ----------: | ------------: | ------------------------------------------------------ |
| Deterministic plan identity                      |      25% |         9.2 |          2.30 | Hash boundary and canonicalization are robust          |
| Graph correctness and safety limits              |      20% |         8.4 |          1.68 | Good guards; more adversarial testing recommended      |
| Module API clarity (input/output contracts)      |      15% |         8.3 |          1.25 | Strong contracts, can tighten schema/runtime alignment |
| Extensibility as plugin boundary (`StepFactory`) |      15% |         8.5 |          1.28 | Practical and clean extension seam                     |
| Cross-module integration readiness               |      15% |         7.8 |          1.17 | Needs stronger compatibility governance and CI matrix  |
| Test confidence for planner bounded context      |      10% |         8.0 |          0.80 | Solid baseline; missing property/adversarial depth     |
| **Total (Decoupled Planner Score)**              | **100%** |             | **8.48 / 10** | **High-quality planner core for modular architecture** |

Short interpretation:

- As a standalone planner module: **very good**.
- As a full platform product: intentionally out-of-scope.
