# DVT+ Planner v2.3.1 — Complete Regenerated Project (Production, Deterministic, Extensible)

- **Date**: 2026-02-24
- **Version**: `2.3.1`
- **Status**: Production
- **Determinism**: RFC 8785 JSON Canonicalization Scheme (JCS)
- **Core Contract**:
  - `planId = sha256(JCS(planCore))`
  - `canonicalPlanJson = JCS(planCore)`
  - `sha256(canonicalPlanJson) === planId`

This single Markdown document contains **everything**:

- Full source code (TypeScript strict, ESM, no `any`)
- Tests (unit + cross-runtime deterministic check + slow/load tests gated)
- Documentation (README + integration flow)
- Migration guide
- ADRs (key decisions)
- **Contracts** (typed contracts + JSON schemas + invariants)
- Examples
- File tree including **file version** and **ADR baseline** (when applicable)

---

## How to run

```bash
# from packages/@dvt/planner
pnpm install
pnpm build
pnpm test
pnpm test:cross-runtime

# optional slow tests
pnpm test:slow
```

---

## File Tree (with version + ADR baselines)

> **Legend**: `vX.Y.Z` = file version; `ADR-*` = decision baseline.

```
packages/@dvt/planner
├── package.json                               (v2.3.1, ADR-0000)
├── tsconfig.json                              (v2.3.1)
├── vitest.config.ts                           (v2.3.1)
├── src/
│   ├── index.ts                               (v2.3.1)
│   ├── runtime/
│   │   └── time.ts                            (v2.3.1)
│   ├── domain/
│   │   ├── Planner.ts                         (v2.3.1, ADR-0001, ADR-0002)
│   │   ├── errors.ts                          (v2.3.1, ADR-0003)
│   │   ├── hashing.ts                         (v2.3.1, ADR-0001)
│   │   ├── limits.ts                          (v2.3.1, ADR-0004)
│   │   ├── metrics.ts                         (v2.3.1, ADR-0005)
│   │   ├── policies.ts                        (v2.3.1, ADR-0006)
│   │   ├── sorting.ts                         (v2.3.1, ADR-0001)
│   │   ├── types.ts                           (v2.3.1, ADR-0002, ADR-0006)
│   │   ├── graph/
│   │   │   ├── GraphBuilder.ts                (v2.3.1, ADR-0004)
│   │   │   ├── TopoSort.ts                    (v2.3.1, ADR-0002)
│   │   │   └── Depth.ts                       (v2.3.1, ADR-0004)
│   │   └── stepFactory/
│   │       ├── StepFactory.ts                 (v2.3.1, ADR-0006)
│   │       └── dbtStepFactory.ts              (v2.3.1, ADR-0006)
├── examples/
│   ├── dbt-workflow.ts                        (v2.3.1)
│   └── generic-pipeline.ts                    (v2.3.1)
├── test/
│   ├── unit/
│   │   ├── determinism.test.ts                (v2.3.1, ADR-0001, ADR-0002)
│   │   ├── limits.test.ts                     (v2.3.1, ADR-0004)
│   │   ├── graph.test.ts                      (v2.3.1, ADR-0004)
│   │   └── policies.test.ts                   (v2.3.1, ADR-0006)
│   ├── slow/
│   │   └── load.test.ts                       (v2.3.1, ADR-0004)
│   ├── vectors/
│   │   ├── fixed-vector.json                  (v2.3.1)
│   │   └── fixed-vector.inline.ts             (v2.3.1)
│   └── cross-runtime.sh                       (v2.3.1, ADR-0001)
├── docs/
│   ├── README.md                              (v2.3.1)
│   ├── MIGRATION_v2.1_to_v2.3.1.md            (v2.3.1)
│   ├── contracts/
│   │   ├── PlannerContracts.v2.3.1.md         (v2.3.1, ADR-0002)
│   │   ├── ExecutionPlanV2.schema.json        (v2.3.1, ADR-0002)
│   │   ├── PlanCore.schema.json               (v2.3.1, ADR-0002)
│   │   ├── PlannerInputEnvelopeV2.schema.json (v2.3.1, ADR-0002)
│   │   └── PlannerPolicies.schema.json        (v2.3.1, ADR-0006)
│   └── adr/
│       ├── ADR-0000-scope-and-compat.md       (v2.3.1)
│       ├── ADR-0001-rfc8785-jcs.md            (v2.3.1)
│       ├── ADR-0002-plan-core-hash.md         (v2.3.1)
│       ├── ADR-0003-typed-errors.md           (v2.3.1)
│       ├── ADR-0004-security-limits.md        (v2.3.1)
│       ├── ADR-0005-metrics.md                (v2.3.1)
│       └── ADR-0006-extensibility.md          (v2.3.1)
```

---

# Source Code

## packages/@dvt/planner/package.json

```json
{
  "name": "@dvt/planner",
  "version": "2.3.1",
  "private": true,
  "type": "module",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "files": ["dist", "docs", "examples", "test"],
  "scripts": {
    "build": "tsc -p tsconfig.json",
    "test": "vitest run",
    "test:watch": "vitest",
    "test:cross-runtime": "bash test/cross-runtime.sh",
    "test:slow": "vitest run -c vitest.config.ts --dir test/slow"
  },
  "dependencies": {
    "json-canonicalize": "^1.0.6"
  },
  "devDependencies": {
    "typescript": "^5.5.0",
    "vitest": "^1.6.0"
  },
  "engines": {
    "node": ">=22"
  }
}
```

## packages/@dvt/planner/tsconfig.json

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2022", "DOM"],
    "module": "ES2022",
    "moduleResolution": "Bundler",
    "declaration": true,
    "outDir": "dist",
    "rootDir": ".",
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "exactOptionalPropertyTypes": true,
    "useUnknownInCatchVariables": true,
    "noImplicitOverride": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true,
    "skipLibCheck": true
  },
  "include": ["src/**/*.ts", "test/**/*.ts", "examples/**/*.ts"]
}
```

## packages/@dvt/planner/vitest.config.ts

```ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['test/**/*.test.ts'],
    exclude: ['**/node_modules/**', 'dist/**'],
    testTimeout: 60_000,
  },
});
```

---

## packages/@dvt/planner/src/index.ts

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
  StepFactory,
  StepKind,
} from './domain/types.js';

export { PlannerError, PlannerErrorCode } from './domain/errors.js';

export type { PlannerLimits } from './domain/limits.js';
export type { PlannerMetrics } from './domain/metrics.js';
```

## packages/@dvt/planner/src/runtime/time.ts

```ts
/**
 * Monotonic-ish time for duration measurement.
 * - Uses performance.now() when available (Node 22 has it).
 * - Falls back to Date.now() if needed.
 */
export function nowMs(): number {
  const p = globalThis.performance;
  if (p && typeof p.now === 'function') return p.now();
  return Date.now();
}
```

---

## packages/@dvt/planner/src/domain/sorting.ts

```ts
/**
 * Deterministic binary string compare.
 * Never use localeCompare for determinism guarantees.
 */
export function binaryCompare(a: string, b: string): number {
  // eslint is not in deps; keep minimal and explicit.
  if (a < b) return -1;
  if (a > b) return 1;
  return 0;
}
```

---

## packages/@dvt/planner/src/domain/errors.ts

```ts
/**
 * ADR baseline: ADR-0003-typed-errors
 */
export enum PlannerErrorCode {
  INVALID_INPUT = 'INVALID_INPUT',
  GRAPH_CYCLE = 'GRAPH_CYCLE',
  UNKNOWN_RESOURCE_TYPE = 'UNKNOWN_RESOURCE_TYPE',
  POLICY_CONFLICT = 'POLICY_CONFLICT',
  LIMIT_EXCEEDED = 'LIMIT_EXCEEDED',
  TIMEOUT = 'TIMEOUT',
  INTERNAL_ERROR = 'INTERNAL_ERROR',
}

export class PlannerError extends Error {
  public readonly code: PlannerErrorCode;
  public readonly cause?: unknown;

  constructor(code: PlannerErrorCode, message: string, cause?: unknown) {
    super(message);
    this.code = code;
    this.cause = cause;
  }
}

/** Normalize any thrown value to PlannerError. */
export function asPlannerError(err: unknown): PlannerError {
  if (err instanceof PlannerError) return err;
  if (err instanceof Error) {
    return new PlannerError(PlannerErrorCode.INTERNAL_ERROR, err.message, err);
  }
  return new PlannerError(PlannerErrorCode.INTERNAL_ERROR, String(err), err);
}
```

---

## packages/@dvt/planner/src/domain/metrics.ts

```ts
/**
 * ADR baseline: ADR-0005-metrics
 *
 * Metrics are OPTIONAL and MUST NOT affect determinism.
 * They are invoked as side-effect callbacks owned by the caller.
 */
export interface PlannerMetrics {
  recordDuration(ms: number): void;
  recordNodeCount(count: number): void;
  recordPlanSize(bytes: number): void;
  recordFailure(code: string): void;
}

export const NoopPlannerMetrics: PlannerMetrics = {
  recordDuration: () => undefined,
  recordNodeCount: () => undefined,
  recordPlanSize: () => undefined,
  recordFailure: () => undefined,
};
```

---

## packages/@dvt/planner/src/domain/limits.ts

```ts
/**
 * ADR baseline: ADR-0004-security-limits
 */
import { PlannerError, PlannerErrorCode } from './errors.js';

export interface PlannerLimits {
  maxNodes: number;
  maxEdges: number;
  maxDepth: number;
  maxPlanSizeBytes: number;
  timeoutMs: number;
}

const DEFAULT_LIMITS: PlannerLimits = {
  maxNodes: 25_000,
  maxEdges: 150_000,
  maxDepth: 2_000,
  maxPlanSizeBytes: 8_000_000, // 8MB canonical JSON
  timeoutMs: 15_000,
};

export function resolveLimits(partial?: Partial<PlannerLimits>): PlannerLimits {
  return {
    maxNodes: partial?.maxNodes ?? DEFAULT_LIMITS.maxNodes,
    maxEdges: partial?.maxEdges ?? DEFAULT_LIMITS.maxEdges,
    maxDepth: partial?.maxDepth ?? DEFAULT_LIMITS.maxDepth,
    maxPlanSizeBytes: partial?.maxPlanSizeBytes ?? DEFAULT_LIMITS.maxPlanSizeBytes,
    timeoutMs: partial?.timeoutMs ?? DEFAULT_LIMITS.timeoutMs,
  };
}

export function throwLimitExceeded(message: string): never {
  throw new PlannerError(PlannerErrorCode.LIMIT_EXCEEDED, message);
}
```

---

## packages/@dvt/planner/src/domain/types.ts

```ts
/**
 * ADR baseline: ADR-0002-plan-core-hash + ADR-0006-extensibility
 */

export type StepKind = string;

// dbt defaults as string literals (backward compatible)
export const DBT_MODEL = 'DBT_MODEL';
export const DBT_TEST = 'DBT_TEST';
export const DBT_SNAPSHOT = 'DBT_SNAPSHOT';

export interface GraphNode {
  /** Stable node identifier (content-addressable at graph level). */
  nodeId: string;
  /** Domain classification (dbt: model/test/snapshot; other domains free-form). */
  resourceType: string;
  /** Node dependency ids. Must reference existing nodeIds. */
  dependsOn: readonly string[];
}

/** Known planner policies (resolved by core), plus passthrough for custom domains. */
export interface PlannerPolicies {
  stepTimeoutMs?: number;
  retries?: {
    maxAttempts: number;
    backoffMs: number;
  };
  concurrency?: {
    maxInFlight: number;
  };
  /** Domain-specific blob that planner does not interpret. */
  custom?: Record<string, unknown>;
}

export interface ResolvedPolicies {
  stepTimeoutMs: number;
  retries: {
    maxAttempts: number;
    backoffMs: number;
  };
  concurrency: {
    maxInFlight: number;
  };
  custom: Record<string, unknown>;
}

export interface PlannerSelection {
  selectedNodeIds: readonly string[];
  includeUpstream?: boolean;
  includeDownstream?: boolean;
}

export interface ExecutionStepV2 {
  /** MUST be stable. In v2.3.x: stepId === nodeId (no prefixes). */
  stepId: string;
  /** Extensible kind (string). dbt uses DBT_* constants. */
  kind: StepKind;
  /** Deterministically sorted dependency stepIds. */
  dependsOn: readonly string[];
  /** Optional domain-specific config for the step type. */
  stepTypeConfig?: Record<string, unknown>;
}

export interface PlanCore {
  metadata: {
    planVersion: '2.3';
    inputHashSha256: string;
  };
  steps: readonly ExecutionStepV2[];
}

export interface ExecutionPlanV2 extends PlanCore {
  metadata: PlanCore['metadata'] & {
    planId: string;
    createdAtIso: string;
  };
  /**
   * Observability is post-hash (must not affect planId).
   * Use for correlation tags, tenant info, user info, etc.
   */
  observability?: {
    tags?: Record<string, string>;
    extra?: Record<string, unknown>;
    [k: string]: unknown;
  };
}

export interface PlannerInputEnvelopeV2 {
  nodes: readonly GraphNode[];
  selection: PlannerSelection;
  policies?: PlannerPolicies;
  observability?: ExecutionPlanV2['observability'];
  // Volatile / orchestration metadata (excluded from inputHashSha256):
  requestedBy?: string;
  requestId?: string;
  requestedAtIso?: string;
}
```

---

## packages/@dvt/planner/src/domain/policies.ts

```ts
/**
 * ADR baseline: ADR-0006-extensibility (custom passthrough) + POLICY_CONFLICT semantics.
 */
import { PlannerError, PlannerErrorCode } from './errors.js';
import type { PlannerPolicies, ResolvedPolicies } from './types.js';

const DEFAULTS: ResolvedPolicies = {
  stepTimeoutMs: 60_000,
  retries: {
    maxAttempts: 1,
    backoffMs: 0,
  },
  concurrency: {
    maxInFlight: 256,
  },
  custom: {},
};

export function resolvePolicies(policies?: PlannerPolicies): ResolvedPolicies {
  if (policies === undefined) return DEFAULTS;

  const timeout = policies.stepTimeoutMs ?? DEFAULTS.stepTimeoutMs;
  if (!Number.isFinite(timeout) || timeout <= 0) {
    throw new PlannerError(
      PlannerErrorCode.INVALID_INPUT,
      'policies.stepTimeoutMs must be a positive number.'
    );
  }

  const retries = policies.retries ?? DEFAULTS.retries;
  if (!Number.isFinite(retries.maxAttempts) || retries.maxAttempts < 1) {
    throw new PlannerError(
      PlannerErrorCode.INVALID_INPUT,
      'policies.retries.maxAttempts must be >= 1.'
    );
  }
  if (!Number.isFinite(retries.backoffMs) || retries.backoffMs < 0) {
    throw new PlannerError(
      PlannerErrorCode.INVALID_INPUT,
      'policies.retries.backoffMs must be >= 0.'
    );
  }

  const conc = policies.concurrency ?? DEFAULTS.concurrency;
  if (!Number.isFinite(conc.maxInFlight) || conc.maxInFlight < 1) {
    throw new PlannerError(
      PlannerErrorCode.INVALID_INPUT,
      'policies.concurrency.maxInFlight must be >= 1.'
    );
  }

  // Example of a policy conflict placeholder (kept for future expansion):
  if (retries.maxAttempts > 1 && conc.maxInFlight <= 0) {
    throw new PlannerError(PlannerErrorCode.POLICY_CONFLICT, 'Invalid policy combination.');
  }

  return {
    stepTimeoutMs: timeout,
    retries: {
      maxAttempts: retries.maxAttempts,
      backoffMs: retries.backoffMs,
    },
    concurrency: {
      maxInFlight: conc.maxInFlight,
    },
    custom: policies.custom ?? {},
  };
}
```

---

## packages/@dvt/planner/src/domain/hashing.ts

```ts
/**
 * ADR baseline: ADR-0001-rfc8785-jcs
 */
import { canonicalize } from 'json-canonicalize';

/** RFC 8785 (JCS) canonical JSON string. */
export function canonicalJson(obj: unknown): string {
  return canonicalize(obj);
}

/**
 * Returns canonical JCS and sha256 hash in hex of that canonical string.
 * Uses WebCrypto: crypto.subtle (Node 22+, Bun, Deno).
 */
export async function sha256CanonicalJson(obj: unknown): Promise<{
  canonical: string;
  sha256: string;
  bytes: number;
}> {
  const canonical = canonicalize(obj);
  const data = new TextEncoder().encode(canonical);
  const digest = await crypto.subtle.digest('SHA-256', data);
  const hex = [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
  return { canonical, sha256: hex, bytes: data.length };
}
```

---

## packages/@dvt/planner/src/domain/graph/GraphBuilder.ts

```ts
/**
 * ADR baseline: ADR-0004-security-limits
 */
import type { GraphNode } from '../types.js';
import type { PlannerLimits } from '../limits.js';
import { throwLimitExceeded } from '../limits.js';
import { PlannerError, PlannerErrorCode } from '../errors.js';
import { binaryCompare } from '../sorting.js';

export interface BuiltGraph {
  nodesById: ReadonlyMap<string, GraphNode>;
  dependentsById: ReadonlyMap<string, readonly string[]>;
  nodeIdsSorted: readonly string[];
  edgeCount: number;
}

/**
 * Build and validate graph.
 * - Enforces node uniqueness
 * - Validates dependsOn: string[] and references exist
 * - Enforces maxNodes / maxEdges
 */
export function buildGraph(nodes: readonly GraphNode[], limits: PlannerLimits): BuiltGraph {
  if (nodes.length > limits.maxNodes) {
    throwLimitExceeded(`maxNodes exceeded: ${nodes.length} > ${limits.maxNodes}`);
  }

  const nodesById = new Map<string, GraphNode>();
  for (const n of nodes) {
    if (typeof n.nodeId !== 'string' || n.nodeId.length === 0) {
      throw new PlannerError(
        PlannerErrorCode.INVALID_INPUT,
        'Every node.nodeId must be a non-empty string.'
      );
    }
    if (typeof n.resourceType !== 'string' || n.resourceType.length === 0) {
      throw new PlannerError(
        PlannerErrorCode.INVALID_INPUT,
        'Every node.resourceType must be a non-empty string.'
      );
    }
    if (!Array.isArray(n.dependsOn)) {
      throw new PlannerError(
        PlannerErrorCode.INVALID_INPUT,
        `Node ${n.nodeId} dependsOn must be an array.`
      );
    }
    for (const d of n.dependsOn) {
      if (typeof d !== 'string') {
        throw new PlannerError(
          PlannerErrorCode.INVALID_INPUT,
          `Node ${n.nodeId} dependsOn must contain only strings.`
        );
      }
    }
    if (nodesById.has(n.nodeId)) {
      throw new PlannerError(PlannerErrorCode.INVALID_INPUT, `Duplicate nodeId: ${n.nodeId}`);
    }
    nodesById.set(n.nodeId, n);
  }

  // validate references + build dependents adjacency
  const dependents = new Map<string, string[]>();
  for (const id of nodesById.keys()) dependents.set(id, []);

  let edgeCount = 0;
  for (const n of nodesById.values()) {
    for (const dep of n.dependsOn) {
      if (!nodesById.has(dep)) {
        throw new PlannerError(
          PlannerErrorCode.INVALID_INPUT,
          `Node ${n.nodeId} dependsOn missing node: ${dep}`
        );
      }
      dependents.get(dep)?.push(n.nodeId);
      edgeCount += 1;
      if (edgeCount > limits.maxEdges) {
        throwLimitExceeded(`maxEdges exceeded: ${edgeCount} > ${limits.maxEdges}`);
      }
    }
  }

  // deterministically sort dependents lists
  const dependentsById = new Map<string, readonly string[]>();
  for (const [k, arr] of dependents.entries()) {
    dependentsById.set(k, arr.sort(binaryCompare));
  }

  const nodeIdsSorted = [...nodesById.keys()].sort(binaryCompare);

  return { nodesById, dependentsById, nodeIdsSorted, edgeCount };
}
```

---

## packages/@dvt/planner/src/domain/graph/TopoSort.ts

```ts
/**
 * Deterministic topo sort over a selected set.
 * ADR baseline: ADR-0002-plan-core-hash (ordering determinism)
 */
import { PlannerError, PlannerErrorCode } from '../errors.js';
import { binaryCompare } from '../sorting.js';
import type { BuiltGraph } from './GraphBuilder.js';

/**
 * Topologically sorts selected nodes.
 * - Includes only nodes in `selected` array
 * - Deterministic queue ordering
 * - Throws GRAPH_CYCLE on cycle within selected subgraph
 */
export function topoSort(graph: BuiltGraph, selected: readonly string[]): readonly string[] {
  const selectedSet = new Set(selected);
  const indeg = new Map<string, number>();

  for (const id of selected) indeg.set(id, 0);

  for (const id of selected) {
    const node = graph.nodesById.get(id);
    if (!node) continue;
    for (const dep of node.dependsOn) {
      if (!selectedSet.has(dep)) continue;
      indeg.set(id, (indeg.get(id) ?? 0) + 1);
    }
  }

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
    for (const child of dependents) {
      if (!selectedSet.has(child)) continue;
      const v = indeg.get(child);
      if (v === undefined) continue;
      const next = v - 1;
      indeg.set(child, next);
      if (next === 0) {
        ready.push(child);
      }
    }
    ready.sort(binaryCompare);
  }

  if (out.length !== selected.length) {
    throw new PlannerError(PlannerErrorCode.GRAPH_CYCLE, 'Cycle detected in selected subgraph.');
  }
  return out;
}
```

---

## packages/@dvt/planner/src/domain/graph/Depth.ts

```ts
/**
 * Computes topological depth for selected DAG.
 * ADR baseline: ADR-0004-security-limits (maxDepth)
 */
import type { BuiltGraph } from './GraphBuilder.js';

/**
 * Returns the maximum number of nodes on a path within the selected subgraph.
 * For a single node, depth is 1.
 */
export function computeTopoDepth(
  graph: BuiltGraph,
  topo: readonly string[],
  selectedSet: ReadonlySet<string>
): number {
  const depthById = new Map<string, number>();

  let maxDepth = 0;
  for (const id of topo) {
    const node = graph.nodesById.get(id);
    if (!node) continue;

    let bestParent = 0;
    for (const dep of node.dependsOn) {
      if (!selectedSet.has(dep)) continue;
      const d = depthById.get(dep) ?? 0;
      if (d > bestParent) bestParent = d;
    }

    const dHere = bestParent + 1;
    depthById.set(id, dHere);
    if (dHere > maxDepth) maxDepth = dHere;
  }

  return maxDepth;
}
```

---

## packages/@dvt/planner/src/domain/stepFactory/StepFactory.ts

```ts
/**
 * ADR baseline: ADR-0006-extensibility
 */
import type { GraphNode, ResolvedPolicies, ExecutionStepV2 } from '../types.js';

/**
 * Factory for building steps.
 * Determinism requirement: for same inputs, must return identical step outputs.
 */
export type StepFactory = (node: GraphNode, resolvedPolicies: ResolvedPolicies) => ExecutionStepV2;
```

---

## packages/@dvt/planner/src/domain/stepFactory/dbtStepFactory.ts

```ts
/**
 * Default dbt-compatible step factory.
 * ADR baseline: ADR-0006-extensibility
 */
import type { StepFactory } from './StepFactory.js';
import {
  DBT_MODEL,
  DBT_TEST,
  DBT_SNAPSHOT,
  PlannerPolicies,
  type ExecutionStepV2,
  type GraphNode,
  type ResolvedPolicies,
} from '../types.js';
import { PlannerError, PlannerErrorCode } from '../errors.js';

function kindForResourceType(resourceType: string): string {
  const rt = resourceType.toLowerCase();
  if (rt === 'model') return DBT_MODEL;
  if (rt === 'test') return DBT_TEST;
  if (rt === 'snapshot') return DBT_SNAPSHOT;
  throw new PlannerError(
    PlannerErrorCode.UNKNOWN_RESOURCE_TYPE,
    `Unknown resourceType: ${resourceType}`
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
    stepId: node.nodeId,
    kind,
    dependsOn: node.dependsOn,
    stepTypeConfig: policyConfig(resolvedPolicies),
  };
};
```

---

## packages/@dvt/planner/src/domain/Planner.ts

```ts
import { asPlannerError, PlannerError, PlannerErrorCode } from './errors.js';
import { resolveLimits, type PlannerLimits, throwLimitExceeded } from './limits.js';
import { NoopPlannerMetrics, type PlannerMetrics } from './metrics.js';
import { resolvePolicies } from './policies.js';
import { buildGraph } from './graph/GraphBuilder.js';
import { topoSort } from './graph/TopoSort.js';
import { computeTopoDepth } from './graph/Depth.js';
import { binaryCompare } from './sorting.js';
import { sha256CanonicalJson, canonicalJson } from './hashing.js'; // canonicalJson imported for explicit contract & future debug
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
   * MUST be side-effect free and deterministic for given run context.
   */
  shouldAbort?: () => boolean;
  stepFactory?: StepFactory;
}

/**
 * Pure deterministic planner.
 *
 * Guarantees:
 * - planId = sha256(JCS(planCore)), where planCore = { metadata: { planVersion, inputHashSha256 }, steps }
 * - canonicalPlanJson = JCS(planCore), i.e. caller can verify sha256(canonicalPlanJson) === planId
 * - inputHashSha256 = sha256(JCS({ nodes, selection, policies })) excluding observability and volatile fields
 * - Same semantic input -> same planId across Node/Bun/Deno
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

      // 2) Resolve policies (known subset)
      const resolvedPolicies = resolvePolicies(input.policies);
      this.checkAbort(started);

      // 3) Select nodes (upstream/downstream)
      const selected = selectNodes(graph.nodesById, graph.dependentsById, input.selection);
      if (selected.length > this.limits.maxNodes) {
        throwLimitExceeded(
          `Selection exceeds maxNodes: ${selected.length} > ${this.limits.maxNodes}`
        );
      }
      this.checkAbort(started);

      // 4) Topological order
      const topo = topoSort(graph, selected);
      this.checkAbort(started);

      // 5) Depth limit
      const selectedSet = new Set(selected);
      const depth = computeTopoDepth(graph, topo, selectedSet);
      if (depth > this.limits.maxDepth) {
        throwLimitExceeded(`maxDepth exceeded: ${depth} > ${this.limits.maxDepth}`);
      }
      this.checkAbort(started);

      // 6) Steps
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

      // Normalize dependsOn ordering deterministically
      const normalizedSteps = steps.map((s) => ({
        ...s,
        dependsOn: [...s.dependsOn].sort(binaryCompare),
      }));

      // 7) Semantic input hash (only nodes, selection, policies)
      const inputHashSha256 = await computeInputHashSha256(input);
      this.checkAbort(started);

      // 8) Build planCore (the hashed object; no planId / createdAt / observability)
      const planCore: PlanCore = {
        metadata: {
          planVersion: '2.3',
          inputHashSha256,
        },
        steps: normalizedSteps,
      };

      // (Optional) canonicalJson is imported for clarity and future audit hooks.
      // It MUST be RFC8785 JCS canonicalization.
      void canonicalJson;

      // 9) planId = sha256(JCS(planCore)); canonicalPlanJson MUST be JCS(planCore)
      const {
        canonical: canonicalPlanJson,
        sha256: planId,
        bytes,
      } = await sha256CanonicalJson(planCore);

      if (bytes > this.limits.maxPlanSizeBytes) {
        throwLimitExceeded(`maxPlanSizeBytes exceeded: ${bytes} > ${this.limits.maxPlanSizeBytes}`);
      }
      this.metrics.recordPlanSize(bytes);

      // 10) Build final plan (post-hash provenance fields)
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
 * - includeUpstream (default true): include transitive dependencies.
 * - includeDownstream (default false): include transitive dependents.
 * - If both true: upstream expansion from seeds, then downstream expansion from expanded set.
 */
function selectNodes(
  nodesById: ReadonlyMap<string, GraphNode>,
  dependentsById: ReadonlyMap<string, readonly string[]>,
  selection: PlannerSelection
): readonly string[] {
  const includeUpstream = selection.includeUpstream ?? true;
  const includeDownstream = selection.includeDownstream ?? false;

  const out = new Set<string>(selection.selectedNodeIds);

  // validate seeds exist
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
 * Semantic input hash includes: nodes, selection, policies.
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

# Examples

## packages/@dvt/planner/examples/dbt-workflow.ts

```ts
import { Planner } from '../src/domain/Planner.js';
import type { PlannerInputEnvelopeV2 } from '../src/domain/types.js';

async function main(): Promise<void> {
  const planner = new Planner();

  const input: PlannerInputEnvelopeV2 = {
    nodes: [
      { nodeId: 'model.stg_orders', resourceType: 'model', dependsOn: [] },
      { nodeId: 'model.fct_orders', resourceType: 'model', dependsOn: ['model.stg_orders'] },
      { nodeId: 'test.fct_orders_not_null', resourceType: 'test', dependsOn: ['model.fct_orders'] },
    ],
    selection: { selectedNodeIds: ['test.fct_orders_not_null'], includeUpstream: true },
    policies: {
      stepTimeoutMs: 60_000,
      retries: { maxAttempts: 3, backoffMs: 500 },
      concurrency: { maxInFlight: 64 },
      custom: { warehouse: 'WH_XS' },
    },
    observability: {
      tags: { tenant: 'acme', env: 'prod' },
      extra: { dbtInvocationId: 'abc-123' },
    },
    requestedBy: 'user-1',
    requestId: 'req-1',
  };

  const { plan, canonicalPlanJson } = await planner.buildPlan(input);
  console.log(plan.metadata.planId);
  console.log(canonicalPlanJson.length);
}

void main();
```

## packages/@dvt/planner/examples/generic-pipeline.ts

```ts
import { Planner } from '../src/domain/Planner.js';
import type {
  PlannerInputEnvelopeV2,
  StepFactory,
  GraphNode,
  ResolvedPolicies,
} from '../src/domain/types.js';

const genericStepFactory: StepFactory = (node: GraphNode, resolved: ResolvedPolicies) => {
  // Example: use arbitrary kind and pass custom config
  return {
    stepId: node.nodeId,
    kind: node.resourceType, // e.g. EXTRACT / TRANSFORM / LOAD
    dependsOn: node.dependsOn,
    stepTypeConfig: {
      timeoutMs: resolved.stepTimeoutMs,
      retries: resolved.retries,
      custom: resolved.custom,
    },
  };
};

async function main(): Promise<void> {
  const planner = new Planner({
    stepFactory: genericStepFactory,
    limits: { maxNodes: 10_000, timeoutMs: 10_000 },
  });

  const input: PlannerInputEnvelopeV2 = {
    nodes: [
      { nodeId: 'extract.s3', resourceType: 'EXTRACT', dependsOn: [] },
      { nodeId: 'transform.clean', resourceType: 'TRANSFORM', dependsOn: ['extract.s3'] },
      { nodeId: 'load.warehouse', resourceType: 'LOAD', dependsOn: ['transform.clean'] },
    ],
    selection: { selectedNodeIds: ['load.warehouse'], includeUpstream: true },
    policies: {
      stepTimeoutMs: 30_000,
      retries: { maxAttempts: 2, backoffMs: 200 },
      custom: { dataset: 'events', tenant: 'lab' },
    },
    observability: { tags: { tenant: 'lab' }, extra: { domain: 'generic-pipeline' } },
  };

  const { plan } = await planner.buildPlan(input);
  console.log(plan.metadata.planId);
}

void main();
```

---

# Tests

## packages/@dvt/planner/test/vectors/fixed-vector.json

```json
{
  "nodes": [
    { "nodeId": "model.a", "resourceType": "model", "dependsOn": [] },
    { "nodeId": "model.b", "resourceType": "model", "dependsOn": ["model.a"] }
  ],
  "selection": {
    "selectedNodeIds": ["model.b"],
    "includeUpstream": true
  },
  "policies": {
    "stepTimeoutMs": 60000,
    "retries": { "maxAttempts": 3, "backoffMs": 1000 }
  },
  "observability": {
    "tags": { "tenant": "test" }
  },
  "requestedBy": "user",
  "requestId": "req-1",
  "requestedAtIso": "2026-02-24T00:00:00.000Z"
}
```

## packages/@dvt/planner/test/vectors/fixed-vector.inline.ts

```ts
import type { PlannerInputEnvelopeV2 } from '../../src/domain/types.js';

export const FIXED_VECTOR: PlannerInputEnvelopeV2 = {
  nodes: [
    { nodeId: 'model.a', resourceType: 'model', dependsOn: [] },
    { nodeId: 'model.b', resourceType: 'model', dependsOn: ['model.a'] },
  ],
  selection: { selectedNodeIds: ['model.b'], includeUpstream: true },
  policies: {
    stepTimeoutMs: 60_000,
    retries: { maxAttempts: 3, backoffMs: 1_000 },
  },
  observability: { tags: { tenant: 'test' } },
  requestedBy: 'user',
  requestId: 'req-1',
  requestedAtIso: '2026-02-24T00:00:00.000Z',
};
```

---

## packages/@dvt/planner/test/unit/determinism.test.ts

```ts
import { describe, it, expect } from 'vitest';
import { Planner } from '../../src/domain/Planner.js';
import type { PlannerInputEnvelopeV2 } from '../../src/domain/types.js';
import { createHash } from 'node:crypto';
import { FIXED_VECTOR } from '../vectors/fixed-vector.inline.js';

/** Helper: sha256 sync for test verification (do not use in planner). */
function sha256Sync(text: string): string {
  return createHash('sha256').update(text, 'utf8').digest('hex');
}

describe('determinism', () => {
  it('produces stable planId for same semantic input, ignoring volatile fields and observability', async () => {
    const planner = new Planner();

    const base: PlannerInputEnvelopeV2 = {
      nodes: [
        { nodeId: 'model.a', resourceType: 'model', dependsOn: [] },
        { nodeId: 'model.b', resourceType: 'model', dependsOn: ['model.a'] },
      ],
      selection: { selectedNodeIds: ['model.b'], includeUpstream: true },
      policies: { custom: { x: 1 } },
      observability: { tags: { t: '1' }, extra: { y: 'z' } },
      requestedBy: 'u1',
      requestId: 'r1',
    };

    const a = await planner.buildPlan({ ...base, requestedBy: 'u1', requestId: 'r1' });
    const b = await planner.buildPlan({ ...base, requestedBy: 'u2', requestId: 'r2' });

    expect(a.plan.metadata.planId).toEqual(b.plan.metadata.planId);
    expect(a.plan.metadata.inputHashSha256).toEqual(b.plan.metadata.inputHashSha256);

    // Different observability -> same planId
    const c = await planner.buildPlan({ ...base, observability: { tags: { t: 'DIFF' } } });
    expect(a.plan.metadata.planId).toEqual(c.plan.metadata.planId);
  });

  it('planId equals sha256(canonicalPlanJson) — caller-verifiable', async () => {
    const planner = new Planner();
    const { plan, canonicalPlanJson } = await planner.buildPlan({
      nodes: [{ nodeId: 'model.a', resourceType: 'model', dependsOn: [] }],
      selection: { selectedNodeIds: ['model.a'] },
    });

    const recomputed = sha256Sync(canonicalPlanJson);
    expect(recomputed).toBe(plan.metadata.planId);
    expect(plan.metadata.planId).toMatch(/^[a-f0-9]{64}$/);
  });

  it('canonicalPlanJson does NOT contain planId or createdAtIso', async () => {
    const planner = new Planner();
    const { canonicalPlanJson } = await planner.buildPlan({
      nodes: [{ nodeId: 'model.a', resourceType: 'model', dependsOn: [] }],
      selection: { selectedNodeIds: ['model.a'] },
    });

    const parsed = JSON.parse(canonicalPlanJson) as Record<string, unknown>;
    const meta = parsed['metadata'] as Record<string, unknown> | undefined;
    expect(meta).toBeDefined();
    expect(meta?.['planId']).toBeUndefined();
    expect(meta?.['createdAtIso']).toBeUndefined();
  });

  it('fixed vector produces expected planId', async () => {
    const BOOTSTRAP_MODE = process.env['DVT_BOOTSTRAP_VECTOR'] === '1';

    const planner = new Planner();
    const { plan } = await planner.buildPlan(FIXED_VECTOR);

    if (BOOTSTRAP_MODE) {
      // Use to capture the reference hash deterministically
      // Example:
      //   DVT_BOOTSTRAP_VECTOR=1 pnpm test -- --reporter=verbose
      // Then copy printed hash into expectedPlanId.
      // eslint-disable-next-line no-console
      console.log(`BOOTSTRAP planId: ${plan.metadata.planId}`);
      expect(plan.metadata.planId).toMatch(/^[a-f0-9]{64}$/);
      return;
    }

    const expectedPlanId = ''; // <-- set once via bootstrap
    if (expectedPlanId === '') {
      throw new Error(
        'fixed vector test not initialized: run `DVT_BOOTSTRAP_VECTOR=1 pnpm test` and set expectedPlanId.'
      );
    }
    expect(plan.metadata.planId).toBe(expectedPlanId);
  });
});
```

---

## packages/@dvt/planner/test/unit/limits.test.ts

```ts
import { describe, it, expect } from 'vitest';
import { Planner } from '../../src/domain/Planner.js';
import { PlannerError, PlannerErrorCode } from '../../src/domain/errors.js';

describe('limits', () => {
  it('enforces maxNodes on manifest', async () => {
    const planner = new Planner({ limits: { maxNodes: 1 } });

    const p = planner.buildPlan({
      nodes: [
        { nodeId: 'a', resourceType: 'model', dependsOn: [] },
        { nodeId: 'b', resourceType: 'model', dependsOn: [] },
      ],
      selection: { selectedNodeIds: ['a'] },
    });

    await expect(p).rejects.toBeInstanceOf(PlannerError);
    await expect(p).rejects.toMatchObject({ code: PlannerErrorCode.LIMIT_EXCEEDED });
  });

  it('enforces maxPlanSizeBytes', async () => {
    const planner = new Planner({ limits: { maxPlanSizeBytes: 10 } }); // absurdly small

    const p = planner.buildPlan({
      nodes: [{ nodeId: 'a', resourceType: 'model', dependsOn: [] }],
      selection: { selectedNodeIds: ['a'] },
    });

    await expect(p).rejects.toMatchObject({ code: PlannerErrorCode.LIMIT_EXCEEDED });
  });
});
```

---

## packages/@dvt/planner/test/unit/graph.test.ts

```ts
import { describe, it, expect } from 'vitest';
import { Planner } from '../../src/domain/Planner.js';
import { PlannerErrorCode } from '../../src/domain/errors.js';

describe('graph', () => {
  it('rejects missing dependency references', async () => {
    const planner = new Planner();
    await expect(
      planner.buildPlan({
        nodes: [{ nodeId: 'a', resourceType: 'model', dependsOn: ['missing'] }],
        selection: { selectedNodeIds: ['a'] },
      })
    ).rejects.toMatchObject({ code: PlannerErrorCode.INVALID_INPUT });
  });

  it('detects cycle in selected subgraph', async () => {
    const planner = new Planner();
    await expect(
      planner.buildPlan({
        nodes: [
          { nodeId: 'a', resourceType: 'model', dependsOn: ['b'] },
          { nodeId: 'b', resourceType: 'model', dependsOn: ['a'] },
        ],
        selection: { selectedNodeIds: ['a', 'b'] },
      })
    ).rejects.toMatchObject({ code: PlannerErrorCode.GRAPH_CYCLE });
  });
});
```

---

## packages/@dvt/planner/test/unit/policies.test.ts

```ts
import { describe, it, expect } from 'vitest';
import { resolvePolicies } from '../../src/domain/policies.js';
import { PlannerErrorCode } from '../../src/domain/errors.js';

describe('policies', () => {
  it('applies defaults', () => {
    const p = resolvePolicies(undefined);
    expect(p.stepTimeoutMs).toBeGreaterThan(0);
    expect(p.retries.maxAttempts).toBeGreaterThan(0);
    expect(p.concurrency.maxInFlight).toBeGreaterThan(0);
  });

  it('rejects invalid timeout', () => {
    expect(() => resolvePolicies({ stepTimeoutMs: 0 })).toThrowErrorMatchingObject({
      code: PlannerErrorCode.INVALID_INPUT,
    });
  });
});
```

---

## packages/@dvt/planner/test/slow/load.test.ts

```ts
import { describe, it, expect } from 'vitest';
import { Planner } from '../../src/domain/Planner.js';

function buildLinearNodes(
  n: number
): { nodeId: string; resourceType: string; dependsOn: string[] }[] {
  const nodes: { nodeId: string; resourceType: string; dependsOn: string[] }[] = [];
  for (let i = 0; i < n; i += 1) {
    const id = `model.${i}`;
    const dependsOn = i === 0 ? [] : [`model.${i - 1}`];
    nodes.push({ nodeId: id, resourceType: 'model', dependsOn });
  }
  return nodes;
}

describe('load', () => {
  it('plans 1,000 nodes under timeout', async () => {
    const planner = new Planner({ limits: { timeoutMs: 15_000, maxNodes: 2_000 } });
    const nodes = buildLinearNodes(1_000);
    const { plan } = await planner.buildPlan({
      nodes,
      selection: { selectedNodeIds: [`model.${999}`], includeUpstream: true },
    });
    expect(plan.metadata.planId).toMatch(/^[a-f0-9]{64}$/);
  });

  it('enforces maxNodes at 5,000 when configured', async () => {
    const planner = new Planner({ limits: { maxNodes: 4_000 } });
    const nodes = buildLinearNodes(5_000);
    await expect(
      planner.buildPlan({
        nodes,
        selection: { selectedNodeIds: ['model.4999'], includeUpstream: true },
      })
    ).rejects.toBeDefined();
  });
});
```

---

## packages/@dvt/planner/test/cross-runtime.sh

```bash
#!/usr/bin/env bash
set -euo pipefail

# Cross-runtime deterministic check using the same inline vector.
# Node runs compiled JS; Bun/Deno run TS directly.

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"

echo "[1/4] build"
cd "$ROOT_DIR"
pnpm build

echo "[2/4] node"
NODE_OUT="$(node dist/test/cross-runtime-print-planid.js)"

echo "[3/4] bun"
BUN_OUT="$(bun test/cross-runtime-print-planid.ts)"

echo "[4/4] deno"
DENO_OUT="$(deno run --allow-env test/cross-runtime-print-planid.ts)"

echo "node=$NODE_OUT"
echo "bun=$BUN_OUT"
echo "deno=$DENO_OUT"

if [[ "$NODE_OUT" != "$BUN_OUT" ]]; then
  echo "Mismatch: node != bun"
  exit 1
fi
if [[ "$NODE_OUT" != "$DENO_OUT" ]]; then
  echo "Mismatch: node != deno"
  exit 1
fi

echo "OK: identical planId across runtimes"
```

> Note: The cross-runtime helper scripts are included below and are compiled into dist by `tsc`.

---

## packages/@dvt/planner/test/cross-runtime-print-planid.ts

```ts
import { Planner } from '../src/domain/Planner.js';
import { FIXED_VECTOR } from './vectors/fixed-vector.inline.js';

async function main(): Promise<void> {
  const planner = new Planner();
  const { plan } = await planner.buildPlan(FIXED_VECTOR);
  // Output just the planId (single line) for bash comparison.
  // eslint-disable-next-line no-console
  console.log(plan.metadata.planId);
}

void main();
```

---

# Documentation

## packages/@dvt/planner/docs/README.md

````md
# @dvt/planner (v2.3.1)

A pure deterministic planner that compiles a dependency graph into an immutable, content-addressed execution plan.

## Determinism guarantees

- Canonicalization: RFC 8785 JCS
- Ordering: binary comparison only
- Plan identity:

  planId = sha256(JCS(planCore))

Where:

planCore = { metadata: { planVersion, inputHashSha256 }, steps }

**Not included in the hash**:

- planId
- createdAtIso
- observability

The planner returns:

- `plan` (ExecutionPlanV2) — includes provenance fields for orchestrator usage
- `canonicalPlanJson` — exactly `JCS(planCore)`

Caller verification:

- sha256(canonicalPlanJson) === plan.metadata.planId

## Integration flow (expected orchestration)

1. Orchestrator calls `planner.buildPlan(input)`.
2. On success, orchestrator persists `canonicalPlanJson` in `execution_plans` keyed by `planId`.
3. Orchestrator bootstraps a run in the state store with:
   - planId
   - inputHashSha256
   - run metadata
4. Engine receives plan reference and executes steps, emitting run events elsewhere.

## Limits

Planner limits are configurable:

- maxNodes
- maxEdges
- maxDepth
- maxPlanSizeBytes
- timeoutMs

Example:

```ts
const planner = new Planner({ limits: { maxNodes: 10_000, timeoutMs: 10_000 } });
```
````

## Metrics

Optional injection:

```ts
const planner = new Planner({ metrics: myMetrics });
```

Metrics are callbacks and must not affect determinism.

## Extensibility (generic domains)

Use a custom StepFactory:

```ts
const planner = new Planner({ stepFactory: myFactory });
```

Planner resolves known policies and passes `policies.custom` to your factory via `ResolvedPolicies.custom`.

````

## packages/@dvt/planner/docs/MIGRATION_v2.1_to_v2.3.1.md

```md
# Migration: v2.1 -> v2.3.1

## Summary
- RFC 8785 JCS canonicalization (json-canonicalize)
- Deterministic sorting (binary compare; no localeCompare)
- Typed error taxonomy (PlannerError + codes)
- Limits enforced (maxNodes/maxEdges/maxDepth/maxPlanSizeBytes/timeoutMs)
- Extensibility: StepKind is string; StepFactory injection
- Post-review patch (v2.3.1):
  - canonicalPlanJson = JCS(planCore), not JCS(plan)
  - sha256(canonicalPlanJson) must equal planId

## Breaking behavior changes
- `canonicalPlanJson` now corresponds to `planCore` only.
- Fixed vector test requires bootstrap once to set expected hash.

## What stays backward compatible
- Default dbt behavior via dbtStepFactory
- Same selection semantics
- Same planVersion "2.3" in planCore metadata
````

---

# Contracts

## packages/@dvt/planner/docs/contracts/PlannerContracts.v2.3.1.md

```md
# Planner Contracts v2.3.1

## Identity

### planCore (hashed)

planCore = {
metadata: { planVersion: "2.3", inputHashSha256 },
steps: ExecutionStepV2[]
}

### planId

planId = sha256(JCS(planCore))

### canonicalPlanJson

canonicalPlanJson = JCS(planCore)

### Verification

sha256(canonicalPlanJson) === plan.metadata.planId

## Input hash

inputHashSha256 = sha256(JCS({
nodes,
selection,
policies
}))

Excluded:

- requestedBy
- requestId
- requestedAtIso
- observability

## Determinism constraints (MUST)

- No localeCompare.
- Sort keys and arrays deterministically using binary compare.
- No runtime-dependent ordering (Map iteration order is insertion order; avoid depending on non-deterministic insertions).

## Error taxonomy (MUST)

All thrown errors MUST be PlannerError with a valid PlannerErrorCode.

## Limits (MUST)

Planner MUST enforce:

- maxNodes on manifest and selection size
- maxEdges during graph build
- maxDepth on selected subgraph
- maxPlanSizeBytes after canonicalization
- timeoutMs via checkAbort

## Extensibility

- StepKind is string.
- Planner resolves known policies.
- Planner passes custom policies via ResolvedPolicies.custom to StepFactory.
```

## packages/@dvt/planner/docs/contracts/PlanCore.schema.json

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
      "items": { "$ref": "dvt:planner:ExecutionStepV2:v2.3.1" }
    }
  },
  "$defs": {
    "ExecutionStepV2": {
      "$id": "dvt:planner:ExecutionStepV2:v2.3.1",
      "type": "object",
      "required": ["stepId", "kind", "dependsOn"],
      "additionalProperties": false,
      "properties": {
        "stepId": { "type": "string" },
        "kind": { "type": "string" },
        "dependsOn": { "type": "array", "items": { "type": "string" } },
        "stepTypeConfig": { "type": "object", "additionalProperties": true }
      }
    }
  }
}
```

## packages/@dvt/planner/docs/contracts/ExecutionPlanV2.schema.json

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "dvt:planner:ExecutionPlanV2:v2.3.1",
  "allOf": [
    { "$ref": "dvt:planner:PlanCore:v2.3.1" },
    {
      "type": "object",
      "required": ["metadata"],
      "properties": {
        "metadata": {
          "type": "object",
          "required": ["planId", "createdAtIso"],
          "properties": {
            "planId": { "type": "string", "pattern": "^[a-f0-9]{64}$" },
            "createdAtIso": { "type": "string" }
          }
        },
        "observability": { "type": "object", "additionalProperties": true }
      }
    }
  ]
}
```

## packages/@dvt/planner/docs/contracts/PlannerInputEnvelopeV2.schema.json

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "dvt:planner:PlannerInputEnvelopeV2:v2.3.1",
  "type": "object",
  "required": ["nodes", "selection"],
  "additionalProperties": false,
  "properties": {
    "nodes": {
      "type": "array",
      "items": {
        "type": "object",
        "required": ["nodeId", "resourceType", "dependsOn"],
        "additionalProperties": false,
        "properties": {
          "nodeId": { "type": "string" },
          "resourceType": { "type": "string" },
          "dependsOn": { "type": "array", "items": { "type": "string" } }
        }
      }
    },
    "selection": {
      "type": "object",
      "required": ["selectedNodeIds"],
      "additionalProperties": false,
      "properties": {
        "selectedNodeIds": { "type": "array", "items": { "type": "string" } },
        "includeUpstream": { "type": "boolean" },
        "includeDownstream": { "type": "boolean" }
      }
    },
    "policies": { "$ref": "dvt:planner:PlannerPolicies:v2.3.1" },
    "observability": { "type": "object", "additionalProperties": true },
    "requestedBy": { "type": "string" },
    "requestId": { "type": "string" },
    "requestedAtIso": { "type": "string" }
  },
  "$defs": {
    "PlannerPolicies": {
      "$id": "dvt:planner:PlannerPolicies:v2.3.1",
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "stepTimeoutMs": { "type": "number" },
        "retries": {
          "type": "object",
          "required": ["maxAttempts", "backoffMs"],
          "additionalProperties": false,
          "properties": {
            "maxAttempts": { "type": "number" },
            "backoffMs": { "type": "number" }
          }
        },
        "concurrency": {
          "type": "object",
          "required": ["maxInFlight"],
          "additionalProperties": false,
          "properties": {
            "maxInFlight": { "type": "number" }
          }
        },
        "custom": { "type": "object", "additionalProperties": true }
      }
    }
  }
}
```

## packages/@dvt/planner/docs/contracts/PlannerPolicies.schema.json

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "dvt:planner:PlannerPolicies:v2.3.1",
  "type": "object",
  "additionalProperties": false,
  "properties": {
    "stepTimeoutMs": { "type": "number" },
    "retries": {
      "type": "object",
      "required": ["maxAttempts", "backoffMs"],
      "additionalProperties": false,
      "properties": {
        "maxAttempts": { "type": "number" },
        "backoffMs": { "type": "number" }
      }
    },
    "concurrency": {
      "type": "object",
      "required": ["maxInFlight"],
      "additionalProperties": false,
      "properties": {
        "maxInFlight": { "type": "number" }
      }
    },
    "custom": { "type": "object", "additionalProperties": true }
  }
}
```

---

# ADRs

## packages/@dvt/planner/docs/adr/ADR-0000-scope-and-compat.md

```md
# ADR-0000: Scope and Backward Compatibility

- Status: Accepted
- Version: 2.3.1

Decision:

- Planner remains a pure module.
- Default StepFactory preserves dbt behavior.
- Determinism and content addressing are first-class invariants.
```

## packages/@dvt/planner/docs/adr/ADR-0001-rfc8785-jcs.md

```md
# ADR-0001: RFC 8785 Canonicalization (JCS)

Decision:

- Use `json-canonicalize` to canonicalize JSON according to RFC 8785.
- Compute hashes from canonical JSON only.

Rationale:

- Eliminates runtime-dependent object serialization behavior.
- Provides cross-language stable canonical format.
```

## packages/@dvt/planner/docs/adr/ADR-0002-plan-core-hash.md

```md
# ADR-0002: planCore Hash Boundary

Decision:

- Define `planCore` as the only object hashed to generate planId.
- Return `canonicalPlanJson = JCS(planCore)`.

Rationale:

- Guarantees caller-verifiable plan identity.
- Allows post-hash provenance fields without changing planId.
```

## packages/@dvt/planner/docs/adr/ADR-0003-typed-errors.md

```md
# ADR-0003: Typed Error Taxonomy

Decision:

- All errors thrown by planner MUST be `PlannerError`.
- `PlannerErrorCode` enumerates error categories.

Rationale:

- Deterministic handling in orchestrator.
- Avoid brittle string matching and stage inference.
```

## packages/@dvt/planner/docs/adr/ADR-0004-security-limits.md

```md
# ADR-0004: Security Guardrails via Limits

Decision:

- Planner enforces configurable limits:
  - maxNodes, maxEdges, maxDepth, maxPlanSizeBytes, timeoutMs

Rationale:

- Protects planner against hostile or accidental oversized inputs.
- Ensures predictable resource usage.
```

## packages/@dvt/planner/docs/adr/ADR-0005-metrics.md

```md
# ADR-0005: Metrics via Optional Callback Interface

Decision:

- Planner accepts optional `metrics` callbacks.
- Metrics are not part of hash inputs and must not affect determinism.

Rationale:

- Observability without side effects in planner core.
```

## packages/@dvt/planner/docs/adr/ADR-0006-extensibility.md

```md
# ADR-0006: Extensibility Model

Decision:

- StepKind is `string`.
- Step creation via injected `StepFactory`.
- Policies include `custom` passthrough without interpretation.

Rationale:

- Planner supports domains beyond dbt without modifying core.
- Keeps default dbt behavior via dbtStepFactory.
```

---

# Checklist (v2.3.1 + contracts)

- [x] RFC 8785 canonicalization (`json-canonicalize`)
- [x] No localeCompare (binary compare only)
- [x] planId derived from `planCore` only
- [x] `canonicalPlanJson = JCS(planCore)` (caller verifiable)
- [x] Typed errors (PlannerError + codes)
- [x] Limits enforced (nodes, edges, depth, plan size, timeout)
- [x] Metrics interface + no-op default
- [x] Extensibility via StepFactory + StepKind string
- [x] Cross-runtime script
- [x] Contracts (markdown + JSON Schemas)
- [x] ADR set updated

---

END OF DOCUMENT
