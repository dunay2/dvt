/**
 * Owned concern: verify executable plan admission pairs and negative cases.
 */
import { describe, expect, it } from 'vitest';

import {
  CURRENT_EXECUTION_PLAN_SCHEMA_VERSION,
  CURRENT_EXECUTION_PLAN_VERSION,
  EXECUTION_PLAN_ADMISSION_MATRIX,
  isAdmittedExecutionPlanPair,
  SUPPORTED_EXECUTION_PLAN_ADMISSION_PAIRS,
} from '../src/index.js';

const UNSUPPORTED_PLAN_VERSION = `${CURRENT_EXECUTION_PLAN_VERSION}-unsupported`;

describe('ExecutionPlan admission matrix', () => {
  it('declares the current planVersion/schemaVersion pair as the canonical supported pair', () => {
    expect(SUPPORTED_EXECUTION_PLAN_ADMISSION_PAIRS).toEqual([
      {
        planVersion: CURRENT_EXECUTION_PLAN_VERSION,
        schemaVersion: CURRENT_EXECUTION_PLAN_SCHEMA_VERSION,
      },
    ]);
    expect(EXECUTION_PLAN_ADMISSION_MATRIX).toMatchObject({
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
      schemaVersion: 'v1.0',
      expected: false,
    },
    {
      planVersion: CURRENT_EXECUTION_PLAN_VERSION,
      schemaVersion: 'v1.future',
      expected: false,
    },
    {
      planVersion: UNSUPPORTED_PLAN_VERSION,
      schemaVersion: CURRENT_EXECUTION_PLAN_SCHEMA_VERSION,
      expected: false,
    },
    {
      planVersion: '',
      schemaVersion: CURRENT_EXECUTION_PLAN_SCHEMA_VERSION,
      expected: false,
    },
    {
      planVersion: 'toString',
      schemaVersion: CURRENT_EXECUTION_PLAN_SCHEMA_VERSION,
      expected: false,
    },
    {
      planVersion: '__proto__',
      schemaVersion: CURRENT_EXECUTION_PLAN_SCHEMA_VERSION,
      expected: false,
    },
    {
      planVersion: 'constructor',
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
      expect(isAdmittedExecutionPlanPair(planVersion, schemaVersion)).toBe(expected);
    }
  );
});
