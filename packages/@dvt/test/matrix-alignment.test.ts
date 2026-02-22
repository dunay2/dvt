// test/compat/matrix-alignment.test.ts
// Contract test: code ↔ governance artifact
//
// Goals:
// - plan-compat.json matches plan-compat.schema.json
// - adapters' declared supported schema is represented in plan-compat.json
// - drift fails CI (code changed but JSON not updated or vice versa)
//
// Design:
// - Generalization note: replicate the adapter block per adapter, or iterate adapters via a registry.
// - The negative-check list can be derived (e.g., from known schema versions), but start with an explicit list.
// - Each adapter exports ADAPTER_SUPPORTED_SCHEMA from a single module, e.g.
//   packages/@dvt/adapter-temporal/src/versioning.ts, which is imported by both the adapter implementation and this test.
// - The test imports those constants and checks plan-compat.json accordingly.
// - This is intentionally a "contract test" (not just JSON Schema validation).

import fs from 'node:fs';
import path from 'node:path';

import Ajv from 'ajv';
import { it, expect } from 'vitest';

// ADAPTER_SUPPORTED_SCHEMA is added to versioning.ts as part of ADR-0017 implementation.
// Shape: { major: number; minor: number } — e.g. { major: 1, minor: 1 }
import { ADAPTER_SUPPORTED_SCHEMA as TEMPORAL_SUPPORTED } from '../adapter-temporal/src/versioning.ts';

type CompatMatrix = {
  schema: 'ExecutionPlan';
  versions: Array<{
    version: string; // v<major>.<minor>
    adapters: Record<string, boolean>;
  }>;
};

function loadJson(p: string): unknown {
  return JSON.parse(fs.readFileSync(p, 'utf-8'));
}

it('plan-compat.json conforms to plan-compat.schema.json', () => {
  const ajv = new Ajv({ allErrors: true, strict: true });
  const schema = loadJson(path.resolve('contracts/compat/plan-compat.schema.json'));
  const data = loadJson(path.resolve('contracts/compat/plan-compat.json'));

  const validate = ajv.compile(schema as any);
  const ok = validate(data);
  expect(ok).toBe(true);
});

it('TemporalAdapter support matches plan-compat.json', () => {
  const matrix = loadJson(path.resolve('contracts/compat/plan-compat.json')) as CompatMatrix;
  const supported = TEMPORAL_SUPPORTED; // { major: 1, minor: 1 }

  // Positive checks: all minor versions up to supported.minor must be declared true.
  for (let minor = 0; minor <= supported.minor; minor++) {
    const v = `v${supported.major}.${minor}`;
    const row = matrix.versions.find((r) => r.version === v);
    expect(row).toBeTruthy();
    expect(row!.adapters['TemporalAdapter']).toBe(true);
  }

  // Negative checks:
  // If a row exists for an unsupported version, it MUST be explicitly false for this adapter.
  // (We allow absence of the row as "not declared / not supported".)
  const unsupported = ['v1.2', 'v1.3', 'v2.0'];
  for (const v of unsupported) {
    const row = matrix.versions.find((r) => r.version === v);
    if (row) {
      expect(row.adapters['TemporalAdapter']).toBe(false);
    }
  }
});
