/**
 * Schema sync verification (Stage 1.1, G-01.4).
 *
 * Validates that the hand-maintained JSON schema files in
 * `src/contracts/planner/*.schema.json` agree with the canonical Zod schemas
 * on a set of known-valid and known-invalid fixtures.
 *
 * ## How this catches drift
 *
 * If the Zod schema is updated (e.g. a field added, a constraint tightened)
 * but the JSON schema file is not updated, one of the following will fail:
 * - A fixture that Zod accepts will be rejected by the JSON schema (or vice versa).
 *
 * ## Adding new fixtures
 *
 * Add rows to `POLICY_FIXTURES` or `ENVELOPE_FIXTURES`. Each row has:
 * - `label`   — human-readable description for the failure message
 * - `input`   — the payload to validate
 * - `valid`   — expected result (true = both schemas should accept)
 */

import Ajv from 'ajv/dist/2020.js';
import { describe, expect, it } from 'vitest';

import envelopeSchemaJson from '../src/contracts/planner/PlannerInputEnvelopeV2.schema.json' with { type: 'json' };
import policySchemaJson from '../src/contracts/planner/PlannerPolicyClassSet.v2.schema.json' with { type: 'json' };
import { PlannerInputEnvelopeV2Schema, PlannerPolicyClassSetSchema } from '../src/index.js';

// ── AJV setup ─────────────────────────────────────────────────────────────────

// Use separate AJV instances: the envelope schema embeds the policy schema
// in $defs (with the same $id), so AJV resolves the $ref internally.
// Adding the standalone policy schema to the same instance would cause an
// "ambiguous reference" error.
const validatePolicy = new Ajv({ strict: false }).compile(policySchemaJson);
const validateEnvelope = new Ajv({ strict: false }).compile(envelopeSchemaJson);

// ── Helpers ───────────────────────────────────────────────────────────────────

function zodValid(
  schema: { safeParse: (v: unknown) => { success: boolean } },
  input: unknown
): boolean {
  return schema.safeParse(input).success;
}

// ── PlannerPolicyClassSet fixtures ────────────────────────────────────────────

const POLICY_FIXTURES: Array<{ label: string; input: unknown; valid: boolean }> = [
  // Valid cases
  { label: 'empty object', input: {}, valid: true },
  {
    label: 'at-most-once retry',
    input: { retry: { kind: 'at-most-once' } },
    valid: true,
  },
  {
    label: 'at-most-N retry',
    input: { retry: { kind: 'at-most-N', maxAttempts: 3 } },
    valid: true,
  },
  {
    label: 'budget timeout',
    input: { timeout: { kind: 'budget', maxSeconds: 60 } },
    valid: true,
  },
  {
    label: 'unbounded timeout',
    input: { timeout: { kind: 'unbounded' } },
    valid: true,
  },
  {
    label: 'sequential concurrency',
    input: { concurrency: { kind: 'sequential' } },
    valid: true,
  },
  {
    label: 'bounded concurrency',
    input: { concurrency: { kind: 'bounded', maxParallel: 4 } },
    valid: true,
  },
  {
    label: 'unbounded concurrency',
    input: { concurrency: { kind: 'unbounded' } },
    valid: true,
  },
  {
    label: 'all three classes',
    input: {
      retry: { kind: 'at-most-N', maxAttempts: 5 },
      timeout: { kind: 'budget', maxSeconds: 120 },
      concurrency: { kind: 'bounded', maxParallel: 2 },
    },
    valid: true,
  },

  // Invalid cases
  { label: 'unknown top-level field', input: { unknown: true }, valid: false },
  {
    label: 'at-most-N below minimum maxAttempts',
    input: { retry: { kind: 'at-most-N', maxAttempts: 1 } },
    valid: false,
  },
  {
    label: 'at-most-N above maximum maxAttempts',
    input: { retry: { kind: 'at-most-N', maxAttempts: 21 } },
    valid: false,
  },
  {
    label: 'budget timeout zero seconds',
    input: { timeout: { kind: 'budget', maxSeconds: 0 } },
    valid: false,
  },
  {
    label: 'bounded concurrency below minimum',
    input: { concurrency: { kind: 'bounded', maxParallel: 1 } },
    valid: false,
  },
  {
    label: 'unknown retry kind',
    input: { retry: { kind: 'infinite' } },
    valid: false,
  },
];

// ── PlannerInputEnvelopeV2 fixtures ───────────────────────────────────────────

const BASE_SELECTION = { selectedNodeIds: ['model.a'] };
const BASE_NODES = [{ nodeId: 'model.a', resourceType: 'model', dependsOn: [] }];

const ENVELOPE_FIXTURES: Array<{ label: string; input: unknown; valid: boolean }> = [
  // Valid cases
  {
    label: 'nodes + selection',
    input: { nodes: BASE_NODES, selection: BASE_SELECTION },
    valid: true,
  },
  {
    label: 'manifestRef + selection',
    input: {
      manifestRef: {
        uri: 's3://bucket/manifest.json',
        sha256: 'a'.repeat(64),
      },
      selection: BASE_SELECTION,
    },
    valid: true,
  },
  {
    label: 'manifest + selection',
    input: { manifest: { nodes: {} }, selection: BASE_SELECTION },
    valid: true,
  },
  {
    label: 'nodes + selection + valid policy',
    input: {
      nodes: BASE_NODES,
      selection: BASE_SELECTION,
      policies: { retry: { kind: 'at-most-once' } },
    },
    valid: true,
  },
  {
    label: 'selection only (no graph source)',
    input: { selection: BASE_SELECTION },
    valid: true, // Type-level: selection is the only required field; one-active-source is enforced by planner logic
  },

  // Invalid cases
  {
    label: 'missing selection',
    input: { nodes: BASE_NODES },
    valid: false,
  },
  {
    label: 'unknown top-level field',
    input: { nodes: BASE_NODES, selection: BASE_SELECTION, extra: true },
    valid: false,
  },
  {
    label: 'invalid policy nested inside envelope',
    input: {
      nodes: BASE_NODES,
      selection: BASE_SELECTION,
      policies: { retry: { kind: 'unknown-kind' } },
    },
    valid: false,
  },
];

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('schema-sync: PlannerPolicyClassSet', () => {
  it.each(POLICY_FIXTURES)('$label → valid=$valid', ({ input, valid }) => {
    const zResult = zodValid(PlannerPolicyClassSetSchema, input);
    const jsonResult = validatePolicy(input);

    expect(zResult).toBe(valid);
    expect(jsonResult).toBe(valid);
  });
});

describe('schema-sync: PlannerInputEnvelopeV2', () => {
  it.each(ENVELOPE_FIXTURES)('$label → valid=$valid', ({ input, valid }) => {
    const zResult = zodValid(PlannerInputEnvelopeV2Schema, input);
    const jsonResult = validateEnvelope(input);

    expect(zResult).toBe(valid);
    expect(jsonResult).toBe(valid);
  });
});
