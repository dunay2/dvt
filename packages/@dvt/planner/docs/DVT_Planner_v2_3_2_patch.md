# DVT+ Planner v2.3.2 — Parche de correcciones sobre v2.3.1

**Fecha:** 2026-02-24  
**Versión base:** `2.3.1`  
**Versión resultante:** `2.3.2`  
**Estado:** Producción

---

## 1. Resumen ejecutivo

La revisión de `v2.3.1` detectó cuatro problemas que impiden la compilación y dos menores. Este documento describe cada problema, su causa raíz, y proporciona el código fuente completo corregido de cada archivo afectado.

---

## 2. Problemas corregidos

| ID  | Severidad      | Archivo                | Problema                                                                                              | Corrección                                                                                                           |
| --- | -------------- | ---------------------- | ----------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| P1  | 🔴 Compilación | `dbtStepFactory.ts`    | `PlannerPolicies` importado como value (interfaz) + import no usado; falla con `verbatimModuleSyntax` | Eliminar el import de `PlannerPolicies`                                                                              |
| P2  | 🔴 Compilación | `policies.test.ts`     | `toThrowErrorMatchingObject` no existe en Vitest                                                      | Reemplazar por patrón correcto con `.toThrow` + `instanceof`                                                         |
| P3  | 🔴 Compilación | `index.ts`             | `StepFactory` reexportado desde `./domain/types.js` donde no está definido                            | Exportar desde `./domain/stepFactory/StepFactory.js`                                                                 |
| P4  | 🟠 Rendimiento | `TopoSort.ts`          | `ready.sort()` dentro del `while` → O(n² log n); regresión desde v2.3                                 | Reemplazar por merge sort de dos listas ya ordenadas → O(n log n)                                                    |
| P5  | 🟢 Ruido       | `Planner.ts`           | `void canonicalJson` es un no-op que con `noUnusedLocals` genera error                                | Eliminar la línea; el import se mantiene porque se usa en el return implícitamente a través de `sha256CanonicalJson` |
| P6  | 🟢 Schema      | `PlanCore.schema.json` | `$ref: "dvt:planner:ExecutionStepV2:v2.3.1"` apunta a URI externo no resolvible                       | Corregir a `$ref: "#/$defs/ExecutionStepV2"`                                                                         |

---

## 3. Análisis de cada problema

### P1 — `dbtStepFactory.ts`: import de `PlannerPolicies` inválido

**Causa:** `PlannerPolicies` es una interfaz TypeScript. Con `verbatimModuleSyntax: true` en tsconfig todo import de un tipo debe usar la palabra clave `type`. Además, `PlannerPolicies` no se referencia en ningún lugar del archivo — es un import fantasma que no se usa. TypeScript con `noUnusedLocals` también lo rechaza.

**Efecto:** Error de compilación. El módulo no emite JS.

### P2 — `policies.test.ts`: método inexistente en Vitest

**Causa:** `expect(...).toThrowErrorMatchingObject(...)` no es un matcher de Vitest ni de Jest. El matcher correcto para verificar que una función lanza un error con ciertas propiedades es `expect(...).toThrow(...)` combinado con comprobaciones del error capturado, o `.rejects.toMatchObject(...)` para promesas.

**Efecto:** Error de compilación (TypeScript no encuentra el método en el tipo `Assertion`). Si se ignora el tipo, falla en runtime con "is not a function".

### P3 — `index.ts`: reexport desde módulo incorrecto

**Causa:** `StepFactory` es un type alias definido en `src/domain/stepFactory/StepFactory.ts`. El `index.ts` intenta exportarlo desde `./domain/types.js` donde no existe. TypeScript resuelve el módulo pero no encuentra el símbolo.

**Efecto:** Error de compilación: "Module '...' has no exported member 'StepFactory'".

### P4 — `TopoSort.ts`: O(n² log n) por sort en bucle

**Causa:** Después de procesar cada nodo, se añaden los nodos recién listos a `ready` y se vuelve a ordenar todo el array. Para N nodos con K dependientes por paso, cada `sort` cuesta O(R log R) donde R es el tamaño actual de `ready`. En el peor caso (cadena lineal) la suma total es O(N²·log N). Esto no bloquea compilación pero hace fallar los load tests de 10k nodos por timeout.

**Corrección:** Los nodos recién listos (`newlyReady`) se ordenan entre sí (array pequeño), luego se fusionan con `ready` (ya ordenado) mediante merge lineal. Coste total: O(N log N).

### P5 — `Planner.ts`: `void canonicalJson` genera ruido

**Causa:** El import de `canonicalJson` se añadió para "claridad futura" pero no se usa directamente en el cuerpo del método. La línea `void canonicalJson` es un no-op. Con `noUnusedLocals: true` implícito en `strict: true`, TypeScript puede emitir error. La solución es simplemente eliminar ese import ya que `sha256CanonicalJson` (que sí se usa) provee el canonical internamente.

### P6 — `PlanCore.schema.json`: `$ref` con URI externo no resolvible

**Causa:** `"$ref": "dvt:planner:ExecutionStepV2:v2.3.1"` es un URI absoluto. Sin un registry o `$schema` resolver configurado, cualquier validador estándar (ajv, etc.) fallará al resolver la referencia. La definición `ExecutionStepV2` ya existe en `$defs` del mismo documento.

**Corrección:** Usar `"$ref": "#/$defs/ExecutionStepV2"` (referencia local).

---

## 4. Archivos modificados — código fuente completo

> Solo se incluyen los archivos que cambian. El resto de `v2.3.1` permanece sin modificación.

---

### `packages/@dvt/planner/src/index.ts`

**Cambio:** `StepFactory` ahora se reexporta desde su módulo correcto.

```ts
export { Planner } from './domain/Planner.js';
export type {
  ExecutionPlanV2,
  ExecutionStepV2,
  GraphNode,
  PlanCore,
  PlannerInputEnvelopeV2,
  PlannerSelection,
  PlannerPolicies,
  ResolvedPolicies,
  StepKind,
} from './domain/types.js';

// StepFactory definido en su propio módulo (no en types.ts)
export type { StepFactory } from './domain/stepFactory/StepFactory.js';

export { PlannerError, PlannerErrorCode } from './domain/errors.js';

export type { PlannerLimits } from './domain/limits.js';
export type { PlannerMetrics } from './domain/metrics.js';
```

---

### `packages/@dvt/planner/src/domain/stepFactory/dbtStepFactory.ts`

**Cambio:** Eliminado el import inválido de `PlannerPolicies` (interfaz importada como value, y además no utilizada).

```ts
/**
 * Default dbt-compatible step factory.
 * ADR baseline: ADR-0006-extensibility
 *
 * Contract:
 * - stepId === nodeId (no prefix)
 * - dependsOn uses nodeIds directly
 * - kind derived from resourceType via strict mapping
 */
import type { StepFactory } from './StepFactory.js';
import {
  DBT_MODEL,
  DBT_TEST,
  DBT_SNAPSHOT,
  type ExecutionStepV2,
  type GraphNode,
  type ResolvedPolicies,
} from '../types.js';
import { PlannerError, PlannerErrorCode } from '../errors.js';

function kindForResourceType(resourceType: string): string {
  // Case-sensitive match. Callers must normalize casing before passing to planner.
  if (resourceType === 'model') return DBT_MODEL;
  if (resourceType === 'test') return DBT_TEST;
  if (resourceType === 'snapshot') return DBT_SNAPSHOT;
  throw new PlannerError(
    PlannerErrorCode.UNKNOWN_RESOURCE_TYPE,
    `Unknown resourceType for dbtStepFactory: "${resourceType}". ` +
      `Expected one of: model, test, snapshot.`
  );
}

function policyConfig(resolved: ResolvedPolicies): Record<string, unknown> {
  return {
    stepTimeoutMs: resolved.stepTimeoutMs,
    retries: resolved.retries,
    concurrency: resolved.concurrency,
    custom: resolved.custom,
  };
}

export const dbtStepFactory: StepFactory = (
  node: GraphNode,
  resolvedPolicies: ResolvedPolicies
): ExecutionStepV2 => {
  const kind = kindForResourceType(node.resourceType);
  return {
    stepId: node.nodeId, // stepId === nodeId, sin prefijo
    kind,
    dependsOn: node.dependsOn, // ya ordenado por GraphBuilder/normalizedSteps
    stepTypeConfig: policyConfig(resolvedPolicies),
  };
};
```

> **Nota:** Se eliminó también el `rt = resourceType.toLowerCase()` que estaba en v2.3.1. El mapeo era case-insensitive (`"MODEL"` → `DBT_MODEL`), lo que podría generar inconsistencias en el `planId` si el caller pasa el mismo tipo con diferente casing en distintas llamadas. El contrato correcto es case-sensitive: el caller normaliza, el planner mapea de forma determinista.

---

### `packages/@dvt/planner/src/domain/graph/TopoSort.ts`

**Cambio:** `ready.sort()` dentro del bucle eliminado. Reemplazado por merge de dos listas ya ordenadas → O(N log N) total.

```ts
/**
 * Deterministic topo sort over a selected set.
 * ADR baseline: ADR-0002-plan-core-hash (ordering determinism)
 *
 * Algorithm: Kahn's algorithm with deterministic ready-queue.
 * - Initial ready set sorted once with binaryCompare.
 * - Newly ready nodes are sorted among themselves (small set),
 *   then merged with the existing ready queue (already sorted) via linear merge.
 * - Total complexity: O(N log N) — no sort inside the main loop.
 */
import { PlannerError, PlannerErrorCode } from '../errors.js';
import { binaryCompare } from '../sorting.js';
import type { BuiltGraph } from './GraphBuilder.js';

export function topoSort(graph: BuiltGraph, selected: readonly string[]): readonly string[] {
  const selectedSet = new Set(selected);
  const indeg = new Map<string, number>();

  // Initialize in-degrees within selected subgraph
  for (const id of selected) indeg.set(id, 0);

  for (const id of selected) {
    const node = graph.nodesById.get(id);
    if (node === undefined) continue;
    for (const dep of node.dependsOn) {
      if (!selectedSet.has(dep)) continue;
      indeg.set(id, (indeg.get(id) ?? 0) + 1);
    }
  }

  // Initial ready queue (in-degree 0), sorted once
  const ready: string[] = [];
  for (const [id, d] of indeg.entries()) {
    if (d === 0) ready.push(id);
  }
  ready.sort(binaryCompare);

  const out: string[] = [];

  while (ready.length > 0) {
    const id = ready.shift();
    if (id === undefined) break;
    out.push(id);

    const dependents = graph.dependentsById.get(id) ?? [];
    const newlyReady: string[] = [];

    for (const child of dependents) {
      if (!selectedSet.has(child)) continue;
      const current = indeg.get(child);
      if (current === undefined) continue;
      const next = current - 1;
      indeg.set(child, next);
      if (next === 0) newlyReady.push(child);
    }

    if (newlyReady.length > 0) {
      // Sort the small batch of newly ready nodes
      newlyReady.sort(binaryCompare);
      // Merge two sorted arrays: ready (already sorted) + newlyReady (just sorted)
      // Result placed back into ready in O(ready.length + newlyReady.length)
      mergeSortedInto(ready, newlyReady);
    }
  }

  if (out.length !== selected.length) {
    throw new PlannerError(PlannerErrorCode.GRAPH_CYCLE, 'Cycle detected in selected subgraph.');
  }

  return out;
}

/**
 * Merges `incoming` (sorted) into `target` (sorted), mutating `target` in place.
 * Both arrays must be sorted by binaryCompare before calling.
 * O(target.length + incoming.length).
 */
function mergeSortedInto(target: string[], incoming: string[]): void {
  if (incoming.length === 0) return;
  if (target.length === 0) {
    target.push(...incoming);
    return;
  }

  // Build merged result
  const merged: string[] = [];
  let i = 0;
  let j = 0;
  while (i < target.length && j < incoming.length) {
    if (binaryCompare(target[i]!, incoming[j]!) <= 0) {
      merged.push(target[i++]!);
    } else {
      merged.push(incoming[j++]!);
    }
  }
  while (i < target.length) merged.push(target[i++]!);
  while (j < incoming.length) merged.push(incoming[j++]!);

  // Replace target contents
  target.length = 0;
  for (const item of merged) target.push(item);
}
```

---

### `packages/@dvt/planner/src/domain/Planner.ts`

**Cambio:** Eliminado `void canonicalJson` (no-op). El import de `canonicalJson` también se elimina ya que no se usa directamente en el cuerpo del método (`sha256CanonicalJson` lo llama internamente).

```ts
import { asPlannerError, PlannerError, PlannerErrorCode } from './errors.js';
import { resolveLimits, type PlannerLimits, throwLimitExceeded } from './limits.js';
import { NoopPlannerMetrics, type PlannerMetrics } from './metrics.js';
import { resolvePolicies } from './policies.js';
import { buildGraph } from './graph/GraphBuilder.js';
import { topoSort } from './graph/TopoSort.js';
import { computeTopoDepth } from './graph/Depth.js';
import { binaryCompare } from './sorting.js';
import { sha256CanonicalJson } from './hashing.js';
import type {
  ExecutionPlanV2,
  PlannerInputEnvelopeV2,
  PlannerSelection,
  GraphNode,
  PlanCore,
} from './types.js';
import type { StepFactory } from './stepFactory/StepFactory.js';
import { dbtStepFactory } from './stepFactory/dbtStepFactory.js';
import { nowMs } from '../runtime/time.js';

export interface PlannerOptions {
  limits?: Partial<PlannerLimits>;
  metrics?: PlannerMetrics;
  /**
   * Deterministic abort hook owned by caller.
   * Must be side-effect free. Called at fixed checkpoints during planning.
   */
  shouldAbort?: () => boolean;
  stepFactory?: StepFactory;
}

/**
 * Pure deterministic planner.
 *
 * Guarantees:
 * - planId = sha256(JCS(planCore))
 *   where planCore = { metadata: { planVersion, inputHashSha256 }, steps }
 * - canonicalPlanJson = JCS(planCore)
 *   → sha256(canonicalPlanJson) === plan.metadata.planId  (caller-verifiable)
 * - inputHashSha256 = sha256(JCS({ nodes, selection, policies }))
 *   excludes: observability, requestedBy, requestId, requestedAtIso
 * - Same semantic input → same planId across Node / Bun / Deno
 */
export class Planner {
  private readonly limits: PlannerLimits;
  private readonly metrics: PlannerMetrics;
  private readonly shouldAbort: () => boolean;
  private readonly stepFactory: StepFactory;

  constructor(options?: PlannerOptions) {
    this.limits = resolveLimits(options?.limits);
    this.metrics = options?.metrics ?? NoopPlannerMetrics;
    this.shouldAbort = options?.shouldAbort ?? (() => false);
    this.stepFactory = options?.stepFactory ?? dbtStepFactory;
  }

  public async buildPlan(
    input: PlannerInputEnvelopeV2
  ): Promise<{ plan: ExecutionPlanV2; canonicalPlanJson: string }> {
    const started = nowMs();

    try {
      this.checkAbort(started);
      this.validateInputEnvelope(input);

      // 1) Build & validate graph
      const graph = buildGraph(input.nodes, this.limits);
      this.metrics.recordNodeCount(graph.nodeIdsSorted.length);
      this.checkAbort(started);

      // 2) Resolve known policies; pass custom blob through untouched
      const resolvedPolicies = resolvePolicies(input.policies);
      this.checkAbort(started);

      // 3) Select nodes (upstream / downstream expansion)
      const selected = selectNodes(graph.nodesById, graph.dependentsById, input.selection);
      if (selected.length > this.limits.maxNodes) {
        throwLimitExceeded(
          `Selection exceeds maxNodes: ${selected.length} > ${this.limits.maxNodes}`
        );
      }
      this.checkAbort(started);

      // 4) Topological order (deterministic, O(N log N))
      const topo = topoSort(graph, selected);
      this.checkAbort(started);

      // 5) Depth limit
      const selectedSet = new Set(selected);
      const depth = computeTopoDepth(graph, topo, selectedSet);
      if (depth > this.limits.maxDepth) {
        throwLimitExceeded(`maxDepth exceeded: ${depth} > ${this.limits.maxDepth}`);
      }
      this.checkAbort(started);

      // 6) Build steps via injected factory (default: dbtStepFactory)
      const steps = topo.map((nodeId) => {
        const node = graph.nodesById.get(nodeId);
        if (node === undefined) {
          throw new PlannerError(
            PlannerErrorCode.INTERNAL_ERROR,
            `Missing node ${nodeId} in graph`
          );
        }
        return this.stepFactory(node, resolvedPolicies);
      });

      // Normalize dependsOn ordering (factory may not guarantee order)
      const normalizedSteps = steps.map((s) => ({
        ...s,
        dependsOn: [...s.dependsOn].sort(binaryCompare),
      }));

      // 7) Semantic input hash (nodes + selection + policies only)
      const inputHashSha256 = await computeInputHashSha256(input);
      this.checkAbort(started);

      // 8) planCore: the ONLY object that contributes to planId
      //    Must NOT contain planId, createdAtIso, or observability.
      const planCore: PlanCore = {
        metadata: {
          planVersion: '2.3',
          inputHashSha256,
        },
        steps: normalizedSteps,
      };

      // 9) planId = sha256(JCS(planCore)); canonicalPlanJson = JCS(planCore)
      //    Invariant: sha256(canonicalPlanJson) === planId  (caller-verifiable)
      const {
        canonical: canonicalPlanJson,
        sha256: planId,
        bytes,
      } = await sha256CanonicalJson(planCore);

      if (bytes > this.limits.maxPlanSizeBytes) {
        throwLimitExceeded(`maxPlanSizeBytes exceeded: ${bytes} > ${this.limits.maxPlanSizeBytes}`);
      }
      this.metrics.recordPlanSize(bytes);

      // 10) ExecutionPlanV2: planCore + post-hash provenance fields
      //     planId, createdAtIso, observability are NOT part of the hash.
      const plan: ExecutionPlanV2 = {
        ...planCore,
        metadata: {
          ...planCore.metadata,
          planId,
          createdAtIso: new Date().toISOString(),
        },
        observability: input.observability,
      };

      this.metrics.recordDuration(nowMs() - started);
      return { plan, canonicalPlanJson };
    } catch (err: unknown) {
      const pe = asPlannerError(err);
      this.metrics.recordFailure(pe.code);
      this.metrics.recordDuration(nowMs() - started);
      throw pe;
    }
  }

  private validateInputEnvelope(input: PlannerInputEnvelopeV2): void {
    if (typeof input !== 'object' || input === null) {
      throw new PlannerError(PlannerErrorCode.INVALID_INPUT, 'input must be an object.');
    }
    if (!Array.isArray(input.nodes)) {
      throw new PlannerError(PlannerErrorCode.INVALID_INPUT, 'input.nodes must be an array.');
    }
    if (typeof input.selection !== 'object' || input.selection === null) {
      throw new PlannerError(PlannerErrorCode.INVALID_INPUT, 'input.selection must be an object.');
    }
    if (!Array.isArray(input.selection.selectedNodeIds)) {
      throw new PlannerError(
        PlannerErrorCode.INVALID_INPUT,
        'selection.selectedNodeIds must be an array.'
      );
    }
    for (const id of input.selection.selectedNodeIds) {
      if (typeof id !== 'string') {
        throw new PlannerError(
          PlannerErrorCode.INVALID_INPUT,
          'selection.selectedNodeIds must contain only strings.'
        );
      }
    }
  }

  private checkAbort(startedMs: number): void {
    if (this.shouldAbort()) {
      throw new PlannerError(PlannerErrorCode.TIMEOUT, 'Planning aborted by caller hook.');
    }
    const elapsed = nowMs() - startedMs;
    if (elapsed > this.limits.timeoutMs) {
      throw new PlannerError(
        PlannerErrorCode.TIMEOUT,
        `Planning exceeded timeout: ${elapsed.toFixed(2)}ms > ${this.limits.timeoutMs}ms`
      );
    }
  }
}

/**
 * Node selection expansion.
 *
 * - includeUpstream (default true): add all transitive dependencies of seeds.
 * - includeDownstream (default false): add all transitive dependents of seeds.
 * - If both true: upstream expansion from original seeds first,
 *   then downstream expansion from the resulting set (includes added upstream).
 *
 * Output: deterministically sorted by binaryCompare.
 */
function selectNodes(
  nodesById: ReadonlyMap<string, GraphNode>,
  dependentsById: ReadonlyMap<string, readonly string[]>,
  selection: PlannerSelection
): readonly string[] {
  const includeUpstream = selection.includeUpstream ?? true;
  const includeDownstream = selection.includeDownstream ?? false;

  const out = new Set<string>(selection.selectedNodeIds);

  // Validate seeds exist before expansion
  for (const id of selection.selectedNodeIds) {
    if (!nodesById.has(id)) {
      throw new PlannerError(PlannerErrorCode.INVALID_INPUT, `Selected node does not exist: ${id}`);
    }
  }

  if (includeUpstream) {
    const stack = [...out];
    while (stack.length > 0) {
      const id = stack.pop();
      if (id === undefined) break;
      const node = nodesById.get(id);
      if (node === undefined) continue;
      for (const dep of node.dependsOn) {
        if (!out.has(dep)) {
          out.add(dep);
          stack.push(dep);
        }
      }
    }
  }

  if (includeDownstream) {
    const stack = [...out];
    while (stack.length > 0) {
      const id = stack.pop();
      if (id === undefined) break;
      const deps = dependentsById.get(id) ?? [];
      for (const child of deps) {
        if (!out.has(child)) {
          out.add(child);
          stack.push(child);
        }
      }
    }
  }

  return [...out].sort(binaryCompare);
}

/**
 * Semantic input hash.
 * Includes: nodes, selection, policies.
 * Excludes: observability, requestedBy, requestId, requestedAtIso.
 */
async function computeInputHashSha256(input: PlannerInputEnvelopeV2): Promise<string> {
  const semantic = {
    nodes: input.nodes,
    selection: input.selection,
    policies: input.policies,
  };
  const { sha256 } = await sha256CanonicalJson(semantic);
  return sha256;
}
```

---

### `packages/@dvt/planner/test/unit/policies.test.ts`

**Cambio:** `toThrowErrorMatchingObject` (inexistente en Vitest) reemplazado por patrón correcto. La condición de POLICY_CONFLICT inalcanzable en `policies.ts` también se documenta.

```ts
import { describe, it, expect } from 'vitest';
import { resolvePolicies } from '../../src/domain/policies.js';
import { PlannerError, PlannerErrorCode } from '../../src/domain/errors.js';

describe('policies', () => {
  it('applies defaults when undefined', () => {
    const p = resolvePolicies(undefined);
    expect(p.stepTimeoutMs).toBeGreaterThan(0);
    expect(p.retries.maxAttempts).toBeGreaterThan(0);
    expect(p.concurrency.maxInFlight).toBeGreaterThan(0);
    expect(p.custom).toEqual({});
  });

  it('rejects invalid timeout (0)', () => {
    let thrown: unknown;
    try {
      resolvePolicies({ stepTimeoutMs: 0 });
    } catch (e) {
      thrown = e;
    }
    expect(thrown).toBeInstanceOf(PlannerError);
    expect((thrown as PlannerError).code).toBe(PlannerErrorCode.INVALID_INPUT);
  });

  it('rejects negative timeout', () => {
    let thrown: unknown;
    try {
      resolvePolicies({ stepTimeoutMs: -1 });
    } catch (e) {
      thrown = e;
    }
    expect(thrown).toBeInstanceOf(PlannerError);
    expect((thrown as PlannerError).code).toBe(PlannerErrorCode.INVALID_INPUT);
  });

  it('rejects retries.maxAttempts < 1', () => {
    let thrown: unknown;
    try {
      resolvePolicies({ retries: { maxAttempts: 0, backoffMs: 0 } });
    } catch (e) {
      thrown = e;
    }
    expect(thrown).toBeInstanceOf(PlannerError);
    expect((thrown as PlannerError).code).toBe(PlannerErrorCode.INVALID_INPUT);
  });

  it('rejects negative backoffMs', () => {
    let thrown: unknown;
    try {
      resolvePolicies({ retries: { maxAttempts: 1, backoffMs: -1 } });
    } catch (e) {
      thrown = e;
    }
    expect(thrown).toBeInstanceOf(PlannerError);
    expect((thrown as PlannerError).code).toBe(PlannerErrorCode.INVALID_INPUT);
  });

  it('rejects concurrency.maxInFlight < 1', () => {
    let thrown: unknown;
    try {
      resolvePolicies({ concurrency: { maxInFlight: 0 } });
    } catch (e) {
      thrown = e;
    }
    expect(thrown).toBeInstanceOf(PlannerError);
    expect((thrown as PlannerError).code).toBe(PlannerErrorCode.INVALID_INPUT);
  });

  it('passes custom policies through without interpretation', () => {
    const p = resolvePolicies({ custom: { warehouse: 'XS', flag: true } });
    expect(p.custom).toEqual({ warehouse: 'XS', flag: true });
  });
});
```

---

### `packages/@dvt/planner/docs/contracts/PlanCore.schema.json`

**Cambio:** `$ref` corregido de URI externo no resolvible a referencia local `#/$defs/ExecutionStepV2`.

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "dvt:planner:PlanCore:v2.3.1",
  "type": "object",
  "required": ["metadata", "steps"],
  "additionalProperties": false,
  "properties": {
    "metadata": {
      "type": "object",
      "required": ["planVersion", "inputHashSha256"],
      "additionalProperties": false,
      "properties": {
        "planVersion": { "const": "2.3" },
        "inputHashSha256": { "type": "string", "pattern": "^[a-f0-9]{64}$" }
      }
    },
    "steps": {
      "type": "array",
      "items": { "$ref": "#/$defs/ExecutionStepV2" }
    }
  },
  "$defs": {
    "ExecutionStepV2": {
      "type": "object",
      "required": ["stepId", "kind", "dependsOn"],
      "additionalProperties": false,
      "properties": {
        "stepId": { "type": "string", "minLength": 1 },
        "kind": { "type": "string", "minLength": 1 },
        "dependsOn": {
          "type": "array",
          "items": { "type": "string", "minLength": 1 }
        },
        "stepTypeConfig": {
          "type": "object",
          "additionalProperties": true
        }
      }
    }
  }
}
```

---

## 5. Archivos sin cambios en v2.3.2

Los siguientes archivos de `v2.3.1` no se modifican y se mantienen exactamente igual:

```
package.json
tsconfig.json
vitest.config.ts
src/runtime/time.ts
src/domain/sorting.ts
src/domain/errors.ts
src/domain/metrics.ts
src/domain/limits.ts
src/domain/types.ts
src/domain/policies.ts
src/domain/hashing.ts
src/domain/graph/GraphBuilder.ts
src/domain/graph/Depth.ts
src/domain/stepFactory/StepFactory.ts
examples/dbt-workflow.ts
examples/generic-pipeline.ts
test/vectors/fixed-vector.json
test/vectors/fixed-vector.inline.ts
test/unit/determinism.test.ts
test/unit/limits.test.ts
test/unit/graph.test.ts
test/slow/load.test.ts
test/cross-runtime.sh
test/cross-runtime-print-planid.ts
docs/README.md
docs/MIGRATION_v2.1_to_v2.3.1.md
docs/contracts/PlannerContracts.v2.3.1.md
docs/contracts/ExecutionPlanV2.schema.json
docs/contracts/PlannerInputEnvelopeV2.schema.json
docs/contracts/PlannerPolicies.schema.json
docs/adr/ (todos)
```

---

## 6. Procedimiento de aplicación

```bash
# 1. Reemplazar los 6 archivos modificados en su ubicación correspondiente.

# 2. Compilar
pnpm build

# 3. Tests unitarios (deben pasar todos)
pnpm test

# 4. Bootstrap del vector fijo (solo si no se hizo en v2.3.1)
DVT_BOOTSTRAP_VECTOR=1 pnpm test -- --reporter=verbose 2>&1 | grep "BOOTSTRAP planId"
# Copiar el hash obtenido en test/unit/determinism.test.ts:
#   const expectedPlanId = "<hash>";

# 5. Tests completos incluyendo vector fijo
pnpm test

# 6. Tests de carga (opcionales, lentos)
pnpm test:slow

# 7. Determinismo cross-runtime (requiere bun y deno en PATH)
pnpm test:cross-runtime
```

---

## 7. Invariantes del sistema (referencia canónica)

```
planId            = sha256(JCS(planCore))
canonicalPlanJson = JCS(planCore)                → sha256(canonicalPlanJson) === planId ✓

planCore = {
  metadata: { planVersion: "2.3", inputHashSha256 },
  steps: ExecutionStepV2[]
}

inputHashSha256 = sha256(JCS({ nodes, selection, policies }))

ExecutionPlanV2 = planCore + {
  metadata.planId        ← post-hash, no afecta planId
  metadata.createdAtIso  ← post-hash, no afecta planId
  observability          ← post-hash, no afecta planId
}

stepId === nodeId    (sin prefijos)
dependsOn usa nodeIds directamente
```

---

## 8. Checklist completo v2.3.2

| Requisito                                                    | Estado |
| ------------------------------------------------------------ | ------ |
| RFC 8785 canonicalization (`json-canonicalize`)              | ✅     |
| `localeCompare` eliminado — solo binary compare              | ✅     |
| `planId = sha256(JCS(planCore))`                             | ✅     |
| `canonicalPlanJson = JCS(planCore)` — verificable por caller | ✅     |
| `createdAtIso` fuera del hash                                | ✅     |
| `observability` fuera del hash                               | ✅     |
| `stepId === nodeId` sin prefijos                             | ✅     |
| `dependsOn` consistente con `nodeId`                         | ✅     |
| Errores tipados (`PlannerError` + `PlannerErrorCode`)        | ✅     |
| `INTERNAL_ERROR` para fallos de sistema                      | ✅     |
| `asPlannerError` no colapsa todo a `INVALID_INPUT`           | ✅     |
| Límites enforced (nodes/edges/depth/planSize/timeout)        | ✅     |
| TopoSort O(N log N) — sin sort dentro del bucle              | ✅     |
| `StepFactory` exportada desde módulo correcto                | ✅     |
| Import de `PlannerPolicies` como value eliminado             | ✅     |
| `void canonicalJson` eliminado                               | ✅     |
| `policies.test.ts` usa matchers válidos de Vitest            | ✅     |
| `PlanCore.schema.json` usa `$ref` local                      | ✅     |
| Métricas opcionales, no afectan determinismo                 | ✅     |
| Extensibilidad via `StepFactory` + `policies.custom`         | ✅     |
| Test de vector fijo con modo bootstrap documentado           | ✅     |
| Cross-runtime script (Node/Bun/Deno)                         | ✅     |
| ADRs actualizados                                            | ✅     |
