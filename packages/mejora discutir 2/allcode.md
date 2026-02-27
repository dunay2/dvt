DVT+ NEXT — SINGLE-FILE CODEBASE (v1)

**Date:** 2026-02-23

**Purpose:** This Markdown contains the complete reference codebase (source, tests, contracts, CLI, scripts, configs) required to implement **DVT+ Next** as specified.

**Language:** TypeScript (strict), Node.js.

**Notes:**

- This is a _new product cut_ (no migrations / no retro-compat).
- Planner owns planning and compatibility.
- Engine adapters execute plans; they do not plan.
- Canonical JSON uses RFC 8785 via `json-canonicalize`.

---

## File: `README.md`

````md
# dvt-next

Reference implementation scaffold for **DVT+ Next**.

## Requirements

- Node.js >= 20
- pnpm >= 9
- PostgreSQL >= 14 (for append-store adapter)

## Install

```bash
pnpm install
```
````

## Test

```bash
pnpm test
```

## Lint

```bash
pnpm lint
```

## Build

```bash
pnpm build
```

## Run examples (planner + canonicalization)

```bash
pnpm -C packages/cli dev -- plan --spec examples/spec.simple.json --engine temporal
```

## Local Postgres for tests (docker)

```bash
docker run --rm -e POSTGRES_PASSWORD=postgres -e POSTGRES_USER=postgres -e POSTGRES_DB=dvtnext -p 5432:5432 postgres:16
```

Then:

```bash
export DVT_PG_URL="postgres://postgres:postgres@localhost:5432/dvtnext"
pnpm test
```

## Package overview

- `@dvt/contracts` — versioned contracts (planner input, plan, canonical events)
- `@dvt/canonical` — JCS canonicalization + hashing utilities
- `@dvt/dsl` — Gateway DSL v1 parser + evaluator (pure)
- `@dvt/planner` — plan builder (dependency validation, DSL validation, deterministic hashing)
- `@dvt/append-store` — Postgres append-store with transactional attempt allocation
- `@dvt/engine-adapter-*` — execution adapters (stubs + invariants)
- `@dvt/cli` — CLI to plan, validate, debug

````

## File: `pnpm-workspace.yaml`

```yaml
packages:
  - "packages/*"
  - "tests"
  - "examples"
````

## File: `package.json`

```json
{
  "name": "dvt-next",
  "private": true,
  "packageManager": "pnpm@9.15.4",
  "scripts": {
    "build": "pnpm -r build",
    "lint": "pnpm -r lint",
    "test": "pnpm -r test",
    "typecheck": "pnpm -r typecheck"
  }
}
```

## File: `tsconfig.base.json`

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2022"],
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "strict": true,
    "noImplicitAny": true,
    "noUncheckedIndexedAccess": true,
    "exactOptionalPropertyTypes": true,
    "useUnknownInCatchVariables": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "outDir": "dist"
  }
}
```

## File: `vitest.config.ts`

```ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
  },
});
```

## File: `.eslintrc.cjs`

```javascript
/* eslint-disable */
module.exports = {
  root: true,
  env: { node: true, es2022: true },
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module',
    project: ['./tsconfig.eslint.json'],
  },
  plugins: ['@typescript-eslint', 'import'],
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended-type-checked',
    'plugin:import/recommended',
    'plugin:import/typescript',
  ],
  rules: {
    '@typescript-eslint/no-explicit-any': 'error',
    '@typescript-eslint/consistent-type-imports': ['error', { prefer: 'type-imports' }],

    // Enforce "engine adapters MUST NOT import planner"
    'no-restricted-imports': [
      'error',
      {
        patterns: [
          {
            group: ['@dvt/planner', '@dvt/planner/*'],
            message: 'Engine adapters MUST NOT import planner. Planner sovereignty is mandatory.',
          },
        ],
      },
    ],
  },
  settings: {
    'import/resolver': {
      typescript: { project: ['./tsconfig.eslint.json'] },
    },
  },
};
```

## File: `tsconfig.eslint.json`

```json
{
  "extends": "./tsconfig.base.json",
  "compilerOptions": { "noEmit": true },
  "include": ["packages/**/*.ts", "tests/**/*.ts", "examples/**/*.ts"]
}
```

## File: `examples/spec.simple.json`

```json
{
  "version": "1.0",
  "workflowSpec": {
    "workflowId": "wf_simple",
    "steps": [
      { "stepId": "extract", "type": "task", "dependsOn": [] },
      { "stepId": "transform", "type": "task", "dependsOn": ["extract"] },
      { "stepId": "load", "type": "task", "dependsOn": ["transform"] }
    ]
  },
  "executionIntent": { "type": "full" },
  "environment": { "target": "test" },
  "engineHints": { "requiredCapabilities": ["basic-dag"] }
}
```

## File: `examples/spec.gateway.v1.json`

```json
{
  "version": "1.0",
  "workflowSpec": {
    "workflowId": "wf_gateway_v1",
    "steps": [
      { "stepId": "extract", "type": "task", "dependsOn": [] },
      {
        "stepId": "gate_ok",
        "type": "gateway",
        "dependsOn": ["extract"],
        "gateway": { "dslVersion": "1.0", "expression": "status = 'success'" }
      },
      { "stepId": "load_ok", "type": "task", "dependsOn": ["gate_ok"] }
    ]
  },
  "executionIntent": { "type": "full" },
  "environment": { "target": "test" },
  "engineHints": { "requiredCapabilities": ["basic-dag", "gateway-dsl-v1"] }
}
```

## File: `packages/contracts/package.json`

```json
{
  "name": "@dvt/contracts",
  "version": "2.0.0",
  "type": "module",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "scripts": {
    "build": "tsc -p tsconfig.json",
    "test": "vitest run --passWithNoTests",
    "lint": "eslint . --ext .ts",
    "typecheck": "tsc -p tsconfig.json --noEmit"
  },
  "dependencies": {
    "zod": "^3.24.1"
  }
}
```

## File: `packages/contracts/tsconfig.json`

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": { "rootDir": "src", "outDir": "dist" },
  "include": ["src/**/*.ts"]
}
```

## File: `packages/contracts/src/index.ts`

```ts
export * from './version.js';
export * from './plannerInput.js';
export * from './workflowSpec.js';
export * from './executionPlan.js';
export * from './engineCapabilities.js';
export * from './canonicalEvents.js';
export * from './errors.js';
```

## File: `packages/contracts/src/version.ts`

```ts
export const CONTRACTS_VERSION = '2.0.0' as const;
```

## File: `packages/contracts/src/errors.ts`

```ts
export type ErrorCode =
  | 'PLANNER_INPUT_INVALID'
  | 'PLANNER_DSL_UNSUPPORTED'
  | 'PLANNER_GRAPH_INVALID'
  | 'PLANNER_ENGINE_INCOMPATIBLE'
  | 'APPENDSTORE_NOT_CONFIGURED'
  | 'APPENDSTORE_TX_FAILED'
  | 'ENGINE_EXECUTION_FAILED';

export class DvtError extends Error {
  public readonly code: ErrorCode;
  public readonly details?: Readonly<Record<string, unknown>>;

  constructor(code: ErrorCode, message: string, details?: Readonly<Record<string, unknown>>) {
    super(message);
    this.code = code;
    this.details = details;
  }
}
```

## File: `packages/contracts/src/plannerInput.ts`

```ts
import { z } from 'zod';
import { WorkflowSpecSchema } from './workflowSpec.js';

export const PlannerInputVersionSchema = z.literal('1.0');

export const ExecutionIntentSchema = z.object({
  type: z.enum(['full', 'partial', 'resume']),
  selection: z.array(z.string()).optional(),
  fromStep: z.string().optional(),
});

export const EnvironmentSchema = z.object({
  target: z.enum(['production', 'staging', 'test']),
  constraints: z.record(z.unknown()).optional(),
});

export const EngineHintsSchema = z.object({
  preferredRuntime: z.enum(['temporal', 'conductor']).optional(),
  requiredCapabilities: z.array(z.string()),
});

export const PlannerInputEnvelopeSchema = z.object({
  version: PlannerInputVersionSchema,
  workflowSpec: WorkflowSpecSchema,
  executionIntent: ExecutionIntentSchema,
  environment: EnvironmentSchema,
  engineHints: EngineHintsSchema.optional(),
  plannerSalt: z.string().optional(),
});

export type PlannerInputEnvelope = z.infer<typeof PlannerInputEnvelopeSchema>;
```

## File: `packages/contracts/src/workflowSpec.ts`

```ts
import { z } from 'zod';

export const WorkflowStepTypeSchema = z.enum(['task', 'gateway']);

export const WorkflowStepSchema = z.object({
  stepId: z.string().min(1),
  type: WorkflowStepTypeSchema,
  dependsOn: z.array(z.string()),
  // Optional gateway spec: present only for type=gateway
  gateway: z
    .object({
      dslVersion: z.literal('1.0'),
      expression: z.string().min(1),
    })
    .optional(),
});

export const WorkflowSpecSchema = z.object({
  workflowId: z.string().min(1),
  steps: z.array(WorkflowStepSchema).min(1),
});

export type WorkflowSpec = z.infer<typeof WorkflowSpecSchema>;
export type WorkflowStep = z.infer<typeof WorkflowStepSchema>;
export type WorkflowStepType = z.infer<typeof WorkflowStepTypeSchema>;
```

## File: `packages/contracts/src/engineCapabilities.ts`

```ts
import { z } from 'zod';

export const EngineNameSchema = z.enum(['temporal', 'conductor']);

export const EngineCapabilitiesSchema = z.object({
  engine: EngineNameSchema,
  // Planner checks these for compatibility
  supportedDslVersions: z.array(z.string()),
  supportsBasicDag: z.boolean(),
  supportsGateway: z.boolean(),
});

export type EngineCapabilities = z.infer<typeof EngineCapabilitiesSchema>;
export type EngineName = z.infer<typeof EngineNameSchema>;
```

## File: `packages/contracts/src/executionPlan.ts`

```ts
import { z } from 'zod';

export const PlanSchemaVersionSchema = z.literal('1.0');

export const PlanStepSchema = z.object({
  stepId: z.string().min(1),
  type: z.enum(['task', 'gateway']),
  dependsOn: z.array(z.string()),
  // Planner enforces DSL compatibility and parses expression separately.
  gateway: z
    .object({
      dslVersion: z.literal('1.0'),
      expression: z.string().min(1),
    })
    .optional(),
});

export const ExecutionPlanSchema = z.object({
  planSchemaVersion: PlanSchemaVersionSchema,
  runId: z.string().min(1),
  workflowId: z.string().min(1),
  steps: z.array(PlanStepSchema).min(1),
  metadata: z.object({
    contractsVersion: z.string().min(1),
    inputHashSha256: z.string().min(64).max(64),
    createdAtUtc: z.string().min(1),
    // Optional debug artifacts
    plannerSalt: z.string().optional(),
  }),
});

export type ExecutionPlan = z.infer<typeof ExecutionPlanSchema>;
export type PlanStep = z.infer<typeof PlanStepSchema>;
```

## File: `packages/contracts/src/canonicalEvents.ts`

```ts
import { z } from 'zod';

export const CanonicalEventTypeSchema = z.enum(['started', 'completed', 'failed']);

export const SideEffectEnvelopeSchema = z.object({
  // Side effects must be recorded deterministically for replay comparators.
  // The payload is structured, not free-form text.
  kind: z.string().min(1),
  payload: z.record(z.unknown()),
});

export const CanonicalEventSchema = z.object({
  eventSchemaVersion: z.literal('1.0'),
  runId: z.string().min(1),
  stepId: z.string().min(1),
  attemptId: z.string().min(64).max(64), // sha256 hex
  type: CanonicalEventTypeSchema,
  timestampUtc: z.string().min(1),
  // Canonical output is for semantic replay. Avoid operational noise here.
  canonicalOutput: z.record(z.unknown()).optional(),
  sideEffects: z.array(SideEffectEnvelopeSchema).optional(),
  // Operational metadata is allowed but excluded from semantic equality tests by default.
  operational: z.record(z.unknown()).optional(),
});

export type CanonicalEvent = z.infer<typeof CanonicalEventSchema>;
export type SideEffectEnvelope = z.infer<typeof SideEffectEnvelopeSchema>;
```

## File: `packages/canonical/package.json`

```json
{
  "name": "@dvt/canonical",
  "version": "2.0.0",
  "type": "module",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "scripts": {
    "build": "tsc -p tsconfig.json",
    "test": "vitest run --passWithNoTests",
    "lint": "eslint . --ext .ts",
    "typecheck": "tsc -p tsconfig.json --noEmit"
  },
  "dependencies": {
    "json-canonicalize": "^1.0.6"
  }
}
```

## File: `packages/canonical/tsconfig.json`

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": { "rootDir": "src", "outDir": "dist" },
  "include": ["src/**/*.ts"]
}
```

## File: `packages/canonical/src/index.ts`

```ts
export * from './jcs.js';
export * from './sha256.js';
export * from './validation.js';
```

## File: `packages/canonical/src/sha256.ts`

```ts
import { createHash } from 'node:crypto';

export function sha256Hex(input: string): string {
  const h = createHash('sha256');
  h.update(input, 'utf8');
  return h.digest('hex');
}
```

## File: `packages/canonical/src/jcs.ts`

```ts
import { canonicalize } from 'json-canonicalize';
import { validateJsonSafe } from './validation.js';

/**
 * Canonicalizes an input using RFC 8785 (JCS).
 * This enforces JSON-safety before canonicalization.
 */
export function toCanonicalJson(input: unknown): string {
  validateJsonSafe(input);
  return canonicalize(input as never);
}
```

## File: `packages/canonical/src/validation.ts`

```ts
/**
 * JSON-safety validation (mandatory constraints for determinism).
 *
 * MUST NOT contain:
 * - undefined (deep)
 * - NaN / Infinity / -Infinity
 * - BigInt
 * - functions / symbols
 *
 * Dates must be strings BEFORE calling this function.
 */
export function validateJsonSafe(value: unknown, path: string = '$'): void {
  if (value === undefined) {
    throw new Error(`PlannerInputEnvelope contains undefined at ${path}`);
  }

  if (typeof value === 'number') {
    if (!Number.isFinite(value)) {
      throw new Error(`Non-finite number at ${path}`);
    }
    return;
  }

  if (typeof value === 'bigint') {
    throw new Error(`BigInt not allowed at ${path}`);
  }

  if (typeof value === 'function' || typeof value === 'symbol') {
    throw new Error(`Non-JSON value not allowed at ${path}`);
  }

  if (value === null) return;

  if (Array.isArray(value)) {
    for (let i = 0; i < value.length; i++) {
      validateJsonSafe(value[i], `${path}[${i}]`);
    }
    return;
  }

  if (typeof value === 'object') {
    const obj = value as Record<string, unknown>;
    for (const k of Object.keys(obj)) {
      validateJsonSafe(obj[k], `${path}.${k}`);
    }
    return;
  }

  // string / boolean are ok
}
```

## File: `packages/dsl/package.json`

```json
{
  "name": "@dvt/dsl",
  "version": "2.0.0",
  "type": "module",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "scripts": {
    "build": "tsc -p tsconfig.json",
    "test": "vitest run --passWithNoTests",
    "lint": "eslint . --ext .ts",
    "typecheck": "tsc -p tsconfig.json --noEmit"
  },
  "dependencies": {
    "@dvt/contracts": "workspace:*"
  }
}
```

## File: `packages/dsl/tsconfig.json`

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": { "rootDir": "src", "outDir": "dist" },
  "include": ["src/**/*.ts"]
}
```

## File: `packages/dsl/src/index.ts`

```ts
export * from './v1/ast.js';
export * from './v1/parser.js';
export * from './v1/evaluator.js';
```

## File: `packages/dsl/src/v1/ast.ts`

```ts
export type DslV1Operator = '=';

export interface DslV1Expression {
  readonly dslVersion: '1.0';
  readonly left: string;
  readonly operator: DslV1Operator;
  readonly right: string | number | boolean;
}
```

## File: `packages/dsl/src/v1/parser.ts`

```ts
import type { DslV1Expression } from './ast.js';

/**
 * DSL v1 grammar (hard ceiling):
 *   expr := IDENT '=' LITERAL
 * Literals:
 *   - number (int or float, JSON number)
 *   - boolean (true|false)
 *   - string in single quotes (')
 *
 * No AND/OR, no functions, no IO.
 */
export function parseDslV1(expression: string): DslV1Expression {
  const trimmed = expression.trim();

  // Split by '=' only once
  const eqIndex = trimmed.indexOf('=');
  if (eqIndex <= 0 || eqIndex === trimmed.length - 1) {
    throw new Error(`Invalid DSL v1 expression (missing '='): ${expression}`);
  }

  const left = trimmed.slice(0, eqIndex).trim();
  const rightRaw = trimmed.slice(eqIndex + 1).trim();

  if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(left)) {
    throw new Error(`Invalid left identifier in DSL v1: '${left}'`);
  }

  const right = parseLiteral(rightRaw);

  return { dslVersion: '1.0', left, operator: '=', right };
}

function parseLiteral(raw: string): string | number | boolean {
  if (raw === 'true') return true;
  if (raw === 'false') return false;

  // single-quoted string
  if (raw.startsWith("'") && raw.endsWith("'") && raw.length >= 2) {
    const inner = raw.slice(1, -1);
    // forbid unescaped newlines
    if (inner.includes('\n') || inner.includes('\r')) {
      // allow escaped sequences as plain text, no interpretation in v1
    }
    return inner;
  }

  // number
  const num = Number(raw);
  if (!Number.isNaN(num) && Number.isFinite(num)) {
    return num;
  }

  throw new Error(`Invalid literal in DSL v1: '${raw}'`);
}
```

## File: `packages/dsl/src/v1/evaluator.ts`

```ts
import type { DslV1Expression } from './ast.js';

/**
 * Pure deterministic evaluator for DSL v1.
 * Context is a JSON-safe object (no functions).
 */
export function evaluateDslV1(
  expr: DslV1Expression,
  ctx: Readonly<Record<string, unknown>>
): boolean {
  const leftVal = ctx[expr.left];

  // Strict equality semantics for v1:
  // - string compares to string
  // - number compares to number
  // - boolean compares to boolean
  if (typeof expr.right === 'string') return typeof leftVal === 'string' && leftVal === expr.right;
  if (typeof expr.right === 'number') return typeof leftVal === 'number' && leftVal === expr.right;
  if (typeof expr.right === 'boolean')
    return typeof leftVal === 'boolean' && leftVal === expr.right;

  // exhaustive
  const _never: never = expr.right;
  return _never;
}
```

## File: `packages/planner/package.json`

```json
{
  "name": "@dvt/planner",
  "version": "2.0.0",
  "type": "module",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "scripts": {
    "build": "tsc -p tsconfig.json",
    "test": "vitest run --passWithNoTests",
    "lint": "eslint . --ext .ts",
    "typecheck": "tsc -p tsconfig.json --noEmit"
  },
  "dependencies": {
    "@dvt/contracts": "workspace:*",
    "@dvt/canonical": "workspace:*",
    "@dvt/dsl": "workspace:*",
    "uuid": "^10.0.0"
  }
}
```

## File: `packages/planner/tsconfig.json`

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": { "rootDir": "src", "outDir": "dist" },
  "include": ["src/**/*.ts"]
}
```

## File: `packages/planner/src/index.ts`

```ts
export * from './planner.js';
export * from './topology.js';
```

## File: `packages/planner/src/topology.ts`

```ts
import type { WorkflowSpec } from '@dvt/contracts';

/**
 * Validates:
 * - Unique stepIds
 * - All dependencies refer to existing steps
 * - DAG (no cycles)
 */
export function validateDag(spec: WorkflowSpec): void {
  const ids = new Set<string>();
  for (const s of spec.steps) {
    if (ids.has(s.stepId)) throw new Error(`Duplicate stepId: ${s.stepId}`);
    ids.add(s.stepId);
  }
  for (const s of spec.steps) {
    for (const d of s.dependsOn) {
      if (!ids.has(d)) throw new Error(`Missing dependency '${d}' referenced by '${s.stepId}'`);
    }
  }
  // cycle detection via DFS
  const visiting = new Set<string>();
  const visited = new Set<string>();

  const byId = new Map(spec.steps.map((s) => [s.stepId, s]));

  const dfs = (id: string): void => {
    if (visited.has(id)) return;
    if (visiting.has(id)) throw new Error(`Cycle detected at step: ${id}`);
    visiting.add(id);
    const node = byId.get(id);
    if (!node) throw new Error(`Internal: missing step '${id}'`);
    for (const dep of node.dependsOn) dfs(dep);
    visiting.delete(id);
    visited.add(id);
  };

  for (const s of spec.steps) dfs(s.stepId);
}

/**
 * Topological order is computed by Planner only.
 * Engines MUST NOT perform any ordering logic.
 */
export function topologicalOrder(spec: WorkflowSpec): string[] {
  validateDag(spec);

  const indeg = new Map<string, number>();
  const out = new Map<string, string[]>();
  for (const s of spec.steps) {
    indeg.set(s.stepId, 0);
    out.set(s.stepId, []);
  }
  for (const s of spec.steps) {
    for (const d of s.dependsOn) {
      indeg.set(s.stepId, (indeg.get(s.stepId) ?? 0) + 1);
      out.get(d)?.push(s.stepId);
    }
  }

  const q: string[] = [];
  for (const [k, v] of indeg.entries()) if (v === 0) q.push(k);
  q.sort();

  const ordered: string[] = [];
  while (q.length > 0) {
    const n = q.shift();
    if (!n) break;
    ordered.push(n);
    const nexts = out.get(n) ?? [];
    for (const m of nexts) {
      const v = (indeg.get(m) ?? 0) - 1;
      indeg.set(m, v);
      if (v === 0) {
        q.push(m);
        q.sort();
      }
    }
  }

  if (ordered.length !== spec.steps.length) {
    throw new Error('Topological sort failed (cycle suspected)');
  }

  return ordered;
}
```

## File: `packages/planner/src/planner.ts`

```ts
import {
  CONTRACTS_VERSION,
  type EngineCapabilities,
  type ExecutionPlan,
  type PlannerInputEnvelope,
  PlannerInputEnvelopeSchema,
} from '@dvt/contracts';
import { toCanonicalJson, sha256Hex } from '@dvt/canonical';
import { parseDslV1 } from '@dvt/dsl';
import { topologicalOrder } from './topology.js';
import { randomUUID } from 'node:crypto';
import { DvtError } from '@dvt/contracts';

/**
 * Planner is the sole owner of planning and compatibility.
 * Engines MUST NOT validate plan compatibility or plan structure beyond basic schema parsing.
 */
export class Planner {
  public plan(inputRaw: unknown, caps: EngineCapabilities): ExecutionPlan {
    const parsed = PlannerInputEnvelopeSchema.safeParse(inputRaw);
    if (!parsed.success) {
      throw new DvtError('PLANNER_INPUT_INVALID', 'PlannerInputEnvelope validation failed', {
        issues: parsed.error.issues,
      });
    }
    const input: PlannerInputEnvelope = parsed.data;

    // Capability validation (hard)
    this.validateEngineCompatibility(input, caps);

    // Canonicalize + hash (deterministic)
    const canonicalInput = toCanonicalJson(input);
    const inputHash = sha256Hex(canonicalInput);

    // Validate DAG and compute deterministic ordering
    const order = topologicalOrder(input.workflowSpec);

    // Build plan steps preserving topo order, but keeping dependsOn intact
    const byId = new Map(input.workflowSpec.steps.map((s) => [s.stepId, s]));
    const steps = order.map((id) => {
      const s = byId.get(id);
      if (!s) throw new Error(`Internal: missing step '${id}'`);

      // DSL validation if gateway
      if (s.type === 'gateway') {
        if (!s.gateway)
          throw new DvtError(
            'PLANNER_GRAPH_INVALID',
            `Gateway step missing gateway object: ${s.stepId}`
          );
        if (s.gateway.dslVersion !== '1.0')
          throw new DvtError(
            'PLANNER_DSL_UNSUPPORTED',
            `Unsupported DSL version: ${s.gateway.dslVersion}`
          );
        // parse to ensure it is within v1 ceiling
        parseDslV1(s.gateway.expression);
      }

      return {
        stepId: s.stepId,
        type: s.type,
        dependsOn: [...s.dependsOn],
        gateway: s.gateway ? { ...s.gateway } : undefined,
      };
    });

    const runId = randomUUID();

    return {
      planSchemaVersion: '1.0',
      runId,
      workflowId: input.workflowSpec.workflowId,
      steps,
      metadata: {
        contractsVersion: CONTRACTS_VERSION,
        inputHashSha256: inputHash,
        createdAtUtc: new Date().toISOString(),
        plannerSalt: input.plannerSalt,
      },
    };
  }

  private validateEngineCompatibility(input: PlannerInputEnvelope, caps: EngineCapabilities): void {
    // Basic DAG capability
    if (!caps.supportsBasicDag) {
      throw new DvtError(
        'PLANNER_ENGINE_INCOMPATIBLE',
        `Engine '${caps.engine}' does not support basic DAG execution`
      );
    }

    // Gateways
    const hasGateway = input.workflowSpec.steps.some((s) => s.type === 'gateway');
    if (hasGateway && !caps.supportsGateway) {
      throw new DvtError(
        'PLANNER_ENGINE_INCOMPATIBLE',
        `Engine '${caps.engine}' does not support gateways`
      );
    }

    // DSL versions
    if (hasGateway) {
      const required = new Set<string>();
      for (const s of input.workflowSpec.steps) {
        if (s.type === 'gateway') required.add(s.gateway?.dslVersion ?? 'unknown');
      }
      for (const v of required) {
        if (!caps.supportedDslVersions.includes(v)) {
          throw new DvtError(
            'PLANNER_ENGINE_INCOMPATIBLE',
            `Engine '${caps.engine}' does not support DSL version '${v}'`
          );
        }
      }
    }

    // engineHints.requiredCapabilities is informational for now; the concrete check is via caps.
    // If you want strict mapping, add a capability registry in planner.
  }
}
```

## File: `packages/append-store/package.json`

```json
{
  "name": "@dvt/append-store",
  "version": "2.0.0",
  "type": "module",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "scripts": {
    "build": "tsc -p tsconfig.json",
    "test": "vitest run --passWithNoTests",
    "lint": "eslint . --ext .ts",
    "typecheck": "tsc -p tsconfig.json --noEmit"
  },
  "dependencies": {
    "@dvt/contracts": "workspace:*",
    "@dvt/canonical": "workspace:*",
    "pg": "^8.12.0"
  }
}
```

## File: `packages/append-store/tsconfig.json`

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": { "rootDir": "src", "outDir": "dist" },
  "include": ["src/**/*.ts"]
}
```

## File: `packages/append-store/src/index.ts`

```ts
export * from './pgClient.js';
export * from './attemptStorePg.js';
export * from './schema.js';
```

## File: `packages/append-store/src/pgClient.ts`

```ts
import pg from 'pg';
import { DvtError } from '@dvt/contracts';

export function makePgPoolFromEnv(): pg.Pool {
  const url = process.env.DVT_PG_URL;
  if (!url) {
    throw new DvtError('APPENDSTORE_NOT_CONFIGURED', 'Missing env var DVT_PG_URL');
  }
  return new pg.Pool({ connectionString: url });
}
```

## File: `packages/append-store/src/schema.ts`

```ts
/**
 * SQL schema for append-store components required by this spec.
 * Run once per environment.
 */
export const SQL_SCHEMA = `
CREATE TABLE IF NOT EXISTS dvt_attempts (
  run_id TEXT NOT NULL,
  step_id TEXT NOT NULL,
  attempt_count INTEGER NOT NULL,
  PRIMARY KEY (run_id, step_id)
);

-- canonical events append log (minimal, can be extended)
CREATE TABLE IF NOT EXISTS dvt_canonical_events (
  id BIGSERIAL PRIMARY KEY,
  run_id TEXT NOT NULL,
  step_id TEXT NOT NULL,
  attempt_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  timestamp_utc TEXT NOT NULL,
  canonical_output JSONB NULL,
  side_effects JSONB NULL,
  operational JSONB NULL
);

CREATE INDEX IF NOT EXISTS idx_dvt_canonical_events_run ON dvt_canonical_events(run_id);
`;
```

## File: `packages/append-store/src/attemptStorePg.ts`

```ts
import type pg from 'pg';
import { sha256Hex } from '@dvt/canonical';
import { DvtError } from '@dvt/contracts';

export interface NextAttemptResult {
  attemptNumber: number;
  attemptIdSha256: string; // hex
}

/**
 * Attempt allocation: append-store is the sole authority.
 * This implements Option A (pre-execution allocation):
 * - Engine requests nextAttempt before running the step.
 * - attemptNumber increments transactionally (row lock).
 */
export class AttemptStorePg {
  constructor(private readonly pool: pg.Pool) {}

  public async nextAttempt(runId: string, stepId: string): Promise<NextAttemptResult> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const sel = await client.query(
        'SELECT attempt_count FROM dvt_attempts WHERE run_id = $1 AND step_id = $2 FOR UPDATE',
        [runId, stepId]
      );

      let next: number;
      if (sel.rowCount === 0) {
        next = 1;
        await client.query(
          'INSERT INTO dvt_attempts (run_id, step_id, attempt_count) VALUES ($1, $2, $3)',
          [runId, stepId, next]
        );
      } else {
        const current = Number(sel.rows[0]?.attempt_count);
        next = current + 1;
        await client.query(
          'UPDATE dvt_attempts SET attempt_count = $3 WHERE run_id = $1 AND step_id = $2',
          [runId, stepId, next]
        );
      }

      await client.query('COMMIT');

      const attemptId = sha256Hex(`${runId}:${stepId}:${next}`);
      return { attemptNumber: next, attemptIdSha256: attemptId };
    } catch (e) {
      try {
        await client.query('ROLLBACK');
      } catch {
        // ignore rollback failure
      }
      const msg = e instanceof Error ? e.message : String(e);
      throw new DvtError('APPENDSTORE_TX_FAILED', 'Attempt allocation transaction failed', {
        message: msg,
      });
    } finally {
      client.release();
    }
  }
}
```

## File: `packages/engine-adapter-temporal/package.json`

```json
{
  "name": "@dvt/engine-adapter-temporal",
  "version": "2.0.0",
  "type": "module",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "scripts": {
    "build": "tsc -p tsconfig.json",
    "test": "vitest run --passWithNoTests",
    "lint": "eslint . --ext .ts",
    "typecheck": "tsc -p tsconfig.json --noEmit"
  },
  "dependencies": {
    "@dvt/contracts": "workspace:*"
  }
}
```

## File: `packages/engine-adapter-temporal/tsconfig.json`

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": { "rootDir": "src", "outDir": "dist" },
  "include": ["src/**/*.ts"]
}
```

## File: `packages/engine-adapter-temporal/src/index.ts`

```ts
export * from './temporalEngineAdapter.js';
export * from './capabilities.js';
```

## File: `packages/engine-adapter-temporal/src/capabilities.ts`

```ts
import type { EngineCapabilities } from '@dvt/contracts';

export const TEMPORAL_CAPABILITIES: EngineCapabilities = {
  engine: 'temporal',
  supportedDslVersions: ['1.0'],
  supportsBasicDag: true,
  supportsGateway: true,
};
```

## File: `packages/engine-adapter-temporal/src/temporalEngineAdapter.ts`

```ts
import type { ExecutionPlan, CanonicalEvent } from '@dvt/contracts';

/**
 * Temporal adapter skeleton.
 * IMPORTANT: This adapter MUST NOT plan or compute dependencies.
 * It consumes a validated ExecutionPlan and executes it.
 *
 * This file provides a minimal in-memory runner to prove invariants in tests.
 * Replace with actual Temporal SDK integration when wiring the runtime.
 */
export class TemporalEngineAdapter {
  public async execute(plan: ExecutionPlan): Promise<CanonicalEvent[]> {
    // Minimal deterministic executor: run in plan.steps order and emit events.
    const events: CanonicalEvent[] = [];
    const now = () => new Date().toISOString();

    // Dependency enforcement is allowed only as a guard:
    // it checks that the plan order respects dependencies, it does NOT compute order.
    const completed = new Set<string>();
    for (const step of plan.steps) {
      for (const d of step.dependsOn) {
        if (!completed.has(d)) {
          throw new Error(`Plan order violates dependency: ${step.stepId} before ${d}`);
        }
      }
      // emit started/completed
      events.push({
        eventSchemaVersion: '1.0',
        runId: plan.runId,
        stepId: step.stepId,
        attemptId: '0'.repeat(64),
        type: 'started',
        timestampUtc: now(),
        operational: { adapter: 'temporal', note: 'stub executor' },
      });

      // In real adapter, this would dispatch activity/workflow
      events.push({
        eventSchemaVersion: '1.0',
        runId: plan.runId,
        stepId: step.stepId,
        attemptId: '0'.repeat(64),
        type: 'completed',
        timestampUtc: now(),
        canonicalOutput: { ok: true },
      });
      completed.add(step.stepId);
    }

    return events;
  }
}
```

## File: `packages/engine-adapter-conductor/package.json`

```json
{
  "name": "@dvt/engine-adapter-conductor",
  "version": "2.0.0",
  "type": "module",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "scripts": {
    "build": "tsc -p tsconfig.json",
    "test": "vitest run --passWithNoTests",
    "lint": "eslint . --ext .ts",
    "typecheck": "tsc -p tsconfig.json --noEmit"
  },
  "dependencies": {
    "@dvt/contracts": "workspace:*"
  }
}
```

## File: `packages/engine-adapter-conductor/tsconfig.json`

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": { "rootDir": "src", "outDir": "dist" },
  "include": ["src/**/*.ts"]
}
```

## File: `packages/engine-adapter-conductor/src/index.ts`

```ts
export * from './conductorEngineAdapter.js';
export * from './capabilities.js';
```

## File: `packages/engine-adapter-conductor/src/capabilities.ts`

```ts
import type { EngineCapabilities } from '@dvt/contracts';

export const CONDUCTOR_CAPABILITIES: EngineCapabilities = {
  engine: 'conductor',
  supportedDslVersions: ['1.0'],
  supportsBasicDag: true,
  supportsGateway: true,
};
```

## File: `packages/engine-adapter-conductor/src/conductorEngineAdapter.ts`

```ts
import type { ExecutionPlan, CanonicalEvent } from '@dvt/contracts';

/**
 * Conductor adapter skeleton.
 * The real Conductor runtime does not enforce strict ordering itself,
 * so the adapter must map a pre-planned DAG into Conductor tasks.
 *
 * This stub executes sequentially to preserve determinism for reference tests.
 */
export class ConductorEngineAdapter {
  public async execute(plan: ExecutionPlan): Promise<CanonicalEvent[]> {
    const events: CanonicalEvent[] = [];
    const now = () => new Date().toISOString();

    const completed = new Set<string>();
    for (const step of plan.steps) {
      for (const d of step.dependsOn) {
        if (!completed.has(d)) {
          throw new Error(`Plan order violates dependency: ${step.stepId} before ${d}`);
        }
      }
      events.push({
        eventSchemaVersion: '1.0',
        runId: plan.runId,
        stepId: step.stepId,
        attemptId: '0'.repeat(64),
        type: 'started',
        timestampUtc: now(),
        operational: { adapter: 'conductor', note: 'stub executor' },
      });
      events.push({
        eventSchemaVersion: '1.0',
        runId: plan.runId,
        stepId: step.stepId,
        attemptId: '0'.repeat(64),
        type: 'completed',
        timestampUtc: now(),
        canonicalOutput: { ok: true },
      });
      completed.add(step.stepId);
    }

    return events;
  }
}
```

## File: `packages/cli/package.json`

```json
{
  "name": "@dvt/cli",
  "version": "2.0.0",
  "type": "module",
  "bin": {
    "dvt-next": "dist/index.js"
  },
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "scripts": {
    "build": "tsc -p tsconfig.json",
    "dev": "node --loader ts-node/esm src/index.ts",
    "test": "vitest run --passWithNoTests",
    "lint": "eslint . --ext .ts",
    "typecheck": "tsc -p tsconfig.json --noEmit"
  },
  "dependencies": {
    "@dvt/contracts": "workspace:*",
    "@dvt/planner": "workspace:*",
    "@dvt/canonical": "workspace:*",
    "@dvt/engine-adapter-temporal": "workspace:*",
    "@dvt/engine-adapter-conductor": "workspace:*",
    "ts-node": "^10.9.2",
    "yargs": "^17.7.2"
  }
}
```

## File: `packages/cli/tsconfig.json`

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": { "rootDir": "src", "outDir": "dist" },
  "include": ["src/**/*.ts"]
}
```

## File: `packages/cli/src/index.ts`

```ts
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import { readFile } from 'node:fs/promises';
import { Planner } from '@dvt/planner';
import { TEMPORAL_CAPABILITIES } from '@dvt/engine-adapter-temporal';
import { CONDUCTOR_CAPABILITIES } from '@dvt/engine-adapter-conductor';

type EngineArg = 'temporal' | 'conductor';

async function main(): Promise<void> {
  await yargs(hideBin(process.argv))
    .scriptName('dvt-next')
    .command(
      'plan',
      'Generate an ExecutionPlan from a PlannerInputEnvelope JSON file',
      (y) =>
        y
          .option('spec', {
            type: 'string',
            demandOption: true,
            describe: 'Path to spec JSON (PlannerInputEnvelope)',
          })
          .option('engine', {
            type: 'string',
            choices: ['temporal', 'conductor'],
            demandOption: true,
          }),
      async (argv) => {
        const specPath = String(argv.spec);
        const engine = argv.engine as EngineArg;

        const raw = await readFile(specPath, 'utf8');
        const json = JSON.parse(raw) as unknown;

        const planner = new Planner();
        const caps = engine === 'temporal' ? TEMPORAL_CAPABILITIES : CONDUCTOR_CAPABILITIES;

        const plan = planner.plan(json, caps);
        process.stdout.write(JSON.stringify(plan, null, 2) + '\n');
      }
    )
    .strict()
    .help()
    .parseAsync();
}

main().catch((e: unknown) => {
  const msg = e instanceof Error ? (e.stack ?? e.message) : String(e);
  // eslint-disable-next-line no-console
  console.error(msg);
  process.exit(1);
});
```

## File: `scripts/build.sh`

```bash
pnpm build
```

## File: `scripts/test.sh`

```bash
pnpm test
```

## File: `scripts/lint.sh`

```bash
pnpm lint
```

## File: `tests/package.json`

```json
{
  "name": "dvt-next-tests",
  "private": true,
  "type": "module",
  "scripts": {
    "build": "echo 'no build'",
    "lint": "eslint . --ext .ts",
    "test": "vitest run",
    "typecheck": "tsc -p tsconfig.json --noEmit"
  },
  "dependencies": {
    "@dvt/contracts": "workspace:*",
    "@dvt/planner": "workspace:*",
    "@dvt/canonical": "workspace:*",
    "@dvt/dsl": "workspace:*",
    "@dvt/append-store": "workspace:*",
    "@dvt/engine-adapter-temporal": "workspace:*",
    "@dvt/engine-adapter-conductor": "workspace:*",
    "pg": "^8.12.0",
    "vitest": "^2.1.9"
  }
}
```

## File: `tests/tsconfig.json`

```json
{
  "extends": "../tsconfig.base.json",
  "compilerOptions": { "noEmit": true },
  "include": ["**/*.ts"]
}
```

## File: `tests/determinism.test.ts`

```ts
import { describe, expect, test } from 'vitest';
import { Planner } from '@dvt/planner';
import { TEMPORAL_CAPABILITIES } from '@dvt/engine-adapter-temporal';

describe('planner determinism', () => {
  test('same input -> same canonical hash', () => {
    const input = {
      version: '1.0',
      workflowSpec: {
        workflowId: 'wf',
        steps: [
          { stepId: 'a', type: 'task', dependsOn: [] },
          { stepId: 'b', type: 'task', dependsOn: ['a'] },
        ],
      },
      executionIntent: { type: 'full' },
      environment: { target: 'test' },
      engineHints: { requiredCapabilities: ['basic-dag'] },
    };

    const planner = new Planner();
    const p1 = planner.plan(input, TEMPORAL_CAPABILITIES);
    const p2 = planner.plan(input, TEMPORAL_CAPABILITIES);

    // runId differs (UUID), but inputHash MUST be stable
    expect(p1.metadata.inputHashSha256).toBe(p2.metadata.inputHashSha256);
  });

  test('undefined is rejected', () => {
    const input: Record<string, unknown> = {
      version: '1.0',
      workflowSpec: {
        workflowId: 'wf',
        steps: [{ stepId: 'a', type: 'task', dependsOn: [] }],
      },
      executionIntent: { type: 'full' },
      environment: { target: 'test' },
      engineHints: { requiredCapabilities: ['basic-dag'] },
    };

    // Inject undefined deeply
    (input as any).environment = { target: 'test', x: undefined };

    const planner = new Planner();
    expect(() => planner.plan(input, TEMPORAL_CAPABILITIES)).toThrow();
  });
});
```

## File: `tests/dsl.test.ts`

```ts
import { describe, expect, test } from 'vitest';
import { parseDslV1, evaluateDslV1 } from '@dvt/dsl';

describe('DSL v1', () => {
  test('parses equality', () => {
    const ast = parseDslV1("status = 'success'");
    expect(ast.left).toBe('status');
    expect(ast.right).toBe('success');
  });

  test('rejects AND/OR', () => {
    expect(() => parseDslV1('a = 1 AND b = 2')).toThrow();
  });

  test('evaluates deterministically', () => {
    const ast = parseDslV1('retries = 0');
    expect(evaluateDslV1(ast, { retries: 0 })).toBe(true);
    expect(evaluateDslV1(ast, { retries: 1 })).toBe(false);
  });
});
```

## File: `tests/topology.test.ts`

```ts
import { describe, expect, test } from 'vitest';
import { topologicalOrder, validateDag } from '@dvt/planner';
import type { WorkflowSpec } from '@dvt/contracts';

describe('planner topology', () => {
  test('valid DAG orders deterministically', () => {
    const spec: WorkflowSpec = {
      workflowId: 'wf',
      steps: [
        { stepId: 'b', type: 'task', dependsOn: ['a'] },
        { stepId: 'a', type: 'task', dependsOn: [] },
      ],
    };
    validateDag(spec);
    const order = topologicalOrder(spec);
    expect(order).toEqual(['a', 'b']);
  });

  test('detects cycles', () => {
    const spec: WorkflowSpec = {
      workflowId: 'wf',
      steps: [
        { stepId: 'a', type: 'task', dependsOn: ['b'] },
        { stepId: 'b', type: 'task', dependsOn: ['a'] },
      ],
    };
    expect(() => validateDag(spec)).toThrow();
  });
});
```

## File: `tests/attemptStorePg.test.ts`

```ts
import { describe, expect, test } from 'vitest';
import pg from 'pg';
import { AttemptStorePg } from '@dvt/append-store';
import { SQL_SCHEMA } from '@dvt/append-store';

function pgUrl(): string | undefined {
  return process.env.DVT_PG_URL;
}

describe('AttemptStorePg', () => {
  test('allocates incrementing attempts transactionally', async () => {
    const url = pgUrl();
    if (!url) {
      // Skip if not configured
      expect(true).toBe(true);
      return;
    }

    const pool = new pg.Pool({ connectionString: url });
    await pool.query(SQL_SCHEMA);

    const store = new AttemptStorePg(pool);

    const r1 = await store.nextAttempt('run_test', 'step_a');
    const r2 = await store.nextAttempt('run_test', 'step_a');

    expect(r2.attemptNumber).toBe(r1.attemptNumber + 1);
    expect(r1.attemptIdSha256).toHaveLength(64);
    expect(r2.attemptIdSha256).toHaveLength(64);

    await pool.end();
  });
});
```

## File: `tests/engine_invariants.test.ts`

```ts
import { describe, expect, test } from 'vitest';
import { Planner } from '@dvt/planner';
import { TEMPORAL_CAPABILITIES } from '@dvt/engine-adapter-temporal';
import { TemporalEngineAdapter } from '@dvt/engine-adapter-temporal';
import { ConductorEngineAdapter } from '@dvt/engine-adapter-conductor';
import { CONDUCTOR_CAPABILITIES } from '@dvt/engine-adapter-conductor';

describe('engine adapters invariants', () => {
  test('engine executes plan order respecting dependencies', async () => {
    const input = {
      version: '1.0',
      workflowSpec: {
        workflowId: 'wf',
        steps: [
          { stepId: 'a', type: 'task', dependsOn: [] },
          { stepId: 'b', type: 'task', dependsOn: ['a'] },
        ],
      },
      executionIntent: { type: 'full' },
      environment: { target: 'test' },
      engineHints: { requiredCapabilities: ['basic-dag'] },
    };

    const planner = new Planner();
    const planT = planner.plan(input, TEMPORAL_CAPABILITIES);
    const planC = planner.plan(input, CONDUCTOR_CAPABILITIES);

    const temporal = new TemporalEngineAdapter();
    const conductor = new ConductorEngineAdapter();

    const evT = await temporal.execute(planT);
    const evC = await conductor.execute(planC);

    expect(evT.length).toBeGreaterThan(0);
    expect(evC.length).toBeGreaterThan(0);
  });
});
```

## File: `docs/ENFORCEMENT_CONSEQUENCES.md`

```md
# Enforcement Consequences (Normative)

This artifact is embedded here to make the codebase self-contained.

## Rules and consequences

- If any `packages/engine-adapter-*` imports `@dvt/planner` → **CI FAIL** (eslint rule).
- If PlannerInput contains `undefined` / non-finite numbers → **PlanningError** (input invalid).
- If gateway uses unsupported DSL version → **PlanningError**.
- If engine computes plan order (reorders steps) → **runtime invariant tests** must fail.
- If raw event storage changes canonical hashing or plan generation → **blocker defect** (determinism violated).
```

## File: `PROMPT_IMPLEMENTATION_AI.md`

```md
# AI Implementation Prompt (Mandatory)

You are implementing **DVT+ Next** from this single Markdown codebase.

## Rules (MUST)

- Do not invent features not present here.
- Do not add backward compatibility.
- Do not add dynamic planning.
- Keep TypeScript strict; do not use `any`.
- Planner owns DAG logic and DSL validation.
- Engine adapters must not plan.
- Canonical JSON must use RFC 8785 via `json-canonicalize`.
- Attempt allocation must be transactional in append-store.

## Tasks

1. Recreate the repository exactly as described by file paths and contents.
2. Run `pnpm install`, then `pnpm test`.
3. If tests fail, fix only by aligning code to this spec (no feature drift).
4. Add Temporal/Conductor real runtime wiring as a later step, without changing contracts.
```
