import { describe, expect, it } from 'vitest';

import {
  PLAN_RUNTIME_ADMISSION_MATRIX,
  getSupportedPlanVersionsForRuntime,
  verifyPlanVersionOrThrow,
} from '../src/index.js';

describe('@dvt/plan-verifier runtime admission matrix', () => {
  it('expone una matriz de admision runtime por consumidor', () => {
    expect(PLAN_RUNTIME_ADMISSION_MATRIX.planner).toBeDefined();
    expect(getSupportedPlanVersionsForRuntime('planner')).toEqual(
      PLAN_RUNTIME_ADMISSION_MATRIX.planner.admittedPlanVersions
    );
  });

  it('acepta una version declarada para el runtime', () => {
    expect(() =>
      verifyPlanVersionOrThrow({
        planVersion: '1.0',
        runtime: 'planner',
      })
    ).not.toThrow();
  });

  it('rechaza una version no declarada para el runtime aunque sea semver-like', () => {
    expect(() =>
      verifyPlanVersionOrThrow({
        planVersion: '1.0-unsupported',
        runtime: 'planner',
      })
    ).toThrow(/planner/);
  });
});
