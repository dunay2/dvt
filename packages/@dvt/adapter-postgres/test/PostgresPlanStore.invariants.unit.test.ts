import { describe, expect, test } from 'vitest';

import {
  assertStoredPlanMatchesRequest,
  buildExecutionPolicyFromStoredRow,
  buildPlanRefFromStoredRow,
  toPersistedCanonicalPlanJson,
  toPlanExecutabilityRecord,
  type StoredPlanRow,
} from '../src/PostgresPlanStore.mappers.js';

describe('PostgresPlanStore invariants (unit, always-on)', () => {
  const baseStoredRow: StoredPlanRow = {
    plan_id: 'p1',
    plan_version: '1.0',
    plan_uri: 'dvt-plan://postgres/p1',
    plan_sha256: 'a'.repeat(64),
    schema_version: 'v1.2',
    size_bytes: 123,
    requires_capabilities: ['cap.b', 'cap.a'],
    canonical_plan_json: '{"metadata":{"planId":"p1"}}',
    executable_plan_json: '{"metadata":{"planId":"p1"},"steps":[]}',
    validation_state: 'PENDING_VALIDATION',
    stored_at_iso: '2026-03-21T00:00:00.000Z',
    updated_at_iso: '2026-03-21T00:00:00.000Z',
    rejection_report_json: null,
  };

  test('buildExecutionPolicyFromStoredRow normalizes requiresCapabilities order', () => {
    const executionPolicy = buildExecutionPolicyFromStoredRow(baseStoredRow);
    expect(executionPolicy.requiresCapabilities).toEqual(['cap.a', 'cap.b']);
  });

  test('assertStoredPlanMatchesRequest fails fast on persisted payload mismatch', () => {
    const ref = buildPlanRefFromStoredRow(baseStoredRow);
    expect(() =>
      assertStoredPlanMatchesRequest(baseStoredRow, {
        planRef: ref,
        executionPolicy: buildExecutionPolicyFromStoredRow(baseStoredRow),
        canonicalPlanJson: '{"metadata":{"planId":"p1"},"changed":true}',
        executablePlanJson: baseStoredRow.executable_plan_json ?? '',
      })
    ).toThrow('PLAN_STORE_CONFLICT');
  });

  test('toPersistedCanonicalPlanJson is stable for equivalent nested key ordering', () => {
    const buildResultA = {
      plan: {
        metadata: {
          planVersion: '1.0',
          schemaVersion: 'v1.2',
          contractVersion: '1.0.0',
          inputHashSha256: 'a'.repeat(64),
          planId: 'b'.repeat(64),
          createdAtIso: '2026-04-07T00:00:00.000Z',
        },
        steps: [
          {
            stepId: 's1',
            kind: 'CUSTOM',
            dependsOn: [],
            stepTypeConfig: { alpha: 1, beta: 2 },
          },
        ],
      },
      executionPolicy: {},
      canonicalPlanCoreJson: '{}',
    };

    const buildResultB = {
      ...buildResultA,
      plan: {
        ...buildResultA.plan,
        steps: [
          {
            stepId: 's1',
            kind: 'CUSTOM',
            dependsOn: [],
            stepTypeConfig: { beta: 2, alpha: 1 },
          },
        ],
      },
    };

    expect(toPersistedCanonicalPlanJson(buildResultA)).toBe(
      toPersistedCanonicalPlanJson(buildResultB)
    );
  });

  test('toPersistedCanonicalPlanJson preserves planner-emitted createdAtIso', () => {
    const createdAtIso = '2026-04-07T12:34:56.789Z';
    const buildResult = {
      plan: {
        metadata: {
          planVersion: '1.0',
          schemaVersion: 'v1.2',
          contractVersion: '1.0.0',
          inputHashSha256: 'a'.repeat(64),
          planId: 'b'.repeat(64),
          createdAtIso,
        },
        steps: [],
      },
      executionPolicy: {},
      canonicalPlanCoreJson: '{}',
    };

    const persisted = JSON.parse(toPersistedCanonicalPlanJson(buildResult)) as {
      metadata: { createdAtIso: string };
    };

    expect(persisted.metadata.createdAtIso).toBe(createdAtIso);
  });

  test('toPlanExecutabilityRecord rejects VALID rows without validated_at', () => {
    expect(() =>
      toPlanExecutabilityRecord({
        plan_id: 'p1',
        adapter_id: 'temporal',
        state: 'VALID',
        validated_at_iso: null,
        rejection_report_json: null,
      })
    ).toThrow('PLAN_EXECUTABILITY_ROW_INVALID');
  });

  test('toPlanExecutabilityRecord rejects INVALID rows without rejection_report_json', () => {
    expect(() =>
      toPlanExecutabilityRecord({
        plan_id: 'p1',
        adapter_id: 'temporal',
        state: 'INVALID',
        validated_at_iso: '2026-03-21T00:00:00.000Z',
        rejection_report_json: null,
      })
    ).toThrow('PLAN_EXECUTABILITY_ROW_INVALID');
  });
});
