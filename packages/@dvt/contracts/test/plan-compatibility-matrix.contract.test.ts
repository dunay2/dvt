import { describe, expect, it } from 'vitest';

import {
  CURRENT_EXECUTION_PLAN_SCHEMA_VERSION,
  CURRENT_EXECUTION_PLAN_VERSION,
  EXECUTION_PLAN_COMPATIBILITY_MATRIX,
  isSupportedExecutionPlanCompatibility,
  SUPPORTED_EXECUTION_PLAN_COMPATIBILITY_PAIRS,
} from '../src/index.js';

describe('ExecutionPlan compatibility matrix', () => {
  it('declares the current planVersion/schemaVersion pair as the canonical supported pair', () => {
    expect(SUPPORTED_EXECUTION_PLAN_COMPATIBILITY_PAIRS).toEqual([
      {
        planVersion: CURRENT_EXECUTION_PLAN_VERSION,
        schemaVersion: CURRENT_EXECUTION_PLAN_SCHEMA_VERSION,
      },
    ]);
    expect(EXECUTION_PLAN_COMPATIBILITY_MATRIX).toMatchObject({
      [CURRENT_EXECUTION_PLAN_VERSION]: [CURRENT_EXECUTION_PLAN_SCHEMA_VERSION],
    });
  });

  it.each([
    {
      planVersion: CURRENT_EXECUTION_PLAN_VERSION,
      schemaVersion: CURRENT_EXECUTION_PLAN_SCHEMA_VERSION,
      expected: true,
    },
    {
      planVersion: CURRENT_EXECUTION_PLAN_VERSION,
      schemaVersion: 'v1.future',
      expected: false,
    },
    {
      planVersion: '9.0',
      schemaVersion: CURRENT_EXECUTION_PLAN_SCHEMA_VERSION,
      expected: false,
    },
    {
      planVersion: '',
      schemaVersion: CURRENT_EXECUTION_PLAN_SCHEMA_VERSION,
      expected: false,
    },
    {
      planVersion: CURRENT_EXECUTION_PLAN_VERSION,
      schemaVersion: '',
      expected: false,
    },
  ])(
    'returns $expected for planVersion=$planVersion schemaVersion=$schemaVersion',
    ({ planVersion, schemaVersion, expected }) => {
      expect(isSupportedExecutionPlanCompatibility(planVersion, schemaVersion)).toBe(expected);
    }
  );
});
