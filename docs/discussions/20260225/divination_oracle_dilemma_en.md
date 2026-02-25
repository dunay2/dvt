# The Oracle Dilemma — “We have no data” (Divination Layer Design)

Your premise is correct at the **product** level: the UI cannot go silent. The Divination Layer must always produce _some_ useful estimate, while being explicit about **what it is based on** (history, heuristics, cross-tenant aggregates, structure, or simulation).

This design keeps Divination as **estimation + explanation** (not execution), aligned with the overall separation of concerns:

- **UI** displays estimates and provenance.
- **Planner** creates plans (structure).
- **Engine** executes and records outcomes.
- **State/Observability** provides historical signals and cost telemetry.

---

## 1) Minimal contract (generic, not dbt-coupled)

Define a single oracle contract (port) plus source providers (adapters) per estimation source.

```ts
// packages/@dvt/divination/src/contracts/IDivinationOracle.v1.ts
export type Confidence = number; // 0..1

export type OmenSource =
  | 'portent' // own-tenant history (ground truth)
  | 'eco' // anonymized cross-tenant aggregates
  | 'structural' // plan/structure priors
  | 'augury' // heuristics
  | 'simulation'; // theoretical / Monte Carlo

export interface Omen {
  p10Ms: number;
  p50Ms: number;
  p90Ms: number;
  estCostUsd?: number; // optional
  confidence: Confidence;
  source: OmenSource;
  explain: string[]; // UI bullets ("why")
  asOf: string; // ISO timestamp
  modelVersion: string; // oracle/heuristic versioning
  caveats: string[]; // UI warnings
}

export interface GraphNodeLite {
  nodeId: string;
  kind: string; // DBT_MODEL / DBT_TEST / CUSTOM
  dependsOnCount: number;
  tags?: string[];
  materialization?: string; // if applicable
}

export interface DivinationContext {
  tenantId: string;
  projectId: string;
  environmentId: string;
  warehouseClass?: string; // normalize cost regimes
  lookbackDays?: number; // default 30
}

export interface IDivinationOracle {
  consult(node: GraphNodeLite, ctx: DivinationContext): Promise<Omen>;
}
```

**Key point:** `GraphNodeLite` avoids hard-coupling to dbt. Divination can support other domains by mapping their node types into `kind + features`.

---

## 2) Source hierarchy (your matrix, but with hard rules)

Your matrix is directionally correct. To make it production-grade:

- Source selection **must be deterministic**: same inputs → same Omen.
- Blending rules must be **testable** with golden vectors.

Recommended rules:

1. **Portent** if `nRuns >= 5` (own tenant history)
2. **Augury+** if `1..4` own runs, blended with Eco (if available)
3. **Eco** if `0` own runs but eco sample size meets threshold
4. **Structural** if similar plans exist (plan archive priors)
5. **Simulation + base Augury** if nothing exists at all

Extra “pro” invariant:

- **Never worse than baseline**: if Eco or Structural is available, Augury cannot overwrite it with _worse_ percentiles; it may only adjust within bounded deltas.

This prevents “invented” estimates from degrading known signals.

---

## 3) Cross-tenant EcoGlobal without breaking security

Eco is viable only with explicit privacy guards:

- **k-anonymity**: return _no_ eco data if `sampleCount < k` (e.g., k=50 or 100)
- **bucketing**: group by warehouse class / dataset size class / materialization to reduce correlation risk
- **noise** (optional, advanced): add bounded noise to percentiles if buckets are small
- **outlier control**: winsorize or cap extreme tails to mitigate reconstruction attacks

Eco must be treated as “analytics aggregate”, not raw history.

---

## 4) PlanoArchive (plans without execution) — use as priors, not truth

Structural priors are strong because they do **not** require runs, only that the planner generated plans.

Recommended approach:

- Store immutable artifacts (e.g., in ArtifactStore):
  - `ExecutionPlan.vN.json`
  - precomputed plan features: `nodeKind`, `dependsOnCount`, `fanOut`, `estimatedRowsClass`, etc.
- `PlanoArchive` returns **aggregated features** and similarity matches, not full plans.
- Keep it tenant-scoped unless you apply the same privacy gates as Eco.

This yields useful estimates even for “cold start” tenants.

---

## 5) UI semantics (prevents trust issues)

The principle is correct:

> The Oracle always tells the truth about its source.

Enforce UI conventions:

- badge: `Portent | Eco | Structural | Augury | Simulation`
- show confidence explicitly (label or bar)
- tooltip “how computed” populated from `explain[]` and `caveats[]`
- if `confidence < 0.3`, avoid showing an exact currency amount by default; show a range and “~”.

Divination is _usable_ only if its uncertainty is legible.

---

## Reference links

- C4 Model: https://c4model.com/
- OpenTelemetry: https://opentelemetry.io/
- dbt artifacts: https://docs.getdbt.com/reference/artifacts/dbt-artifacts
- Grafana Tempo: https://grafana.com/oss/tempo/
- Grafana Loki: https://grafana.com/oss/loki/
- PostgreSQL percentiles (`percentile_cont`): https://www.postgresql.org/docs/current/functions-aggregate.html
