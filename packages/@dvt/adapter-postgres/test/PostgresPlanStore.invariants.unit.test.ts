import { describe, expect, test } from 'vitest';

import {
  assertStoredPlanMatchesRequest,
  buildExecutionPolicyFromStoredRow,
  buildPlanRefFromStoredRow,
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
